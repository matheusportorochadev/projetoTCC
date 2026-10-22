import { randomInt } from 'node:crypto';
import { test, expect } from './helpers/recuperacao';
import { origem, dataFutura, disponibilidade, solicitar, operarNegocio, inspecionarNegocio } from './helpers/negocio';
import { encerrarPagina, loginVisual, sairVisual, verificarLargura, alternarTema } from './helpers/interface-real';
import { obterSenhaTeste } from './helpers/credenciais';

test.use({ trace: 'off' });
test.setTimeout(60000);
// Fecha o navegador antes do backend/limpeza de fixtures, inclusive nas falhas.
test.afterEach(async ({ page }, info) => { await encerrarPagina(page, info); });
for (const tela of [
  { nome: 'desktop', largura: 1440, altura: 1000 },
  { nome: 'tablet', largura: 820, altura: 1180 },
  { nome: 'celular', largura: 390, altura: 844 },
]) test.describe(`Jornadas reais em ${tela.nome}`, () => {
  test.use({ viewport: { width: tela.largura, height: tela.altura } });
  test('ADMIN consulta auditoria, aplica filtro e navega nas páginas reais', async ({ page, negocio, ambiente }) => {
    operarNegocio('paginar', negocio.id);
    await loginVisual(page, negocio, ambiente.baseURL, 'admin');
    await page.getByRole('button', { name: 'Logs e Auditoria', exact: true }).click();
    await page.getByRole('group', { name: 'Módulo de auditoria' }).getByRole('button', { name: 'Pacientes', exact: true }).click();
    await page.getByLabel('Médico', { exact: true }).selectOption(String(negocio.medicoA.id));
    await page.getByLabel('Data inicial').fill('2020-01-01'); await page.getByLabel('Data final').fill('2020-01-01');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page.getByText('Página 1 de 2', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(page.getByText('Página 2 de 2', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Anterior', exact: true }).click();
    await expect(page.getByText('Página 1 de 2', { exact: false })).toBeVisible();
    await alternarTema(page); await verificarLargura(page); await sairVisual(page);
  });
  test('MÉDICO cadastra paciente, pesquisa e altera dados pelo formulário', async ({ page, negocio, ambiente }) => {
    await loginVisual(page, negocio, ambiente.baseURL, 'medicoA');
    await page.goto('/medico/pacientes/novo');
    await page.getByLabel(/^Nome/).fill('Paciente Visual Fictício');
    await page.getByLabel('E-mail', { exact: true }).fill(negocio.email('pacienteextra'));
    await page.getByRole('button', { name: 'Cadastrar paciente', exact: true }).click();
    await expect(page).toHaveURL(/\/medico\/pacientes$/);
    await page.getByPlaceholder('Buscar por nome, CPF, celular ou e-mail').fill('Paciente Visual Fictício');
    await expect(page.getByText('Paciente Visual Fictício', { exact: true })).toBeVisible();
    await page.getByRole('row', { name: /Paciente Visual Fictício/ }).getByRole('button', { name: 'Ver', exact: true }).click();
    await page.getByRole('link', { name: 'Editar paciente', exact: true }).click();
    await page.getByLabel(/^Nome/).fill('Paciente Visual Atualizado');
    await page.getByRole('button', { name: /Salvar alterações/i }).click();
    const medico = await negocio.api('medicoA');
    await expect.poll(async () => (await (await medico.get('/pacientes')).json()).some((p: { nome: string }) => p.nome === 'Paciente Visual Atualizado')).toBe(true);
    await alternarTema(page); await verificarLargura(page); await sairVisual(page);
  });
  test('PACIENTE solicita no calendário, acompanha confirmação e cancela pela interface', async ({ page, negocio, ambiente }) => {
    const data = dataFutura(3); await disponibilidade(negocio, data);
    await loginVisual(page, negocio, ambiente.baseURL, 'pacienteA');
    await page.goto('/paciente/agendar');
    const hoje = new Date(); const alvo = new Date(data + 'T12:00:00');
    if (alvo.getMonth() !== hoje.getMonth() || alvo.getFullYear() !== hoje.getFullYear()) await page.getByRole('button', { name: 'Próximo mês', exact: true }).click();
    const dia = page.getByRole('button', { name: new RegExp(`^${alvo.getDate()}(?:\\s|$)`) });
    await expect(dia).toBeEnabled(); await dia.click();
    const modal = page.getByRole('dialog'); await expect(modal).toBeVisible();
    const caixa = await modal.boundingBox(); expect(Boolean(caixa && caixa.x >= 0 && caixa.y >= 0 && caixa.width <= tela.largura && caixa.y + caixa.height <= tela.altura + 1)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await modal.getByRole('button', { name: /08:00/ }).click();
    await page.getByRole('button', { name: 'Sim, solicitar', exact: true }).click();
    await expect.poll(() => inspecionarNegocio(negocio.id).agendamentos.length).toBe(1);
    const consulta = inspecionarNegocio(negocio.id).agendamentos[0]; expect(consulta.status).toBe('PENDENTE');
    await page.goto('/paciente/agendamentos');
    await expect(page.getByText('Aguardando confirmação', { exact: true }).first()).toBeVisible();
    const medico = await negocio.api('medicoA'); expect((await medico.patch(`/agendamentos/${consulta.id}/confirmar`, { headers: origem })).status()).toBe(200);
    await page.goto('/paciente/agendamentos');
    await expect(page.getByText('Confirmada', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect.poll(() => inspecionarNegocio(negocio.id).agendamentos[0].status).toBe('CANCELADA');
    await expect(page.getByText('Cancelada', { exact: true }).first()).toBeVisible();
    await alternarTema(page); await verificarLargura(page); await sairVisual(page);
  });
  test('MÉDICO cadastra senha clínica, pesquisa paciente e inicia registro em tela adequada', async ({ page, negocio, ambiente }) => {
    await loginVisual(page, negocio, ambiente.baseURL, 'medicoA');
    await page.goto('/medico/prontuarios');
    const senha = obterSenhaTeste() + 'Clinica9!';
    await page.getByLabel('Senha dos prontuários', { exact: true }).fill(senha);
    await page.getByLabel('Confirmar senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Cadastrar e entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Novo prontuário', exact: true }).click();
    await page.getByRole('searchbox').fill('Gama');
    await expect(page.getByText('Nenhum paciente encontrado.', { exact: true })).toBeVisible();
    await page.getByRole('searchbox').fill('Alfa');
    await page.getByRole('button', { name: /Paciente Fictício Alfa/ }).click();
    const queixa = page.getByLabel('Queixa principal', { exact: false });
    await expect(queixa).toBeVisible(); await queixa.fill('Registro clínico visual fictício');
    await page.getByRole('button', { name: 'Pré-visualizar prontuário', exact: true }).click();
    // O formulário impede prosseguir com os demais campos obrigatórios vazios.
    await expect(page.getByRole('alert')).toBeVisible();
    expect(inspecionarNegocio(negocio.id).auditorias.prontuarios.some(e => e.acao === 'CRIAR')).toBe(false);
    await page.getByLabel('História da doença atual', { exact: false }).fill('História visual fictícia');
    await page.getByLabel('Avaliação clínica / hipótese diagnóstica', { exact: false }).fill('Avaliação visual fictícia');
    await page.getByLabel('Conduta médica', { exact: false }).fill('Conduta visual fictícia');
    await page.getByRole('button', { name: 'Pré-visualizar prontuário', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar e salvar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Prontuário salvo', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Criar outro prontuário', exact: true }).click();
    await page.getByRole('button', { name: 'Carregar dados anteriores', exact: true }).click();
    const confirmarCarregamento = page.getByRole('button', { name: 'Sim, carregar dados', exact: true });
    if (await confirmarCarregamento.isVisible()) await confirmarCarregamento.click();
    await expect(queixa).toHaveValue('Registro clínico visual fictício');
    await queixa.fill('Segundo registro visual fictício');
    await page.getByRole('button', { name: 'Pré-visualizar prontuário', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar e salvar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Prontuário salvo', exact: true })).toBeVisible();
    expect(inspecionarNegocio(negocio.id).auditorias.prontuarios.filter(e => e.acao === 'CRIAR')).toHaveLength(2);
    await page.getByRole('button', { name: 'Voltar aos prontuários', exact: true }).click();
    await page.getByRole('button', { name: 'Consultar prontuários', exact: true }).click();
    await page.getByRole('searchbox').fill('Alfa');
    await page.getByRole('button', { name: /Paciente Fictício Alfa/ }).click();
    await expect(page.getByRole('button', { name: 'Visualizar', exact: true })).toHaveCount(2);
    await page.getByRole('button', { name: 'Visualizar', exact: true }).last().click();
    await expect(page.getByText('Registro clínico visual fictício', { exact: true }).last()).toBeVisible();
    await verificarLargura(page);
  });
});

test('ADMIN cadastra médico, bloqueia e reativa pela interface', async ({ page, negocio, ambiente }) => {
  await loginVisual(page, negocio, ambiente.baseURL, 'admin');
  await page.getByRole('button', { name: '+ Cadastrar médico', exact: true }).click();
  await page.getByPlaceholder('Nome completo').fill('Médico Visual Fictício');
  await page.getByPlaceholder('medico@email.com').fill(negocio.email('cadastro'));
  await page.getByPlaceholder('123456').fill(String(randomInt(10000000, 99999999)));
  await page.getByRole('combobox').selectOption('MG');
  await page.getByRole('button', { name: 'Cadastrar médico', exact: true }).click();
  await expect(page.getByText(/Médico cadastrado com sucesso/i)).toBeVisible();
  await page.goto('/admin');
  await page.getByRole('button', { name: /Médico Visual Fictício/ }).click();
  await page.getByRole('button', { name: 'Bloquear médico', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bloquear', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ativar médico', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ativar médico', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bloquear médico', exact: true })).toBeVisible();
});

for (const tela of [
  { nome: 'desktop', width: 1440, height: 1000 },
  { nome: 'tablet', width: 820, height: 1180 },
  { nome: 'celular', width: 390, height: 844 },
]) test.describe(`Agenda médica responsiva em ${tela.nome}`, () => {
  test.use({ viewport: { width: tela.width, height: tela.height } });
test('MÉDICO configura disponibilidade e verifica persistência após recarregar', async ({ page, negocio, ambiente }) => {
  await loginVisual(page, negocio, ambiente.baseURL, 'medicoA');
  await page.goto('/medico/agenda');
  const data = dataFutura(3);
  // A interface móvel configura pelo calendário/modal; o formulário lateral é desktop/tablet.
  if (tela.nome === 'celular') {
    const alvo = new Date(data + 'T12:00:00'); const hoje = new Date();
    if (alvo.getMonth() !== hoje.getMonth() || alvo.getFullYear() !== hoje.getFullYear()) await page.getByRole('button', { name: '›', exact: true }).click();
    await page.getByRole('button', { name: String(alvo.getDate()), exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar horário', exact: true }).click();
  }
  const salvar = tela.nome === 'celular' ? 'Salvar horário' : 'Salvar disponibilidade';
  const formulario = page.locator('form').filter({ has: page.getByRole('button', { name: salvar, exact: true }) });
  if (tela.nome !== 'celular') await formulario.locator('input[type="date"]').fill(data);
  await formulario.locator('input[type="time"]').nth(0).fill('08:00');
  await formulario.locator('input[type="time"]').nth(1).fill('10:00');
  await formulario.getByRole('combobox').selectOption('30');
  await formulario.getByRole('button', { name: salvar, exact: true }).click();
  await expect.poll(() => inspecionarNegocio(negocio.id).disponibilidades.length).toBe(1);
  await page.reload(); await expect(page.getByRole('heading', { name: 'Minha agenda', exact: true })).toBeVisible();
  expect(inspecionarNegocio(negocio.id).disponibilidades[0].ativo).toBe(true);
  await verificarLargura(page);
});

});

test('MÉDICO confirma, recusa, remarca e desmarca consultas pela interface', async ({ page, negocio, ambiente }) => {
  await disponibilidade(negocio); const a = await solicitar(negocio); const b = await solicitar(negocio, '08:30', dataFutura(), 'pacienteA2');
  await loginVisual(page, negocio, ambiente.baseURL, 'medicoA');
  await page.goto('/medico/agenda');
  await page.getByRole('button', { name: /Horários marcados/ }).click();
  const alfa = page.getByRole('article').filter({ hasText: 'Paciente Fictício Alfa' });
  const beta = page.getByRole('article').filter({ hasText: 'Paciente Fictício Beta' });
  await alfa.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar consulta', exact: true }).click();
  await expect.poll(() => inspecionarNegocio(negocio.id).agendamentos.find(c => c.id === a.id)?.status).toBe('CONFIRMADA');
  await beta.getByRole('button', { name: 'Recusar', exact: true }).click();
  await page.getByRole('button', { name: 'Recusar solicitação', exact: true }).click();
  await expect.poll(() => inspecionarNegocio(negocio.id).agendamentos.find(c => c.id === b.id)?.status).toBe('RECUSADA');
  await alfa.getByRole('button', { name: 'Remarcar', exact: true }).click();
  await page.getByRole('button', { name: /^09:00/ }).click();
  await page.getByRole('button', { name: 'Confirmar remarcação', exact: true }).click();
  await expect.poll(() => inspecionarNegocio(negocio.id).agendamentos.find(c => c.id === a.id)?.horaInicio).toBe('09:00');
  await alfa.getByRole('button', { name: 'Desmarcar', exact: true }).click();
  await page.getByRole('button', { name: 'Desmarcar consulta', exact: true }).click();
  await expect.poll(() => inspecionarNegocio(negocio.id).agendamentos.find(c => c.id === a.id)?.status).toBe('CANCELADA');
  await expect(alfa.getByText('Cancelada', { exact: true })).toBeVisible();
});

test('Troca visual de sessão não conserva pacientes do médico anterior', async ({ page, negocio, ambiente }) => {
  await loginVisual(page, negocio, ambiente.baseURL, 'medicoA');
  await page.goto('/medico/pacientes');
  await expect(page.getByText('Paciente Fictício Alfa', { exact: true })).toBeVisible();
  await sairVisual(page); await loginVisual(page, negocio, ambiente.baseURL, 'medicoB');
  await page.goto('/medico/pacientes');
  await expect(page.getByText('Paciente Fictício Gama', { exact: true })).toBeVisible();
  await expect(page.getByText('Paciente Fictício Alfa', { exact: true })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/medico(?:\/.*)?$/);
});
