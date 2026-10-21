
// ========================================
// ROTAS DE ACESSO AOS PRONTUÁRIOS
// ========================================

// Inclui:
//
// - consulta da situação da senha;
// - primeiro cadastro;
// - desbloqueio com senha;
// - validação da sessão adicional;
// - solicitação de recuperação;
// - conclusão da recuperação.
//
// Todas as rotas exigem um médico
// autenticado pelo JWT principal.

import { Router } from "express";

import {
  rateLimit
} from "express-rate-limit";


// ========================================
// MIDDLEWARES EXISTENTES
// ========================================

import {
  authMiddleware
} from "../middlewares/auth.middleware";

import {
  permitirPerfis
} from "../middlewares/role.middleware";

import {
  validarBody
} from "../middlewares/validar.middleware";


// ========================================
// MIDDLEWARE DOS PRONTUÁRIOS
// ========================================

import {
  protegerProntuarios
} from "../middlewares/prontuario-acesso.middleware";


// ========================================
// SCHEMAS DE ACESSO
// ========================================

import {
  cadastrarSenhaProntuarioSchema,
  verificarSenhaProntuarioSchema
} from "../schemas/prontuario-acesso.schema";


// ========================================
// SCHEMAS DE RECUPERAÇÃO
// ========================================

import {
  solicitarRecuperacaoProntuarioSchema,
  concluirRecuperacaoProntuarioSchema
} from "../schemas/prontuario-recuperacao.schema";


// ========================================
// CONTROLLERS DE ACESSO
// ========================================

import {
  situacaoAcessoProntuarioController,
  cadastrarSenhaProntuarioController,
  verificarSenhaProntuarioController
} from "../controllers/prontuario-acesso.controller";


// ========================================
// CONTROLLERS DE RECUPERAÇÃO
// ========================================

import {
  solicitarRecuperacaoProntuarioController,
  concluirRecuperacaoProntuarioController
} from "../controllers/prontuario-recuperacao.controller";


// ========================================
// ROUTER
// ========================================

const prontuarioAcessoRoutes =
  Router();


// ========================================
// AUTENTICAÇÃO OBRIGATÓRIA
// ========================================

// Primeiro valida o JWT de login.
// Depois exige perfil MEDICO.
//
// A recuperação não exige a senha
// adicional, porque sua finalidade
// é justamente recuperá-la.
prontuarioAcessoRoutes.use(
  authMiddleware,

  permitirPerfis("MEDICO")
);


// ========================================
// LIMITE — CADASTRO DA SENHA
// ========================================

const cadastroLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit: 5,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      mensagem:
        "Muitas tentativas de cadastro. Aguarde 15 minutos."
    }

  });


// ========================================
// LIMITE — DESBLOQUEIO
// ========================================

const verificacaoLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit: 5,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      mensagem:
        "Muitas tentativas de acesso. Aguarde 15 minutos."
    }

  });


// ========================================
// LIMITE — SOLICITAÇÃO DE CÓDIGO
// ========================================

// Limita o envio de códigos
// para reduzir abuso do SMTP.
//
// Limite de 3 solicitações
// em 15 minutos por IP.
const solicitarCodigoLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit: 3,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      mensagem:
        "Muitas solicitações de código. Aguarde 15 minutos."
    }

  });


// ========================================
// LIMITE — CONFIRMAÇÃO DE CÓDIGO
// ========================================

// Além deste limitador por IP,
// o service controla as tentativas
// incorretas de cada código.
const concluirRecuperacaoLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit: 5,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      mensagem:
        "Muitas tentativas de recuperação. Aguarde 15 minutos."
    }

  });


// ========================================
// CONSULTAR SITUAÇÃO DA SENHA
// ========================================

// GET /prontuarios/acesso/situacao
prontuarioAcessoRoutes.get(
  "/situacao",

  situacaoAcessoProntuarioController
);


// ========================================
// CADASTRAR SENHA PELA PRIMEIRA VEZ
// ========================================

// POST /prontuarios/acesso/cadastrar
prontuarioAcessoRoutes.post(
  "/cadastrar",

  cadastroLimiter,

  validarBody(
    cadastrarSenhaProntuarioSchema
  ),

  cadastrarSenhaProntuarioController
);


// ========================================
// VERIFICAR SENHA ADICIONAL
// ========================================

// POST /prontuarios/acesso/verificar
prontuarioAcessoRoutes.post(
  "/verificar",

  verificacaoLimiter,

  validarBody(
    verificarSenhaProntuarioSchema
  ),

  verificarSenhaProntuarioController
);


// ========================================
// CONSULTAR AUTORIZAÇÃO ATUAL
// ========================================

// GET /prontuarios/acesso/sessao
//
// O middleware valida o cookie
// adicional antes de liberar a resposta.
prontuarioAcessoRoutes.get(
  "/sessao",

  protegerProntuarios,

  (_req, res) => {

    return res.status(200).json({
      autorizado: true
    });

  }
);


// ========================================
// SOLICITAR RECUPERAÇÃO
// ========================================

// POST /prontuarios/acesso/recuperacao/solicitar
//
// Não recebe e-mail como parâmetro.
// Utiliza o médico autenticado.
prontuarioAcessoRoutes.post(
  "/recuperacao/solicitar",

  solicitarCodigoLimiter,

  validarBody(
    solicitarRecuperacaoProntuarioSchema
  ),

  solicitarRecuperacaoProntuarioController
);


// ========================================
// CONCLUIR RECUPERAÇÃO
// ========================================

// POST /prontuarios/acesso/recuperacao/concluir
//
// Recebe código e nova senha.
// O backend verifica o código
// antes de atualizar o hash bcrypt.
prontuarioAcessoRoutes.post(
  "/recuperacao/concluir",

  concluirRecuperacaoLimiter,

  validarBody(
    concluirRecuperacaoProntuarioSchema
  ),

  concluirRecuperacaoProntuarioController
);


// ========================================
// EXPORTAÇÃO
// ========================================

export default prontuarioAcessoRoutes;
