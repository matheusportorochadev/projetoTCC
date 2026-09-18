// ========================================
// DEPENDÊNCIAS
// ========================================

import type {
  Request,
  Response
} from "express";

import {
  solicitarPrimeiroAcesso,
  concluirPrimeiroAcesso
} from "../services/primeiroAcesso.service";


// ========================================
// SOLICITAR PRIMEIRO ACESSO
// ========================================

export async function solicitarPrimeiroAcessoController(
  req: Request,
  res: Response
) {
  try {
    const {
      email
    } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({
          mensagem:
            "O e-mail é obrigatório."
        });
    }

    const resultado =
      await solicitarPrimeiroAcesso(
        email
      );

    return res
      .status(200)
      .json(
        resultado
      );

  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro interno do servidor.";

    return res
      .status(400)
      .json({
        mensagem
      });
  }
}


// ========================================
// CONCLUIR PRIMEIRO ACESSO
// ========================================

export async function concluirPrimeiroAcessoController(
  req: Request,
  res: Response
) {
  try {
    const {
      email,
      codigo,
      novaSenha,
      confirmarSenha
    } = req.body;

    if (
      !email ||
      !codigo ||
      !novaSenha
    ) {
      return res
        .status(400)
        .json({
          mensagem:
            "E-mail, código e nova senha são obrigatórios."
        });
    }

    if (
      confirmarSenha !== undefined &&
      novaSenha !== confirmarSenha
    ) {
      return res
        .status(400)
        .json({
          mensagem:
            "As senhas não coincidem."
        });
    }

    const resultado =
      await concluirPrimeiroAcesso(
        email,
        codigo,
        novaSenha
      );

    return res
      .status(200)
      .json(
        resultado
      );

  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro interno do servidor.";

    return res
      .status(400)
      .json({
        mensagem
      });
  }
}
