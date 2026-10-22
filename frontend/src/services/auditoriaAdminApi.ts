import { API_ORIGIN } from "../config/api";

/* ========================================
   API DE AUDITORIA ADMINISTRATIVA

   MÓDULOS:
   - Prontuários
   - Agenda
   - Pacientes
   - Login e Segurança

   Nunca solicita conteúdo clínico.

   Os logs de autenticação não incluem:
   - Senhas
   - Tokens JWT
   - Cookies
   - Códigos de recuperação
======================================== */

const API_URL = API_ORIGIN;


// ========================================
// MÓDULOS DISPONÍVEIS
// ========================================

// O tipo controla os caminhos permitidos
// ao consultar a auditoria.
//
// NOVO:
// O módulo "login" corresponde à rota:
//
// GET /admin/auditoria/login

export type ModuloAuditoria =
  | "prontuarios"
  | "agenda"
  | "pacientes"
  | "login";


// ========================================
// AUDITORIA DE PRONTUÁRIOS
// ========================================

export type EventoAuditoriaProntuario = {
  id: number;
  usuarioId: number | null;
  medicoId: number | null;
  pacienteId: number | null;
  prontuarioId: number | null;
  acao: string;
  resultado: string;
  requisicaoId: string | null;
  createdAt: string;
};


// ========================================
// AUDITORIA DA AGENDA
// ========================================

export type EventoAuditoriaAgenda = {
  id: number;
  usuarioId: number | null;
  medicoId: number | null;
  disponibilidadeId: number | null;
  agendamentoId: number | null;
  acao: string;
  resultado: string;
  dataAgenda: string | null;
  horaInicio: string | null;
  horaFim: string | null;
  requisicaoId: string | null;
  createdAt: string;
};


// ========================================
// AUDITORIA DE PACIENTES
// ========================================

// Representa os eventos registrados
// na tabela AuditoriaPaciente.
//
// O paciente é identificado somente
// pelo ID, sem expor dados pessoais.

export type EventoAuditoriaPaciente = {
  id: number;
  usuarioId: number | null;
  medicoId: number | null;
  pacienteId: number | null;
  acao: string;
  resultado: string;
  requisicaoId: string | null;
  createdAt: string;
};


// ========================================
// NOVO — AUDITORIA DE LOGIN E SEGURANÇA
// ========================================

/*
  Representa os registros armazenados
  na tabela AuditoriaLogin.

  Eventos disponíveis:

  LOGIN_SUCESSO
  LOGIN_FALHA
  LOGIN_BLOQUEADO
  LOGOUT

  O backend retorna apenas metadados
  necessários à auditoria.

  usuarioId pode ser null quando
  não houve autenticação válida.

  perfil pode ser null quando
  o usuário não foi identificado.
*/

export type EventoAuditoriaLogin = {

  // Nome do usuário identificado
  // pelo backend na tabela Usuario.
  usuarioNome: string | null;

  // Identificador do evento.
  id: number;

  // Usuário relacionado ao evento,
  // quando identificado.
  usuarioId: number | null;

  // Perfil do usuário:
  // ADMIN, MEDICO ou PACIENTE.
  perfil: string | null;

  // Tipo da operação.
  acao: string;

  // SUCESSO ou FALHA.
  resultado: string;

  // Endereço IP registrado.
  ip: string | null;

  // Identificador opcional da requisição.
  requisicaoId: string | null;

  // Data e horário do evento.
  createdAt: string;
};


// ========================================
// UNIÃO DOS EVENTOS
// ========================================

/*
  Permite que a página Admin.tsx
  trabalhe com os quatro módulos.

  Preservamos todos os tipos anteriores
  e acrescentamos EventoAuditoriaLogin.

  Cada módulo possui campos específicos.

  Por exemplo:

  - Agenda possui agendamentoId.
  - Pacientes possui pacienteId.
  - Prontuários possui prontuarioId.
  - Login possui perfil e ip.

  O frontend deve verificar o módulo
  antes de acessar campos específicos.
*/

export type EventoAuditoria =
  | EventoAuditoriaProntuario
  | EventoAuditoriaAgenda
  | EventoAuditoriaPaciente
  | EventoAuditoriaLogin;


// ========================================
// FILTROS DA AUDITORIA
// ========================================

/*
  Filtros compartilhados pelos módulos.

  IMPORTANTE:

  medicoId se aplica aos módulos:

  - Prontuários
  - Agenda
  - Pacientes

  Na auditoria de Login e Segurança,
  não enviamos medicoId.

  Os demais filtros continuam
  disponíveis para todos os módulos.
*/

export type FiltrosAuditoria = {
  medicoId?: number;
  acao?: string;
  resultado?: "SUCESSO" | "FALHA";
  dataInicio?: string;
  dataFim?: string;

  // Página solicitada ao backend.
  pagina?: number;
};


// ========================================
// RESPOSTA DO BACKEND
// ========================================

/*
  Todas as rotas administrativas
  utilizam o mesmo formato:

  {
    totalRetornado: number,
    registros: [...]
  }

  Isso permite reutilizar a lógica
  existente na página Admin.tsx.
*/

export type RespostaAuditoria = {
  // Quantidade carregada nesta página.
  totalRetornado: number;

  // Metadados retornados pelos módulos
  // que já possuem paginação completa.
  total?: number;
  sucessos?: number;
  falhas?: number;
  pagina?: number;
  tamanhoPagina?: number;
  totalPaginas?: number;

  // Registros da página consultada.
  registros: EventoAuditoria[];
};


// ========================================
// LER RESPOSTA SEGURA
// ========================================

