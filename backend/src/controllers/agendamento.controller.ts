// ========================================
// IMPORTAÇÕES
// ========================================

import { Request, Response } from "express";

import {
  buscarPacientePorUsuarioId,
  criarAgendamento,
  horarioEstaDisponivel,
  listarAgendamentosDoMedico,
  listarAgendamentosDoPaciente,
  listarHorariosDisponiveis
} from "../services/agendamento.service";

import {
  buscarMedicoAgendaPorUsuarioId
} from "../services/agenda.service";


// ========================================
// HORÁRIOS DISPONÍVEIS
// ========================================

// Retorna os horários disponíveis para
// o paciente autenticado em uma data.
//
// O médico NÃO é enviado pelo frontend.
// O backend identifica o médico através
// do paciente autenticado.
export async function horariosDisponiveis(
  req: Request,
  res: Response
) {
  try {
    // Verifica se existe usuário autenticado
    if (!req.usuario) {
      return res.status(401).json({
        mensagem: "Usuário não autenticado."
      });
    }

    // A data será enviada pela URL:
    //
    // /agendamentos/horarios-disponiveis?data=2026-09-15
    const data = req.query.data;

    // Verifica se a data foi informada
    if (
      !data ||
      typeof data !== "string"
    ) {
      return res.status(400).json({
        mensagem:
          "A data deve ser informada."
      });
    }

    // Busca o paciente relacionado
    // ao usuário autenticado.
    const paciente =
      await buscarPacientePorUsuarioId(
        req.usuario.id
      );

    // Verifica se o paciente existe
    if (!paciente) {
      return res.status(404).json({
        mensagem:
          "Paciente não encontrado."
      });
    }

    // Verifica se o paciente está ativo
    if (!paciente.ativo) {
      return res.status(403).json({
        mensagem:
          "Paciente inativo."
      });
    }

    // Verifica se o médico já liberou
    // o acesso desse paciente.
    if (!paciente.acessoLiberado) {
      return res.status(403).json({
        mensagem:
          "Seu acesso ainda não foi liberado pelo médico."
      });
    }

    // Busca somente horários que:
    //
    // - foram criados pelo médico;
    // - estão ativos;
    // - ainda não possuem agendamento.
    const horarios =
      await listarHorariosDisponiveis(
        paciente.medicoId,
        data
      );

    return res.json({
      data,
      horarios
    });
  } catch (erro) {
    console.error(
      "Erro ao buscar horários disponíveis:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Erro interno ao buscar horários disponíveis."
    });
  }
}


// ========================================
// CRIAR AGENDAMENTO
// ========================================

// Cria o agendamento do paciente.
//
// O frontend envia somente:
//
// {
//   "data": "2026-09-15",
//   "horaInicio": "08:30"
// }
//
// medicoId, pacienteId e horaFim
// são definidos pelo backend.
export async function agendarConsulta(
  req: Request,
  res: Response
) {
  try {
    // Verifica autenticação
    if (!req.usuario) {
      return res.status(401).json({
        mensagem:
          "Usuário não autenticado."
      });
    }

    const {
      data,
      horaInicio
    } = req.body;

    // Valida os dados obrigatórios
    if (
      !data ||
      !horaInicio
    ) {
      return res.status(400).json({
        mensagem:
          "Data e horário são obrigatórios."
      });
    }

    // Busca o paciente relacionado
    // ao usuário autenticado.
    const paciente =
      await buscarPacientePorUsuarioId(
        req.usuario.id
      );

    if (!paciente) {
      return res.status(404).json({
        mensagem:
          "Paciente não encontrado."
      });
    }

    if (!paciente.ativo) {
      return res.status(403).json({
        mensagem:
          "Paciente inativo."
      });
    }

    if (!paciente.acessoLiberado) {
      return res.status(403).json({
        mensagem:
          "Seu acesso ainda não foi liberado pelo médico."
      });
    }

    // Confere novamente no backend se
    // esse horário realmente foi liberado
    // pelo médico e continua livre.
    const slot =
      await horarioEstaDisponivel(
        paciente.medicoId,
        data,
        horaInicio
      );

    // Se não encontrar o slot,
    // o paciente tentou agendar um
    // horário inválido ou já ocupado.
    if (!slot) {
      return res.status(409).json({
        mensagem:
          "Este horário não está disponível."
      });
    }

    // Cria o agendamento utilizando
    // somente informações confiáveis
    // definidas pelo backend.
    const agendamento =
      await criarAgendamento({
        medicoId:
          paciente.medicoId,

        pacienteId:
          paciente.id,

        data,

        horaInicio:
          slot.horaInicio,

        horaFim:
          slot.horaFim
      });

    return res.status(201).json({
      mensagem:
        "Consulta agendada com sucesso.",
      agendamento
    });
  } catch (erro) {
    console.error(
      "Erro ao criar agendamento:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Erro interno ao criar agendamento."
    });
  }
}


// ========================================
// AGENDAMENTOS DO PACIENTE
// ========================================

// Retorna todos os agendamentos
// pertencentes ao paciente autenticado.
export async function meusAgendamentos(
  req: Request,
  res: Response
) {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        mensagem:
          "Usuário não autenticado."
      });
    }

    const paciente =
      await buscarPacientePorUsuarioId(
        req.usuario.id
      );

    if (!paciente) {
      return res.status(404).json({
        mensagem:
          "Paciente não encontrado."
      });
    }

    const agendamentos =
      await listarAgendamentosDoPaciente(
        paciente.id
      );

    return res.json({
      agendamentos
    });
  } catch (erro) {
    console.error(
      "Erro ao listar agendamentos do paciente:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Erro interno ao listar agendamentos."
    });
  }
}


// ========================================
// AGENDAMENTOS DO MÉDICO
// ========================================

// Retorna os horários marcados
// do médico autenticado.
export async function agendamentosMedico(
  req: Request,
  res: Response
) {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        mensagem:
          "Usuário não autenticado."
      });
    }

    // Busca o médico através
    // do usuário autenticado.
    const medico =
      await buscarMedicoAgendaPorUsuarioId(
        req.usuario.id
      );

    if (!medico) {
      return res.status(404).json({
        mensagem:
          "Médico não encontrado."
      });
    }

    const agendamentos =
      await listarAgendamentosDoMedico(
        medico.id
      );

    return res.json({
      agendamentos
    });
  } catch (erro) {
    console.error(
      "Erro ao listar agendamentos do médico:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Erro interno ao listar agendamentos."
    });
  }
}