import bcrypt from 'bcrypt';
import { db } from '../src/prisma/db';
// @ts-expect-error Helper JavaScript compartilhado com o inicializador.
import { validarBancoDeTestes } from './protecao-banco-testes.mjs';

validarBancoDeTestes();
const [acao, identificador] = process.argv.slice(2);
if (!identificador || !/^[a-f0-9-]{36}$/.test(identificador)) throw new Error('Identificador de fixture inválido.');
const email = `clinica.${identificador}@example.com`;

async function main() {
  if (acao === 'criar' || acao === 'criar-sem-acesso') {
    const senha = process.env.TESTE_SENHA;
    if (!senha) throw new Error('Senha fictícia ausente.');
    const hash = await bcrypt.hash(senha, 12);
    const fixture = await db.transaction(async tx => {
      const usuario = await tx.orm.public.Usuario.create({ nome: 'Médico Fixture', email, senha: hash, tipo: 'MEDICO', ativo: true, primeiroAcesso: false });
      const medico = await tx.orm.public.Medico.create({ usuarioId: usuario.id, crm: `FIX-${identificador}` });
      if (acao === 'criar') await tx.orm.public.AcessoProntuario.create({ medicoId: medico.id, senhaHash: hash });
      const paciente = await tx.orm.public.Paciente.create({ medicoId: medico.id, nome: 'Paciente Fixture', ativo: true });
      return { email, usuarioId: usuario.id, medicoId: medico.id, pacienteId: paciente.id };
    });
    console.log(JSON.stringify(fixture));
    return;
  }
  // Limpeza restrita à identidade aleatória criada por esta execução.
  const usuario = await db.orm.public.Usuario.where({ email }).first();
  if (!usuario) return;
  const medico = await db.orm.public.Medico.where({ usuarioId: usuario.id }).first();
  if (!medico) throw new Error('Fixture inconsistente.');
  if (acao === 'sessoes') {
    const registros = await db.orm.public.SessaoRevogada.where({ usuarioId: usuario.id }).all();
    console.log(JSON.stringify({
      quantidade: registros.length,
      hashesValidos: registros.every(registro => /^[a-f0-9]{64}$/.test(registro.tokenHash)),
      expiracoesValidas: registros.every(registro => Number.isFinite(Date.parse(registro.expiresAt))),
    }));
    return;
  }
  if (acao === 'revogar') {
    const acesso = await db.orm.public.AcessoProntuario.where({ medicoId: medico.id }).first();
    if (!acesso) throw new Error('Credencial ausente.');
    await db.orm.public.AcessoProntuario.where({ id: acesso.id }).update({ versaoAutorizacao: acesso.versaoAutorizacao + 1 });
    return;
  }
  if (acao !== 'limpar') throw new Error('Operação inválida.');
  await db.transaction(async tx => {
    // A tabela não usa FK para preservar as regras existentes de exclusão.
    for (const registro of await tx.orm.public.SessaoRevogada.where({ usuarioId: usuario.id }).all()) {
      await tx.orm.public.SessaoRevogada.where({ tokenHash: registro.tokenHash }).delete();
    }
    for (const registro of await tx.orm.public.AuditoriaProntuario.where({ usuarioId: usuario.id }).all()) {
      await tx.orm.public.AuditoriaProntuario.where({ id: registro.id }).delete();
    }
    for (const registro of await tx.orm.public.AuditoriaLogin.where({ usuarioId: usuario.id }).all()) {
      await tx.orm.public.AuditoriaLogin.where({ id: registro.id }).delete();
    }
    for (const registro of await tx.orm.public.Prontuario.where({ medicoId: medico.id }).all()) {
      await tx.orm.public.Prontuario.where({ id: registro.id }).delete();
    }
    for (const registro of await tx.orm.public.Paciente.where({ medicoId: medico.id }).all()) {
      await tx.orm.public.Paciente.where({ id: registro.id }).delete();
    }
    for (const registro of await tx.orm.public.AcessoProntuario.where({ medicoId: medico.id }).all()) {
      await tx.orm.public.AcessoProntuario.where({ id: registro.id }).delete();
    }
    await tx.orm.public.Medico.where({ id: medico.id }).delete();
    await tx.orm.public.Usuario.where({ id: usuario.id }).delete();
  });
}
main().catch(() => { console.error('Falha na fixture clínica (detalhes sensíveis omitidos).'); process.exitCode = 1; }).finally(() => db.close());
