
// ========================================
// MIDDLEWARE DE ACESSO AOS PRONTUÁRIOS
// ========================================
//
// Protege informações clínicas.
//
// Para liberar uma requisição, exige:
//
// 1. Médico autenticado.
// 2. JWT adicional presente.
// 3. Assinatura e expiração válidas.
// 4. Finalidade correta.
// 5. Mesmo usuário do login.
// 6. Associação com o JWT principal.
// 7. Credencial existente no banco.
// 8. Versão de autorização atual.
//
// O prazo máximo permanece em 2 horas.

import type {
  Request,
  Response,
  NextFunction
} from "express";

import jwt from "jsonwebtoken";

import {
  timingSafeEqual
} from "node:crypto";

import {
  db
} from "../prisma/db";

import {
  COOKIE_PRONTUARIO,
  COOKIE_LOGIN,
  obterSegredoProntuario,
  criarVinculoSessaoProntuario
} from "../controllers/prontuario-acesso.controller";

import {
  buscarMedicoPorUsuarioId
} from "../services/paciente.service";


// ========================================
// IDENTIFICAÇÃO DO JWT ADICIONAL
// ========================================

// Estes valores precisam ser iguais
// aos definidos no controller.
const ISSUER =
  "tcc-consultorio-prontuarios";

const AUDIENCE =
  "tcc-consultorio-prontuarios-web";


// ========================================
// FORMATO ESPERADO DO TOKEN
// ========================================

interface TokenProntuarioPayload
  extends jwt.JwtPayload {

  finalidade?: string;

  versaoAutorizacao?: number;

  vinculoSessao?: string;
}


// ========================================
// COMPARAR VÍNCULOS CRIPTOGRÁFICOS
// ========================================

// Utilizamos timingSafeEqual para
// comparar as impressões HMAC.
//
// Se um token for adulterado, o próprio
// jwt.verify já rejeitará sua assinatura.
function compararVinculos(
  vinculoRecebido: string,
  vinculoEsperado: string
): boolean {

  // HMAC SHA-256 no formato hexadecimal.
  const formatoHash =
    /^[a-f0-9]{64}$/;

  if (
    !formatoHash.test(vinculoRecebido) ||
    !formatoHash.test(vinculoEsperado)
  ) {

    return false;
  }

  const recebido =
    Buffer.from(
      vinculoRecebido,
      "hex"
    );

  const esperado =
    Buffer.from(
      vinculoEsperado,
      "hex"
    );

  return timingSafeEqual(
    recebido,
    esperado
  );
}


// ========================================
// VALIDAR AUTORIZAÇÃO DOS PRONTUÁRIOS
// ========================================

