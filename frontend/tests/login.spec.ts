import { test, expect } from "@playwright/test";

// ========================================
// TESTES AUTOMATIZADOS DE LOGIN
// ========================================
//
// Estes testes verificam a interface.
// Nenhuma requisição de autenticação
// é enviada ao backend.

test.describe("Tela de login", () => {

  // ========================================
  // TESTE 1: ABERTURA DO LOGIN
  // ========================================

  test("Deve abrir a tela de login", async ({ page }) => {

    await page.goto("/login");

    await expect(
      page.locator("form.login-form")
    ).toBeVisible();

    await expect(
      page.locator("#email")
    ).toBeVisible();

  });

  // ========================================
  // TESTE 2: CAMPOS OBRIGATÓRIOS
  // ========================================

  test("Deve apresentar e-mail e senha", async ({ page }) => {

    await page.goto("/login");

    await expect(
      page.locator('input[type="email"]')
    ).toBeVisible();

    await expect(
      page.locator('input[type="password"]')
    ).toBeVisible();

    await expect(
      page.locator('button[type="submit"]')
    ).toBeVisible();

  });

  // ========================================
  // TESTE 3: PREENCHIMENTO
  // ========================================

  test("Deve permitir preencher as credenciais", async ({ page }) => {

    await page.goto("/login");

    const email = page.locator("#email");

    const senha =
      page.locator('input[type="password"]');

    await email.fill("teste@example.com");

    await senha.fill("SenhaFicticia123!");

    await expect(email).toHaveValue(
      "teste@example.com"
    );

    await expect(senha).toHaveValue(
      "SenhaFicticia123!"
    );

    // Não clicamos em Entrar:
    // o objetivo é testar apenas o formulário.

  });

});
