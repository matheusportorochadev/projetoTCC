// ========================================
// DEPENDÊNCIAS
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
    solicitarPrimeiroAcessoController,
    concluirPrimeiroAcessoController
  } from "../controllers/primeiroAcesso.controller";
  
  
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
    solicitarPrimeiroAcessoSchema,
    concluirPrimeiroAcessoSchema
  } from "../schemas/auth.schema";
  
  
  // ========================================
  // ROUTER
  // ========================================
  
  const router =
    Router();
  
  
  // ========================================
  // RATE LIMIT — SOLICITAR PRIMEIRO ACESSO
  // ========================================
  
  /*
    Esta rota envia um código por e-mail.
  
    Sem proteção, alguém poderia chamar
    esse endpoint muitas vezes e provocar:
  
    - spam de e-mails;
    - consumo desnecessário da Brevo;
    - criação excessiva de códigos;
    - abuso do servidor.
  
    Limite:
  
    5 solicitações a cada 15 minutos
    por endereço IP.
  
    Não utilizamos skipSuccessfulRequests.
  
    Isso é proposital porque mesmo uma
    solicitação válida gera um novo e-mail.
  */
  
  const solicitarPrimeiroAcessoLimiter =
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
          "Muitas solicitações de primeiro acesso. Aguarde alguns minutos antes de tentar novamente."
  
      }
  
    });
  
  
  // ========================================
  // RATE LIMIT — CONCLUIR PRIMEIRO ACESSO
  // ========================================
  
  /*
    O código possui seis números.
  
    Existem:
  
    1.000.000 combinações possíveis.
  
    O service já possui limite de
    tentativas por código.
  
    Este rate limit adiciona uma segunda
    camada de proteção contra força bruta.
  
    Máximo:
  
    10 tentativas
    a cada 15 minutos
    por endereço IP.
  
    Requisições bem-sucedidas
    deixam de contar.
  */
  
  const concluirPrimeiroAcessoLimiter =
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
          "Muitas tentativas de primeiro acesso. Aguarde alguns minutos e tente novamente."
  
      }
  
    });
  
  
  // ========================================
  // SOLICITAR CÓDIGO
  // ========================================
  
  /*
    POST
  
    /auth/primeiro-acesso/solicitar
  
  
    Não exige JWT.
  
    O usuário ainda não possui senha.
  
  
    Fluxo:
  
    e-mail
  
      ↓
  
    rate limit
  
      ↓
  
    Zod
  
      ↓
  
    validação de primeiro acesso
  
      ↓
  
    geração do código
  
      ↓
  
    envio pela Brevo
  */
  
  router.post(
  
    "/solicitar",
  
    solicitarPrimeiroAcessoLimiter,
  
    validarBody(
      solicitarPrimeiroAcessoSchema
    ),
  
    solicitarPrimeiroAcessoController
  
  );
  
  
  // ========================================
  // CONCLUIR PRIMEIRO ACESSO
  // ========================================
  
  /*
    POST
  
    /auth/primeiro-acesso/concluir
  
  
    Também não exige JWT.
  
    A autorização ocorre através de:
  
    e-mail
    +
    código temporário
  
  
    Antes do controller o Zod valida:
  
    - formato do e-mail;
    - código com exatamente 6 números;
    - nova senha;
    - confirmação;
    - política da senha;
    - igualdade entre as duas senhas.
  
  
    Depois disso o service ainda valida:
  
    - usuário;
    - perfil;
    - primeiroAcesso;
    - senha atual null;
    - paciente ativo;
    - acesso liberado;
    - validade do código;
    - número de tentativas.
  */
  
  router.post(
  
    "/concluir",
  
    concluirPrimeiroAcessoLimiter,
  
    validarBody(
      concluirPrimeiroAcessoSchema
    ),
  
    concluirPrimeiroAcessoController
  
  );
  
  
  // ========================================
  // EXPORTAÇÃO
  // ========================================
  
  export default router;