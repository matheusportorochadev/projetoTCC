import { test, expect } from './helpers/recuperacao';
import { origem, operarNegocio, inspecionarNegocio } from './helpers/negocio';
import { obterSenhaTeste } from './helpers/credenciais';
const senha = () => obterSenhaTeste() + 'Nova9!';
const solicitar = '/auth/primeiro-acesso/solicitar'; const concluir = '/auth/primeiro-acesso/concluir';
test.use({ trace: 'off' });
test.describe('Primeiro acesso real com SMTP restrito ao loopback', () => {
  for (const papel of ['medicoA', 'pacienteA'] as const) {
    test(`${papel}: cria primeira senha, autentica e impede reutilização`, async ({ negocio, ambiente, api }) => {
      operarNegocio('elegivel', negocio.id, papel); const email = negocio.contas[papel].email;
      expect((await api.post('/auth/login', { headers: origem, data: { email, senha: obterSenhaTeste() } })).status()).toBe(401);
      expect((await api.get('/perfil')).status()).toBe(401);
      expect((await api.post(solicitar, { headers: origem, data: { email: ' ' + email.toUpperCase() + ' ' } })).status()).toBe(200);
      const codigo = ambiente.smtp.codigo(email);
      const dados = { email, codigo, novaSenha: senha(), confirmarSenha: senha() };
      const fraca = await api.post(concluir, { headers: origem, data: { ...dados, novaSenha: 'fraca', confirmarSenha: 'fraca' } });
      expect(fraca.status()).toBe(400); expect(Object.hasOwn(await fraca.json(), 'erros')).toBe(true);
      expect(inspecionarNegocio(negocio.id).codigos.every(c => !c.usado)).toBe(true);
      const divergente = await api.post(concluir, { headers: origem, data: { ...dados, confirmarSenha: senha() + 'Diferente9!' } });
      expect(divergente.status()).toBe(400); expect(Object.hasOwn(await divergente.json(), 'erros')).toBe(true);
      expect((await api.post(concluir, { headers: origem, data: dados })).status()).toBe(200);
      const estado = inspecionarNegocio(negocio.id);
      expect(estado.usuarios.find(u => u.id === negocio.contas[papel].id)).toMatchObject({ primeiroAcesso: false, temSenha: true });
      expect(estado.codigos.every(c => c.usado && c.hashSeguro)).toBe(true);
      expect(estado.auditorias.login.some(e => e.usuarioId === negocio.contas[papel].id && e.acao === 'SENHA_CRIADA_PRIMEIRO_ACESSO' && e.resultado === 'SUCESSO')).toBe(true);
      expect((await api.post(concluir, { headers: origem, data: dados })).status()).toBe(400);
      expect((await api.post('/auth/login', { headers: origem, data: { email, senha: senha() } })).status()).toBe(200);
      expect((await api.get('/perfil')).status()).toBe(200);
    });
    for (const falha of ['incorreto', 'expirado', 'tentativas', 'outro-usuario'] as const) {
      test(`${papel}: rejeita código ${falha} e preserva primeiro acesso`, async ({ negocio, ambiente, api }) => {
        operarNegocio('elegivel', negocio.id, papel); const email = negocio.contas[papel].email;
        expect((await api.post(solicitar, { headers: origem, data: { email } })).status()).toBe(200);
        const codigo = ambiente.smtp.codigo(email);
        if (falha === 'expirado') operarNegocio('expirar-primeiro', negocio.id, papel);
        const destino = falha === 'outro-usuario' ? negocio.contas.pacienteB.email : email;
        const recebido = ['incorreto', 'tentativas'].includes(falha) ? '000000' : codigo;
        for (let n = 0; n < (falha === 'tentativas' ? 5 : 1); n++) expect((await api.post(concluir, { headers: origem, data: { email: destino, codigo: recebido, novaSenha: senha(), confirmarSenha: senha() } })).status()).toBe(400);
        if (falha === 'tentativas') {
          expect((await api.post(concluir, { headers: origem, data: { email, codigo, novaSenha: senha(), confirmarSenha: senha() } })).status()).toBe(400);
          expect(inspecionarNegocio(negocio.id).codigos[0]).toMatchObject({ usado: true, tentativas: 5 });
        }
        expect(inspecionarNegocio(negocio.id).usuarios.find(u => u.id === negocio.contas[papel].id)).toMatchObject({ primeiroAcesso: true, temSenha: false });
      });
    }
  }
  test('Solicitação não enumera contas e não envia mensagem para inelegíveis', async ({ negocio, ambiente, api }) => {
    operarNegocio('elegivel', negocio.id); const email = negocio.contas.medicoA.email;
    const respostas: unknown[] = [];
    operarNegocio('elegivel', negocio.id, 'pacienteB');
    expect((await (await negocio.api('medicoB')).patch(`/pacientes/${negocio.pacienteB.id}/status`, { headers: origem, data: { ativo: false } })).status()).toBe(200);
    for (const alvo of [email, negocio.email('inexistente'), negocio.contas.admin.email, negocio.contas.pacienteA.email, negocio.contas.pacienteB.email]) {
      const resposta = await api.post(solicitar, { headers: origem, data: { email: alvo } });
      expect(resposta.status()).toBe(200); respostas.push(await resposta.json());
    }
    expect(respostas.every(r => JSON.stringify(r) === JSON.stringify(respostas[0]))).toBe(true);
    expect(ambiente.smtp.mensagens.map(m => m.destinatario)).toEqual([email]);
  });
  test('Reenvio invalida o código anterior e usa somente o último', async ({ negocio, ambiente, api }) => {
    operarNegocio('elegivel', negocio.id); const email = negocio.contas.medicoA.email;
    for (let n = 0; n < 2; n++) expect((await api.post(solicitar, { headers: origem, data: { email } })).status()).toBe(200);
    const codigos = inspecionarNegocio(negocio.id).codigos;
    expect(codigos.filter(c => !c.usado)).toHaveLength(1); expect(codigos.every(c => c.hashSeguro)).toBe(true);
    expect((await api.post(concluir, { headers: origem, data: { email, codigo: ambiente.smtp.codigo(email), novaSenha: senha(), confirmarSenha: senha() } })).status()).toBe(200);
  });
  test('Sexta solicitação de primeiro acesso recebe 429 sem enviar outro email', async ({ negocio, ambiente, api }) => {
    operarNegocio('elegivel', negocio.id); const email = negocio.contas.medicoA.email;
    for (let n = 0; n < 5; n++) expect((await api.post(solicitar, { headers: origem, data: { email } })).status()).toBe(200);
    expect((await api.post(solicitar, { headers: origem, data: { email } })).status()).toBe(429);
    expect(ambiente.smtp.mensagens.length).toBe(5);
  });
  for (const caso of [
    { nome: 'email inválido', dados: { email: 'invalido' } },
    { nome: 'código malformado', dados: { codigo: '123' } },
    { nome: 'campos extras', dados: { extra: true } },
  ]) {
    test(`Valida primeiro acesso: ${caso.nome}`, async ({ api, ambiente }) => {
      const dados = { email: 'x@example.com', codigo: '123456', novaSenha: senha(), confirmarSenha: senha(), ...caso.dados };
      const resposta = await api.post(concluir, { headers: origem, data: dados });
      expect(resposta.status()).toBe(400); expect(Object.hasOwn(await resposta.json(), 'erros')).toBe(true);
      expect(ambiente.smtp.mensagens.length).toBe(0);
    });
  }
});

test('Primeiro acesso consome o código apenas uma vez sob conclusões simultâneas', async ({ negocio, ambiente, api }) => {
  operarNegocio('elegivel', negocio.id); const email = negocio.contas.medicoA.email;
  expect((await api.post(solicitar, { headers: origem, data: { email } })).status()).toBe(200);
  const codigo = ambiente.smtp.codigo(email);
  const dados = { email, codigo, novaSenha: senha(), confirmarSenha: senha() };
  const respostas = await Promise.all([api.post(concluir, { headers: origem, data: dados }), api.post(concluir, { headers: origem, data: dados })]);
  expect(respostas.map(r => r.status()).sort()).toEqual([200, 400]);
});
