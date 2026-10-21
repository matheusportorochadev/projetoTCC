
// ========================================
// CONTROLLER DE PRONTUÁRIOS MÉDICOS
// ========================================
//
// Responsabilidades:
//
// 1. Listar pacientes do médico.
// 2. Consultar histórico de prontuários.
// 3. Consultar um prontuário específico.
// 4. Criar um novo prontuário.
//
// A autorização adicional será exigida
// pelas rotas, antes deste controller.
//
// Não existem endpoints para editar ou
// excluir registros clínicos anteriores.

import type {
  Request,
  Response
} from "express";

import {
  pacienteIdProntuarioSchema,
  prontuarioIdSchema
} from "../schemas/prontuario.schema";

import type {
  CriarProntuarioDTO
} from "../schemas/prontuario.schema";

import {
  listarPacientesParaProntuario,
  listarHistoricoProntuarios,
  buscarProntuarioPorId,
  criarNovoProntuario
} from "../services/prontuario.service";


// ========================================
// IDENTIFICAR MÉDICO AUTENTICADO
// ========================================
//
// O usuário é definido anteriormente
// pelo authMiddleware.
//
// Nunca buscamos médico pelo ID
// fornecido no corpo da requisição.

function obterUsuarioId(
  req: Request
): number | null {

  if (
    !req.usuario ||
    req.usuario.tipo !== "MEDICO"
  ) {
    return null;
  }

  return req.usuario.id;
}


// ========================================
// LER IDENTIFICADOR DA URL
// ========================================
//
// req.params pode conter valores
// inválidos ou ausentes.
//
// Utilizamos os schemas Zod para
// impedir IDs negativos, decimais
// ou valores que não sejam números.

function obterPacienteId(
  req: Request
): number | null {

  const resultado =
    pacienteIdProntuarioSchema.safeParse(
      req.params.pacienteId
    );

  if (!resultado.success) {
    return null;
  }

  return resultado.data;
}

function obterProntuarioId(
  req: Request
): number | null {

  const resultado =
    prontuarioIdSchema.safeParse(
      req.params.prontuarioId
    );

  if (!resultado.success) {
    return null;
  }

  return resultado.data;
}


// ========================================
// TRATAMENTO DE ERROS DO SERVICE
// ========================================
//
// Mensagens de erro internas não devem
// revelar informações sobre outros
// médicos ou pacientes.
//
// O frontend recebe respostas simples.

function responderErro(
  res: Response,
  erro: unknown,
  operacao: string
) {

  const mensagem =
    erro instanceof Error
      ? erro.message
      : "";

  // Pacientes ou registros de outros
  // médicos também resultam em 404.
  if (
    mensagem === "Paciente não encontrado." ||
    mensagem === "Prontuário não encontrado."
  ) {

    return res.status(404).json({
      mensagem
    });
  }

  if (
    mensagem ===
      "Não é possível criar um prontuário para um paciente inativo." ||
    mensagem ===
      "Prontuário anterior inválido."
  ) {

    return res.status(400).json({
      mensagem
    });
  }

  console.error(
    `[PRONTUARIOS] Erro em ${operacao}:`,
    erro
  );

  return res.status(500).json({
    mensagem:
      "Não foi possível realizar esta operação nos prontuários."
  });
}


// ========================================
// LISTAR PACIENTES
// ========================================
//
// GET /prontuarios/clinicos/pacientes
//
// Retorna somente pacientes ativos
// pertencentes ao médico autenticado.
//
// Essa listagem será usada no campo
// de pesquisa do frontend.

export async function listarPacientesProntuarioController(
  req: Request,
  res: Response
) {

  const usuarioId =
    obterUsuarioId(req);

  if (usuarioId === null) {

    return res.status(403).json({
      mensagem:
        "Acesso permitido somente para médicos."
    });
  }

  try {

    const pacientes =
      await listarPacientesParaProntuario(
        usuarioId
      );

    return res.status(200).json({
      pacientes
    });

  } catch (erro) {

    return responderErro(
      res,
      erro,
      "listar pacientes"
    );
  }
}


// ========================================
// LISTAR HISTÓRICO CLÍNICO
// ========================================
//
// GET /prontuarios/clinicos/pacientes/:pacienteId
//
// Busca todos os prontuários do
// paciente, do mais recente para
// o mais antigo.
//
// O service verifica a propriedade
// antes de acessar os registros.

export async function listarHistoricoProntuarioController(
  req: Request,
  res: Response
) {

  const usuarioId =
    obterUsuarioId(req);

  if (usuarioId === null) {

    return res.status(403).json({
      mensagem:
        "Acesso permitido somente para médicos."
    });
  }

  const pacienteId =
    obterPacienteId(req);

  if (pacienteId === null) {

    return res.status(400).json({
      mensagem:
        "Identificador do paciente inválido."
    });
  }

  try {

    const resultado =
      await listarHistoricoProntuarios(
        usuarioId,
        pacienteId
      );

    return res.status(200).json(
      resultado
    );

  } catch (erro) {

    return responderErro(
      res,
      erro,
      "consultar histórico"
    );
  }
}


// ========================================
// CONSULTAR REGISTRO ESPECÍFICO
// ========================================
//
// GET
// /prontuarios/clinicos/pacientes/:pacienteId/:prontuarioId
//
// O backend exige que o prontuário
// pertença ao paciente informado e
// ao médico autenticado.

export async function consultarProntuarioController(
  req: Request,
  res: Response
) {

  const usuarioId =
    obterUsuarioId(req);

  if (usuarioId === null) {

    return res.status(403).json({
      mensagem:
        "Acesso permitido somente para médicos."
    });
  }

  const pacienteId =
    obterPacienteId(req);

  const prontuarioId =
    obterProntuarioId(req);

  if (
    pacienteId === null ||
    prontuarioId === null
  ) {

    return res.status(400).json({
      mensagem:
        "Identificador do paciente ou prontuário inválido."
    });
  }

  try {

    const prontuario =
      await buscarProntuarioPorId(
        usuarioId,
        pacienteId,
        prontuarioId
      );

    return res.status(200).json({
      prontuario
    });

  } catch (erro) {

    return responderErro(
      res,
      erro,
      "consultar prontuário"
    );
  }
}


// ========================================
// CRIAR NOVO PRONTUÁRIO
// ========================================
//
// POST /prontuarios/clinicos/pacientes/:pacienteId
//
// O body é validado pelo Zod,
// antes de chegar ao controller.
//
// medicoId é sempre obtido pela
// autenticação do sistema.
//
// Cada criação gera um novo registro.

export async function criarProntuarioController(
  req: Request,
  res: Response
) {

  const usuarioId =
    obterUsuarioId(req);

  if (usuarioId === null) {

    return res.status(403).json({
      mensagem:
        "Acesso permitido somente para médicos."
    });
  }

  const pacienteId =
    obterPacienteId(req);

  if (pacienteId === null) {

    return res.status(400).json({
      mensagem:
        "Identificador do paciente inválido."
    });
  }

  try {

    // O middleware validarBody já
    // aplicou o schema de criação.
    const dados =
      req.body as CriarProntuarioDTO;

    const prontuario =
      await criarNovoProntuario(
        usuarioId,
        pacienteId,
        dados
      );

    // HTTP 201 indica criação
    // bem-sucedida de um recurso.
    return res.status(201).json({

      mensagem:
        "Prontuário cadastrado com sucesso.",

      prontuario

    });

  } catch (erro) {

    return responderErro(
      res,
      erro,
      "criar prontuário"
    );
  }
}
