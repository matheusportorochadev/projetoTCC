// Dependências do controller de médicos
import type { Request, Response } from "express";
import {
  criarMedico,
  listarMedicos,
  buscarMedicoPorId,
  atualizarStatusMedico,
  excluirMedico
} from "../services/medico.service";

// Recebe os dados e cadastra um novo médico
export async function criarMedicoController(
  req: Request,
  res: Response
) {
  try {
    const { nome, email, senha, crm } = req.body;

    if (!nome || !email || !senha || !crm) {
      return res.status(400).json({
        mensagem: "Nome, e-mail, senha e CRM são obrigatórios."
      });
    }

    const medico = await criarMedico({
      nome,
      email,
      senha,
      crm
    });

    return res.status(201).json({
      mensagem: "Médico cadastrado com sucesso.",
      medico
    });
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro interno do servidor.";

    return res.status(400).json({
      mensagem
    });
  }
}

// Retorna todos os médicos cadastrados
export async function listarMedicosController(
  req: Request,
  res: Response
) {
  try {
    const medicos = await listarMedicos();

    return res.status(200).json({
      medicos
    });
  } catch {
    return res.status(500).json({
      mensagem: "Erro ao listar médicos."
    });
  }
}

// Retorna um médico pelo ID
export async function buscarMedicoPorIdController(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do médico inválido."
      });
    }

    const medico = await buscarMedicoPorId(id);

    return res.status(200).json({
      medico
    });
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro interno do servidor.";

    return res.status(404).json({
      mensagem
    });
  }
}

// Ativa ou bloqueia um médico
export async function atualizarStatusMedicoController(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);
    const { ativo } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do médico inválido."
      });
    }

    if (typeof ativo !== "boolean") {
      return res.status(400).json({
        mensagem: "O campo ativo deve ser verdadeiro ou falso."
      });
    }

    const medico = await atualizarStatusMedico(id, ativo);

    return res.status(200).json({
      mensagem: ativo
        ? "Médico ativado com sucesso."
        : "Médico bloqueado com sucesso.",
      medico
    });
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro interno do servidor.";

    return res.status(400).json({
      mensagem
    });
  }
}

// Exclui um médico
export async function excluirMedicoController(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do médico inválido."
      });
    }

    const resultado = await excluirMedico(id);

    return res.status(200).json(resultado);
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro interno do servidor.";

    return res.status(400).json({
      mensagem
    });
  }
}