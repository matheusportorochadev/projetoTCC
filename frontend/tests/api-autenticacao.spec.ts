import { test, expect } from "@playwright/test";

// ========================================
// TESTES REAIS DA API DE AUTENTICAÇÃO
// ========================================
//
// Estes testes fazem requisições HTTP
// diretamente ao backend do TCC.
//
// Não utilizamos simulação de respostas.
//
// IMPORTANTE:
// O backend precisa estar executando
// na porta 3000 com o banco de testes.

const API_URL = "http://127.0.0.1:3000";

test.describe("Segurança real da API", () => {

  // ========================================
  // TESTE 1 — SEM AUTENTICAÇÃO
  // ========================================

  test("Deve bloquear acesso ao perfil sem JWT", async ({ request }) => {

    const resposta = await request.get(
      `${API_URL}/perfil`
    );

    expect(resposta.status()).toBe(401);

  });

  // ========================================
  // TESTE 2 — TOKEN INVÁLIDO
  // ========================================

  test("Deve rejeitar um JWT inválido", async ({ request }) => {

    const resposta = await request.get(
      `${API_URL}/perfil`,
      {
        headers: {
          Cookie: "access_token=token-invalido-para-teste"
        }
      }
    );

    expect(resposta.status()).toBe(401);

  });

});
