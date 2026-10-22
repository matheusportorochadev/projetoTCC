import { test, expect } from '@playwright/test';
import { obterSenhaTeste } from './helpers/credenciais';

// Cinco requisições de cadastro respeitam o limite real por instância/IP.
// Nenhuma senha clínica válida é cadastrada na conta compartilhada.
test.describe('Validação do cadastro clínico sem alterar credencial', () => {
  const invalidas = [
    { nome: 'senha curta', senha: 'Aa1!' },
    { nome: 'sem maiúscula', senha: 'abcdefgh123!' },
    { nome: 'sem minúscula', senha: 'ABCDEFGH123!' },
    { nome: 'sem número', senha: 'Abcdefghijk!' },
    { nome: 'sem especial', senha: 'Abcdefgh1234' },
  ];
  for (const cenario of invalidas) {
    test(`Rejeita ${cenario.nome} antes de gravar credencial`, async ({ request }) => {
      const login = await request.post('/auth/login', {
        headers: { Origin: 'http://localhost:5173' },
        data: { email: 'medico.teste@example.com', senha: obterSenhaTeste() },
      });
      expect(login.status()).toBe(200);
      const antes = await request.get('/prontuarios/acesso/situacao');
      expect(antes.status()).toBe(200);
      const resposta = await request.post('/prontuarios/acesso/cadastrar', {
        headers: { Origin: 'http://localhost:5173' },
        data: { senha: cenario.senha, confirmarSenha: cenario.senha },
      });
      expect(resposta.status()).toBe(400);
      const corpo = await resposta.json();
      expect(corpo.erros).toEqual(expect.arrayContaining([expect.objectContaining({ campo: 'senha' })]));
      const depois = await request.get('/prontuarios/acesso/situacao');
      expect(depois.status()).toBe(200);
      expect(await depois.json()).toEqual(await antes.json());
      expect((await request.storageState()).cookies.some(c => c.name === 'prontuario_access')).toBe(false);
    });
  }
});
