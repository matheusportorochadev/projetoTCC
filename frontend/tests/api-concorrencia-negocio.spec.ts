import { test, expect, origem, dataFutura, disponibilidade, solicitar, inspecionarNegocio } from './helpers/negocio';

test.use({ trace: 'off' });
test.describe('Concorrência controlada e integridade transacional', () => {
  test('Duas solicitações simultâneas para o mesmo slot criam uma consulta e retornam conflito controlado', async ({ negocio }, testInfo) => {
    await disponibilidade(negocio); const a = await negocio.api('pacienteA'); const b = await negocio.api('pacienteA2');
    const status: number[][] = [];
    // Três pares, sem carga pesada e sem esperas artificiais.
    for (const horaInicio of ['08:00', '08:30', '09:00']) {
      const respostas = await Promise.all([a, b].map(api => api.post('/agendamentos', { headers: origem, data: { data: dataFutura(), horaInicio } })));
      status.push(respostas.map(r => r.status()).sort());
    }
    const estado = inspecionarNegocio(negocio.id);
    expect(estado.agendamentos).toHaveLength(3);
    expect(new Set(estado.agendamentos.map(a => `${a.medicoId}:${a.data}:${a.horaInicio}`)).size).toBe(3);
    await testInfo.attach('concorrencia-sem-segredos', { body: JSON.stringify({ status, consultasPersistidas: estado.agendamentos.length }), contentType: 'application/json' });
    for (const par of status) expect(par).toEqual([201, 409]);
  });

  test('Confirmações simultâneas atualizam uma única consulta e rejeitam a segunda transição', async ({ negocio }) => {
    await disponibilidade(negocio); const consulta = await solicitar(negocio); const medico = await negocio.api('medicoA');
    const respostas = await Promise.all([0, 1].map(() => medico.patch(`/agendamentos/${consulta.id}/confirmar`, { headers: origem })));
    const estado = inspecionarNegocio(negocio.id);
    expect(estado.agendamentos).toHaveLength(1);
    expect(estado.agendamentos[0]).toMatchObject({ id: consulta.id, status: 'CONFIRMADA' });
    expect(respostas.map(r => r.status()).sort()).toEqual([200, 409]);
  });

  test('Pedidos simultâneos de remarcação não reservam o mesmo destino duas vezes', async ({ negocio }) => {
    await disponibilidade(negocio); const primeira = await solicitar(negocio); const segunda = await solicitar(negocio, '08:30', dataFutura(), 'pacienteA2');
    const a = await negocio.api('pacienteA'); const b = await negocio.api('pacienteA2');
    const respostas = await Promise.all([{ api: a, id: primeira.id }, { api: b, id: segunda.id }].map(({ api, id }) => api.post(`/agendamentos/${id}/remarcacoes`, { headers: origem, data: { data: dataFutura(), horaInicio: '09:00' } })));
    const medico = await negocio.api('medicoA');
    expect((await (await medico.get('/agendamentos/remarcacoes/pendentes')).json()).remarcacoes).toHaveLength(1);
    expect(respostas.map(r => r.status()).sort()).toEqual([201, 409]);
  });

  test('Cadastros simultâneos com email/CRM únicos não deixam usuário ou médico órfão', async ({ negocio }) => {
    const admin = await negocio.api('admin');
    const respostas = await Promise.all([0, 1].map(() => admin.post('/medicos', { headers: origem, data: { nome: 'Médico Fictício Concorrente', email: negocio.email('cadastro'), crm: negocio.crm() } })));
    expect(respostas.map(r => r.status()).sort()).toEqual([201, 400]);
    const lista = (await (await admin.get('/medicos')).json()).medicos.filter((m: { usuario: { email: string } }) => m.usuario.email === negocio.email('cadastro'));
    expect(lista).toHaveLength(1);
    expect(inspecionarNegocio(negocio.id).usuarios.filter(u => u.email === negocio.email('cadastro'))).toHaveLength(1);
  });
});
