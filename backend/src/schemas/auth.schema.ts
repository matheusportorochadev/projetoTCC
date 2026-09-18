// ========================================
// SCHEMAS DE AUTENTICAÇÃO
// ========================================

import {
  z
} from "zod";


// ========================================
// CONFIGURAÇÕES
// ========================================

const TAMANHO_MAXIMO_EMAIL =
  254;

const TAMANHO_MAXIMO_SENHA =
  100;


// ========================================
// E-MAIL
// ========================================

const emailSchema =
  z
    .string({
      error:
        "O e-mail é obrigatório."
    })
    .trim()
    .min(
      1,
      "Informe o e-mail."
    )
    .max(
      TAMANHO_MAXIMO_EMAIL,
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
// SENHA DE LOGIN
// ========================================

const senhaLoginSchema =
  z
    .string({
      error:
        "A senha é obrigatória."
    })
    .min(
      1,
      "Informe a senha."
    )
    .max(
      TAMANHO_MAXIMO_SENHA,
      "Senha inválida."
    );


// ========================================
// NOVA SENHA
// ========================================

const novaSenhaSchema =
  z
    .string({
      error:
        "A nova senha é obrigatória."
    })
    .min(
      8,
      "A senha deve possuir pelo menos 8 caracteres."
    )
    .max(
      TAMANHO_MAXIMO_SENHA,
      "A senha deve possuir no máximo 100 caracteres."
    )
    .regex(
      /[a-z]/,
      "A senha deve conter pelo menos uma letra minúscula."
    )
    .regex(
      /[A-Z]/,
      "A senha deve conter pelo menos uma letra maiúscula."
    )
    .regex(
      /\d/,
      "A senha deve conter pelo menos um número."
    )
    .regex(
      /[^A-Za-z0-9]/,
      "A senha deve conter pelo menos um caractere especial."
    );


// ========================================
// CÓDIGO DE 6 DÍGITOS
// ========================================

const codigoSchema =
  z
    .string({
      error:
        "O código é obrigatório."
    })
    .regex(
      /^\d{6}$/,
      "O código deve possuir exatamente 6 números."
    );


// ========================================
// LOGIN
// ========================================

export const loginSchema =
  z
    .object({

      email:
        emailSchema,

      senha:
        senhaLoginSchema

    })
    .strict();


// ========================================
// ESQUECI MINHA SENHA
// ========================================

export const esqueciSenhaSchema =
  z
    .object({

      email:
        emailSchema

    })
    .strict();


// ========================================
// REDEFINIR SENHA
// ========================================

export const redefinirSenhaSchema =
  z
    .object({

      email:
        emailSchema,

      codigo:
        codigoSchema,

      novaSenha:
        novaSenhaSchema

    })
    .strict();


// ========================================
// SOLICITAR PRIMEIRO ACESSO
// ========================================

export const solicitarPrimeiroAcessoSchema =
  z
    .object({

      email:
        emailSchema

    })
    .strict();


// ========================================
// CONCLUIR PRIMEIRO ACESSO
// ========================================

export const concluirPrimeiroAcessoSchema =
  z
    .object({

      email:
        emailSchema,

      codigo:
        codigoSchema,

      novaSenha:
        novaSenhaSchema,

      confirmarSenha:
        z
          .string({
            error:
              "A confirmação da senha é obrigatória."
          })
          .max(
            TAMANHO_MAXIMO_SENHA,
            "Confirmação de senha inválida."
          )

    })
    .strict()
    .refine(
      (dados) =>
        dados.novaSenha ===
        dados.confirmarSenha,
      {

        message:
          "As senhas informadas não são iguais.",

        path: [
          "confirmarSenha"
        ]

      }
    );
