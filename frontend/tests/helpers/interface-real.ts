import { expect, type Page, type TestInfo } from '@playwright/test';
import type { Negocio, Papel } from './negocio';
import { obterSenhaTeste } from './credenciais';

// Proxy HTTP local: todas as respostas vêm do backend real guardado da fixture.
// A origem pública localhost:3000 é preservada para cookies e CORS do navegador.
export async function conectarApiVisual(page: Page, baseURL: string) {
  await page.route('http://localhost:3000/**', async route => {
    const url = new URL(route.request().url());
    try {
      const resposta = await route.fetch({ url: baseURL + url.pathname + url.search });
      if (!page.isClosed()) await route.fulfill({ response: resposta });
    } catch {
      // Fechar a página pode interromper leituras em andamento. Não propagar o
      // erro bruto do Playwright, que inclui cookies nos cabeçalhos da chamada.
      if (!page.isClosed()) throw new Error('Falha HTTP no proxy local; detalhes de autenticação omitidos.');
    }
  });
}
export async function loginVisual(page: Page, negocio: Negocio, baseURL: string, papel: Papel) {
  await conectarApiVisual(page, baseURL);
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(negocio.contas[papel].email);
  await page.getByLabel('Senha', { exact: true }).fill(obterSenhaTeste());
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const area = papel === 'admin' ? 'admin' : papel.startsWith('medico') ? 'medico' : 'paciente';
  await expect(page).toHaveURL(new RegExp(`/${area}(?:/.*)?$`));
  expect((await page.context().cookies()).some(c => c.name === 'access_token' && c.httpOnly)).toBe(true);
}
export async function sairVisual(page: Page) {
  const menu = page.getByRole('button', { name: 'Abrir menu', exact: true });
  const sair = page.getByRole('button', { name: /(?:^|\s)Sair$/ }).filter({ visible: true });
  if (!(await sair.count()) && await menu.isVisible()) await menu.click();
  await sair.first().click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.context().cookies()).some(c => c.name === 'access_token')).toBe(false);
}
export async function verificarLargura(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}
export async function alternarTema(page: Page) {
  const botao = page.getByRole('button', { name: /(?:Ativar )?(tema|modo) (escuro|claro)/i }).filter({ visible: true }).first();
  if (!(await botao.count())) {
    const menu = page.getByRole('button', { name: 'Abrir menu', exact: true });
    if (await menu.isVisible()) await menu.click();
  }
  if (await botao.count()) {
    const antes = await page.evaluate(() => document.body.className);
    await botao.click();
    await expect.poll(() => page.evaluate(() => document.body.className)).not.toBe(antes);
  }
}

export async function encerrarPagina(page: Page, info: TestInfo) {
  try {
    if (info.status !== info.expectedStatus && !page.isClosed()) {
      await info.attach('falha-interface', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
  } finally { await page.close(); }
}
