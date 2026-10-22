
 // ========================================
 // SERVIÇO DE AUDITORIA DE LOGIN
 // ========================================

 // Responsável por registrar operações
 // relacionadas à autenticação.
 //
 // Não armazena senhas, JWTs ou cookies.

 import { db } from "../prisma/db";


 // ========================================
 // TIPOS DE AÇÕES
 // ========================================

 export type AcaoAuditoriaLogin =
   | "LOGIN_SUCESSO"
   | "LOGIN_FALHA"
   | "LOGIN_BLOQUEADO"
   | "LOGOUT"
  | "SENHA_REDEFINIDA"
  | "SENHA_CRIADA_PRIMEIRO_ACESSO"
  | "SENHA_PRONTUARIO_REDEFINIDA"
  | "SENHA_PRONTUARIO_CRIADA";


 // ========================================
 // RESULTADOS POSSÍVEIS
 // ========================================

 export type ResultadoAuditoriaLogin =
   | "SUCESSO"
   | "FALHA";


 // ========================================
 // DADOS DO REGISTRO
 // ========================================

 export type DadosAuditoriaLogin = {

   // Identificador do usuário,
   // quando conhecido.
   usuarioId?: number | null;

   // ADMIN, MEDICO ou PACIENTE.
   perfil?: string | null;

   // Operação executada.
   acao: AcaoAuditoriaLogin;

   // Resultado da operação.
   resultado: ResultadoAuditoriaLogin;

   // Endereço IP de origem.
   ip?: string | null;

   // Identificador opcional
   // da requisição HTTP.
   requisicaoId?: string | null;
 };


 // ========================================
 // REGISTRAR EVENTO NO POSTGRESQL
 // ========================================

 export async function registrarAuditoriaLogin(
   dados: DadosAuditoriaLogin
 ): Promise<void> {

   // Insere o registro na tabela
   // auditoriaLogin utilizando o
   // Prisma 8 Contract ORM.

   await db.orm.public.AuditoriaLogin.create({

     usuarioId:
       dados.usuarioId ?? null,

     perfil:
       dados.perfil ?? null,

     acao:
       dados.acao,

     resultado:
       dados.resultado,

     ip:
       dados.ip ?? null,

     requisicaoId:
       dados.requisicaoId ?? null

   });

 }
