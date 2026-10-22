// ========================================
// AUDITORIA DE AGENDAMENTOS
// ========================================

import { db } from "../prisma/db";

// Tipo da transação utilizado pelo Prisma 8.
type Tx =
  Parameters<
    Parameters<typeof db.transaction>[0]
  >[0];

// ========================================
// EVENTOS DE AUDITORIA
// ========================================

export type AcaoAuditoriaAgendamento =
  | "SOLICITAR_AGENDAMENTO"
  | "CRIAR_AGENDAMENTO_MEDICO"
  | "CONFIRMAR_AGENDAMENTO"
  | "RECUSAR_AGENDAMENTO"
  | "CANCELAR_AGENDAMENTO"
  | "CANCELAR_AGENDAMENTO_PACIENTE"
  | "SOLICITAR_REMARCACAO"
  | "ACEITAR_REMARCACAO"
  | "RECUSAR_REMARCACAO"
  | "REMARCAR_AGENDAMENTO"
  | "EXCLUIR_AGENDAMENTO"
  | "VISUALIZAR_RESPOSTA_REMARCACAO";

// ========================================
// DADOS DO EVENTO
// ========================================

export type DadosAuditoriaAgendamento = {
  usuarioId: number;
  medicoId: number;
  agendamentoId: number;
  acao: AcaoAuditoriaAgendamento;
  resultado: "SUCESSO" | "FALHA";
  dataAgenda?: string | null;
  horaInicio?: string | null;
  horaFim?: string | null;
  requisicaoId?: string | null;
};

// ========================================
// REGISTRAR AUDITORIA
// ========================================

// Recebe a mesma transação que executa
// a alteração do agendamento.
//
// Se a auditoria falhar, a transação
// será revertida, preservando a integridade
// do banco de dados.
export async function registrarAuditoriaAgendamento(
  tx: Tx,
  dados: DadosAuditoriaAgendamento
): Promise<void> {

  // Validar identificadores.
  for (
    const id of [
      dados.usuarioId,
      dados.medicoId,
      dados.agendamentoId
    ]
  ) {
    if (
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      throw new Error(
        "Identificadores inválidos para auditoria."
      );
    }
  }

  // Registrar evento.
  await tx.orm.public.AuditoriaAgenda.create({
    usuarioId: dados.usuarioId,
    medicoId: dados.medicoId,
    disponibilidadeId: null,
    agendamentoId: dados.agendamentoId,
    acao: dados.acao,
    resultado: dados.resultado,
    dataAgenda: dados.dataAgenda ?? null,
    horaInicio: dados.horaInicio ?? null,
    horaFim: dados.horaFim ?? null,
    requisicaoId: dados.requisicaoId ?? null
  });
}