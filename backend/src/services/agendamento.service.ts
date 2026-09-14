// Dependências do serviço de agendamento
import { db } from "../prisma/db";


// ========================================
// TIPOS
// ========================================

// Todos os status possíveis atualmente.
//
// AGENDADA permanece temporariamente
// somente para compatibilidade com
// registros antigos.
//
// Novos agendamentos utilizam PENDENTE.
export type StatusAgendamento =
  | "AGENDADA"
  | "PENDENTE"
  | "CONFIRMADA"
  | "REALIZADA"
  | "RECUSADA"
  | "CANCELADA"
  | "FALTOU";


// Representa um horário individual que pode
// ser exibido para o paciente ou médico.
export type SlotDisponivel = {
  horaInicio: string;
  horaFim: string;
};


// Estrutura utilizada internamente para
// representar um agendamento.
export type AgendamentoRegistro = {
  id: number;
  medicoId: number;
  pacienteId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: StatusAgendamento;
};


// Estrutura utilizada na agenda do médico.
//
// Mantém todos os dados do agendamento
// e acrescenta nome e telefone do paciente.
export type AgendamentoMedicoRegistro =
  AgendamentoRegistro & {
    pacienteNome: string;
    pacienteTelefone: string | null;
  };


// Dados necessários para criar
// um novo agendamento.
type CriarAgendamentoDados = {
  medicoId: number;
  pacienteId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
};


// Dados necessários para remarcar
// um agendamento.
//
// O frontend informa apenas:
//
// - nova data;
// - novo horário inicial.
//
// O horaFim será encontrado
// pelo próprio backend.
export type RemarcarAgendamentoDados = {
  data: string;
  horaInicio: string;
};


// ========================================
// FUNÇÕES AUXILIARES
// ========================================

// Converte um horário HH:mm
// para quantidade total de minutos.
//
// Exemplo:
//
// 08:30
//
// 8 * 60 + 30 = 510
function horarioParaMinutos(
  horario: string
): number {
  const [hora, minuto] = horario
    .split(":")
    .map(Number);

  return hora * 60 + minuto;
}


// Converte minutos novamente
// para o formato HH:mm.
//
// Exemplo:
//
// 510 -> 08:30
function minutosParaHorario(
  totalMinutos: number
): string {
  const hora = Math.floor(
    totalMinutos / 60
  );

  const minuto =
    totalMinutos % 60;

  return `${String(hora).padStart(
    2,
    "0"
  )}:${String(minuto).padStart(
    2,
    "0"
  )}`;
}


// ========================================
// STATUS QUE OCUPAM O HORÁRIO
// ========================================

// Define quais status bloqueiam um slot.
//
// PENDENTE:
// solicitação aguardando decisão do médico.
//
// CONFIRMADA:
// consulta aprovada.
//
// AGENDADA:
// mantido temporariamente por causa
// de registros antigos.
//
// RECUSADA e CANCELADA não ocupam horário.
function statusOcupaHorario(
  status: StatusAgendamento
): boolean {
  return (
    status === "PENDENTE" ||
    status === "AGENDADA" ||
    status === "CONFIRMADA"
  );
}


// ========================================
// BUSCAR PACIENTE PELO USUÁRIO
// ========================================

// Busca o paciente relacionado
// ao usuário autenticado.
//
// O usuarioId vem do JWT.
//
// Dessa forma o frontend não precisa
// informar pacienteId.
export async function buscarPacientePorUsuarioId(
  usuarioId: number
) {
  const paciente =
    await db.orm.public.Paciente
      .where({
        usuarioId
      })
      .first();

  return paciente;
}


// ========================================
// BUSCAR DISPONIBILIDADES DO MÉDICO
// ========================================

