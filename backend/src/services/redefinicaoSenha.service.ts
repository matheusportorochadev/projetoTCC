// ========================================
// DEPENDÊNCIAS
// ========================================

import crypto from "crypto";
import bcrypt from "bcrypt";

import {
  db
} from "../prisma/db";

import {
  enviarCodigoRedefinicao
} from "./email.service";


// ========================================
// GERAR CÓDIGO
// ========================================

// Gera um código aleatório
// de exatamente 6 números.
//
// Exemplo:
//
// 583294
function gerarCodigo() {
  return crypto
    .randomInt(
      100000,
      1000000
    )
    .toString();
}


// ========================================
// OBTER SEGREDO DO SERVIDOR
// ========================================

// Esse segredo existe somente no backend.
//
// Ele NÃO deve:
//
// - ir para o frontend;
// - ir para o GitHub;
// - ser reutilizado como JWT_SECRET.
function obterSegredoCodigo() {

  const segredo =
    process.env.RESET_CODE_SECRET;

  if (
    !segredo ||
    segredo.length < 32
  ) {
    throw new Error(
      "RESET_CODE_SECRET não está configurado corretamente."
    );
  }

  return segredo;
}


// ========================================
// GERAR HMAC DO CÓDIGO
// ========================================

// O código enviado por e-mail:
//
// 583294
//
// NÃO será armazenado dessa maneira
// no banco.
//
// Armazenamos algo semelhante a:
//
// 6703d365e280c52...
//
// O usuarioId também entra no cálculo.
//
// Dessa forma, o mesmo código gerado
// para usuários diferentes produz
// hashes diferentes.
function gerarHashCodigo(
  usuarioId: number,
  codigo: string
) {

  return crypto
    .createHmac(
      "sha256",
      obterSegredoCodigo()
    )
    .update(
      `${usuarioId}:${codigo}`
    )
    .digest("hex");
}


// ========================================
// INVALIDAR CÓDIGOS ANTERIORES
// ========================================

// Mantemos somente o código mais recente
// válido para o usuário.
//
// Ao solicitar outro código,
// os anteriores deixam de funcionar.
async function invalidarCodigosAtivos(
  usuarioId: number
) {

  const codigos =
    await db.orm.public
      .CodigoRedefinicaoSenha
      .where({
        usuarioId,
        usado: false
      })
      .all();

  for (
    const registro
    of codigos
  ) {

    await db.orm.public
      .CodigoRedefinicaoSenha
      .where({
        id: registro.id
      })
      .update({
        usado: true
      });

  }
}


// ========================================
// SOLICITAR REDEFINIÇÃO
// ========================================

export async function solicitarRedefinicaoSenha(
  email: string
) {

  const emailFormatado =
    email
      .trim()
      .toLowerCase();


  // ========================================
  // BUSCAR USUÁRIO
  // ========================================

  const usuario =
    await db.orm.public.Usuario
      .where({
        email:
          emailFormatado
      })
      .first();


  // ========================================
  // NÃO REVELAR EXISTÊNCIA DO USUÁRIO
  // ========================================

  // Não lançamos erro se o usuário
  // não existir.
  //
  // Assim ninguém consegue utilizar
  // a recuperação de senha para descobrir
  // quais e-mails estão cadastrados.
  if (!usuario) {
    return;
  }


  // O mesmo vale para usuários inativos.
  if (!usuario.ativo) {
    return;
  }


  // ========================================
  // INVALIDAR CÓDIGOS ANTIGOS
  // ========================================

  await invalidarCodigosAtivos(
    usuario.id
  );


  // ========================================
  // GERAR NOVO CÓDIGO
  // ========================================

  const codigo =
    gerarCodigo();


  // ========================================
  // GERAR HMAC
  // ========================================

  const codigoHash =
    gerarHashCodigo(
      usuario.id,
      codigo
    );


  // ========================================
  // DEFINIR EXPIRAÇÃO
  // ========================================

  // Código válido por 10 minutos.
  const expiraEm =
    new Date(
      Date.now() +
      10 * 60 * 1000
    ).toISOString();


  // ========================================
  // SALVAR SOMENTE O HASH
  // ========================================

  const registro =
    await db.orm.public
      .CodigoRedefinicaoSenha
      .create({

        usuarioId:
          usuario.id,

        // IMPORTANTE:
        //
        // O banco recebe o HMAC,
        // nunca os 6 números originais.
        codigo:
          codigoHash,

        expiraEm,

        usado:
          false

      });


  // ========================================
  // ENVIAR CÓDIGO POR E-MAIL
  // ========================================

  try {

    // Aqui utilizamos usuario.email,
    // que veio do banco.
    //
    // Não utilizamos diretamente
    // o endereço recebido do frontend.
    await enviarCodigoRedefinicao(
      usuario.email,
      codigo
    );

  } catch (erro) {

    // Se a Brevo/SMTP falhar,
    // invalidamos imediatamente
    // o código criado.
    await db.orm.public
      .CodigoRedefinicaoSenha
      .where({
        id: registro.id
      })
      .update({
        usado: true
      });

    throw erro;
  }
}


