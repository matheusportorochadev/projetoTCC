import { test, expect, origem, cpfFicticio, inspecionarNegocio } from './helpers/negocio';
import { obterSenhaTeste } from './helpers/credenciais';

test.use({ trace: 'off' });
test.describe('Pacientes: integridade, acesso e isolamento entre médicos', () => {
  test('Cadastra, consulta e altera dados permitidos de paciente sem criar acesso automaticamente', async ({ negocio }) => {
    const medico = await negocio.api('medicoA');
    const resposta = await medico.post('/pacientes', { headers: origem, data: { nome: 'Paciente Fictício Novo', email: negocio.email('pacienteextra').toUpperCase(), telefone: '(34) 99999-9999', cpf: cpfFicticio() } });
    expect(resposta.status()).toBe(201);
    const paciente = await resposta.json();
    expect(paciente).toMatchObject({ medicoId: negocio.medicoA.id, usuarioId: null, acessoLiberado: false, ativo: true, email: negocio.email('pacienteextra') });
    expect((await medico.get(`/pacientes/${paciente.id}`)).status()).toBe(200);
    const alterado = await medico.patch(`/pacientes/${paciente.id}`, { headers: origem, data: { nome: 'Paciente Fictício Atualizado', telefone: '34999998888' } });
    expect(alterado.status()).toBe(200);
    expect(await alterado.json()).toMatchObject({ nome: 'Paciente Fictício Atualizado', telefone: '34999998888' });
  });

  const invalidos = [
    { nome: 'nome ausente', dados: {} },
    { nome: 'nome vazio', dados: { nome: '   ' } },
    { nome: 'email inválido', dados: { nome: 'Paciente Fictício', email: 'invalido' } },
    { nome: 'CPF curto', dados: { nome: 'Paciente Fictício', cpf: '123' } },
    { nome: 'telefone com letras', dados: { nome: 'Paciente Fictício', telefone: 'telefoneInvalido' } },
    { nome: 'tipo incorreto', dados: { nome: 123 } },
    { nome: 'medicoId imposto', dados: { nome: 'Paciente Fictício', medicoId: 1 } },
  ];
  for (const caso of invalidos) {
    test(`Rejeita ${caso.nome}`, async ({ negocio }) => {
      const medico = await negocio.api('medicoA');
      const antes = (await (await medico.get('/pacientes')).json()).length;
      expect((await medico.post('/pacientes', { headers: origem, data: caso.dados })).status()).toBe(400);
      expect((await (await medico.get('/pacientes')).json()).length).toBe(antes);
    });
  }

  test('Rejeita CPF duplicado sem criar segundo paciente', async ({ negocio }) => {
    const medico = await negocio.api('medicoA'); const cpf = cpfFicticio();
    expect((await medico.post('/pacientes', { headers: origem, data: { nome: 'Paciente Fictício Novo', cpf } })).status()).toBe(201);
    expect((await medico.post('/pacientes', { headers: origem, data: { nome: 'Outro Paciente Fictício', cpf } })).status()).toBe(400);
  });

  test('CPF com e sem máscara identifica a mesma pessoa e não permite duplicação', async ({ negocio }) => {
    const medico = await negocio.api('medicoA'); const cpf = cpfFicticio();
    const mascarado = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    expect((await medico.post('/pacientes', { headers: origem, data: { nome: 'Paciente Fictício Novo', cpf } })).status()).toBe(201);
    expect((await medico.post('/pacientes', { headers: origem, data: { nome: 'Outro Paciente Fictício', cpf: mascarado } })).status()).toBe(400);
  });

  test('Listagem inclui somente pacientes do médico autenticado', async ({ negocio }) => {
    const medico = await negocio.api('medicoA');
    const pacientes = await (await medico.get('/pacientes')).json();
    expect(pacientes.map((p: { id: number }) => p.id)).toEqual(expect.arrayContaining([negocio.pacienteA.id, negocio.pacienteA2.id]));
    expect(pacientes.some((p: { id: number }) => p.id === negocio.pacienteB.id)).toBe(false);
  });

  for (const acao of ['consultar', 'alterar', 'bloquear', 'liberar', 'excluir'] as const) {
    test(`Médico A não pode ${acao} paciente do Médico B`, async ({ negocio }) => {
      const medico = await negocio.api('medicoA'); const rota = `/pacientes/${negocio.pacienteB.id}`;
      const resposta = acao === 'consultar' ? await medico.get(rota)
        : acao === 'alterar' ? await medico.patch(rota, { headers: origem, data: { nome: 'Tentativa Indevida' } })
          : acao === 'bloquear' ? await medico.patch(`${rota}/status`, { headers: origem, data: { ativo: false } })
            : acao === 'liberar' ? await medico.patch(`${rota}/acesso`, { headers: origem, data: { acessoLiberado: true } })
              : await medico.delete(rota, { headers: origem });
      expect(resposta.status()).toBe(400);
      expect(await resposta.json()).toEqual({ mensagem: 'Paciente não encontrado.' });
      const original = await (await negocio.api('medicoB')).get(rota);
      expect(original.status()).toBe(200);
      expect(await original.json()).toMatchObject({ nome: 'Paciente Fictício Gama', ativo: true });
    });
  }

  test('Bloqueio e reativação preservam o vínculo e controlam login/sessão', async ({ negocio }) => {
    const medico = await negocio.api('medicoA'); const paciente = await negocio.api('pacienteA');
    expect((await medico.patch(`/pacientes/${negocio.pacienteA.id}/status`, { headers: origem, data: { ativo: false } })).status()).toBe(200);
    expect((await paciente.get('/perfil')).status()).toBe(401);
    expect((await paciente.post('/auth/login', { headers: origem, data: { email: negocio.contas.pacienteA.email, senha: obterSenhaTeste() } })).status()).toBe(401);
    expect((await medico.patch(`/pacientes/${negocio.pacienteA.id}/status`, { headers: origem, data: { ativo: true } })).status()).toBe(200);
    expect((await paciente.post('/auth/login', { headers: origem, data: { email: negocio.contas.pacienteA.email, senha: obterSenhaTeste() } })).status()).toBe(200);
    expect((await (await medico.get(`/pacientes/${negocio.pacienteA.id}`)).json()).usuarioId).toBe(negocio.contas.pacienteA.id);
  });

  test('Libera acesso com usuário vinculado e primeiro acesso pendente, sem enviar email', async ({ negocio }) => {
    const medico = await negocio.api('medicoA');
    const criado = await medico.post('/pacientes', { headers: origem, data: { nome: 'Paciente Fictício Novo', email: negocio.email('pacienteextra') } });
    expect(criado.status()).toBe(201); const id = (await criado.json()).id;
    const acesso = await medico.patch(`/pacientes/${id}/acesso`, { headers: origem, data: { acessoLiberado: true } });
    expect(acesso.status()).toBe(200);
    expect(await acesso.json()).toMatchObject({ acessoLiberado: true, usuarioId: expect.any(Number) });
    const usuario = inspecionarNegocio(negocio.id).usuarios.find(u => u.email === negocio.email('pacienteextra'));
    expect(usuario).toMatchObject({ tipo: 'PACIENTE', ativo: true, primeiroAcesso: true, temSenha: false });
    // A conta nova não tem senha; o fluxo de código/SMTP não é chamado.
    expect((await medico.post('/auth/login', { headers: origem, data: { email: negocio.email('pacienteextra'), senha: obterSenhaTeste() } })).status()).toBe(401);
  });

  test('Não libera acesso de paciente sem email', async ({ negocio }) => {
    const medico = await negocio.api('medicoA');
    const criado = await medico.post('/pacientes', { headers: origem, data: { nome: 'Paciente Fictício Novo' } });
    expect(criado.status()).toBe(201); const id = (await criado.json()).id;
    expect((await medico.patch(`/pacientes/${id}/acesso`, { headers: origem, data: { acessoLiberado: true } })).status()).toBe(400);
    expect(await (await medico.get(`/pacientes/${id}`)).json()).toMatchObject({ usuarioId: null, acessoLiberado: false });
  });

  test('Alterar nome/email sincroniza o usuário e mantém identificadores', async ({ negocio }) => {
    const medico = await negocio.api('medicoA');
    const paciente = await negocio.api('pacienteA');
    const atualizado = await medico.patch(`/pacientes/${negocio.pacienteA.id}`, { headers: origem, data: { nome: 'Paciente Fictício Atualizado', email: negocio.email('pacienteextra') } });
    expect(atualizado.status()).toBe(200);
    expect(await atualizado.json()).toMatchObject({ id: negocio.pacienteA.id, usuarioId: negocio.contas.pacienteA.id, nome: 'Paciente Fictício Atualizado' });
    expect(inspecionarNegocio(negocio.id).usuarios.find(u => u.id === negocio.contas.pacienteA.id)).toMatchObject({ email: negocio.email('pacienteextra'), nome: 'Paciente Fictício Atualizado' });
    expect((await paciente.post('/auth/login', { headers: origem, data: { email: negocio.email('pacienteextra'), senha: obterSenhaTeste() } })).status()).toBe(200);
  });

  test('Paciente autenticado não modifica cadastro de outro paciente', async ({ negocio }) => {
    const paciente = await negocio.api('pacienteA');
    expect((await paciente.patch(`/pacientes/${negocio.pacienteB.id}`, { headers: origem, data: { nome: 'Tentativa Indevida' } })).status()).toBe(403);
  });

  test('Exclui paciente sem histórico ou conta vinculada', async ({ negocio }) => {
    const medico = await negocio.api('medicoA');
    const criado = await medico.post('/pacientes', { headers: origem, data: { nome: 'Paciente Fictício Novo' } });
    expect(criado.status()).toBe(201); const id = (await criado.json()).id;
    expect((await medico.delete(`/pacientes/${id}`, { headers: origem })).status()).toBe(200);
    expect((await medico.get(`/pacientes/${id}`)).status()).toBe(400);
  });
});

