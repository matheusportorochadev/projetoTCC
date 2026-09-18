// ========================================
// SCHEMAS DE MÉDICO
// ========================================

import {
  z
} from "zod";


// ========================================
// NOME
// ========================================

const nomeMedicoSchema =
  z
    .string({
      error:
        "O nome é obrigatório."
    })
    .trim()
    .min(
      3,
      "O nome deve possuir pelo menos 3 caracteres."
    )
    .max(
      120,
      "O nome deve possuir no máximo 120 caracteres."
    )
    .regex(
      /^[A-Za-zÀ-ÿ\s]+$/,
      "O nome deve conter apenas letras e espaços."
    );


// ========================================
// E-MAIL
// ========================================

const emailMedicoSchema =
  z
    .string({
      error:
        "O e-mail é obrigatório."
    })
    .trim()
    .max(
      254,
      "E-mail muito longo."
    )
    .email(
      "Informe um e-mail válido."
    )
    .transform(
      (email) =>
        email.toLowerCase()
    );


// ========================================
// CRM
// ========================================

/*
  Mantemos uma validação flexível porque
  o formato pode variar de acordo com UF
  e com o padrão utilizado no cadastro.

  Permitimos:

  letras
  números
  espaços
  ponto
  barra
  hífen

  Exemplos:

  123456
  CRM-MG 123456
  123456/MG
*/

const crmSchema =
  z
    .string({
      error:
        "O CRM é obrigatório."
    })
    .trim()
    .min(
      2,
      "Informe um CRM válido."
    )
    .max(
      30,
      "O CRM deve possuir no máximo 30 caracteres."
    )
    .regex(
      /^[A-Za-zÀ-ÿ0-9./\-\s]+$/,
      "O CRM possui caracteres inválidos."
    )
    .transform(
      (crm) =>
        crm.toUpperCase()
    );


// ========================================
// CRIAR MÉDICO
// ========================================
//
// O ADMIN pode informar somente:
//
// - nome;
// - e-mail;
// - CRM.
//
// A senha NÃO pode ser enviada.
//
// O médico criará sua própria senha
// posteriormente através do fluxo
// de Primeiro Acesso.
//
// Como utilizamos .strict(),
// tentativas de enviar:
//
// senha
// ativo
// tipo
// primeiroAcesso
// usuarioId
//
// serão rejeitadas automaticamente.

export const criarMedicoSchema =
  z
    .object({

      nome:
        nomeMedicoSchema,

      email:
        emailMedicoSchema,

      crm:
        crmSchema

    })
    .strict();


// ========================================
// ALTERAR STATUS
// ========================================

export const statusMedicoSchema =
  z
    .object({

      ativo:
        z.boolean({
          error:
            "O campo ativo deve ser verdadeiro ou falso."
        })

    })
    .strict();
