
// ========================================
// CONTROLLER DE ACESSO AOS PRONTUÁRIOS
// ========================================
//
// Responsabilidades:
//
// 1. Consultar se a senha já foi criada.
// 2. Cadastrar a senha adicional.
// 3. Verificar a senha do médico.
// 4. Emitir autorização válida por 2 horas.
// 5. Associar essa autorização ao login.
// 6. Incluir a versão atual da credencial.
//
// IMPORTANTE:
//
// O JWT principal continua independente.
// O JWT dos prontuários apenas acrescenta
// uma segunda verificação de segurança.

import type {
  Request,
  Response
} from "express";

import jwt from "jsonwebtoken";

import bcrypt from "bcrypt";

import {
  createHmac
} from "node:crypto";

import {
  db
} from "../prisma/db";

import {
  buscarMedicoPorUsuarioId
} from "../services/paciente.service";

import {
  consultarSituacaoAcessoProntuario,
  cadastrarSenhaProntuario,
  verificarSenhaProntuario
} from "../services/prontuario-acesso.service";


// ========================================
// CONFIGURAÇÕES COMPARTILHADAS
// ========================================

// Cookie usado exclusivamente pela
// autenticação adicional dos prontuários.
export const COOKIE_PRONTUARIO =
  "prontuario_access";

// Nome do cookie da autenticação
// principal do sistema.
export const COOKIE_LOGIN =
  "access_token";

// Validade fixa de duas horas.
const TEMPO_AUTORIZACAO =
  2 * 60 * 60 * 1000;

// Identificadores do token adicional.
const ISSUER =
  "tcc-consultorio-prontuarios";

const AUDIENCE =
  "tcc-consultorio-prontuarios-web";


// ========================================
// SEGREDO DO TOKEN ADICIONAL
// ========================================

// Deriva uma chave específica do JWT_SECRET.
//
// O segredo principal não é transmitido
// ao navegador nem armazenado no JWT.
export function obterSegredoProntuario(): string {

  const segredo =
    process.env.JWT_SECRET;

  if (
    !segredo ||
    segredo.length < 32
  ) {

    throw new Error(
      "Configuração de autenticação indisponível."
    );

  }

  return createHmac(
    "sha256",
    segredo
  )
    .update(
      "tcc-consultorio:prontuarios:v1"
    )
    .digest("hex");
}


// ========================================
// VINCULAR AO LOGIN PRINCIPAL
// ========================================

// Calcula uma impressão criptográfica
// do JWT principal.
//
// Essa impressão será incluída no JWT
// adicional dos prontuários.
//
// Ela NÃO é o token principal em texto
// e não permite reconstruí-lo.
//
// Se o usuário fizer outro login e
// receber um JWT principal diferente,
// a associação deixará de corresponder.
export function criarVinculoSessaoProntuario(
  tokenPrincipal: string
): string {

  return createHmac(
    "sha256",
    obterSegredoProntuario()
  )
    .update(
      "sessao-principal:"
    )
    .update(
      tokenPrincipal
    )
    .digest("hex");
}


// ========================================
// IDENTIFICAR MÉDICO AUTENTICADO
// ========================================

// A identidade vem exclusivamente
// do authMiddleware.
function obterUsuarioId(
  req: Request
): number {

  if (
    !req.usuario ||
    req.usuario.tipo !== "MEDICO"
  ) {

    throw new Error(
      "Médico não autenticado."
    );

  }

  return req.usuario.id;
}


// ========================================
// OBTER JWT PRINCIPAL
// ========================================

// O cookie principal precisa estar
// presente para emitir um token adicional.
//
// Mesmo que o médico informe a senha
// correta, não liberamos prontuários
// sem uma sessão principal válida.
function obterTokenPrincipal(
  req: Request
): string | null {

  const token =
    req.cookies?.[COOKIE_LOGIN];

  if (
    typeof token !== "string" ||
    token.length === 0
  ) {

    return null;
  }

  return token;
}


// ========================================
// CONSULTAR SITUAÇÃO DA SENHA
// ========================================
//
// GET /prontuarios/acesso/situacao
//
// Resposta:
// {
//   senhaCadastrada: boolean
// }

export async function situacaoAcessoProntuarioController(
  req: Request,
  res: Response
) {

  try {

    const usuarioId =
      obterUsuarioId(req);

    const resultado =
      await consultarSituacaoAcessoProntuario(
        usuarioId
      );

    return res
      .status(200)
      .json(resultado);

  } catch (erro) {

    console.error(
      "Erro ao consultar acesso aos prontuários:",
      erro
    );

    return res
      .status(500)
      .json({
        mensagem:
          "Não foi possível consultar o acesso aos prontuários."
      });
  }
}


// ========================================
// CADASTRAR SENHA PELA PRIMEIRA VEZ
// ========================================
//
// POST /prontuarios/acesso/cadastrar
//
// A senha é protegida com bcrypt
// pelo service de acesso.

