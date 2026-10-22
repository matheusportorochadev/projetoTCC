import { test, expect } from "@playwright/test";

test("O sistema deve carregar no navegador", async ({ page }) => {

  // Abre a página inicial do frontend.
  const resposta = await page.goto("/");

  // Verifica se o servidor respondeu.
  expect(resposta).not.toBeNull();

  // Confirma que não ocorreu erro HTTP.
  expect(resposta!.ok()).toBeTruthy();

  // Verifica se existe conteúdo na página.
  await expect(page.locator("body")).toBeVisible();

  // Confirma que o React montou sua aplicação.
  await expect(page.locator("#root")).toBeAttached();

});
