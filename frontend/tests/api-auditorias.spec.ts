import { test, expect, origem, disponibilidade, solicitar, operarNegocio, inspecionarNegocio, type Evento } from './helpers/negocio';
import { obterSenhaTeste } from './helpers/credenciais';
test.use({ trace: 'off' });
const base = '/admin/auditoria';
const categorias = ['login', 'pacientes', 'agenda', 'prontuarios'] as const;
test.describe('Auditorias reais: autoria, paginação e privacidade', () => {
  for (const categoria of categorias) {
    for (const papel of ['medicoA', 'pacienteA'] as const) test(`${categoria}: bloqueia ${papel} com 403`, async ({ negocio }) => {
      expect((await (await negocio.api(papel)).get(`${base}/${categoria}`)).status()).toBe(403);
    });
    test(`${categoria}: visitante recebe 401`, async ({ request }) => {
      expect((await request.get(`${base}/${categoria}`)).status()).toBe(401);
    });
  }
  test('Login e logout registram responsável, resultado e instante sem segredos', async ({ negocio }) => {
    const inicio = Date.now(); const paciente = await negocio.api('pacienteA');
    expect((await paciente.post('/auth/logout', { headers: origem })).status()).toBe(200);
    const eventos = inspecionarNegocio(negocio.id).auditorias.login.filter(e => e.usuarioId === negocio.contas.pacienteA.id);
    expect(eventos.map(e => e.acao)).toEqual(expect.arrayContaining(['LOGIN_SUCESSO', 'LOGOUT']));
    expect(eventos.every(e => e.resultado === 'SUCESSO' && new Date(e.createdAt).getTime() >= inicio - 1000)).toBe(true);
    const admin = await negocio.api('admin'); const resposta = await admin.get(`${base}/login?acao=LOGOUT&resultado=SUCESSO`);
    expect(resposta.status()).toBe(200);
    const dados = await resposta.json(); expect(dados.registros.some((e: Evento) => e.usuarioId === negocio.contas.pacienteA.id)).toBe(true);
    expect(JSON.stringify(dados).includes(obterSenhaTeste())).toBe(false);
    for (const e of dados.registros) expect(Object.keys(e).sort()).toEqual(['acao', 'createdAt', 'id', 'ip', 'perfil', 'requisicaoId', 'resultado', 'usuarioId', 'usuarioNome'].sort());
  });
  test('Tentativa inválida gera auditoria FALHA sem identificar ou expor conta', async ({ negocio, request }) => {
    const admin = await negocio.api('admin');
    const antes = await (await admin.get(`${base}/login?acao=LOGIN_FALHA&resultado=FALHA`)).json();
    expect((await request.post('/auth/login', { headers: origem, data: { email: negocio.email('inexistente'), senha: obterSenhaTeste() } })).status()).toBe(401);
    const depois = await (await admin.get(`${base}/login?acao=LOGIN_FALHA&resultado=FALHA`)).json();
    expect(depois.total).toBe(antes.total + 1); expect(depois.registros[0]).toMatchObject({ usuarioId: null, resultado: 'FALHA', acao: 'LOGIN_FALHA' });
  });
  test('Cadastro de paciente e solicitação/confirmação de consulta produzem eventos coerentes', async ({ negocio }) => {
    const medico = await negocio.api('medicoA');
    expect((await medico.post('/pacientes', { headers: origem, data: { nome: 'Paciente Fictício Auditado' } })).status()).toBe(201);
    await disponibilidade(negocio); const consulta = await solicitar(negocio);
    expect((await medico.patch(`/agendamentos/${consulta.id}/confirmar`, { headers: origem })).status()).toBe(200);
    const estado = inspecionarNegocio(negocio.id);
    expect(estado.auditorias.pacientes.some(e => e.acao === 'CADASTRAR_PACIENTE' && e.usuarioId === negocio.contas.medicoA.id && e.resultado === 'SUCESSO')).toBe(true);
    for (const acao of ['SOLICITAR_AGENDAMENTO', 'CONFIRMAR_AGENDAMENTO']) expect(estado.auditorias.agenda.some(e => e.acao === acao && e.resultado === 'SUCESSO')).toBe(true);
    const admin = await negocio.api('admin');
    for (const categoria of ['pacientes', 'agenda']) {
      const dados = await (await admin.get(`${base}/${categoria}?medicoId=${negocio.medicoA.id}`)).json();
      expect(dados.total).toBeGreaterThan(0); expect(dados.registros.every((e: Evento) => e.medicoId === negocio.medicoA.id)).toBe(true);
    }
  });
  test('Prontuário auditado retorna somente metadados para ADMIN', async ({ negocio }) => {
    const medico = await negocio.api('medicoA'); const senha = obterSenhaTeste() + 'Clinica9!';
    expect((await medico.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha, confirmarSenha: senha } })).status()).toBe(201);
    expect((await medico.post('/prontuarios/acesso/verificar', { headers: origem, data: { senha } })).status()).toBe(200);
    const rota = `/prontuarios/clinicos/pacientes/${negocio.pacienteA.id}`;
    const criado = await medico.post(rota, { headers: origem, data: { queixaPrincipal: 'CONTEUDO_CLINICO_FICTICIO_PRIVADO' } });
    expect(criado.status()).toBe(201); const registro = (await criado.json()).prontuario;
    expect((await medico.get(`${rota}/${registro.id}`)).status()).toBe(200); expect((await medico.get(rota)).status()).toBe(200);
    const admin = await negocio.api('admin'); const resposta = await admin.get(`${base}/prontuarios?medicoId=${negocio.medicoA.id}`);
    expect(resposta.status()).toBe(200); const dados = await resposta.json();
    expect(dados.registros.map((e: Evento) => e.acao)).toEqual(expect.arrayContaining(['CRIAR', 'CONSULTAR', 'LISTAR_HISTORICO']));
    expect(JSON.stringify(dados).includes('CONTEUDO_CLINICO_FICTICIO_PRIVADO')).toBe(false);
    for (const e of dados.registros) expect(Object.keys(e).sort()).toEqual(['id', 'usuarioId', 'medicoId', 'pacienteId', 'prontuarioId', 'acao', 'resultado', 'requisicaoId', 'createdAt'].sort());
  });
  test('Paginação de 50 preserva ordem estável, total, filtros e isolamento do médico', async ({ negocio }) => {
    operarNegocio('paginar', negocio.id); const admin = await negocio.api('admin');
    const rota = `${base}/pacientes?medicoId=${negocio.medicoA.id}&acao=CADASTRAR_PACIENTE&dataInicio=2020-01-01&dataFim=2020-01-01`;
    const um = await (await admin.get(rota)).json(); const dois = await (await admin.get(rota + '&pagina=2')).json();
    expect(um).toMatchObject({ total: 61, tamanhoPagina: 50, totalPaginas: 2, totalRetornado: 50 }); expect(dois.totalRetornado).toBe(11);
    const registros: Evento[] = [...um.registros, ...dois.registros];
    expect(new Set(registros.map(e => e.id)).size).toBe(61);
    expect(registros.every((e, i) => i === 0 || new Date(registros[i - 1].createdAt) >= new Date(e.createdAt))).toBe(true);
    const sucesso = await (await admin.get(rota + '&resultado=SUCESSO')).json(); expect(sucesso.total).toBe(60);
    const falha = await (await admin.get(rota + '&resultado=FALHA')).json(); expect(falha.total).toBe(1);
    const outra = await (await admin.get(`${base}/pacientes?medicoId=${negocio.medicoB.id}&dataInicio=2020-01-01&dataFim=2020-01-01`)).json(); expect(outra.total).toBe(0);
    const vazia = await (await admin.get(rota + '&pagina=3')).json(); expect(vazia.registros).toEqual([]);
  });
  for (const filtro of ['pagina=0', 'pagina=1.5', 'pagina=9007199254740991', 'medicoId=-1', 'acao=invalida', 'resultado=OUTRO', 'dataInicio=ontem', 'dataInicio=2021-01-02&dataFim=2021-01-01']) test(`Rejeita filtro inválido ${filtro}`, async ({ negocio }) => {
    expect((await (await negocio.api('admin')).get(`${base}/pacientes?${filtro}`)).status()).toBe(400);
  });
  test('Login não aceita filtro exclusivo de médico', async ({ negocio }) => {
    expect((await (await negocio.api('admin')).get(`${base}/login?medicoId=${negocio.medicoA.id}`)).status()).toBe(400);
  });
});
