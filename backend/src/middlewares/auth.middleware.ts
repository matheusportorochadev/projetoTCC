// ========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ========================================


// ========================================
// DEPENDÊNCIAS
// ========================================

import type {
  NextFunction,
  Request,
  Response
} from "express";

import jwt from "jsonwebtoken";

import {
  db
} from "../prisma/db";


// ========================================
// CONFIGURAÇÃO JWT
// ========================================

const JWT_ISSUER =
  "tcc-consultorio-api";

const JWT_AUDIENCE =
  "tcc-consultorio-web";


// ========================================
// COOKIE DE AUTENTICAÇÃO
// ========================================

const NOME_COOKIE =
  "access_token";


// ========================================
// TIPOS
// ========================================

type TipoUsuario =
  | "ADMIN"
  | "MEDICO"
  | "PACIENTE";


interface TokenPayload
  extends jwt.JwtPayload {

  tipo:
    TipoUsuario;

}


// ========================================
// JWT SECRET
// ========================================

function obterJwtSecret() {

  const jwtSecret =
    process.env.JWT_SECRET;


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
// VALIDAR PERFIL
// ========================================

function tipoUsuarioValido(
  tipo: unknown
): tipo is TipoUsuario {

  return (
    tipo === "ADMIN" ||
    tipo === "MEDICO" ||
    tipo === "PACIENTE"
  );

}


// ========================================
// AUTENTICAÇÃO
// ========================================

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {

  try {

    // ========================================
    // OBTER TOKEN PELO COOKIE HTTPONLY
    // ========================================

    /*
      O sistema não aceita mais:

      Authorization: Bearer ...

      A autenticação agora utiliza
      exclusivamente o cookie:

      access_token
    */
    const tokenCookie =
      req.cookies?.[
        NOME_COOKIE
      ];


    const token =
      typeof tokenCookie ===
        "string"
        ? tokenCookie
        : undefined;


    // ========================================
    // TOKEN NÃO ENCONTRADO
    // ========================================

    if (
      !token
    ) {

      return res
        .status(401)
        .json({

          mensagem:
            "Usuário não autenticado."

        });

    }


    // ========================================
    // VALIDAR JWT
    // ========================================

    const jwtSecret =
      obterJwtSecret();


    const payload =
      jwt.verify(
        token,
        jwtSecret,
        {

          algorithms: [
            "HS256"
          ],

          issuer:
            JWT_ISSUER,

          audience:
            JWT_AUDIENCE

        }
      );


    // ========================================
    // PAYLOAD INVÁLIDO
    // ========================================

    if (
      typeof payload ===
      "string"
    ) {

      return res
        .status(401)
        .json({

          mensagem:
            "Token inválido ou expirado."

        });

    }


    const dadosToken =
      payload as TokenPayload;


    // ========================================
    // VALIDAR ID DO USUÁRIO
    // ========================================

    const usuarioId =
      Number(
        dadosToken.sub
      );


    if (
      !Number.isInteger(
        usuarioId
      ) ||
      usuarioId <= 0
    ) {

      return res
        .status(401)
        .json({

          mensagem:
            "Token inválido ou expirado."

        });

    }


    // ========================================
    // VALIDAR PERFIL DO TOKEN
    // ========================================

    if (
      !tipoUsuarioValido(
        dadosToken.tipo
      )
    ) {

      return res
        .status(401)
        .json({

          mensagem:
            "Token inválido ou expirado."

        });

    }


    // ========================================
    // BUSCAR USUÁRIO ATUAL NO BANCO
    // ========================================

    /*
      Mesmo com JWT válido,
      consultamos o banco.

      Dessa forma detectamos imediatamente:

      - usuário excluído;
      - usuário desativado;
      - perfil alterado;
      - primeiro acesso pendente.
    */
    const usuario =
      await db.orm.public.Usuario
        .where({

          id:
            usuarioId

        })
        .first();


    // ========================================
    // USUÁRIO NÃO EXISTE
    // ========================================

    if (
      !usuario
    ) {

      return res
        .status(401)
        .json({

          mensagem:
            "Sessão inválida ou expirada."

        });

    }


    // ========================================
    // USUÁRIO DESATIVADO
    // ========================================

    if (
      !usuario.ativo
    ) {

      return res
        .status(401)
        .json({

          mensagem:
            "Sessão inválida ou expirada."

        });

    }


    // ========================================
    // PRIMEIRO ACESSO PENDENTE
    // ========================================

    if (
      usuario.primeiroAcesso
    ) {

      return res
        .status(401)
        .json({

          mensagem:
            "Primeiro acesso ainda não concluído."

        });

    }


    // ========================================
    // PERFIL ALTERADO
    // ========================================

    if (
      usuario.tipo !==
      dadosToken.tipo
    ) {

      return res
        .status(401)
        .json({

          mensagem:
            "Sessão inválida ou expirada."

        });

    }


    // ========================================
    // USUÁRIO AUTENTICADO
    // ========================================

    /*
      Utilizamos os dados atuais
      do banco para preencher req.usuario.

      Não confiamos exclusivamente
      nas informações contidas no JWT.
    */
    req.usuario = {

      id:
        usuario.id,

      tipo:
        usuario.tipo

    };


    return next();

  } catch (erro) {

    // ========================================
    // ERRO DE CONFIGURAÇÃO
    // ========================================

    if (
      erro instanceof Error &&
      erro.message ===
        "JWT_SECRET não está configurado corretamente."
    ) {

      console.error(
        "Erro de configuração JWT:",
        erro.message
      );


      return res
        .status(500)
        .json({

          mensagem:
            "Erro interno de autenticação."

        });

    }


    // ========================================
    // JWT INVÁLIDO / EXPIRADO
    // ========================================

    return res
      .status(401)
      .json({

        mensagem:
          "Token inválido ou expirado."

      });

  }
}
