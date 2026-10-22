import { test, expect } from './helpers/recuperacao';
import { origem, inspecionarNegocio } from './helpers/negocio';
import { obterSenhaTeste, assinarJwtTeste } from './helpers/credenciais';

test.use({ trace: 'off' });
test.describe('Revogação de todas as sessões na redefinição principal', () => {
  test('Revoga ambas as sessões e a autorização clínica após reiniciar, preservando outro usuário', async ({ negocio, api, ambiente, playwright }) => {
    test.setTimeout(45000);
    const primeira = await negocio.api('medicoA');
    const outroUsuario = await negocio.api('medicoB');
    const segunda = await playwright.request.newContext({ baseURL: ambiente.baseURL });
    try {
      expect((await segunda.post('/auth/login', { headers: origem, data: {
        email: negocio.contas.medicoA.email, senha: obterSenhaTeste(),
      } })).status()).toBe(200);
      const senhaClinica = obterSenhaTeste() + 'Clinica9!';
      expect((await primeira.post('/prontuarios/acesso/cadastrar', { headers: origem, data: { senha: senhaClinica, confirmarSenha: senhaClinica } })).status()).toBe(201);
      expect((await primeira.post('/prontuarios/acesso/verificar', { headers: origem, data: { senha: senhaClinica } })).status()).toBe(200);
      expect((await primeira.get('/prontuarios/acesso/sessao')).status()).toBe(200);
      const antigos = (await primeira.storageState()).cookies;
      const a = antigos.find(c => c.name === 'access_token')!.value;
      const clinico = antigos.find(c => c.name === 'prontuario_access')!.value;
      const b = (await segunda.storageState()).cookies.find(c => c.name === 'access_token')!.value;
      const outro = (await outroUsuario.storageState()).cookies.find(c => c.name === 'access_token')!.value;
      const email = negocio.contas.medicoA.email;
      expect((await api.post('/auth/esqueci-senha', { headers: origem, data: { email } })).status()).toBe(200);
      expect((await api.post('/auth/redefinir-senha', { headers: origem, data: {
        email, codigo: ambiente.smtp.codigo(email), novaSenha: obterSenhaTeste() + 'Nova9!',
      } })).status()).toBe(200);
      for (const token of [a, b]) expect((await api.get('/perfil', { headers: { Cookie: `access_token=${token}` } })).status()).toBe(401);
      expect((await outroUsuario.get('/perfil')).status()).toBe(200);
      const reiniciada = await playwright.request.newContext({ baseURL: await ambiente.reiniciar() });
      try {
        for (const token of [a, b]) expect((await reiniciada.get('/perfil', { headers: { Cookie: `access_token=${token}` } })).status()).toBe(401);
        expect((await reiniciada.get('/prontuarios/acesso/sessao', { headers: { Cookie: `access_token=${a}; prontuario_access=${clinico}` } })).status()).toBe(401);
        expect((await reiniciada.get('/perfil', { headers: { Cookie: `access_token=${outro}` } })).status()).toBe(200);
        expect((await reiniciada.post('/auth/login', { headers: origem, data: { email, senha: obterSenhaTeste() + 'Nova9!' } })).status()).toBe(200);
        expect((await reiniciada.get('/perfil')).status()).toBe(200);
        const novo = (await reiniciada.storageState()).cookies.find(c => c.name === 'access_token')!.value;
        // O header explícito inclui o login novo e o cookie clínico antigo.
        expect((await reiniciada.get('/prontuarios/acesso/sessao', { headers: { Cookie: `access_token=${novo}; prontuario_access=${clinico}` } })).status()).toBe(403);
      } finally { await reiniciada.dispose(); }
    } finally { await segunda.dispose(); }
  });

  test('Geração zero mantém compatibilidade e claim ausente não contorna uma redefinição', async ({ negocio, api, ambiente }) => {
    const sessao = await negocio.api('pacienteA');
    const original = (await sessao.storageState()).cookies.find(c => c.name === 'access_token')!.value;
    const payload = JSON.parse(Buffer.from(original.split('.')[1], 'base64url').toString());
    delete payload.versaoSessao;
    const legado = assinarJwtTeste(payload, ambiente.chaveJwt);
    const perfil = (token: string) => api.get('/perfil', { headers: { Cookie: `access_token=${token}` } });
    expect((await perfil(legado)).status()).toBe(200);
    const email = negocio.contas.pacienteA.email;
    expect((await api.post('/auth/esqueci-senha', { headers: origem, data: { email } })).status()).toBe(200);
    expect((await api.post('/auth/redefinir-senha', { headers: origem, data: { email, codigo: ambiente.smtp.codigo(email), novaSenha: obterSenhaTeste() + 'Nova9!' } })).status()).toBe(200);
    expect((await perfil(legado)).status()).toBe(401);
    expect((await api.post('/auth/login', { headers: origem, data: { email, senha: obterSenhaTeste() + 'Nova9!' } })).status()).toBe(200);
    expect((await api.get('/perfil')).status()).toBe(200);
    const atual = (await api.storageState()).cookies.find(c => c.name === 'access_token')!.value;
    const novaGeracao = JSON.parse(Buffer.from(atual.split('.')[1], 'base64url').toString());
    for (const versaoSessao of [-1, 0, 2, '1', 1.5]) {
      expect((await perfil(assinarJwtTeste({ ...novaGeracao, versaoSessao }, ambiente.chaveJwt))).status()).toBe(401);
    }
  });

  test('Conclusões concorrentes com senhas distintas persistem somente a vencedora e uma auditoria', async ({ negocio, api, ambiente }) => {
    const email = negocio.contas.pacienteA.email;
    expect((await api.post('/auth/esqueci-senha', { headers: origem, data: { email } })).status()).toBe(200);
    const senhas = [obterSenhaTeste() + 'Vencedora1!', obterSenhaTeste() + 'Vencedora2!'];
    const respostas = await Promise.all(senhas.map(novaSenha => api.post('/auth/redefinir-senha', { headers: origem, data: { email, codigo: ambiente.smtp.codigo(email), novaSenha } })));
    expect(respostas.map(r => r.status()).sort()).toEqual([200, 400]);
    for (let i = 0; i < senhas.length; i++) {
      expect((await api.post('/auth/login', { headers: origem, data: { email, senha: senhas[i] } })).status()).toBe(respostas[i].status() === 200 ? 200 : 401);
    }
    expect(inspecionarNegocio(negocio.id).auditorias.login.filter(e => e.acao === 'SENHA_REDEFINIDA')).toHaveLength(1);
  });
});
