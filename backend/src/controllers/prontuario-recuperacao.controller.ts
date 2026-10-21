
// ========================================
// CONTROLLER DE RECUPERAÇÃO DOS PRONTUÁRIOS
// ========================================

// Gerencia:
//
// 1. Solicitação do código por e-mail.
// 2. Redefinição da senha com o código.
//
// O médico precisa estar autenticado
// no sistema principal.
//
// Não é necessário conhecer a senha
// antiga dos prontuários.

import type {
  Request,
  Response
} from "express";

import {
  solicitarRecuperacaoProntuario,
  concluirRecuperacaoProntuario
} from "../services/prontuario-recuperacao.service";


// ========================================
// IDENTIFICAR MÉDICO AUTENTICADO
// ========================================

// Nunca recebemos o ID do médico
// diretamente do frontend.
//
// A identidade vem do JWT principal,
// validado previamente pelo middleware.
function obterUsuarioId(
  req: Request
): number | null {

  if (
    !req.usuario ||
    req.usuario.tipo !== "MEDICO"
  ) {
    return null;
  }

  return req.usuario.id;
}


// ========================================
// SOLICITAR CÓDIGO POR E-MAIL
// ========================================

// POST /prontuarios/acesso/recuperacao/solicitar
//
// Não recebe e-mail no body.
//
// O backend consulta o e-mail
// cadastrado para o médico autenticado.
export async function solicitarRecuperacaoProntuarioController(
  req: Request,
  res: Response
) {

  const usuarioId =
    obterUsuarioId(req);

  if (usuarioId === null) {

    return res.status(403).json({
      mensagem:
        "Acesso permitido somente para médicos."
    });

  }

  try {

    await solicitarRecuperacaoProntuario(
      usuarioId
    );

    return res.status(200).json({
      mensagem:
        "Se a recuperação estiver disponível, o código será enviado ao e-mail cadastrado."
    });

  } catch (erro) {

    // Não enviamos detalhes técnicos
    // do SMTP ou do banco ao frontend.
    console.error(
      "[PRONTUARIOS] Falha ao solicitar recuperação:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Não foi possível processar a solicitação. Tente novamente mais tarde."
    });

  }
}


// ========================================
// CONCLUIR RECUPERAÇÃO
// ========================================

// POST /prontuarios/acesso/recuperacao/concluir
//
// Recebe:
//
// - codigo;
// - novaSenha;
// - confirmarSenha.
//
// O schema Zod valida os campos antes
// desta função ser executada.
export async function concluirRecuperacaoProntuarioController(
  req: Request,
  res: Response
) {

  const usuarioId =
    obterUsuarioId(req);

  if (usuarioId === null) {

    return res.status(403).json({
      mensagem:
        "Acesso permitido somente para médicos."
    });

  }

  try {

    const {
      codigo,
      novaSenha
    } = req.body;

    const resultado =
      await concluirRecuperacaoProntuario(
        usuarioId,
        codigo,
        novaSenha
      );

    // Apaga o cookie adicional existente
    // no navegador após a redefinição.
    //
    // A revogação efetiva dos tokens
    // antigos também deverá ser validada
    // pelo middleware usando a versão
    // de autorização armazenada no banco.
    res.clearCookie(
      "prontuario_access",
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/prontuarios"
      }
    );

    return res.status(200).json(
      resultado
    );

  } catch (erro) {

    const mensagem =
      erro instanceof Error
        ? erro.message
        : "";

    // Erros esperados de validação
    // recebem mensagem genérica.
    if (
      mensagem ===
        "Código inválido ou expirado." ||
      mensagem ===
        "Nova senha inválida." ||
      mensagem ===
        "Não foi possível redefinir a senha."
    ) {

      return res.status(400).json({
        mensagem:
          "Código inválido, expirado ou não disponível."
      });

    }

    console.error(
      "[PRONTUARIOS] Falha ao concluir recuperação:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Não foi possível redefinir a senha dos prontuários."
    });

  }
}