// Verifica se o backend retornou JSON.
//
// Isso evita erros pouco claros quando
// uma rota retorna HTML, por exemplo
// devido a um endereço incorreto.

async function lerRespostaSegura(
  resposta: Response,
  endereco: string
): Promise<unknown> {

  const corpo = await resposta.text();

  const tipo =
    resposta.headers.get("content-type") ?? "";

  const pareceHtml =
    /^\s*(?:<!doctype\s+html|<html[\s>])/i
      .test(corpo);


  // ========================================
  // VALIDAR CONTENT-TYPE
  // ========================================

  if (
    pareceHtml ||
    !tipo.toLowerCase().includes("application/json")
  ) {
    throw new Error(
      `A rota de auditoria não retornou JSON (HTTP ${resposta.status}). ` +
      `Endereço: ${endereco}. ` +
      "Confira se o backend está ativo e se a rota está registrada."
    );
  }


  // ========================================
  // CONVERTER JSON
  // ========================================

  let dados: unknown;

  try {
    dados = JSON.parse(corpo);
  } catch {
    throw new Error(
      `O backend retornou JSON inválido (HTTP ${resposta.status}). ` +
      `Endereço: ${endereco}.`
    );
  }


  // ========================================
  // VALIDAR STATUS HTTP
  // ========================================

  if (!resposta.ok) {

    const mensagem =
      typeof dados === "object" &&
      dados !== null &&
      "mensagem" in dados &&
      typeof dados.mensagem === "string"
        ? dados.mensagem
        : "Falha ao consultar os logs.";

    throw new Error(
      `HTTP ${resposta.status}: ${mensagem}`
    );
  }

  return dados;
}


// ========================================
// LISTAR AUDITORIA ADMINISTRATIVA
// ========================================

/*
  Preserva a chamada original:

  listarAuditoriaAdmin(filtros)

  Por padrão consulta prontuários.

  Também permite informar:

  "agenda"
  "pacientes"
  "login"

  Exemplos:

  listarAuditoriaAdmin({}, "agenda")

  listarAuditoriaAdmin({}, "pacientes")

  listarAuditoriaAdmin({}, "login")

  A autenticação permanece baseada
  no cookie HttpOnly já existente.
*/

export async function listarAuditoriaAdmin(
  filtros: FiltrosAuditoria = {},
  modulo: ModuloAuditoria = "prontuarios"
): Promise<RespostaAuditoria> {

  // ========================================
  // MONTAR FILTROS
  // ========================================

  const parametros = new URLSearchParams();


  // ========================================
  // FILTRO DE MÉDICO
  // ========================================

  /*
    NOVO:

    A rota de auditoria de login não
    aceita o parâmetro medicoId.

    Por isso, mesmo que o administrador
    tenha selecionado um médico em
    outro módulo, não enviamos esse
    parâmetro ao consultar login.

    Isso evita receber HTTP 400
    desnecessariamente.
  */

  if (
    modulo !== "login" &&
    filtros.medicoId
  ) {
    parametros.set(
      "medicoId",
      String(filtros.medicoId)
    );
  }


  // ========================================
  // FILTRO DE AÇÃO
  // ========================================

  if (filtros.acao) {
    parametros.set(
      "acao",
      filtros.acao
    );
  }


  // ========================================
  // FILTRO DE RESULTADO
  // ========================================

  if (filtros.resultado) {
    parametros.set(
      "resultado",
      filtros.resultado
    );
  }


  // ========================================
  // FILTRO DE DATA INICIAL
  // ========================================

  if (filtros.dataInicio) {
    parametros.set(
      "dataInicio",
      filtros.dataInicio
    );
  }


  // ========================================
  // FILTRO DE DATA FINAL
  // ========================================

  if (filtros.dataFim) {
    parametros.set(
      "dataFim",
      filtros.dataFim
    );
  }


  // ========================================
  // MONTAR ENDEREÇO
  // ========================================

  /*
    O endereço depende do módulo.

    Exemplos:

    /admin/auditoria/prontuarios

    /admin/auditoria/agenda

    /admin/auditoria/pacientes

    /admin/auditoria/login
  */

  // ========================================
  // PAGINAÇÃO
  // ========================================
  // A página é enviada na URL.
  // O PostgreSQL retorna somente os
  // registros solicitados.

  const pagina = filtros.pagina ?? 1;

  if (!Number.isSafeInteger(pagina) || pagina < 1) {
    throw new Error("Página inválida.");
  }

  parametros.set("pagina", String(pagina));

  const query = parametros.toString();

  const endereco =
    `${API_URL}/admin/auditoria/${modulo}` +
    (query ? `?${query}` : "");


  // ========================================
  // EXECUTAR REQUISIÇÃO
  // ========================================

  const resposta = await fetch(endereco, {
    method: "GET",

    // Envia automaticamente o cookie
    // de autenticação HttpOnly.
    //
    // O token não é lido pelo React.
    credentials: "include",

    headers: {
      Accept: "application/json"
    }
  });


  // ========================================
  // VALIDAR RESPOSTA
  // ========================================

  const dados =
    await lerRespostaSegura(
      resposta,
      endereco
    );

  if (
    typeof dados !== "object" ||
    dados === null ||
    !("registros" in dados) ||
    !Array.isArray(dados.registros) ||
    !("totalRetornado" in dados) ||
    typeof dados.totalRetornado !== "number"
  ) {
    throw new Error(
      "O backend retornou uma lista de auditoria inválida."
    );
  }


  // ========================================
  // RETORNAR REGISTROS
  // ========================================

  return dados as RespostaAuditoria;
}
