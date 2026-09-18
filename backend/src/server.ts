// ========================================
// CONFIGURAÇÃO PRINCIPAL DO SERVIDOR
// ========================================

import express from "express";

import type {
  ErrorRequestHandler
} from "express";

import cors from "cors";

import helmet from "helmet";

import cookieParser from "cookie-parser";


// ========================================
// ROTAS
// ========================================

import primeiroAcessoRoutes
  from "./routes/primeiroAcesso.routes";

import authRoutes
  from "./routes/auth.routes";

import medicoRoutes
  from "./routes/medico.routes";

import pacienteRoutes
  from "./routes/paciente.routes";

import agendaRoutes
  from "./routes/agenda.routes";

import agendamentoRoutes
  from "./routes/agendamento.routes";


// ========================================
// MIDDLEWARES
// ========================================

import {
  authMiddleware
} from "./middlewares/auth.middleware";

import {
  permitirPerfis
} from "./middlewares/role.middleware";

import {
  protegerContraCsrf
} from "./middlewares/csrf.middleware";


// ========================================
// APLICAÇÃO EXPRESS
// ========================================

const app =
  express();


// ========================================
// REMOVER IDENTIFICAÇÃO DO EXPRESS
// ========================================

app.disable(
  "x-powered-by"
);


// ========================================
// HELMET
// ========================================

/*
  O Helmet adiciona cabeçalhos HTTP
  importantes de segurança.

  Entre eles:

  - Content Security Policy;
  - proteção contra MIME sniffing;
  - proteção contra iframe;
  - políticas de segurança do navegador.
*/

app.use(
  helmet()
);


// ========================================
// ORIGENS PERMITIDAS
// ========================================

/*
  As origens autorizadas são carregadas
  através da variável FRONTEND_URLS.

  Exemplo:

  FRONTEND_URLS=http://localhost:5173

  Também podemos utilizar várias origens:

  FRONTEND_URLS=http://localhost:5173,http://192.168.1.10:5173
*/

const origensPermitidas =
  (
    process.env.FRONTEND_URLS ||
    "http://localhost:5173"
  )
    .split(",")
    .map(
      (origem) =>
        origem.trim()
    )
    .filter(
      Boolean
    );


// ========================================
// CORS
// ========================================

app.use(
  cors({

    // ========================================
    // VALIDAR ORIGEM
    // ========================================

    origin: (
      origin,
      callback
    ) => {

      /*
        Algumas ferramentas como curl
        e Postman podem não enviar Origin.

        Permitimos que o CORS continue.

        Porém requisições que alteram dados
        serão posteriormente verificadas
        pelo middleware de CSRF.
      */

      if (!origin) {

        return callback(
          null,
          true
        );

      }


      // ========================================
      // ORIGEM AUTORIZADA
      // ========================================

      if (
        origensPermitidas.includes(
          origin
        )
      ) {

        return callback(
          null,
          true
        );

      }


      // ========================================
      // ORIGEM NÃO AUTORIZADA
      // ========================================

      /*
        Criamos um erro específico.

        Esse erro será tratado mais abaixo
        pelo tratamentoGlobalErros.

        Assim não retornamos stack trace
        nem resposta HTML.
      */

      return callback(
        new Error(
          "Origem não permitida pelo CORS."
        )
      );

    },


    // ========================================
    // MÉTODOS PERMITIDOS
    // ========================================

    methods: [

      "GET",

      "POST",

      "PUT",

      "PATCH",

      "DELETE",

      "OPTIONS"

    ],


    // ========================================
    // CABEÇALHOS PERMITIDOS
    // ========================================

    allowedHeaders: [

      "Content-Type"

    ],


    // ========================================
    // COOKIES
    // ========================================

    /*
      Necessário porque o JWT da aplicação
      é enviado através de cookie HttpOnly.
    */

    credentials:
      true

  })
);


// ========================================
// COOKIE PARSER
// ========================================

/*
  Transforma:

  Cookie: access_token=...

  em:

  req.cookies.access_token
*/

app.use(
  cookieParser()
);


// ========================================
// JSON
// ========================================

/*
  Limita o tamanho máximo do JSON recebido.

  Isso reduz abuso através de requisições
  com payloads excessivamente grandes.
*/

