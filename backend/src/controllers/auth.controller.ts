// Dependências do controller de autenticação
import type { Request, Response } from "express";
import { login } from "../services/auth.service";

// Recebe os dados de login e retorna usuário e token
export async function loginController(req: Request, res: Response) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        mensagem: "E-mail e senha são obrigatórios."
      });
    }

    const resultado = await login({ email, senha });

    return res.status(200).json(resultado);
  } catch (erro) {
    const mensagem =
      erro instanceof Error ? erro.message : "Erro interno do servidor.";

    return res.status(401).json({
      mensagem
    });
  }
}