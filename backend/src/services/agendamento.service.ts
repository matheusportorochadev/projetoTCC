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
// Novos agendamentos criados pelo paciente
// utilizam PENDENTE.
export type StatusAgendamento =
  | "AGENDADA"
  | "PENDENTE"
  | "CONFIRMADA"
  | "REALIZADA"
  | "RECUSADA"
  | "CANCELADA"
  | "FALTOU";


// Status possíveis de uma solicitação
// de remarcação.
export type StatusRemarcacao =
  | "PENDENTE"
  | "ACEITA"
  | "RECUSADA";


// Representa um horário individual.
export type SlotDisponivel = {
  horaInicio: string;
  horaFim: string;
};


// Estrutura base de um agendamento.
export type AgendamentoRegistro = {
  id: number;
  medicoId: number;
  pacienteId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: StatusAgendamento;
};


// Estrutura mostrada na agenda do médico.
export type AgendamentoMedicoRegistro =
  AgendamentoRegistro & {
    pacienteNome: string;
    pacienteTelefone: string | null;
  };


// Estrutura base de uma solicitação
// de remarcação.
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


// Estrutura mostrada ao médico.
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


// Estrutura mostrada ao paciente.
export type RemarcacaoPacienteRegistro =
  RemarcacaoRegistro & {
    dataAtual: string;
    horaInicioAtual: string;
    horaFimAtual: string;
    statusAgendamento: StatusAgendamento;
  };


// Dados internos utilizados na criação
// de um agendamento solicitado pelo paciente.
//
// medicoId, pacienteId e horaFim são
// definidos pelo backend.
type CriarAgendamentoDados = {
  medicoId: number;
  pacienteId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
};


// Dados enviados pelo paciente
// para solicitar uma remarcação.
export type SolicitarRemarcacaoDados = {
  data: string;
  horaInicio: string;
};


// Dados utilizados quando o próprio médico
// cadastra uma consulta diretamente.
export type CriarAgendamentoMedicoDados = {
  pacienteId: number;
  data: string;
  horaInicio: string;
  duracaoConsulta: number;
};


// Tipo da transação do Prisma ORM 8.
//
// O Prisma 8 não exporta diretamente
// esse tipo, então ele é derivado do
// próprio db.transaction().
type Tx =
  Parameters<
    Parameters<typeof db.transaction>[0]
  >[0];


// ========================================
// FUNÇÕES AUXILIARES DE HORÁRIO
// ========================================

// Converte HH:mm para minutos.
function horarioParaMinutos(
  horario: string
): number {
  const [hora, minuto] =
    horario
      .split(":")
      .map(Number);

  return hora * 60 + minuto;
}


// Converte minutos para HH:mm.
function minutosParaHorario(
  totalMinutos: number
): string {
  const hora =
    Math.floor(
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
// VALIDAR DATA
// ========================================

function dataPossuiFormatoValido(
  data: string
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      data
    )
  ) {
    return false;
  }

  const [
    anoTexto,
    mesTexto,
    diaTexto
  ] =
    data.split("-");

  const ano =
    Number(anoTexto);

  const mes =
    Number(mesTexto);

  const dia =
    Number(diaTexto);

  const dataCriada =
    new Date(
      ano,
      mes - 1,
      dia
    );

  return (
    dataCriada.getFullYear() ===
      ano &&
    dataCriada.getMonth() ===
      mes - 1 &&
    dataCriada.getDate() ===
      dia
  );
}


// ========================================
// VALIDAR HORÁRIO
// ========================================

