// Dependências do serviço de agenda
import { db } from "../prisma/db";

// ========================================
// TIPOS
// ========================================

// Estrutura de uma disponibilidade
export type DisponibilidadeAgendaRegistro = {
  id: number;
  medicoId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  duracaoConsulta: number;
  ativo: boolean;
};

// Dados para criar uma disponibilidade
type CriarDisponibilidadeDados = {
  medicoId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  duracaoConsulta: number;
};

// Dados para atualizar uma disponibilidade
type AtualizarDisponibilidadeDados = {
  data: string;
  horaInicio: string;
  horaFim: string;
  duracaoConsulta: number;
};

// ========================================
// BUSCAR MÉDICO PELO USUÁRIO
// ========================================

// Busca o médico relacionado ao usuário autenticado
export async function buscarMedicoAgendaPorUsuarioId(
  usuarioId: number
) {
  const medico = await db.orm.public.Medico
    .where({
      usuarioId
    })
    .first();

  if (!medico) {
    throw new Error(
      "Médico não encontrado para este usuário."
    );
  }

  return medico;
}

// ========================================
// LISTAR DISPONIBILIDADES
// ========================================

// Lista as disponibilidades ativas do médico
export async function listarDisponibilidadesAgenda(
  medicoId: number
): Promise<DisponibilidadeAgendaRegistro[]> {
  const disponibilidades =
    await db.orm.public.DisponibilidadeAgenda
      .where({
        medicoId,
        ativo: true
      })
      .all();

  return disponibilidades;
}

// ========================================
// BUSCAR DISPONIBILIDADES POR DATA
// ========================================

// Busca os períodos ativos de uma data específica
export async function buscarDisponibilidadesPorData(
  medicoId: number,
  data: string
): Promise<DisponibilidadeAgendaRegistro[]> {
  const disponibilidades =
    await db.orm.public.DisponibilidadeAgenda
      .where({
        medicoId,
        data,
        ativo: true
      })
      .all();

  return disponibilidades;
}

// ========================================
// BUSCAR DISPONIBILIDADE POR ID
// ========================================

// Busca um período pertencente ao médico
export async function buscarDisponibilidadeAgendaPorId(
  id: number,
  medicoId: number
): Promise<DisponibilidadeAgendaRegistro> {
  const disponibilidade =
    await db.orm.public.DisponibilidadeAgenda
      .where({
        id,
        medicoId
      })
      .first();

  if (!disponibilidade) {
    throw new Error(
      "Horário não encontrado."
    );
  }

  return disponibilidade;
}

// ========================================
// CRIAR DISPONIBILIDADE
// ========================================

// Cadastra um novo período disponível
export async function criarDisponibilidadeAgenda(
  dados: CriarDisponibilidadeDados
): Promise<DisponibilidadeAgendaRegistro> {
  const disponibilidade =
    await db.orm.public.DisponibilidadeAgenda
      .create({
        medicoId: dados.medicoId,
        data: dados.data,
        horaInicio: dados.horaInicio,
        horaFim: dados.horaFim,
        duracaoConsulta: dados.duracaoConsulta,
        ativo: true
      });

  return disponibilidade;
}

// ========================================
// ATUALIZAR DISPONIBILIDADE
// ========================================

// Atualiza um período disponível
export async function atualizarDisponibilidadeAgenda(
  id: number,
  medicoId: number,
  dados: AtualizarDisponibilidadeDados
): Promise<DisponibilidadeAgendaRegistro> {
  const disponibilidade =
    await db.orm.public.DisponibilidadeAgenda
      .where({
        id,
        medicoId
      })
      .update({
        data: dados.data,
        horaInicio: dados.horaInicio,
        horaFim: dados.horaFim,
        duracaoConsulta: dados.duracaoConsulta
      });

  if (!disponibilidade) {
    throw new Error(
      "Horário não encontrado."
    );
  }

  return disponibilidade;
}

// ========================================
// REMOVER DISPONIBILIDADE
// ========================================

// Faz a exclusão lógica do período
export async function removerDisponibilidadeAgenda(
  id: number,
  medicoId: number
): Promise<DisponibilidadeAgendaRegistro> {
  const disponibilidade =
    await db.orm.public.DisponibilidadeAgenda
      .where({
        id,
        medicoId
      })
      .update({
        ativo: false
      });

  if (!disponibilidade) {
    throw new Error(
      "Horário não encontrado."
    );
  }

  return disponibilidade;
}