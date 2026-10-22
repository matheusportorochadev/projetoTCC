import { randomUUID } from 'node:crypto';
import { test, expect } from './helpers/recuperacao';
import { origem } from './helpers/negocio';
import { assinarJwtTeste, obterSenhaTeste } from './helpers/credenciais';
test.use({ trace: 'off' });
test.describe('JWT e entradas HTTP adversariais ainda não cobertas', () => {
  for (const caso of ['expirado', 'emissor', 'audiencia', 'assinatura', 'perfil', 'sub', 'futuro'] as const) test(`JWT principal rejeita ${caso}`, async ({ negocio, api, ambiente }) => {
    const agora = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = { sub: String(negocio.contas.medicoA.id), tipo: 'MEDICO', iss: 'tcc-consultorio-api', aud: 'tcc-consultorio-web', iat: agora, exp: agora + 300, jti: randomUUID() };
    // Controle positivo comprova a assinatura antes de variar um único claim.
    expect((await api.get('/perfil', { headers: { Cookie: `access_token=${assinarJwtTeste(payload, ambiente.chaveJwt)}` } })).status()).toBe(200);
    if (caso === 'expirado') payload.exp = agora - 1;
    if (caso === 'emissor') payload.iss = 'outro-emissor';
    if (caso === 'audiencia') payload.aud = 'outra-audiencia';
    if (caso === 'perfil') payload.tipo = 'ADMIN';
    if (caso === 'sub') payload.sub = '-1';
    if (caso === 'futuro') payload.nbf = agora + 3600;
    const resposta = await api.get('/perfil', { headers: { Cookie: `access_token=${assinarJwtTeste(payload, ambiente.chaveJwt, false, caso === 'assinatura')}` } });
    expect(resposta.status()).toBe(401);
  });
  for (const caso of ['expirado', 'finalidade', 'outro-usuario', 'emissor', 'audiencia', 'vinculo'] as const) test(`JWT clínico rejeita ${caso}`, async ({ negocio, ambiente }) => {
    const medico = await negocio.api('medicoA'); const senha = obterSenhaTeste() + 'Clinica9!';
    expect((await medico.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha, confirmarSenha: senha } })).status()).toBe(201);
    expect((await medico.post('/prontuarios/acesso/verificar', { headers: origem, data: { senha } })).status()).toBe(200);
    const cookies = (await medico.storageState()).cookies;
    const principal = cookies.find(c => c.name === 'access_token')!.value;
    const adicional = cookies.find(c => c.name === 'prontuario_access')!.value;
    const payload = JSON.parse(Buffer.from(adicional.split('.')[1], 'base64url').toString()) as Record<string, unknown>;
    expect((await medico.get('/prontuarios/acesso/sessao', { headers: { Cookie: `access_token=${principal}; prontuario_access=${assinarJwtTeste(payload, ambiente.chaveJwt, true)}` } })).status()).toBe(200);
    if (caso === 'expirado') payload.exp = Math.floor(Date.now() / 1000) - 1;
    if (caso === 'finalidade') payload.finalidade = 'OUTRA';
    if (caso === 'outro-usuario') payload.sub = String(negocio.contas.medicoB.id);
    if (caso === 'emissor') payload.iss = 'outro';
    if (caso === 'audiencia') payload.aud = 'outro';
    if (caso === 'vinculo') payload.vinculoSessao = '0'.repeat(64);
    const resposta = await medico.get('/prontuarios/acesso/sessao', { headers: { Cookie: `access_token=${principal}; prontuario_access=${assinarJwtTeste(payload, ambiente.chaveJwt, true)}` } });
    expect(resposta.status()).toBe(403);
  });
  test('JSON malformado retorna erro de cliente, sem stack ou detalhes internos', async ({ api }) => {
    const resposta = await api.post('/auth/login', { headers: { ...origem, 'Content-Type': 'application/json' }, data: '{"email":' });
    expect.soft(resposta.status()).toBe(400); expect(Object.keys(await resposta.json())).toEqual(['mensagem']);
  });
  test('Corpo acima de 10kb retorna 413 e servidor continua disponível', async ({ api }) => {
    const resposta = await api.post('/auth/login', { headers: origem, data: { email: 'x@example.com', senha: 'x'.repeat(11000) } });
    expect.soft(resposta.status()).toBe(413); expect((await api.get('/perfil')).status()).toBe(401);
  });
  for (const id of ['0', '-1', 'abc', '9007199254740992']) test(`ID manipulado ${id} não alcança dados de pacientes`, async ({ negocio }) => {
    expect((await (await negocio.api('medicoA')).get(`/pacientes/${id}`)).status()).toBe(400);
  });
});

test('Décima primeira falha de login é limitada e auditada sem afetar sessão administrativa válida', async ({ negocio, api, ambiente }) => {
  const admin = await negocio.api('admin');
  const rota = '/admin/auditoria/login?acao=LOGIN_BLOQUEADO&resultado=FALHA';
  const antes = await (await admin.get(rota)).json();
  for (let i = 0; i < 10; i++) expect((await api.post('/auth/login', { headers: origem, data: { email: negocio.email('inexistente'), senha: obterSenhaTeste() } })).status()).toBe(401);
  expect((await api.post('/auth/login', { headers: origem, data: { email: negocio.email('inexistente'), senha: obterSenhaTeste() } })).status()).toBe(429);
  const depois = await (await admin.get(rota)).json();
  expect(depois.total).toBe(antes.total + 1);
  expect(depois.registros[0]).toMatchObject({ usuarioId: null, acao: 'LOGIN_BLOQUEADO', resultado: 'FALHA' });
  expect((await admin.get('/perfil')).status()).toBe(200);
  expect(ambiente.smtp.mensagens.length).toBe(0);
});
