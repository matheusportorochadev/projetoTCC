// Dependências do controller de redefinição de senha
import type { Request, Response } from "express";
import {
  solicitarRedefinicaoSenha,
  redefinirSenha
} from "../services/redefinicaoSenha.service";

// Solicita um código de redefinição de senha
export async function solicitarRedefinicaoSenhaController(
  req: Request,
  res: Response
) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        mensagem: "O e-mail é obrigatório."
      });
    }

    const resultado = await solicitarRedefinicaoSenha(
      String(email).trim().toLowerCase()
    );

    return res.status(200).json({
      mensagem: "Código de redefinição gerado com sucesso.",
      resultado
    });
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro interno do servidor.";

    return res.status(400).json({
      mensagem
    });
  }
}

// Valida o código e redefine a senha
export async function redefinirSenhaController(
  req: Request,
  res: Response
) {
  try {
    const { email, codigo, novaSenha } = req.body;

    if (!email || !codigo || !novaSenha) {
      return res.status(400).json({
        mensagem:
          "E-mail, código e nova senha são obrigatórios."
      });
    }

    const emailFormatado =
      String(email).trim().toLowerCase();

    const codigoFormatado =
      String(codigo).trim();

    const novaSenhaFormatada =
      String(novaSenha);

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const codigoRegex =
      /^\d{6}$/;

    const senhaRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!emailRegex.test(emailFormatado)) {
      return res.status(400).json({
        mensagem: "Informe um e-mail válido."
      });
    }

    if (!codigoRegex.test(codigoFormatado)) {
      return res.status(400).json({
        mensagem:
          "O código deve conter exatamente 6 números."
      });
    }

    if (!senhaRegex.test(novaSenhaFormatada)) {
      return res.status(400).json({
        mensagem:
          "A senha deve ter no mínimo 8 caracteres, com letra maiúscula, letra minúscula, número e caractere especial."
      });
    }

    const resultado = await redefinirSenha(
      emailFormatado,
      codigoFormatado,
      novaSenhaFormatada
    );

    return res.status(200).json(resultado);
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro interno do servidor.";

    return res.status(400).json({
      mensagem
    });
  }
}