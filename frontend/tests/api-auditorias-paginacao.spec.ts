import { test, expect, operarNegocio, type Evento } from './helpers/negocio';
test.use({ trace: 'off' });
test.describe('Paginação profunda dos demais módulos administrativos', () => {
  for (const [modulo, acaoFixture, acao] of [
    ['login', 'paginar-login', 'LOGIN_SUCESSO'],
    ['agenda', 'paginar-agenda', 'CRIAR_DISPONIBILIDADE'],
    ['prontuarios', 'paginar-clinico', 'LISTAR_HISTORICO'],
  ] as const) test(`${modulo}: 50+11 eventos, autoria, ordem, filtros e página vazia`, async ({ negocio }) => {
    operarNegocio(acaoFixture, negocio.id);
    const admin = await negocio.api('admin');
    // Login permite usuarioId? Usar datas exclusivas; demais módulos isolam médico.
    const filtro = modulo === 'login' ? '' : `&medicoId=${negocio.medicoA.id}`;
    const rota = `/admin/auditoria/${modulo}?dataInicio=2020-01-01&dataFim=2020-01-01&acao=${acao}${filtro}`;
    const um = await admin.get(rota); const dois = await admin.get(rota + '&pagina=2');
    expect(um.status()).toBe(200); expect(dois.status()).toBe(200);
    const a = await um.json(); const b = await dois.json();
    expect(a).toMatchObject({ total: 61, tamanhoPagina: 50, totalPaginas: 2, totalRetornado: 50 }); expect(b.totalRetornado).toBe(11);
    const eventos: Evento[] = [...a.registros, ...b.registros];
    expect(new Set(eventos.map(e => e.id)).size).toBe(61);
    expect(eventos.every(e => e.usuarioId === negocio.contas.medicoA.id)).toBe(true);
    expect(eventos.every((e, i) => i === 0 || new Date(eventos[i - 1].createdAt) >= new Date(e.createdAt))).toBe(true);
    expect((await (await admin.get(rota + '&resultado=SUCESSO')).json()).total).toBe(60);
    expect((await (await admin.get(rota + '&resultado=FALHA')).json()).total).toBe(1);
    expect((await (await admin.get(rota + '&pagina=3')).json()).registros).toEqual([]);
  });
});
