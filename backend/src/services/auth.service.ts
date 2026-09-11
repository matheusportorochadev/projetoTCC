// ========================================
// DEPENDÊNCIAS DA AUTENTICAÇÃO
// ========================================

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { db } from "../prisma/db";

import {
  solicitarRedefinicaoSenha
} from "./redefinicaoSenha.service";


// ========================================
// TIPOS
// ========================================

// Dados recebidos no login
interface LoginDTO {
  email: string;
  senha: string;
}


// ========================================
// LOGIN
// ========================================

// Realiza a autenticação do usuário
export async function login({
  email,
  senha
}: LoginDTO) {

  // Padroniza o e-mail recebido
  const emailFormatado =
    email.trim().toLowerCase();

  // Busca o usuário pelo e-mail
  const usuario =
    await db.orm.public.Usuario
      .where({
        email: emailFormatado
      })
      .first();


  // ========================================
  // VALIDAÇÕES
  // ========================================

  if (!usuario) {
    throw new Error(
      "E-mail ou senha inválidos."
    );
  }


  // Impede login de usuário bloqueado
  if (!usuario.ativo) {
    throw new Error(
      "Usuário bloqueado."
    );
  }


  // Compara a senha informada com
  // o hash salvo no banco
  const senhaCorreta =
    await bcrypt.compare(
      senha,
      usuario.senha
    );


  if (!senhaCorreta) {
    throw new Error(
      "E-mail ou senha inválidos."
    );
  }


  // ========================================
  // PRIMEIRO ACESSO
  // ========================================

  /*
    Se for o primeiro acesso do usuário,
    o sistema gera automaticamente um código
    de redefinição de senha e envia para
    o e-mail cadastrado.

    Isso acontece somente depois que:
    - o e-mail foi validado;
    - a senha inicial foi validada;
    - o usuário está ativo.
  */

  if (usuario.primeiroAcesso) {
    await solicitarRedefinicaoSenha(
      usuario.email
    );
  }


  // ========================================
  // JWT
  // ========================================

  const jwtSecret =
    process.env.JWT_SECRET;


  if (!jwtSecret) {
    throw new Error(
      "JWT_SECRET não configurado."
    );
  }


  // Gera o token de autenticação
  const token =
    jwt.sign(
      {
        tipo: usuario.tipo
      },

      jwtSecret,

      {
        subject:
          String(usuario.id),

        expiresIn:
          "8h"
      }
    );


  // ========================================
  // RETORNO
  // ========================================

  // Retorna somente dados seguros
  return {
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      ativo: usuario.ativo,
      primeiroAcesso:
        usuario.primeiroAcesso
    },

    token
  };
} 