function horarioPossuiFormatoValido(
  horario: string
): boolean {
  if (
    !/^\d{2}:\d{2}$/.test(
      horario
    )
  ) {
    return false;
  }

  const [
    horaTexto,
    minutoTexto
  ] =
    horario.split(":");

  const hora =
    Number(horaTexto);

  const minuto =
    Number(minutoTexto);

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
// DATA DE HOJE
// ========================================

function obterHoje(): string {
  const agora =
    new Date();

  const ano =
    agora.getFullYear();

  const mes =
    String(
      agora.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const dia =
    String(
      agora.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${ano}-${mes}-${dia}`;
}


// ========================================
// STATUS QUE OCUPAM A AGENDA
// ========================================
//
// PENDENTE:
// aguardando decisão do médico.
//
// AGENDADA:
// mantido para compatibilidade.
//
// CONFIRMADA:
// consulta aprovada.
//
// Os demais status não bloqueiam
// novos horários.

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
    horarioParaMinutos(
      inicioA
    );

  const fimAMinutos =
    horarioParaMinutos(
      fimA
    );

  const inicioBMinutos =
    horarioParaMinutos(
      inicioB
    );

  const fimBMinutos =
    horarioParaMinutos(
      fimB
    );

  return (
    inicioAMinutos <
      fimBMinutos &&
    fimAMinutos >
      inicioBMinutos
  );
}


// ========================================
// TRANSAÇÃO SERIALIZABLE COM RETRY
// ========================================
//
// Problema que estamos resolvendo:
//
// Requisição A verifica o horário.
// Requisição B verifica o mesmo horário.
// As duas enxergam "livre".
// As duas tentam gravar.
//
// Com SERIALIZABLE, o PostgreSQL trata
// as transações como se acontecessem
// em sequência.
//
// Se houver conflito de serialização
// (40001) ou deadlock (40P01),
// tentamos novamente até 3 vezes.

function obterSqlState(
  erro: unknown
): string | null {
  if (
    typeof erro !== "object" ||
    erro === null
  ) {
    return null;
  }

  const erroObj =
    erro as {
      sqlState?: unknown;
      cause?: unknown;
    };

  if (
    typeof erroObj.sqlState ===
    "string"
  ) {
    return erroObj.sqlState;
  }

  if (
    typeof erroObj.cause ===
      "object" &&
    erroObj.cause !== null
  ) {
    const causa =
      erroObj.cause as {
        sqlState?: unknown;
      };

    if (
      typeof causa.sqlState ===
      "string"
    ) {
      return causa.sqlState;
    }
  }

  return null;
}


async function executarTransacaoSerializavel<
  T
>(
  operacao:
    (tx: Tx) => Promise<T>
): Promise<T> {
  const maxTentativas = 3;

  for (
    let tentativa = 1;
    tentativa <= maxTentativas;
    tentativa++
  ) {
    try {
      return await db.transaction(
        async (tx) => {

          // O Prisma ORM 8 executa
          // transações PostgreSQL usando
          // o nível padrão do banco.
          //
          // Para este bloco de agenda,
          // elevamos explicitamente para
          // SERIALIZABLE.
          await tx.execute(
            db.raw.sql`
              SET TRANSACTION
              ISOLATION LEVEL SERIALIZABLE
            `
              .affectedCount()
              .build()
          );

          return operacao(
            tx
          );
        }
      );
    } catch (erro) {
      const sqlState =
        obterSqlState(
          erro
        );

      const conflitoTransacao =
        sqlState === "40001" ||
        sqlState === "40P01";

      if (
        !conflitoTransacao ||
        tentativa ===
          maxTentativas
      ) {
        throw erro;
      }
    }
  }

  // Proteção para o TypeScript.
  //
  // O fluxo normal nunca chega aqui.
  throw new Error(
    "Não foi possível concluir a operação concorrente."
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
// BUSCAR DISPONIBILIDADES DO MÉDICO
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
        ativo:
          true
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
// BUSCAR REMARCAÇÕES PENDENTES DA DATA
// ========================================
//
// Retorna as remarcações PENDENTES
// relacionadas a consultas do médico.

async function buscarRemarcacoesPendentesDoMedicoNaData(
  medicoId: number,
  data: string
) {
  const remarcacoes =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        novaData:
          data,

        status:
          "PENDENTE"
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

  const ids =
    new Set<number>(
      agendamentos.map(
        (agendamento) =>
          agendamento.id
      )
    );

  return remarcacoes.filter(
    (remarcacao) =>
      ids.has(
        remarcacao.agendamentoId
      )
  );
}


// ========================================
// GERAR SLOTS
// ========================================

export function gerarSlotsDasDisponibilidades(
  disponibilidades:
    Array<{
      horaInicio: string;
      horaFim: string;
      duracaoConsulta: number;
    }>
): SlotDisponivel[] {
  const slots:
    SlotDisponivel[] = [];

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

    // Evita loop infinito caso exista
    // dado inválido no banco.
    if (
      duracao <= 0
    ) {
      continue;
    }

    let horarioAtual =
      inicio;

    while (
      horarioAtual +
        duracao <=
      fim
    ) {
      slots.push({
        horaInicio:
          minutosParaHorario(
            horarioAtual
          ),

        horaFim:
          minutosParaHorario(
            horarioAtual +
              duracao
          )
      });

      horarioAtual +=
        duracao;
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
// O paciente só vê slots que:
//
// 1. foram publicados pelo médico;
// 2. não colidem com consulta ativa;
// 3. não colidem com remarcação pendente.
//
// IMPORTANTE:
//
// A verificação agora usa SOBREPOSIÇÃO,
// e não apenas igualdade de horaInicio.
//
// Isso também protege contra consultas
// criadas diretamente pelo médico com
// duração diferente dos slots publicados.

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

  const remarcacoes =
    await buscarRemarcacoesPendentesDoMedicoNaData(
      medicoId,
      data
    );

  const horariosDisponiveis =
    slots.filter(
      (slot) => {
        const conflitoAgendamento =
          agendamentos.some(
            (agendamento) =>
              horariosSeSobrepoem(
                slot.horaInicio,
                slot.horaFim,
                agendamento.horaInicio,
                agendamento.horaFim
              )
          );

        if (
          conflitoAgendamento
        ) {
          return false;
        }

        const conflitoRemarcacao =
          remarcacoes.some(
            (remarcacao) =>
              horariosSeSobrepoem(
                slot.horaInicio,
                slot.horaFim,
                remarcacao.novaHoraInicio,
                remarcacao.novaHoraFim
              )
          );

        return !conflitoRemarcacao;
      }
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
): Promise<
  SlotDisponivel | undefined
> {
  const horarios =
    await listarHorariosDisponiveis(
      medicoId,
      data
    );

  return horarios.find(
    (slot) =>
      slot.horaInicio ===
        horaInicio
  );
}


// ========================================
// CRIAR AGENDAMENTO PELO PACIENTE
// ========================================
//
// Todo novo agendamento solicitado
// pelo paciente nasce PENDENTE.
//
// A validação do slot é refeita DENTRO
// da transação SERIALIZABLE.
//
// Isso fecha a janela de corrida entre:
//
// "ver horário livre"
//
// e
//
// "gravar agendamento".

export async function criarAgendamento(
  dados: CriarAgendamentoDados
): Promise<AgendamentoRegistro> {

  if (
    !dataPossuiFormatoValido(
      dados.data
    )
  ) {
    throw new Error(
      "Data inválida."
    );
  }

  if (
    !horarioPossuiFormatoValido(
      dados.horaInicio
    ) ||
    !horarioPossuiFormatoValido(
      dados.horaFim
    )
  ) {
    throw new Error(
      "Horário inválido."
    );
  }

  if (
    horarioParaMinutos(
      dados.horaInicio
    ) >=
    horarioParaMinutos(
      dados.horaFim
    )
  ) {
    throw new Error(
      "Horário inválido."
    );
  }

  return executarTransacaoSerializavel(
    async (tx) => {

      // ========================================
      // CONFIRMAR QUE O SLOT FOI PUBLICADO
      // ========================================

      const disponibilidades =
        await tx.orm.public.DisponibilidadeAgenda
          .where({
            medicoId:
              dados.medicoId,

            data:
              dados.data,

            ativo:
              true
          })
          .all();

      const slots =
        gerarSlotsDasDisponibilidades(
          disponibilidades
        );

      const slot =
        slots.find(
          (item) =>
            item.horaInicio ===
              dados.horaInicio &&
            item.horaFim ===
              dados.horaFim
        );

      if (!slot) {
        throw new Error(
          "O horário selecionado não está mais disponível."
        );
      }


      // ========================================
      // VERIFICAR CONSULTAS
      // ========================================

      const agendamentos =
        await tx.orm.public.Agendamento
          .where({
            medicoId:
              dados.medicoId,

            data:
              dados.data
          })
          .all();

      const conflitoAgendamento =
        agendamentos.find(
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
              dados.horaFim,
              agendamento.horaInicio,
              agendamento.horaFim
            );
          }
        );

      if (
        conflitoAgendamento
      ) {
        throw new Error(
          "O horário selecionado não está mais disponível."
        );
      }


      // ========================================
      // VERIFICAR REMARCAÇÕES PENDENTES
      // ========================================

      const remarcacoes =
        await tx.orm.public.RemarcacaoAgendamento
          .where({
            novaData:
              dados.data,

            status:
              "PENDENTE"
          })
          .all();

      if (
        remarcacoes.length > 0
      ) {
        const agendamentosDoMedico =
          await tx.orm.public.Agendamento
            .where({
              medicoId:
                dados.medicoId
            })
            .all();

        const ids =
          new Set<number>(
            agendamentosDoMedico.map(
              (agendamento) =>
                agendamento.id
            )
          );

        const conflitoRemarcacao =
          remarcacoes.find(
            (remarcacao) =>
              ids.has(
                remarcacao.agendamentoId
              ) &&
              horariosSeSobrepoem(
                dados.horaInicio,
                dados.horaFim,
                remarcacao.novaHoraInicio,
                remarcacao.novaHoraFim
              )
          );

        if (
          conflitoRemarcacao
        ) {
          throw new Error(
            "O horário selecionado não está mais disponível."
          );
        }
      }


      // ========================================
      // CRIAR
      // ========================================

      const agendamento =
        await tx.orm.public.Agendamento
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
  );
}


// ========================================
// CRIAR CONSULTA DIRETAMENTE PELO MÉDICO
// ========================================
//
// Não depende de DisponibilidadeAgenda.
//
// A consulta criada pelo próprio médico
// já nasce CONFIRMADA.
//
// A checagem e a criação acontecem em
// uma única transação SERIALIZABLE.

export async function criarAgendamentoPeloMedico(
  medicoId: number,
  dados: CriarAgendamentoMedicoDados
): Promise<AgendamentoRegistro> {

  if (
    !dataPossuiFormatoValido(
      dados.data
    )
  ) {
    throw new Error(
      "Data inválida."
    );
  }

  if (
    dados.data <
      obterHoje()
  ) {
    throw new Error(
      "Não é possível cadastrar uma consulta em uma data passada."
    );
  }

  if (
    !horarioPossuiFormatoValido(
      dados.horaInicio
    )
  ) {
    throw new Error(
      "Horário inválido."
    );
  }

  if (
    !Number.isInteger(
      dados.duracaoConsulta
    ) ||
    dados.duracaoConsulta <=
      0 ||
    dados.duracaoConsulta >
      1440
  ) {
    throw new Error(
      "Duração da consulta inválida."
    );
  }

  const inicioMinutos =
    horarioParaMinutos(
      dados.horaInicio
    );

  const fimMinutos =
    inicioMinutos +
    dados.duracaoConsulta;

  if (
    fimMinutos >
      24 * 60
  ) {
    throw new Error(
      "O horário final da consulta ultrapassa o fim do dia."
    );
  }

  const horaFim =
    minutosParaHorario(
      fimMinutos
    );

  return executarTransacaoSerializavel(
    async (tx) => {

      // ========================================
      // VALIDAR PACIENTE
      // ========================================

      const paciente =
        await tx.orm.public.Paciente
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
      // CONFLITO COM CONSULTAS
      // ========================================

      const agendamentos =
        await tx.orm.public.Agendamento
          .where({
            medicoId,

            data:
              dados.data
          })
          .all();

      const conflitoAgendamento =
        agendamentos.find(
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
      // CONFLITO COM REMARCAÇÕES PENDENTES
      // ========================================

      const remarcacoes =
        await tx.orm.public.RemarcacaoAgendamento
          .where({
            novaData:
              dados.data,

            status:
              "PENDENTE"
          })
          .all();

      if (
        remarcacoes.length > 0
      ) {
        const agendamentosDoMedico =
          await tx.orm.public.Agendamento
            .where({
              medicoId
            })
            .all();

        const ids =
          new Set<number>(
            agendamentosDoMedico.map(
              (agendamento) =>
                agendamento.id
            )
          );

        const conflitoRemarcacao =
          remarcacoes.find(
            (remarcacao) =>
              ids.has(
                remarcacao.agendamentoId
              ) &&
              horariosSeSobrepoem(
                dados.horaInicio,
                horaFim,
                remarcacao.novaHoraInicio,
                remarcacao.novaHoraFim
              )
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

      return tx.orm.public.Agendamento
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
    }
  );
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
): Promise<
  AgendamentoMedicoRegistro[]
> {
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

  const resultado:
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

  resultado.sort(
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

  return resultado;
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
    agendamento.status !==
      "PENDENTE" &&
    agendamento.status !==
      "AGENDADA"
  ) {
    throw new Error(
      "Somente agendamentos pendentes podem ser confirmados."
    );
  }

  const atualizado =
    await db.orm.public.Agendamento
      .where({
        id,
        medicoId
      })
      .update({
        status:
          "CONFIRMADA"
      });

  if (!atualizado) {
    throw new Error(
      "Não foi possível confirmar o agendamento."
    );
  }

  return atualizado;
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
    agendamento.status !==
      "PENDENTE" &&
    agendamento.status !==
      "AGENDADA"
  ) {
    throw new Error(
      "Somente agendamentos pendentes podem ser recusados."
    );
  }

  const atualizado =
    await db.orm.public.Agendamento
      .where({
        id,
        medicoId
      })
      .update({
        status:
          "RECUSADA"
      });

  if (!atualizado) {
    throw new Error(
      "Não foi possível recusar o agendamento."
    );
  }

  return atualizado;
}


// ========================================
// CANCELAR AGENDAMENTO PELO MÉDICO
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
    agendamento.status !==
      "CONFIRMADA" &&
    agendamento.status !==
      "AGENDADA"
  ) {
    throw new Error(
      "Somente consultas confirmadas podem ser canceladas."
    );
  }

  const atualizado =
    await db.orm.public.Agendamento
      .where({
        id,
        medicoId
      })
      .update({
        status:
          "CANCELADA"
      });

  if (!atualizado) {
    throw new Error(
      "Não foi possível cancelar o agendamento."
    );
  }

  return atualizado;
}


// ========================================
// CANCELAR AGENDAMENTO PELO PACIENTE
// ========================================
//
// Esta operação altera:
// - eventual remarcação pendente;
// - agendamento.
//
// Por isso também utiliza transação.

export async function cancelarAgendamentoPaciente(
  id: number,
  pacienteId: number
): Promise<AgendamentoRegistro> {
  return db.transaction(
    async (tx) => {
      const agendamento =
        await tx.orm.public.Agendamento
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

      if (
        agendamento.status !==
          "PENDENTE" &&
        agendamento.status !==
          "CONFIRMADA" &&
        agendamento.status !==
          "AGENDADA"
      ) {
        throw new Error(
          "Este agendamento não pode ser cancelado."
        );
      }

      const remarcacaoPendente =
        await tx.orm.public.RemarcacaoAgendamento
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
        const remarcacaoAtualizada =
          await tx.orm.public.RemarcacaoAgendamento
            .where({
              id:
                remarcacaoPendente.id
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
            "Não foi possível encerrar a solicitação de remarcação."
          );
        }
      }

      const atualizado =
        await tx.orm.public.Agendamento
          .where({
            id,
            pacienteId
          })
          .update({
            status:
              "CANCELADA"
          });

      if (!atualizado) {
        throw new Error(
          "Não foi possível cancelar o agendamento."
        );
      }

      return atualizado;
    }
  );
}


// ========================================
// SOLICITAR REMARCAÇÃO
// ========================================
//
// A consulta original continua intacta
// enquanto a solicitação fica PENDENTE.
//
// A criação da reserva do novo horário
// também acontece em SERIALIZABLE para
// impedir duas solicitações concorrentes
// de reservarem o mesmo período.

export async function solicitarRemarcacao(
  agendamentoId: number,
  pacienteId: number,
  dados: SolicitarRemarcacaoDados
): Promise<RemarcacaoRegistro> {

  if (
    !dataPossuiFormatoValido(
      dados.data
    )
  ) {
    throw new Error(
      "Data inválida."
    );
  }

  if (
    !horarioPossuiFormatoValido(
      dados.horaInicio
    )
  ) {
    throw new Error(
      "Horário inválido."
    );
  }

  return executarTransacaoSerializavel(
    async (tx) => {

      // ========================================
      // BUSCAR AGENDAMENTO DO PACIENTE
      // ========================================

      const agendamento =
        await tx.orm.public.Agendamento
          .where({
            id:
              agendamentoId,

            pacienteId
          })
          .first();

      if (!agendamento) {
        throw new Error(
          "Agendamento não encontrado."
        );
      }

      if (
        agendamento.status !==
          "PENDENTE" &&
        agendamento.status !==
          "CONFIRMADA" &&
        agendamento.status !==
          "AGENDADA"
      ) {
        throw new Error(
          "Este agendamento não pode ser remarcado."
        );
      }

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
      // IMPEDIR DUAS SOLICITAÇÕES DA MESMA CONSULTA
      // ========================================

      const remarcacaoExistente =
        await tx.orm.public.RemarcacaoAgendamento
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
      // VALIDAR SLOT PUBLICADO
      // ========================================

      const disponibilidades =
        await tx.orm.public.DisponibilidadeAgenda
          .where({
            medicoId:
              agendamento.medicoId,

            data:
              dados.data,

            ativo:
              true
          })
          .all();

      const slots =
        gerarSlotsDasDisponibilidades(
          disponibilidades
        );

      const novoHorario =
        slots.find(
          (slot) =>
            slot.horaInicio ===
              dados.horaInicio
        );

      if (!novoHorario) {
        throw new Error(
          "O horário selecionado não está mais disponível."
        );
      }


      // ========================================
      // VERIFICAR CONSULTAS
      // ========================================

      const agendamentos =
        await tx.orm.public.Agendamento
          .where({
            medicoId:
              agendamento.medicoId,

            data:
              dados.data
          })
          .all();

      const conflitoAgendamento =
        agendamentos.find(
          (item) => {
            // Ignora a própria consulta,
            // pois ela será movida se a
            // remarcação for aceita.
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
              novoHorario.horaInicio,
              novoHorario.horaFim,
              item.horaInicio,
              item.horaFim
            );
          }
        );

      if (
        conflitoAgendamento
      ) {
        throw new Error(
          "O horário selecionado não está mais disponível."
        );
      }


      // ========================================
      // VERIFICAR OUTRAS REMARCAÇÕES
      // ========================================

      const remarcacoes =
        await tx.orm.public.RemarcacaoAgendamento
          .where({
            novaData:
              dados.data,

            status:
              "PENDENTE"
          })
          .all();

      if (
        remarcacoes.length > 0
      ) {
        const agendamentosDoMedico =
          await tx.orm.public.Agendamento
            .where({
              medicoId:
                agendamento.medicoId
            })
            .all();

        const ids =
          new Set<number>(
            agendamentosDoMedico.map(
              (item) =>
                item.id
            )
          );

        const conflitoRemarcacao =
          remarcacoes.find(
            (remarcacao) =>
              ids.has(
                remarcacao.agendamentoId
              ) &&
              horariosSeSobrepoem(
                novoHorario.horaInicio,
                novoHorario.horaFim,
                remarcacao.novaHoraInicio,
                remarcacao.novaHoraFim
              )
          );

        if (
          conflitoRemarcacao
        ) {
          throw new Error(
            "O horário selecionado não está mais disponível."
          );
        }
      }


      // ========================================
      // CRIAR SOLICITAÇÃO
      // ========================================

      return tx.orm.public.RemarcacaoAgendamento
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
    }
  );
}


// ========================================
// LISTAR REMARCAÇÕES DO PACIENTE
// ========================================

export async function listarRemarcacoesDoPaciente(
  pacienteId: number
): Promise<
  RemarcacaoPacienteRegistro[]
> {
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
    RemarcacaoPacienteRegistro[] =
      [];

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
): Promise<
  RemarcacaoMedicoRegistro[]
> {
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
    RemarcacaoMedicoRegistro[] =
      [];

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
//
// Agora a operação inteira acontece em
// uma transação SERIALIZABLE:
//
// 1. busca remarcação;
// 2. valida propriedade;
// 3. revalida conflitos;
// 4. altera Agendamento;
// 5. altera RemarcacaoAgendamento.
//
// Se qualquer etapa falhar, nenhuma
// alteração fica parcialmente salva.

export async function aceitarRemarcacao(
  remarcacaoId: number,
  medicoId: number
): Promise<RemarcacaoRegistro> {
  return executarTransacaoSerializavel(
    async (tx) => {

      // ========================================
      // BUSCAR REMARCAÇÃO
      // ========================================

      const remarcacao =
        await tx.orm.public.RemarcacaoAgendamento
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


      // ========================================
      // BUSCAR AGENDAMENTO DO MÉDICO
      // ========================================

      const agendamento =
        await tx.orm.public.Agendamento
          .where({
            id:
              remarcacao.agendamentoId,

            medicoId
          })
          .first();

      if (!agendamento) {
        throw new Error(
          "Agendamento não encontrado."
        );
      }


      // ========================================
      // VALIDAR STATUS
      // ========================================

      if (
        remarcacao.status !==
          "PENDENTE"
      ) {
        throw new Error(
          "Esta solicitação de remarcação já foi respondida."
        );
      }

      if (
        agendamento.status ===
          "CANCELADA" ||
        agendamento.status ===
          "RECUSADA" ||
        agendamento.status ===
          "REALIZADA" ||
        agendamento.status ===
          "FALTOU"
      ) {
        throw new Error(
          "O agendamento não pode mais ser remarcado."
        );
      }


      // ========================================
      // VERIFICAR CONFLITO COM CONSULTAS
      // ========================================

      const agendamentos =
        await tx.orm.public.Agendamento
          .where({
            medicoId,

            data:
              remarcacao.novaData
          })
          .all();

      const conflito =
        agendamentos.find(
          (item) => {
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

      if (conflito) {
        throw new Error(
          "O novo horário não está mais disponível."
        );
      }


      // ========================================
      // VERIFICAR OUTRAS REMARCAÇÕES
      // ========================================

      const outrasRemarcacoes =
        await tx.orm.public.RemarcacaoAgendamento
          .where({
            novaData:
              remarcacao.novaData,

            status:
              "PENDENTE"
          })
          .all();

      const agendamentosDoMedico =
        await tx.orm.public.Agendamento
          .where({
            medicoId
          })
          .all();

      const ids =
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
              !ids.has(
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
        await tx.orm.public.Agendamento
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
      // MARCAR REMARCAÇÃO COMO ACEITA
      // ========================================

      const remarcacaoAtualizada =
        await tx.orm.public.RemarcacaoAgendamento
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
  );
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

  const atualizada =
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

  if (!atualizada) {
    throw new Error(
      "Não foi possível recusar a remarcação."
    );
  }

  return atualizada;
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

  const atualizada =
    await db.orm.public.RemarcacaoAgendamento
      .where({
        id:
          remarcacaoId
      })
      .update({
        visualizadoPaciente:
          true
      });

  if (!atualizada) {
    throw new Error(
      "Não foi possível atualizar a visualização."
    );
  }

  return atualizada;
}


// ========================================
// EXCLUIR CONSULTA DEFINITIVAMENTE
// ========================================
//
// A exclusão agora é transacional.
//
// Primeiro remove todas as remarcações,
// depois remove o agendamento.
//
// Se a exclusão final falhar, as
// remarcações também são restauradas
// pelo rollback.

export async function excluirAgendamento(
  id: number,
  medicoId: number
): Promise<void> {
  await db.transaction(
    async (tx) => {

      // ========================================
      // VALIDAR PROPRIEDADE
      // ========================================

      const agendamento =
        await tx.orm.public.Agendamento
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


      // ========================================
      // EXCLUIR REMARCAÇÕES
      // ========================================

      const remarcacoes =
        await tx.orm.public.RemarcacaoAgendamento
          .where({
            agendamentoId:
              id
          })
          .all();

      for (
        const remarcacao
        of remarcacoes
      ) {
        await tx.orm.public.RemarcacaoAgendamento
          .where({
            id:
              remarcacao.id
          })
          .delete();
      }


      // ========================================
      // EXCLUIR AGENDAMENTO
      // ========================================

      const excluido =
        await tx.orm.public.Agendamento
          .where({
            id,
            medicoId
          })
          .delete();

      if (!excluido) {
        throw new Error(
          "Não foi possível excluir o agendamento."
        );
      }
    }
  );
}


// ========================================
// REMARCAR CONSULTA DIRETAMENTE PELO MÉDICO
// ========================================
//
// O médico escolhe um slot publicado
// em DisponibilidadeAgenda.
//
// A operação agora utiliza
// SERIALIZABLE para impedir que outro
// agendamento ocupe o mesmo horário
// entre a validação e o update.

export async function remarcarAgendamento(
  id: number,
  medicoId: number,
  data: string,
  horaInicio: string
): Promise<AgendamentoRegistro> {

  // ========================================
  // VALIDAÇÕES SEM ACESSO AO BANCO
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

  if (
    data < obterHoje()
  ) {
    throw new Error(
      "Não é possível remarcar uma consulta para uma data passada."
    );
  }

  if (
    !horarioPossuiFormatoValido(
      horaInicio
    )
  ) {
    throw new Error(
      "Horário inválido."
    );
  }


  return executarTransacaoSerializavel(
    async (tx) => {

      // ========================================
      // BUSCAR AGENDAMENTO
      // ========================================

      const agendamento =
        await tx.orm.public.Agendamento
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


      // ========================================
      // VALIDAR STATUS
      // ========================================

      if (
        agendamento.status !==
          "PENDENTE" &&
        agendamento.status !==
          "AGENDADA" &&
        agendamento.status !==
          "CONFIRMADA"
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
          data &&
        agendamento.horaInicio ===
          horaInicio
      ) {
        throw new Error(
          "Escolha um horário diferente do atual."
        );
      }


      // ========================================
      // BUSCAR SLOT CONFIGURADO
      // ========================================

      const disponibilidades =
        await tx.orm.public.DisponibilidadeAgenda
          .where({
            medicoId,
            data,
            ativo:
              true
          })
          .all();

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
      // REMARCAÇÃO PENDENTE DA PRÓPRIA CONSULTA
      // ========================================

      const remarcacaoPendenteDaConsulta =
        await tx.orm.public.RemarcacaoAgendamento
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
      // CONFLITO COM CONSULTAS
      // ========================================

      const agendamentos =
        await tx.orm.public.Agendamento
          .where({
            medicoId,
            data
          })
          .all();

      const conflitoAgendamento =
        agendamentos.find(
          (item) => {
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
      // CONFLITO COM REMARCAÇÕES PENDENTES
      // ========================================

      const remarcacoes =
        await tx.orm.public.RemarcacaoAgendamento
          .where({
            novaData:
              data,

            status:
              "PENDENTE"
          })
          .all();

      if (
        remarcacoes.length > 0
      ) {
        const agendamentosDoMedico =
          await tx.orm.public.Agendamento
            .where({
              medicoId
            })
            .all();

        const ids =
          new Set<number>(
            agendamentosDoMedico.map(
              (item) =>
                item.id
            )
          );

        const conflitoRemarcacao =
          remarcacoes.find(
            (remarcacao) =>
              ids.has(
                remarcacao.agendamentoId
              ) &&
              horariosSeSobrepoem(
                slotSelecionado.horaInicio,
                slotSelecionado.horaFim,
                remarcacao.novaHoraInicio,
                remarcacao.novaHoraFim
              )
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
      // ATUALIZAR
      // ========================================

      const atualizado =
        await tx.orm.public.Agendamento
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

            status:
              "CONFIRMADA"
          });

      if (!atualizado) {
        throw new Error(
          "Não foi possível remarcar o agendamento."
        );
      }

      return atualizado;
    }
  );
}
