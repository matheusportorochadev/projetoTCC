import { test, expect } from "@playwright/test";
import { obterSenhaTeste } from "./helpers/credenciais";

// ========================================
// TESTES DE SEGURANÇA DOS PRONTUÁRIOS
// ========================================
//
// Utilizamos a API real e usuários
// fictícios do banco de testes.
//
// Nenhum prontuário será criado,
// alterado ou excluído.

const ROTA = "/prontuarios/clinicos/pacientes";

// ========================================
// SENHA DAS CONTAS FICTÍCIAS
// ========================================



// ========================================
// USUÁRIOS E RESULTADOS ESPERADOS
// ========================================

const cenarios = [
  {
    perfil: "PACIENTE",
    email: "paciente.teste@example.com",
    esperado: 403
  },
  {
    perfil: "ADMIN",
    email: "admin.teste@example.com",
    esperado: 403
  },
  {
    perfil: "MEDICO",
    email: "medico.teste@example.com",
    esperado: 403
  }
] as const;

// ========================================
// TESTES
// ========================================

test.describe("Segurança clínica dos prontuários", () => {

  test("Deve bloquear visitante sem login", async ({
    playwright
  }) => {

    const api = await playwright.request.newContext({
      baseURL: "http://127.0.0.1:3000"
    });

    try {
      const resposta = await api.get(ROTA);

      expect(resposta.status()).toBe(401);
    } finally {
      await api.dispose();
    }

  });

  for (const cenario of cenarios) {

    test(
      `Deve bloquear ${cenario.perfil} sem autorização clínica`,
      async ({ playwright }) => {

        // ========================================
        // CONTEXTO HTTP ISOLADO
        // ========================================

        const api = await playwright.request.newContext({
          baseURL: "http://127.0.0.1:3000"
        });

        try {

          // ========================================
          // LOGIN PRINCIPAL
          // ========================================

          const login = await api.post("/auth/login", {
            headers: {
              Origin: "http://localhost:5173"
            },
            data: {
              email: cenario.email,
              senha: obterSenhaTeste()
            }
          });

          expect(login.status()).toBe(200);

          // Confirma que o login realmente criou
          // uma sessão autenticada.
          const perfil = await api.get("/perfil");

          expect(perfil.status()).toBe(200);

          // ========================================
          // TENTAR ACESSAR PRONTUÁRIOS
          // ========================================

          const resposta = await api.get(ROTA);

          expect(resposta.status()).toBe(
            cenario.esperado
          );

        } finally {
          await api.dispose();
        }

      }
    );

  }

});
