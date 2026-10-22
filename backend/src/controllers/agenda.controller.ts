
import type {
  Request,
  Response
} from "express";

import {
  atualizarDisponibilidadeAgenda,
  buscarDisponibilidadeAgendaPorId,
  buscarMedicoAgendaPorUsuarioId,
  criarDisponibilidadesAgendaEmLote,
  listarDisponibilidadesAgenda,
  removerDisponibilidadeAgenda
} from "../services/agenda.service";

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

// ========================================
// VALIDAR DATA
// ========================================

// Verifica se a data foi enviada no
// formato YYYY-MM-DD e se existe
// no calendário.
function dataValida(data: string): boolean {

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return false;
  }

  const [ano, mes, dia] = data
    .split("-")
    .map(Number);

  const dataConvertida = new Date(
    Date.UTC(ano, mes - 1, dia)
  );

  return (
    dataConvertida.getUTCFullYear() === ano &&
    dataConvertida.getUTCMonth() === mes - 1 &&
    dataConvertida.getUTCDate() === dia
  );
}

// ========================================
// VALIDAR HORÁRIO
// ========================================

// Aceita horários entre 00:00 e 23:59.
function horarioValido(
  horario: string
): boolean {

  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    horario
  );
}

// ========================================
// VALIDAR DURAÇÃO
// ========================================

// Evita valores negativos, decimais,
// zero ou valores que não sejam números.
function duracaoValida(
  valor: unknown
): boolean {

  const duracao = Number(valor);

  return (
    valor !== null &&
    valor !== undefined &&
    valor !== "" &&
    Number.isSafeInteger(duracao) &&
    duracao > 0
  );
}

// ========================================
// VALIDAR IDENTIFICADOR
// ========================================

function idValido(id: number): boolean {

  return (
    Number.isSafeInteger(id) &&
    id > 0
  );
}

// ========================================
// IDENTIFICAR CONFLITOS
// ========================================

// Utilizamos a mensagem da operação
// para diferenciar um conflito de horário
// de outros erros.
//
// A consulta definitiva é feita pelo
// service dentro da transação.
function erroDeConflito(
  erro: unknown
): boolean {

  return (
    erro instanceof Error &&
    erro.message.includes(
      "horário conflitante"
    )
  );
}

// ========================================
// LISTAR DISPONIBILIDADES
// ========================================

// Lista disponibilidades ativas
// do médico autenticado.
export async function listarDisponibilidadesController(
  req: Request,
  res: Response
) {

  try {

    // Obtém o ID diretamente da sessão.
    const usuarioId =
      req.usuario!.id;

    // Identifica o médico proprietário.
    const medico =
      await buscarMedicoAgendaPorUsuarioId(
        usuarioId
      );

    // Consulta as disponibilidades.
    const disponibilidades =
      await listarDisponibilidadesAgenda(
        medico.id
      );

    return res.json(
      disponibilidades
    );

  } catch (error) {

    return res.status(400).json({
      mensagem:
        error instanceof Error
          ? error.message
          : "Erro ao listar agenda."
    });
  }
}

// ========================================
// CRIAR DISPONIBILIDADES
// ========================================

// Permite cadastrar uma ou várias datas.
//
// Agora todas as datas são verificadas
// antes de qualquer gravação.
//
// O service utiliza uma transação:
// - ou todas são criadas;
// - ou nenhuma é criada.
//
// Cada horário criado terá seu
// próprio evento na AuditoriaAgenda.
export async function criarDisponibilidadeController(
  req: Request,
  res: Response
) {

  try {

    const usuarioId =
      req.usuario!.id;

    const {
      datas,
      horaInicio,
      horaFim,
      duracaoConsulta
    } = req.body;

    // ====================================
    // VALIDAR LISTA DE DATAS
    // ====================================

    if (
      !Array.isArray(datas) ||
      datas.length === 0
    ) {

      return res.status(400).json({
        mensagem:
          "Selecione pelo menos uma data."
      });
    }

    // ====================================
    // VALIDAR CAMPOS OBRIGATÓRIOS
    // ====================================

    if (
      !horaInicio ||
      !horaFim ||
      !duracaoConsulta
    ) {

      return res.status(400).json({
        mensagem:
          "Preencha todos os campos."
      });
    }

    // ====================================
    // VALIDAR HORÁRIOS
    // ====================================

    if (
      typeof horaInicio !== "string" ||
      typeof horaFim !== "string" ||
      !horarioValido(horaInicio) ||
      !horarioValido(horaFim)
    ) {

      return res.status(400).json({
        mensagem:
          "Horário inválido."
      });
    }

    if (horaInicio >= horaFim) {

      return res.status(400).json({
        mensagem:
          "O horário final deve ser maior que o horário inicial."
      });
    }

    // ====================================
    // VALIDAR DURAÇÃO
    // ====================================

    if (!duracaoValida(duracaoConsulta)) {

      return res.status(400).json({
        mensagem:
          "Duração da consulta inválida."
      });
    }

    // ====================================
    // VALIDAR TODAS AS DATAS
    // ====================================

    // Diferentemente da implementação
    // anterior, não começamos a criar
    // horários enquanto ainda existem
    // datas não verificadas.
    for (const data of datas) {

      if (
        typeof data !== "string" ||
        !dataValida(data)
      ) {

        return res.status(400).json({
          mensagem:
            `Data inválida: ${String(data)}`
        });
      }
    }

    // ====================================
    // IDENTIFICAR MÉDICO
    // ====================================

    const medico =
      await buscarMedicoAgendaPorUsuarioId(
        usuarioId
      );

    // ====================================
    // CRIAR COM TRANSAÇÃO
    // ====================================

    const criadas =
      await criarDisponibilidadesAgendaEmLote({
        usuarioId,
        medicoId: medico.id,
        datas,
        horaInicio,
        horaFim,
        duracaoConsulta:
          Number(duracaoConsulta)
      });

    // ====================================
    // RESPOSTA
    // ====================================

    // Preservamos o formato utilizado
    // anteriormente pelo frontend.
    return res.status(201).json({
      mensagem:
        "Disponibilidades criadas com sucesso.",
      disponibilidades:
        criadas
    });

  } catch (error) {

    if (erroDeConflito(error)) {
      return res.status(409).json({
        mensagem:
          error instanceof Error
            ? error.message
            : "Existe um conflito de horário."
      });
    }

    console.error(
      "[AGENDA] Erro ao criar disponibilidade:",
      error
    );

    return res.status(400).json({
      mensagem:
        "Não foi possível criar as disponibilidades."
    });
  }
}