// ========================================
// REDEFINIR SENHA
// ========================================

export async function redefinirSenha(
  email: string,
  codigo: string,
  novaSenha: string
) {

  const emailFormatado =
    email
      .trim()
      .toLowerCase();


  // ========================================
  // BUSCAR USUÁRIO
  // ========================================

  const usuario =
    await db.orm.public.Usuario
      .where({
        email:
          emailFormatado
      })
      .first();


  // Não revelamos se:
  //
  // - usuário não existe;
  // - usuário está inativo.
  if (
    !usuario ||
    !usuario.ativo
  ) {

    throw new Error(
      "Código inválido ou expirado."
    );

  }


  // ========================================
  // GERAR HMAC DO CÓDIGO RECEBIDO
  // ========================================

  const codigoHash =
    gerarHashCodigo(
      usuario.id,
      codigo
    );


  // ========================================
  // BUSCAR O HASH NO BANCO
  // ========================================

  const codigoRedefinicao =
    await db.orm.public
      .CodigoRedefinicaoSenha
      .where({

        usuarioId:
          usuario.id,

        codigo:
          codigoHash,

        usado:
          false

      })
      .first();


  // ========================================
  // CÓDIGO INVÁLIDO
  // ========================================

  if (!codigoRedefinicao) {

    throw new Error(
      "Código inválido ou expirado."
    );

  }


  // ========================================
  // VERIFICAR EXPIRAÇÃO
  // ========================================

  const agora =
    new Date();


  const expiracao =
    new Date(
      codigoRedefinicao.expiraEm
    );


  if (
    agora >= expiracao
  ) {

    // Já aproveitamos para invalidá-lo.
    await db.orm.public
      .CodigoRedefinicaoSenha
      .where({
        id:
          codigoRedefinicao.id
      })
      .update({
        usado:
          true
      });


    throw new Error(
      "Código inválido ou expirado."
    );

  }


  // ========================================
  // GERAR HASH DA NOVA SENHA
  // ========================================

  const senhaHash =
    await bcrypt.hash(
      novaSenha,
      12
    );


  // ========================================
  // ATUALIZAR USUÁRIO
  // ========================================

  const usuarioAtualizado =
    await db.orm.public.Usuario
      .where({
        id:
          usuario.id
      })
      .update({

        senha:
          senhaHash,

        primeiroAcesso:
          false

      });


  if (!usuarioAtualizado) {

    throw new Error(
      "Erro ao atualizar senha."
    );

  }


  // ========================================
  // INVALIDAR TODOS OS CÓDIGOS
  // ========================================

  // Depois que a senha for alterada,
  // qualquer outro código desse usuário
  // deixa de ser válido.
  await invalidarCodigosAtivos(
    usuario.id
  );


  // ========================================
  // RESPOSTA
  // ========================================

  return {

    mensagem:
      "Senha redefinida com sucesso."

  };
}