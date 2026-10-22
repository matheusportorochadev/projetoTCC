import { test, expect } from './helpers/recuperacao';
import { operarNegocio } from './helpers/negocio';
import { obterSenhaTeste } from './helpers/credenciais';
import { conectarApiVisual, encerrarPagina, verificarLargura } from './helpers/interface-real';
test.use({ trace: 'off', viewport: { width: 390, height: 844 } });
test.afterEach(async ({ page }, info) => { await encerrarPagina(page, info); });
async function preencherCodigo(page: import('@playwright/test').Page, codigo: string) {
  for (let i = 0; i < 6; i++) await page.getByRole('textbox', { name: `Dígito ${i + 1} do código`, exact: true }).fill(codigo[i]);
}
test.describe('Credenciais pelo navegador com SMTP local', () => {
  for (const papel of ['medicoA', 'pacienteA'] as const) test(`Primeiro acesso visual de ${papel} cria senha e permite login`, async ({ page, negocio, ambiente }) => {
    operarNegocio('elegivel', negocio.id, papel);
    await conectarApiVisual(page, ambiente.baseURL);
    await page.goto('/primeiro-acesso');
    await page.getByLabel('E-mail', { exact: true }).fill(negocio.contas[papel].email);
    await page.getByRole('button', { name: 'Enviar código', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Dígito 1 do código', exact: true })).toBeVisible();
    await preencherCodigo(page, ambiente.smtp.codigo(negocio.contas[papel].email));
    const senha = obterSenhaTeste() + 'Nova9!';
    await page.getByLabel('Nova senha', { exact: true }).fill(senha);
    await page.getByLabel('Confirmar senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Criar minha senha', exact: true }).click();
    await expect(page.getByText('Senha criada', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('E-mail', { exact: true }).fill(negocio.contas[papel].email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(papel === 'medicoA' ? /\/medico\/pacientes$/ : /\/paciente$/);
    await verificarLargura(page);
  });
  test('Reenvio mantém formulário de código para concluir primeiro acesso com o código novo', async ({ page, negocio, ambiente }) => {
    operarNegocio('elegivel', negocio.id, 'pacienteA');
    await conectarApiVisual(page, ambiente.baseURL);
    await page.goto('/primeiro-acesso');
    await page.getByLabel('E-mail', { exact: true }).fill(negocio.contas.pacienteA.email);
    await page.getByRole('button', { name: 'Enviar código', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Dígito 1 do código', exact: true })).toBeVisible();
    const resposta = page.waitForResponse(r => r.url().includes('/primeiro-acesso/solicitar') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Reenviar código', exact: true }).click();
    expect((await resposta).status()).toBe(200);
    expect(ambiente.smtp.mensagens.length).toBe(2);
    await expect(page.getByRole('textbox', { name: 'Dígito 1 do código', exact: true })).toBeVisible();
    await preencherCodigo(page, ambiente.smtp.codigo(negocio.contas.pacienteA.email));
    const senha = obterSenhaTeste() + 'Nova9!';
    await page.getByLabel('Nova senha', { exact: true }).fill(senha);
    await page.getByLabel('Confirmar senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Criar minha senha', exact: true }).click();
    await expect(page.getByText('Senha criada', { exact: true })).toBeVisible();
  });
  test('Paciente recupera senha pelo navegador e autentica com a credencial nova', async ({ page, negocio, ambiente }) => {
    await conectarApiVisual(page, ambiente.baseURL);
    await page.goto('/esqueci-senha');
    await page.getByLabel('E-mail cadastrado', { exact: true }).fill(negocio.contas.pacienteA.email);
    await page.getByRole('button', { name: 'Enviar código de recuperação', exact: true }).click();
    await expect(page).toHaveURL(/\/redefinir-senha$/);
    await preencherCodigo(page, ambiente.smtp.codigo(negocio.contas.pacienteA.email));
    const senha = obterSenhaTeste() + 'Nova9!';
    await page.getByLabel('Nova senha', { exact: true }).fill(senha);
    await page.getByLabel('Confirmar nova senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Redefinir senha', exact: true }).click();
    await expect(page.getByText('Senha redefinida', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByLabel('E-mail', { exact: true }).fill(negocio.contas.pacienteA.email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/paciente$/); await verificarLargura(page);
  });
  test('Erro real de login é visível no celular e mantém o formulário disponível', async ({ page, negocio, ambiente }) => {
    await conectarApiVisual(page, ambiente.baseURL); await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(negocio.contas.pacienteA.email);
    await page.getByLabel('Senha', { exact: true }).fill(obterSenhaTeste() + 'Errada9!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByText('E-mail ou senha inválidos.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
    await expect(page).toHaveURL(/\/login$/); await verificarLargura(page);
  });
});
