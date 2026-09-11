// Tipos do Express
import type {
  Request,
  Response
} from "express";


// Funções do service de pacientes
import {
  buscarMedicoPorUsuarioId,
  criarPaciente,
  listarPacientes,
  buscarPacientePorId,
  atualizarPaciente,
  atualizarStatusPaciente,
  atualizarAcessoPaciente,
  excluirPaciente
} from "../services/paciente.service";


// ========================================
// TIPO DA REQUISIÇÃO AUTENTICADA
// ========================================

// Este tipo representa os possíveis campos
// adicionados pelo middleware de autenticação.
//
// Dependendo de como o authMiddleware
// estiver implementado, o ID pode estar em:
//
// req.usuarioId
// req.userId
// req.usuario.id
type RequestAutenticado =
  Request & {
    usuarioId?: number;

    userId?: number;

    usuario?: {
      id?: number;
      tipo?: string;
    };
  };


// ========================================
// OBTER USUÁRIO AUTENTICADO
// ========================================

// Extrai o ID do usuário autenticado
// que foi colocado na requisição
// pelo middleware JWT.
function obterUsuarioId(
  req: Request
): number {
  const requisicao =
    req as RequestAutenticado;


  const usuarioId =
    requisicao.usuarioId ??
    requisicao.userId ??
    requisicao.usuario?.id;


  if (!usuarioId) {
    throw new Error(
      "Usuário não autenticado."
    );
  }


  return Number(usuarioId);
}


// ========================================
// OBTER / VALIDAR ID
// ========================================

// O Express pode tipar um parâmetro
// da URL como:
//
// string
// string[]
// undefined
//
// Por isso tratamos todas
// essas possibilidades aqui.
function obterId(
  valor:
    | string
    | string[]
    | undefined
): number {
  // Caso o parâmetro venha como array,
  // utiliza apenas o primeiro valor.
  const valorNormalizado =
    Array.isArray(valor)
      ? valor[0]
      : valor;


  // Converte o valor recebido
  // para número.
  const id =
    Number(valorNormalizado);


  // O ID precisa ser um inteiro
  // positivo.
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "ID do paciente inválido."
    );
  }


  return id;
}


// ========================================
// CRIAR PACIENTE
// ========================================

// POST /pacientes
export async function criarPacienteController(
  req: Request,
  res: Response
) {
  try {
    // ========================================
    // USUÁRIO AUTENTICADO
    // ========================================

    const usuarioId =
      obterUsuarioId(req);


    // ========================================
    // BUSCAR MÉDICO
    // ========================================

    // O medicoId não vem do frontend.
    //
    // O backend identifica o médico
    // através do usuário autenticado.
    const medico =
      await buscarMedicoPorUsuarioId(
        usuarioId
      );


    // ========================================
    // DADOS RECEBIDOS
    // ========================================

    const {
      nome,
      email,
      telefone,
      cpf
    } = req.body;


    // ========================================
    // VALIDAR NOME
    // ========================================

    if (
      typeof nome !== "string" ||
      !nome.trim()
    ) {
      return res.status(400).json({
        mensagem:
          "O nome é obrigatório."
      });
    }


    // ========================================
    // CRIAR PACIENTE
    // ========================================

    const paciente =
      await criarPaciente({
        medicoId:
          medico.id,

        nome,

        email:
          typeof email === "string"
            ? email
            : undefined,

        telefone:
          typeof telefone === "string"
            ? telefone
            : undefined,

        cpf:
          typeof cpf === "string"
            ? cpf
            : undefined
      });


    return res.status(201).json(
      paciente
    );
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao criar paciente.";


    return res.status(400).json({
      mensagem
    });
  }
}


// ========================================
// LISTAR PACIENTES
// ========================================

// GET /pacientes
export async function listarPacientesController(
  req: Request,
  res: Response
) {
  try {
    // Busca o usuário autenticado.
    const usuarioId =
      obterUsuarioId(req);


    // Descobre qual médico
    // pertence ao usuário.
    const medico =
      await buscarMedicoPorUsuarioId(
        usuarioId
      );


    // Lista somente pacientes
    // pertencentes ao médico.
    const pacientes =
      await listarPacientes(
        medico.id
      );


    return res.status(200).json(
      pacientes
    );
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao listar pacientes.";


    return res.status(400).json({
      mensagem
    });
  }
}


// ========================================
// BUSCAR PACIENTE
// ========================================

// GET /pacientes/:id
export async function buscarPacienteController(
  req: Request,
  res: Response
) {
  try {
    // ========================================
    // USUÁRIO AUTENTICADO
    // ========================================

    const usuarioId =
      obterUsuarioId(req);


    // ========================================
    // ID DO PACIENTE
    // ========================================

    // A função obterId já trata:
    //
    // string
    // string[]
    // undefined
    const id =
      obterId(
        req.params.id
      );


    // ========================================
    // BUSCAR MÉDICO
    // ========================================

    const medico =
      await buscarMedicoPorUsuarioId(
        usuarioId
      );


    // ========================================
    // BUSCAR PACIENTE
    // ========================================

    const paciente =
      await buscarPacientePorId(
        id,
        medico.id
      );


    return res.status(200).json(
      paciente
    );
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao buscar paciente.";


    return res.status(400).json({
      mensagem
    });
  }
}