// ========================================
// EDITAR DISPONIBILIDADE
// ========================================

// Atualiza um período pertencente
// ao médico autenticado.
//
// O service agora registra a alteração
// na AuditoriaAgenda e utiliza uma
// transação para manter a consistência.
export async function editarDisponibilidadeController(
  req: Request,
  res: Response
) {

  try {

    const usuarioId =
      req.usuario!.id;

    const id =
      Number(req.params.id);

    const {
      data,
      horaInicio,
      horaFim,
      duracaoConsulta
    } = req.body;

    // ====================================
    // VALIDAR IDENTIFICADOR
    // ====================================

    if (!idValido(id)) {

      return res.status(400).json({
        mensagem:
          "Identificador de horário inválido."
      });
    }

    // ====================================
    // VALIDAR CAMPOS
    // ====================================

    if (
      !data ||
      !horaInicio ||
      !horaFim ||
      !duracaoConsulta
    ) {

      return res.status(400).json({
        mensagem:
          "Preencha todos os campos."
      });
    }

    // ====================================
    // VALIDAR DATA
    // ====================================

    if (
      typeof data !== "string" ||
      !dataValida(data)
    ) {

      return res.status(400).json({
        mensagem:
          "Data inválida."
      });
    }

    // ====================================
    // VALIDAR HORÁRIOS
    // ====================================

    if (
      typeof horaInicio !== "string" ||
      typeof horaFim !== "string" ||
      !horarioValido(horaInicio) ||
      !horarioValido(horaFim)
    ) {

      return res.status(400).json({
        mensagem:
          "Horário inválido."
      });
    }

    if (horaInicio >= horaFim) {

      return res.status(400).json({
        mensagem:
          "O horário final deve ser maior que o horário inicial."
      });
    }

    // ====================================
    // VALIDAR DURAÇÃO
    // ====================================

    if (!duracaoValida(duracaoConsulta)) {

      return res.status(400).json({
        mensagem:
          "Duração da consulta inválida."
      });
    }

    // ====================================
    // IDENTIFICAR MÉDICO
    // ====================================

    const medico =
      await buscarMedicoAgendaPorUsuarioId(
        usuarioId
      );

    // Verifica se o horário pertence
    // ao médico autenticado.
    await buscarDisponibilidadeAgendaPorId(
      id,
      medico.id
    );

    // ====================================
    // ATUALIZAR COM AUDITORIA
    // ====================================

    const disponibilidade =
      await atualizarDisponibilidadeAgenda(
        id,
        medico.id,
        {
          data,
          horaInicio,
          horaFim,
          duracaoConsulta:
            Number(duracaoConsulta)
        },
        usuarioId
      );

    // Mantém a resposta original
    // utilizada pelo frontend.
    return res.json(
      disponibilidade
    );

  } catch (error) {

    if (erroDeConflito(error)) {
      return res.status(409).json({
        mensagem:
          error instanceof Error
            ? error.message
            : "Existe um conflito de horário."
      });
    }

    console.error(
      "[AGENDA] Erro ao editar disponibilidade:",
      error
    );

    return res.status(400).json({
      mensagem:
        "Não foi possível editar o horário."
    });
  }
}

// ========================================
// REMOVER DISPONIBILIDADE
// ========================================

// Executa exclusão lógica:
//
// ativo = false
//
// A disponibilidade continua no banco,
// preservando os dados administrativos.
//
// A exclusão também gera um log
// na AuditoriaAgenda.
export async function removerDisponibilidadeController(
  req: Request,
  res: Response
) {

  try {

    const usuarioId =
      req.usuario!.id;

    const id =
      Number(req.params.id);

    // ====================================
    // VALIDAR ID
    // ====================================

    if (!idValido(id)) {

      return res.status(400).json({
        mensagem:
          "Identificador de horário inválido."
      });
    }

    // ====================================
    // IDENTIFICAR MÉDICO
    // ====================================

    const medico =
      await buscarMedicoAgendaPorUsuarioId(
        usuarioId
      );

    // Confirma que o horário existe
    // e pertence ao médico.
    await buscarDisponibilidadeAgendaPorId(
      id,
      medico.id
    );

    // ====================================
    // REMOVER COM AUDITORIA
    // ====================================

    await removerDisponibilidadeAgenda(
      id,
      medico.id,
      usuarioId
    );

    // Mantém a resposta original.
    return res.json({
      mensagem:
        "Horário removido com sucesso."
    });

  } catch (error) {

    console.error(
      "[AGENDA] Erro ao remover disponibilidade:",
      error
    );

    return res.status(400).json({
      mensagem:
        "Não foi possível remover o horário."
    });
  }
}
