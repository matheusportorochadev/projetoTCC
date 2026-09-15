import { db } from "../prisma/db";


// ========================================
// TIPOS
// ========================================

export type StatusAgendamento =
  | "AGENDADA"
  | "PENDENTE"
  | "CONFIRMADA"
  | "REALIZADA"
  | "RECUSADA"
  | "CANCELADA"
  | "FALTOU";

export type StatusRemarcacao =
  | "PENDENTE"
  | "ACEITA"
  | "RECUSADA";

export type SlotDisponivel = {
  horaInicio: string;
  horaFim: string;
};

export type AgendamentoRegistro = {
  id: number;
  medicoId: number;
  pacienteId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: StatusAgendamento;
};

export type AgendamentoMedicoRegistro =
  AgendamentoRegistro & {
    pacienteNome: string;
    pacienteTelefone: string | null;
  };

export type RemarcacaoRegistro = {
  id: number;
  agendamentoId: number;
  novaData: string;
  novaHoraInicio: string;
  novaHoraFim: string;
  status: StatusRemarcacao;
  visualizadoPaciente: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RemarcacaoMedicoRegistro =
  RemarcacaoRegistro & {
    medicoId: number;
    pacienteId: number;
    pacienteNome: string;
    pacienteTelefone: string | null;
    dataAtual: string;
    horaInicioAtual: string;
    horaFimAtual: string;
    statusAgendamento: StatusAgendamento;
  };

export type RemarcacaoPacienteRegistro =
  RemarcacaoRegistro & {
    dataAtual: string;
    horaInicioAtual: string;
    horaFimAtual: string;
    statusAgendamento: StatusAgendamento;
  };

type CriarAgendamentoDados = {
  medicoId: number;
  pacienteId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
};

export type SolicitarRemarcacaoDados = {
  data: string;
  horaInicio: string;
};


// ========================================
// CONSULTA CRIADA PELO MÉDICO
// ========================================

export type CriarAgendamentoMedicoDados = {
  pacienteId: number;
  data: string;
  horaInicio: string;
  duracaoConsulta: number;
};


// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function horarioParaMinutos(
  horario: string
): number {
  const [hora, minuto] =
    horario.split(":").map(Number);

  return hora * 60 + minuto;
}


function minutosParaHorario(
  totalMinutos: number
): string {
  const hora =
    Math.floor(totalMinutos / 60);

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
// VALIDAR DATA
// ========================================

function dataPossuiFormatoValido(
  data: string
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(data)
  ) {
    return false;
  }

  const [
    anoTexto,
    mesTexto,
    diaTexto
  ] = data.split("-");

  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  const dataCriada =
    new Date(
      ano,
      mes - 1,
      dia
    );

  return (
    dataCriada.getFullYear() === ano &&
    dataCriada.getMonth() === mes - 1 &&
    dataCriada.getDate() === dia
  );
}


// ========================================
// VALIDAR HORÁRIO
// ========================================

function horarioPossuiFormatoValido(
  horario: string
): boolean {
  if (
    !/^\d{2}:\d{2}$/.test(horario)
  ) {
    return false;
  }

  const [
    horaTexto,
    minutoTexto
  ] = horario.split(":");

  const hora = Number(horaTexto);
  const minuto = Number(minutoTexto);

  return (
    Number.isInteger(hora) &&
    Number.isInteger(minuto) &&
    hora >= 0 &&
    hora <= 23 &&
    minuto >= 0 &&
    minuto <= 59
  );
}


// ========================================
// STATUS QUE OCUPAM A AGENDA
// ========================================

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
// SOBREPOSIÇÃO DE HORÁRIOS
// ========================================
//
// Exemplo:
//
// existente:
// 14:00 - 15:00
//
// novo:
// 14:30 - 15:30
//
// conflito = true
//
// Porém:
//
// existente:
// 14:00 - 15:00
//
// novo:
// 15:00 - 15:30
//
// conflito = false

function horariosSeSobrepoem(
  inicioA: string,
  fimA: string,
  inicioB: string,
  fimB: string
): boolean {
  const inicioAMinutos =
    horarioParaMinutos(inicioA);

  const fimAMinutos =
    horarioParaMinutos(fimA);

  const inicioBMinutos =
    horarioParaMinutos(inicioB);

  const fimBMinutos =
    horarioParaMinutos(fimB);

  return (
    inicioAMinutos < fimBMinutos &&
    fimAMinutos > inicioBMinutos
  );
}


// ========================================
// BUSCAR PACIENTE PELO USUÁRIO
// ========================================

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
// BUSCAR DISPONIBILIDADES
// ========================================

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
// BUSCAR AGENDAMENTOS ATIVOS DA DATA
// ========================================

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
// REMARCAÇÕES QUE RESERVAM HORÁRIO
// ========================================

