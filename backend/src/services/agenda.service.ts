
import { db } from "../prisma/db";

// ========================================
// TIPOS
// ========================================

// Estrutura de uma disponibilidade.
export type DisponibilidadeAgendaRegistro = {
  id: number;
  medicoId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  duracaoConsulta: number;
  ativo: boolean;
};

// Dados para criar uma disponibilidade.
type CriarDisponibilidadeDados = {
  medicoId: number;
  usuarioId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  duracaoConsulta: number;
};

// Dados para criar várias disponibilidades.
type CriarDisponibilidadesEmLoteDados = {
  medicoId: number;
  usuarioId: number;
  datas: string[];
  horaInicio: string;
  horaFim: string;
  duracaoConsulta: number;
};

// Dados para atualizar uma disponibilidade.
type AtualizarDisponibilidadeDados = {
  data: string;
  horaInicio: string;
  horaFim: string;
  duracaoConsulta: number;
};

// ========================================
// VERIFICAR CONFLITO DE HORÁRIOS
// ========================================

// Dois períodos entram em conflito quando
// existe alguma sobreposição de horários.
//
// Exemplo:
// 08:00 às 10:00
// 09:00 às 11:00
//
// Esses períodos possuem conflito.
//
// Já:
// 08:00 às 10:00
// 10:00 às 12:00
//
// Não possuem conflito.
function possuiConflito(
  horaInicio: string,
  horaFim: string,
  inicioExistente: string,
  fimExistente: string
): boolean {
  return (
    horaInicio < fimExistente &&
    horaFim > inicioExistente
  );
}

// ========================================
// BUSCAR MÉDICO PELO USUÁRIO
// ========================================

