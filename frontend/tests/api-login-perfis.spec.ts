import { test, expect } from "@playwright/test";
import { obterSenhaTeste } from "./helpers/credenciais";

// ========================================
// TESTES DE LOGIN DOS TRÊS PERFIS
// ========================================
//
// Executamos requisições HTTP reais
// contra o backend de testes.
//
// Cada teste utiliza um contexto isolado
// de requisições e seus próprios cookies.

const API = "http://127.0.0.1:3000";

// ========================================
// LER SENHA DO AMBIENTE DE TESTES
// ========================================



// ========================================
// CONTAS FICTÍCIAS
// ========================================

const usuarios = [
  {
    tipo: "ADMIN",
    email: "admin.teste@example.com"
  },
  {
    tipo: "MEDICO",
    email: "medico.teste@example.com"
  },
  {
    tipo: "PACIENTE",
    email: "paciente.teste@example.com"
  }
] as const;

// ========================================
// TESTES
// ========================================

test.describe("Login real dos três perfis", () => {

  for (const usuario of usuarios) {

    test(`Deve autenticar ${usuario.tipo}`, async ({
      playwright
    }) => {

      // Cada perfil recebe um contexto independente.
      const api = await playwright.request.newContext({
        baseURL: API
      });

      try {

        // ========================================
        // EFETUAR LOGIN
        // ========================================

        const login = await api.post("/auth/login", {
          data: {
            email: usuario.email,
            senha: obterSenhaTeste()
          },
          headers: {
            Origin: "http://localhost:5173"
          }
        });

        expect(login.status()).toBe(200);

        const corpoLogin = await login.json();

        expect(corpoLogin.usuario.tipo).toBe(
          usuario.tipo
        );

        // O JWT não deve aparecer no JSON.
        expect(corpoLogin).not.toHaveProperty("token");

        // ========================================
        // VALIDAR COOKIE HTTPONLY
        // ========================================

        const cookie = login.headers()["set-cookie"] ?? "";

        expect(cookie).toContain("access_token=");
        expect(cookie.toLowerCase()).toContain("httponly");

        // ========================================
        // CONSULTAR PERFIL AUTENTICADO
        // ========================================

        // O contexto mantém automaticamente
        // o cookie recebido durante o login.
        const perfil = await api.get("/perfil");

        expect(perfil.status()).toBe(200);

        const dadosPerfil = await perfil.json();

        expect(dadosPerfil.usuario.tipo).toBe(
          usuario.tipo
        );

      } finally {

        // Encerra o contexto para não compartilhar
        // cookies entre usuários diferentes.
        await api.dispose();

      }

    });
  }
});
