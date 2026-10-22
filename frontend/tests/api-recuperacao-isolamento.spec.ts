import { test, expect } from './helpers/recuperacao';
import { origem, inspecionarNegocio, operarNegocio } from './helpers/negocio';
import { obterSenhaTeste } from './helpers/credenciais';
test.use({ trace: 'off' });
test.describe('Finalidade dos códigos e mudanças de autorização', () => {
  test('Códigos principal e clínico não são intercambiáveis e permanecem utilizáveis no fluxo correto', async ({ negocio, api, ambiente }) => {
    const medico = await negocio.api('medicoA'); const email = negocio.contas.medicoA.email;
    const senha = obterSenhaTeste() + 'Clinica9!'; const nova = obterSenhaTeste() + 'Nova9!';
    expect((await medico.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha, confirmarSenha: senha } })).status()).toBe(201);
    expect((await api.post('/auth/esqueci-senha', { headers: origem, data: { email } })).status()).toBe(200);
    const principal = ambiente.smtp.codigo(email);
    // Repetir somente em caso da colisão aleatória legítima de seis dígitos.
    let clinico = principal;
    for (let n = 0; n < 3 && clinico === principal; n++) {
      expect((await medico.post('/prontuarios/acesso/recuperacao/solicitar', { headers: origem, data: {} })).status()).toBe(200);
      clinico = ambiente.smtp.codigo(email);
    }
    expect(clinico !== principal).toBe(true);
    expect((await medico.post('/prontuarios/acesso/recuperacao/concluir', { headers: origem, data: { codigo: principal, novaSenha: nova, confirmarSenha: nova } })).status()).toBe(400);
    expect((await api.post('/auth/redefinir-senha', { headers: origem, data: { email, codigo: clinico, novaSenha: nova } })).status()).toBe(400);
    expect((await medico.post('/prontuarios/acesso/recuperacao/concluir', { headers: origem, data: { codigo: clinico, novaSenha: nova, confirmarSenha: nova } })).status()).toBe(200);
    expect((await api.post('/auth/redefinir-senha', { headers: origem, data: { email, codigo: principal, novaSenha: nova } })).status()).toBe(200);
  });
  for (const fluxo of ['primeiro', 'clinico'] as const) test(`${fluxo}: tentativas erradas concorrentes acumulam sem perder contagem`, async ({ negocio, api, ambiente }) => {
    const email = negocio.contas.medicoA.email; const senha = obterSenhaTeste() + 'Clinica9!';
    let contexto = api;
    if (fluxo === 'primeiro') {
      operarNegocio('elegivel', negocio.id);
      expect((await api.post('/auth/primeiro-acesso/solicitar', { headers: origem, data: { email } })).status()).toBe(200);
    } else {
      contexto = await negocio.api('medicoA');
      expect((await contexto.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha, confirmarSenha: senha } })).status()).toBe(201);
      expect((await contexto.post('/prontuarios/acesso/recuperacao/solicitar', { headers: origem, data: {} })).status()).toBe(200);
    }
    const rota = fluxo === 'primeiro' ? '/auth/primeiro-acesso/concluir' : '/prontuarios/acesso/recuperacao/concluir';
    const dados = { ...(fluxo === 'primeiro' ? { email } : {}), codigo: '000000', novaSenha: senha, confirmarSenha: senha };
    const respostas = await Promise.all([contexto.post(rota, { headers: origem, data: dados }), contexto.post(rota, { headers: origem, data: dados })]);
    expect(respostas.map(r => r.status())).toEqual([400, 400]);
    const codigo = inspecionarNegocio(negocio.id).codigos.find(c => c.tipo === (fluxo === 'primeiro' ? 'primeiro' : 'clinico'))!;
    expect(codigo).toMatchObject({ tentativas: 2, usado: false });
    expect((await contexto.post(rota, { headers: origem, data: { ...dados, codigo: ambiente.smtp.codigo(email) } })).status()).toBe(200);
  });
  test('Mudança de perfil no banco rejeita JWT antigo antes de liberar as permissões novas', async ({ negocio }) => {
    const medico = await negocio.api('medicoA');
    expect((await medico.get('/perfil')).status()).toBe(200);
    operarNegocio('alterar-perfil', negocio.id);
    expect((await medico.get('/admin')).status()).toBe(401);
    expect((await medico.get('/prontuarios/acesso/situacao')).status()).toBe(401);
  });
  test('Login normaliza espaços e caixa do email sem alterar a identidade', async ({ negocio, api }) => {
    expect((await api.post('/auth/login', { headers: origem, data: { email: `  ${negocio.contas.pacienteA.email.toUpperCase()}  `, senha: obterSenhaTeste() } })).status()).toBe(200);
    expect((await (await api.get('/perfil')).json()).usuario.id).toBe(negocio.contas.pacienteA.id);
  });
});
