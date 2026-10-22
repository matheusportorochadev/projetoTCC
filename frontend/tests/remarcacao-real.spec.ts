import { test, expect } from './helpers/recuperacao';
import { dataFutura, disponibilidade, solicitar, origem } from './helpers/negocio';
import { encerrarPagina, loginVisual, sairVisual } from './helpers/interface-real';

test.use({ trace: 'off' });
test.setTimeout(60000);
test.afterEach(async ({ page }, info) => { await encerrarPagina(page, info); });
test.describe('Remarcação completa com troca real entre paciente e médico', () => {
  for (const decisao of ['aceitar', 'recusar'] as const) test(`Paciente solicita e médico decide ${decisao} pela interface`, async ({ page, negocio, ambiente }) => {
    const data = dataFutura(3); await disponibilidade(negocio, data);
    const consulta = await solicitar(negocio, '08:00', data);
    const medico = await negocio.api('medicoA');
    expect((await medico.patch(`/agendamentos/${consulta.id}/confirmar`, { headers: origem })).status()).toBe(200);
    await loginVisual(page, negocio, ambiente.baseURL, 'pacienteA');
    await page.goto('/paciente/agendamentos');
    await page.getByRole('button', { name: 'Remarcar', exact: true }).click();
    const alvo = new Date(data + 'T12:00:00'); const hoje = new Date();
    if (alvo.getMonth() !== hoje.getMonth() || alvo.getFullYear() !== hoje.getFullYear()) await page.getByRole('button', { name: 'Próximo mês', exact: true }).click();
    const dia = page.getByRole('button', { name: new RegExp(`^${alvo.getDate()}(?:\\s|$)`) });
    await expect(dia).toBeEnabled(); await dia.click();
    await page.getByRole('button', { name: /^09:00/ }).click();
    await page.getByRole('button', { name: 'Solicitar remarcação', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Remarcação pendente', exact: true })).toBeVisible();
    await sairVisual(page); await loginVisual(page, negocio, ambiente.baseURL, 'medicoA');
    await page.goto('/medico/agenda');
    await page.getByRole('button', { name: /Horários marcados/ }).click();
    await page.getByRole('button', { name: decisao === 'aceitar' ? 'Aceitar remarcação' : 'Recusar', exact: true }).click();
    await page.getByRole('button', { name: decisao === 'aceitar' ? 'Aceitar remarcação' : 'Recusar remarcação', exact: true }).last().click();
    const paciente = await negocio.api('pacienteA');
    await expect.poll(async () => (await (await paciente.get('/agendamentos/remarcacoes/minhas')).json()).remarcacoes[0]?.status).toBe(decisao === 'aceitar' ? 'ACEITA' : 'RECUSADA');
    await sairVisual(page); await loginVisual(page, negocio, ambiente.baseURL, 'pacienteA');
    await page.goto('/paciente/agendamentos');
    await expect(page.getByText('Confirmada', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('article').getByText(decisao === 'aceitar' ? /09:00/ : /08:00/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remarcação pendente', exact: true })).toHaveCount(0);
  });
});
