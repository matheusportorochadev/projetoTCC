// ========================================
// SCHEMAS DA AGENDA
// ========================================

import {
  z
} from "zod";

import {
  dataSchema,
  horarioSchema
} from "./comum.schema";


// ========================================
// DURAÇÃO
// ========================================

const duracaoConsultaSchema =
  z.coerce
    .number({
      error:
        "A duração da consulta é obrigatória."
    })
    .int(
      "A duração da consulta deve ser um número inteiro."
    )
    .positive(
      "A duração da consulta deve ser maior que zero."
    );


// ========================================
// CRIAR DISPONIBILIDADES
// ========================================

export const criarDisponibilidadeSchema =
  z
    .object({
      datas:
        z
          .array(
            dataSchema,
            {
              error:
                "As datas são obrigatórias."
            }
          )
          .min(
            1,
            "Selecione pelo menos uma data."
          ),

      horaInicio:
        horarioSchema,

      horaFim:
        horarioSchema,

      duracaoConsulta:
        duracaoConsultaSchema
    })
    .strict()
    .refine(
      (dados) =>
        dados.horaInicio <
        dados.horaFim,
      {
        message:
          "O horário final deve ser maior que o horário inicial.",

        path: [
          "horaFim"
        ]
      }
    );


// ========================================
// EDITAR DISPONIBILIDADE
// ========================================

export const editarDisponibilidadeSchema =
  z
    .object({
      data:
        dataSchema,

      horaInicio:
        horarioSchema,

      horaFim:
        horarioSchema,

      duracaoConsulta:
        duracaoConsultaSchema
    })
    .strict()
    .refine(
      (dados) =>
        dados.horaInicio <
        dados.horaFim,
      {
        message:
          "O horário final deve ser maior que o horário inicial.",

        path: [
          "horaFim"
        ]
      }
    );
