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
*/

const loginLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit:
      10,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    skipSuccessfulRequests:
      true,

    message: {

      mensagem:
        "Muitas tentativas de login. Aguarde alguns minutos e tente novamente."

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

  rate limit

        ↓

  Zod valida:

  - e-mail;
  - senha;
  - tipos;
  - tamanho;
  - campos extras.

        ↓

  controller
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
  Remove o cookie HttpOnly.

  Não exige autenticação porque até
  um cookie expirado ou inválido deve
  poder ser apagado.

  Também não existe body obrigatório,
  então não precisamos de schema Zod.
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

  - e-mail;
  - código de 6 números;
  - nova senha;
  - política de senha.
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