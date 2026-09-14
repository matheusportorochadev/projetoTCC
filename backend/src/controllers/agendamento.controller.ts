// ========================================
// IMPORTAÇÕES
// ========================================

import { Request, Response } from "express";

import {
  buscarPacientePorUsuarioId,
  cancelarAgendamento,
  confirmarAgendamento,
  criarAgendamento,
  horarioEstaDisponivel,
  listarAgendamentosDoMedico,
  listarAgendamentosDoPaciente,
  listarHorariosDisponiveis,
  recusarAgendamento,
  remarcarAgendamento
} from "../services/agendamento.service";

import {
  buscarMedicoAgendaPorUsuarioId
} from "../services/agenda.service";


// ========================================
// FUNÇÃO AUXILIAR — VALIDAR ID
// ========================================

// Recebe o ID vindo da URL.
//
// Exemplo:
//
// /agendamentos/15/confirmar
//
// req.params.id → "15"
//
// Utilizamos unknown para não depender
// da tipagem específica utilizada
// pela versão atual do Express.
function obterIdAgendamento(
  idRecebido: unknown
): number | null {

  // O parâmetro precisa existir
  // e ser uma string.
  if (
    typeof idRecebido !== "string" ||
    idRecebido.trim() === ""
  ) {
    return null;
  }

  // Converte a string para número.
  const id = Number(idRecebido);

  // O ID precisa ser:
  //
  // - um número válido;
  // - inteiro;
  // - maior que zero.
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}


// ========================================
// HORÁRIOS DISPONÍVEIS
// ========================================

