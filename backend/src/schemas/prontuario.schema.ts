
// ========================================
// SCHEMAS DOS PRONTUÁRIOS MÉDICOS
// ========================================

// Responsáveis por validar os dados
// enviados pelo frontend.
//
// Os schemas impedem que o cliente envie
// campos não autorizados, como:
//
// - medicoId;
// - createdAt;
// - id do registro;
//
// Esses valores devem ser controlados
// exclusivamente pelo backend.

import { z } from "zod";


// ========================================
// IDENTIFICADOR DO PACIENTE
// ========================================

// O ID precisa representar um número
// inteiro positivo.
//
// A autorização de acesso será feita
// pelo service, consultando no banco
// se o paciente pertence ao médico.
export const pacienteIdProntuarioSchema = z
  .coerce
  .number<number>()
  .int(
    "Identificador do paciente inválido."
  )
  .positive(
    "Identificador do paciente inválido."
  )
  .safe(
    "Identificador do paciente inválido."
  );


// ========================================
// IDENTIFICADOR DO PRONTUÁRIO
// ========================================

export const prontuarioIdSchema = z
  .coerce
  .number<number>()
  .int(
    "Identificador do prontuário inválido."
  )
  .positive(
    "Identificador do prontuário inválido."
  )
  .safe(
    "Identificador do prontuário inválido."
  );


// ========================================
// CAMPOS DE TEXTO CLÍNICO
// ========================================

// Os campos de prontuário podem conter
// descrições clínicas extensas.
//
// Não restringimos caracteres especiais
// necessários à escrita médica.
//
// Strings vazias são convertidas para null.
const campoClinicoSchema = z
  .string()
  .max(
    10000,
    "O campo ultrapassou o limite de 10.000 caracteres."
  )
  .nullable()
  .optional()
  .transform(
    (valor) => {
      if (valor === undefined || valor === null) {
        return null;
      }

      const texto = valor.trim();

      return texto.length > 0 ? texto : null;
    }
  );


// ========================================
// NOVO PRONTUÁRIO
// ========================================

// Este schema valida somente os dados
// clínicos recebidos do formulário.
//
// pacienteId será informado na URL
// do endpoint, e não no corpo.
//
// medicoId virá da autenticação.
//
// createdAt será gerado pelo banco.
export const criarProntuarioSchema = z
  .object({

    // ANAMNESE
    queixaPrincipal:
      campoClinicoSchema,

    historiaMolestiaAtual:
      campoClinicoSchema,

    // HISTÓRIA PATOLÓGICA PREGRESSA
    historiaPatologicaPregressa:
      campoClinicoSchema,

    // EXAME FÍSICO
    exameFisico:
      campoClinicoSchema,

    // EXAMES COMPLEMENTARES
    examesComplementares:
      campoClinicoSchema,

    // CONDUTA
    conduta:
      campoClinicoSchema,

    // Identifica o registro anterior
    // utilizado como referência.
    //
    // O service verificará se pertence
    // ao mesmo médico e paciente.
    prontuarioAnteriorId: z
      .number()
      .int()
      .positive()
      .safe()
      .nullable()
      .optional()

  })
  .strict()
  .refine(
    (dados) => {

      // Impede salvar um registro
      // inteiramente vazio.
      return [
        dados.queixaPrincipal,
        dados.historiaMolestiaAtual,
        dados.historiaPatologicaPregressa,
        dados.exameFisico,
        dados.examesComplementares,
        dados.conduta
      ].some(
        (valor) =>
          typeof valor === "string" &&
          valor.length > 0
      );

    },
    {
      message:
        "Preencha pelo menos uma informação clínica antes de salvar."
    }
  );


// ========================================
// TIPOS TYPESCRIPT
// ========================================

// Tipo dos dados após a validação Zod.
//
// Podemos utilizá-lo no service sem
// duplicar manualmente os campos.
export type CriarProntuarioDTO =
  z.output<typeof criarProntuarioSchema>;
