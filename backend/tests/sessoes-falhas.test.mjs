import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db } from '../src/prisma/db.ts';
import { authMiddleware } from '../src/middlewares/auth.middleware.ts';
import { logoutController } from '../src/controllers/auth.controller.ts';
import { sessaoFoiRevogada, revogarSessao, PersistenciaSessaoIndisponivel } from '../src/services/sessao.service.ts';
import { validarBancoDeTestes } from '../scripts/protecao-banco-testes.mjs';

validarBancoDeTestes();
after(() => db.close());

function token() {
  return jwt.sign({ tipo: 'MEDICO' }, process.env.JWT_SECRET, {
    algorithm: 'HS256', issuer: 'tcc-consultorio-api', audience: 'tcc-consultorio-web',
    subject: '1', jwtid: randomUUID(), expiresIn: '8h',
  });
}
function resposta() {
  return {
    codigo: 200, corpo: undefined, cookiesRemovidos: 0,
    status(codigo) { this.codigo = codigo; return this; },
    json(corpo) { this.corpo = corpo; return this; },
    clearCookie() { this.cookiesRemovidos++; return this; },
  };
}

test('Falha de leitura da revogação bloqueia o middleware com 503 e não busca usuário', async t => {
  t.mock.method(db.orm.public.SessaoRevogada, 'where', () => ({ first: async () => { throw new Error('falha simulada'); } }));
  const buscaUsuario = t.mock.method(db.orm.public.Usuario, 'where', () => { throw new Error('Não deve consultar usuário após falha de revogação.'); });
  const res = resposta();
  let autorizado = false;
  await authMiddleware({ cookies: { access_token: token() } }, res, () => { autorizado = true; });
  assert.equal(res.codigo, 503);
  assert.equal(autorizado, false);
  assert.equal(buscaUsuario.mock.callCount(), 0);
  assert.deepEqual(Object.keys(res.corpo), ['mensagem']);
});

test('Falha de escrita não confirma logout nem apaga cookies necessários à repetição', async t => {
  const escrita = t.mock.method(db.orm.public.SessaoRevogada, 'upsert', async () => { throw new Error('falha simulada'); });
  const auditoria = t.mock.method(db.orm.public.AuditoriaLogin, 'create', async () => { throw new Error('Não deve auditar sucesso.'); });
  const res = resposta();
  await logoutController({ cookies: { access_token: token() } }, res);
  assert.equal(res.codigo, 503);
  assert.equal(res.cookiesRemovidos, 0);
  assert.equal(escrita.mock.callCount(), 1);
  assert.equal(auditoria.mock.callCount(), 0);
  assert.deepEqual(Object.keys(res.corpo), ['mensagem']);
});

test('A leitura normal de revogação usa uma única busca por hash', async t => {
  let consultas = 0;
  let criterio;
  t.mock.method(db.orm.public.SessaoRevogada, 'where', valor => {
    criterio = valor;
    return { first: async () => { consultas++; return null; } };
  });
  const principal = token();
  assert.equal(await sessaoFoiRevogada(principal), false);
  assert.equal(consultas, 1);
  assert.equal(Object.keys(criterio).join(','), 'tokenHash');
  assert.equal(/^[a-f0-9]{64}$/.test(criterio.tokenHash), true);
  assert.equal(criterio.tokenHash.includes(principal), false);
});

test('Persistência envia somente hash, usuário e expiração ao upsert', async t => {
  let dados;
  t.mock.method(db.orm.public.SessaoRevogada, 'upsert', async valor => { dados = valor; return valor.create; });
  const principal = token();
  const exp = Math.floor(Date.now() / 1000) + 3600;
  await revogarSessao(principal, 1, exp);
  assert.deepEqual(Object.keys(dados.create).sort(), ['expiresAt', 'tokenHash', 'usuarioId']);
  assert.deepEqual(dados.update, {});
  assert.equal(dados.create.expiresAt, new Date(exp * 1000).toISOString());
  assert.equal(JSON.stringify(dados).includes(principal), false);
});

