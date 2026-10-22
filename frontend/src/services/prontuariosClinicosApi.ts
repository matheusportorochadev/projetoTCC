import { API_ORIGIN } from "../config/api";

// ========================================
// API CLÍNICA DOS PRONTUÁRIOS
// ========================================
//
// Comunicação entre React e Express.
//
// Responsabilidades:
//
// 1. Listar pacientes da médica.
// 2. Consultar histórico clínico.
// 3. Consultar um prontuário específico.
// 4. Criar novos prontuários.
//
// SEGURANÇA:
//
// - Utilizamos cookies HttpOnly.
// - Não armazenamos prontuários em localStorage.
// - Não enviamos medicoId pelo frontend.
// - Toda autorização é verificada no backend.
// - A descriptografia acontece no servidor.


// ========================================
// CONFIGURAÇÃO
// ========================================

const API_BASE =
  `${API_ORIGIN}/prontuarios/clinicos`;


// ========================================
// TIPOS DOS PACIENTES
// ========================================

export type PacienteProntuario = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
};


// ========================================
// TIPOS DOS PRONTUÁRIOS
// ========================================

export type ProntuarioClinico = {
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

  createdAt: string;

  versaoSchema?: number;
  criptografado?: boolean;
};


// ========================================
// DADOS PARA CRIAÇÃO
// ========================================
//
// O médico é identificado pelo backend.
// Portanto, não existe medicoId aqui.

export type CriarProntuarioDados = {
  queixaPrincipal?: string | null;
  historiaMolestiaAtual?: string | null;
  historiaPatologicaPregressa?: string | null;
  exameFisico?: string | null;
  examesComplementares?: string | null;
  conduta?: string | null;

  prontuarioAnteriorId?: number | null;
};


// ========================================
// RESPOSTA DO HISTÓRICO
// ========================================

export type HistoricoProntuario = {
  paciente: {
    id: number;
    nome: string;
  };

  prontuarios: ProntuarioClinico[];
};


// ========================================
// FORMATOS REAIS DO BACKEND
// ========================================
//
// Estes tipos seguem exatamente o formato
// retornado pelo prontuario.controller.ts.

type RespostaPacientes = {
  pacientes: PacienteProntuario[];
};

type RespostaProntuario = {
  prontuario: ProntuarioClinico;
};

type RespostaCriacao = {
  mensagem: string;
  prontuario: ProntuarioClinico;
};


// ========================================
// ERRO PERSONALIZADO
// ========================================
//
// Permite diferenciar erros de autorização
// de outros problemas de comunicação.
//
// Exemplos:
//
// 401: usuário não autenticado.
// 403: usuário sem autorização.
// 404: recurso não encontrado.

export class ErroApiProntuario extends Error {

  public readonly status: number;

  constructor(
    mensagem: string,
    status: number
  ) {

    super(mensagem);

    this.name = "ErroApiProntuario";

    this.status = status;
  }
}


// ========================================
// INTERPRETAR RESPOSTA HTTP
// ========================================
//
// Converte a resposta JSON e trata erros.
//
// O backend utiliza a propriedade
// "mensagem" para comunicar falhas.

async function interpretarResposta<T>(
  resposta: Response
): Promise<T> {

  const corpo: unknown =
    await resposta.json().catch(
      () => null
    );

  if (!resposta.ok) {

    let mensagem =
      "Não foi possível concluir a operação.";

    if (
      corpo !== null &&
      typeof corpo === "object" &&
      "mensagem" in corpo &&
      typeof corpo.mensagem === "string"
    ) {

      mensagem = corpo.mensagem;

    }

    throw new ErroApiProntuario(
      mensagem,
      resposta.status
    );
  }

  // O resultado é tipado conforme
  // o contrato esperado da operação.
  return corpo as T;
}


// ========================================
// LISTAR PACIENTES
// ========================================
//
// Rota:
// GET /prontuarios/clinicos/pacientes
//
// O backend retorna:
//
// {
//   pacientes: [
//     { id, nome, email, telefone, cpf }
//   ]
// }
//
// Extraímos a propriedade pacientes
// para que o componente receba um array.

