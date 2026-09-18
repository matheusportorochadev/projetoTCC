// ========================================
// DEPENDÊNCIAS DA AUTENTICAÇÃO
// ========================================

import bcrypt from "bcrypt";

import jwt from "jsonwebtoken";

import {
  db
} from "../prisma/db";

import {
  solicitarRedefinicaoSenha
} from "./redefinicaoSenha.service";


// ========================================
// CONFIGURAÇÃO JWT
// ========================================

const JWT_ISSUER =
  "tcc-consultorio-api";

const JWT_AUDIENCE =
  "tcc-consultorio-web";


// ========================================
// TIPOS
// ========================================

interface LoginDTO {

  email:
    string;

  senha:
    string;

}


// ========================================
// OBTER SEGREDO JWT
// ========================================

function obterJwtSecret() {

  const jwtSecret =
    process.env.JWT_SECRET;


  /*
    Exigimos um segredo com pelo
    menos 32 caracteres.

    Não mostramos o segredo em logs
    nem o retornamos ao frontend.
  */
  if (
    !jwtSecret ||
    jwtSecret.length < 32
  ) {

    throw new Error(
      "JWT_SECRET não está configurado corretamente."
    );

  }


  return jwtSecret;
}


// ========================================
// LOGIN
// ========================================

export async function login({
  email,
  senha
}: LoginDTO) {

  // ========================================
  // NORMALIZAR E-MAIL
  // ========================================

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
  // USUÁRIO NÃO ENCONTRADO
  // ========================================

  /*
    Utilizamos uma resposta genérica
    para dificultar enumeração de usuários.
  */
  if (!usuario) {

    throw new Error(
      "E-mail ou senha inválidos."
    );

  }


  // ========================================
  // USUÁRIO DESATIVADO
  // ========================================

  /*
    Também não precisamos revelar
    pelo login que determinado e-mail
    pertence a uma conta desativada.
  */
  if (!usuario.ativo) {

    throw new Error(
      "E-mail ou senha inválidos."
    );

  }


  // ========================================
  // USUÁRIO SEM SENHA
  // ========================================

  /*
    Usuário criado pelo novo fluxo:

    senha = null
    primeiroAcesso = true

    Ele não pode utilizar login normal.
  */
  if (!usuario.senha) {

    throw new Error(
      "E-mail ou senha inválidos. Se este for seu primeiro acesso, utilize a opção Primeiro acesso."
    );

  }


  // ========================================
  // VALIDAR SENHA
  // ========================================

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
  // PRIMEIRO ACESSO LEGADO
  // ========================================

  /*
    Ainda existem usuários antigos
    que possuem:

    senha != null
    primeiroAcesso = true

    Exemplo:

    médicos cadastrados pelo
    fluxo anterior.

    Mantemos temporariamente
    esse comportamento.

    Porém existe uma mudança
    importante:

    NÃO emitimos um JWT de acesso
    para esse usuário.
  */
  if (
    usuario.primeiroAcesso
  ) {

    await solicitarRedefinicaoSenha(
      usuario.email
    );


    return {

      usuario: {

        id:
          usuario.id,

        nome:
          usuario.nome,

        email:
          usuario.email,

        tipo:
          usuario.tipo,

        ativo:
          usuario.ativo,

        primeiroAcesso:
          true

      },


      /*
        Não fornecemos uma sessão
        autenticada enquanto o primeiro
        acesso não for concluído.
      */
      token:
        null

    };
  }


  // ========================================
  // JWT SECRET
  // ========================================

  const jwtSecret =
    obterJwtSecret();


  // ========================================
  // GERAR TOKEN
  // ========================================

  /*
    Nosso token contém apenas:

    tipo

    O ID fica no subject ("sub").

    Dados como:

    nome
    email
    senha

    não precisam ficar dentro do JWT.
  */
  const token =
    jwt.sign(

      {
        tipo:
          usuario.tipo
      },

      jwtSecret,

      {

        // Algoritmo aceito pela aplicação.
        algorithm:
          "HS256",


        // Identificador do usuário.
        subject:
          String(
            usuario.id
          ),


        // Tempo de validade.
        expiresIn:
          "8h",


        // Quem criou o token.
        issuer:
          JWT_ISSUER,


        // Para qual aplicação ele foi criado.
        audience:
          JWT_AUDIENCE

      }

    );


  // ========================================
  // RETORNO
  // ========================================

  return {

    usuario: {

      id:
        usuario.id,

      nome:
        usuario.nome,

      email:
        usuario.email,

      tipo:
        usuario.tipo,

      ativo:
        usuario.ativo,

      primeiroAcesso:
        false

    },


    token

  };
}