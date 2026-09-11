// Dependências do serviço de agendamento
import { db } from "../prisma/db";

// ========================================
// TIPOS
// ========================================

// Representa um horário individual que pode
// ser exibido para o paciente.
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
  status:
    | "AGENDADA"
    | "CONFIRMADA"
    | "REALIZADA"
    | "CANCELADA"
    | "FALTOU";
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

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

// Converte um horário HH:mm para
// quantidade total de minutos.
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
// que o médico cadastrou naquela data.
//
// Exemplo:
//
// Médico cadastrou:
//
// 15/09/2026
// 08:00 até 12:00
//
// somente essa disponibilidade será
// utilizada para gerar os horários.
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
// Depois filtramos em JavaScript quais
// realmente ocupam horário.
//
// Fazemos assim para manter compatibilidade
// com o ORM utilizado neste projeto.
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

  // Apenas AGENDADA e CONFIRMADA
  // bloqueiam um horário.
  //
  // CANCELADA não deve impedir
  // outro paciente de agendar.
  return agendamentos.filter(
    (agendamento) =>
      agendamento.status === "AGENDADA" ||
      agendamento.status === "CONFIRMADA"
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

    // Proteção contra alguma duração
    // inválida cadastrada no banco.
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

// Esta é uma das regras principais
// do sistema.
//
// O paciente NÃO escolhe qualquer horário.
//
// Ele só consegue selecionar horários que:
//
// 1. o médico disponibilizou;
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

  // Busca os agendamentos que
  // já ocupam horários.
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

  // Remove da lista os horários
  // que já possuem agendamento.
  const horariosDisponiveis =
    slots.filter(
      (slot) =>
        !horariosOcupados.has(
          slot.horaInicio
        )
    );

  return horariosDisponiveis;
}

// ========================================
// VALIDAR HORÁRIO
// ========================================

// Verifica se o horário solicitado
// pelo paciente realmente está disponível.
//
// Essa validação acontece no backend.
//
// Isso é importante porque mesmo que
// alguém altere manualmente o frontend,
// não será possível agendar um horário
// não cadastrado pelo médico.
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

// Cria um novo agendamento.
//
// O paciente NÃO escolhe:
//
// - medicoId
// - pacienteId
// - horaFim
//
// Esses valores são definidos
// pelo próprio backend.
//
// Isso deixa o sistema mais seguro.
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
          "AGENDADA"
      });

  return agendamento;
}

// ========================================
// LISTAR AGENDAMENTOS DO PACIENTE
// ========================================

// Retorna todos os agendamentos
// pertencentes ao paciente.
//
// Futuramente esta função poderá ser
// utilizada na área "Minhas consultas".
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

// Retorna todos os agendamentos
// relacionados ao médico.
//
// Posteriormente será utilizado
// na aba:
//
// "Horários marcados"
export async function listarAgendamentosDoMedico(
  medicoId: number
): Promise<AgendamentoRegistro[]> {
  const agendamentos =
    await db.orm.public.Agendamento
      .where({
        medicoId
      })
      .all();

  // Ordena os registros por
  // data e horário.
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