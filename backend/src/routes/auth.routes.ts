// ========================================
// IMPORTAÇÕES
// ========================================

import {
  Router
} from "express";

import {
  rateLimit
} from "express-rate-limit";

import {
  loginController
} from "../controllers/auth.controller";

import {
  solicitarRedefinicaoSenhaController,
  redefinirSenhaController
} from "../controllers/redefinicaoSenha.controller";


// ========================================
// ROUTER
// ========================================

const authRoutes =
  Router();


// ========================================
// RATE LIMIT — LOGIN
// ========================================

// Protege contra tentativas repetidas
// de descobrir a senha de um usuário.
//
// Limite:
//
// 10 tentativas a cada 15 minutos
// por endereço IP.
//
// As requisições bem-sucedidas
// não continuam contando no limite.
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
// RATE LIMIT — SOLICITAR CÓDIGO
// ========================================

// Essa proteção é particularmente
// importante porque essa rota provoca
// o envio de um e-mail.
//
// Sem limite, alguém poderia chamar
// essa rota centenas ou milhares de vezes.
//
// Limite:
//
// 5 solicitações a cada 15 minutos
// por endereço IP.
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
// RATE LIMIT — TESTAR CÓDIGO
// ========================================

// O código possui apenas 6 números.
//
// Por isso precisamos impedir que
// alguém faça milhares de tentativas
// automaticamente.
//
// Limite:
//
// 10 tentativas a cada 15 minutos
// por endereço IP.
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

// POST /auth/login
//
// Como o login é público,
// aplicamos o rate limit antes
// de executar o controller.
authRoutes.post(
  "/login",
  loginLimiter,
  loginController
);


// ========================================
// ESQUECI MINHA SENHA
// ========================================

// POST /auth/esqueci-senha
//
// Fluxo:
//
// usuário informa o e-mail
//        ↓
// rate limit
//        ↓
// backend verifica usuário
//        ↓
// se existir e estiver ativo
// envia o código
//
// A resposta continua genérica
// independentemente de o e-mail existir.
authRoutes.post(
  "/esqueci-senha",
  esqueciSenhaLimiter,
  solicitarRedefinicaoSenhaController
);


// ========================================
// REDEFINIR SENHA
// ========================================

// POST /auth/redefinir-senha
//
// Recebe:
//
// {
//   "email": "...",
//   "codigo": "123456",
//   "novaSenha": "..."
// }
//
// O rate limit dificulta ataques
// de força bruta contra o código.
authRoutes.post(
  "/redefinir-senha",
  redefinirSenhaLimiter,
  redefinirSenhaController
);


// ========================================
// EXPORTAÇÃO
// ========================================

export default authRoutes;