import { test, expect } from './helpers/recuperacao';
import { origem, operarNegocio, inspecionarNegocio } from './helpers/negocio';
import { obterSenhaTeste } from './helpers/credenciais';
const senha = () => obterSenhaTeste() + 'Clinica9!'; const nova = () => senha() + 'Clinica9!';
const solicitar = '/prontuarios/acesso/recuperacao/solicitar'; const concluir = '/prontuarios/acesso/recuperacao/concluir';
test.use({ trace: 'off' });
test.describe('Recuperação clínica isolada da senha principal', () => {
  for (const caso of ['sucesso', 'expirado', 'incorreto', 'tentativas', 'outro-medico'] as const) {
    test(`Recuperação clínica: ${caso}`, async ({ negocio, ambiente }) => {
      const medico = await negocio.api('medicoA');
      expect((await medico.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha: senha(), confirmarSenha: senha() } })).status()).toBe(201);
      expect((await medico.post('/prontuarios/acesso/verificar', { headers: origem, data: { senha: senha() } })).status()).toBe(200);
      const antigos = await medico.storageState();
      expect((await medico.post(solicitar, { headers: origem, data: {} })).status()).toBe(200);
      const codigo = ambiente.smtp.codigo(negocio.contas.medicoA.email);
      if (caso === 'expirado') operarNegocio('expirar-clinico', negocio.id);
      let contexto = medico;
      if (caso === 'outro-medico') {
        contexto = await negocio.api('medicoB');
        expect((await contexto.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha: senha(), confirmarSenha: senha() } })).status()).toBe(201);
      }
      const recebido = ['incorreto', 'tentativas'].includes(caso) ? '000000' : codigo;
      const dados = { codigo: recebido, novaSenha: nova(), confirmarSenha: nova() };
      for (let i = 0; i < (caso === 'tentativas' ? 5 : 1); i++) expect((await contexto.post(concluir, { headers: origem, data: dados })).status()).toBe(caso === 'sucesso' ? 200 : 400);
      if (caso === 'sucesso') {
        expect((await medico.post(concluir, { headers: origem, data: dados })).status()).toBe(400);
        expect((await medico.get('/perfil')).status()).toBe(200);
        const antigo = antigos.cookies.find(c => c.name === 'prontuario_access')!;
        const principal = antigos.cookies.find(c => c.name === 'access_token')!;
        expect((await medico.get('/prontuarios/acesso/sessao', { headers: { Cookie: `access_token=${principal.value}; prontuario_access=${antigo.value}` } })).status()).toBe(403);
        expect((await medico.post('/prontuarios/acesso/verificar', { headers: origem, data: { senha: senha() } })).status()).toBe(401);
        expect((await medico.post('/prontuarios/acesso/verificar', { headers: origem, data: { senha: nova() } })).status()).toBe(200);
        expect(inspecionarNegocio(negocio.id).auditorias.login.some(e => e.acao === 'SENHA_PRONTUARIO_REDEFINIDA' && e.usuarioId === negocio.contas.medicoA.id)).toBe(true);
        expect(inspecionarNegocio(negocio.id).auditorias.login.some(e => e.acao === 'SENHA_PRONTUARIO_CRIADA' && e.usuarioId === negocio.contas.medicoA.id)).toBe(true);
      }
      if (caso === 'tentativas') {
        expect((await medico.post(concluir, { headers: origem, data: { codigo, novaSenha: nova(), confirmarSenha: nova() } })).status()).toBe(429);
        expect(inspecionarNegocio(negocio.id).codigos[0]).toMatchObject({ usado: true, tentativas: 5, hashSeguro: true });
      }
    });
  }
  for (const papel of ['admin', 'pacienteA'] as const) test(`Perfil ${papel} não solicita nem conclui recuperação clínica`, async ({ negocio, ambiente }) => {
    const api = await negocio.api(papel);
    expect((await api.post(solicitar, { headers: origem, data: {} })).status()).toBe(403);
    expect((await api.post(concluir, { headers: origem, data: { codigo: '123456', novaSenha: nova(), confirmarSenha: nova() } })).status()).toBe(403);
    expect(ambiente.smtp.mensagens.length).toBe(0);
  });
  test('Não aceita destinatário imposto nem código malformado e confirmação divergente', async ({ negocio, ambiente }) => {
    const medico = await negocio.api('medicoA');
    expect((await medico.post(solicitar, { headers: origem, data: { email: negocio.contas.medicoB.email } })).status()).toBe(400);
    for (const dados of [{ codigo: '123', novaSenha: nova(), confirmarSenha: nova() }, { codigo: '123456', novaSenha: nova(), confirmarSenha: 'Outra9!' }]) expect((await medico.post(concluir, { headers: origem, data: dados })).status()).toBe(400);
    expect(ambiente.smtp.mensagens.length).toBe(0);
  });
});

