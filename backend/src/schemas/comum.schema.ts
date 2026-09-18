// ========================================
// SCHEMAS COMPARTILHADOS
// ========================================

import {
  z
} from "zod";


// ========================================
// ID DA URL
// ========================================

export const idParamsSchema =
  z
    .object({
      id:
        z
          .string()
          .regex(
            /^[1-9]\d*$/,
            "O ID deve ser um número inteiro positivo."
          )
    })
    .strict();


// ========================================
// DATA
// ========================================

function dataExisteNoCalendario(
  data: string
) {
  const partes =
    data.split("-");

  if (
    partes.length !== 3
  ) {
    return false;
  }

  const ano =
    Number(partes[0]);

  const mes =
    Number(partes[1]);

  const dia =
    Number(partes[2]);

  const dataCriada =
    new Date(
      Date.UTC(
        ano,
        mes - 1,
        dia
      )
    );

  return (
    dataCriada.getUTCFullYear() === ano &&
    dataCriada.getUTCMonth() === mes - 1 &&
    dataCriada.getUTCDate() === dia
  );
}


export const dataSchema =
  z
    .string({
      error:
        "A data é obrigatória."
    })
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "A data deve estar no formato AAAA-MM-DD."
    )
    .refine(
      dataExisteNoCalendario,
      {
        message:
          "Informe uma data válida."
      }
    );


// ========================================
// HORÁRIO
// ========================================

export const horarioSchema =
  z
    .string({
      error:
        "O horário é obrigatório."
    })
    .regex(
      /^([01]\d|2[0-3]):[0-5]\d$/,
      "O horário deve estar no formato HH:MM."
    );