async function buscarHorariosReservadosPorRemarcacao(
  medicoId: number,
  data: string
): Promise<string[]> {
  const remarcacoes =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        novaData: data,
        status: "PENDENTE"
      })
      .all();

  if (
    remarcacoes.length === 0
  ) {
    return [];
  }

  const agendamentos =
    await db.orm.public.Agendamento
      .where({
        medicoId
      })
      .all();

  const idsAgendamentosDoMedico =
    new Set<number>(
      agendamentos.map(
        (agendamento) =>
          agendamento.id
      )
    );

  return remarcacoes
    .filter(
      (remarcacao) =>
        idsAgendamentosDoMedico.has(
          remarcacao.agendamentoId
        )
    )
    .map(
      (remarcacao) =>
        remarcacao.novaHoraInicio
    );
}


// ========================================
// GERAR SLOTS
// ========================================

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

    if (
      duracao <= 0
    ) {
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
//
// Utilizado pelo PACIENTE.
//
// Aqui a DisponibilidadeAgenda continua
// sendo obrigatória porque representa
// aquilo que o médico liberou para
// autoagendamento do paciente.

export async function listarHorariosDisponiveis(
  medicoId: number,
  data: string
): Promise<SlotDisponivel[]> {
  const disponibilidades =
    await buscarDisponibilidadesDoMedico(
      medicoId,
      data
    );

  const slots =
    gerarSlotsDasDisponibilidades(
      disponibilidades
    );

  const agendamentos =
    await buscarAgendamentosAtivosDoMedico(
      medicoId,
      data
    );

  const horariosRemarcacao =
    await buscarHorariosReservadosPorRemarcacao(
      medicoId,
      data
    );

  const horariosOcupados =
    new Set<string>();

  for (
    const agendamento
    of agendamentos
  ) {
    horariosOcupados.add(
      agendamento.horaInicio
    );
  }

  for (
    const horario
    of horariosRemarcacao
  ) {
    horariosOcupados.add(
      horario
    );
  }

  const horariosDisponiveis =
    slots.filter(
      (slot) =>
        !horariosOcupados.has(
          slot.horaInicio
        )
    );

  horariosDisponiveis.sort(
    (a, b) =>
      a.horaInicio.localeCompare(
        b.horaInicio
      )
  );

  return horariosDisponiveis;
}


// ========================================
// VERIFICAR SLOT DISPONÍVEL
// ========================================

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

  return horarios.find(
    (slot) =>
      slot.horaInicio === horaInicio
  );
}


// ========================================
// CRIAR AGENDAMENTO PELO PACIENTE
// ========================================
//
// O paciente solicita.
//
// Portanto:
//
// status = PENDENTE

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
// CRIAR AGENDAMENTO DIRETAMENTE PELO MÉDICO
// ========================================
//
// NOVO FLUXO:
//
// A médica escolhe:
//
// - paciente;
// - data;
// - horário;
// - duração.
//
// NÃO depende de DisponibilidadeAgenda.
//
// Como a própria médica está criando,
// a consulta já nasce CONFIRMADA.

