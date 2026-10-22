
 // ========================================
 // ROTAS ADMINISTRATIVAS DE AUDITORIA
 // ========================================

 import {
   Router
 } from "express";

 import type {
   Request,
   Response
 } from "express";

 import {
   authMiddleware
 } from "../middlewares/auth.middleware";

 import {
   permitirPerfis
 } from "../middlewares/role.middleware";

 import {
   contarAuditoriaProntuarios,
  listarAuditoriaProntuarios,
   contarAuditoriaAgenda,
   listarAuditoriaAgenda,
   contarAuditoriaPacientes,
   listarAuditoriaPacientes,
   // NOVO:
   // Consulta de logs de autenticação.
   listarAuditoriaLogin,
    contarAuditoriaLogin
 } from "../services/auditoria-admin.service";

 import type {
   FiltrosAuditoria
 } from "../services/auditoria-admin.service";


 // ========================================
 // CRIAR ROUTER
 // ========================================

 const auditoriaAdminRoutes = Router();


 // ========================================
 // PROTEGER TODAS AS ROTAS
 // ========================================

 // Exige autenticação e perfil ADMIN.
 //
 // Médicos e pacientes não podem
 // consultar os logs administrativos.
 //
 // Essa proteção também se aplica
 // à nova rota de Login e Segurança.

 auditoriaAdminRoutes.use(
   authMiddleware,
   permitirPerfis("ADMIN")
 );


 // ========================================
 // LER PARÂMETROS DA URL
 // ========================================

 // Aceita apenas parâmetros simples.
 //
 // Arrays e objetos enviados na query
 // não são considerados válidos.

 function obterParametro(
   req: Request,
   nome: string
 ): string | undefined {

   const valor = req.query[nome];

   return typeof valor === "string"
     ? valor
     : undefined;
 }


 // ========================================
 // VALIDAR FILTROS DA AUDITORIA
 // ========================================

 // Filtros compartilhados por:
 //
 // - Prontuários;
 // - Agenda;
 // - Pacientes;
 // - Login e Segurança.
 //
 // Observação:
 //
 // A tabela AuditoriaLogin não possui
 // medicoId. Esse filtro será rejeitado
 // especificamente na rota de login.

 function obterFiltrosAuditoria(
   req: Request
 ): FiltrosAuditoria {

   // ========================================
   // MÉDICO
   // ========================================

   const medicoTexto =
     obterParametro(
       req,
       "medicoId"
     );

   let medicoId: number | undefined;

   if (medicoTexto !== undefined) {

     const numero = Number(
       medicoTexto
     );

     if (
       !Number.isSafeInteger(numero) ||
       numero <= 0
     ) {
       throw new Error(
         "Médico inválido."
       );
     }

     medicoId = numero;
   }


   // ========================================
   // AÇÃO
   // ========================================

   const acao =
     obterParametro(
       req,
       "acao"
     );

   if (
     acao &&
     (
       acao.length > 50 ||
       !/^[A-Z_]+$/.test(acao)
     )
   ) {
     throw new Error(
       "Ação inválida."
     );
   }


   // ========================================
   // RESULTADO
   // ========================================

   const resultadoTexto =
     obterParametro(
       req,
       "resultado"
     );

   if (
     resultadoTexto !== undefined &&
     resultadoTexto !== "SUCESSO" &&
     resultadoTexto !== "FALHA"
   ) {
     throw new Error(
       "Resultado inválido."
     );
   }

   const resultado:
     "SUCESSO" | "FALHA" | undefined =
       resultadoTexto === "SUCESSO" ||
       resultadoTexto === "FALHA"
         ? resultadoTexto
         : undefined;


   // ========================================
   // PERÍODO
   // ========================================

   const dataInicio =
     obterParametro(
       req,
       "dataInicio"
     );

   const dataFim =
     obterParametro(
       req,
       "dataFim"
     );

   const formatoData =
     /^\d{4}-\d{2}-\d{2}$/;

   if (
     (dataInicio && !formatoData.test(dataInicio)) ||
     (dataFim && !formatoData.test(dataFim))
   ) {
     throw new Error(
       "Formato de data inválido."
     );
   }


   // ========================================
   // RETORNAR FILTROS
   // ========================================


    // ========================================
    // PAGINAÇÃO DA AUDITORIA
    // ========================================
    // A página 1 é utilizada por padrão.
    // Valores inválidos são rejeitados.

    const paginaTexto = obterParametro(
      req,
      "pagina"
    );

    const pagina = paginaTexto === undefined
      ? 1
      : Number(paginaTexto);

    if (
      !Number.isSafeInteger(pagina) ||
      pagina < 1
    ) {
      throw new Error("Página inválida.");
    }

return {
     medicoId,
     acao,
     resultado,
     dataInicio,
     dataFim
   ,
      pagina};
 }


 // ========================================
 // IDENTIFICAR ERROS DE VALIDAÇÃO
 // ========================================

 // Mensagens conhecidas retornam HTTP 400.
 //
 // Erros internos retornam HTTP 500,
 // sem expor detalhes do banco ao cliente.

 function erroValidacao(
   erro: unknown
 ): boolean {

   if (!(erro instanceof Error)) {
     return false;
   }

   return [
     "Página inválida.",
      "Médico inválido.",
     "Ação inválida.",
     "Resultado inválido.",
     "Formato de data inválido.",
     "Período inválido.",
     "A data inicial não pode ser maior que a final."
   ].includes(erro.message);
 }


 // ========================================
 // CONSULTAR LOGS DE PRONTUÁRIOS
 // ========================================

 // GET /admin/auditoria/prontuarios
 //
 // Preserva a rota original.

 auditoriaAdminRoutes.get(
   "/prontuarios",
   async (
     req: Request,
     res: Response
   ) => {

     try {

       const filtros =
         obterFiltrosAuditoria(req);

       const registros =
         await listarAuditoriaProntuarios(
           filtros
         );

       const contadores =
         await contarAuditoriaProntuarios(filtros);

       const pagina = filtros.pagina ?? 1;
       const tamanhoPagina = 50;

       const totalPaginas = Math.ceil(
         contadores.total / tamanhoPagina
       );

       // Os indicadores consideram todos os
       // registros encontrados pelos filtros.
       // A lista contém apenas a página atual.

       return res.json({
         total: contadores.total,
         sucessos: contadores.sucessos,
         falhas: contadores.falhas,
         totalRetornado: registros.length,
         pagina,
         tamanhoPagina,
         totalPaginas,
         registros
       });

     } catch (erro) {

       if (erroValidacao(erro)) {
         return res.status(400).json({
           mensagem:
             erro instanceof Error
               ? erro.message
               : "Filtros inválidos."
         });
       }

       console.error(
         "[AUDITORIA ADMIN] Erro nos prontuários:",
         erro
       );

       return res.status(500).json({
         mensagem:
           "Não foi possível consultar os logs."
       });
     }
   }
 );


 // ========================================
 // CONSULTAR LOGS DA AGENDA
 // ========================================

 // GET /admin/auditoria/agenda
 //
 // Preserva a rota da agenda.
 //
 // Permite filtrar por médico, ação,
 // resultado e período.

 auditoriaAdminRoutes.get(
   "/agenda",
   async (
     req: Request,
     res: Response
   ) => {

     try {

       const filtros =
         obterFiltrosAuditoria(req);

       const registros =
         await listarAuditoriaAgenda(
           filtros
         );

       // Consulta os contadores usando
        // os mesmos filtros da listagem.
        const contadores =
          await contarAuditoriaAgenda(filtros);

        const pagina = filtros.pagina ?? 1;
        const tamanhoPagina = 50;

        const totalPaginas = Math.ceil(
          contadores.total / tamanhoPagina
        );

        // Envia apenas os 50 registros da
        // página e os contadores globais.
        return res.json({
          total: contadores.total,
          sucessos: contadores.sucessos,
          falhas: contadores.falhas,
          totalRetornado: registros.length,
          pagina,
          tamanhoPagina,
          totalPaginas,
          registros
        });

     } catch (erro) {

       if (erroValidacao(erro)) {
         return res.status(400).json({
           mensagem:
             erro instanceof Error
               ? erro.message
               : "Filtros inválidos."
         });
       }

       console.error(
         "[AUDITORIA ADMIN] Erro na agenda:",
         erro
       );

       return res.status(500).json({
         mensagem:
           "Não foi possível consultar os logs da agenda."
       });
     }
   }
 );


 // ========================================
 // CONSULTAR LOGS DE PACIENTES
 // ========================================

 // GET /admin/auditoria/pacientes
 //
 // Permite ao administrador consultar
 // os registros de cadastro de pacientes.
 //
 // Exemplos:
 //
 // /admin/auditoria/pacientes
 //
 // /admin/auditoria/pacientes?medicoId=16
 //
 // /admin/auditoria/pacientes?acao=CADASTRAR_PACIENTE
 //
 // /admin/auditoria/pacientes?resultado=SUCESSO
 //
 // /admin/auditoria/pacientes?dataInicio=2026-10-01
 //
 // Os filtros podem ser combinados.
 //
 // A proteção ADMIN é aplicada
 // automaticamente pelo router.

 auditoriaAdminRoutes.get(
   "/pacientes",
   async (
     req: Request,
     res: Response
   ) => {

     try {

       // ========================================
       // OBTER FILTROS
       // ========================================

       const filtros =
         obterFiltrosAuditoria(req);


       // ========================================
       // CONSULTAR AUDITORIA
       // ========================================

       const registros =
         await listarAuditoriaPacientes(
           filtros
         );


       // ========================================
       // RETORNAR RESULTADOS
       // ========================================

       // Mesmo formato de resposta
       // utilizado pelos outros módulos.

       // Consulta os contadores usando
        // os mesmos filtros da listagem.
        const contadores =
          await contarAuditoriaPacientes(filtros);

        const pagina = filtros.pagina ?? 1;
        const tamanhoPagina = 50;

        const totalPaginas = Math.ceil(
          contadores.total / tamanhoPagina
        );

        // Envia apenas os 50 registros da
        // página e os contadores globais.
        return res.json({
          total: contadores.total,
          sucessos: contadores.sucessos,
          falhas: contadores.falhas,
          totalRetornado: registros.length,
          pagina,
          tamanhoPagina,
          totalPaginas,
          registros
        });

     } catch (erro) {

       // ========================================
       // ERROS DE VALIDAÇÃO
       // ========================================

       if (erroValidacao(erro)) {

         return res.status(400).json({
           mensagem:
             erro instanceof Error
               ? erro.message
               : "Filtros inválidos."
         });
       }


       // ========================================
       // ERROS INTERNOS
       // ========================================

       console.error(
         "[AUDITORIA ADMIN] Erro nos pacientes:",
         erro
       );

       return res.status(500).json({
         mensagem:
           "Não foi possível consultar os logs dos pacientes."
       });
     }
   }
 );


 // ========================================
 // NOVO — CONSULTAR LOGS DE LOGIN
 // ========================================

 /*
   GET /admin/auditoria/login

   Permite ao administrador consultar
   eventos de Login e Segurança.

   Eventos disponíveis:

   LOGIN_SUCESSO
   LOGIN_FALHA
   LOGIN_BLOQUEADO
   LOGOUT

   Informações retornadas:

   - ID do evento;
   - ID do usuário, quando identificado;
   - Perfil;
   - Ação executada;
   - Resultado;
   - Endereço IP;
   - Identificador da requisição;
   - Data e horário.

   Não são retornados:

   - Senhas;
   - Tokens JWT;
   - Cookies;
   - Códigos de recuperação.

   Somente usuários ADMIN conseguem
   acessar esta rota.
 */

 auditoriaAdminRoutes.get(
   "/login",
   async (
     req: Request,
     res: Response
   ) => {

     try {

       // ========================================
       // OBTER FILTROS
       // ========================================

       const filtros =
         obterFiltrosAuditoria(req);


       // ========================================
       // VALIDAR FILTRO DE MÉDICO
       // ========================================

       /*
         A tabela AuditoriaLogin não possui
         o campo medicoId.

         Portanto, não aceitamos esse filtro
         nesta rota.

         Isso evita apresentar resultados
         sem aplicar um filtro solicitado.
       */

       if (
         filtros.medicoId !== undefined
       ) {

         return res
           .status(400)
           .json({

             mensagem:
               "O filtro de médico não está disponível na auditoria de login."

           });

       }


       // ========================================
       // CONSULTAR AUDITORIA DE LOGIN
       // ========================================

       /*
         Consulta a tabela AuditoriaLogin
         utilizando o serviço administrativo.

         O serviço aplica:

         - Filtro de ação;
         - Filtro de resultado;
         - Data inicial;
         - Data final;
         - Ordenação dos mais recentes;
         - Limite de 100 registros.
       */

       // Busca somente os registros da página.
        const registros =
          await listarAuditoriaLogin(filtros);

        // Calcula os indicadores considerando
        // todos os registros filtrados no banco.
        const contadores =
          await contarAuditoriaLogin(filtros);

        const pagina = filtros.pagina ?? 1;

        const tamanhoPagina = 50;

        const totalPaginas = Math.ceil(
          contadores.total / tamanhoPagina
        );


       // ========================================
       // RETORNAR RESULTADOS
       // ========================================

       /*
         Utilizamos o mesmo formato
         das demais rotas administrativas.

         Isso facilita a integração
         com o frontend.
       */

       return res.json({
          total: contadores.total,
          sucessos: contadores.sucessos,
          falhas: contadores.falhas,
          totalRetornado: registros.length,
          pagina,
          tamanhoPagina,
          totalPaginas,
          registros
        });

     } catch (erro) {

       // ========================================
       // TRATAR ERROS DE VALIDAÇÃO
       // ========================================

       if (
         erroValidacao(erro)
       ) {

         return res
           .status(400)
           .json({

             mensagem:
               erro instanceof Error
                 ? erro.message
                 : "Filtros inválidos."

           });

       }


       // ========================================
       // TRATAR ERROS INTERNOS
       // ========================================

       /*
         Não mostramos detalhes internos
         do PostgreSQL ao administrador.

         O erro fica registrado somente
         no terminal do backend.
       */

       console.error(
         "[AUDITORIA ADMIN] Erro nos logs de login:",
         erro
       );

       return res
         .status(500)
         .json({

           mensagem:
             "Não foi possível consultar os logs de login."

         });

     }

   }
 );


 // ========================================
 // EXPORTAR ROUTER
 // ========================================

 export default auditoriaAdminRoutes;
