import { test, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { iniciarApiIsolada } from './helpers/api-isolada';
import { fixtureClinica } from './helpers/fixture-clinica';
import { obterSenhaTeste } from './helpers/credenciais';

const headers = { Origin: 'http://localhost:5173' };

// Cookies capturados ficam somente na memória; evidências contêm metadados.
test.use({ trace: 'off' });

test.describe('Cadastro clínico e limite em instâncias isoladas', () => {

  let id: string;
  let api: APIRequestContext;
  let servidor: Awaited<ReturnType<typeof iniciarApiIsolada>>;
  test.beforeEach(async ({ playwright }) => {
    id = randomUUID();
    const fixture = fixtureClinica('criar-sem-acesso', id)!;
    servidor = await iniciarApiIsolada();
    api = await playwright.request.newContext({ baseURL: servidor.baseURL });
    expect((await api.post('/auth/login', { headers, data: { email: fixture.email, senha: obterSenhaTeste() } })).status()).toBe(200);
  });
  test.afterEach(async () => {
    await api?.dispose();
    await servidor?.fechar();
    fixtureClinica('limpar', id);
  });

  test('Cadastra primeira senha, rejeita segunda e desbloqueia a credencial original', async () => {
    expect(await (await api.get('/prontuarios/acesso/situacao')).json()).toEqual({ senhaCadastrada: false });
    const senha = `Aa1!${randomUUID()}`;
    expect((await api.post('/prontuarios/acesso/cadastrar', { headers, data: { senha, confirmarSenha: senha } })).status()).toBe(201);
    expect(await (await api.get('/prontuarios/acesso/situacao')).json()).toEqual({ senhaCadastrada: true });
    expect((await api.post('/prontuarios/acesso/cadastrar', { headers, data: { senha, confirmarSenha: senha } })).status()).toBe(409);
    expect((await api.post('/prontuarios/acesso/verificar', { headers, data: { senha } })).status()).toBe(200);
    expect((await api.get('/prontuarios/acesso/sessao')).status()).toBe(200);
  });

  test('Rejeita confirmação divergente e campos extras sem cadastrar senha', async () => {
    const senha = `Aa1!${randomUUID()}`;
    for (const data of [ { senha, confirmarSenha: 'Diferente123!' }, { senha, confirmarSenha: senha, medicoId: 1 } ]) {
      expect((await api.post('/prontuarios/acesso/cadastrar', { headers, data })).status()).toBe(400);
    }
    expect(await (await api.get('/prontuarios/acesso/situacao')).json()).toEqual({ senhaCadastrada: false });
  });

  test('Logout invalida no servidor a autorização clínica anteriormente emitida', async ({ playwright }, testInfo) => {
    void playwright;
    const senha = `Aa1!${randomUUID()}`;
    expect((await api.post('/prontuarios/acesso/cadastrar', { headers, data: { senha, confirmarSenha: senha } })).status()).toBe(201);
    expect((await api.post('/prontuarios/acesso/verificar', { headers, data: { senha } })).status()).toBe(200);
    const capturados = (await api.storageState()).cookies
      .filter(c => ['access_token', 'prontuario_access'].includes(c.name))
      .map(c => `${c.name}=${c.value}`).join('; ');
    expect((await api.post('/auth/logout', { headers })).status()).toBe(200);
    expect((await api.get('/perfil')).status()).toBe(401);
    const repeticao = await api.get('/prontuarios/acesso/sessao', { headers: { Cookie: capturados } });
    await testInfo.attach('resultado-sem-segredos', { body: JSON.stringify({ rota: '/prontuarios/acesso/sessao', statusAposLogout: repeticao.status() }), contentType: 'application/json' });
    expect([401, 403]).toContain(repeticao.status());
  });

  test('Sexta tentativa de cadastro é limitada sem afetar as demais instâncias', async () => {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      expect((await api.post('/prontuarios/acesso/cadastrar', { headers, data: {} })).status()).toBe(400);
    }
    const limitada = await api.post('/prontuarios/acesso/cadastrar', { headers, data: {} });
    expect(limitada.status()).toBe(429);
    expect(Number(limitada.headers()['retry-after'])).toBeGreaterThan(0);
    expect(await (await api.get('/prontuarios/acesso/situacao')).json()).toEqual({ senhaCadastrada: false });
  });
});