export async function criarAgendamentoPeloMedico(
  medicoId: number,
  dados: CriarAgendamentoMedicoDados
): Promise<AgendamentoRegistro> {

  // ========================================
  // VALIDAR PACIENTE
  // ========================================

  const paciente =
    await db.orm.public.Paciente
      .where({
        id:
          dados.pacienteId,

        medicoId,

        ativo:
          true
      })
      .first();

  if (!paciente) {
    throw new Error(
      "Paciente não encontrado ou não pertence a este médico."
    );
  }


  // ========================================
  // VALIDAR DATA
  // ========================================

  if (
    !dataPossuiFormatoValido(
      dados.data
    )
  ) {
    throw new Error(
      "Data inválida."
    );
  }


  // ========================================
  // NÃO PERMITIR DATA PASSADA
  // ========================================

  const agora = new Date();

  const anoAtual =
    agora.getFullYear();

  const mesAtual =
    String(
      agora.getMonth() + 1
    ).padStart(2, "0");

  const diaAtual =
    String(
      agora.getDate()
    ).padStart(2, "0");

  const hoje =
    `${anoAtual}-${mesAtual}-${diaAtual}`;

  if (
    dados.data < hoje
  ) {
    throw new Error(
      "Não é possível cadastrar uma consulta em uma data passada."
    );
  }


  // ========================================
  // VALIDAR HORÁRIO
  // ========================================

  if (
    !horarioPossuiFormatoValido(
      dados.horaInicio
    )
  ) {
    throw new Error(
      "Horário inválido."
    );
  }


  // ========================================
  // VALIDAR DURAÇÃO
  // ========================================

  if (
    !Number.isInteger(
      dados.duracaoConsulta
    ) ||
    dados.duracaoConsulta <= 0 ||
    dados.duracaoConsulta > 1440
  ) {
    throw new Error(
      "Duração da consulta inválida."
    );
  }


  // ========================================
  // CALCULAR HORA FINAL
  // ========================================

  const inicioMinutos =
    horarioParaMinutos(
      dados.horaInicio
    );

  const fimMinutos =
    inicioMinutos +
    dados.duracaoConsulta;

  if (
    fimMinutos > 24 * 60
  ) {
    throw new Error(
      "O horário final da consulta ultrapassa o fim do dia."
    );
  }

  const horaFim =
    minutosParaHorario(
      fimMinutos
    );


  // ========================================
  // VERIFICAR CONFLITO COM AGENDAMENTOS
  // ========================================

  const agendamentosDaData =
    await db.orm.public.Agendamento
      .where({
        medicoId,
        data:
          dados.data
      })
      .all();

  const conflitoAgendamento =
    agendamentosDaData.find(
      (agendamento) => {
        if (
          !statusOcupaHorario(
            agendamento.status
          )
        ) {
          return false;
        }

        return horariosSeSobrepoem(
          dados.horaInicio,
          horaFim,
          agendamento.horaInicio,
          agendamento.horaFim
        );
      }
    );

  if (
    conflitoAgendamento
  ) {
    throw new Error(
      "Já existe uma consulta ocupando este período."
    );
  }


  // ========================================
  // VERIFICAR REMARCAÇÕES PENDENTES
  // ========================================

  const remarcacoesDaData =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        novaData:
          dados.data,

        status:
          "PENDENTE"
      })
      .all();

  if (
    remarcacoesDaData.length > 0
  ) {
    const agendamentosDoMedico =
      await db.orm.public.Agendamento
        .where({
          medicoId
        })
        .all();

    const idsAgendamentosDoMedico =
      new Set<number>(
        agendamentosDoMedico.map(
          (agendamento) =>
            agendamento.id
        )
      );

    const conflitoRemarcacao =
      remarcacoesDaData.find(
        (remarcacao) => {
          if (
            !idsAgendamentosDoMedico.has(
              remarcacao.agendamentoId
            )
          ) {
            return false;
          }

          return horariosSeSobrepoem(
            dados.horaInicio,
            horaFim,
            remarcacao.novaHoraInicio,
            remarcacao.novaHoraFim
          );
        }
      );

    if (
      conflitoRemarcacao
    ) {
      throw new Error(
        "Este período está reservado por uma solicitação de remarcação pendente."
      );
    }
  }


  // ========================================
  // CRIAR CONSULTA
  // ========================================

  const agendamento =
    await db.orm.public.Agendamento
      .create({
        medicoId,

        pacienteId:
          paciente.id,

        data:
          dados.data,

        horaInicio:
          dados.horaInicio,

        horaFim,

        status:
          "CONFIRMADA"
      });

  return agendamento;
}


// ========================================
// LISTAR AGENDAMENTOS DO PACIENTE
// ========================================