// Regressões adicionais: legado, atualização e escrita concorrente usam a mesma identidade.
test('CPF legado com máscara impede novo cadastro sem alterar o registro original', async ({ negocio }) => {
  const medicoA = await negocio.api('medicoA');
  const cpf = negocio.pacienteB.cpf.replace(/\D/g, '');
  const resposta = await medicoA.post('/pacientes', { headers: origem, data: { nome: 'Paciente Fictício Novo', cpf } });
  expect(resposta.status()).toBe(400);
  expect(await resposta.json()).toEqual({ mensagem: 'Já existe um paciente com este CPF.' });
  const original = await (await negocio.api('medicoB')).get(`/pacientes/${negocio.pacienteB.id}`);
  expect((await original.json()).cpf).toBe(negocio.pacienteB.cpf);
});

test('Atualização normaliza CPF e rejeita colisão com CPF legado de outro médico', async ({ negocio }) => {
  const medico = await negocio.api('medicoA'); const rota = `/pacientes/${negocio.pacienteA.id}`;
  const cpf = cpfFicticio(); const mascara = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  const atualizado = await medico.patch(rota, { headers: origem, data: { cpf: mascara } });
  expect(atualizado.status()).toBe(200); expect((await atualizado.json()).cpf).toBe(cpf);
  expect((await medico.patch(rota, { headers: origem, data: { cpf: negocio.pacienteB.cpf.replace(/\D/g, '') } })).status()).toBe(400);
  expect((await (await medico.get(rota)).json()).cpf).toBe(cpf);
});

test('Cadastros concorrentes com CPF equivalente persistem um único paciente', async ({ negocio }) => {
  const a = await negocio.api('medicoA'); const b = await negocio.api('medicoB'); const cpf = cpfFicticio();
  const mascara = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  const respostas = await Promise.all([
    a.post('/pacientes', { headers: origem, data: { nome: 'Paciente Fictício Novo', cpf } }),
    b.post('/pacientes', { headers: origem, data: { nome: 'Paciente Fictício Novo', cpf: mascara } }),
  ]);
  expect(respostas.map(r => r.status()).sort()).toEqual([201, 400]);
  const pacientes = [...await (await a.get('/pacientes')).json(), ...await (await b.get('/pacientes')).json()];
  expect(pacientes.filter(p => p.cpf?.replace(/\D/g, '') === cpf)).toHaveLength(1);
});
