
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
 // ROTAS EXISTENTES
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
 // AUDITORIA ADMINISTRATIVA
 // ========================================

 // Rotas exclusivas do administrador
 // para consulta dos logs de auditoria.
 //
 // A rota permite consultar informações
 // sobre as operações realizadas pelos
 // médicos, mas nunca os dados clínicos
 // armazenados nos prontuários.

 import auditoriaAdminRoutes
   from "./routes/auditoria-admin.routes";


 // ========================================
 // ACESSO E RECUPERAÇÃO DOS PRONTUÁRIOS
 // ========================================

 // Responsável por:
 //
 // - verificar se o médico possui senha;
 // - cadastrar senha adicional;
 // - desbloquear os prontuários;
 // - validar a autorização de 2 horas;
 // - solicitar código de recuperação;
 // - redefinir senha adicional.
 //
 // Este grupo não disponibiliza
 // diretamente dados clínicos.

 import prontuarioAcessoRoutes
   from "./routes/prontuario-acesso.routes";


 // ========================================
 // ROTAS CLÍNICAS DOS PRONTUÁRIOS
 // ========================================

 // Responsáveis por:
 //
 // - listar pacientes do médico;
 // - consultar histórico clínico;
 // - consultar prontuário individual;
 // - criar um novo prontuário.
 //
 // Essas rotas exigem a autenticação
 // principal E a autorização adicional.

 import prontuarioRoutes
   from "./routes/prontuario.routes";


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

 const app = express();


 // ========================================
 // REMOVER IDENTIFICAÇÃO DO EXPRESS
 // ========================================

 // Evita enviar o cabeçalho
 // X-Powered-By nas respostas.

 app.disable("x-powered-by");


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
       (origem) => origem.trim()
     )
     .filter(Boolean);


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
         Algumas ferramentas, como curl
         e Postman, podem não enviar Origin.

         Permitimos que a requisição
         continue nessa situação.

         As requisições que alteram dados
         continuam sujeitas à proteção
         CSRF configurada abaixo.
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
         origensPermitidas.includes(origin)
       ) {

         return callback(
           null,
           true
         );

       }


       // ========================================
       // ORIGEM NÃO AUTORIZADA
       // ========================================

       // O erro será tratado pelo
       // middleware global no final.

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

     // Necessário para o navegador enviar
     // os cookies HttpOnly nas requisições.

     credentials: true

   })
 );


 // ========================================
 // COOKIE PARSER
 // ========================================

 /*
   Disponibiliza os cookies em req.cookies.

   Exemplos:

   req.cookies.access_token

   req.cookies.prontuario_access
 */

 app.use(
   cookieParser()
 );


 // ========================================
 // JSON
 // ========================================

 /*
   Limita o tamanho máximo do corpo
   das requisições recebidas.

   Mantemos o limite original de 10kb.

   Os campos dos prontuários deverão
   respeitar também esse limite total.
 */

 app.use(
   express.json({
     limit: "10kb"
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
   as origens configuradas no servidor.

   Métodos seguros como GET, HEAD e OPTIONS
   continuam normalmente.

   IMPORTANTE:

   Este middleware deve permanecer
   antes de todas as rotas.
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
 // ACESSO AOS PRONTUÁRIOS
 // ========================================

 /*
   Endpoints deste grupo:

   GET /prontuarios/acesso/situacao

   POST /prontuarios/acesso/cadastrar

   POST /prontuarios/acesso/verificar

   GET /prontuarios/acesso/sessao

   POST
   /prontuarios/acesso/recuperacao/solicitar

   POST
   /prontuarios/acesso/recuperacao/concluir

   O router já aplica:

   - authMiddleware;
   - permitirPerfis("MEDICO");
   - validação Zod;
   - rate limiting nas operações sensíveis.

   A proteção CSRF global permanece ativa.
 */

 app.use(
   "/prontuarios/acesso",
   prontuarioAcessoRoutes
 );


 // ========================================
 // PRONTUÁRIOS CLÍNICOS
 // ========================================

 /*
   Endpoints deste grupo:

   GET
   /prontuarios/clinicos/pacientes

   Lista os pacientes ativos pertencentes
   ao médico autenticado.


   GET
   /prontuarios/clinicos/pacientes/:pacienteId

   Consulta todos os registros clínicos
   de um paciente.


   GET
   /prontuarios/clinicos/pacientes/:pacienteId/:prontuarioId

   Consulta um prontuário específico.


   POST
   /prontuarios/clinicos/pacientes/:pacienteId

   Cadastra um novo registro clínico.


   SEGURANÇA:

   O router aplica, nesta ordem:

   1. authMiddleware;
   2. permitirPerfis("MEDICO");
   3. protegerProntuarios.

   O último middleware verifica:

   - JWT adicional;
   - validade de 2 horas;
   - vínculo com o login principal;
   - versão atual da autorização.

   O service também verifica se
   o paciente pertence ao médico.
 */

 app.use(
   "/prontuarios/clinicos",
   prontuarioRoutes
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

     void req;

     return res.json({

       mensagem:
         "Acesso de administrador autorizado."

     });

   }
 );


 // ========================================
 // AUDITORIA ADMINISTRATIVA
 // ========================================

 /*
   Endpoint:

   GET /admin/auditoria/prontuarios


   FUNCIONAMENTO:

   1. O frontend solicita os logs.

   2. O backend verifica a autenticação
      principal do administrador.

   3. O middleware de perfil permite
      somente usuários ADMIN.

   4. O controller consulta o service
      de auditoria.

   5. O service lê os registros da
      tabela AuditoriaProntuario.

   6. O frontend recebe os metadados
      necessários para exibição.


   SEGURANÇA:

   O administrador poderá consultar:

   - identificador do evento;
   - data e horário;
   - médico responsável;
   - identificador do paciente;
   - identificador do prontuário;
   - ação realizada;
   - resultado da operação.

   O administrador NÃO poderá consultar:

   - queixa principal;
   - diagnósticos;
   - exames;
   - histórico clínico;
   - condutas;
   - conteúdo criptografado;
   - senhas;
   - tokens.

   IMPORTANTE:

   O controle de acesso fica dentro
   de auditoria-admin.routes.ts.

   Esse router deverá aplicar:

   authMiddleware

   permitirPerfis("ADMIN")

   A autorização precisa existir no
   backend, independentemente do frontend.
 */

 app.use(
   "/admin/auditoria",
   auditoriaAdminRoutes
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

     void req;

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
       assinatura do middleware de erro.

       Mantemos a estrutura original
       usada no projeto.
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
           req.get("origin") ||
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


     // Somente erros reconhecidos do parser recebem status de cliente.
     // Não registrar o objeto do parser: ele pode conter o corpo e senhas.
     if (erro?.type === "entity.parse.failed" && erro.status === 400) {
       return res.status(400).json({ mensagem: "JSON inválido." });
     }
     if (erro?.type === "entity.too.large" && erro.status === 413) {
       return res.status(413).json({ mensagem: "Corpo da requisição excede o limite permitido." });
     }

     // ========================================
     // OUTROS ERROS
     // ========================================

     /*
       O erro completo fica somente
       no terminal do servidor.

       O frontend recebe apenas uma
       mensagem genérica.

       Evita expor:

       - caminhos de arquivos;
       - estrutura interna;
       - stack traces;
       - detalhes de infraestrutura.
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

     console.log(
       "Rotas de acesso aos prontuários registradas."
     );

     console.log(
       "Rotas clínicas dos prontuários registradas."
     );

     // ========================================
     // CONFIRMAR ROTA DE AUDITORIA
     // ========================================

     console.log(
       "Rotas administrativas de auditoria registradas."
     );

     console.log(
       "GET /admin/auditoria/prontuarios"
     );

   }
 );