export async function listarAgendamentosDoPaciente(
  pacienteId: number
): Promise<AgendamentoRegistro[]> {
  const agendamentos =
    await db.orm.public.Agendamento
      .where({
        pacienteId
      })
      .all();

  agendamentos.sort(
    (a, b) => {
      const compararData =
        a.data.localeCompare(
          b.data
        );

      if (
        compararData !== 0
      ) {
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

export async function listarAgendamentosDoMedico(
  medicoId: number
): Promise<AgendamentoMedicoRegistro[]> {
  const agendamentos =
    await db.orm.public.Agendamento
      .where({
        medicoId
      })
      .all();

  const pacientes =
    await db.orm.public.Paciente
      .where({
        medicoId
      })
      .all();

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

  agendamentosComPaciente.sort(
    (a, b) => {
      const compararData =
        a.data.localeCompare(
          b.data
        );

      if (
        compararData !== 0
      ) {
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
// BUSCAR AGENDAMENTO DO PACIENTE
// ========================================

export async function buscarAgendamentoDoPacientePorId(
  id: number,
  pacienteId: number
): Promise<AgendamentoRegistro> {
  const agendamento =
    await db.orm.public.Agendamento
      .where({
        id,
        pacienteId
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

  if (
    !agendamentoAtualizado
  ) {
    throw new Error(
      "Não foi possível confirmar o agendamento."
    );
  }

  return agendamentoAtualizado;
}


// ========================================
// RECUSAR AGENDAMENTO
// ========================================

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

  if (
    !agendamentoAtualizado
  ) {
    throw new Error(
      "Não foi possível recusar o agendamento."
    );
  }

  return agendamentoAtualizado;
}


// ========================================
// CANCELAR PELO MÉDICO
// ========================================

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

  if (
    !agendamentoAtualizado
  ) {
    throw new Error(
      "Não foi possível cancelar o agendamento."
    );
  }

  return agendamentoAtualizado;
}


// ========================================
// CANCELAR PELO PACIENTE
// ========================================

export async function cancelarAgendamentoPaciente(
  id: number,
  pacienteId: number
): Promise<AgendamentoRegistro> {
  const agendamento =
    await buscarAgendamentoDoPacientePorId(
      id,
      pacienteId
    );

  if (
    agendamento.status !== "PENDENTE" &&
    agendamento.status !== "CONFIRMADA" &&
    agendamento.status !== "AGENDADA"
  ) {
    throw new Error(
      "Este agendamento não pode ser cancelado."
    );
  }

  const remarcacaoPendente =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        agendamentoId:
          id,

        status:
          "PENDENTE"
      })
      .first();

  if (
    remarcacaoPendente
  ) {
    await db.orm.public.RemarcacaoAgendamento
      .where({
        id:
          remarcacaoPendente.id
      })
      .update({
        status:
          "RECUSADA"
      });
  }

  const agendamentoAtualizado =
    await db.orm.public.Agendamento
      .where({
        id,
        pacienteId
      })
      .update({
        status:
          "CANCELADA"
      });

  if (
    !agendamentoAtualizado
  ) {
    throw new Error(
      "Não foi possível cancelar o agendamento."
    );
  }

  return agendamentoAtualizado;
}


// ========================================
// SOLICITAR REMARCAÇÃO
// ========================================

export async function solicitarRemarcacao(
  agendamentoId: number,
  pacienteId: number,
  dados: SolicitarRemarcacaoDados
): Promise<RemarcacaoRegistro> {
  const agendamento =
    await buscarAgendamentoDoPacientePorId(
      agendamentoId,
      pacienteId
    );

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
  // NÃO PERMITIR MESMO HORÁRIO
  // ========================================

  if (
    agendamento.data ===
      dados.data &&
    agendamento.horaInicio ===
      dados.horaInicio
  ) {
    throw new Error(
      "Escolha um horário diferente do atual."
    );
  }


  // ========================================
  // IMPEDIR SOLICITAÇÕES DUPLICADAS
  // ========================================

  const remarcacaoExistente =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        agendamentoId,
        status:
          "PENDENTE"
      })
      .first();

  if (
    remarcacaoExistente
  ) {
    throw new Error(
      "Já existe uma solicitação de remarcação aguardando resposta do médico."
    );
  }


  // ========================================
  // VALIDAR NOVO SLOT
  // ========================================

  const novoHorario =
    await horarioEstaDisponivel(
      agendamento.medicoId,
      dados.data,
      dados.horaInicio
    );

  if (!novoHorario) {
    throw new Error(
      "O horário selecionado não está mais disponível."
    );
  }


  // ========================================
  // CRIAR SOLICITAÇÃO
  // ========================================

  const remarcacao =
    await db.orm.public.RemarcacaoAgendamento
      .create({
        agendamentoId,

        novaData:
          dados.data,

        novaHoraInicio:
          novoHorario.horaInicio,

        novaHoraFim:
          novoHorario.horaFim,

        status:
          "PENDENTE",

        visualizadoPaciente:
          false
      });

  return remarcacao;
}


// ========================================
// LISTAR REMARCAÇÕES DO PACIENTE
// ========================================

export async function listarRemarcacoesDoPaciente(
  pacienteId: number
): Promise<RemarcacaoPacienteRegistro[]> {
  const agendamentos =
    await db.orm.public.Agendamento
      .where({
        pacienteId
      })
      .all();

  if (
    agendamentos.length === 0
  ) {
    return [];
  }

  const agendamentosPorId =
    new Map(
      agendamentos.map(
        (agendamento) => [
          agendamento.id,
          agendamento
        ]
      )
    );

  const remarcacoes =
    await db.orm.public.RemarcacaoAgendamento
      .where({})
      .all();

  const resultado:
    RemarcacaoPacienteRegistro[] = [];

  for (
    const remarcacao
    of remarcacoes
  ) {
    const agendamento =
      agendamentosPorId.get(
        remarcacao.agendamentoId
      );

    if (!agendamento) {
      continue;
    }

    resultado.push({
      id:
        remarcacao.id,

      agendamentoId:
        remarcacao.agendamentoId,

      novaData:
        remarcacao.novaData,

      novaHoraInicio:
        remarcacao.novaHoraInicio,

      novaHoraFim:
        remarcacao.novaHoraFim,

      status:
        remarcacao.status,

      visualizadoPaciente:
        remarcacao.visualizadoPaciente,

      createdAt:
        remarcacao.createdAt,

      updatedAt:
        remarcacao.updatedAt,

      dataAtual:
        agendamento.data,

      horaInicioAtual:
        agendamento.horaInicio,

      horaFimAtual:
        agendamento.horaFim,

      statusAgendamento:
        agendamento.status
    });
  }

  resultado.sort(
    (a, b) =>
      b.createdAt.localeCompare(
        a.createdAt
      )
  );

  return resultado;
}


// ========================================
// REMARCAÇÕES PENDENTES DO MÉDICO
// ========================================

export async function listarRemarcacoesPendentesDoMedico(
  medicoId: number
): Promise<RemarcacaoMedicoRegistro[]> {
  const agendamentos =
    await db.orm.public.Agendamento
      .where({
        medicoId
      })
      .all();

  if (
    agendamentos.length === 0
  ) {
    return [];
  }

  const agendamentosPorId =
    new Map(
      agendamentos.map(
        (agendamento) => [
          agendamento.id,
          agendamento
        ]
      )
    );

  const pacientes =
    await db.orm.public.Paciente
      .where({
        medicoId
      })
      .all();

  const pacientesPorId =
    new Map(
      pacientes.map(
        (paciente) => [
          paciente.id,
          paciente
        ]
      )
    );

  const remarcacoes =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        status:
          "PENDENTE"
      })
      .all();

  const resultado:
    RemarcacaoMedicoRegistro[] = [];

  for (
    const remarcacao
    of remarcacoes
  ) {
    const agendamento =
      agendamentosPorId.get(
        remarcacao.agendamentoId
      );

    if (!agendamento) {
      continue;
    }

    const paciente =
      pacientesPorId.get(
        agendamento.pacienteId
      );

    resultado.push({
      id:
        remarcacao.id,

      agendamentoId:
        remarcacao.agendamentoId,

      novaData:
        remarcacao.novaData,

      novaHoraInicio:
        remarcacao.novaHoraInicio,

      novaHoraFim:
        remarcacao.novaHoraFim,

      status:
        remarcacao.status,

      visualizadoPaciente:
        remarcacao.visualizadoPaciente,

      createdAt:
        remarcacao.createdAt,

      updatedAt:
        remarcacao.updatedAt,

      medicoId:
        agendamento.medicoId,

      pacienteId:
        agendamento.pacienteId,

      pacienteNome:
        paciente?.nome ??
        "Paciente não encontrado",

      pacienteTelefone:
        paciente?.telefone ??
        null,

      dataAtual:
        agendamento.data,

      horaInicioAtual:
        agendamento.horaInicio,

      horaFimAtual:
        agendamento.horaFim,

      statusAgendamento:
        agendamento.status
    });
  }

  resultado.sort(
    (a, b) =>
      a.createdAt.localeCompare(
        b.createdAt
      )
  );

  return resultado;
}


// ========================================
// BUSCAR REMARCAÇÃO DO MÉDICO
// ========================================

async function buscarRemarcacaoDoMedico(
  remarcacaoId: number,
  medicoId: number
) {
  const remarcacao =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        id:
          remarcacaoId
      })
      .first();

  if (!remarcacao) {
    throw new Error(
      "Solicitação de remarcação não encontrada."
    );
  }

  const agendamento =
    await buscarAgendamentoDoMedicoPorId(
      remarcacao.agendamentoId,
      medicoId
    );

  return {
    remarcacao,
    agendamento
  };
}


