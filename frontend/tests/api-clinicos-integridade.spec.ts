import { test, expect } from './helpers/recuperacao';
import { origem, type Negocio } from './helpers/negocio';
import { obterSenhaTeste } from './helpers/credenciais';
const raiz = '/prontuarios/clinicos/pacientes';
test.use({ trace: 'off' });
async function clinica(negocio: Negocio, papel: 'medicoA' | 'medicoB' = 'medicoA') {
  const api = await negocio.api(papel); const senha = obterSenhaTeste() + 'Clinica9!';
  expect((await api.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha, confirmarSenha: senha } })).status()).toBe(201);
  expect((await api.post('/prontuarios/acesso/verificar', { headers: origem, data: { senha } })).status()).toBe(200);
  return api;
}
test.describe('Integridade clínica: combinações de IDs e conteúdo', () => {
  for (const caso of ['outro-paciente', 'outro-medico', 'inexistente'] as const) test(`Detalhe rejeita prontuário de ${caso} sem divulgar conteúdo`, async ({ negocio }) => {
    const medico = await clinica(negocio);
    const dono = caso === 'outro-medico' ? await clinica(negocio, 'medicoB') : medico;
    const pacienteId = caso === 'outro-medico' ? negocio.pacienteB.id : negocio.pacienteA2.id;
    const criado = await dono.post(`${raiz}/${pacienteId}`, { headers: origem, data: { queixaPrincipal: 'CONTEUDO_FICTICIO_ISOLADO' } });
    expect(criado.status()).toBe(201); const id = (await criado.json()).prontuario.id;
    const resposta = await medico.get(`${raiz}/${negocio.pacienteA.id}/${caso === 'inexistente' ? 2147483647 : id}`);
    expect(resposta.status()).toBe(404);
    expect(JSON.stringify(await resposta.json()).includes('CONTEUDO_FICTICIO_ISOLADO')).toBe(false);
    expect((await dono.get(`${raiz}/${pacienteId}/${id}`)).status()).toBe(200);
  });
  for (const caso of ['outro-paciente', 'outro-medico'] as const) test(`Referência anterior de ${caso} não cria registro nem altera histórico`, async ({ negocio }) => {
    const medico = await clinica(negocio);
    const dono = caso === 'outro-medico' ? await clinica(negocio, 'medicoB') : medico;
    const pacienteId = caso === 'outro-medico' ? negocio.pacienteB.id : negocio.pacienteA2.id;
    const criado = await dono.post(`${raiz}/${pacienteId}`, { headers: origem, data: { queixaPrincipal: 'Histórico fictício preservado' } });
    expect(criado.status()).toBe(201); const anterior = (await criado.json()).prontuario;
    const resposta = await medico.post(`${raiz}/${negocio.pacienteA.id}`, { headers: origem, data: { queixaPrincipal: 'Referência indevida fictícia', prontuarioAnteriorId: anterior.id } });
    expect(resposta.status()).toBe(400);
    expect((await (await medico.get(`${raiz}/${negocio.pacienteA.id}`)).json()).prontuarios).toEqual([]);
    expect((await (await dono.get(`${raiz}/${pacienteId}/${anterior.id}`)).json()).prontuario).toEqual(anterior);
  });
  for (const campo of ['queixaPrincipal', 'historiaMolestiaAtual', 'historiaPatologicaPregressa', 'exameFisico', 'examesComplementares', 'conduta']) test(`Rejeita tipo numérico em ${campo} sem persistir registro`, async ({ negocio }) => {
    const medico = await clinica(negocio); const rota = `${raiz}/${negocio.pacienteA.id}`;
    const resposta = await medico.post(rota, { headers: origem, data: { queixaPrincipal: 'Controle fictício', [campo]: 123 } });
    expect(resposta.status()).toBe(400);
    expect((await (await medico.get(rota)).json()).prontuarios).toEqual([]);
  });
  test('Rejeita formulário clínico só com espaços; normaliza campos opcionais no registro válido', async ({ negocio }) => {
    const medico = await clinica(negocio); const rota = `${raiz}/${negocio.pacienteA.id}`;
    expect((await medico.post(rota, { headers: origem, data: { queixaPrincipal: '  ', conduta: '\n' } })).status()).toBe(400);
    const resposta = await medico.post(rota, { headers: origem, data: { queixaPrincipal: '  Dado fictício  ', conduta: '  ' } });
    expect(resposta.status()).toBe(201);
    expect((await resposta.json()).prontuario).toMatchObject({ queixaPrincipal: 'Dado fictício', conduta: null });
  });
});

for (const tamanho of [10000, 10001]) test(`Limite clínico de ${tamanho} caracteres é validado abaixo do teto HTTP`, async ({ negocio }) => {
  const medico = await clinica(negocio); const rota = `${raiz}/${negocio.pacienteA.id}`;
  const resposta = await medico.post(rota, { headers: origem, data: { queixaPrincipal: 'X'.repeat(tamanho) } });
  expect(resposta.status()).toBe(tamanho === 10000 ? 201 : 400);
  const registros = (await (await medico.get(rota)).json()).prontuarios;
  expect(registros).toHaveLength(tamanho === 10000 ? 1 : 0);
});
