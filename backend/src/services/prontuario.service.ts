
 // ========================================
 // SERVICE DE PRONTUÁRIOS MÉDICOS
 // ========================================
 //
 // Responsabilidades:
 //
 // 1. Identificar o médico autenticado.
 // 2. Permitir acesso somente aos seus pacientes.
 // 3. Consultar o histórico clínico.
 // 4. Criar novos registros sem alterar os antigos.
 // 5. Criptografar novos prontuários com AES-256-GCM.
 // 6. Descriptografar somente após autorização.
 // 7. Registrar operações na auditoria.
 //
 // IMPORTANTE:
 //
 // Os novos prontuários NÃO terão informações
 // clínicas preenchidas nas colunas antigas.
 //
 // Os dados clínicos ficarão exclusivamente
 // no campo conteudoCriptografado.
 //
 // A leitura dos registros antigos continua
 // disponível durante a transição.
 //
 // Não existe funcionalidade de edição ou
 // exclusão de prontuários neste service.

 import {
   db
 } from "../prisma/db";

 import {
   buscarMedicoPorUsuarioId
 } from "./paciente.service";

 import type {
   CriarProntuarioDTO
 } from "../schemas/prontuario.schema";

 import {
   criptografarProntuario,
   descriptografarProntuario
 } from "./prontuario-criptografia.service";


 // ========================================
 // TIPOS INTERNOS
 // ========================================

 // Versão atual da estrutura clínica.
 //
 // Futuramente poderemos evoluir para
 // um formulário mais completo sem precisar
 // criar uma coluna para cada resposta.
 const VERSAO_SCHEMA_CLINICO = 1;

 // Identificador da chave atual.
 //
 // Este valor precisa ser compatível com
 // a versão utilizada pelo serviço de
 // criptografia.
 const VERSAO_CHAVE = 1;


 // ========================================
 // CONTEÚDO CLÍNICO CRIPTOGRAFADO
 // ========================================

 // Estrutura utilizada na versão inicial
 // do formulário.
 //
 // Posteriormente ela será ampliada para
 // contemplar todos os campos da ficha
 // clínica original.
 type ConteudoClinicoV1 = {

   versaoSchema: 1;

   queixaPrincipal: string | null;

   historiaMolestiaAtual: string | null;

   historiaPatologicaPregressa: string | null;

   exameFisico: string | null;

   examesComplementares: string | null;

   conduta: string | null;

 };


 // ========================================
 // GERAR CONTEÚDO CLÍNICO
 // ========================================

 // Converte o DTO validado pelo Zod
 // em um objeto estruturado.
 //
 // A identificação do paciente e do médico
 // não precisa ser duplicada no JSON,
 // pois já existe nas colunas relacionais.
 function montarConteudoClinico(
   dados: CriarProntuarioDTO
 ): ConteudoClinicoV1 {

   return {

     versaoSchema: 1,

     queixaPrincipal:
       dados.queixaPrincipal ?? null,

     historiaMolestiaAtual:
       dados.historiaMolestiaAtual ?? null,

     historiaPatologicaPregressa:
       dados.historiaPatologicaPregressa ?? null,

     exameFisico:
       dados.exameFisico ?? null,

     examesComplementares:
       dados.examesComplementares ?? null,

     conduta:
       dados.conduta ?? null

   };

 }


 // ========================================
 // IDENTIFICAR MÉDICO E PACIENTE
 // ========================================

 // O usuarioId é obtido pelo authMiddleware.
 //
 // Nunca aceitamos medicoId informado
 // diretamente pelo frontend.
 //
 // Também verificamos se o paciente
 // pertence ao médico autenticado.
 async function verificarPacienteDoMedico(
   usuarioId: number,
   pacienteId: number
 ) {

   const medico =
     await buscarMedicoPorUsuarioId(
       usuarioId
     );

   const paciente =
     await db.orm.public.Paciente
       .where({
         id: pacienteId,
         medicoId: medico.id
       })
       .first();

   if (!paciente) {

     throw new Error(
       "Paciente não encontrado."
     );

   }

   return {
     medico,
     paciente
   };

 }


 // ========================================
 // REGISTRAR AUDITORIA
 // ========================================

 // Registra os metadados da operação.
 //
 // Não armazena:
 //
 // - Queixa principal;
 // - Diagnósticos;
 // - Histórico clínico;
 // - Senhas;
 // - Tokens;
 // - Conteúdo criptografado.
 //
 // Se a auditoria não puder ser gravada,
 // a função lança um erro.
 //
 // Dessa forma, uma consulta protegida
 // não será retornada sem a tentativa
 // obrigatória de registrar o acesso.
 async function registrarAuditoria(
   dados: {
     usuarioId: number;
     medicoId: number;
     pacienteId: number;
     prontuarioId?: number | null;
     acao: string;
     resultado: "SUCESSO" | "FALHA";
   }
 ) {

   await db.orm.public.AuditoriaProntuario
     .create({

       usuarioId:
         dados.usuarioId,

       medicoId:
         dados.medicoId,

       pacienteId:
         dados.pacienteId,

       prontuarioId:
         dados.prontuarioId ?? null,

       acao:
         dados.acao,

       resultado:
         dados.resultado,

       requisicaoId:
         null

     });

 }


 // ========================================
 // PREPARAR PRONTUÁRIO PARA RESPOSTA
 // ========================================

 // O banco armazena o conteúdo criptografado,
 // mas o frontend precisa receber os campos
 // clínicos para montar o documento.
 //
 // Por isso:
 //
 // 1. Identificamos o formato do registro.
 // 2. Descriptografamos quando necessário.
 // 3. Removemos o ciphertext da resposta.
 // 4. Retornamos os campos conhecidos.
 //
 // O frontend NUNCA deve receber a chave
 // nem o conteúdo criptografado bruto.

 function prepararProntuarioParaResposta(
   registro: {
     id: number;
     pacienteId: number;
     medicoId: number;

     queixaPrincipal: string | null;
     historiaMolestiaAtual: string | null;
     historiaPatologicaPregressa: string | null;
     exameFisico: string | null;
     examesComplementares: string | null;
     conduta: string | null;

     prontuarioAnteriorId: number | null;

     conteudoCriptografado: string | null;
     versaoSchema: number;
     versaoChave: number;

     createdAt: string;
   }
 ) {

   // ----------------------------------------
   // REGISTRO ANTIGO
   // ----------------------------------------
   //
   // Os prontuários cadastrados antes da
   // criptografia ainda podem possuir dados
   // nas colunas tradicionais.
   //
   // Não os descartamos nem modificamos
   // nesta etapa.
   if (!registro.conteudoCriptografado) {

     return {

       id: registro.id,

       pacienteId:
         registro.pacienteId,

       medicoId:
         registro.medicoId,

       queixaPrincipal:
         registro.queixaPrincipal,

       historiaMolestiaAtual:
         registro.historiaMolestiaAtual,

       historiaPatologicaPregressa:
         registro.historiaPatologicaPregressa,

       exameFisico:
         registro.exameFisico,

       examesComplementares:
         registro.examesComplementares,

       conduta:
         registro.conduta,

       prontuarioAnteriorId:
         registro.prontuarioAnteriorId,

       createdAt:
         registro.createdAt,

       versaoSchema:
         registro.versaoSchema,

       // Indica apenas se o conteúdo
       // já utiliza o novo armazenamento.
       criptografado: false

     };

   }

   // ----------------------------------------
   // VALIDAR VERSÕES
   // ----------------------------------------

   // Nunca tentamos interpretar um formato
   // desconhecido silenciosamente.
   if (
     registro.versaoSchema !==
       VERSAO_SCHEMA_CLINICO ||
     registro.versaoChave !==
       VERSAO_CHAVE
   ) {

     throw new Error(
       "Versão do prontuário não suportada."
     );

   }

   // ----------------------------------------
   // DESCRIPTOGRAFAR
   // ----------------------------------------
   //
   // Os IDs usados como contexto precisam
   // ser os mesmos do registro original.
   //
   // O GCM verifica a integridade antes de
   // disponibilizarmos o conteúdo.

   const conteudo =
     descriptografarProntuario<ConteudoClinicoV1>(
       registro.conteudoCriptografado,
       {
         medicoId:
           registro.medicoId,

         pacienteId:
           registro.pacienteId
       }
     );

   if (
     !conteudo ||
     conteudo.versaoSchema !== 1
   ) {

     throw new Error(
       "Estrutura do prontuário inválida."
     );

   }

   // ----------------------------------------
   // RESPOSTA SEGURA
   // ----------------------------------------
   //
   // Excluímos o campo
   // conteudoCriptografado da resposta.
   //
   // Mantemos a estrutura anterior para
   // preservar compatibilidade com o
   // restante do sistema.

   return {

     id:
       registro.id,

     pacienteId:
       registro.pacienteId,

     medicoId:
       registro.medicoId,

     queixaPrincipal:
       conteudo.queixaPrincipal,

     historiaMolestiaAtual:
       conteudo.historiaMolestiaAtual,

     historiaPatologicaPregressa:
       conteudo.historiaPatologicaPregressa,

     exameFisico:
       conteudo.exameFisico,

     examesComplementares:
       conteudo.examesComplementares,

     conduta:
       conteudo.conduta,

     prontuarioAnteriorId:
       registro.prontuarioAnteriorId,

     createdAt:
       registro.createdAt,

     versaoSchema:
       registro.versaoSchema,

     criptografado: true

   };

 }


 // ========================================
 // LISTAR PACIENTES DO MÉDICO
 // ========================================

 // Retorna somente pacientes ativos
 // vinculados ao médico autenticado.
 //
 // Esta função não expõe prontuários
 // nem informações clínicas.
 export async function listarPacientesParaProntuario(
   usuarioId: number
 ) {

   const medico =
     await buscarMedicoPorUsuarioId(
       usuarioId
     );

   const pacientes =
     await db.orm.public.Paciente
       .where({
         medicoId: medico.id,
         ativo: true
       })
       .all();

   return pacientes
     .map(
       (paciente) => ({

         id: paciente.id,

         nome: paciente.nome,

         email: paciente.email,

         telefone: paciente.telefone,

         cpf: paciente.cpf

       })
     )
     .sort(
       (a, b) =>
         a.nome.localeCompare(
           b.nome,
           "pt-BR"
         )
     );

 }


 // ========================================
 // LISTAR HISTÓRICO DO PACIENTE
 // ========================================

 // A verificação de propriedade ocorre
 // antes de buscar qualquer registro.
 //
 // O histórico é retornado do mais
 // recente para o mais antigo.
 //
 // Registramos um evento de auditoria
 // para a consulta do histórico.
 export async function listarHistoricoProntuarios(
   usuarioId: number,
   pacienteId: number
 ) {

   const {
     medico,
     paciente
   } =
     await verificarPacienteDoMedico(
       usuarioId,
       pacienteId
     );

   const registros =
     await db.orm.public.Prontuario
       .where({
         pacienteId: paciente.id,
         medicoId: medico.id
       })
       .all();

   // Ordenação por data e ID.
   const registrosOrdenados =
     [...registros].sort(
       (a, b) => {

         const diferencaDatas =
           new Date(b.createdAt).getTime() -
           new Date(a.createdAt).getTime();

         return diferencaDatas !== 0
           ? diferencaDatas
           : b.id - a.id;

       }
     );

   // Recupera os dados clínicos dos
   // registros autorizados.
   //
   // Registros novos são descriptografados.
   // Registros antigos mantêm a leitura
   // temporária das colunas anteriores.
   const historico =
     registrosOrdenados.map(
       prepararProntuarioParaResposta
     );

   // Registra o acesso ao histórico.
   //
   // Não incluímos informações clínicas
   // no evento de auditoria.
   await registrarAuditoria({

     usuarioId,

     medicoId:
       medico.id,

     pacienteId:
       paciente.id,

     prontuarioId:
       null,

     acao:
       "LISTAR_HISTORICO",

     resultado:
       "SUCESSO"

   });

   return {

     paciente: {
       id: paciente.id,
       nome: paciente.nome
     },

     prontuarios:
       historico

   };

 }


 // ========================================
 // CONSULTAR PRONTUÁRIO ESPECÍFICO
 // ========================================

 // Verifica se:
 //
 // 1. O usuário é um médico válido.
 // 2. O paciente pertence a esse médico.
 // 3. O prontuário pertence ao paciente.
 // 4. O prontuário pertence ao médico.
 //
 // A rota já deve estar protegida pelo
 // middleware de acesso adicional.
 export async function buscarProntuarioPorId(
   usuarioId: number,
   pacienteId: number,
   prontuarioId: number
 ) {

   const {
     medico,
     paciente
   } =
     await verificarPacienteDoMedico(
       usuarioId,
       pacienteId
     );

   const prontuario =
     await db.orm.public.Prontuario
       .where({
         id: prontuarioId,
         pacienteId: paciente.id,
         medicoId: medico.id
       })
       .first();

   if (!prontuario) {

     throw new Error(
       "Prontuário não encontrado."
     );

   }

   // Prepara os dados e verifica
   // a integridade da criptografia.
   const resposta =
     prepararProntuarioParaResposta(
       prontuario
     );

   // Registra o acesso autorizado.
   await registrarAuditoria({

     usuarioId,

     medicoId:
       medico.id,

     pacienteId:
       paciente.id,

     prontuarioId:
       prontuario.id,

     acao:
       "CONSULTAR",

     resultado:
       "SUCESSO"

   });

   return resposta;

 }


 // ========================================
 // CRIAR NOVO PRONTUÁRIO
 // ========================================

 // Cada chamada cria um registro novo.
 //
 // Nunca alteramos o prontuário anterior.
 //
 // O conteúdo clínico será criptografado
 // antes de chegar ao banco de dados.
 export async function criarNovoProntuario(
   usuarioId: number,
   pacienteId: number,
   dados: CriarProntuarioDTO
 ) {

   const {
     medico,
     paciente
   } =
     await verificarPacienteDoMedico(
       usuarioId,
       pacienteId
     );

   if (!paciente.ativo) {

     throw new Error(
       "Não é possível criar um prontuário para um paciente inativo."
     );

   }

   // ========================================
   // VALIDAR REGISTRO ANTERIOR
   // ========================================

   // Se o formulário foi preenchido com
   // base em um registro anterior, devemos
   // confirmar que ele pertence ao mesmo
   // médico e paciente.
   if (
     dados.prontuarioAnteriorId !== undefined &&
     dados.prontuarioAnteriorId !== null
   ) {

     const prontuarioAnterior =
       await db.orm.public.Prontuario
         .where({
           id: dados.prontuarioAnteriorId,
           pacienteId: paciente.id,
           medicoId: medico.id
         })
         .first();

     if (!prontuarioAnterior) {

       throw new Error(
         "Prontuário anterior inválido."
       );

     }

   }

   // ========================================
   // PREPARAR CONTEÚDO CLÍNICO
   // ========================================

   // Monta um único documento estruturado.
   //
   // O objeto não contém senhas, tokens
   // ou informações de autenticação.
   const conteudoClinico =
     montarConteudoClinico(
       dados
     );

   // ========================================
   // CRIPTOGRAFAR CONTEÚDO
   // ========================================

   // Esta função utiliza a chave armazenada
   // exclusivamente no ambiente do backend.
   //
   // Cada operação utiliza um IV aleatório.
   //
   // O conteúdo fica vinculado ao médico
   // e paciente por meio de AAD.
   const conteudoCriptografado =
     criptografarProntuario(
       conteudoClinico,
       {
         medicoId:
           medico.id,

         pacienteId:
           paciente.id
       }
     );

   // ========================================
   // SALVAR REGISTRO E AUDITORIA
   // ========================================

   // Utilizamos uma transação:
   //
   // - Criamos o prontuário;
   // - Criamos o evento de auditoria;
   //
   // Se uma dessas operações falhar,
   // a transação será revertida.
   //
   // Isso evita gravar um prontuário
   // sem o registro da sua criação.
   const novoProntuario =
     await db.transaction(
       async (tx) => {

         // -----------------------------------
         // REGISTRO CLÍNICO
         // -----------------------------------

         const registro =
           await tx.orm.public.Prontuario
             .create({

               pacienteId:
                 paciente.id,

               medicoId:
                 medico.id,

               // NÃO preenchermos as colunas
               // clínicas antigas com texto.
               //
               // O conteúdo verdadeiro fica
               // somente criptografado.
               queixaPrincipal:
                 null,

               historiaMolestiaAtual:
                 null,

               historiaPatologicaPregressa:
                 null,

               exameFisico:
                 null,

               examesComplementares:
                 null,

               conduta:
                 null,

               conteudoCriptografado,

               versaoSchema:
                 VERSAO_SCHEMA_CLINICO,

               versaoChave:
                 VERSAO_CHAVE,

               prontuarioAnteriorId:
                 dados.prontuarioAnteriorId ?? null

             });

         // -----------------------------------
         // AUDITORIA DA CRIAÇÃO
         // -----------------------------------

         await tx.orm.public.AuditoriaProntuario
           .create({

             usuarioId,

             medicoId:
               medico.id,

             pacienteId:
               paciente.id,

             prontuarioId:
               registro.id,

             acao:
               "CRIAR",

             resultado:
               "SUCESSO",

             requisicaoId:
               null

           });

         return registro;

       }
     );

   // ========================================
   // RETORNAR RESPOSTA SEGURA
   // ========================================

   // A resposta utiliza a mesma estrutura
   // das consultas, sem expor o conteúdo
   // criptografado bruto.
   return prepararProntuarioParaResposta(
     novoProntuario
   );

 }