test('Erro de persistência não propaga mensagem sensível do driver', async t => {
  t.mock.method(db.orm.public.SessaoRevogada, 'upsert', async () => { throw new Error('detalhe interno fictício'); });
  await assert.rejects(revogarSessao(token(), 1, Math.floor(Date.now() / 1000) + 3600), PersistenciaSessaoIndisponivel);
});

test('Middleware normal faz uma busca de revogação e uma busca de usuário', async t => {
  const revogacao = t.mock.method(db.orm.public.SessaoRevogada, 'where', () => ({ first: async () => null }));
  const usuario = t.mock.method(db.orm.public.Usuario, 'where', () => ({ first: async () => ({ id: 1, tipo: 'MEDICO', ativo: true, primeiroAcesso: false }) }));
  const res = resposta();
  let autorizado = false;
  await authMiddleware({ cookies: { access_token: token() } }, res, () => { autorizado = true; });
  assert.equal(autorizado, true);
  assert.equal(revogacao.mock.callCount(), 1);
  assert.equal(usuario.mock.callCount(), 1);
});

test('Token legado sem jti é rejeitado antes de qualquer consulta', async t => {
  const revogacao = t.mock.method(db.orm.public.SessaoRevogada, 'where', () => { throw new Error('Não deve consultar banco.'); });
  const legado = jwt.sign({ tipo: 'MEDICO' }, process.env.JWT_SECRET, {
    algorithm: 'HS256', issuer: 'tcc-consultorio-api', audience: 'tcc-consultorio-web', subject: '1', expiresIn: '8h',
  });
  const res = resposta();
  let autorizado = false;
  await authMiddleware({ cookies: { access_token: legado } }, res, () => { autorizado = true; });
  assert.equal(res.codigo, 401);
  assert.equal(autorizado, false);
  assert.equal(revogacao.mock.callCount(), 0);
});

test('Login diferencia sessões emitidas no mesmo segundo', async t => {
  const { login } = await import('../src/services/auth.service.ts');
  const bcrypt = (await import('bcrypt')).default;
  t.mock.method(db.orm.public.Usuario, 'where', () => ({ first: async () => ({
    id: 1, nome: 'Fixture Unitária', email: 'unitaria@example.com', senha: 'hash-simulado',
    tipo: 'MEDICO', ativo: true, primeiroAcesso: false,
  }) }));
  t.mock.method(bcrypt, 'compare', async () => true);
  const agora = Date.now();
  t.mock.method(Date, 'now', () => agora);
  const a = await login({ email: 'unitaria@example.com', senha: 'ficticia-apenas-no-mock' });
  const b = await login({ email: 'unitaria@example.com', senha: 'ficticia-apenas-no-mock' });
  const payloadA = jwt.decode(a.token);
  const payloadB = jwt.decode(b.token);
  assert.equal(payloadA.iat, payloadB.iat);
  assert.equal(payloadA.jti !== payloadB.jti, true);
  assert.equal(a.token !== b.token, true);
});

