
// ========================================
// SCHEMAS DE RECUPERAÇÃO DOS PRONTUÁRIOS
// ========================================

import { z } from "zod";


// ========================================
// CÓDIGO DE VERIFICAÇÃO
// ========================================

// Exige exatamente 6 números.
const codigoSchema = z
  .string({
    error: "O código é obrigatório."
  })
  .regex(
    /^\d{6}$/,
    "O código deve possuir exatamente 6 números."
  );


// ========================================
// NOVA SENHA DOS PRONTUÁRIOS
// ========================================

// Mantém os requisitos de segurança
// utilizados no cadastro original.
const novaSenhaSchema = z
  .string({
    error: "A nova senha é obrigatória."
  })
  .min(
    8,
    "A senha deve possuir pelo menos 8 caracteres."
  )
  .max(
    100,
    "A senha deve possuir no máximo 100 caracteres."
  )
  .regex(
    /[a-z]/,
    "A senha deve conter uma letra minúscula."
  )
  .regex(
    /[A-Z]/,
    "A senha deve conter uma letra maiúscula."
  )
  .regex(
    /\d/,
    "A senha deve conter um número."
  )
  .regex(
    /[^A-Za-z0-9]/,
    "A senha deve conter um caractere especial."
  );


// ========================================
// SOLICITAR CÓDIGO
// ========================================

// Não recebe e-mail no body.
//
// O backend identifica o médico
// através do JWT de login e utiliza
// o e-mail registrado no banco.
//
// O objeto strict rejeita campos extras.
export const solicitarRecuperacaoProntuarioSchema =
  z.object({}).strict();


// ========================================
// REDEFINIR SENHA COM CÓDIGO
// ========================================

// O médico informa:
//
// - código recebido por e-mail;
// - nova senha;
// - confirmação da nova senha.
export const concluirRecuperacaoProntuarioSchema = z
  .object({

    codigo: codigoSchema,

    novaSenha: novaSenhaSchema,

    confirmarSenha: z
      .string({
        error:
          "A confirmação da senha é obrigatória."
      })
      .max(
        100,
        "Confirmação de senha inválida."
      )

  })
  .strict()
  .refine(
    (dados) =>
      dados.novaSenha === dados.confirmarSenha,
    {
      message: "As senhas não coincidem.",
      path: ["confirmarSenha"]
    }
  );
