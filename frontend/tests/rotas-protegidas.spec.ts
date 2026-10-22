import { test, expect } from "@playwright/test";

// ========================================
// TESTES DE ROTAS PROTEGIDAS
// ========================================
//
// Simulamos a resposta 401 da API,
// indicando que não existe sessão válida.
//
// Isso permite testar o redirecionamento
// sem depender do banco de dados.

test.describe("Proteção de rotas sem autenticação", () => {

  const rotasProtegidas = [
    "/admin",
    "/admin/medicos/cadastrar",
    "/medico",
    "/paciente",
    "/paciente/agendar",
    "/paciente/agendamentos"
  ];

  for (const rota of rotasProtegidas) {

    test(`Deve bloquear acesso a ${rota}`, async ({ page }) => {

      // ========================================
      // SIMULAR USUÁRIO NÃO AUTENTICADO
      // ========================================

      await page.route(
        "**/perfil",
        async (route) => {
          await route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({
              mensagem: "Sessão inválida ou expirada."
            })
          });
        }
      );

      // ========================================
      // TENTAR ACESSAR A ROTA
      // ========================================

      await page.goto(rota);

      // ========================================
      // VERIFICAR REDIRECIONAMENTO
      // ========================================

      await expect(page).toHaveURL(
        /\/login\/?$/
      );

      // Confirma que a tela de login
      // foi apresentada ao usuário.
      await expect(
        page.locator("form.login-form")
      ).toBeVisible();

    });
  }
});
