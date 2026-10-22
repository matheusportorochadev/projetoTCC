import { test, expect } from './helpers/recuperacao';
import { origem, operarNegocio, inspecionarNegocio } from './helpers/negocio';
import { obterSenhaTeste } from './helpers/credenciais';
const nova = () => obterSenhaTeste() + 'Nova9!';
test.use({ trace: 'off' });
test.describe('Recuperação principal e invalidação das credenciais', () => {
  for (const papel of ['admin', 'medicoA', 'pacienteA'] as const) {
    test(`${papel}: redefine, rejeita senha antiga e código reutilizado, registra autoria`, async ({ negocio, api, ambiente }) => {
      const email = negocio.contas[papel].email;
      expect((await api.post('/auth/esqueci-senha', { headers: origem, data: { email } })).status()).toBe(200);
      const dados = { email, codigo: ambiente.smtp.codigo(email), novaSenha: nova() };
      const fraca = await api.post('/auth/redefinir-senha', { headers: origem, data: { ...dados, novaSenha: 'fraca' } });
      expect(fraca.status()).toBe(400); expect(Object.hasOwn(await fraca.json(), 'erros')).toBe(true);
      expect(inspecionarNegocio(negocio.id).codigos.every(c => !c.usado)).toBe(true);
      expect((await api.post('/auth/redefinir-senha', { headers: origem, data: dados })).status()).toBe(200);
      expect((await api.post('/auth/redefinir-senha', { headers: origem, data: dados })).status()).toBe(400);
      expect((await api.post('/auth/login', { headers: origem, data: { email, senha: obterSenhaTeste() } })).status()).toBe(401);
      expect((await api.post('/auth/login', { headers: origem, data: { email, senha: nova() } })).status()).toBe(200);
      const estado = inspecionarNegocio(negocio.id);
      expect(estado.codigos.every(c => c.usado && c.hashSeguro)).toBe(true);
      expect(estado.auditorias.login.some(e => e.acao === 'SENHA_REDEFINIDA' && e.usuarioId === negocio.contas[papel].id)).toBe(true);
    });
  }
  for (const caso of ['incorreto', 'expirado', 'outro-usuario'] as const) {
    test(`Redefinição rejeita código ${caso} sem alterar a senha`, async ({ negocio, api, ambiente }) => {
      const email = negocio.contas.pacienteA.email;
      expect((await api.post('/auth/esqueci-senha', { headers: origem, data: { email } })).status()).toBe(200);
      if (caso === 'expirado') operarNegocio('expirar-reset', negocio.id, 'pacienteA');
      expect((await api.post('/auth/redefinir-senha', { headers: origem, data: { email: caso === 'outro-usuario' ? negocio.contas.pacienteB.email : email, codigo: caso === 'incorreto' ? '000000' : ambiente.smtp.codigo(email), novaSenha: nova() } })).status()).toBe(400);
      expect((await api.post('/auth/login', { headers: origem, data: { email, senha: obterSenhaTeste() } })).status()).toBe(200);
    });
  }
  test('Resposta de recuperação não enumera email existente ou desconhecido', async ({ negocio, api, ambiente }) => {
    const a = await api.post('/auth/esqueci-senha', { headers: origem, data: { email: negocio.contas.pacienteA.email } });
    const b = await api.post('/auth/esqueci-senha', { headers: origem, data: { email: negocio.email('inexistente') } });
    expect((await (await negocio.api('medicoA')).patch(`/pacientes/${negocio.pacienteA.id}/status`, { headers: origem, data: { ativo: false } })).status()).toBe(200);
    const bloqueado = await api.post('/auth/esqueci-senha', { headers: origem, data: { email: negocio.contas.pacienteA.email } });
    expect(a.status()).toBe(200); expect(b.status()).toBe(200); expect(bloqueado.status()).toBe(200);
    const mensagem = await a.json(); expect(mensagem).toEqual(await b.json()); expect(mensagem).toEqual(await bloqueado.json());
    expect(ambiente.smtp.mensagens.length).toBe(1);
  });
  test('Redefinir senha invalida sessão principal emitida antes da alteração', async ({ negocio, api, ambiente }) => {
    const sessaoAntiga = await negocio.api('pacienteA'); const email = negocio.contas.pacienteA.email;
    await api.post('/auth/esqueci-senha', { headers: origem, data: { email } });
    expect((await api.post('/auth/redefinir-senha', { headers: origem, data: { email, codigo: ambiente.smtp.codigo(email), novaSenha: nova() } })).status()).toBe(200);
    // Expectativa de segurança preservada mesmo se a implementação ainda falhar.
    expect((await sessaoAntiga.get('/perfil')).status()).toBe(401);
  });
  test('Sexto envio de recuperação é limitado sem email adicional', async ({ negocio, api, ambiente }) => {
    for (let n = 0; n < 5; n++) expect((await api.post('/auth/esqueci-senha', { headers: origem, data: { email: negocio.contas.pacienteA.email } })).status()).toBe(200);
    expect((await api.post('/auth/esqueci-senha', { headers: origem, data: { email: negocio.contas.pacienteA.email } })).status()).toBe(429);
    expect(ambiente.smtp.mensagens.length).toBe(5);
  });
  for (const caso of [
    { nome: 'email inválido', dados: { email: 'invalido' } },
    { nome: 'código malformado', dados: { codigo: '12' } },
    { nome: 'senha fraca', dados: { novaSenha: 'fraca' } },
    { nome: 'campos extras', dados: { extra: true } },
  ]) {
    test(`Schema de recuperação rejeita ${caso.nome}`, async ({ api, ambiente }) => {
      const dados = { email: 'x@example.com', codigo: '123456', novaSenha: nova(), ...caso.dados };
      const resposta = await api.post('/auth/redefinir-senha', { headers: origem, data: dados });
      expect(resposta.status()).toBe(400); expect(Object.hasOwn(await resposta.json(), 'erros')).toBe(true);
      expect(ambiente.smtp.mensagens.length).toBe(0);
    });
  }
});

test('Falha SMTP invalida código incompleto e novo envio recupera o fluxo', async ({ negocio, ambiente, api }) => {
  ambiente.smtp.falharEnvio(true);
  expect((await api.post('/auth/esqueci-senha', { headers: origem, data: { email: negocio.contas.pacienteA.email } })).status()).toBe(400);
  expect(ambiente.smtp.mensagens.length).toBe(0);
  expect(inspecionarNegocio(negocio.id).codigos.every(c => c.usado)).toBe(true);
  ambiente.smtp.falharEnvio(false);
  expect((await api.post('/auth/esqueci-senha', { headers: origem, data: { email: negocio.contas.pacienteA.email } })).status()).toBe(200);
  expect(ambiente.smtp.mensagens.length).toBe(1);
  expect(inspecionarNegocio(negocio.id).codigos.filter(c => !c.usado)).toHaveLength(1);
});

test('Redefinição principal consome o código apenas uma vez sob conclusões simultâneas', async ({ negocio, ambiente, api }) => {
  const email = negocio.contas.pacienteA.email;
  expect((await api.post('/auth/esqueci-senha', { headers: origem, data: { email } })).status()).toBe(200);
  const dados = { email, codigo: ambiente.smtp.codigo(email), novaSenha: nova() };
  const respostas = await Promise.all([api.post('/auth/redefinir-senha', { headers: origem, data: dados }), api.post('/auth/redefinir-senha', { headers: origem, data: dados })]);
  expect(respostas.map(r => r.status()).sort()).toEqual([200, 400]);
});
