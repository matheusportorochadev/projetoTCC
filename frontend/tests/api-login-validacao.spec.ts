import { test, expect } from '@playwright/test';

test.describe('Validação real do login', () => {
  const casos = [
    { nome: 'JSON vazio', data: {} },
    { nome: 'e-mail ausente', data: { senha: 'Ficticia123!' } },
    { nome: 'senha ausente', data: { email: 'teste@example.com' } },
    { nome: 'e-mail inválido', data: { email: 'invalido', senha: 'Ficticia123!' } },
    { nome: 'tipos incorretos', data: { email: 123, senha: true } },
    { nome: 'campos extras', data: { email: 'teste@example.com', senha: 'Ficticia123!', tipo: 'ADMIN' } },
  ];
  for (const caso of casos) {
    test(`Rejeita ${caso.nome} sem emitir sessão`, async ({ request }) => {
      const resposta = await request.post('/auth/login', { headers: { Origin: 'http://localhost:5173' }, data: caso.data });
      expect(resposta.status()).toBe(400);
      expect((await request.storageState()).cookies.some(c => c.name === 'access_token')).toBe(false);
    });
  }
});