// ========================================
// ATUALIZAR PACIENTE
// ========================================

// PATCH /pacientes/:id
export async function atualizarPacienteController(
  req: Request,
  res: Response
) {
  try {
    // Usuário autenticado.
    const usuarioId =
      obterUsuarioId(req);


    // ID do paciente.
    const id =
      obterId(
        req.params.id
      );


    // Médico autenticado.
    const medico =
      await buscarMedicoPorUsuarioId(
        usuarioId
      );


    // ========================================
    // DADOS RECEBIDOS
    // ========================================

    const {
      nome,
      email,
      telefone,
      cpf
    } = req.body;


    // Objeto utilizado para enviar
    // somente os dados informados
    // para o service.
    const dados: {
      nome?: string;
      email?: string;
      telefone?: string;
      cpf?: string;
    } = {};


    // ========================================
    // NOME
    // ========================================

    if (
      nome !== undefined
    ) {
      dados.nome =
        String(nome);
    }


    // ========================================
    // E-MAIL
    // ========================================

    if (
      email !== undefined
    ) {
      dados.email =
        String(email);
    }


    // ========================================
    // TELEFONE
    // ========================================

    if (
      telefone !== undefined
    ) {
      dados.telefone =
        String(telefone);
    }


    // ========================================
    // CPF
    // ========================================

    if (
      cpf !== undefined
    ) {
      dados.cpf =
        String(cpf);
    }


    // ========================================
    // ATUALIZAR
    // ========================================

    const paciente =
      await atualizarPaciente(
        id,
        medico.id,
        dados
      );


    return res.status(200).json(
      paciente
    );
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao atualizar paciente.";


    return res.status(400).json({
      mensagem
    });
  }
}


// ========================================
// ATUALIZAR STATUS DO PACIENTE
// ========================================

// PATCH /pacientes/:id/status
export async function atualizarStatusPacienteController(
  req: Request,
  res: Response
) {
  try {
    // Usuário autenticado.
    const usuarioId =
      obterUsuarioId(req);


    // ID do paciente.
    const id =
      obterId(
        req.params.id
      );


    // Valor enviado pelo frontend.
    const {
      ativo
    } = req.body;


    // ========================================
    // VALIDAR STATUS
    // ========================================

    if (
      typeof ativo !== "boolean"
    ) {
      return res.status(400).json({
        mensagem:
          "O campo ativo deve ser true ou false."
      });
    }


    // ========================================
    // BUSCAR MÉDICO
    // ========================================

    const medico =
      await buscarMedicoPorUsuarioId(
        usuarioId
      );


    // ========================================
    // ATUALIZAR STATUS
    // ========================================

    const paciente =
      await atualizarStatusPaciente(
        id,
        medico.id,
        ativo
      );


    return res.status(200).json(
      paciente
    );
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao atualizar status do paciente.";


    return res.status(400).json({
      mensagem
    });
  }
}


// ========================================
// LIBERAR / BLOQUEAR ACESSO
// ========================================

// PATCH /pacientes/:id/acesso
export async function atualizarAcessoPacienteController(
  req: Request,
  res: Response
) {
  try {
    // Usuário autenticado.
    const usuarioId =
      obterUsuarioId(req);


    // ID do paciente.
    const id =
      obterId(
        req.params.id
      );


    // Valor enviado pelo frontend.
    const {
      acessoLiberado
    } = req.body;


    // ========================================
    // VALIDAR ACESSO
    // ========================================

    if (
      typeof acessoLiberado !==
      "boolean"
    ) {
      return res.status(400).json({
        mensagem:
          "O campo acessoLiberado deve ser true ou false."
      });
    }


    // ========================================
    // BUSCAR MÉDICO
    // ========================================

    const medico =
      await buscarMedicoPorUsuarioId(
        usuarioId
      );


    // ========================================
    // ATUALIZAR ACESSO
    // ========================================

    const paciente =
      await atualizarAcessoPaciente(
        id,
        medico.id,
        acessoLiberado
      );


    return res.status(200).json(
      paciente
    );
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao atualizar acesso do paciente.";


    return res.status(400).json({
      mensagem
    });
  }
}


// ========================================
// EXCLUIR PACIENTE
// ========================================

// DELETE /pacientes/:id
//
// O médico só poderá excluir
// um paciente pertencente a ele.
export async function excluirPacienteController(
  req: Request,
  res: Response
) {
  try {
    // ========================================
    // USUÁRIO AUTENTICADO
    // ========================================

    const usuarioId =
      obterUsuarioId(req);


    // ========================================
    // ID DO PACIENTE
    // ========================================

    const id =
      obterId(
        req.params.id
      );


    // ========================================
    // BUSCAR MÉDICO
    // ========================================

    const medico =
      await buscarMedicoPorUsuarioId(
        usuarioId
      );


    // ========================================
    // EXCLUIR PACIENTE
    // ========================================

    const resultado =
      await excluirPaciente(
        id,
        medico.id
      );


    return res.status(200).json(
      resultado
    );
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao excluir paciente.";


    return res.status(400).json({
      mensagem
    });
  }
}