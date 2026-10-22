import { test, expect, origem, dataFutura, disponibilidade, solicitar, inspecionarNegocio } from './helpers/negocio';

test.use({ trace: 'off' });
test.describe('Agendamentos: jornadas, estados e integridade', () => {
  test('Solicitação começa PENDENTE, aparece ao médico e confirmação aparece ao paciente', async ({ negocio }) => {
    await disponibilidade(negocio); const consulta = await solicitar(negocio);
    expect(consulta).toMatchObject({ status: 'PENDENTE', pacienteId: negocio.pacienteA.id, medicoId: negocio.medicoA.id });
    const medico = await negocio.api('medicoA');
    expect((await (await medico.get('/agendamentos/medico')).json()).agendamentos).toEqual(expect.arrayContaining([expect.objectContaining({ id: consulta.id, status: 'PENDENTE' })]));
    const confirmacao = await medico.patch(`/agendamentos/${consulta.id}/confirmar`, { headers: origem });
    expect(confirmacao.status()).toBe(200);
    expect((await confirmacao.json()).agendamento.status).toBe('CONFIRMADA');
    expect((await (await (await negocio.api('pacienteA')).get('/agendamentos/meus')).json()).agendamentos).toEqual(expect.arrayContaining([expect.objectContaining({ id: consulta.id, status: 'CONFIRMADA' })]));
  });

  test('Recusa preserva histórico RECUSADA e libera o horário', async ({ negocio }) => {
    await disponibilidade(negocio); const consulta = await solicitar(negocio); const medico = await negocio.api('medicoA');
    expect((await medico.patch(`/agendamentos/${consulta.id}/recusar`, { headers: origem })).status()).toBe(200);
    const paciente = await negocio.api('pacienteA');
    expect((await (await paciente.get('/agendamentos/meus')).json()).agendamentos[0].status).toBe('RECUSADA');
    expect((await (await paciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura()}`)).json()).horarios.map((h: { horaInicio: string }) => h.horaInicio)).toContain('08:00');
  });

  for (const confirmar of [false, true]) {
    test(`Paciente cancela consulta ${confirmar ? 'confirmada' : 'pendente'} sem apagar histórico`, async ({ negocio }) => {
      await disponibilidade(negocio); const consulta = await solicitar(negocio);
      if (confirmar) expect((await (await negocio.api('medicoA')).patch(`/agendamentos/${consulta.id}/confirmar`, { headers: origem })).status()).toBe(200);
      const paciente = await negocio.api('pacienteA');
      const cancelamento = await paciente.patch(`/agendamentos/${consulta.id}/cancelar-paciente`, { headers: origem });
      expect(cancelamento.status()).toBe(200);
      expect((await cancelamento.json()).agendamento.status).toBe('CANCELADA');
      expect((await (await paciente.get('/agendamentos/meus')).json()).agendamentos).toHaveLength(1);
      expect((await (await paciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura()}`)).json()).horarios.map((h: { horaInicio: string }) => h.horaInicio)).toContain('08:00');
    });
  }

  test('Médico cancela confirmada e rejeita transições de consulta já cancelada', async ({ negocio }) => {
    await disponibilidade(negocio); const consulta = await solicitar(negocio); const medico = await negocio.api('medicoA');
    expect((await medico.patch(`/agendamentos/${consulta.id}/cancelar`, { headers: origem })).status()).toBe(409);
    expect((await medico.patch(`/agendamentos/${consulta.id}/confirmar`, { headers: origem })).status()).toBe(200);
    const cancelada = await medico.patch(`/agendamentos/${consulta.id}/cancelar`, { headers: origem });
    expect(cancelada.status()).toBe(200); expect((await cancelada.json()).agendamento.status).toBe('CANCELADA');
    expect((await medico.patch(`/agendamentos/${consulta.id}/confirmar`, { headers: origem })).status()).toBe(409);
    expect((await medico.patch(`/agendamentos/${consulta.id}/recusar`, { headers: origem })).status()).toBe(409);
  });

  test('Horário pendente fica ocupado e nova solicitação sequencial recebe 409', async ({ negocio }) => {
    await disponibilidade(negocio); await solicitar(negocio);
    const outroPaciente = await negocio.api('pacienteA2');
    expect((await outroPaciente.post('/agendamentos', { headers: origem, data: { data: dataFutura(), horaInicio: '08:00' } })).status()).toBe(409);
    expect((await (await outroPaciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura()}`)).json()).horarios.some((h: { horaInicio: string }) => h.horaInicio === '08:00')).toBe(false);
  });

  test('Bloquear médico mantém consultas confirmadas e impede novas; reativar libera novos horários', async ({ negocio }) => {
    await disponibilidade(negocio); const consulta = await solicitar(negocio); const medico = await negocio.api('medicoA'); const admin = await negocio.api('admin'); const paciente = await negocio.api('pacienteA');
    expect((await medico.patch(`/agendamentos/${consulta.id}/confirmar`, { headers: origem })).status()).toBe(200);
    expect((await admin.patch(`/medicos/${negocio.medicoA.id}/status`, { headers: origem, data: { ativo: false } })).status()).toBe(200);
    expect((await medico.get('/perfil')).status()).toBe(401);
    expect((await (await paciente.get('/agendamentos/meus')).json()).agendamentos[0]).toMatchObject({ id: consulta.id, status: 'CONFIRMADA' });
    expect((await (await paciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura()}`)).json()).horarios).toEqual([]);
    expect((await paciente.post('/agendamentos', { headers: origem, data: { data: dataFutura(), horaInicio: '08:30' } })).status()).toBe(409);
    expect((await admin.patch(`/medicos/${negocio.medicoA.id}/status`, { headers: origem, data: { ativo: true } })).status()).toBe(200);
    await solicitar(negocio, '08:30');
  });

  test('Paciente não agenda no passado mesmo quando existe disponibilidade histórica', async ({ negocio }) => {
    await disponibilidade(negocio, '2000-01-01'); const paciente = await negocio.api('pacienteA');
    expect((await paciente.post('/agendamentos', { headers: origem, data: { data: '2000-01-01', horaInicio: '08:00' } })).status()).toBe(400);
  });

  for (const caso of [
    { nome: 'data inexistente', dados: { data: '2030-02-30', horaInicio: '08:00' } },
    { nome: 'hora inválida', dados: { data: dataFutura(), horaInicio: '25:00' } },
    { nome: 'IDs impostos', dados: { data: dataFutura(), horaInicio: '08:00', pacienteId: 1, medicoId: 1 } },
    { nome: 'corpo vazio', dados: {} },
  ]) {
    test(`Solicitação rejeita ${caso.nome}`, async ({ negocio }) => {
      const paciente = await negocio.api('pacienteA');
      expect((await paciente.post('/agendamentos', { headers: origem, data: caso.dados })).status()).toBe(400);
    });
  }

  test('Paciente do mesmo médico e paciente de outro médico não cancelam consulta alheia', async ({ negocio }) => {
    await disponibilidade(negocio); const consulta = await solicitar(negocio);
    for (const papel of ['pacienteA2', 'pacienteB'] as const) {
      expect((await (await negocio.api(papel)).patch(`/agendamentos/${consulta.id}/cancelar-paciente`, { headers: origem })).status()).toBe(404);
    }
    expect((await (await (await negocio.api('pacienteA')).get('/agendamentos/meus')).json()).agendamentos[0].status).toBe('PENDENTE');
  });

  test('Outro médico não confirma, cancela, remarca ou exclui consulta alheia', async ({ negocio }) => {
    await disponibilidade(negocio); const consulta = await solicitar(negocio); const outro = await negocio.api('medicoB');
    for (const acao of ['confirmar', 'recusar', 'cancelar']) expect((await outro.patch(`/agendamentos/${consulta.id}/${acao}`, { headers: origem })).status()).toBe(404);
    expect((await outro.patch(`/agendamentos/${consulta.id}/remarcar`, { headers: origem, data: { data: dataFutura(), horaInicio: '08:30' } })).status()).toBe(404);
    expect((await outro.delete(`/agendamentos/${consulta.id}`, { headers: origem })).status()).toBe(404);
  });

  test('Médico cria consulta CONFIRMADA e rejeita paciente inexistente ou de outro médico', async ({ negocio }) => {
    const medico = await negocio.api('medicoA');
    const resposta = await medico.post('/agendamentos/medico', { headers: origem, data: { pacienteId: negocio.pacienteA.id, data: dataFutura(), horaInicio: '11:00', duracaoConsulta: 30 } });
    expect(resposta.status()).toBe(201);
    expect((await resposta.json()).agendamento).toMatchObject({ status: 'CONFIRMADA', pacienteId: negocio.pacienteA.id, horaFim: '11:30' });
    for (const pacienteId of [2147483647, negocio.pacienteB.id]) expect((await medico.post('/agendamentos/medico', { headers: origem, data: { pacienteId, data: dataFutura(), horaInicio: '12:00', duracaoConsulta: 30 } })).status()).toBe(404);
  });

  test('Médico não cria consulta em data passada ou além do fim do dia', async ({ negocio }) => {
    const medico = await negocio.api('medicoA');
    for (const dados of [{ data: '2000-01-01', horaInicio: '08:00' }, { data: dataFutura(), horaInicio: '23:50' }]) {
      expect((await medico.post('/agendamentos/medico', { headers: origem, data: { pacienteId: negocio.pacienteA.id, ...dados, duracaoConsulta: 30 } })).status()).toBe(400);
    }
  });

  test('Exclusão de paciente com consulta preserva o relacionamento e histórico', async ({ negocio }) => {
    await disponibilidade(negocio); const consulta = await solicitar(negocio); const medico = await negocio.api('medicoA');
    expect((await medico.delete(`/pacientes/${negocio.pacienteA.id}`, { headers: origem })).status()).toBe(400);
    expect((await medico.get(`/pacientes/${negocio.pacienteA.id}`)).status()).toBe(200);
    expect((await (await medico.get('/agendamentos/medico')).json()).agendamentos[0].id).toBe(consulta.id);
  });
});

test('Data passada é rejeitada antes da consulta de disponibilidade e não persiste agendamento', async ({ negocio }) => {
  const paciente = await negocio.api('pacienteA');
  expect((await paciente.post('/agendamentos', { headers: origem, data: { data: '2000-01-01', horaInicio: '08:00' } })).status()).toBe(400);
  expect(inspecionarNegocio(negocio.id).agendamentos).toHaveLength(0);
});