export async function protegerProntuarios(
  req: Request,
  res: Response,
  next: NextFunction
) {

  // ========================================
  // 1. VERIFICAR PERFIL DO USUÁRIO
  // ========================================

  // O authMiddleware e permitirPerfis
  // devem executar antes deste middleware.
  if (
    !req.usuario ||
    req.usuario.tipo !== "MEDICO"
  ) {

    return res.status(403).json({
      mensagem:
        "Acesso permitido somente para médicos."
    });
  }

  const usuarioIdAutenticado =
    req.usuario.id;


  // ========================================
  // 2. CONFERIR OS DOIS COOKIES
  // ========================================

  const tokenAdicional =
    req.cookies?.[COOKIE_PRONTUARIO];

  const tokenPrincipal =
    req.cookies?.[COOKIE_LOGIN];

  if (
    typeof tokenPrincipal !== "string" ||
    !tokenPrincipal
  ) {

    return res.status(401).json({
      mensagem:
        "Sua sessão principal expirou. Entre novamente no sistema."
    });
  }

  if (
    typeof tokenAdicional !== "string" ||
    !tokenAdicional
  ) {

    return res.status(403).json({
      mensagem:
        "Informe a senha para acessar os prontuários."
    });
  }


  // ========================================
  // 3. VERIFICAR ASSINATURA DO JWT
  // ========================================

  let payload: TokenProntuarioPayload;

  try {

    const resultado =
      jwt.verify(
        tokenAdicional,
        obterSegredoProntuario(),
        {

          algorithms:
            ["HS256"],

          issuer:
            ISSUER,

          audience:
            AUDIENCE

        }
      );

    if (
      typeof resultado === "string"
    ) {

      return res.status(403).json({
        mensagem:
          "Autorização dos prontuários inválida."
      });
    }

    payload =
      resultado as TokenProntuarioPayload;

  } catch {

    return res.status(403).json({
      mensagem:
        "A autorização dos prontuários expirou ou é inválida."
    });
  }


  // ========================================
  // 4. VERIFICAR FINALIDADE
  // ========================================

  if (
    payload.finalidade !==
    "ACESSO_PRONTUARIO"
  ) {

    return res.status(403).json({
      mensagem:
        "Autorização dos prontuários inválida."
    });
  }


  // ========================================
  // 5. VERIFICAR IDENTIDADE
  // ========================================

  const usuarioIdToken =
    Number(payload.sub);

  if (
    !Number.isSafeInteger(
      usuarioIdToken
    ) ||
    usuarioIdToken <= 0 ||
    usuarioIdToken !==
      usuarioIdAutenticado
  ) {

    return res.status(403).json({
      mensagem:
        "Autorização não pertence ao médico autenticado."
    });
  }


  // ========================================
  // 6. VERIFICAR VÍNCULO COM O LOGIN
  // ========================================

  if (
    typeof payload.vinculoSessao !==
    "string"
  ) {

    return res.status(403).json({
      mensagem:
        "Autorização dos prontuários inválida."
    });
  }

  const vinculoEsperado =
    criarVinculoSessaoProntuario(
      tokenPrincipal
    );

  if (
    !compararVinculos(
      payload.vinculoSessao,
      vinculoEsperado
    )
  ) {

    return res.status(403).json({
      mensagem:
        "A autorização dos prontuários não corresponde à sessão atual."
    });
  }


  // ========================================
  // 7. VALIDAR FORMATO DA VERSÃO
  // ========================================

  if (
    typeof payload.versaoAutorizacao !==
      "number" ||
    !Number.isSafeInteger(
      payload.versaoAutorizacao
    ) ||
    payload.versaoAutorizacao < 0
  ) {

    return res.status(403).json({
      mensagem:
        "Autorização dos prontuários inválida."
    });
  }


  // ========================================
  // 8. CONSULTAR CREDENCIAL NO BANCO
  // ========================================

  try {

    const medico =
      await buscarMedicoPorUsuarioId(
        usuarioIdAutenticado
      );

    const acesso =
      await db.orm.public.AcessoProntuario
        .where({
          medicoId: medico.id
        })
        .first();

    if (!acesso) {

      return res.status(403).json({
        mensagem:
          "Acesso aos prontuários não configurado."
      });
    }


    // ========================================
    // 9. COMPARAR VERSÃO
    // ========================================

    // Quando a senha é redefinida,
    // o service incrementa essa versão.
    //
    // Tokens anteriores permanecem
    // assinados, mas deixam de ser aceitos.
    if (
      payload.versaoAutorizacao !==
      acesso.versaoAutorizacao
    ) {

      return res.status(403).json({
        mensagem:
          "Sua autorização dos prontuários foi invalidada. Informe a senha novamente."
      });
    }


    // ========================================
    // 10. AUTORIZAÇÃO CONFIRMADA
    // ========================================

    // Somente agora as próximas rotas
    // poderão acessar dados clínicos.
    return next();

  } catch (erro) {

    console.error(
      "Erro ao verificar autorização dos prontuários:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Erro interno ao validar acesso aos prontuários."
    });
  }
}
