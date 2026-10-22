import { test, expect, type APIRequestContext } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { fixtureClinica } from './helpers/fixture-clinica';
import { iniciarApiIsolada } from './helpers/api-isolada';
import { obterSenhaTeste } from './helpers/credenciais';

// Cookies e senhas ficam em memória. A evidência de falha contém só status.
test.use({ trace: 'off' });
const headers = { Origin: 'http://localhost:5173' };
const clinica = '/prontuarios/acesso/sessao';
type Cookies = { principal: string; adicional: string; ambos: string; jti: string; hash: string };

async function cookies(api: APIRequestContext): Promise<Cookies> {
  const estado = (await api.storageState()).cookies;
  const principal = estado.find(c => c.name === 'access_token')!;
  const adicional = estado.find(c => c.name === 'prontuario_access')!;
  const valorPrincipal = `access_token=${principal.value}`;
  const valorAdicional = `prontuario_access=${adicional.value}`;
  return {
    principal: valorPrincipal, adicional: valorAdicional,
    ambos: `${valorPrincipal}; ${valorAdicional}`,
    jti: JSON.parse(Buffer.from(principal.value.split('.')[1], 'base64url').toString()).jti,
    hash: createHash('sha256').update(principal.value).digest('hex'),
  };
}

test.describe('Revogação persistida por sessão', () => {
  let id: string;
  let email: string;
  let servidor: Awaited<ReturnType<typeof iniciarApiIsolada>>;
  let api: APIRequestContext;
  test.beforeEach(async ({ playwright }) => {
    id = randomUUID();
    email = fixtureClinica('criar', id)!.email;
    servidor = await iniciarApiIsolada();
    api = await playwright.request.newContext({ baseURL: servidor.baseURL });
  });
  test.afterEach(async () => {
    try { await api?.dispose(); } finally {
      try { await servidor?.fechar(); } finally { fixtureClinica('limpar', id); }
    }
  });
  async function autenticar(contexto = api) {
    expect((await contexto.post('/auth/login', { headers, data: { email, senha: obterSenhaTeste() } })).status()).toBe(200);
    expect((await contexto.get('/perfil')).status()).toBe(200);
    expect((await contexto.post('/prontuarios/acesso/verificar', { headers, data: { senha: obterSenhaTeste() } })).status()).toBe(200);
    expect((await contexto.get(clinica)).status()).toBe(200);
    return cookies(contexto);
  }

  test('Login normal emite identificador único e logout remove os dois cookies', async () => {
    const atual = await autenticar();
    expect(atual.jti).toMatch(/^[0-9a-f-]{36}$/i);
    expect((await api.post('/auth/logout', { headers })).status()).toBe(200);
    expect((await api.storageState()).cookies.filter(c => ['access_token', 'prontuario_access'].includes(c.name))).toHaveLength(0);
    expect((await api.get('/perfil')).status()).toBe(401);
  });

  for (const caso of [
    { nome: 'JWT principal antigo', campo: 'principal', rota: '/perfil' },
    { nome: 'JWT clínico antigo sem login principal', campo: 'adicional', rota: clinica },
    { nome: 'os dois cookies antigos simultaneamente', campo: 'ambos', rota: clinica },
  ] as const) {
    test(`Rejeita ${caso.nome} após logout`, async () => {
      const antigos = await autenticar();
      expect((await api.post('/auth/logout', { headers })).status()).toBe(200);
      expect((await api.get(caso.rota, { headers: { Cookie: antigos[caso.campo] } })).status()).toBe(401);
    });
  }

  test('Preserva outra sessão e rejeita autorização clínica ligada à sessão encerrada', async ({ playwright }) => {
    const a = await autenticar();
    const outra = await playwright.request.newContext({ baseURL: servidor.baseURL });
    try {
      const b = await autenticar(outra);
      // Comparações booleanas impedem imprimir hashes/tokens em falhas.
      expect(a.jti !== b.jti).toBe(true);
      expect(a.hash !== b.hash).toBe(true);
      expect((await api.post('/auth/logout', { headers })).status()).toBe(200);
      expect((await api.get('/perfil', { headers: { Cookie: a.principal } })).status()).toBe(401);
      expect((await outra.get('/perfil')).status()).toBe(200);
      expect((await outra.get(clinica)).status()).toBe(200);
      expect((await outra.get(clinica, { headers: { Cookie: `${b.principal}; ${a.adicional}` } })).status()).toBe(403);
    } finally { await outra.dispose(); }
  });

  test('Mantém revogação após reiniciar backend e preserva a sessão independente', async ({ playwright }) => {
    test.setTimeout(45000);
    const a = await autenticar();
    const outra = await playwright.request.newContext({ baseURL: servidor.baseURL });
    let reiniciada: APIRequestContext | undefined;
    try {
      const b = await autenticar(outra);
      expect((await api.post('/auth/logout', { headers })).status()).toBe(200);
      await servidor.fechar();
      servidor = await iniciarApiIsolada();
      reiniciada = await playwright.request.newContext({ baseURL: servidor.baseURL });
      expect((await reiniciada.get('/perfil', { headers: { Cookie: a.principal } })).status()).toBe(401);
      expect((await reiniciada.get(clinica, { headers: { Cookie: a.ambos } })).status()).toBe(401);
      expect((await reiniciada.get('/perfil', { headers: { Cookie: b.principal } })).status()).toBe(200);
      expect((await reiniciada.get(clinica, { headers: { Cookie: b.ambos } })).status()).toBe(200);
    } finally { await reiniciada?.dispose(); await outra.dispose(); }
  });

  test('Logout repetido e concorrente mantém a sessão revogada', async () => {
    const antigos = await autenticar();
    const respostas = await Promise.all([0, 1, 2].map(() => api.post('/auth/logout', {
      headers: { ...headers, Cookie: antigos.principal },
    })));
    expect(respostas.map(r => r.status())).toEqual([200, 200, 200]);
    expect(fixtureClinica('sessoes', id)).toEqual({ quantidade: 1, hashesValidos: true, expiracoesValidas: true });
    expect((await api.get('/perfil', { headers: { Cookie: antigos.principal } })).status()).toBe(401);
  });

  test('Logout sem cookie ou com JWT inválido continua limpando o navegador', async () => {
    expect((await api.post('/auth/logout', { headers })).status()).toBe(200);
    expect((await api.post('/auth/logout', { headers: { ...headers, Cookie: 'access_token=invalido' } })).status()).toBe(200);
    expect((await api.get('/perfil')).status()).toBe(401);
  });

  test('Mede latência de consultas autenticadas sem carga concorrente', async ({ playwright }, testInfo) => {
    void playwright;
    await autenticar();
    const tempos: number[] = [];
    for (let amostra = 0; amostra < 12; amostra++) {
      const inicio = performance.now();
      expect((await api.get('/perfil')).status()).toBe(200);
      tempos.push(performance.now() - inicio);
    }
    tempos.sort((a, b) => a - b);
    await testInfo.attach('latencia-local-sem-segredos', {
      body: JSON.stringify({ amostras: tempos.length, p50Ms: tempos[5], p95Ms: tempos[11] }),
      contentType: 'application/json',
    });
  });
});
