import { test, expect } from "@playwright/test";
import { obterSenhaTeste } from "./helpers/credenciais";

// ========================================
// TESTES DA SEGUNDA AUTENTICAÇÃO
// ========================================
//
// Verificamos o acesso às rotas que
// controlam a senha dos prontuários.
//
// Não cadastramos nem modificamos senhas.

const API = "http://127.0.0.1:3000";

type Perfil = "ADMIN" | "MEDICO" | "PACIENTE";

const contas: Record<Perfil, string> = {
  ADMIN: "admin.teste@example.com",
  MEDICO: "medico.teste@example.com",
  PACIENTE: "paciente.teste@example.com"
};

// ========================================
// CARREGAR SENHA FICTÍCIA
// ========================================



// ========================================
// TESTE SEM AUTENTICAÇÃO
// ========================================

test("Visitante não consulta situação da senha clínica", async ({
  request
}) => {
  const resposta = await request.get(
    `${API}/prontuarios/acesso/situacao`
  );

  expect(resposta.status()).toBe(401);
});

// ========================================
// TESTES COM SESSÃO PRINCIPAL
// ========================================

const cenarios = [
  { perfil: "PACIENTE", esperado: 403 },
  { perfil: "ADMIN", esperado: 403 },
  { perfil: "MEDICO", esperado: 200 }
] as const;

for (const cenario of cenarios) {

  test(`${cenario.perfil} consulta situação clínica`, async ({
    playwright
  }) => {

    // Um contexto isolado impede que cookies
    // sejam compartilhados entre os perfis.
    const api = await playwright.request.newContext({
      baseURL: API
    });

    try {
      const login = await api.post("/auth/login", {
        headers: {
          Origin: "http://localhost:5173"
        },
        data: {
          email: contas[cenario.perfil],
          senha: obterSenhaTeste()
        }
      });

      expect(login.status()).toBe(200);

      const perfil = await api.get("/perfil");
      expect(perfil.status()).toBe(200);

      const resposta = await api.get(
        "/prontuarios/acesso/situacao"
      );

      expect(resposta.status()).toBe(cenario.esperado);

    } finally {
      await api.dispose();
    }
  });
}

// ========================================
// MÉDICO SEM AUTORIZAÇÃO ADICIONAL
// ========================================

test("Médico não acessa sessão clínica sem desbloqueio", async ({
  playwright
}) => {

  const api = await playwright.request.newContext({
    baseURL: API
  });

  try {
    const login = await api.post("/auth/login", {
      headers: {
        Origin: "http://localhost:5173"
      },
      data: {
        email: contas.MEDICO,
        senha: obterSenhaTeste()
      }
    });

    expect(login.status()).toBe(200);

    // O login principal não deve conceder
    // automaticamente a segunda autorização.
    const resposta = await api.get(
      "/prontuarios/acesso/sessao"
    );

    expect(resposta.status()).toBe(403);

  } finally {
    await api.dispose();
  }
});