test('Recuperação clínica limita o quarto envio e mantém apenas o último código ativo', async ({ negocio, ambiente }) => {
  const medico = await negocio.api('medicoA');
  expect((await medico.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha: senha(), confirmarSenha: senha() } })).status()).toBe(201);
  for (let n = 0; n < 3; n++) expect((await medico.post(solicitar, { headers: origem, data: {} })).status()).toBe(200);
  expect((await medico.post(solicitar, { headers: origem, data: {} })).status()).toBe(429);
  expect(ambiente.smtp.mensagens.length).toBe(3);
  expect(inspecionarNegocio(negocio.id).codigos.filter(c => !c.usado)).toHaveLength(1);
});

test('Falha de SMTP clínico é genérica, invalida o código e permite novo envio', async ({ negocio, ambiente }) => {
  const medico = await negocio.api('medicoA');
  expect((await medico.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha: senha(), confirmarSenha: senha() } })).status()).toBe(201);
  ambiente.smtp.falharEnvio(true);
  const falha = await medico.post(solicitar, { headers: origem, data: {} });
  expect(falha.status()).toBe(500);
  expect(await falha.json()).toEqual({ mensagem: 'Não foi possível processar a solicitação. Tente novamente mais tarde.' });
  expect(inspecionarNegocio(negocio.id).codigos.every(c => c.usado && c.hashSeguro)).toBe(true);
  expect(ambiente.smtp.mensagens.length).toBe(0);
  ambiente.smtp.falharEnvio(false);
  expect((await medico.post(solicitar, { headers: origem, data: {} })).status()).toBe(200);
  expect(ambiente.smtp.mensagens.length).toBe(1);
});

test('Sexta tentativa de desbloqueio clínico é limitada sem criar autorização', async ({ negocio }) => {
  const medico = await negocio.api('medicoA');
  expect((await medico.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha: senha(), confirmarSenha: senha() } })).status()).toBe(201);
  for (let n = 0; n < 5; n++) expect((await medico.post('/prontuarios/acesso/verificar', { headers: origem, data: { senha: 'SenhaFicticiaErrada9!' } })).status()).toBe(401);
  expect((await medico.post('/prontuarios/acesso/verificar', { headers: origem, data: { senha: senha() } })).status()).toBe(429);
  expect((await medico.storageState()).cookies.some(c => c.name === 'prontuario_access')).toBe(false);
});

test('Recuperação clínica consome o código apenas uma vez sob conclusões simultâneas', async ({ negocio, ambiente }) => {
  const medico = await negocio.api('medicoA');
  expect((await medico.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha: senha(), confirmarSenha: senha() } })).status()).toBe(201);
  expect((await medico.post(solicitar, { headers: origem, data: {} })).status()).toBe(200);
  const dados = { codigo: ambiente.smtp.codigo(negocio.contas.medicoA.email), novaSenha: nova(), confirmarSenha: nova() };
  const respostas = await Promise.all([medico.post(concluir, { headers: origem, data: dados }), medico.post(concluir, { headers: origem, data: dados })]);
  expect(respostas.map(r => r.status()).sort()).toEqual([200, 400]);
});
