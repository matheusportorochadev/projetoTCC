import { test, expect, origem, dataFutura, disponibilidade, solicitar, inspecionarNegocio } from './helpers/negocio';

test.use({ trace: 'off' });
test.describe('Disponibilidade: períodos, slots, transações e autorização', () => {
  test('Cria lote sem duplicar a mesma data e lista somente os períodos ativos', async ({ negocio }) => {
    const medico = await negocio.api('medicoA'); const primeira = dataFutura(); const segunda = dataFutura(31);
    const resposta = await medico.post('/agenda/disponibilidades', { headers: origem, data: { datas: [primeira, primeira, segunda], horaInicio: '08:00', horaFim: '10:00', duracaoConsulta: 30 } });
    expect(resposta.status()).toBe(201);
    expect((await resposta.json()).disponibilidades).toHaveLength(2);
    const lista = await medico.get('/agenda/disponibilidades');
    expect(lista.status()).toBe(200);
    expect((await lista.json()).map((d: { data: string }) => d.data).sort()).toEqual([primeira, segunda]);
  });

  for (const caso of [
    { nome: 'data inexistente', dados: { datas: ['2030-02-30'] } },
    { nome: 'formato de data inválido', dados: { datas: ['30/01/2030'] } },
    { nome: 'lista de datas vazia', dados: { datas: [] } },
    { nome: 'hora inicial inválida', dados: { horaInicio: '25:00' } },
    { nome: 'hora final inválida', dados: { horaFim: '10:99' } },
    { nome: 'início após fim', dados: { horaInicio: '11:00' } },
    { nome: 'duração zero', dados: { duracaoConsulta: 0 } },
    { nome: 'duração negativa', dados: { duracaoConsulta: -30 } },
    { nome: 'duração fracionária', dados: { duracaoConsulta: 15.5 } },
    { nome: 'medicoId externo', dados: { medicoId: 1 } },
  ]) {
    test(`Rejeita ${caso.nome} sem criar período parcial`, async ({ negocio }) => {
      const medico = await negocio.api('medicoA');
      const resposta = await medico.post('/agenda/disponibilidades', { headers: origem, data: { datas: [dataFutura()], horaInicio: '08:00', horaFim: '10:00', duracaoConsulta: 30, ...caso.dados } });
      expect(resposta.status()).toBe(400);
      expect(await (await medico.get('/agenda/disponibilidades')).json()).toEqual([]);
    });
  }

  test('Calcula slots completos por duração e não oferece a fração fora do período', async ({ negocio }) => {
    await disponibilidade(negocio, dataFutura(), '08:00', '09:10', 30);
    const paciente = await negocio.api('pacienteA');
    const resposta = await paciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura()}`);
    expect(resposta.status()).toBe(200);
    expect((await resposta.json()).horarios).toEqual([{ horaInicio: '08:00', horaFim: '08:30' }, { horaInicio: '08:30', horaFim: '09:00' }]);
    expect((await (await paciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura(31)}`)).json()).horarios).toEqual([]);
  });

  test('Rejeita sobreposição mas aceita período adjacente', async ({ negocio }) => {
    await disponibilidade(negocio);
    const medico = await negocio.api('medicoA');
    expect((await medico.post('/agenda/disponibilidades', { headers: origem, data: { datas: [dataFutura()], horaInicio: '09:00', horaFim: '11:00', duracaoConsulta: 30 } })).status()).toBe(409);
    expect((await medico.post('/agenda/disponibilidades', { headers: origem, data: { datas: [dataFutura()], horaInicio: '10:00', horaFim: '11:00', duracaoConsulta: 30 } })).status()).toBe(201);
    expect(await (await medico.get('/agenda/disponibilidades')).json()).toHaveLength(2);
  });

  test('Conflito no segundo dia desfaz o lote inteiro e preserva a disponibilidade anterior', async ({ negocio }) => {
    await disponibilidade(negocio, dataFutura(31));
    const medico = await negocio.api('medicoA');
    const resposta = await medico.post('/agenda/disponibilidades', { headers: origem, data: { datas: [dataFutura(), dataFutura(31)], horaInicio: '08:00', horaFim: '10:00', duracaoConsulta: 30 } });
    expect(resposta.status()).toBe(409);
    const lista = await (await medico.get('/agenda/disponibilidades')).json();
    expect(lista).toHaveLength(1); expect(lista[0].data).toBe(dataFutura(31));
  });

  test('Edita período próprio e atualiza a duração dos slots', async ({ negocio }) => {
    const periodo = await disponibilidade(negocio); const medico = await negocio.api('medicoA');
    const resposta = await medico.put(`/agenda/disponibilidades/${periodo.id}`, { headers: origem, data: { data: dataFutura(), horaInicio: '10:00', horaFim: '11:00', duracaoConsulta: 20 } });
    expect(resposta.status()).toBe(200);
    expect(await resposta.json()).toMatchObject({ id: periodo.id, horaInicio: '10:00', duracaoConsulta: 20 });
    const paciente = await negocio.api('pacienteA');
    expect((await (await paciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura()}`)).json()).horarios).toEqual([
      { horaInicio: '10:00', horaFim: '10:20' }, { horaInicio: '10:20', horaFim: '10:40' }, { horaInicio: '10:40', horaFim: '11:00' },
    ]);
  });

  test('Desativação remove slots sem cancelar consulta já confirmada', async ({ negocio }) => {
    const periodo = await disponibilidade(negocio); const agendamento = await solicitar(negocio); const medico = await negocio.api('medicoA');
    expect((await medico.patch(`/agendamentos/${agendamento.id}/confirmar`, { headers: origem })).status()).toBe(200);
    expect((await medico.delete(`/agenda/disponibilidades/${periodo.id}`, { headers: origem })).status()).toBe(200);
    expect(await (await medico.get('/agenda/disponibilidades')).json()).toEqual([]);
    expect(inspecionarNegocio(negocio.id).disponibilidades).toEqual(expect.arrayContaining([expect.objectContaining({ id: periodo.id, ativo: false })]));
    const paciente = await negocio.api('pacienteA');
    expect((await (await paciente.get(`/agendamentos/horarios-disponiveis?data=${dataFutura()}`)).json()).horarios).toEqual([]);
    expect((await (await paciente.get('/agendamentos/meus')).json()).agendamentos).toEqual(expect.arrayContaining([expect.objectContaining({ id: agendamento.id, status: 'CONFIRMADA' })]));
  });

  test('Médico B não edita nem remove disponibilidade do Médico A', async ({ negocio }) => {
    const periodo = await disponibilidade(negocio); const outro = await negocio.api('medicoB');
    expect((await outro.put(`/agenda/disponibilidades/${periodo.id}`, { headers: origem, data: { data: dataFutura(), horaInicio: '12:00', horaFim: '13:00', duracaoConsulta: 30 } })).status()).toBe(400);
    expect((await outro.delete(`/agenda/disponibilidades/${periodo.id}`, { headers: origem })).status()).toBe(400);
    const original = await (await negocio.api('medicoA')).get('/agenda/disponibilidades');
    expect((await original.json())[0]).toMatchObject({ id: periodo.id, horaInicio: '08:00', ativo: true });
  });

  for (const papel of ['admin', 'pacienteA'] as const) {
    test(`${papel} não configura disponibilidade`, async ({ negocio }) => {
      const api = await negocio.api(papel);
      expect((await api.post('/agenda/disponibilidades', { headers: origem, data: { datas: [dataFutura()], horaInicio: '08:00', horaFim: '10:00', duracaoConsulta: 30 } })).status()).toBe(403);
    });
  }

  test('Trata virada do mês e do ano sem deslocar as datas configuradas', async ({ negocio }) => {
    const ano = new Date().getUTCFullYear() + 2; const datas = [`${ano}-01-31`, `${ano}-02-01`, `${ano}-12-31`, `${ano + 1}-01-01`];
    const medico = await negocio.api('medicoA');
    expect((await medico.post('/agenda/disponibilidades', { headers: origem, data: { datas, horaInicio: '08:00', horaFim: '08:30', duracaoConsulta: 30 } })).status()).toBe(201);
    const paciente = await negocio.api('pacienteA');
    for (const data of datas) {
      const resposta = await paciente.get(`/agendamentos/horarios-disponiveis?data=${data}`);
      expect(resposta.status()).toBe(200);
      expect(await resposta.json()).toEqual({ data, horarios: [{ horaInicio: '08:00', horaFim: '08:30' }] });
    }
  });
});
