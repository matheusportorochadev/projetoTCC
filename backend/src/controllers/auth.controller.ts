
 // ========================================
 // CONTROLLER DE AUTENTICAÇÃO
 // ========================================


 // ========================================
 // DEPENDÊNCIAS
 // ========================================

 import type {
   Request,
   Response
 } from "express";

 import jwt from "jsonwebtoken";
 import { identificadorSessaoValido, revogarSessao } from "../services/sessao.service";

 import {
   login
 } from "../services/auth.service";

 // Serviço responsável por registrar
 // operações de autenticação no PostgreSQL.

 import {
   registrarAuditoriaLogin
 } from "../services/auditoria-login.service";


 // ========================================
 // CONFIGURAÇÃO DOS COOKIES
 // ========================================

 // Cookie principal do sistema.
 // Armazena o JWT utilizado no login.
 const NOME_COOKIE =
   "access_token";

 // Cookie exclusivo para autorizar
 // o acesso adicional aos prontuários.
 //
 // O nome precisa ser igual ao utilizado
 // no controller de prontuários.
 const COOKIE_PRONTUARIO =
   "prontuario_access";


 // ========================================
 // TEMPO DE VIDA DO COOKIE PRINCIPAL
 // ========================================

 /*
   O JWT principal possui validade
   de 8 horas.

   Mantemos o cookie com o mesmo
   tempo de validade.
 */
 const TEMPO_COOKIE =
   8 * 60 * 60 * 1000;


 // ========================================
 // CONFIGURAÇÃO DE VERIFICAÇÃO DO JWT
 // ========================================

 // Os valores precisam ser iguais aos
 // utilizados no auth.service.ts.

 const JWT_ISSUER =
   "tcc-consultorio-api";

 const JWT_AUDIENCE =
   "tcc-consultorio-web";


 // ========================================
 // VERIFICAR AMBIENTE
 // ========================================

 function estaEmProducao() {

   return (
     process.env.NODE_ENV ===
     "production"
   );

 }


 // ========================================
 // REMOVER AUTORIZAÇÃO DOS PRONTUÁRIOS
 // ========================================

 /*
   Esta função remove o cookie adicional
   utilizado para acessar prontuários.

   IMPORTANTE:

   O cookie foi criado com:

   path: "/prontuarios"

   Portanto, precisamos usar o mesmo
   path ao removê-lo.

   Não alteramos o cookie principal.
 */

 function removerCookieProntuario(
   res: Response
 ) {

   res.clearCookie(
     COOKIE_PRONTUARIO,
     {

       httpOnly:
         true,

       secure:
         estaEmProducao(),

       sameSite:
         "lax",

       path:
         "/prontuarios"

     }
   );

 }


 // ========================================
 // LOGIN
 // ========================================

 export async function loginController(
   req: Request,
   res: Response
 ) {

   try {

     // ========================================
     // RECEBER DADOS
     // ========================================

     const {
       email,
       senha
     } =
       req.body;


     // ========================================
     // VALIDAR CAMPOS
     // ========================================

     if (
       typeof email !== "string" ||
       typeof senha !== "string" ||
       !email.trim() ||
       !senha
     ) {

       return res
         .status(400)
         .json({

           mensagem:
             "E-mail e senha são obrigatórios."

         });

     }


     // ========================================
     // EXECUTAR LOGIN
     // ========================================

     /*
       O serviço de autenticação:

       - Localiza o usuário.
       - Verifica se a conta está ativa.
       - Compara a senha com bcrypt.
       - Verifica o primeiro acesso.
       - Gera o JWT quando permitido.

       Não alteramos essas regras.
     */

     const resultado =
       await login({

         email:
           email.trim(),

         senha

       });


     // ========================================
     // AUDITORIA — LOGIN BEM-SUCEDIDO
     // ========================================

     /*
       Registramos LOGIN_SUCESSO somente
       quando o serviço realmente gera
       um token JWT.

       Isso é importante porque o fluxo
       legado de primeiro acesso pode
       retornar token = null.

       Nesse caso, o usuário ainda não
       recebeu uma sessão autenticada.

       Registramos a auditoria antes
       de enviar o cookie.
     */

     if (
       resultado.token
     ) {

       await registrarAuditoriaLogin({

         // Identificação do usuário.
         usuarioId:
           resultado.usuario.id,

         // ADMIN, MEDICO ou PACIENTE.
         perfil:
           resultado.usuario.tipo,

         // Ação registrada.
         acao:
           "LOGIN_SUCESSO",

         // Resultado da autenticação.
         resultado:
           "SUCESSO",

         // IP da requisição.
         ip:
           req.ip ?? null

       });

     }


     // ========================================
     // LIMPAR ACESSO ANTIGO AOS PRONTUÁRIOS
     // ========================================

     /*
       Depois que as credenciais principais
       são validadas, removemos qualquer
       autorização anterior de prontuários.

       Assim, um novo login no navegador
       não reutiliza o desbloqueio anterior
       do módulo clínico.

       O médico precisará informar novamente
       a senha adicional dos prontuários.
     */

     removerCookieProntuario(res);


     // ========================================
     // CRIAR COOKIE HTTPONLY
     // ========================================

     /*
       Quando o login é concluído
       normalmente, o service gera JWT.

       O JWT é armazenado exclusivamente
       no cookie HttpOnly.

       Ele NÃO será devolvido no JSON.
     */

     if (
       resultado.token
     ) {

       res.cookie(

         NOME_COOKIE,

         resultado.token,

         {

           // JavaScript do frontend
           // não consegue acessar o JWT.
           httpOnly:
             true,


           // Em produção exige HTTPS.
           secure:
             estaEmProducao(),


           // Proteção inicial contra
           // requisições cross-site.
           sameSite:
             "lax",


           // Cookie disponível para
           // todas as rotas da API.
           path:
             "/",


           // Validade de 8 horas.
           maxAge:
             TEMPO_COOKIE

         }

       );

     }


     // ========================================
     // RESPOSTA DO LOGIN
     // ========================================

     /*
       O frontend recebe somente
       informações do usuário.

       O JWT permanece exclusivamente
       dentro do cookie HttpOnly.

       O primeiro acesso legado continua
       funcionando sem gerar sessão.
     */

     return res
       .status(200)
       .json({

         usuario:
           resultado.usuario

       });

   } catch (erro) {

     // ========================================
     // IDENTIFICAR ERRO
     // ========================================

     const mensagem =
       erro instanceof Error
         ? erro.message
         : "Erro interno do servidor.";


     // ========================================
     // IDENTIFICAR CREDENCIAIS INVÁLIDAS
     // ========================================

     /*
       O auth.service utiliza mensagens
       iniciadas com:

       "E-mail ou senha inválidos."

       para rejeitar credenciais inválidas,
       contas desativadas e contas que
       ainda não possuem senha.

       Erros internos não devem ser
       classificados como senha incorreta.
     */

     const credenciaisInvalidas =
       mensagem.startsWith(
         "E-mail ou senha inválidos."
       );


     // ========================================
     // AUDITORIA — LOGIN COM FALHA
     // ========================================

     if (
       credenciaisInvalidas
     ) {

       try {

         await registrarAuditoriaLogin({

           // Não existe usuário autenticado.
           //
           // Evitamos consultar novamente
           // o e-mail para descobrir se
           // existe uma conta cadastrada.

           usuarioId:
             null,

           perfil:
             null,

           acao:
             "LOGIN_FALHA",

           resultado:
             "FALHA",

           ip:
             req.ip ?? null

         });

       } catch (erroAuditoria) {

         /*
           Um erro na gravação da auditoria
           deve ser identificado como
           problema interno do servidor.

           Não expomos detalhes do banco
           na resposta enviada ao usuário.
         */

         console.error(
           "[AUDITORIA LOGIN] Erro ao registrar tentativa:",
           erroAuditoria
         );

         return res
           .status(500)
           .json({

             mensagem:
               "Não foi possível concluir a autenticação."

           });

       }


       // ========================================
       // RESPOSTA PARA CREDENCIAIS INVÁLIDAS
       // ========================================

       return res
         .status(401)
         .json({

           mensagem

         });

     }


     // ========================================
     // TRATAMENTO DE ERROS INTERNOS
     // ========================================

     /*
       Problemas de conexão com o banco,
       geração de JWT ou gravação de
       LOGIN_SUCESSO chegam aqui.

       Não utilizamos status 401 porque
       esses problemas não representam
       credenciais incorretas.
     */

     console.error(
       "[AUTENTICAÇÃO] Erro interno:",
       erro
     );

     return res
       .status(500)
       .json({

         mensagem:
           "Não foi possível concluir a autenticação."

       });

   }

 }


 // ========================================
 // LOGOUT
 // ========================================

 export async function logoutController(
   req: Request,
   res: Response
 ) {

   // ========================================
   // IDENTIFICAR USUÁRIO PELO JWT
   // ========================================

   /*
     Antes de remover os cookies,
     verificamos se existe uma sessão
     autenticada válida.

     O JWT fica armazenado no cookie
     HttpOnly chamado access_token.

     Não exigimos autenticação nesta rota,
     pois cookies expirados ou inválidos
     também precisam ser removidos.
   */

   let usuarioId: number | null =
     null;

   let perfil: string | null =
     null;

   let expiracaoSessao: number | null = null;


   // ========================================
   // LER COOKIE DE AUTENTICAÇÃO
   // ========================================

   /*
     O cookie-parser disponibiliza
     os cookies em req.cookies.

     Verificamos se o valor encontrado
     realmente é uma string.
   */

   const token =
     req.cookies?.[NOME_COOKIE];


   // ========================================
   // VALIDAR JWT EXISTENTE
   // ========================================

   if (
     typeof token === "string"
   ) {

     try {

       // ========================================
       // VERIFICAR SEGREDO JWT
       // ========================================

       const segredo =
         process.env.JWT_SECRET;

       if (
         !segredo ||
         segredo.length < 32
       ) {

         throw new Error(
           "JWT_SECRET não configurado corretamente."
         );

       }


       // ========================================
       // VERIFICAR ASSINATURA E VALIDADE
       // ========================================

       /*
         Validamos:

         - Assinatura do token.
         - Algoritmo HS256.
         - Prazo de validade.
         - Emissor.
         - Destinatário.

         Não basta decodificar o JWT.
         Precisamos verificar sua
         autenticidade antes de confiar
         no usuário identificado.
       */

       const dados =
         jwt.verify(

           token,

           segredo,

           {

             algorithms:
               ["HS256"],

             issuer:
               JWT_ISSUER,

             audience:
               JWT_AUDIENCE

           }

         );


       // ========================================
       // IDENTIFICAR USUÁRIO
       // ========================================

       /*
         O JWT principal contém:

         sub  = ID do usuário
         tipo = Perfil do usuário

         Não utilizamos nome, e-mail
         ou informações sensíveis.
       */

       if (
         typeof dados !== "string" &&
         typeof dados.sub === "string" &&
         typeof dados.tipo === "string"
       ) {

         const id =
           Number(dados.sub);


         // Aceita somente identificadores
         // inteiros positivos e seguros.
         if (
           Number.isSafeInteger(id) &&
           id > 0
         ) {

           usuarioId =
             id;

           perfil =
             dados.tipo;

           if (identificadorSessaoValido(dados.jti) && Number.isSafeInteger(dados.exp)) {
             expiracaoSessao = dados.exp!;
           }

         }

       }

     } catch {

       // ========================================
       // TOKEN EXPIRADO OU INVÁLIDO
       // ========================================

       /*
         Um token expirado ou inválido
         não impede o logout.

         Não registramos o conteúdo
         do JWT em logs.

         Também não atribuímos o evento
         a um usuário não autenticado.
       */

       console.warn(
         "[LOGOUT] Sessão ausente ou inválida para auditoria."
       );

     }

   }


   // ========================================
   // REMOVER COOKIE PRINCIPAL
   // ========================================

   /*
     O cookie HttpOnly não pode ser
     apagado diretamente pelo frontend.

     Por isso o backend remove o cookie
     de autenticação principal.
   */

   // Confirma a revogação antes de limpar cookies e anunciar sucesso.
   // Em falha, mantém o cookie para permitir que o cliente repita o logout.
   if (usuarioId !== null && expiracaoSessao !== null && typeof token === "string") {
     try {
       await revogarSessao(token, usuarioId, expiracaoSessao);
     } catch {
       return res.status(503).json({
         mensagem: "Não foi possível encerrar a sessão com segurança. Tente novamente."
       });
     }
   }

   res.clearCookie(

     NOME_COOKIE,

     {

       httpOnly:
         true,

       secure:
         estaEmProducao(),

       sameSite:
         "lax",

       path:
         "/"

     }

   );


   // ========================================
   // REMOVER AUTORIZAÇÃO DOS PRONTUÁRIOS
   // ========================================

   /*
     Ao sair do sistema, também removemos
     o cookie adicional dos prontuários.

     Assim, o navegador deixa de enviar
     essa autorização nas próximas
     requisições.

     Isso não modifica a senha cadastrada
     no PostgreSQL.

     Quando o médico fizer login novamente,
     precisará informar sua senha adicional
     para desbloquear os prontuários.
   */

   removerCookieProntuario(res);


   // ========================================
   // AUDITORIA — LOGOUT
   // ========================================

   /*
     Registramos LOGOUT somente quando
     conseguimos identificar uma sessão
     autenticada válida.

     Isso evita atribuir um logout a
     um usuário com token expirado,
     inválido ou ausente.

     Caso a auditoria falhe, os cookies
     ainda devem ser removidos.
   */

   if (
     usuarioId !== null
   ) {

     try {

       await registrarAuditoriaLogin({

         // Usuário que encerrou a sessão.
         usuarioId,

         // Perfil obtido do JWT validado.
         perfil,

         // Ação realizada.
         acao:
           "LOGOUT",

         // Solicitação processada.
         resultado:
           "SUCESSO",

         // IP da requisição.
         ip:
           req.ip ?? null

       });

     } catch (erroAuditoria) {

       /*
         Não bloqueamos o logout
         se o banco de auditoria
         apresentar algum problema.

         O erro fica registrado
         apenas no backend.
       */

       console.error(
         "[AUDITORIA LOGIN] Erro ao registrar logout:",
         erroAuditoria
       );

     }

   }


   // ========================================
   // RESPOSTA DO LOGOUT
   // ========================================

   return res
     .status(200)
     .json({

       mensagem:
         "Logout realizado com sucesso."

     });

 }
