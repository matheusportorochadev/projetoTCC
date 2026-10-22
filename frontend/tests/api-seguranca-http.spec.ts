import { test, expect } from '@playwright/test';

test.describe('Proteções HTTP reais', () => {
  test('Helmet impede sniffing, framing e identificação do Express', async ({ request }) => {
    const resposta = await request.get('/');
    expect(resposta.status()).toBe(200);
    expect(resposta.headers()['x-content-type-options']).toBe('nosniff');
    expect(resposta.headers()['x-frame-options']).toBe('SAMEORIGIN');
    expect(resposta.headers()['content-security-policy']).toContain("frame-ancestors 'self'");
    expect(resposta.headers()['x-powered-by']).toBeUndefined();
  });
  test('CORS permite origem configurada e credenciais', async ({ request }) => {
    const resposta = await request.get('/', { headers: { Origin: 'http://localhost:5173' } });
    expect(resposta.status()).toBe(200);
    expect(resposta.headers()['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(resposta.headers()['access-control-allow-credentials']).toBe('true');
  });
  test('CORS rejeita origem externa sem refletir permissão', async ({ request }) => {
    const resposta = await request.get('/', { headers: { Origin: 'https://origem-nao-permitida.example' } });
    expect(resposta.status()).toBe(403);
    expect(resposta.headers()['access-control-allow-origin']).toBeUndefined();
    expect(await resposta.json()).toEqual({ mensagem: 'Origem da requisição não autorizada.' });
  });
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    test(`CSRF bloqueia ${method} sem Origin antes de qualquer alteração`, async ({ request }) => {
      const resposta = await request.fetch('/medicos/1', { method, data: {} });
      expect(resposta.status()).toBe(403);
    });
  }
  test('Preflight declara métodos e credenciais permitidos', async ({ request }) => {
    const resposta = await request.fetch('/auth/login', { method: 'OPTIONS', headers: {
      Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type',
    } });
    expect(resposta.status()).toBe(204);
    expect(resposta.headers()['access-control-allow-methods']).toContain('POST');
    expect(resposta.headers()['access-control-allow-credentials']).toBe('true');
  });
});
