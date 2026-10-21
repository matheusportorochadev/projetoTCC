
// ========================================
// SERVICE DE ACESSO AOS PRONTUÁRIOS
// ========================================

// Responsável pelas regras de negócio
// relacionadas à senha adicional utilizada
// pelos médicos para acessar prontuários.

import bcrypt from "bcrypt";

import { db } from "../prisma/db";

import {
  buscarMedicoPorUsuarioId
} from "./paciente.service";


// ========================================
// CONFIGURAÇÕES DE SEGURANÇA
// ========================================

// Define o custo utilizado pelo bcrypt
// para proteger a senha no banco.
const BCRYPT_ROUNDS = 12;


// ========================================
// CONSULTAR SITUAÇÃO DO ACESSO
// ========================================

// Verifica se o médico autenticado já
// possui uma senha de prontuários.
//
// Retornamos apenas um booleano.
// O hash nunca será enviado ao frontend.
export async function consultarSituacaoAcessoProntuario(
  usuarioId: number
) {

  // Identifica o médico através do
  // usuário autenticado.
  const medico =
    await buscarMedicoPorUsuarioId(
      usuarioId
    );

  // Procura a credencial do médico.
  const acesso =
    await db.orm.public.AcessoProntuario
      .where({
        medicoId: medico.id
      })
      .first();

  return {
    senhaCadastrada: Boolean(acesso)
  };
}


// ========================================
// CADASTRAR SENHA ADICIONAL
// ========================================

// Utilizado exclusivamente no primeiro
// cadastro da senha de prontuários.
export async function cadastrarSenhaProntuario(
  usuarioId: number,
  senha: string
) {

  // Descobre o médico autenticado.
  const medico =
    await buscarMedicoPorUsuarioId(
      usuarioId
    );

  // Verifica se já existe uma senha.
  const acessoExistente =
    await db.orm.public.AcessoProntuario
      .where({
        medicoId: medico.id
      })
      .first();

  // Não permitimos substituir a senha
  // utilizando o fluxo de primeiro cadastro.
  if (acessoExistente) {
    throw new Error(
      "A senha dos prontuários já foi cadastrada."
    );
  }

  // Cria o hash bcrypt.
  //
  // A senha original não será salva
  // no banco de dados.
  const senhaHash =
    await bcrypt.hash(
      senha,
      BCRYPT_ROUNDS
    );

  // Armazena apenas o hash.
  //
  // O campo medicoId possui UNIQUE
  // no PostgreSQL, impedindo múltiplas
  // credenciais para o mesmo médico.
  await db.orm.public.AcessoProntuario
    .create({
      medicoId: medico.id,
      senhaHash
    });

  return {
    mensagem:
      "Senha dos prontuários cadastrada com sucesso."
  };
}


// ========================================
// VERIFICAR SENHA ADICIONAL
// ========================================

// Verifica a senha cadastrada anteriormente.
//
// O service não cria cookies ou tokens.
// Isso será responsabilidade do controller
// na próxima etapa.
export async function verificarSenhaProntuario(
  usuarioId: number,
  senha: string
) {

  // Identifica o médico autenticado.
  const medico =
    await buscarMedicoPorUsuarioId(
      usuarioId
    );

  // Procura a credencial adicional.
  const acesso =
    await db.orm.public.AcessoProntuario
      .where({
        medicoId: medico.id
      })
      .first();

  if (!acesso) {
    throw new Error(
      "A senha dos prontuários ainda não foi cadastrada."
    );
  }

  // Compara a senha informada com
  // o hash armazenado no banco.
  const senhaCorreta =
    await bcrypt.compare(
      senha,
      acesso.senhaHash
    );

  if (!senhaCorreta) {
    return {
      autorizado: false
    };
  }

  return {
    autorizado: true
  };
}