// Injeção somente na transação da fixture; falha após escrita da senha.
for (const fluxo of ['primeiro', 'principal', 'clinico']) {
  test(`Rollback de ${fluxo} preserva credencial e código após falha parcial`, async t => {
    const { execFileSync } = await import('node:child_process');
    const { createHmac } = await import('node:crypto');
    const id = randomUUID();
    const fixture = acao => execFileSync(process.execPath,
      ['--env-file=.env.test', '--import', 'tsx', 'scripts/fixture-negocio.ts', acao, id],
      { cwd: new URL('../', import.meta.url), env: { ...process.env, NODE_ENV: 'test' },
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    validarBancoDeTestes();
    const negocio = JSON.parse(fixture('criar').trim().split('\n').at(-1));
    try {
      const usuarioId = negocio.contas.medicoA.id;
      const medicoId = negocio.medicoA.id;
      const codigo = '123456'; // Código fictício, nunca enviado por email.
      const senha = process.env.TESTE_SENHA + 'Nova9!';
      const tabela = fluxo === 'primeiro' ? 'CodigoPrimeiroAcesso'
        : fluxo === 'principal' ? 'CodigoRedefinicaoSenha' : 'CodigoRecuperacaoProntuario';
      const chave = fluxo === 'clinico' ? medicoId : usuarioId;
      const prefixo = fluxo === 'primeiro' ? 'primeiro-acesso:' : fluxo === 'clinico' ? 'recuperacao-prontuario:' : '';
      const hash = createHmac('sha256', process.env.RESET_CODE_SECRET).update(`${prefixo}${chave}:${codigo}`).digest('hex');
      if (fluxo === 'primeiro') await db.orm.public.Usuario.where({ id: usuarioId }).update({ senha: null, primeiroAcesso: true });
      const antes = await db.orm.public.Usuario.where({ id: usuarioId }).first();
      let acessoAntes;
      if (fluxo === 'clinico') acessoAntes = await db.orm.public.AcessoProntuario.create({ medicoId, senhaHash: antes.senha, versaoAutorizacao: 1 });
      const registro = await db.orm.public[tabela].create({
        ...(fluxo === 'clinico' ? { medicoId } : { usuarioId }),
        ...(fluxo === 'principal' ? { codigo: hash } : { codigoHash: hash, tentativas: 0 }),
        expiraEm: new Date(Date.now() + 600000).toISOString(), usado: false,
      });
      const { concluirPrimeiroAcesso } = await import('../src/services/primeiroAcesso.service.ts');
      const { redefinirSenha } = await import('../src/services/redefinicaoSenha.service.ts');
      const { concluirRecuperacaoProntuario } = await import('../src/services/prontuario-recuperacao.service.ts');
      const original = db.transaction.bind(db);
      let alterou = false;
      const interceptacao = t.mock.method(db, 'transaction', callback => original(async tx => {
        const modelo = fluxo === 'clinico' ? tx.orm.public.AcessoProntuario : tx.orm.public.Usuario;
        const onde = modelo.where.bind(modelo);
        t.mock.method(modelo, 'where', filtro => {
          const consulta = onde(filtro);
          const atualizar = consulta.update.bind(consulta);
          t.mock.method(consulta, 'update', async dados => {
            const resultado = await atualizar(dados); alterou = true; return resultado;
          });
          return consulta;
        });
        const codigos = tx.orm.public[tabela];
        const ondeCodigo = codigos.where.bind(codigos);
        t.mock.method(codigos, 'where', filtro => {
          const consulta = ondeCodigo(filtro);
          const listar = consulta.all.bind(consulta);
          t.mock.method(consulta, 'all', async () => {
            if (alterou) throw new Error('falha parcial simulada');
            return listar();
          });
          return consulta;
        });
        return callback(tx);
      }));
      try {
        const concluir = fluxo === 'primeiro' ? () => concluirPrimeiroAcesso(antes.email, codigo, senha)
          : fluxo === 'principal' ? () => redefinirSenha(antes.email, codigo, senha)
          : () => concluirRecuperacaoProntuario(usuarioId, codigo, senha);
        await assert.rejects(concluir, /falha parcial simulada/);
        assert.equal(alterou, true);
      } finally { interceptacao.mock.restore(); }
      const depois = await db.orm.public.Usuario.where({ id: usuarioId }).first();
      assert.equal(depois.senha === antes.senha, true);
      assert.equal(depois.versaoSessao, antes.versaoSessao);
      assert.equal(depois.primeiroAcesso, antes.primeiroAcesso);
      assert.equal((await db.orm.public[tabela].where({ id: registro.id }).first()).usado, false);
      if (acessoAntes) {
        const acessoDepois = await db.orm.public.AcessoProntuario.where({ id: acessoAntes.id }).first();
        assert.equal(acessoDepois.senhaHash === acessoAntes.senhaHash, true);
        assert.equal(acessoDepois.versaoAutorizacao, acessoAntes.versaoAutorizacao);
      }
    } finally { fixture('limpar'); }
  });
}