app.use(
  express.json({

    limit:
      "10kb"

  })
);


// ========================================
// PROTEÇÃO CONTRA CSRF
// ========================================

/*
  O middleware de CSRF verifica
  requisições que alteram dados:

  POST
  PUT
  PATCH
  DELETE

  Ele valida o cabeçalho Origin contra
  FRONTEND_URLS.

  Métodos seguros como GET, HEAD e OPTIONS
  continuam normalmente.

  IMPORTANTE:

  Este middleware precisa ficar antes
  das rotas.
*/

app.use(
  protegerContraCsrf
);


// ========================================
// ROTAS DE AUTENTICAÇÃO
// ========================================

app.use(
  "/auth",
  authRoutes
);


// ========================================
// PRIMEIRO ACESSO
// ========================================

app.use(
  "/auth/primeiro-acesso",
  primeiroAcessoRoutes
);


// ========================================
// MÉDICOS
// ========================================

app.use(
  "/medicos",
  medicoRoutes
);


// ========================================
// PACIENTES
// ========================================

app.use(
  "/pacientes",
  pacienteRoutes
);


// ========================================
// AGENDA
// ========================================

app.use(
  "/agenda",
  agendaRoutes
);


// ========================================
// AGENDAMENTOS
// ========================================

app.use(
  "/agendamentos",
  agendamentoRoutes
);


// ========================================
// PERFIL
// ========================================

app.get(
  "/perfil",

  authMiddleware,

  (
    req,
    res
  ) => {

    return res.json({

      mensagem:
        "Usuário autenticado.",

      usuario:
        req.usuario

    });

  }
);


// ========================================
// ADMIN
// ========================================

app.get(
  "/admin",

  authMiddleware,

  permitirPerfis(
    "ADMIN"
  ),

  (
    req,
    res
  ) => {

    return res.json({

      mensagem:
        "Acesso de administrador autorizado."

    });

  }
);


// ========================================
// TESTE DA API
// ========================================

app.get(
  "/",

  (
    req,
    res
  ) => {

    return res.json({

      message:
        "API do sistema médico funcionando"

    });

  }
);


// ========================================
// TRATAMENTO GLOBAL DE ERROS
// ========================================

/*
  Este middleware precisa ficar:

  - depois de todas as rotas;
  - antes do app.listen.

  Ele recebe erros não tratados
  anteriormente.
*/

const tratamentoGlobalErros:
  ErrorRequestHandler =
  (
    erro,
    req,
    res,
    next
  ) => {

    /*
      O parâmetro next faz parte da
      assinatura obrigatória de um
      middleware de erro do Express.

      Mesmo não sendo usado diretamente,
      ele precisa existir para que o
      Express reconheça este middleware
      como tratador de erros.
    */

    void next;


    // ========================================
    // ERRO DE CORS
    // ========================================

    if (
      erro instanceof Error &&
      erro.message ===
        "Origem não permitida pelo CORS."
    ) {

      console.warn(

        `[CORS] Origem bloqueada: ${
          req.get(
            "origin"
          ) ||
          "não informada"
        }`

      );


      return res
        .status(403)
        .json({

          mensagem:
            "Origem da requisição não autorizada."

        });

    }


    // ========================================
    // OUTROS ERROS
    // ========================================

    /*
      O erro completo fica somente
      no terminal do servidor.

      O frontend recebe apenas uma
      mensagem genérica.

      Isso evita expor:

      - caminho de arquivos;
      - estrutura interna;
      - stack trace;
      - detalhes do servidor.
    */

    console.error(
      "[SERVIDOR] Erro não tratado:",
      erro
    );


    return res
      .status(500)
      .json({

        mensagem:
          "Erro interno do servidor."

      });

  };


// ========================================
// REGISTRAR TRATAMENTO DE ERROS
// ========================================

app.use(
  tratamentoGlobalErros
);


// ========================================
// PORTA
// ========================================

const PORT =
  Number(
    process.env.PORT
  ) ||
  3000;


// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(
  PORT,

  () => {

    console.log(
      `Servidor rodando na porta ${PORT}`
    );


    console.log(
      "Origens permitidas pelo CORS:",
      origensPermitidas
    );


    console.log(
      "Proteção CSRF por Origin ativada."
    );

  }
);