// ========================================
// SERVICE DE AUDITORIA ADMINISTRATIVA
// ========================================

import { db } from "../prisma/db";

// ========================================
// FILTROS DISPONÍVEIS
// ========================================

export type FiltrosAuditoria = {
  medicoId?: number;
  acao?: string;
  resultado?: "SUCESSO" | "FALHA";
  dataInicio?: string;
  dataFim?: string;
};

// ========================================
// VALIDAR E CONVERTER DATA
// ========================================

function converterData(
  valor: string | undefined,
  fimDoDia: boolean
): number | null {

  if (!valor) return null;

  const data = new Date(
    `${valor}T${fimDoDia ? "23:59:59.999" : "00:00:00.000"}`
  );

  if (Number.isNaN(data.getTime())) {
    throw new Error("Período inválido.");
  }

  return data.getTime();
}

// ========================================
// LISTAR AUDITORIA DOS PRONTUÁRIOS
// ========================================

export async function listarAuditoriaProntuarios(
  filtros: FiltrosAuditoria
) {

  // Consultamos somente a tabela de auditoria.
  // Nenhum campo clínico é recuperado.
  const registros = filtros.medicoId
    ? await db.orm.public.AuditoriaProntuario
        .where({ medicoId: filtros.medicoId })
        .all()
    : await db.orm.public.AuditoriaProntuario
        .all();

  const inicio = converterData(
    filtros.dataInicio,
    false
  );

  const fim = converterData(
    filtros.dataFim,
    true
  );

  // Filtramos os eventos pelos critérios
  // informados pelo administrador.
  const filtrados = registros.filter((item) => {

    if (
      filtros.acao &&
      item.acao !== filtros.acao
    ) {
      return false;
    }

    if (
      filtros.resultado &&
      item.resultado !== filtros.resultado
    ) {
      return false;
    }

    const momento = new Date(
      item.createdAt
    ).getTime();

    if (
      inicio !== null &&
      momento < inicio
    ) {
      return false;
    }

    if (
      fim !== null &&
      momento > fim
    ) {
      return false;
    }

    return true;
  });

  // Ordena do evento mais recente
  // para o mais antigo.
  filtrados.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  // Limitamos a resposta inicial.
  // Posteriormente implementaremos
  // paginação diretamente no banco.
  return filtrados.slice(0, 100).map(
    (item) => ({
      id: item.id,
      usuarioId: item.usuarioId,
      medicoId: item.medicoId,
      pacienteId: item.pacienteId,
      prontuarioId: item.prontuarioId,
      acao: item.acao,
      resultado: item.resultado,
      requisicaoId: item.requisicaoId,
      createdAt: item.createdAt
    })
  );
}