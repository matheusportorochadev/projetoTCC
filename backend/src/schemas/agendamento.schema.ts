// ========================================
// SCHEMAS DE AGENDAMENTOS
// ========================================

import {
  z
} from "zod";

import {
  dataSchema,
  horarioSchema
} from "./comum.schema";


// ========================================
// QUERY — HORÁRIOS DISPONÍVEIS
// ========================================
//
// Exemplo:
//
// ?data=2026-09-20

export const horariosDisponiveisQuerySchema =
  z
    .object({
      data:
        dataSchema
    })
    .strict();


// ========================================
// PACIENTE — CRIAR AGENDAMENTO
// ========================================
//
// O paciente informa somente:
//
// data
// horaInicio
//
// medicoId e pacienteId NÃO vêm
// do frontend.

export const criarAgendamentoPacienteSchema =
  z
    .object({
      data:
        dataSchema,

      horaInicio:
        horarioSchema
    })
    .strict();


// ========================================
// PACIENTE — SOLICITAR REMARCAÇÃO
// ========================================

export const solicitarRemarcacaoSchema =
  z
    .object({
      data:
        dataSchema,

      horaInicio:
        horarioSchema
    })
    .strict();


// ========================================
// MÉDICO — REMARCAR CONSULTA
// ========================================

export const remarcarAgendamentoMedicoSchema =
  z
    .object({
      data:
        dataSchema,

      horaInicio:
        horarioSchema
    })
    .strict();


// ========================================
// MÉDICO — CRIAR CONSULTA
// ========================================

export const criarAgendamentoMedicoSchema =
  z
    .object({
      pacienteId:
        z
          .number({
            error:
              "O paciente é obrigatório."
          })
          .int(
            "Paciente inválido."
          )
          .positive(
            "Paciente inválido."
          ),

      data:
        dataSchema,

      horaInicio:
        horarioSchema,

      duracaoConsulta:
        z
          .number({
            error:
              "A duração da consulta é obrigatória."
          })
          .int(
            "A duração da consulta deve ser um número inteiro."
          )
          .positive(
            "A duração da consulta deve ser maior que zero."
          )
    })
    .strict();