// ========================================
// ACEITAR REMARCAÇÃO
// ========================================

export async function aceitarRemarcacao(
  remarcacaoId: number,
  medicoId: number
): Promise<RemarcacaoRegistro> {
  const {
    remarcacao,
    agendamento
  } =
    await buscarRemarcacaoDoMedico(
      remarcacaoId,
      medicoId
    );

  if (
    remarcacao.status !==
    "PENDENTE"
  ) {
    throw new Error(
      "Esta solicitação de remarcação já foi respondida."
    );
  }

  if (
    agendamento.status === "CANCELADA" ||
    agendamento.status === "RECUSADA" ||
    agendamento.status === "REALIZADA" ||
    agendamento.status === "FALTOU"
  ) {
    throw new Error(
      "O agendamento não pode mais ser remarcado."
    );
  }


  // ========================================
  // VERIFICAR CONFLITO COM CONSULTAS
  // ========================================

  const agendamentosNoNovoHorario =
    await db.orm.public.Agendamento
      .where({
        medicoId,

        data:
          remarcacao.novaData
      })
      .all();

  const conflito =
    agendamentosNoNovoHorario.find(
      (item) => {
        // Ignora a própria consulta que
        // está sendo remarcada.
        if (
          item.id ===
          agendamento.id
        ) {
          return false;
        }

        if (
          !statusOcupaHorario(
            item.status
          )
        ) {
          return false;
        }

        return horariosSeSobrepoem(
          remarcacao.novaHoraInicio,
          remarcacao.novaHoraFim,
          item.horaInicio,
          item.horaFim
        );
      }
    );

  if (
    conflito
  ) {
    throw new Error(
      "O novo horário não está mais disponível."
    );
  }


  // ========================================
  // VERIFICAR OUTRAS REMARCAÇÕES
  // ========================================

  const outrasRemarcacoes =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        novaData:
          remarcacao.novaData,

        status:
          "PENDENTE"
      })
      .all();

  const agendamentosDoMedico =
    await db.orm.public.Agendamento
      .where({
        medicoId
      })
      .all();

  const idsAgendamentosDoMedico =
    new Set<number>(
      agendamentosDoMedico.map(
        (item) =>
          item.id
      )
    );

  const conflitoOutraRemarcacao =
    outrasRemarcacoes.find(
      (outra) => {
        if (
          outra.id ===
          remarcacao.id
        ) {
          return false;
        }

        if (
          !idsAgendamentosDoMedico.has(
            outra.agendamentoId
          )
        ) {
          return false;
        }

        return horariosSeSobrepoem(
          remarcacao.novaHoraInicio,
          remarcacao.novaHoraFim,
          outra.novaHoraInicio,
          outra.novaHoraFim
        );
      }
    );

  if (
    conflitoOutraRemarcacao
  ) {
    throw new Error(
      "O novo horário está reservado por outra solicitação de remarcação."
    );
  }


  // ========================================
  // ATUALIZAR AGENDAMENTO
  // ========================================

  const agendamentoAtualizado =
    await db.orm.public.Agendamento
      .where({
        id:
          agendamento.id,

        medicoId
      })
      .update({
        data:
          remarcacao.novaData,

        horaInicio:
          remarcacao.novaHoraInicio,

        horaFim:
          remarcacao.novaHoraFim,

        status:
          "CONFIRMADA"
      });

  if (
    !agendamentoAtualizado
  ) {
    throw new Error(
      "Não foi possível atualizar o agendamento."
    );
  }


  // ========================================
  // MARCAR COMO ACEITA
  // ========================================

  const remarcacaoAtualizada =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        id:
          remarcacaoId
      })
      .update({
        status:
          "ACEITA",

        visualizadoPaciente:
          false
      });

  if (
    !remarcacaoAtualizada
  ) {
    throw new Error(
      "Não foi possível concluir a remarcação."
    );
  }

  return remarcacaoAtualizada;
}


