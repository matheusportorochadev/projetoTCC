// ========================================
// CONTROLLER DE AUTENTICAÇÃO
// ========================================


// ========================================
// DEPENDÊNCIAS
// ========================================

import type {
  Request,
  Response
} from "express";

import {
  login
} from "../services/auth.service";


// ========================================
// CONFIGURAÇÃO DO COOKIE
// ========================================

const NOME_COOKIE =
  "access_token";


// ========================================
// TEMPO DE VIDA DO COOKIE
// ========================================

/*
  O JWT possui validade de 8 horas.

  Mantemos o cookie com o mesmo
  tempo de validade.
*/
const TEMPO_COOKIE =
  8 * 60 * 60 * 1000;


// ========================================
// VERIFICAR AMBIENTE
// ========================================

function estaEmProducao() {

  return (
    process.env.NODE_ENV ===
    "production"
  );

}


// ========================================
// LOGIN
// ========================================

export async function loginController(
  req: Request,
  res: Response
) {

  try {

    // ========================================
    // RECEBER DADOS
    // ========================================

    const {
      email,
      senha
    } =
      req.body;


    // ========================================
    // VALIDAR CAMPOS
    // ========================================

    if (
      typeof email !== "string" ||
      typeof senha !== "string" ||
      !email.trim() ||
      !senha
    ) {

      return res
        .status(400)
        .json({

          mensagem:
            "E-mail e senha são obrigatórios."

        });

    }


    // ========================================
    // EXECUTAR LOGIN
    // ========================================

    const resultado =
      await login({

        email:
          email.trim(),

        senha

      });


    // ========================================
    // CRIAR COOKIE HTTPONLY
    // ========================================

    /*
      Quando o login é concluído
      normalmente, o service gera JWT.

      O JWT é armazenado exclusivamente
      no cookie HttpOnly.

      Ele NÃO será mais devolvido no JSON.
    */
    if (
      resultado.token
    ) {

      res.cookie(

        NOME_COOKIE,

        resultado.token,

        {

          // JavaScript do frontend
          // não consegue acessar o JWT.
          httpOnly:
            true,


          // Em produção exige HTTPS.
          secure:
            estaEmProducao(),


          // Proteção inicial contra
          // requisições cross-site.
          sameSite:
            "lax",


          // Cookie disponível para
          // todas as rotas da API.
          path:
            "/",


          // 8 horas.
          maxAge:
            TEMPO_COOKIE

        }

      );

    }


    // ========================================
    // RESPOSTA DO LOGIN
    // ========================================

    /*
      O frontend recebe somente
      informações do usuário.

      O JWT permanece exclusivamente
      dentro do cookie HttpOnly.
    */
    return res
      .status(200)
      .json({

        usuario:
          resultado.usuario

      });

  } catch (erro) {

    // ========================================
    // TRATAMENTO DE ERRO
    // ========================================

    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro interno do servidor.";


    return res
      .status(401)
      .json({

        mensagem

      });

  }
}


// ========================================
// LOGOUT
// ========================================

export async function logoutController(
  req: Request,
  res: Response
) {

  /*
    O cookie HttpOnly não pode ser
    apagado diretamente pelo frontend.

    Por isso o backend remove o cookie.
  */
  res.clearCookie(

    NOME_COOKIE,

    {

      httpOnly:
        true,

      secure:
        estaEmProducao(),

      sameSite:
        "lax",

      path:
        "/"

    }

  );


  return res
    .status(200)
    .json({

      mensagem:
        "Logout realizado com sucesso."

    });

}
