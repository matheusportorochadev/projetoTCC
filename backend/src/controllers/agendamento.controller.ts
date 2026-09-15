// ========================================
// IMPORTAÇÕES
// ========================================

import type {
  Request,
  Response
} from "express";

import {
  aceitarRemarcacao,
  buscarPacientePorUsuarioId,
  cancelarAgendamento,
  cancelarAgendamentoPaciente,
  confirmarAgendamento,
  criarAgendamento,
  criarAgendamentoPeloMedico,
  excluirAgendamento,
  horarioEstaDisponivel,
  listarAgendamentosDoMedico,
  listarAgendamentosDoPaciente,
  listarHorariosDisponiveis,
  listarRemarcacoesDoPaciente,
  listarRemarcacoesPendentesDoMedico,
  marcarRemarcacaoComoVisualizada,
  recusarAgendamento,
  recusarRemarcacao,
  remarcarAgendamento,
  solicitarRemarcacao
} from "../services/agendamento.service";

import {
  buscarMedicoAgendaPorUsuarioId
} from "../services/agenda.service";


// ========================================
// FUNÇÃO AUXILIAR — VALIDAR ID
// ========================================

function obterId(
  idRecebido: unknown
): number | null {
  if (
    typeof idRecebido !== "string" ||
    idRecebido.trim() === ""
  ) {
    return null;
  }

  const id =
    Number(idRecebido);

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
//
// Retorna os horários disponíveis
// para o paciente autenticado.
//
// O médico é descoberto através
// do próprio cadastro do paciente.

export async function horariosDisponiveis(
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

    const data =
      req.query.data;

    if (
      !data ||
      typeof data !== "string"
    ) {
      return res.status(400).json({
        mensagem:
          "A data deve ser informada."
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
//
// O paciente escolhe somente:
//
// - data;
// - horaInicio.
//
// O backend descobre:
//
// - paciente;
// - médico;
// - horaFim;
// - status.
//
// Todo novo agendamento nasce PENDENTE.

export async function agendarConsulta(
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

    const {
      data,
      horaInicio
    } = req.body;

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
//
// Médico:
//
// PENDENTE
//    ↓
// CONFIRMADA

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

    const id =
      obterId(req.params.id);

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
//
// Médico:
//
// PENDENTE
//    ↓
// RECUSADA

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
      obterId(req.params.id);

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
// CANCELAR AGENDAMENTO PELO MÉDICO
// ========================================

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
      obterId(req.params.id);

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
// CANCELAR AGENDAMENTO PELO PACIENTE
// ========================================
//
// O paciente pode cancelar:
//
// PENDENTE
// CONFIRMADA
// AGENDADA (legado)
//
// O backend identifica o paciente
// através do JWT.

export async function cancelarMeuAgendamentoController(
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
      obterId(req.params.id);

    if (!id) {
      return res.status(400).json({
        mensagem:
          "ID do agendamento inválido."
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

    const agendamento =
      await cancelarAgendamentoPaciente(
        id,
        paciente.id
      );

    return res.json({
      mensagem:
        "Consulta cancelada com sucesso.",

      agendamento
    });

  } catch (erro) {
    console.error(
      "Erro ao cancelar agendamento pelo paciente:",
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
        "Este agendamento não pode ser cancelado."
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
// REMARCAR CONSULTA DIRETAMENTE PELO MÉDICO
// ========================================
//
// Diferente da solicitação feita pelo
// paciente, aqui a alteração acontece
// imediatamente.
//
// Body:
//
// {
//   "data": "2026-09-20",
//   "horaInicio": "10:00"
// }

export async function remarcarAgendamentoController(
  req: Request,
  res: Response
) {
  try {
    // ========================================
    // VALIDAR AUTENTICAÇÃO
    // ========================================

    if (!req.usuario) {
      return res.status(401).json({
        mensagem:
          "Usuário não autenticado."
      });
    }


    // ========================================
    // VALIDAR ID
    // ========================================

    const id =
      obterId(req.params.id);

    if (!id) {
      return res.status(400).json({
        mensagem:
          "ID do agendamento inválido."
      });
    }


    // ========================================
    // RECEBER DADOS
    // ========================================

    const {
      data,
      horaInicio
    } = req.body;


    // ========================================
    // VALIDAR DATA
    // ========================================

    if (
      !data ||
      typeof data !== "string"
    ) {
      return res.status(400).json({
        mensagem:
          "A nova data é obrigatória."
      });
    }


    // ========================================
    // VALIDAR HORÁRIO
    // ========================================

    if (
      !horaInicio ||
      typeof horaInicio !== "string"
    ) {
      return res.status(400).json({
        mensagem:
          "O novo horário é obrigatório."
      });
    }


    // ========================================
    // IDENTIFICAR MÉDICO
    // ========================================

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


    // ========================================
    // REMARCAR
    // ========================================

    const agendamento =
      await remarcarAgendamento(
        id,
        medico.id,
        data,
        horaInicio
      );


    // ========================================
    // RESPOSTA
    // ========================================

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
      // ========================================
      // NÃO ENCONTRADO
      // ========================================

      if (
        erro.message ===
        "Agendamento não encontrado."
      ) {
        return res.status(404).json({
          mensagem:
            erro.message
        });
      }


      // ========================================
      // DADOS / OPERAÇÃO INVÁLIDOS
      // ========================================

      if (
        erro.message ===
          "Este agendamento não pode ser remarcado." ||

        erro.message ===
          "Data inválida." ||

        erro.message ===
          "Não é possível remarcar uma consulta para uma data passada." ||

        erro.message ===
          "Horário inválido." ||

        erro.message ===
          "Escolha um horário diferente do atual." ||

        erro.message ===
          "O horário selecionado não pertence às disponibilidades configuradas."
      ) {
        return res.status(400).json({
          mensagem:
            erro.message
        });
      }


      // ========================================
      // CONFLITOS
      // ========================================

      if (
        erro.message ===
          "Já existe uma consulta ocupando este período." ||

        erro.message ===
          "Este horário está reservado por uma solicitação de remarcação pendente." ||

        erro.message ===
          "Existe uma solicitação de remarcação pendente para esta consulta. Aceite ou recuse a solicitação antes de remarcar diretamente."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }


      if (
        erro.message ===
        "Não foi possível remarcar o agendamento."
      ) {
        return res.status(500).json({
          mensagem:
            erro.message
        });
      }
    }

    return res.status(500).json({
      mensagem:
        "Erro interno ao remarcar consulta."
    });
  }
}


// ========================================
// SOLICITAR REMARCAÇÃO — PACIENTE
// ========================================
//
// NOVO FLUXO:
//
// paciente escolhe novo horário
//            ↓
// RemarcacaoAgendamento = PENDENTE
//            ↓
// consulta original permanece igual
//            ↓
// médico aceita ou recusa

export async function solicitarRemarcacaoController(
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

    const agendamentoId =
      obterId(req.params.id);

    if (!agendamentoId) {
      return res.status(400).json({
        mensagem:
          "ID do agendamento inválido."
      });
    }

    const {
      data,
      horaInicio
    } = req.body;

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

    const remarcacao =
      await solicitarRemarcacao(
        agendamentoId,
        paciente.id,
        {
          data,
          horaInicio
        }
      );

    return res.status(201).json({
      mensagem:
        "Solicitação de remarcação enviada. Aguarde a resposta do médico.",

      remarcacao
    });

  } catch (erro) {
    console.error(
      "Erro ao solicitar remarcação:",
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
        "Este agendamento não pode ser remarcado."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }

      if (
        erro.message ===
        "Escolha um horário diferente do atual."
      ) {
        return res.status(400).json({
          mensagem:
            erro.message
        });
      }

      if (
        erro.message ===
        "Já existe uma solicitação de remarcação aguardando resposta do médico."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }

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
        "Erro interno ao solicitar remarcação."
    });
  }
}


// ========================================
// HISTÓRICO DE REMARCAÇÕES — PACIENTE
// ========================================

export async function minhasRemarcacoesController(
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

    const remarcacoes =
      await listarRemarcacoesDoPaciente(
        paciente.id
      );

    return res.json({
      remarcacoes
    });

  } catch (erro) {
    console.error(
      "Erro ao listar remarcações do paciente:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Erro interno ao listar remarcações."
    });
  }
}


// ========================================
// MARCAR RESPOSTA COMO VISUALIZADA
// ========================================

export async function visualizarRemarcacaoController(
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

    const remarcacaoId =
      obterId(req.params.id);

    if (!remarcacaoId) {
      return res.status(400).json({
        mensagem:
          "ID da remarcação inválido."
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

    const remarcacao =
      await marcarRemarcacaoComoVisualizada(
        remarcacaoId,
        paciente.id
      );

    return res.json({
      mensagem:
        "Resposta da remarcação marcada como visualizada.",

      remarcacao
    });

  } catch (erro) {
    console.error(
      "Erro ao marcar remarcação como visualizada:",
      erro
    );

    if (erro instanceof Error) {
      if (
        erro.message ===
        "Solicitação de remarcação não encontrada."
      ) {
        return res.status(404).json({
          mensagem:
            erro.message
        });
      }

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
        "Esta solicitação ainda não foi respondida."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }
    }

    return res.status(500).json({
      mensagem:
        "Erro interno ao atualizar visualização."
    });
  }
}


// ========================================
// REMARCAÇÕES PENDENTES — MÉDICO
// ========================================

export async function remarcacoesPendentesMedicoController(
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

    const remarcacoes =
      await listarRemarcacoesPendentesDoMedico(
        medico.id
      );

    return res.json({
      remarcacoes
    });

  } catch (erro) {
    console.error(
      "Erro ao listar remarcações pendentes:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Erro interno ao listar remarcações pendentes."
    });
  }
}


// ========================================
// ACEITAR REMARCAÇÃO — MÉDICO
// ========================================

export async function aceitarRemarcacaoController(
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

    const remarcacaoId =
      obterId(req.params.id);

    if (!remarcacaoId) {
      return res.status(400).json({
        mensagem:
          "ID da remarcação inválido."
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

    const remarcacao =
      await aceitarRemarcacao(
        remarcacaoId,
        medico.id
      );

    return res.json({
      mensagem:
        "Remarcação aceita com sucesso.",

      remarcacao
    });

  } catch (erro) {
    console.error(
      "Erro ao aceitar remarcação:",
      erro
    );

    if (erro instanceof Error) {
      if (
        erro.message ===
          "Solicitação de remarcação não encontrada." ||
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
          "Esta solicitação de remarcação já foi respondida." ||
        erro.message ===
          "O agendamento não pode mais ser remarcado." ||
        erro.message ===
          "O novo horário não está mais disponível." ||
        erro.message ===
          "O novo horário está reservado por outra solicitação de remarcação."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }
    }

    return res.status(500).json({
      mensagem:
        "Erro interno ao aceitar remarcação."
    });
  }
}


// ========================================
// RECUSAR REMARCAÇÃO — MÉDICO
// ========================================

export async function recusarRemarcacaoController(
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

    const remarcacaoId =
      obterId(req.params.id);

    if (!remarcacaoId) {
      return res.status(400).json({
        mensagem:
          "ID da remarcação inválido."
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

    const remarcacao =
      await recusarRemarcacao(
        remarcacaoId,
        medico.id
      );

    return res.json({
      mensagem:
        "Remarcação recusada com sucesso.",

      remarcacao
    });

  } catch (erro) {
    console.error(
      "Erro ao recusar remarcação:",
      erro
    );

    if (erro instanceof Error) {
      if (
        erro.message ===
          "Solicitação de remarcação não encontrada." ||
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
        "Esta solicitação de remarcação já foi respondida."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }
    }

    return res.status(500).json({
      mensagem:
        "Erro interno ao recusar remarcação."
    });
  }
}


// ========================================
// CRIAR CONSULTA DIRETAMENTE PELO MÉDICO
// ========================================
//
// O médico informa:
//
// - pacienteId;
// - data;
// - horaInicio;
// - duracaoConsulta.
//
// Não depende de DisponibilidadeAgenda.
//
// A consulta criada pela própria médica
// já nasce CONFIRMADA.

export async function criarAgendamentoPeloMedicoController(
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

    const {
      pacienteId,
      data,
      horaInicio,
      duracaoConsulta
    } = req.body;

    if (
      typeof pacienteId !== "number" ||
      !Number.isInteger(pacienteId) ||
      pacienteId <= 0
    ) {
      return res.status(400).json({
        mensagem:
          "Paciente inválido."
      });
    }

    if (
      !data ||
      typeof data !== "string"
    ) {
      return res.status(400).json({
        mensagem:
          "A data da consulta é obrigatória."
      });
    }

    if (
      !horaInicio ||
      typeof horaInicio !== "string"
    ) {
      return res.status(400).json({
        mensagem:
          "O horário da consulta é obrigatório."
      });
    }

    if (
      typeof duracaoConsulta !== "number" ||
      !Number.isInteger(duracaoConsulta) ||
      duracaoConsulta <= 0
    ) {
      return res.status(400).json({
        mensagem:
          "A duração da consulta é inválida."
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
      await criarAgendamentoPeloMedico(
        medico.id,
        {
          pacienteId,
          data,
          horaInicio,
          duracaoConsulta
        }
      );

    return res.status(201).json({
      mensagem:
        "Consulta cadastrada com sucesso.",

      agendamento
    });

  } catch (erro) {
    console.error(
      "Erro ao cadastrar consulta pelo médico:",
      erro
    );

    if (erro instanceof Error) {
      if (
        erro.message ===
        "Paciente não encontrado ou não pertence a este médico."
      ) {
        return res.status(404).json({
          mensagem:
            erro.message
        });
      }

      if (
        erro.message ===
          "Data inválida." ||

        erro.message ===
          "Não é possível cadastrar uma consulta em uma data passada." ||

        erro.message ===
          "Horário inválido." ||

        erro.message ===
          "Duração da consulta inválida." ||

        erro.message ===
          "O horário final da consulta ultrapassa o fim do dia."
      ) {
        return res.status(400).json({
          mensagem:
            erro.message
        });
      }

      if (
        erro.message ===
          "Já existe uma consulta ocupando este período." ||

        erro.message ===
          "Este período está reservado por uma solicitação de remarcação pendente."
      ) {
        return res.status(409).json({
          mensagem:
            erro.message
        });
      }
    }

    return res.status(500).json({
      mensagem:
        "Erro interno ao cadastrar consulta."
    });
  }
}


// ========================================
// EXCLUIR CONSULTA DEFINITIVAMENTE
// ========================================
//
// CANCELAR:
//
// status = CANCELADA
// registro continua no banco.
//
// EXCLUIR:
//
// registro e remarcações relacionadas
// são removidos definitivamente.

export async function excluirAgendamentoController(
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
      obterId(req.params.id);

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

    await excluirAgendamento(
      id,
      medico.id
    );

    return res.json({
      mensagem:
        "Consulta excluída definitivamente."
    });

  } catch (erro) {
    console.error(
      "Erro ao excluir agendamento:",
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
        "Não foi possível excluir o agendamento."
      ) {
        return res.status(500).json({
          mensagem:
            erro.message
        });
      }
    }

    return res.status(500).json({
      mensagem:
        "Erro interno ao excluir consulta."
    });
  }
}