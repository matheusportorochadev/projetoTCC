import { test, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { obterSenhaTeste } from './helpers/credenciais';
import { fixtureClinica } from './helpers/fixture-clinica';

const headers = { Origin: 'http://localhost:5173' };
const rota = '/prontuarios/clinicos/pacientes';

test.describe('Prontuários reais com fixtures exclusivas', () => {
  let id: string;
  let fixture: { email: string; pacienteId: number };
  test.beforeEach(() => {
    id = randomUUID();
    fixture = fixtureClinica('criar', id)!;
  });
  test.afterEach(() => { fixtureClinica('limpar', id); });
  async function desbloquear(api: APIRequestContext) {
    expect((await api.post('/auth/login', { headers, data: { email: fixture.email, senha: obterSenhaTeste() } })).status()).toBe(200);
    const resposta = await api.post('/prontuarios/acesso/verificar', { headers, data: { senha: obterSenhaTeste() } });
    expect(resposta.status()).toBe(200);
    return resposta;
  }

  test('Senha clínica incorreta não cria autorização adicional', async ({ request }) => {
    expect((await request.post('/auth/login', { headers, data: { email: fixture.email, senha: obterSenhaTeste() } })).status()).toBe(200);
    const resposta = await request.post('/prontuarios/acesso/verificar', { headers, data: { senha: 'SenhaIncorretaFicticia987!' } });
    expect(resposta.status()).toBe(401);
    expect((await request.get('/prontuarios/acesso/sessao')).status()).toBe(403);
    expect((await request.storageState()).cookies.some(c => c.name === 'prontuario_access')).toBe(false);
  });

  test('Desbloqueia, emite cookie restrito e apaga as duas sessões no logout', async ({ request }) => {
    const resposta = await desbloquear(request);
    expect(await resposta.json()).toMatchObject({ autorizado: true });
    const cookie = (await request.storageState()).cookies.find(c => c.name === 'prontuario_access')!;
    expect(cookie).toMatchObject({ httpOnly: true, secure: false, sameSite: 'Lax', path: '/prontuarios' });
    expect(cookie.expires - Date.now() / 1000).toBeGreaterThan(7100);
    expect(cookie.expires - Date.now() / 1000).toBeLessThanOrEqual(7200);
    expect((await request.get('/prontuarios/acesso/sessao')).status()).toBe(200);
    expect((await request.post('/auth/logout', { headers })).status()).toBe(200);
    expect((await request.get('/perfil')).status()).toBe(401);
    expect((await request.get('/prontuarios/acesso/sessao')).status()).toBe(401);
    expect((await request.storageState()).cookies.filter(c => ['access_token', 'prontuario_access'].includes(c.name))).toHaveLength(0);
  });

  test('Revoga autorização emitida quando a versão da credencial muda', async ({ request }) => {
    await desbloquear(request);
    fixtureClinica('revogar', id);
    expect((await request.get('/perfil')).status()).toBe(200);
    expect((await request.get('/prontuarios/acesso/sessao')).status()).toBe(403);
    expect((await request.get(rota)).status()).toBe(403);
  });

  test('Mantém registros independentes, vínculo anterior e histórico ordenado', async ({ request }) => {
    await desbloquear(request);
    const primeiro = await request.post(`${rota}/${fixture.pacienteId}`, { headers, data: { queixaPrincipal: 'Registro fictício inicial' } });
    expect(primeiro.status()).toBe(201);
    const antigo = (await primeiro.json()).prontuario;
    const segundo = await request.post(`${rota}/${fixture.pacienteId}`, { headers, data: { queixaPrincipal: 'Registro fictício posterior', prontuarioAnteriorId: antigo.id } });
    expect(segundo.status()).toBe(201);
    const novo = (await segundo.json()).prontuario;
    expect(novo.id).not.toBe(antigo.id);
    expect(novo.prontuarioAnteriorId).toBe(antigo.id);
    const detalhe = await request.get(`${rota}/${fixture.pacienteId}/${antigo.id}`);
    expect(detalhe.status()).toBe(200);
    expect((await detalhe.json()).prontuario).toEqual(antigo);
    const historico = await request.get(`${rota}/${fixture.pacienteId}`);
    expect(historico.status()).toBe(200);
    expect((await historico.json()).prontuarios.map((p: { id: number }) => p.id)).toEqual([novo.id, antigo.id]);
  });

  test('Impede leitura e criação em paciente de outro médico após desbloqueio real', async ({ request }) => {
    const outroId = randomUUID();
    const outro = fixtureClinica('criar', outroId)!;
    try {
      await desbloquear(request);
      const lista = await request.get(rota);
      expect(lista.status()).toBe(200);
      const pacientes = (await lista.json()).pacientes;
      expect(pacientes.map((p: { id: number }) => p.id)).toContain(fixture.pacienteId);
      expect(pacientes.map((p: { id: number }) => p.id)).not.toContain(outro.pacienteId);
      const leitura = await request.get(`${rota}/${outro.pacienteId}`);
      expect(leitura.status()).toBe(404);
      expect(await leitura.json()).toEqual({ mensagem: 'Paciente não encontrado.' });
      const escrita = await request.post(`${rota}/${outro.pacienteId}`, { headers, data: { queixaPrincipal: 'Tentativa fictícia indevida' } });
      expect(escrita.status()).toBe(404);
      expect(await escrita.json()).toEqual({ mensagem: 'Paciente não encontrado.' });
    } finally { fixtureClinica('limpar', outroId); }
  });
});
