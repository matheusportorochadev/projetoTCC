
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
// CONFIGURAÇÃO DOS COOKIES
// ========================================

// Cookie principal do sistema.
// Armazena o JWT utilizado no login.
const NOME_COOKIE =
  "access_token";

// NOVO:
//
// Cookie utilizado exclusivamente para
// autorizar o acesso aos prontuários.
//
// O nome precisa ser igual ao utilizado
// no controller de prontuários.
const COOKIE_PRONTUARIO =
  "prontuario_access";


// ========================================
// TEMPO DE VIDA DO COOKIE PRINCIPAL
// ========================================

/*
  O JWT principal possui validade
  de 8 horas.

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
// REMOVER AUTORIZAÇÃO DOS PRONTUÁRIOS
// ========================================

// NOVO:
//
// Esta função remove o cookie adicional
// utilizado para acessar prontuários.
//
// IMPORTANTE:
//
// O cookie foi criado com:
//
// path: "/prontuarios"
//
// Portanto, precisamos usar o mesmo
// path ao removê-lo.
//
// Não alteramos o cookie principal.
function removerCookieProntuario(
  res: Response
) {

  res.clearCookie(
    COOKIE_PRONTUARIO,
    {

      httpOnly:
        true,

      secure:
        estaEmProducao(),

      sameSite:
        "lax",

      path:
        "/prontuarios"

    }
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
    // NOVO — LIMPAR ACESSO ANTIGO
    // ========================================

    /*
      Depois que as credenciais principais
      são validadas, removemos qualquer
      autorização anterior de prontuários.

      Assim, um novo login no navegador
      não reutiliza o desbloqueio anterior
      do módulo clínico.

      O médico precisará informar novamente
      a senha adicional dos prontuários.
    */

    removerCookieProntuario(res);


    // ========================================
    // CRIAR COOKIE HTTPONLY
    // ========================================

    /*
      Quando o login é concluído
      normalmente, o service gera JWT.

      O JWT é armazenado exclusivamente
      no cookie HttpOnly.

      Ele NÃO será devolvido no JSON.
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

    Por isso o backend remove o cookie
    de autenticação principal.
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


  // ========================================
  // NOVO — BLOQUEAR PRONTUÁRIOS NO LOGOUT
  // ========================================

  /*
    Ao sair do sistema, também removemos
    o cookie adicional dos prontuários.

    Assim, o navegador deixa de enviar
    essa autorização nas próximas
    requisições.

    Isso não modifica a senha cadastrada
    no PostgreSQL.

    Quando o médico fizer login novamente,
    precisará informar sua senha adicional
    para desbloquear os prontuários.
  */

  removerCookieProntuario(res);


  // ========================================
  // RESPOSTA DO LOGOUT
  // ========================================

  return res
    .status(200)
    .json({

      mensagem:
        "Logout realizado com sucesso."

    });

}