export async function listarPacientesProntuarioApi():
  Promise<PacienteProntuario[]> {

  const resposta =
    await fetch(
      `${API_BASE}/pacientes`,
      {
        method: "GET",

        credentials: "include",

        headers: {
          Accept: "application/json"
        },

        cache: "no-store"
      }
    );

  const resultado =
    await interpretarResposta<RespostaPacientes>(
      resposta
    );

  // Confere o formato recebido antes
  // de entregá-lo à interface.
  if (!Array.isArray(resultado?.pacientes)) {

    throw new Error(
      "O servidor retornou uma lista de pacientes inválida."
    );
  }

  return resultado.pacientes;
}


// ========================================
// CONSULTAR HISTÓRICO DO PACIENTE
// ========================================
//
// Rota:
// GET /prontuarios/clinicos/pacientes/:id
//
// O backend retorna:
//
// {
//   paciente: { id, nome },
//   prontuarios: [...]
// }
//
// Este formato já é compatível com
// o componente de histórico.

export async function listarHistoricoProntuarioApi(
  pacienteId: number
): Promise<HistoricoProntuario> {

  const resposta =
    await fetch(
      `${API_BASE}/pacientes/${pacienteId}`,
      {
        method: "GET",

        credentials: "include",

        headers: {
          Accept: "application/json"
        },

        cache: "no-store"
      }
    );

  const resultado =
    await interpretarResposta<HistoricoProntuario>(
      resposta
    );

  if (
    !resultado?.paciente ||
    !Array.isArray(resultado.prontuarios)
  ) {

    throw new Error(
      "O servidor retornou um histórico inválido."
    );
  }

  return resultado;
}


// ========================================
// CONSULTAR PRONTUÁRIO ESPECÍFICO
// ========================================
//
// Rota:
// GET /prontuarios/clinicos/pacientes/:pacienteId/:prontuarioId
//
// O backend retorna:
//
// {
//   prontuario: {
//     id,
//     pacienteId,
//     medicoId,
//     ...
//   }
// }
//
// Precisamos extrair a propriedade
// prontuario para o componente React.

export async function buscarProntuarioClinicoApi(
  pacienteId: number,
  prontuarioId: number
): Promise<ProntuarioClinico> {

  const resposta =
    await fetch(
      `${API_BASE}/pacientes/${pacienteId}/${prontuarioId}`,
      {
        method: "GET",

        credentials: "include",

        headers: {
          Accept: "application/json"
        },

        cache: "no-store"
      }
    );

  const resultado =
    await interpretarResposta<RespostaProntuario>(
      resposta
    );

  if (
    !resultado?.prontuario ||
    typeof resultado.prontuario.id !== "number"
  ) {

    throw new Error(
      "O servidor retornou um prontuário inválido."
    );
  }

  return resultado.prontuario;
}


// ========================================
// CRIAR NOVO PRONTUÁRIO
// ========================================
//
// Rota:
// POST /prontuarios/clinicos/pacientes/:pacienteId
//
// O backend retorna HTTP 201:
//
// {
//   mensagem: "Prontuário cadastrado com sucesso.",
//   prontuario: { ... }
// }
//
// Extraímos o registro criado.
//
// O backend criptografa o conteúdo antes
// de salvar no PostgreSQL e registra a
// operação na auditoria.

export async function criarProntuarioClinicoApi(
  pacienteId: number,
  dados: CriarProntuarioDados
): Promise<ProntuarioClinico> {

  const resposta =
    await fetch(
      `${API_BASE}/pacientes/${pacienteId}`,
      {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },

        body: JSON.stringify(dados)
      }
    );

  const resultado =
    await interpretarResposta<RespostaCriacao>(
      resposta
    );

  if (
    !resultado?.prontuario ||
    typeof resultado.prontuario.id !== "number"
  ) {

    throw new Error(
      "O servidor não retornou o prontuário criado."
    );
  }

  return resultado.prontuario;
}
