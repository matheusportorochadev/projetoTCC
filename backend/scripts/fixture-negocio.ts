import { randomInt } from 'node:crypto';
import bcrypt from 'bcrypt';
import { db } from '../src/prisma/db';
// @ts-expect-error Guard JavaScript compartilhado com os executores existentes.
import { validarBancoDeTestes } from './protecao-banco-testes.mjs';

validarBancoDeTestes();
const [acao, id] = process.argv.slice(2);
if (!id || !/^[a-f0-9-]{36}$/.test(id)) throw new Error('Identidade de fixture inválida.');
const papeis = ['admin', 'medicoA', 'medicoB', 'pacienteA', 'pacienteA2', 'pacienteB'] as const;
const email = (papel: string) => `negocio.${id}.${papel}@example.com`.toLowerCase();

async function main() {
  if (acao === 'criar') {
    if (!process.env.TESTE_SENHA) throw new Error('Credencial fictícia ausente.');
    const senha = await bcrypt.hash(process.env.TESTE_SENHA, 12);
    const resultado = await db.transaction(async tx => {
      const contas: Record<string, { id: number; email: string }> = {};
      for (const papel of papeis) {
        const tipo = papel === 'admin' ? 'ADMIN' : papel.startsWith('medico') ? 'MEDICO' : 'PACIENTE';
        const usuario = await tx.orm.public.Usuario.create({ nome: 'Usuário Fictício', email: email(papel), senha, tipo, ativo: true, primeiroAcesso: false });
        contas[papel] = { id: usuario.id, email: usuario.email };
      }
      const medicoA = await tx.orm.public.Medico.create({ usuarioId: contas.medicoA.id, crm: `TSTA${id.replaceAll('-', '').slice(0, 20)}`.toUpperCase() });
      const medicoB = await tx.orm.public.Medico.create({ usuarioId: contas.medicoB.id, crm: `TSTB${id.replaceAll('-', '').slice(0, 20)}`.toUpperCase() });
      const pacienteA = await tx.orm.public.Paciente.create({ medicoId: medicoA.id, usuarioId: contas.pacienteA.id, nome: 'Paciente Fictício Alfa', email: email('pacienteA'), ativo: true, acessoLiberado: true });
      const pacienteA2 = await tx.orm.public.Paciente.create({ medicoId: medicoA.id, usuarioId: contas.pacienteA2.id, nome: 'Paciente Fictício Beta', email: email('pacienteA2'), ativo: true, acessoLiberado: true });
      // CPF legado fictício: exercita compatibilidade sem tocar em registros existentes.
      const cpfLegado = String(randomInt(10000000000, 99999999999)).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      const pacienteB = await tx.orm.public.Paciente.create({ medicoId: medicoB.id, usuarioId: contas.pacienteB.id, nome: 'Paciente Fictício Gama', cpf: cpfLegado, email: email('pacienteB'), ativo: true, acessoLiberado: true });
      return { contas, medicoA, medicoB, pacienteA, pacienteA2, pacienteB };
    });
    console.log(JSON.stringify(resultado));
    return;
  }
  if (['elegivel', 'expirar-primeiro', 'expirar-reset', 'expirar-clinico', 'paginar', 'paginar-login', 'paginar-agenda', 'paginar-clinico', 'alterar-perfil'].includes(acao)) {
    const papel = process.argv[4] ?? 'medicoA';
    if (!papeis.some(p => p === papel)) throw new Error('Papel de fixture inválido.');
    const usuario = await db.orm.public.Usuario.where({ email: email(papel) }).first();
    if (!usuario) throw new Error('Conta própria da fixture ausente.');
    if (acao === 'elegivel') await db.orm.public.Usuario.where({ id: usuario.id }).update({ senha: null, primeiroAcesso: true });
    if (acao === 'alterar-perfil') await db.orm.public.Usuario.where({ id: usuario.id }).update({ tipo: 'ADMIN' });
    const expirado = '2000-01-01T00:00:00.000Z';
    if (acao === 'expirar-primeiro') for (const c of await db.orm.public.CodigoPrimeiroAcesso.where({ usuarioId: usuario.id }).all()) await db.orm.public.CodigoPrimeiroAcesso.where({ id: c.id }).update({ expiraEm: expirado });
    if (acao === 'expirar-reset') for (const c of await db.orm.public.CodigoRedefinicaoSenha.where({ usuarioId: usuario.id }).all()) await db.orm.public.CodigoRedefinicaoSenha.where({ id: c.id }).update({ expiraEm: expirado });
    const medico = await db.orm.public.Medico.where({ usuarioId: usuario.id }).first();
    if (acao === 'expirar-clinico' && medico) for (const c of await db.orm.public.CodigoRecuperacaoProntuario.where({ medicoId: medico.id }).all()) await db.orm.public.CodigoRecuperacaoProntuario.where({ id: c.id }).update({ expiraEm: expirado });
    if (acao === 'paginar' && medico) {
      const paciente = await db.orm.public.Paciente.where({ medicoId: medico.id }).first();
      if (!paciente) throw new Error('Paciente próprio ausente.');
      await db.transaction(async tx => {
        for (let i = 0; i < 61; i++) await tx.orm.public.AuditoriaPaciente.create({ usuarioId: usuario.id, medicoId: medico.id, pacienteId: paciente.id, acao: 'CADASTRAR_PACIENTE', resultado: i === 60 ? 'FALHA' : 'SUCESSO', createdAt: new Date(Date.UTC(2020, 0, 1, 12, i)).toISOString(), requisicaoId: null });
      });
    }
    if (['paginar-login', 'paginar-agenda', 'paginar-clinico'].includes(acao) && medico) {
      const paciente = await db.orm.public.Paciente.where({ medicoId: medico.id }).first();
      if (!paciente) throw new Error('Paciente próprio ausente.');
      await db.transaction(async tx => {
        // Metadados sintéticos: datas fixas isolam os eventos reais da execução.
        for (let i = 0; i < 61; i++) {
          const comum = { usuarioId: usuario.id, resultado: i === 60 ? 'FALHA' : 'SUCESSO', createdAt: new Date(Date.UTC(2020, 0, 1, 12, i)).toISOString(), requisicaoId: null };
          if (acao === 'paginar-login') await tx.orm.public.AuditoriaLogin.create({ ...comum, perfil: 'MEDICO', acao: 'LOGIN_SUCESSO', ip: null });
          if (acao === 'paginar-agenda') await tx.orm.public.AuditoriaAgenda.create({ ...comum, medicoId: medico.id, acao: 'CRIAR_DISPONIBILIDADE' });
          if (acao === 'paginar-clinico') await tx.orm.public.AuditoriaProntuario.create({ ...comum, medicoId: medico.id, pacienteId: paciente.id, acao: 'LISTAR_HISTORICO' });
        }
      });
    }
    console.log('null'); return;
  }
  if (acao === 'inspecionar') {
    const auditorias = { login: [] as unknown[], pacientes: [] as unknown[], agenda: [] as unknown[], prontuarios: [] as unknown[] };
    const codigos: { tipo: string; usado: boolean; tentativas?: number; hashSeguro: boolean }[] = [];
    const usuarios = [];
    const pacientes = [];
    const agendamentos = [];
    const disponibilidades = [];
    for (const rotulo of [...papeis, 'cadastro', 'cadastro2', 'pacienteextra']) {
      const usuario = await db.orm.public.Usuario.where({ email: email(rotulo) }).first();
      if (!usuario) continue;
      usuarios.push({ id: usuario.id, email: usuario.email, nome: usuario.nome, tipo: usuario.tipo,
        ativo: usuario.ativo, primeiroAcesso: usuario.primeiroAcesso, temSenha: Boolean(usuario.senha) });
      auditorias.login.push(...await db.orm.public.AuditoriaLogin.where({ usuarioId: usuario.id }).all());
      for (const c of await db.orm.public.CodigoPrimeiroAcesso.where({ usuarioId: usuario.id }).all()) codigos.push({ tipo: 'primeiro', usado: c.usado, tentativas: c.tentativas, hashSeguro: /^[a-f0-9]{64}$/.test(c.codigoHash) });
      for (const c of await db.orm.public.CodigoRedefinicaoSenha.where({ usuarioId: usuario.id }).all()) codigos.push({ tipo: 'reset', usado: c.usado, hashSeguro: /^[a-f0-9]{64}$/.test(c.codigo) });
      const medico = await db.orm.public.Medico.where({ usuarioId: usuario.id }).first();
      if (!medico) continue;
      auditorias.pacientes.push(...await db.orm.public.AuditoriaPaciente.where({ medicoId: medico.id }).all());
      auditorias.agenda.push(...await db.orm.public.AuditoriaAgenda.where({ medicoId: medico.id }).all());
      auditorias.prontuarios.push(...await db.orm.public.AuditoriaProntuario.where({ medicoId: medico.id }).all());
      for (const c of await db.orm.public.CodigoRecuperacaoProntuario.where({ medicoId: medico.id }).all()) codigos.push({ tipo: 'clinico', usado: c.usado, tentativas: c.tentativas, hashSeguro: /^[a-f0-9]{64}$/.test(c.codigoHash) });

      for (const p of await db.orm.public.Paciente.where({ medicoId: medico.id }).all()) {
        pacientes.push({ id: p.id, usuarioId: p.usuarioId, medicoId: p.medicoId, ativo: p.ativo, acessoLiberado: p.acessoLiberado });
      }
      agendamentos.push(...await db.orm.public.Agendamento.where({ medicoId: medico.id }).all());
      disponibilidades.push(...await db.orm.public.DisponibilidadeAgenda.where({ medicoId: medico.id }).all());
    }
    console.log(JSON.stringify({ usuarios, pacientes, agendamentos, disponibilidades, auditorias, codigos }));
    return;
  }
  if (acao !== 'limpar') throw new Error('Operação de fixture inválida.');
  // Nomes conhecidos, gerados para esta execução; nunca usa LIKE ou e-mail real.
  const rotulos = [...papeis, 'cadastro', 'cadastro2', 'emailduplicado', 'crmduplicado', 'pacienteextra'];
  await db.transaction(async tx => {
    const usuarios = new Map<number, { id: number; email: string }>();
    for (const rotulo of rotulos) {
      const usuario = await tx.orm.public.Usuario.where({ email: email(rotulo) }).first();
      if (usuario) usuarios.set(usuario.id, usuario);
    }
    for (const usuario of [...usuarios.values()]) {
      const medico = await tx.orm.public.Medico.where({ usuarioId: usuario.id }).first();
      if (!medico) continue;
      const pacientes = await tx.orm.public.Paciente.where({ medicoId: medico.id }).all();
      for (const paciente of pacientes) {
        if (paciente.usuarioId) {
          const vinculado = await tx.orm.public.Usuario.where({ id: paciente.usuarioId }).first();
          if (vinculado && !vinculado.email.startsWith(`negocio.${id}.`)) throw new Error('Limpeza bloqueada: vínculo fora da fixture.');
          if (vinculado) usuarios.set(vinculado.id, vinculado);
        }
      }
      for (const consulta of await tx.orm.public.Agendamento.where({ medicoId: medico.id }).all()) {
        for (const remarcacao of await tx.orm.public.RemarcacaoAgendamento.where({ agendamentoId: consulta.id }).all()) {
          await tx.orm.public.RemarcacaoAgendamento.where({ id: remarcacao.id }).delete();
        }
        await tx.orm.public.Agendamento.where({ id: consulta.id }).delete();
      }
      for (const registro of await tx.orm.public.Prontuario.where({ medicoId: medico.id }).all()) await tx.orm.public.Prontuario.where({ id: registro.id }).delete();
      for (const registro of await tx.orm.public.AuditoriaAgenda.where({ medicoId: medico.id }).all()) await tx.orm.public.AuditoriaAgenda.where({ id: registro.id }).delete();
      for (const registro of await tx.orm.public.AuditoriaPaciente.where({ medicoId: medico.id }).all()) await tx.orm.public.AuditoriaPaciente.where({ id: registro.id }).delete();
      for (const registro of await tx.orm.public.AuditoriaProntuario.where({ medicoId: medico.id }).all()) await tx.orm.public.AuditoriaProntuario.where({ id: registro.id }).delete();
      for (const registro of await tx.orm.public.DisponibilidadeAgenda.where({ medicoId: medico.id }).all()) await tx.orm.public.DisponibilidadeAgenda.where({ id: registro.id }).delete();
      for (const registro of await tx.orm.public.CodigoRecuperacaoProntuario.where({ medicoId: medico.id }).all()) await tx.orm.public.CodigoRecuperacaoProntuario.where({ id: registro.id }).delete();
      for (const registro of await tx.orm.public.AcessoProntuario.where({ medicoId: medico.id }).all()) await tx.orm.public.AcessoProntuario.where({ id: registro.id }).delete();
      for (const paciente of pacientes) await tx.orm.public.Paciente.where({ id: paciente.id }).delete();
      await tx.orm.public.Medico.where({ id: medico.id }).delete();
    }
    for (const usuario of usuarios.values()) {
      for (const registro of await tx.orm.public.CodigoPrimeiroAcesso.where({ usuarioId: usuario.id }).all()) await tx.orm.public.CodigoPrimeiroAcesso.where({ id: registro.id }).delete();
      for (const registro of await tx.orm.public.CodigoRedefinicaoSenha.where({ usuarioId: usuario.id }).all()) await tx.orm.public.CodigoRedefinicaoSenha.where({ id: registro.id }).delete();
      for (const registro of await tx.orm.public.SessaoRevogada.where({ usuarioId: usuario.id }).all()) await tx.orm.public.SessaoRevogada.where({ tokenHash: registro.tokenHash }).delete();
      for (const registro of await tx.orm.public.AuditoriaLogin.where({ usuarioId: usuario.id }).all()) await tx.orm.public.AuditoriaLogin.where({ id: registro.id }).delete();
      await tx.orm.public.Usuario.where({ id: usuario.id }).delete();
    }
  });
}
main().catch(() => { console.error('Fixture de negócio não concluída; detalhes sensíveis omitidos.'); process.exitCode = 1; }).finally(() => db.close());