// Retorna os horários disponíveis para
// o paciente autenticado em uma data.
//
// O médico NÃO é enviado pelo frontend.
//
// O backend identifica o médico através
// do próprio paciente autenticado.
export async function horariosDisponiveis(
  req: Request,
  res: Response
) {
  try {

    // Verifica se existe usuário autenticado.
    if (!req.usuario) {
      return res.status(401).json({
        mensagem:
          "Usuário não autenticado."
      });
    }

    // Exemplo:
    //
    // /agendamentos/horarios-disponiveis?data=2026-09-15
    const data = req.query.data;

    // Verifica se a data foi informada.
    if (
      !data ||
      typeof data !== "string"
    ) {
      return res.status(400).json({
        mensagem:
          "A data deve ser informada."
      });
    }

    // Busca o paciente através
    // do usuarioId presente no JWT.
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

    // Paciente inativo não pode
    // consultar horários.
    if (!paciente.ativo) {
      return res.status(403).json({
        mensagem:
          "Paciente inativo."
      });
    }

    // O acesso precisa ter sido
    // liberado pelo médico.
    if (!paciente.acessoLiberado) {
      return res.status(403).json({
        mensagem:
          "Seu acesso ainda não foi liberado pelo médico."
      });
    }

    // Busca somente os horários
    // realmente disponíveis.
    //
    // Atualmente bloqueiam o slot:
    //
    // PENDENTE
    // AGENDADA (legado)
    // CONFIRMADA
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
// CRIAR SOLICITAÇÃO DE AGENDAMENTO
// ========================================

// O paciente envia:
//
// {
//   "data": "2026-09-15",
//   "horaInicio": "08:30"
// }
//
// O frontend NÃO define:
//
// - medicoId;
// - pacienteId;
// - horaFim;
// - status.
//
// Esses dados são definidos
// pelo backend.
//
// Novo fluxo:
//
// paciente seleciona horário
//        ↓
// backend valida
//        ↓
// PENDENTE
//        ↓
// médico confirma ou recusa
export async function agendarConsulta(
  req: Request,
  res: Response
) {
  try {

    // Verifica autenticação.
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

    // Valida os campos obrigatórios.
    if (
      !data ||
      !horaInicio ||
      typeof data !== "string" ||
      typeof horaInicio !== "string"
    ) {
      return res.status(400).json({
        mensagem:
          "Data e horário são obrigatórios."
      });
    }

    // Busca o paciente autenticado.
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

    // Revalida o horário no backend.
    //
    // Mesmo que o frontend tenha exibido
    // o horário como disponível anteriormente,
    // ele pode ter sido ocupado nesse intervalo.
    const slot =
      await horarioEstaDisponivel(
        paciente.medicoId,
        data,
        horaInicio
      );

    if (!slot) {
      return res.status(409).json({
        mensagem:
          "Este horário não está disponível."
      });
    }

    // Cria a solicitação.
    //
    // O service define:
    //
    // status = PENDENTE
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
        "Solicitação enviada. Aguarde a confirmação do médico.",

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

// Retorna somente os agendamentos
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

// Retorna os agendamentos pertencentes
// ao médico autenticado.
//
// O medicoId NÃO vem do frontend.
//
// Ele é descoberto através do usuarioId
// existente no JWT.
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

    // Busca o médico relacionado
    // ao usuário autenticado.
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


// ========================================
// CONFIRMAR AGENDAMENTO
// ========================================

// Fluxo:
//
// PENDENTE
//    ↓
// CONFIRMADA
//
// AGENDADA também é aceita
// temporariamente devido aos
// registros antigos.
export async function confirmarAgendamentoController(
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

    // Obtém e valida o ID.
    const id =
      obterIdAgendamento(
        req.params.id
      );

    if (!id) {
      return res.status(400).json({
        mensagem:
          "ID do agendamento inválido."
      });
    }

    // Identifica o médico autenticado.
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

    // O service também verifica se
    // o agendamento pertence ao médico.
    const agendamento =
      await confirmarAgendamento(
        id,
        medico.id
      );

    return res.json({
      mensagem:
        "Consulta confirmada com sucesso.",

      agendamento
    });

  } catch (erro) {

    console.error(
      "Erro ao confirmar agendamento:",
      erro
    );

    if (erro instanceof Error) {

      if (
        erro.message ===
        "Agendamento não encontrado."
      ) {
        return res.status(404).json({
          mensagem:
            erro.message
        });
      }

      if (
        erro.message ===
        "Somente agendamentos pendentes podem ser confirmados."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }
    }

    return res.status(500).json({
      mensagem:
        "Erro interno ao confirmar agendamento."
    });
  }
}


// ========================================
// RECUSAR AGENDAMENTO
// ========================================

// Fluxo:
//
// PENDENTE
//    ↓
// RECUSADA
//
// Depois da recusa,
// o horário volta a ficar livre.
export async function recusarAgendamentoController(
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

    const id =
      obterIdAgendamento(
        req.params.id
      );

    if (!id) {
      return res.status(400).json({
        mensagem:
          "ID do agendamento inválido."
      });
    }

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

    const agendamento =
      await recusarAgendamento(
        id,
        medico.id
      );

    return res.json({
      mensagem:
        "Solicitação recusada com sucesso.",

      agendamento
    });

  } catch (erro) {

    console.error(
      "Erro ao recusar agendamento:",
      erro
    );

    if (erro instanceof Error) {

      if (
        erro.message ===
        "Agendamento não encontrado."
      ) {
        return res.status(404).json({
          mensagem:
            erro.message
        });
      }

      if (
        erro.message ===
        "Somente agendamentos pendentes podem ser recusados."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }
    }

    return res.status(500).json({
      mensagem:
        "Erro interno ao recusar agendamento."
    });
  }
}


// ========================================
// CANCELAR / DESMARCAR AGENDAMENTO
// ========================================

// Fluxo:
//
// CONFIRMADA
//     ↓
// CANCELADA
//
// O slot volta a ficar livre.
export async function cancelarAgendamentoController(
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

    const id =
      obterIdAgendamento(
        req.params.id
      );

    if (!id) {
      return res.status(400).json({
        mensagem:
          "ID do agendamento inválido."
      });
    }

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

    const agendamento =
      await cancelarAgendamento(
        id,
        medico.id
      );

    return res.json({
      mensagem:
        "Consulta cancelada com sucesso.",

      agendamento
    });

  } catch (erro) {

    console.error(
      "Erro ao cancelar agendamento:",
      erro
    );

    if (erro instanceof Error) {

      if (
        erro.message ===
        "Agendamento não encontrado."
      ) {
        return res.status(404).json({
          mensagem:
            erro.message
        });
      }

      if (
        erro.message ===
        "Somente consultas confirmadas podem ser canceladas."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }
    }

    return res.status(500).json({
      mensagem:
        "Erro interno ao cancelar agendamento."
    });
  }
}


// ========================================
// REMARCAR AGENDAMENTO
// ========================================

// O médico envia:
//
// {
//   "data": "2026-09-20",
//   "horaInicio": "10:00"
// }
//
// O frontend NÃO envia horaFim.
//
// O backend encontra o horaFim
// através do slot real da agenda.
export async function remarcarAgendamentoController(
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

    const id =
      obterIdAgendamento(
        req.params.id
      );

    if (!id) {
      return res.status(400).json({
        mensagem:
          "ID do agendamento inválido."
      });
    }

    const {
      data,
      horaInicio
    } = req.body;

    // Valida os campos necessários.
    if (
      !data ||
      !horaInicio ||
      typeof data !== "string" ||
      typeof horaInicio !== "string"
    ) {
      return res.status(400).json({
        mensagem:
          "Nova data e novo horário são obrigatórios."
      });
    }

    // Identifica o médico autenticado.
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

    // O service:
    //
    // - verifica se pertence ao médico;
    // - verifica o status;
    // - verifica o novo slot;
    // - encontra o horaFim;
    // - atualiza o registro.
    const agendamento =
      await remarcarAgendamento(
        id,
        medico.id,
        {
          data,
          horaInicio
        }
      );

    return res.json({
      mensagem:
        "Consulta remarcada com sucesso.",

      agendamento
    });

  } catch (erro) {

    console.error(
      "Erro ao remarcar agendamento:",
      erro
    );

    if (erro instanceof Error) {

      // Agendamento não existe
      // ou pertence a outro médico.
      if (
        erro.message ===
        "Agendamento não encontrado."
      ) {
        return res.status(404).json({
          mensagem:
            erro.message
        });
      }

      // Status não permite remarcação.
      if (
        erro.message ===
        "Este agendamento não pode ser remarcado."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }

      // O médico escolheu o mesmo
      // dia e horário atual.
      if (
        erro.message ===
        "Escolha um horário diferente do atual."
      ) {
        return res.status(400).json({
          mensagem:
            erro.message
        });
      }

      // O novo horário deixou
      // de estar disponível.
      if (
        erro.message ===
        "O horário selecionado não está mais disponível."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }
    }

    return res.status(500).json({
      mensagem:
        "Erro interno ao remarcar agendamento."
    });
  }
}