export async function cadastrarSenhaProntuarioController(
  req: Request,
  res: Response
) {

  try {

    const usuarioId =
      obterUsuarioId(req);

    const {
      senha
    } = req.body;

    const resultado =
      await cadastrarSenhaProntuario(
        usuarioId,
        senha
      );

    return res
      .status(201)
      .json(resultado);

  } catch (erro) {

    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao cadastrar senha.";

    if (
      mensagem ===
      "A senha dos prontuários já foi cadastrada."
    ) {

      return res
        .status(409)
        .json({
          mensagem
        });
    }

    console.error(
      "Erro ao cadastrar senha de prontuários:",
      erro
    );

    return res
      .status(500)
      .json({
        mensagem:
          "Não foi possível cadastrar a senha."
      });
  }
}


// ========================================
// VERIFICAR SENHA E LIBERAR ACESSO
// ========================================
//
// POST /prontuarios/acesso/verificar
//
// Após validar a senha, emite o JWT
// adicional contendo:
//
// - finalidade;
// - versaoAutorizacao;
// - vinculoSessao;
// - ID do médico autenticado;
// - validade de 2 horas.

export async function verificarSenhaProntuarioController(
  req: Request,
  res: Response
) {

  try {

    const usuarioId =
      obterUsuarioId(req);

    const {
      senha
    } = req.body;

    // ========================================
    // 1. CONFERIR SESSÃO PRINCIPAL
    // ========================================

    const tokenPrincipal =
      obterTokenPrincipal(req);

    if (!tokenPrincipal) {

      return res
        .status(401)
        .json({
          mensagem:
            "Sua sessão principal expirou. Entre novamente no sistema."
        });
    }

    // ========================================
    // 2. VERIFICAR SENHA ADICIONAL
    // ========================================

    // Mantém o service de autenticação
    // adicional que já existe no projeto.
    const resultado =
      await verificarSenhaProntuario(
        usuarioId,
        senha
      );

    if (!resultado.autorizado) {

      return res
        .status(401)
        .json({
          mensagem:
            "Senha dos prontuários incorreta."
        });
    }

    // ========================================
    // 3. CONSULTAR CREDENCIAL ATUAL
    // ========================================

    const medico =
      await buscarMedicoPorUsuarioId(
        usuarioId
      );

    const acesso =
      await db.orm.public.AcessoProntuario
        .where({
          medicoId: medico.id
        })
        .first();

    if (!acesso) {

      return res
        .status(403)
        .json({
          mensagem:
            "Acesso aos prontuários não configurado."
        });
    }

    // ========================================
    // 4. REVALIDAR A SENHA ATUAL
    // ========================================

    // Uma redefinição poderia ocorrer
    // durante a primeira verificação.
    //
    // Consultamos o hash atualizado e
    // verificamos novamente antes de
    // emitir a autorização com a versão
    // obtida do mesmo registro.
    const senhaAindaCorreta =
      await bcrypt.compare(
        senha,
        acesso.senhaHash
      );

    if (!senhaAindaCorreta) {

      return res
        .status(401)
        .json({
          mensagem:
            "Senha dos prontuários incorreta."
        });
    }

    // ========================================
    // 5. GERAR VÍNCULO COM O LOGIN
    // ========================================

    const vinculoSessao =
      criarVinculoSessaoProntuario(
        tokenPrincipal
      );

    // ========================================
    // 6. GERAR JWT DOS PRONTUÁRIOS
    // ========================================

    const token =
      jwt.sign(
        {

          finalidade:
            "ACESSO_PRONTUARIO",

          // A versão muda após
          // redefinir a senha.
          versaoAutorizacao:
            acesso.versaoAutorizacao,

          // Vincula o token adicional
          // ao JWT principal atual.
          vinculoSessao

        },

        obterSegredoProntuario(),

        {
          algorithm:
            "HS256",

          subject:
            String(usuarioId),

          issuer:
            ISSUER,

          audience:
            AUDIENCE,

          expiresIn:
            "2h"
        }
      );

    // ========================================
    // 7. CRIAR COOKIE HTTPONLY
    // ========================================

    res.cookie(
      COOKIE_PRONTUARIO,
      token,
      {

        httpOnly:
          true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path:
          "/prontuarios",

        maxAge:
          TEMPO_AUTORIZACAO

      }
    );

    // ========================================
    // 8. CONFIRMAR AUTORIZAÇÃO
    // ========================================

    return res
      .status(200)
      .json({

        autorizado: true,

        mensagem:
          "Acesso aos prontuários autorizado."

      });

  } catch (erro) {

    console.error(
      "Erro ao verificar senha dos prontuários:",
      erro
    );

    return res
      .status(500)
      .json({
        mensagem:
          "Não foi possível verificar a senha."
      });
  }
}