// Busca somente os períodos ativos
// cadastrados pelo médico naquela data.
export async function buscarDisponibilidadesDoMedico(
  medicoId: number,
  data: string
) {
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
// BUSCAR AGENDAMENTOS DA DATA
// ========================================

// Busca os agendamentos existentes
// daquele médico naquela data.
//
// Depois filtramos quais registros
// realmente bloqueiam horários.
export async function buscarAgendamentosAtivosDoMedico(
  medicoId: number,
  data: string
): Promise<AgendamentoRegistro[]> {
  const agendamentos =
    await db.orm.public.Agendamento
      .where({
        medicoId,
        data
      })
      .all();

  return agendamentos.filter(
    (agendamento) =>
      statusOcupaHorario(
        agendamento.status
      )
  );
}


// ========================================
// GERAR SLOTS
// ========================================

// Converte os períodos cadastrados
// pelo médico em horários individuais.
//
// Exemplo:
//
// Disponibilidade:
//
// 08:00 até 10:00
// duração = 30 minutos
//
// Resultado:
//
// 08:00 - 08:30
// 08:30 - 09:00
// 09:00 - 09:30
// 09:30 - 10:00
export function gerarSlotsDasDisponibilidades(
  disponibilidades: Array<{
    horaInicio: string;
    horaFim: string;
    duracaoConsulta: number;
  }>
): SlotDisponivel[] {
  const slots: SlotDisponivel[] = [];

  for (
    const disponibilidade
    of disponibilidades
  ) {
    const inicio =
      horarioParaMinutos(
        disponibilidade.horaInicio
      );

    const fim =
      horarioParaMinutos(
        disponibilidade.horaFim
      );

    const duracao =
      disponibilidade.duracaoConsulta;

    // Proteção contra duração inválida.
    //
    // Isso evita loop infinito.
    if (duracao <= 0) {
      continue;
    }

    let horarioAtual = inicio;

    while (
      horarioAtual + duracao <= fim
    ) {
      slots.push({
        horaInicio:
          minutosParaHorario(
            horarioAtual
          ),

        horaFim:
          minutosParaHorario(
            horarioAtual + duracao
          )
      });

      horarioAtual += duracao;
    }
  }

  return slots;
}


// ========================================
// LISTAR HORÁRIOS DISPONÍVEIS
// ========================================

// O paciente só consegue selecionar
// horários que:
//
// 1. foram disponibilizados pelo médico;
// 2. pertencem à data selecionada;
// 3. ainda não estão ocupados.
export async function listarHorariosDisponiveis(
  medicoId: number,
  data: string
): Promise<SlotDisponivel[]> {
  // Busca as disponibilidades
  // cadastradas pelo médico.
  const disponibilidades =
    await buscarDisponibilidadesDoMedico(
      medicoId,
      data
    );

  // Transforma os períodos
  // em horários individuais.
  const slots =
    gerarSlotsDasDisponibilidades(
      disponibilidades
    );

  // Busca os agendamentos
  // que ocupam horários.
  const agendamentos =
    await buscarAgendamentosAtivosDoMedico(
      medicoId,
      data
    );

  // Cria um conjunto contendo
  // os horários já ocupados.
  const horariosOcupados =
    new Set<string>(
      agendamentos.map(
        (agendamento) =>
          agendamento.horaInicio
      )
    );

  // Remove os slots ocupados.
  const horariosDisponiveis =
    slots.filter(
      (slot) =>
        !horariosOcupados.has(
          slot.horaInicio
        )
    );

  // Mantém a lista ordenada.
  horariosDisponiveis.sort(
    (a, b) =>
      a.horaInicio.localeCompare(
        b.horaInicio
      )
  );

  return horariosDisponiveis;
}


// ========================================
// VALIDAR HORÁRIO
// ========================================

// Verifica novamente no backend
// se o horário solicitado está livre.
//
// O frontend nunca é considerado
// a autoridade final da disponibilidade.
export async function horarioEstaDisponivel(
  medicoId: number,
  data: string,
  horaInicio: string
): Promise<SlotDisponivel | undefined> {
  const horarios =
    await listarHorariosDisponiveis(
      medicoId,
      data
    );

  const horarioEncontrado =
    horarios.find(
      (slot) =>
        slot.horaInicio === horaInicio
    );

  return horarioEncontrado;
}


// ========================================
// CRIAR AGENDAMENTO
// ========================================

// Cria uma nova solicitação.
//
// O paciente NÃO escolhe diretamente:
//
// - medicoId;
// - pacienteId;
// - horaFim;
// - status.
//
// Esses dados são definidos
// pelo backend.
//
// Todo novo registro passa a nascer:
//
// PENDENTE
export async function criarAgendamento(
  dados: CriarAgendamentoDados
): Promise<AgendamentoRegistro> {
  const agendamento =
    await db.orm.public.Agendamento
      .create({
        medicoId:
          dados.medicoId,

        pacienteId:
          dados.pacienteId,

        data:
          dados.data,

        horaInicio:
          dados.horaInicio,

        horaFim:
          dados.horaFim,

        status:
          "PENDENTE"
      });

  return agendamento;
}


// ========================================
// LISTAR AGENDAMENTOS DO PACIENTE
// ========================================

// Retorna todos os agendamentos
// pertencentes ao paciente.
export async function listarAgendamentosDoPaciente(
  pacienteId: number
): Promise<AgendamentoRegistro[]> {
  const agendamentos =
    await db.orm.public.Agendamento
      .where({
        pacienteId
      })
      .all();

  // Ordena primeiro pela data
  // e depois pelo horário.
  agendamentos.sort(
    (a, b) => {
      const compararData =
        a.data.localeCompare(
          b.data
        );

      if (compararData !== 0) {
        return compararData;
      }

      return a.horaInicio.localeCompare(
        b.horaInicio
      );
    }
  );

  return agendamentos;
}


// ========================================
// LISTAR AGENDAMENTOS DO MÉDICO
// ========================================

// Retorna os agendamentos
// relacionados ao médico.
//
// Também acrescenta:
//
// - nome do paciente;
// - telefone do paciente.
export async function listarAgendamentosDoMedico(
  medicoId: number
): Promise<AgendamentoMedicoRegistro[]> {
  // Busca os agendamentos.
  const agendamentos =
    await db.orm.public.Agendamento
      .where({
        medicoId
      })
      .all();

  // Busca os pacientes do médico
  // em uma única consulta.
  const pacientes =
    await db.orm.public.Paciente
      .where({
        medicoId
      })
      .all();

  // Cria um mapa dos pacientes
  // utilizando paciente.id como chave.
  const pacientesPorId =
    new Map(
      pacientes.map(
        (paciente) => [
          paciente.id,
          paciente
        ]
      )
    );

  const agendamentosComPaciente:
    AgendamentoMedicoRegistro[] =
    agendamentos.map(
      (agendamento) => {
        const paciente =
          pacientesPorId.get(
            agendamento.pacienteId
          );

        return {
          id:
            agendamento.id,

          medicoId:
            agendamento.medicoId,

          pacienteId:
            agendamento.pacienteId,

          data:
            agendamento.data,

          horaInicio:
            agendamento.horaInicio,

          horaFim:
            agendamento.horaFim,

          status:
            agendamento.status,

          pacienteNome:
            paciente?.nome ??
            "Paciente não encontrado",

          pacienteTelefone:
            paciente?.telefone ??
            null
        };
      }
    );

  // Ordena pela data e horário.
  agendamentosComPaciente.sort(
    (a, b) => {
      const compararData =
        a.data.localeCompare(
          b.data
        );

      if (compararData !== 0) {
        return compararData;
      }

      return a.horaInicio.localeCompare(
        b.horaInicio
      );
    }
  );

  return agendamentosComPaciente;
}


// ========================================
// BUSCAR AGENDAMENTO DO MÉDICO
// ========================================

// Busca um agendamento garantindo
// que ele pertença ao médico autenticado.
//
// Isso impede:
//
// Médico A
//        ↓
// tentar alterar consulta do Médico B.
export async function buscarAgendamentoDoMedicoPorId(
  id: number,
  medicoId: number
): Promise<AgendamentoRegistro> {
  const agendamento =
    await db.orm.public.Agendamento
      .where({
        id,
        medicoId
      })
      .first();

  if (!agendamento) {
    throw new Error(
      "Agendamento não encontrado."
    );
  }

  return agendamento;
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
// temporariamente para registros antigos.
export async function confirmarAgendamento(
  id: number,
  medicoId: number
): Promise<AgendamentoRegistro> {
  const agendamento =
    await buscarAgendamentoDoMedicoPorId(
      id,
      medicoId
    );

  if (
    agendamento.status !== "PENDENTE" &&
    agendamento.status !== "AGENDADA"
  ) {
    throw new Error(
      "Somente agendamentos pendentes podem ser confirmados."
    );
  }

  const agendamentoAtualizado =
    await db.orm.public.Agendamento
      .where({
        id,
        medicoId
      })
      .update({
        status:
          "CONFIRMADA"
      });

  if (!agendamentoAtualizado) {
    throw new Error(
      "Não foi possível confirmar o agendamento."
    );
  }

  return agendamentoAtualizado;
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
// Ao ser recusado,
// o horário volta a ficar disponível.
//
// AGENDADA permanece permitida
// temporariamente.
export async function recusarAgendamento(
  id: number,
  medicoId: number
): Promise<AgendamentoRegistro> {
  const agendamento =
    await buscarAgendamentoDoMedicoPorId(
      id,
      medicoId
    );

  if (
    agendamento.status !== "PENDENTE" &&
    agendamento.status !== "AGENDADA"
  ) {
    throw new Error(
      "Somente agendamentos pendentes podem ser recusados."
    );
  }

  const agendamentoAtualizado =
    await db.orm.public.Agendamento
      .where({
        id,
        medicoId
      })
      .update({
        status:
          "RECUSADA"
      });

  if (!agendamentoAtualizado) {
    throw new Error(
      "Não foi possível recusar o agendamento."
    );
  }

  return agendamentoAtualizado;
}


// ========================================
// CANCELAR / DESMARCAR
// ========================================

// Utilizado quando uma consulta
// confirmada precisa ser desmarcada.
//
// Fluxo:
//
// CONFIRMADA
//     ↓
// CANCELADA
//
// CANCELADA deixa de ocupar o slot.
//
// AGENDADA é aceita temporariamente
// por compatibilidade.
export async function cancelarAgendamento(
  id: number,
  medicoId: number
): Promise<AgendamentoRegistro> {
  const agendamento =
    await buscarAgendamentoDoMedicoPorId(
      id,
      medicoId
    );

  if (
    agendamento.status !== "CONFIRMADA" &&
    agendamento.status !== "AGENDADA"
  ) {
    throw new Error(
      "Somente consultas confirmadas podem ser canceladas."
    );
  }

  const agendamentoAtualizado =
    await db.orm.public.Agendamento
      .where({
        id,
        medicoId
      })
      .update({
        status:
          "CANCELADA"
      });

  if (!agendamentoAtualizado) {
    throw new Error(
      "Não foi possível cancelar o agendamento."
    );
  }

  return agendamentoAtualizado;
}


// ========================================
// REMARCAR AGENDAMENTO
// ========================================

// Permite ao médico alterar:
//
// - data;
// - horário.
//
// O médico não pode utilizar
// um horário arbitrário.
//
// O backend consulta novamente
// os slots disponíveis.
//
// Podem ser remarcados:
//
// PENDENTE
// CONFIRMADA
//
// AGENDADA permanece aceita
// temporariamente.
export async function remarcarAgendamento(
  id: number,
  medicoId: number,
  dados: RemarcarAgendamentoDados
): Promise<AgendamentoRegistro> {
  const agendamento =
    await buscarAgendamentoDoMedicoPorId(
      id,
      medicoId
    );


  // ========================================
  // VALIDAR STATUS
  // ========================================

  if (
    agendamento.status !== "PENDENTE" &&
    agendamento.status !== "CONFIRMADA" &&
    agendamento.status !== "AGENDADA"
  ) {
    throw new Error(
      "Este agendamento não pode ser remarcado."
    );
  }


  // ========================================
  // VALIDAR SE HOUVE ALTERAÇÃO
  // ========================================

  if (
    agendamento.data === dados.data &&
    agendamento.horaInicio ===
      dados.horaInicio
  ) {
    throw new Error(
      "Escolha um horário diferente do atual."
    );
  }


  // ========================================
  // VALIDAR NOVO SLOT
  // ========================================

  const novoHorario =
    await horarioEstaDisponivel(
      medicoId,
      dados.data,
      dados.horaInicio
    );

  if (!novoHorario) {
    throw new Error(
      "O horário selecionado não está mais disponível."
    );
  }


  // ========================================
  // ATUALIZAR AGENDAMENTO
  // ========================================

  const agendamentoAtualizado =
    await db.orm.public.Agendamento
      .where({
        id,
        medicoId
      })
      .update({
        data:
          dados.data,

        horaInicio:
          novoHorario.horaInicio,

        horaFim:
          novoHorario.horaFim
      });

  if (!agendamentoAtualizado) {
    throw new Error(
      "Não foi possível remarcar o agendamento."
    );
  }

  return agendamentoAtualizado;
}