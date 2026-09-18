// ========================================
// DEPENDÊNCIAS
// ========================================

import type {
  NextFunction,
  Request,
  Response
} from "express";


// ========================================
// TIPO DE USUÁRIO
// ========================================

type TipoUsuario =
  | "ADMIN"
  | "MEDICO"
  | "PACIENTE";


// ========================================
// CONTROLE DE PERFIL
// ========================================

export function permitirPerfis(
  ...perfisPermitidos: TipoUsuario[]
) {

  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {

    // ========================================
    // USUÁRIO AUTENTICADO
    // ========================================

    /*
      Este middleware deve ser executado
      depois do authMiddleware.

      Portanto req.usuario deve existir.
    */
    if (!req.usuario) {

      return res
        .status(401)
        .json({
          mensagem:
            "Usuário não autenticado."
        });

    }


    // ========================================
    // VALIDAR PERFIL
    // ========================================

    /*
      req.usuario.tipo agora veio
      do banco através do authMiddleware,
      e não simplesmente do JWT.
    */
    if (
      !perfisPermitidos.includes(
        req.usuario.tipo
      )
    ) {

      return res
        .status(403)
        .json({
          mensagem:
            "Acesso não autorizado."
        });

    }


    // ========================================
    // ACESSO AUTORIZADO
    // ========================================

    return next();
  };
}