// ========================================
// SCHEMAS DE PACIENTE
// ========================================

import {
  z
} from "zod";


// ========================================
// NOME
// ========================================

const nomePacienteSchema =
  z
    .string({
      error:
        "O nome é obrigatório."
    })
    .trim()
    .min(
      2,
      "O nome deve possuir pelo menos 2 caracteres."
    )
    .max(
      120,
      "O nome deve possuir no máximo 120 caracteres."
    );


// ========================================
// E-MAIL OPCIONAL
// ========================================

const emailPacienteSchema =
  z
    .union([

      z
        .string()
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
        ),

      z.literal("")

    ])
    .optional()
    .transform(
      (email) =>
        email === ""
          ? undefined
          : email
    );


// ========================================
// TELEFONE OPCIONAL
// ========================================

/*
  Aceitamos formatos comuns:

  (34) 99999-9999
  34999999999
  +55 34 99999-9999

  A validação é propositalmente flexível.
*/

const telefonePacienteSchema =
  z
    .union([

      z
        .string()
        .trim()
        .min(
          8,
          "Informe um telefone válido."
        )
        .max(
          25,
          "Telefone muito longo."
        )
        .regex(
          /^[0-9+\-()\s]+$/,
          "O telefone possui caracteres inválidos."
        ),

      z.literal("")

    ])
    .optional()
    .transform(
      (telefone) =>
        telefone === ""
          ? undefined
          : telefone
    );


// ========================================
// CPF OPCIONAL
// ========================================

/*
  Aceita:

  12345678901

  ou:

  123.456.789-01

  Neste momento validamos estrutura e
  quantidade de dígitos.

  A validação matemática do CPF pode ser
  adicionada posteriormente se desejarmos.
*/

const cpfPacienteSchema =
  z
    .union([

      z
        .string()
        .trim()
        .refine(
          (cpf) => {

            const somenteNumeros =
              cpf.replace(
                /\D/g,
                ""
              );


            return (
              somenteNumeros.length ===
              11
            );

          },
          {
            message:
              "O CPF deve possuir 11 números."
          }
        )
        .refine(
          (cpf) =>
            /^[0-9.\-\s]+$/.test(
              cpf
            ),
          {
            message:
              "O CPF possui caracteres inválidos."
          }
        ),

      z.literal("")

    ])
    .optional()
    .transform(
      (cpf) =>
        cpf === ""
          ? undefined
          : cpf
    );


// ========================================
// CRIAR PACIENTE
// ========================================

export const criarPacienteSchema =
  z
    .object({

      nome:
        nomePacienteSchema,

      email:
        emailPacienteSchema,

      telefone:
        telefonePacienteSchema,

      cpf:
        cpfPacienteSchema

    })
    .strict();


// ========================================
// ATUALIZAR PACIENTE
// ========================================

export const atualizarPacienteSchema =
  z
    .object({

      nome:
        nomePacienteSchema
          .optional(),

      email:
        emailPacienteSchema,

      telefone:
        telefonePacienteSchema,

      cpf:
        cpfPacienteSchema

    })
    .strict()
    .refine(
      (dados) => {

        return (
          dados.nome !== undefined ||
          dados.email !== undefined ||
          dados.telefone !== undefined ||
          dados.cpf !== undefined
        );

      },
      {
        message:
          "Informe pelo menos um campo para atualizar."
      }
    );


// ========================================
// STATUS DO PACIENTE
// ========================================

export const statusPacienteSchema =
  z
    .object({

      ativo:
        z.boolean({
          error:
            "O campo ativo deve ser verdadeiro ou falso."
        })

    })
    .strict();


// ========================================
// ACESSO DO PACIENTE
// ========================================

export const acessoPacienteSchema =
  z
    .object({

      acessoLiberado:
        z.boolean({
          error:
            "O campo acessoLiberado deve ser verdadeiro ou falso."
        })

    })
    .strict();
