// ========================================
// MIDDLEWARES DE VALIDAÇÃO COM ZOD
// ========================================

import type {
  RequestHandler
} from "express";

import type {
  ZodIssue,
  ZodType
} from "zod";


// ========================================
// FORMATAR ERROS DO ZOD
// ========================================

function formatarErros(
  issues: ZodIssue[]
) {
  return issues.flatMap(
    (erro) => {

      // Campos extras enviados pelo cliente.
      if (
        erro.code ===
        "unrecognized_keys"
      ) {
        return erro.keys.map(
          (campo) => ({
            campo,

            mensagem:
              `Campo não permitido: ${campo}.`
          })
        );
      }

      return [{
        campo:
          erro.path
            .map(String)
            .join("."),

        mensagem:
          erro.message
      }];
    }
  );
}


// ========================================
// VALIDAR BODY
// ========================================

export function validarBody(
  schema: ZodType
): RequestHandler {
  return (
    req,
    res,
    next
  ) => {

    const resultado =
      schema.safeParse(
        req.body
      );

    if (
      !resultado.success
    ) {
      return res
        .status(400)
        .json({
          mensagem:
            "Dados inválidos.",

          erros:
            formatarErros(
              resultado.error.issues
            )
        });
    }

    /*
      Utilizamos o resultado validado.

      Isso também permite que o Zod faça
      transformações controladas, como
      converter duração para número.
    */
    req.body =
      resultado.data;

    return next();
  };
}


// ========================================
// VALIDAR PARÂMETROS DA URL
// ========================================

export function validarParams(
  schema: ZodType
): RequestHandler {
  return (
    req,
    res,
    next
  ) => {

    const resultado =
      schema.safeParse(
        req.params
      );

    if (
      !resultado.success
    ) {
      return res
        .status(400)
        .json({
          mensagem:
            "Parâmetros inválidos.",

          erros:
            formatarErros(
              resultado.error.issues
            )
        });
    }

    /*
      Não substituímos req.params.

      Seus controllers já convertem
      o parâmetro id para Number.
    */

    return next();
  };
}


// ========================================
// VALIDAR QUERY STRING
// ========================================

export function validarQuery(
  schema: ZodType
): RequestHandler {
  return (
    req,
    res,
    next
  ) => {

    const resultado =
      schema.safeParse(
        req.query
      );

    if (
      !resultado.success
    ) {
      return res
        .status(400)
        .json({
          mensagem:
            "Parâmetros de consulta inválidos.",

          erros:
            formatarErros(
              resultado.error.issues
            )
        });
    }

    /*
      Não substituímos req.query.

      Em versões modernas do Express,
      req.query pode ser exposto através
      de getter e não deve ser sobrescrito.
    */

    return next();
  };
}
