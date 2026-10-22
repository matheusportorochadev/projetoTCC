
// ========================================
// ROTAS DE AUTENTICAÇÃO
// ========================================


// ========================================
// IMPORTAÇÕES
// ========================================

import {
  Router
} from "express";

import {
  rateLimit
} from "express-rate-limit";


// ========================================
// CONTROLLERS
// ========================================

import {
  loginController,
  logoutController
} from "../controllers/auth.controller";

import {
  solicitarRedefinicaoSenhaController,
  redefinirSenhaController
} from "../controllers/redefinicaoSenha.controller";


// ========================================
// MIDDLEWARE DE VALIDAÇÃO
// ========================================

import {
  validarBody
} from "../middlewares/validar.middleware";


// ========================================
// SCHEMAS ZOD
// ========================================

import {
  loginSchema,
  esqueciSenhaSchema,
  redefinirSenhaSchema
} from "../schemas/auth.schema";


// ========================================
// AUDITORIA DE LOGIN E SEGURANÇA
// ========================================

// NOVO:
//
// Serviço responsável por registrar
// eventos de autenticação no PostgreSQL.
//
// Nesta etapa, será utilizado para
// registrar tentativas bloqueadas pelo
// limitador de requisições.

import {
  registrarAuditoriaLogin
} from "../services/auditoria-login.service";


// ========================================
// ROUTER
// ========================================

const authRoutes =
  Router();


// ========================================
// RATE LIMIT — LOGIN
// ========================================

/*
  Máximo:

  10 tentativas
  a cada 15 minutos
  por endereço IP.

  Logins bem-sucedidos
  deixam de contar.

  NOVO:

  Quando o limite for ultrapassado,
  registramos LOGIN_BLOQUEADO
  na tabela auditoriaLogin.
*/

const loginLimiter =
  rateLimit({

    // ========================================
    // JANELA DE TEMPO
    // ========================================

    // 15 minutos.
    windowMs:
      15 * 60 * 1000,


    // ========================================
    // LIMITE DE TENTATIVAS
    // ========================================

    limit:
      10,


    // ========================================
    // HEADERS
    // ========================================

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,


    // ========================================
    // IGNORAR LOGINS BEM-SUCEDIDOS
    // ========================================

    /*
      Quando uma requisição recebe
      uma resposta HTTP bem-sucedida,
      ela não permanece contabilizada
      no limite.

      Tentativas malsucedidas
      continuam contando.
    */

    skipSuccessfulRequests:
      true,


    // ========================================
    // HANDLER DE BLOQUEIO
    // ========================================

    /*
      O handler é executado quando
      uma requisição ultrapassa
      o limite permitido.

      IMPORTANTE:

      O bloqueio acontece antes
      do loginController.

      Por isso, precisamos registrar
      LOGIN_BLOQUEADO diretamente
      neste middleware.
    */

    handler: async (
      req,
      res
    ) => {

      // ========================================
      // AUDITORIA — LOGIN BLOQUEADO
      // ========================================

      try {

        await registrarAuditoriaLogin({

          // Não existe autenticação
          // concluída nesta requisição.
          usuarioId:
            null,

          // Não associamos um perfil
          // a uma identidade não validada.
          perfil:
            null,

          // Ação de segurança.
          acao:
            "LOGIN_BLOQUEADO",

          // A requisição foi bloqueada.
          resultado:
            "FALHA",

          // Endereço IP da requisição.
          ip:
            req.ip ?? null

        });

      } catch (erroAuditoria) {

        /*
          Se o PostgreSQL apresentar
          um problema durante o registro,
          o bloqueio continua funcionando.

          O erro fica registrado somente
          no servidor.

          Não expomos informações
          internas ao usuário.
        */

        console.error(
          "[AUDITORIA LOGIN] Erro ao registrar bloqueio:",
          erroAuditoria
        );

      }


      // ========================================
      // RESPOSTA HTTP 429
      // ========================================

      /*
        Mantemos a mensagem originalmente
        utilizada pelo sistema.

        HTTP 429 significa que muitas
        requisições foram realizadas.
      */

      return res
        .status(429)
        .json({

          mensagem:
            "Muitas tentativas de login. Aguarde alguns minutos e tente novamente."

        });

    }

  });


// ========================================
// RATE LIMIT — ESQUECI SENHA
// ========================================

/*
  Essa rota envia e-mail.

  Máximo:

  5 solicitações
  a cada 15 minutos
  por endereço IP.

  Nenhuma regra anterior foi alterada.
*/

const esqueciSenhaLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit:
      5,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {

      mensagem:
        "Muitas solicitações de redefinição. Aguarde alguns minutos antes de tentar novamente."

    }

  });


// ========================================
// RATE LIMIT — REDEFINIR SENHA
// ========================================

/*
  Protege contra tentativa
  automatizada de códigos.

  Máximo:

  10 tentativas
  a cada 15 minutos
  por endereço IP.

  Nenhuma regra anterior foi alterada.
*/

const redefinirSenhaLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit:
      10,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {

      mensagem:
        "Muitas tentativas de redefinição. Aguarde alguns minutos e tente novamente."

    }

  });


// ========================================
// LOGIN
// ========================================

/*
  Fluxo:

  POST /auth/login

       ↓

  Rate limit

       ↓

  Zod valida:

  - E-mail;
  - Senha;
  - Tipos;
  - Tamanho;
  - Campos extras.

       ↓

  Controller

       ↓

  Serviço de autenticação

       ↓

  Auditoria de LOGIN_SUCESSO
  ou LOGIN_FALHA.

  Se o rate limit bloquear a requisição,
  registramos LOGIN_BLOQUEADO.
*/

authRoutes.post(

  "/login",

  loginLimiter,

  validarBody(
    loginSchema
  ),

  loginController

);


// ========================================
// LOGOUT
// ========================================

/*
  POST /auth/logout

  Remove o cookie HttpOnly principal
  e a autorização dos prontuários.

  Não exige autenticação porque até
  um cookie expirado ou inválido deve
  poder ser apagado.

  Também não existe body obrigatório,
  então não precisamos de schema Zod.

  O controller agora também registra
  LOGOUT quando identifica uma sessão
  autenticada válida.
*/

authRoutes.post(

  "/logout",

  logoutController

);


// ========================================
// ESQUECI MINHA SENHA
// ========================================

/*
  POST /auth/esqueci-senha

  O Zod valida e normaliza o e-mail
  antes do controller.

  Exemplo:

  " Usuario@EMAIL.com "

  torna-se:

  "usuario@email.com"
*/

authRoutes.post(

  "/esqueci-senha",

  esqueciSenhaLimiter,

  validarBody(
    esqueciSenhaSchema
  ),

  solicitarRedefinicaoSenhaController

);


// ========================================
// REDEFINIR SENHA
// ========================================

/*
  POST /auth/redefinir-senha

  O Zod valida:

  - E-mail;
  - Código de 6 números;
  - Nova senha;
  - Política de senha.
*/

authRoutes.post(

  "/redefinir-senha",

  redefinirSenhaLimiter,

  validarBody(
    redefinirSenhaSchema
  ),

  redefinirSenhaController

);


// ========================================
// EXPORTAÇÃO
// ========================================

export default authRoutes;