// ========================================
// RECUSAR REMARCAÇÃO
// ========================================

export async function recusarRemarcacao(
  remarcacaoId: number,
  medicoId: number
): Promise<RemarcacaoRegistro> {
  const {
    remarcacao
  } =
    await buscarRemarcacaoDoMedico(
      remarcacaoId,
      medicoId
    );

  if (
    remarcacao.status !==
    "PENDENTE"
  ) {
    throw new Error(
      "Esta solicitação de remarcação já foi respondida."
    );
  }

  const remarcacaoAtualizada =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        id:
          remarcacaoId
      })
      .update({
        status:
          "RECUSADA",

        visualizadoPaciente:
          false
      });

  if (
    !remarcacaoAtualizada
  ) {
    throw new Error(
      "Não foi possível recusar a remarcação."
    );
  }

  return remarcacaoAtualizada;
}


// ========================================
// VISUALIZAR RESPOSTA DA REMARCAÇÃO
// ========================================

export async function marcarRemarcacaoComoVisualizada(
  remarcacaoId: number,
  pacienteId: number
): Promise<RemarcacaoRegistro> {
  const remarcacao =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        id:
          remarcacaoId
      })
      .first();

  if (!remarcacao) {
    throw new Error(
      "Solicitação de remarcação não encontrada."
    );
  }

  await buscarAgendamentoDoPacientePorId(
    remarcacao.agendamentoId,
    pacienteId
  );

  if (
    remarcacao.status ===
    "PENDENTE"
  ) {
    throw new Error(
      "Esta solicitação ainda não foi respondida."
    );
  }

  const remarcacaoAtualizada =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        id:
          remarcacaoId
      })
      .update({
        visualizadoPaciente:
          true
      });

  if (
    !remarcacaoAtualizada
  ) {
    throw new Error(
      "Não foi possível atualizar a visualização."
    );
  }

  return remarcacaoAtualizada;
}


