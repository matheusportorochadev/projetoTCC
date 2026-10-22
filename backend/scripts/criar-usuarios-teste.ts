// ========================================
// USUÁRIOS FICTÍCIOS PARA TESTES
// ========================================
//
// Este arquivo cria contas exclusivamente
// no banco tcc_consultorio_testes.
//
// Não deve ser utilizado em produção.

import bcrypt from "bcrypt";
// @ts-expect-error Helper JavaScript compartilhado pelos inicializadores de testes.
import { validarBancoDeTestes } from "./protecao-banco-testes.mjs";
import { db } from "../src/prisma/db";

// ========================================
// PROTEÇÃO DO BANCO
// ========================================

// ========================================
// CRIAR CONTAS
// ========================================

async function main() {
  validarBancoDeTestes();

  const senha = process.env.TESTE_SENHA;

  if (!senha || senha.length < 12) {
    throw new Error(
      "TESTE_SENHA precisa ter pelo menos 12 caracteres."
    );
  }

  const emails = [
    "admin.teste@example.com",
    "medico.teste@example.com",
    "paciente.teste@example.com"
  ];

  // Evita sobrescrever contas de teste
  // caso o script seja executado novamente.
  for (const email of emails) {
    const existente = await db.orm.public.Usuario
      .where({ email })
      .first();

    if (existente) {
      throw new Error(
        "Usuário de teste já existe: " + email
      );
    }
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  // ========================================
  // TRANSAÇÃO DOS USUÁRIOS FICTÍCIOS
  // ========================================

  /*
    Todas as operações devem funcionar.

    Se uma delas falhar, o PostgreSQL
    desfaz os cadastros anteriores.

    Isso evita registros incompletos.
  */

  await db.transaction(async (tx) => {

    // ========================================
    // ADMINISTRADOR
    // ========================================

    await tx.orm.public.Usuario.create({
      nome: "Administrador Teste",
      email: emails[0]!,
      senha: senhaHash,
      tipo: "ADMIN",
      ativo: true,
      primeiroAcesso: false
    });

    // ========================================
    // MÉDICO
    // ========================================

    const usuarioMedico =
      await tx.orm.public.Usuario.create({
        nome: "Médico Teste",
        email: emails[1]!,
        senha: senhaHash,
        tipo: "MEDICO",
        ativo: true,
        primeiroAcesso: false
      });

    const medico =
      await tx.orm.public.Medico.create({
        usuarioId: usuarioMedico.id,
        crm: "CRM-TESTE-001"
      });

    // ========================================
    // PACIENTE
    // ========================================

    const usuarioPaciente =
      await tx.orm.public.Usuario.create({
        nome: "Paciente Teste",
        email: emails[2]!,
        senha: senhaHash,
        tipo: "PACIENTE",
        ativo: true,
        primeiroAcesso: false
      });

    await tx.orm.public.Paciente.create({
      medicoId: medico.id,
      usuarioId: usuarioPaciente.id,
      nome: "Paciente Teste",
      email: emails[2]!,
      acessoLiberado: true,
      ativo: true
    });

  });

  console.log("Três usuários fictícios criados.");
  console.log("Perfis: ADMIN, MEDICO e PACIENTE.");
}

main().catch((erro) => {
  console.error("Falha na preparação dos testes:", erro);
  process.exitCode = 1;
});