// Busca o médico relacionado ao
// usuário autenticado.
export async function buscarMedicoAgendaPorUsuarioId(
  usuarioId: number
) {

  const medico =
    await db.orm.public.Medico
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

// Lista apenas as disponibilidades
// ativas pertencentes ao médico.
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

// Retorna os períodos ativos de uma
// data específica do médico.
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

// Garante que o horário pertence
// ao médico informado.
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
// CRIAR DISPONIBILIDADE INDIVIDUAL
// ========================================

// Mantemos a função de criação individual
// para preservar a estrutura do service.
//
// A disponibilidade e o log são criados
// dentro da mesma transação.
//
// Se a auditoria falhar, a criação
// da disponibilidade será revertida.
export async function criarDisponibilidadeAgenda(
  dados: CriarDisponibilidadeDados
): Promise<DisponibilidadeAgendaRegistro> {

  return db.transaction(
    async (tx) => {

      // Verifica conflito dentro da
      // mesma transação de criação.
      const existentes =
        await tx.orm.public.DisponibilidadeAgenda
          .where({
            medicoId: dados.medicoId,
            data: dados.data,
            ativo: true
          })
          .all();

      const conflito = existentes.some(
        (item) =>
          possuiConflito(
            dados.horaInicio,
            dados.horaFim,
            item.horaInicio,
            item.horaFim
          )
      );

      if (conflito) {
        throw new Error(
          `Já existe um horário conflitante em ${dados.data}.`
        );
      }

      // Cria o período disponível.
      const disponibilidade =
        await tx.orm.public.DisponibilidadeAgenda
          .create({
            medicoId: dados.medicoId,
            data: dados.data,
            horaInicio: dados.horaInicio,
            horaFim: dados.horaFim,
            duracaoConsulta: dados.duracaoConsulta,
            ativo: true
          });

      // Registra o evento de auditoria.
      // Não inclui conteúdo clínico.
      await tx.orm.public.AuditoriaAgenda
        .create({
          usuarioId: dados.usuarioId,
          medicoId: dados.medicoId,
          disponibilidadeId: disponibilidade.id,
          agendamentoId: null,
          acao: "CRIAR_DISPONIBILIDADE",
          resultado: "SUCESSO",
          dataAgenda: disponibilidade.data,
          horaInicio: disponibilidade.horaInicio,
          horaFim: disponibilidade.horaFim,
          requisicaoId: null
        });

      return disponibilidade;
    }
  );
}

// ========================================
// CRIAR VÁRIAS DISPONIBILIDADES
// ========================================

// Cria todas as disponibilidades selecionadas
// em uma única transação.
//
// Vantagens:
//
// 1. Valida conflitos antes da gravação;
// 2. Não permite criação parcial;
// 3. Cada horário possui um log próprio;
// 4. Se ocorrer qualquer erro, tudo é revertido.
export async function criarDisponibilidadesAgendaEmLote(
  dados: CriarDisponibilidadesEmLoteDados
): Promise<DisponibilidadeAgendaRegistro[]> {

  // Remove datas duplicadas.
  const datasUnicas = [
    ...new Set(dados.datas)
  ];

  if (datasUnicas.length === 0) {
    throw new Error(
      "Selecione pelo menos uma data."
    );
  }

  return db.transaction(
    async (tx) => {

      // ====================================
      // PRIMEIRO: VERIFICAR TODOS OS DIAS
      // ====================================

      for (const data of datasUnicas) {

        const existentes =
          await tx.orm.public.DisponibilidadeAgenda
            .where({
              medicoId: dados.medicoId,
              data,
              ativo: true
            })
            .all();

        const conflito =
          existentes.some(
            (item) =>
              possuiConflito(
                dados.horaInicio,
                dados.horaFim,
                item.horaInicio,
                item.horaFim
              )
          );

        if (conflito) {
          throw new Error(
            `Já existe um horário conflitante em ${data}.`
          );
        }
      }

      // ====================================
      // SEGUNDO: CRIAR TODOS OS HORÁRIOS
      // ====================================

      const criadas: DisponibilidadeAgendaRegistro[] = [];

      for (const data of datasUnicas) {

        const disponibilidade =
          await tx.orm.public.DisponibilidadeAgenda
            .create({
              medicoId: dados.medicoId,
              data,
              horaInicio: dados.horaInicio,
              horaFim: dados.horaFim,
              duracaoConsulta: dados.duracaoConsulta,
              ativo: true
            });

        // ==================================
        // AUDITORIA DA CRIAÇÃO
        // ==================================

        await tx.orm.public.AuditoriaAgenda
          .create({
            usuarioId: dados.usuarioId,
            medicoId: dados.medicoId,
            disponibilidadeId: disponibilidade.id,
            agendamentoId: null,
            acao: "CRIAR_DISPONIBILIDADE",
            resultado: "SUCESSO",
            dataAgenda: disponibilidade.data,
            horaInicio: disponibilidade.horaInicio,
            horaFim: disponibilidade.horaFim,
            requisicaoId: null
          });

        criadas.push(disponibilidade);
      }

      return criadas;
    }
  );
}

// ========================================
// ATUALIZAR DISPONIBILIDADE
// ========================================

// Atualiza um período disponível
// e registra a operação na auditoria.
//
// O registro precisa pertencer ao médico.
//
// O usuário autenticado é informado
// pelo controller, não pelo frontend.
export async function atualizarDisponibilidadeAgenda(
  id: number,
  medicoId: number,
  dados: AtualizarDisponibilidadeDados,
  usuarioId: number
): Promise<DisponibilidadeAgendaRegistro> {

  return db.transaction(
    async (tx) => {

      // Confirma o registro atual.
      const atual =
        await tx.orm.public.DisponibilidadeAgenda
          .where({
            id,
            medicoId,
            ativo: true
          })
          .first();

      if (!atual) {
        throw new Error(
          "Horário não encontrado."
        );
      }

      // ====================================
      // VALIDAR CONFLITO COM OUTROS HORÁRIOS
      // ====================================

      const existentes =
        await tx.orm.public.DisponibilidadeAgenda
          .where({
            medicoId,
            data: dados.data,
            ativo: true
          })
          .all();

      const conflito =
        existentes.some(
          (item) =>
            item.id !== id &&
            possuiConflito(
              dados.horaInicio,
              dados.horaFim,
              item.horaInicio,
              item.horaFim
            )
        );

      if (conflito) {
        throw new Error(
          "Já existe outro horário conflitante nesta data."
        );
      }

      // ====================================
      // ATUALIZAR DISPONIBILIDADE
      // ====================================

      const disponibilidade =
        await tx.orm.public.DisponibilidadeAgenda
          .where({
            id,
            medicoId,
            ativo: true
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

      // ====================================
      // AUDITORIA DA ALTERAÇÃO
      // ====================================

      await tx.orm.public.AuditoriaAgenda
        .create({
          usuarioId,
          medicoId,
          disponibilidadeId: disponibilidade.id,
          agendamentoId: null,
          acao: "ALTERAR_DISPONIBILIDADE",
          resultado: "SUCESSO",
          dataAgenda: disponibilidade.data,
          horaInicio: disponibilidade.horaInicio,
          horaFim: disponibilidade.horaFim,
          requisicaoId: null
        });

      return disponibilidade;
    }
  );
}

// ========================================
// REMOVER DISPONIBILIDADE
// ========================================

// Realiza a exclusão lógica de um período.
//
// O registro continua existindo no banco,
// mas passa a ter ativo = false.
//
// Também registra quem removeu o horário.
export async function removerDisponibilidadeAgenda(
  id: number,
  medicoId: number,
  usuarioId: number
): Promise<DisponibilidadeAgendaRegistro> {

  return db.transaction(
    async (tx) => {

      // Apenas horários ativos podem
      // ser removidos novamente.
      const atual =
        await tx.orm.public.DisponibilidadeAgenda
          .where({
            id,
            medicoId,
            ativo: true
          })
          .first();

      if (!atual) {
        throw new Error(
          "Horário não encontrado."
        );
      }

      // ====================================
      // REMOÇÃO LÓGICA
      // ====================================

      const disponibilidade =
        await tx.orm.public.DisponibilidadeAgenda
          .where({
            id,
            medicoId,
            ativo: true
          })
          .update({
            ativo: false
          });

      if (!disponibilidade) {
        throw new Error(
          "Horário não encontrado."
        );
      }

      // ====================================
      // AUDITORIA DA REMOÇÃO
      // ====================================

      await tx.orm.public.AuditoriaAgenda
        .create({
          usuarioId,
          medicoId,
          disponibilidadeId: disponibilidade.id,
          agendamentoId: null,
          acao: "REMOVER_DISPONIBILIDADE",
          resultado: "SUCESSO",
          dataAgenda: disponibilidade.data,
          horaInicio: disponibilidade.horaInicio,
          horaFim: disponibilidade.horaFim,
          requisicaoId: null
        });

      return disponibilidade;
    }
  );
}