// ========================================
// EXCLUIR CONSULTA DEFINITIVAMENTE
// ========================================
//
// CANCELAR:
// mantém no banco com CANCELADA.
//
// EXCLUIR:
// remove definitivamente.
//
// Como RemarcacaoAgendamento possui
// referência ao Agendamento, primeiro
// removemos as remarcações relacionadas.

export async function excluirAgendamento(
  id: number,
  medicoId: number
): Promise<void> {

  // Garante que existe e pertence
  // ao médico autenticado.
  await buscarAgendamentoDoMedicoPorId(
    id,
    medicoId
  );

  const remarcacoes =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        agendamentoId:
          id
      })
      .all();

  for (
    const remarcacao
    of remarcacoes
  ) {
    await db.orm.public.RemarcacaoAgendamento
      .where({
        id:
          remarcacao.id
      })
      .delete();
  }

  const agendamentoExcluido =
    await db.orm.public.Agendamento
      .where({
        id,
        medicoId
      })
      .delete();

  if (
    !agendamentoExcluido
  ) {
    throw new Error(
      "Não foi possível excluir o agendamento."
    );
  }
}
// ========================================
// REMARCAR CONSULTA DIRETAMENTE PELO MÉDICO
// ========================================
//
// Este fluxo é diferente da solicitação
// de remarcação feita pelo paciente.
//
// PACIENTE:
//
// solicita novo horário
//        ↓
// RemarcacaoAgendamento = PENDENTE
//        ↓
// médico aceita ou recusa
//
//
// MÉDICO:
//
// escolhe diretamente um novo horário
//        ↓
// Agendamento é alterado imediatamente
//        ↓
// continua CONFIRMADA
//
// A remarcação direta do médico utiliza
// as disponibilidades configuradas na
// agenda, mantendo o comportamento que
// já existia no frontend.

