import type {
  Request,
  Response
} from "express";

import {
  atualizarDisponibilidadeAgenda,
  buscarDisponibilidadesPorData,
  buscarDisponibilidadeAgendaPorId,
  buscarMedicoAgendaPorUsuarioId,
  criarDisponibilidadeAgenda,
  listarDisponibilidadesAgenda,
  removerDisponibilidadeAgenda
} from "../services/agenda.service";

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

// Verifica formato da data
function dataValida(data: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    data
  );
}

// Verifica formato do horário
function horarioValido(
  horario: string
) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    horario
  );
}

// Verifica conflito de horário
function possuiConflito(
  horaInicio: string,
  horaFim: string,
  inicioExistente: string,
  fimExistente: string
) {
  return (
    horaInicio < fimExistente &&
    horaFim > inicioExistente
  );
}

// ========================================
// LISTAR
// ========================================

// Lista disponibilidades do médico
export async function listarDisponibilidadesController(
  req: Request,
  res: Response
) {
  try {
    const usuarioId =
      req.usuario!.id;

    const medico =
      await buscarMedicoAgendaPorUsuarioId(
        usuarioId
      );

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
// CRIAR
// ========================================

// Cria uma ou várias disponibilidades
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

    if (
      !Array.isArray(datas) ||
      datas.length === 0
    ) {
      return res.status(400).json({
        mensagem:
          "Selecione pelo menos uma data."
      });
    }

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

    if (
      !horarioValido(horaInicio) ||
      !horarioValido(horaFim)
    ) {
      return res.status(400).json({
        mensagem:
          "Horário inválido."
      });
    }

    if (
      horaInicio >= horaFim
    ) {
      return res.status(400).json({
        mensagem:
          "O horário final deve ser maior que o horário inicial."
      });
    }

    if (
      Number(duracaoConsulta) <= 0
    ) {
      return res.status(400).json({
        mensagem:
          "Duração da consulta inválida."
      });
    }

    const medico =
      await buscarMedicoAgendaPorUsuarioId(
        usuarioId
      );

    const criadas = [];

    for (const data of datas) {
      if (
        typeof data !== "string" ||
        !dataValida(data)
      ) {
        return res.status(400).json({
          mensagem:
            `Data inválida: ${data}`
        });
      }

      const existentes =
        await buscarDisponibilidadesPorData(
          medico.id,
          data
        );

      const conflito =
        existentes.some(
          (item) =>
            possuiConflito(
              horaInicio,
              horaFim,
              item.horaInicio,
              item.horaFim
            )
        );

      if (conflito) {
        return res.status(409).json({
          mensagem:
            `Já existe um horário conflitante em ${data}.`
        });
      }

      const criada =
        await criarDisponibilidadeAgenda({
          medicoId: medico.id,
          data,
          horaInicio,
          horaFim,
          duracaoConsulta:
            Number(
              duracaoConsulta
            )
        });

      criadas.push(criada);
    }

    return res.status(201).json({
      mensagem:
        "Disponibilidades criadas com sucesso.",
      disponibilidades:
        criadas
    });
  } catch (error) {
    return res.status(400).json({
      mensagem:
        error instanceof Error
          ? error.message
          : "Erro ao criar disponibilidade."
    });
  }
}

// ========================================
// EDITAR
// ========================================

// Edita uma disponibilidade
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

    if (!dataValida(data)) {
      return res.status(400).json({
        mensagem:
          "Data inválida."
      });
    }

    if (
      !horarioValido(horaInicio) ||
      !horarioValido(horaFim)
    ) {
      return res.status(400).json({
        mensagem:
          "Horário inválido."
      });
    }

    if (
      horaInicio >= horaFim
    ) {
      return res.status(400).json({
        mensagem:
          "O horário final deve ser maior que o horário inicial."
      });
    }

    const medico =
      await buscarMedicoAgendaPorUsuarioId(
        usuarioId
      );

    await buscarDisponibilidadeAgendaPorId(
      id,
      medico.id
    );

    const existentes =
      await buscarDisponibilidadesPorData(
        medico.id,
        data
      );

    const conflito =
      existentes.some(
        (item) =>
          item.id !== id &&
          possuiConflito(
            horaInicio,
            horaFim,
            item.horaInicio,
            item.horaFim
          )
      );

    if (conflito) {
      return res.status(409).json({
        mensagem:
          "Já existe outro horário conflitante nesta data."
      });
    }

    const disponibilidade =
      await atualizarDisponibilidadeAgenda(
        id,
        medico.id,
        {
          data,
          horaInicio,
          horaFim,
          duracaoConsulta:
            Number(
              duracaoConsulta
            )
        }
      );

    return res.json(
      disponibilidade
    );
  } catch (error) {
    return res.status(400).json({
      mensagem:
        error instanceof Error
          ? error.message
          : "Erro ao editar disponibilidade."
    });
  }
}

// ========================================
// REMOVER
// ========================================

// Remove disponibilidade
export async function removerDisponibilidadeController(
  req: Request,
  res: Response
) {
  try {
    const usuarioId =
      req.usuario!.id;

    const id =
      Number(req.params.id);

    const medico =
      await buscarMedicoAgendaPorUsuarioId(
        usuarioId
      );

    await buscarDisponibilidadeAgendaPorId(
      id,
      medico.id
    );

    await removerDisponibilidadeAgenda(
      id,
      medico.id
    );

    return res.json({
      mensagem:
        "Horário removido com sucesso."
    });
  } catch (error) {
    return res.status(400).json({
      mensagem:
        error instanceof Error
          ? error.message
          : "Erro ao remover horário."
    });
  }
}