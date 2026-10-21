
// ========================================
// SCHEMAS DE ACESSO AOS PRONTUÁRIOS
// ========================================

// Zod será responsável por validar
// os dados enviados pelo frontend.
import { z } from "zod";


// ========================================
// POLÍTICA DE SENHA
// ========================================

// A senha adicional terá os mesmos
// requisitos básicos de segurança
// utilizados nas senhas do sistema.
const senhaProntuarioSchema = z
  .string({
    error: "A senha é obrigatória."
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
// CADASTRAR SENHA
// ========================================

// Utilizado somente quando o médico
// ainda não possui senha de prontuários.
//
// O frontend enviará:
// senha
// confirmarSenha
//
// Campos extras serão rejeitados.
export const cadastrarSenhaProntuarioSchema = z
  .object({

    senha: senhaProntuarioSchema,

    confirmarSenha: z.string({
      error: "Confirme a senha."
    })

  })
  .strict()
  .refine(
    (dados) =>
      dados.senha === dados.confirmarSenha,
    {
      message: "As senhas não coincidem.",
      path: ["confirmarSenha"]
    }
  );


// ========================================
// VALIDAR SENHA EXISTENTE
// ========================================

// Utilizado quando o médico já
// cadastrou sua senha adicional.
//
// Não exigimos novamente toda a
// política de complexidade durante
// a verificação de uma senha existente.
export const verificarSenhaProntuarioSchema = z
  .object({

    senha: z
      .string({
        error: "A senha é obrigatória."
      })
      .min(
        1,
        "Informe sua senha."
      )
      .max(
        100,
        "Senha inválida."
      )

  })
  .strict();