export async function remarcarAgendamento(
  id: number,
  medicoId: number,
  data: string,
  horaInicio: string
): Promise<AgendamentoRegistro> {

  // ========================================
  // BUSCAR AGENDAMENTO
  // ========================================

  const agendamento =
    await buscarAgendamentoDoMedicoPorId(
      id,
      medicoId
    );


  // ========================================
  // VALIDAR STATUS
  // ========================================
  //
  // Permitimos remarcar consultas:
  //
  // PENDENTE
  // AGENDADA
  // CONFIRMADA
  //
  // Consultas finalizadas, canceladas
  // ou recusadas não podem ser remarcadas.

  if (
    agendamento.status !== "PENDENTE" &&
    agendamento.status !== "AGENDADA" &&
    agendamento.status !== "CONFIRMADA"
  ) {
    throw new Error(
      "Este agendamento não pode ser remarcado."
    );
  }


  // ========================================
  // VALIDAR DATA
  // ========================================

  if (
    !dataPossuiFormatoValido(
      data
    )
  ) {
    throw new Error(
      "Data inválida."
    );
  }


  // ========================================
  // NÃO PERMITIR DATA PASSADA
  // ========================================

  const agora =
    new Date();

  const anoAtual =
    agora.getFullYear();

  const mesAtual =
    String(
      agora.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const diaAtual =
    String(
      agora.getDate()
    ).padStart(
      2,
      "0"
    );

  const hoje =
    `${anoAtual}-${mesAtual}-${diaAtual}`;

  if (
    data < hoje
  ) {
    throw new Error(
      "Não é possível remarcar uma consulta para uma data passada."
    );
  }


  // ========================================
  // VALIDAR HORÁRIO
  // ========================================

  if (
    !horarioPossuiFormatoValido(
      horaInicio
    )
  ) {
    throw new Error(
      "Horário inválido."
    );
  }


  // ========================================
  // NÃO PERMITIR O MESMO HORÁRIO
  // ========================================

  if (
    agendamento.data === data &&
    agendamento.horaInicio ===
      horaInicio
  ) {
    throw new Error(
      "Escolha um horário diferente do atual."
    );
  }


  // ========================================
  // BUSCAR DISPONIBILIDADES DA DATA
  // ========================================
  //
  // Aqui mantemos exatamente a dinâmica
  // que já existia no frontend:
  //
  // para REMARCAR uma consulta existente,
  // o médico escolhe um slot configurado
  // em DisponibilidadeAgenda.

  const disponibilidades =
    await buscarDisponibilidadesDoMedico(
      medicoId,
      data
    );

  const slots =
    gerarSlotsDasDisponibilidades(
      disponibilidades
    );

  const slotSelecionado =
    slots.find(
      (slot) =>
        slot.horaInicio ===
        horaInicio
    );

  if (
    !slotSelecionado
  ) {
    throw new Error(
      "O horário selecionado não pertence às disponibilidades configuradas."
    );
  }


  // ========================================
  // VERIFICAR CONFLITO COM CONSULTAS
  // ========================================
  //
  // A própria consulta que estamos
  // remarcando é ignorada.
  //
  // Isso é importante principalmente
  // quando a nova data é igual à atual.

  const agendamentosDaData =
    await db.orm.public.Agendamento
      .where({
        medicoId,
        data
      })
      .all();

  const conflitoAgendamento =
    agendamentosDaData.find(
      (item) => {

        // Ignora a própria consulta.
        if (
          item.id ===
          agendamento.id
        ) {
          return false;
        }

        // Consultas canceladas, recusadas,
        // realizadas etc. não bloqueiam
        // o horário.
        if (
          !statusOcupaHorario(
            item.status
          )
        ) {
          return false;
        }

        return horariosSeSobrepoem(
          slotSelecionado.horaInicio,
          slotSelecionado.horaFim,
          item.horaInicio,
          item.horaFim
        );
      }
    );

  if (
    conflitoAgendamento
  ) {
    throw new Error(
      "Já existe uma consulta ocupando este período."
    );
  }


  // ========================================
  // VERIFICAR REMARCAÇÕES PENDENTES
  // ========================================
  //
  // Uma solicitação de remarcação feita
  // por outro paciente também reserva
  // temporariamente aquele horário.

  const remarcacoesDaData =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        novaData:
          data,

        status:
          "PENDENTE"
      })
      .all();

  if (
    remarcacoesDaData.length >
    0
  ) {

    const agendamentosDoMedico =
      await db.orm.public.Agendamento
        .where({
          medicoId
        })
        .all();

    const idsAgendamentosDoMedico =
      new Set<number>(
        agendamentosDoMedico.map(
          (item) =>
            item.id
        )
      );

    const conflitoRemarcacao =
      remarcacoesDaData.find(
        (remarcacao) => {

          // Só consideramos remarcações
          // pertencentes a consultas
          // deste médico.
          if (
            !idsAgendamentosDoMedico.has(
              remarcacao.agendamentoId
            )
          ) {
            return false;
          }

          // Se existir uma solicitação
          // pendente da própria consulta,
          // também não permitimos a
          // remarcação direta.
          //
          // Isso evita que o médico altere
          // a consulta enquanto existe uma
          // solicitação do paciente sem
          // resposta.

          return horariosSeSobrepoem(
            slotSelecionado.horaInicio,
            slotSelecionado.horaFim,
            remarcacao.novaHoraInicio,
            remarcacao.novaHoraFim
          );
        }
      );

    if (
      conflitoRemarcacao
    ) {
      throw new Error(
        "Este horário está reservado por uma solicitação de remarcação pendente."
      );
    }
  }


  // ========================================
  // TRATAR REMARCAÇÃO PENDENTE DA
  // PRÓPRIA CONSULTA
  // ========================================
  //
  // Mesmo que a solicitação pendente seja
  // para outro horário, não queremos que
  // existam dois fluxos concorrentes:
  //
  // paciente esperando resposta
  //
  // +
  //
  // médico alterando diretamente.
  //
  // Portanto, se existir uma solicitação
  // pendente para esta consulta, o médico
  // deve primeiro aceitar ou recusá-la.

  const remarcacaoPendenteDaConsulta =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        agendamentoId:
          agendamento.id,

        status:
          "PENDENTE"
      })
      .first();

  if (
    remarcacaoPendenteDaConsulta
  ) {
    throw new Error(
      "Existe uma solicitação de remarcação pendente para esta consulta. Aceite ou recuse a solicitação antes de remarcar diretamente."
    );
  }


  // ========================================
  // ATUALIZAR AGENDAMENTO
  // ========================================

  const agendamentoAtualizado =
    await db.orm.public.Agendamento
      .where({
        id:
          agendamento.id,

        medicoId
      })
      .update({
        data,

        horaInicio:
          slotSelecionado.horaInicio,

        horaFim:
          slotSelecionado.horaFim,

        // Quando a própria médica realiza
        // a remarcação, a consulta fica
        // confirmada.
        status:
          "CONFIRMADA"
      });


  // ========================================
  // GARANTIR ATUALIZAÇÃO
  // ========================================

  if (
    !agendamentoAtualizado
  ) {
    throw new Error(
      "Não foi possível remarcar o agendamento."
    );
  }


  // ========================================
  // RETORNO
  // ========================================

  return agendamentoAtualizado;
}
