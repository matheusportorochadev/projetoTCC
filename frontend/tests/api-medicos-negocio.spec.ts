import { test, expect, origem } from './helpers/negocio';
import { obterSenhaTeste } from './helpers/credenciais';

test.use({ trace: 'off' });
test.describe('Médicos: cadastro, consulta, bloqueio e autorização', () => {
  test('ADMIN cadastra médico para primeiro acesso sem expor senha', async ({ negocio }) => {
    const admin = await negocio.api('admin');
    const resposta = await admin.post('/medicos', { headers: origem, data: {
      nome: '  Médica Fictícia  ', email: negocio.email('cadastro').toUpperCase(), crm: negocio.crm().toLowerCase(),
    } });
    expect(resposta.status()).toBe(201);
    const medico = (await resposta.json()).medico;
    expect(medico.usuario).toMatchObject({ nome: 'Médica Fictícia', email: negocio.email('cadastro'), tipo: 'MEDICO', ativo: true, primeiroAcesso: true });
    expect(medico.crm).toBe(negocio.crm());
    expect('senha' in medico.usuario).toBe(false);
    const detalhe = await admin.get(`/medicos/${medico.id}`);
    expect(detalhe.status()).toBe(200);
    expect((await detalhe.json()).medico.id).toBe(medico.id);
  });

  for (const campo of ['email', 'crm'] as const) {
    test(`Rejeita ${campo} duplicado e não cria médico parcial`, async ({ negocio }) => {
      const admin = await negocio.api('admin');
      const antes = (await (await admin.get('/medicos')).json()).medicos.length;
      const resposta = await admin.post('/medicos', { headers: origem, data: {
        nome: 'Médico Fictício', email: campo === 'email' ? negocio.contas.medicoA.email.toUpperCase() : negocio.email('crmduplicado'),
        crm: campo === 'crm' ? negocio.medicoA.crm.toLowerCase() : negocio.crm(),
      } });
      expect(resposta.status()).toBe(400);
      expect((await (await admin.get('/medicos')).json()).medicos.length).toBe(antes);
    });
  }

  const invalidos = [
    { nome: 'nome ausente', valor: { email: 'placeholder@example.com', crm: 'TST123' } },
    { nome: 'email ausente', valor: { nome: 'Médico Fictício', crm: 'TST123' } },
    { nome: 'CRM ausente', valor: { nome: 'Médico Fictício', email: 'placeholder@example.com' } },
    { nome: 'nome numérico', valor: { nome: 'Médico 123', email: 'placeholder@example.com', crm: 'TST123' } },
    { nome: 'email inválido', valor: { nome: 'Médico Fictício', email: 'invalido', crm: 'TST123' } },
    { nome: 'CRM inválido', valor: { nome: 'Médico Fictício', email: 'placeholder@example.com', crm: '@@' } },
    { nome: 'tipo incorreto', valor: { nome: 123, email: 'placeholder@example.com', crm: 'TST123' } },
    { nome: 'senha imposta pelo cliente', valor: { nome: 'Médico Fictício', email: 'placeholder@example.com', crm: 'TST123', senha: 'nao-permitida' } },
  ];
  for (const caso of invalidos) {
    test(`Rejeita ${caso.nome}`, async ({ negocio }) => {
      const admin = await negocio.api('admin');
      expect((await admin.post('/medicos', { headers: origem, data: { ...caso.valor, ...('email' in caso.valor && caso.valor.email === 'placeholder@example.com' ? { email: negocio.email('cadastro') } : {}), ...('crm' in caso.valor && caso.valor.crm === 'TST123' ? { crm: negocio.crm() } : {}) } })).status()).toBe(400);
    });
  }

  test('Lista médicos e responde 404 para identificador inexistente', async ({ negocio }) => {
    const admin = await negocio.api('admin');
    const lista = await admin.get('/medicos');
    expect(lista.status()).toBe(200);
    const medicos = (await lista.json()).medicos;
    expect(medicos.map((m: { id: number }) => m.id)).toEqual(expect.arrayContaining([negocio.medicoA.id, negocio.medicoB.id]));
    expect(medicos.some((m: { usuario: object }) => 'senha' in m.usuario)).toBe(false);
    expect((await admin.get('/medicos/2147483647')).status()).toBe(404);
  });

  test('Bloqueio impede login e acesso da sessão existente; reativação permite novo login', async ({ negocio }) => {
    const medico = await negocio.api('medicoA');
    const admin = await negocio.api('admin');
    expect((await admin.patch(`/medicos/${negocio.medicoA.id}/status`, { headers: origem, data: { ativo: false } })).status()).toBe(200);
    expect((await medico.get('/perfil')).status()).toBe(401);
    expect((await medico.post('/auth/login', { headers: origem, data: { email: negocio.contas.medicoA.email, senha: obterSenhaTeste() } })).status()).toBe(401);
    expect((await admin.patch(`/medicos/${negocio.medicoA.id}/status`, { headers: origem, data: { ativo: true } })).status()).toBe(200);
    expect((await medico.post('/auth/login', { headers: origem, data: { email: negocio.contas.medicoA.email, senha: obterSenhaTeste() } })).status()).toBe(200);
    expect((await medico.get('/perfil')).status()).toBe(200);
  });

  test('Exclusão com pacientes é recusada e mantém os vínculos', async ({ negocio }) => {
    const admin = await negocio.api('admin');
    const resposta = await admin.delete(`/medicos/${negocio.medicoA.id}`, { headers: origem });
    expect(resposta.status()).toBe(400);
    expect((await resposta.json()).mensagem).toContain('pacientes vinculados');
    expect((await admin.get(`/medicos/${negocio.medicoA.id}`)).status()).toBe(200);
    expect((await (await negocio.api('medicoA')).get(`/pacientes/${negocio.pacienteA.id}`)).status()).toBe(200);
  });

  test('Exclui fisicamente médico recém-criado sem relacionamentos', async ({ negocio }) => {
    const admin = await negocio.api('admin');
    const resposta = await admin.post('/medicos', { headers: origem, data: { nome: 'Médico Fictício', email: negocio.email('cadastro'), crm: negocio.crm() } });
    expect(resposta.status()).toBe(201);
    const id = (await resposta.json()).medico.id;
    expect((await admin.delete(`/medicos/${id}`, { headers: origem })).status()).toBe(200);
    expect((await admin.get(`/medicos/${id}`)).status()).toBe(404);
  });

  for (const papel of ['medicoA', 'pacienteA'] as const) {
    for (const acao of ['cadastrar', 'bloquear', 'excluir'] as const) {
      test(`${papel} não pode ${acao} médico`, async ({ negocio }) => {
        const api = await negocio.api(papel);
        const resposta = acao === 'cadastrar'
          ? await api.post('/medicos', { headers: origem, data: { nome: 'Médico Fictício', email: negocio.email('cadastro'), crm: negocio.crm() } })
          : acao === 'bloquear'
            ? await api.patch(`/medicos/${negocio.medicoB.id}/status`, { headers: origem, data: { ativo: false } })
            : await api.delete(`/medicos/${negocio.medicoB.id}`, { headers: origem });
        expect(resposta.status()).toBe(403);
        expect((await (await negocio.api('medicoB')).get('/perfil')).status()).toBe(200);
      });
    }
  }
});
