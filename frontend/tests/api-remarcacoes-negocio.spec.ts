import { test, expect, origem, dataFutura, disponibilidade, solicitar, type Negocio } from './helpers/negocio';

test.use({ trace: 'off' });
async function consultaConfirmada(negocio: Negocio) {
  await disponibilidade(negocio); const consulta = await solicitar(negocio);
  expect((await (await negocio.api('medicoA')).patch(`/agendamentos/${consulta.id}/confirmar`, { headers: origem })).status()).toBe(200);
  return consulta;
}
async function pedido(negocio: Negocio, id: number, horaInicio = '08:30') {
  const resposta = await (await negocio.api('pacienteA')).post(`/agendamentos/${id}/remarcacoes`, { headers: origem, data: { data: dataFutura(), horaInicio } });
  expect(resposta.status()).toBe(201);
  return (await resposta.json()).remarcacao as { id: number; status: string };
}

test.describe('Remarcações: reserva, decisão, cancelamento e isolamento', () => {
  test('Pedido PENDENTE reserva novo horário sem alterar consulta até o aceite', async ({ negocio }) => {
    const consulta = await consultaConfirmada(negocio); const remarcacao = await pedido(negocio, consulta.id);
    expect(remarcacao.status).toBe('PENDENTE');
    const paciente = await negocio.api('pacienteA');
    const atuais = (await (await paciente.get('/agendamentos/meus')).json()).agendamentos;
    expect(atuais[0]).toMatchObject({ id: consulta.id, horaInicio: '08:00', status: 'CONFIRMADA' });
    const livres = (await (await paciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura()}`)).json()).horarios.map((h: { horaInicio: string }) => h.horaInicio);
    expect(livres).not.toContain('08:00'); expect(livres).not.toContain('08:30');
    const medico = await negocio.api('medicoA');
    expect((await (await medico.get('/agendamentos/remarcacoes/pendentes')).json()).remarcacoes.map((r: { id: number }) => r.id)).toContain(remarcacao.id);
  });

  test('Aceite muda para ACEITA e atualiza consulta CONFIRMADA, liberando horário antigo', async ({ negocio }) => {
    const consulta = await consultaConfirmada(negocio); const remarcacao = await pedido(negocio, consulta.id);
    const aceita = await (await negocio.api('medicoA')).patch(`/agendamentos/remarcacoes/${remarcacao.id}/aceitar`, { headers: origem });
    expect(aceita.status()).toBe(200); expect((await aceita.json()).remarcacao.status).toBe('ACEITA');
    const paciente = await negocio.api('pacienteA');
    expect((await (await paciente.get('/agendamentos/meus')).json()).agendamentos[0]).toMatchObject({ id: consulta.id, status: 'CONFIRMADA', horaInicio: '08:30', horaFim: '09:00' });
    const livres = (await (await paciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura()}`)).json()).horarios.map((h: { horaInicio: string }) => h.horaInicio);
    expect(livres).toContain('08:00'); expect(livres).not.toContain('08:30');
  });

  test('Recusa mantém consulta original e libera a reserva; resposta pode ser visualizada uma vez ou repetida', async ({ negocio }) => {
    const consulta = await consultaConfirmada(negocio); const remarcacao = await pedido(negocio, consulta.id); const paciente = await negocio.api('pacienteA');
    expect((await paciente.patch(`/agendamentos/remarcacoes/${remarcacao.id}/visualizar`, { headers: origem })).status()).toBe(409);
    const recusada = await (await negocio.api('medicoA')).patch(`/agendamentos/remarcacoes/${remarcacao.id}/recusar`, { headers: origem });
    expect(recusada.status()).toBe(200); expect((await recusada.json()).remarcacao.status).toBe('RECUSADA');
    expect((await (await paciente.get('/agendamentos/meus')).json()).agendamentos[0]).toMatchObject({ horaInicio: '08:00', status: 'CONFIRMADA' });
    expect((await (await paciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura()}`)).json()).horarios.map((h: { horaInicio: string }) => h.horaInicio)).toContain('08:30');
    for (let vez = 0; vez < 2; vez++) {
      const visualizada = await paciente.patch(`/agendamentos/remarcacoes/${remarcacao.id}/visualizar`, { headers: origem });
      expect(visualizada.status()).toBe(200); expect((await visualizada.json()).remarcacao.visualizadoPaciente).toBe(true);
    }
  });

  test('Rejeita segundo pedido pendente e decisão repetida sobre remarcação respondida', async ({ negocio }) => {
    const consulta = await consultaConfirmada(negocio); const remarcacao = await pedido(negocio, consulta.id);
    expect((await (await negocio.api('pacienteA')).post(`/agendamentos/${consulta.id}/remarcacoes`, { headers: origem, data: { data: dataFutura(), horaInicio: '09:00' } })).status()).toBe(409);
    const medico = await negocio.api('medicoA');
    expect((await medico.patch(`/agendamentos/remarcacoes/${remarcacao.id}/aceitar`, { headers: origem })).status()).toBe(200);
    expect((await medico.patch(`/agendamentos/remarcacoes/${remarcacao.id}/aceitar`, { headers: origem })).status()).toBe(409);
    expect((await medico.patch(`/agendamentos/remarcacoes/${remarcacao.id}/recusar`, { headers: origem })).status()).toBe(409);
  });

  test('Cancelamento pelo paciente encerra remarcação pendente e libera os dois horários', async ({ negocio }) => {
    const consulta = await consultaConfirmada(negocio); await pedido(negocio, consulta.id); const paciente = await negocio.api('pacienteA');
    expect((await paciente.patch(`/agendamentos/${consulta.id}/cancelar-paciente`, { headers: origem })).status()).toBe(200);
    const remarcacoes = (await (await paciente.get('/agendamentos/remarcacoes/minhas')).json()).remarcacoes;
    expect(remarcacoes[0].status).toBe('RECUSADA');
    const livres = (await (await paciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura()}`)).json()).horarios.map((h: { horaInicio: string }) => h.horaInicio);
    expect(livres).toEqual(expect.arrayContaining(['08:00', '08:30']));
  });

  test('Médico remarca diretamente e respeita pedido pendente antes de nova alteração', async ({ negocio }) => {
    const consulta = await consultaConfirmada(negocio); const medico = await negocio.api('medicoA');
    const direta = await medico.patch(`/agendamentos/${consulta.id}/remarcar`, { headers: origem, data: { data: dataFutura(), horaInicio: '08:30' } });
    expect(direta.status()).toBe(200); expect((await direta.json()).agendamento).toMatchObject({ id: consulta.id, horaInicio: '08:30', status: 'CONFIRMADA' });
    await pedido(negocio, consulta.id, '09:00');
    expect((await medico.patch(`/agendamentos/${consulta.id}/remarcar`, { headers: origem, data: { data: dataFutura(), horaInicio: '09:30' } })).status()).toBe(409);
  });

  test('Outro médico não aceita nem recusa remarcação e outro paciente não visualiza a resposta', async ({ negocio }) => {
    const consulta = await consultaConfirmada(negocio); const remarcacao = await pedido(negocio, consulta.id); const outro = await negocio.api('medicoB');
    for (const acao of ['aceitar', 'recusar']) expect((await outro.patch(`/agendamentos/remarcacoes/${remarcacao.id}/${acao}`, { headers: origem })).status()).toBe(404);
    expect((await (await negocio.api('pacienteB')).patch(`/agendamentos/remarcacoes/${remarcacao.id}/visualizar`, { headers: origem })).status()).toBe(404);
    const paciente = await negocio.api('pacienteA');
    expect((await (await paciente.get('/agendamentos/remarcacoes/minhas')).json()).remarcacoes[0].status).toBe('PENDENTE');
    expect((await (await (await negocio.api('pacienteB')).get('/agendamentos/remarcacoes/minhas')).json()).remarcacoes).toEqual([]);
  });

  test('Não remarca para mesmo horário nem sobre consulta ocupada', async ({ negocio }) => {
    const consulta = await consultaConfirmada(negocio); await solicitar(negocio, '08:30', dataFutura(), 'pacienteA2');
    const paciente = await negocio.api('pacienteA');
    expect((await paciente.post(`/agendamentos/${consulta.id}/remarcacoes`, { headers: origem, data: { data: dataFutura(), horaInicio: '08:00' } })).status()).toBe(400);
    expect((await paciente.post(`/agendamentos/${consulta.id}/remarcacoes`, { headers: origem, data: { data: dataFutura(), horaInicio: '08:30' } })).status()).toBe(409);
    expect((await (await paciente.get('/agendamentos/remarcacoes/minhas')).json()).remarcacoes).toEqual([]);
  });
});

test('Pedido de remarcação não contorna a rejeição de data passada', async ({ negocio }) => {
  const consulta = await consultaConfirmada(negocio);
  await disponibilidade(negocio, '2000-01-01');
  const paciente = await negocio.api('pacienteA');
  expect((await paciente.post(`/agendamentos/${consulta.id}/remarcacoes`, { headers: origem, data: { data: '2000-01-01', horaInicio: '08:00' } })).status()).toBe(400);
  expect((await (await paciente.get('/agendamentos/remarcacoes/minhas')).json()).remarcacoes).toHaveLength(0);
  const atuais = (await (await paciente.get('/agendamentos/meus')).json()).agendamentos;
  expect(atuais.find((a: { id: number }) => a.id === consulta.id)).toMatchObject({ data: dataFutura(), status: 'CONFIRMADA' });
});
