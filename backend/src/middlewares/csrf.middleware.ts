// ========================================
// PROTEÇÃO CONTRA CSRF
// ========================================

import type {
  RequestHandler
} from "express";


// ========================================
// MÉTODOS SEGUROS
// ========================================

/*
  GET, HEAD e OPTIONS não devem alterar
  dados do sistema.

  Portanto, não precisam passar pela
  validação CSRF de origem.
*/
const METODOS_SEGUROS =
  new Set([
    "GET",
    "HEAD",
    "OPTIONS"
  ]);


// ========================================
// OBTER ORIGENS PERMITIDAS
// ========================================

function obterOrigensPermitidas() {

  /*
    Utilizamos a mesma variável que já
    usamos para definir quais frontends
    podem acessar a API.

    Exemplo:

    FRONTEND_URLS=http://localhost:5173
  */
  const origensConfiguradas =
    process.env.FRONTEND_URLS ||
    "http://localhost:5173";


  const origens =
    origensConfiguradas
      .split(",")
      .map(
        (origem) =>
          origem.trim()
      )
      .filter(Boolean);


  const origensNormalizadas =
    new Set<string>();


  for (
    const origem
    of origens
  ) {

    try {

      const url =
        new URL(
          origem
        );


      origensNormalizadas.add(
        url.origin
      );

    } catch {

      console.error(
        `[CSRF] Origem inválida em FRONTEND_URLS: ${origem}`
      );

    }

  }


  return origensNormalizadas;

}


// ========================================
// ORIGENS PERMITIDAS
// ========================================

const origensPermitidas =
  obterOrigensPermitidas();


// ========================================
// BLOQUEAR REQUISIÇÃO
// ========================================

function bloquearRequisicao(
  motivo: string
) {

  /*
    O motivo fica apenas no log do backend.

    Para o cliente retornamos uma mensagem
    simples para não expor detalhes
    desnecessários da configuração.
  */

  console.warn(
    `[CSRF] Requisição bloqueada: ${motivo}`
  );

}


// ========================================
// MIDDLEWARE CSRF
// ========================================

export const protegerContraCsrf:
  RequestHandler =
  (
    req,
    res,
    next
  ) => {

    // ========================================
    // MÉTODO SEGURO
    // ========================================

    if (
      METODOS_SEGUROS.has(
        req.method
      )
    ) {

      return next();

    }


    // ========================================
    // SEC-FETCH-SITE
    // ========================================

    /*
      Navegadores modernos enviam:

      Sec-Fetch-Site

      Possíveis valores:

      same-origin
      same-site
      cross-site
      none

      Se vier explicitamente como
      cross-site, já podemos bloquear.
    */

    const secFetchSite =
      req.get(
        "sec-fetch-site"
      );


    if (
      secFetchSite ===
      "cross-site"
    ) {

      bloquearRequisicao(
        `Sec-Fetch-Site cross-site | ${req.method} ${req.originalUrl}`
      );


      return res
        .status(403)
        .json({
          mensagem:
            "Origem da requisição não autorizada."
        });

    }


    // ========================================
    // CABEÇALHO ORIGIN
    // ========================================

    const origin =
      req.get(
        "origin"
      );


    /*
      Em requisições que alteram dados,
      exigimos Origin.

      Isso também impede chamadas feitas
      fora do navegador sem informar uma
      origem autorizada.
    */

    if (!origin) {

      bloquearRequisicao(
        `Origin ausente | ${req.method} ${req.originalUrl}`
      );


      return res
        .status(403)
        .json({
          mensagem:
            "Origem da requisição não autorizada."
        });

    }


    // ========================================
    // NORMALIZAR ORIGIN
    // ========================================

    let origemNormalizada:
      string;


    try {

      origemNormalizada =
        new URL(
          origin
        ).origin;

    } catch {

      bloquearRequisicao(
        `Origin inválido: ${origin}`
      );


      return res
        .status(403)
        .json({
          mensagem:
            "Origem da requisição não autorizada."
        });

    }


    // ========================================
    // COMPARAR COM ALLOWLIST
    // ========================================

    if (
      !origensPermitidas.has(
        origemNormalizada
      )
    ) {

      bloquearRequisicao(
        `Origin não permitido: ${origemNormalizada} | ${req.method} ${req.originalUrl}`
      );


      return res
        .status(403)
        .json({
          mensagem:
            "Origem da requisição não autorizada."
        });

    }


    // ========================================
    // APROVADO
    // ========================================

    return next();

  };
