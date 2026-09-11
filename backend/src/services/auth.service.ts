// Dependências da autenticação
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../prisma/db";

// Dados recebidos no login
interface LoginDTO {
  email: string;
  senha: string;
}

// Realiza a autenticação do usuário
export async function login({ email, senha }: LoginDTO) {
  const usuario = await db.orm.public.Usuario
    .where({ email })
    .first();

  if (!usuario) {
    throw new Error("E-mail ou senha inválidos.");
  }

  if (!usuario.ativo) {
    throw new Error("Usuário bloqueado.");
  }

  // Compara a senha informada com o hash salvo
  const senhaCorreta = await bcrypt.compare(
    senha,
    usuario.senha
  );

  if (!senhaCorreta) {
    throw new Error("E-mail ou senha inválidos.");
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET não configurado.");
  }

  // Gera o token de autenticação
  const token = jwt.sign(
    {
      tipo: usuario.tipo
    },
    jwtSecret,
    {
      subject: String(usuario.id),
      expiresIn: "8h"
    }
  );

  // Retorna somente dados seguros
  return {
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      ativo: usuario.ativo,
      primeiroAcesso: usuario.primeiroAcesso
    },
    token
  };
}