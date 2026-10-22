import { test, expect } from './helpers/recuperacao';
import { origem } from './helpers/negocio';
import { obterSenhaTeste } from './helpers/credenciais';
import { loginVisual, encerrarPagina, verificarLargura } from './helpers/interface-real';
test.use({ trace: 'off' });
test.afterEach(async ({ page }, info) => { await encerrarPagina(page, info); });
for (const [nome, width, height] of [['desktop', 1440, 1000], ['tablet', 820, 1180], ['celular', 390, 844]] as const) test.describe(`Numeração clínica por paciente em ${nome}`, () => {
  test.use({ viewport: { width, height } });
  test('Exibe sequência por paciente, abre o registro correto e preserva IDs após recarregar', async ({ page, negocio, ambiente }) => {
    const medico = await negocio.api('medicoA'); const senha = obterSenhaTeste() + 'Clinica9!';
    expect((await medico.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha, confirmarSenha: senha } })).status()).toBe(201);
    expect((await medico.post('/prontuarios/acesso/verificar', { headers: origem, data: { senha } })).status()).toBe(200);
    const raiz = '/prontuarios/clinicos/pacientes';
    const registros: { paciente: number; id: number; queixaPrincipal: string }[] = [];
    for (const [paciente, texto] of [[negocio.pacienteA.id, 'Primeiro Alfa Fictício'], [negocio.pacienteA2.id, 'Primeiro Beta Fictício'], [negocio.pacienteA.id, 'Segundo Alfa Fictício']] as const) {
      const resposta = await medico.post(`${raiz}/${paciente}`, { headers: origem, data: { queixaPrincipal: texto } });
      expect(resposta.status()).toBe(201); registros.push({ paciente, ...(await resposta.json()).prontuario });
    }
    expect(new Set(registros.map(r => r.id)).size).toBe(3);
    await loginVisual(page, negocio, ambiente.baseURL, 'medicoA');
    await page.goto('/medico/prontuarios');
    await page.getByLabel('Senha dos prontuários', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Desbloquear prontuários', exact: true }).click();
    await page.getByRole('button', { name: 'Consultar prontuários', exact: true }).click();
    await page.getByRole('searchbox').fill('Alfa');
    await page.getByRole('button', { name: /Paciente Fictício Alfa/ }).click();
    for (const numero of [1, 2]) await expect(page.getByText(`Prontuário ${numero}`, { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Consultar prontuários', exact: true }).click();
    await page.getByRole('searchbox').fill('Alfa');
    await page.getByRole('button', { name: /Paciente Fictício Alfa/ }).click();
    for (const numero of [1, 2]) await expect(page.getByText(`Prontuário ${numero}`, { exact: true })).toBeVisible();
    const primeiro = page.getByRole('listitem').filter({ has: page.getByText('Prontuário 1', { exact: true }) });
    await primeiro.getByRole('button', { name: 'Visualizar', exact: true }).click();
    await expect(page.getByText('Primeiro Alfa Fictício', { exact: true }).last()).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Consultar prontuários', exact: true }).click();
    await page.getByRole('searchbox').fill('Beta');
    await page.getByRole('button', { name: /Paciente Fictício Beta/ }).click();
    await expect(page.getByText('Prontuário 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Prontuário 2', { exact: true })).toHaveCount(0);
    for (const registro of registros) {
      const resposta = await medico.get(`${raiz}/${registro.paciente}/${registro.id}`);
      expect(resposta.status()).toBe(200); expect((await resposta.json()).prontuario.id).toBe(registro.id);
    }
    await verificarLargura(page);
  });
});
