import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from "react";

import "../../styles/agenda.css";


// ========================================
// TIPOS
// ========================================

type Disponibilidade = {
  id: number;
  medicoId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  duracaoConsulta: number;
  ativo: boolean;
};


type StatusAgendamento =
  | "AGENDADA"
  | "PENDENTE"
  | "CONFIRMADA"
  | "REALIZADA"
  | "RECUSADA"
  | "CANCELADA"
  | "FALTOU";


type Agendamento = {
  id: number;
  medicoId: number;
  pacienteId: number;
  pacienteNome: string;
  pacienteTelefone: string | null;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: StatusAgendamento;
};


type Paciente = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  ativo: boolean;
  acessoLiberado: boolean;
};


type StatusRemarcacao =
  | "PENDENTE"
  | "ACEITA"
  | "RECUSADA";


type RemarcacaoPendente = {
  id: number;
  agendamentoId: number;
  novaData: string;
  novaHoraInicio: string;
  novaHoraFim: string;
  status: StatusRemarcacao;
  visualizadoPaciente: boolean;
  createdAt: string;
  updatedAt: string;
  medicoId: number;
  pacienteId: number;
  pacienteNome: string;
  pacienteTelefone: string | null;
  dataAtual: string;
  horaInicioAtual: string;
  horaFimAtual: string;
  statusAgendamento: StatusAgendamento;
};


type AbaAgenda =
  | "disponibilidade"
  | "marcados";


type SlotRemarcacao = {
  horaInicio: string;
  horaFim: string;
};


type AcaoAgendamento =
  | "confirmar"
  | "recusar"
  | "cancelar";


type ConfirmacaoAcao = {
  acao: AcaoAgendamento;
  agendamento: Agendamento;
};


type AcaoRemarcacao =
  | "aceitar"
  | "recusar";


type ConfirmacaoRemarcacao = {
  acao: AcaoRemarcacao;
  remarcacao: RemarcacaoPendente;
};


// ========================================
// CONSTANTES
// ========================================

const API_URL =
  "http://localhost:3000";


const nomesMeses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];


const diasSemana = [
  "DOM",
  "SEG",
  "TER",
  "QUA",
  "QUI",
  "SEX",
  "SÁB"
];


function Agenda() {
  const hoje =
    new Date();

  const token =
    localStorage.getItem("token");


  // ========================================
  // ABA
  // ========================================

  const [
    abaAtiva,
    setAbaAtiva
  ] = useState<AbaAgenda>(
    "disponibilidade"
  );


  // ========================================
  // MÊS / ANO
  // ========================================

  const [
    mesAtual,
    setMesAtual
  ] = useState(
    hoje.getMonth()
  );

  const [
    anoAtual,
    setAnoAtual
  ] = useState(
    hoje.getFullYear()
  );


  // ========================================
  // DISPONIBILIDADES
  // ========================================

  const [
    disponibilidades,
    setDisponibilidades
  ] = useState<Disponibilidade[]>(
    []
  );


  // ========================================
  // AGENDAMENTOS
  // ========================================

  const [
    agendamentos,
    setAgendamentos
  ] = useState<Agendamento[]>(
    []
  );


  // ========================================
  // PACIENTES
  // ========================================

  const [
    pacientes,
    setPacientes
  ] = useState<Paciente[]>(
    []
  );


  // ========================================
  // REMARCAÇÕES PENDENTES
  // ========================================

  const [
    remarcacoesPendentes,
    setRemarcacoesPendentes
  ] = useState<RemarcacaoPendente[]>(
    []
  );

  const [
    carregandoRemarcacoes,
    setCarregandoRemarcacoes
  ] = useState(false);


  // ========================================
  // CONFIGURAÇÃO LATERAL
  // ========================================

  const [
    dataConfiguracao,
    setDataConfiguracao
  ] = useState("");

  const [
    horaInicio,
    setHoraInicio
  ] = useState("08:00");

  const [
    horaFim,
    setHoraFim
  ] = useState("12:00");

  const [
    duracaoConsulta,
    setDuracaoConsulta
  ] = useState(30);


  // ========================================
// ESTADOS GERAIS
// ========================================

const [
  ,
  setCarregando
] = useState(true);

const [
  carregandoAgendamentos,
  setCarregandoAgendamentos
] = useState(false);

  const [
    salvando,
    setSalvando
  ] = useState(false);

  const [
    mensagem,
    setMensagem
  ] = useState("");

  const [
    erro,
    setErro
  ] = useState("");

  const [
    erroAgendamentos,
    setErroAgendamentos
  ] = useState("");

  const [
    mensagemAgendamentos,
    setMensagemAgendamentos
  ] = useState("");


  // ========================================
  // MODAL DO DIA
  // ========================================

  const [
    dataModal,
    setDataModal
  ] = useState<string | null>(
    null
  );

  const [
    horariosModal,
    setHorariosModal
  ] = useState<Disponibilidade[]>(
    []
  );


  // ========================================
  // MODAL NOVO HORÁRIO
  // ========================================

  const [
    modalNovoHorarioAberto,
    setModalNovoHorarioAberto
  ] = useState(false);

  const [
    dataNovoHorario,
    setDataNovoHorario
  ] = useState<string | null>(
    null
  );

  const [
    horaInicioModal,
    setHoraInicioModal
  ] = useState("08:00");

  const [
    horaFimModal,
    setHoraFimModal
  ] = useState("12:00");

  const [
    duracaoConsultaModal,
    setDuracaoConsultaModal
  ] = useState(30);

  const [
    salvandoModal,
    setSalvandoModal
  ] = useState(false);

  const [
    erroModal,
    setErroModal
  ] = useState("");


  // ========================================
  // EXCLUSÃO DE DISPONIBILIDADE
  // ========================================

  const [
    disponibilidadeParaExcluir,
    setDisponibilidadeParaExcluir
  ] = useState<Disponibilidade | null>(
    null
  );

  const [
    excluindo,
    setExcluindo
  ] = useState(false);


  // ========================================
  // AÇÃO SOBRE AGENDAMENTO
  // ========================================

  const [
    confirmacaoAcao,
    setConfirmacaoAcao
  ] = useState<ConfirmacaoAcao | null>(
    null
  );

  const [
    executandoAcao,
    setExecutandoAcao
  ] = useState(false);


  // ========================================
  // REMARCAÇÃO DIRETA DA MÉDICA
  // ========================================

  const [
    agendamentoParaRemarcar,
    setAgendamentoParaRemarcar
  ] = useState<Agendamento | null>(
    null
  );

  const [
    dataRemarcacao,
    setDataRemarcacao
  ] = useState("");

  const [
    horarioRemarcacao,
    setHorarioRemarcacao
  ] = useState("");

  const [
    salvandoRemarcacao,
    setSalvandoRemarcacao
  ] = useState(false);

  const [
    erroRemarcacao,
    setErroRemarcacao
  ] = useState("");


  // ========================================
  // NOVA CONSULTA PELO MÉDICO
  // ========================================

  const [
    modalNovaConsultaAberto,
    setModalNovaConsultaAberto
  ] = useState(false);

  const [
    pacienteNovaConsulta,
    setPacienteNovaConsulta
  ] = useState<number | null>(
    null
  );

  const [
    buscaPaciente,
    setBuscaPaciente
  ] = useState("");

  const [
    dataNovaConsulta,
    setDataNovaConsulta
  ] = useState("");

  const [
    horaNovaConsulta,
    setHoraNovaConsulta
  ] = useState("08:00");

  const [
    duracaoNovaConsulta,
    setDuracaoNovaConsulta
  ] = useState(30);

  const [
    salvandoNovaConsulta,
    setSalvandoNovaConsulta
  ] = useState(false);

  const [
    carregandoPacientes,
    setCarregandoPacientes
  ] = useState(false);

  const [
    erroNovaConsulta,
    setErroNovaConsulta
  ] = useState("");


  // ========================================
  // EXCLUSÃO DEFINITIVA DE CONSULTA
  // ========================================

  const [
    agendamentoParaExcluir,
    setAgendamentoParaExcluir
  ] = useState<Agendamento | null>(
    null
  );

  const [
    excluindoAgendamento,
    setExcluindoAgendamento
  ] = useState(false);


  // ========================================
  // DECISÃO DE REMARCAÇÃO DO PACIENTE
  // ========================================

  const [
    confirmacaoRemarcacao,
    setConfirmacaoRemarcacao
  ] = useState<ConfirmacaoRemarcacao | null>(
    null
  );

  const [
    processandoRemarcacao,
    setProcessandoRemarcacao
  ] = useState(false);


  // ========================================
  // CARREGAR DISPONIBILIDADES
  // ========================================

  const carregarDisponibilidades =
    useCallback(
      async (): Promise<Disponibilidade[]> => {
        try {
          setCarregando(true);
          setErro("");

          if (!token) {
            setErro(
              "Sessão não encontrada. Faça login novamente."
            );

            return [];
          }

          const resposta =
            await fetch(
              `${API_URL}/agenda/disponibilidades`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`
                }
              }
            );

          const dados =
            await resposta.json();

          if (!resposta.ok) {
            throw new Error(
              dados.mensagem ||
                "Erro ao carregar agenda."
            );
          }

          const lista: Disponibilidade[] =
            Array.isArray(dados)
              ? dados
              : [];

          setDisponibilidades(
            lista
          );

          return lista;

        } catch (error) {
          setErro(
            error instanceof Error
              ? error.message
              : "Erro ao carregar agenda."
          );

          return [];

        } finally {
          setCarregando(false);
        }
      },
      [token]
    );


  // ========================================
  // CARREGAR AGENDAMENTOS
  // ========================================

  const carregarAgendamentos =
    useCallback(
      async () => {
        try {
          setCarregandoAgendamentos(
            true
          );

          setErroAgendamentos("");

          if (!token) {
            setErroAgendamentos(
              "Sessão não encontrada. Faça login novamente."
            );

            return;
          }

          const resposta =
            await fetch(
              `${API_URL}/agendamentos/medico`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`
                }
              }
            );

          const dados =
            await resposta.json();

          if (!resposta.ok) {
            throw new Error(
              dados.mensagem ||
                "Erro ao carregar agendamentos."
            );
          }

          setAgendamentos(
            Array.isArray(
              dados.agendamentos
            )
              ? dados.agendamentos
              : []
          );

        } catch (error) {
          setErroAgendamentos(
            error instanceof Error
              ? error.message
              : "Erro ao carregar agendamentos."
          );

        } finally {
          setCarregandoAgendamentos(
            false
          );
        }
      },
      [token]
    );


  // ========================================
  // CARREGAR PACIENTES
  // ========================================

  const carregarPacientes =
    useCallback(
      async () => {
        try {
          setCarregandoPacientes(
            true
          );

          if (!token) {
            throw new Error(
              "Sessão não encontrada. Faça login novamente."
            );
          }

          const resposta =
            await fetch(
              `${API_URL}/pacientes`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`
                }
              }
            );

          const dados =
            await resposta.json();

          if (!resposta.ok) {
            throw new Error(
              dados.mensagem ||
                "Erro ao carregar pacientes."
            );
          }

          setPacientes(
            Array.isArray(dados)
              ? dados
              : []
          );

        } catch (error) {
          setErroNovaConsulta(
            error instanceof Error
              ? error.message
              : "Erro ao carregar pacientes."
          );

        } finally {
          setCarregandoPacientes(
            false
          );
        }
      },
      [token]
    );


  // ========================================
  // CARREGAR REMARCAÇÕES PENDENTES
  // ========================================

  const carregarRemarcacoesPendentes =
    useCallback(
      async () => {
        try {
          setCarregandoRemarcacoes(
            true
          );

          if (!token) {
            return;
          }

          const resposta =
            await fetch(
              `${API_URL}/agendamentos/remarcacoes/pendentes`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`
                }
              }
            );

          const dados =
            await resposta.json();

          if (!resposta.ok) {
            throw new Error(
              dados.mensagem ||
                "Erro ao carregar solicitações de remarcação."
            );
          }

          setRemarcacoesPendentes(
            Array.isArray(
              dados.remarcacoes
            )
              ? dados.remarcacoes
              : []
          );

        } catch (error) {
          setErroAgendamentos(
            error instanceof Error
              ? error.message
              : "Erro ao carregar solicitações de remarcação."
          );

        } finally {
          setCarregandoRemarcacoes(
            false
          );
        }
      },
      [token]
    );


  // ========================================
  // CARREGAMENTO INICIAL
  // ========================================

  useEffect(() => {
    void carregarDisponibilidades();
  }, [
    carregarDisponibilidades
  ]);


  useEffect(() => {
    if (
      abaAtiva === "marcados"
    ) {
      void carregarAgendamentos();
      void carregarRemarcacoesPendentes();
    }
  }, [
    abaAtiva,
    carregarAgendamentos,
    carregarRemarcacoesPendentes
  ]);


  // ========================================
  // ESC
  // ========================================

  useEffect(() => {
    function fecharComEsc(
      evento: KeyboardEvent
    ) {
      if (
        evento.key !== "Escape"
      ) {
        return;
      }

      setDataModal(null);

      setModalNovoHorarioAberto(
        false
      );

      setDataNovoHorario(
        null
      );

      setDisponibilidadeParaExcluir(
        null
      );

      setConfirmacaoAcao(
        null
      );

      setAgendamentoParaRemarcar(
        null
      );

      setModalNovaConsultaAberto(
        false
      );

      setAgendamentoParaExcluir(
        null
      );

      setConfirmacaoRemarcacao(
        null
      );

      setErroRemarcacao("");
      setHorarioRemarcacao("");
    }

    window.addEventListener(
      "keydown",
      fecharComEsc
    );

    return () => {
      window.removeEventListener(
        "keydown",
        fecharComEsc
      );
    };
  }, []);


  // ========================================
  // CALENDÁRIO
  // ========================================

  const diasCalendario =
    useMemo(() => {
      const primeiroDia =
        new Date(
          anoAtual,
          mesAtual,
          1
        );

      const ultimoDia =
        new Date(
          anoAtual,
          mesAtual + 1,
          0
        );

      const inicio =
        primeiroDia.getDay();

      const quantidade =
        ultimoDia.getDate();

      const dias:
        (number | null)[] = [];

      for (
        let i = 0;
        i < inicio;
        i++
      ) {
        dias.push(null);
      }

      for (
        let dia = 1;
        dia <= quantidade;
        dia++
      ) {
        dias.push(dia);
      }

      return dias;
    }, [
      mesAtual,
      anoAtual
    ]);


  // ========================================
  // AGENDAMENTOS ORDENADOS
  // ========================================

  const agendamentosOrdenados =
    useMemo(() => {
      return [
        ...agendamentos
      ].sort(
        (
          a,
          b
        ) => {
          const compararData =
            a.data.localeCompare(
              b.data
            );

          if (
            compararData !== 0
          ) {
            return compararData;
          }

          return (
            a.horaInicio.localeCompare(
              b.horaInicio
            )
          );
        }
      );
    }, [
      agendamentos
    ]);


  // ========================================
  // PACIENTES FILTRADOS
  // ========================================

  const pacientesFiltrados =
    useMemo(() => {
      const termo =
        buscaPaciente
          .trim()
          .toLowerCase();

      return pacientes
        .filter(
          (paciente) =>
            paciente.ativo
        )
        .filter(
          (paciente) => {
            if (!termo) {
              return true;
            }

            const nome =
              paciente.nome
                .toLowerCase();

            const email =
              paciente.email
                ?.toLowerCase() ||
              "";

            const telefone =
              paciente.telefone ||
              "";

            const termoNumerico =
              termo.replace(
                /\D/g,
                ""
              );

            return (
              nome.includes(
                termo
              ) ||
              email.includes(
                termo
              ) ||
              telefone.includes(
                termoNumerico
              )
            );
          }
        );
    }, [
      pacientes,
      buscaPaciente
    ]);


  // ========================================
  // FUNÇÕES DE HORÁRIO
  // ========================================

  function horarioParaMinutos(
    horario: string
  ) {
    const [
      hora,
      minuto
    ] =
      horario
        .split(":")
        .map(Number);

    return (
      hora * 60 +
      minuto
    );
  }


  function minutosParaHorario(
    totalMinutos: number
  ) {
    const hora =
      Math.floor(
        totalMinutos / 60
      );

    const minuto =
      totalMinutos % 60;

    return `${String(
      hora
    ).padStart(
      2,
      "0"
    )}:${String(
      minuto
    ).padStart(
      2,
      "0"
    )}`;
  }


  // ========================================
  // SLOTS PARA REMARCAÇÃO
  // ========================================

  const slotsRemarcacao =
    useMemo<SlotRemarcacao[]>(
      () => {
        if (
          !agendamentoParaRemarcar ||
          !dataRemarcacao
        ) {
          return [];
        }

        const periodos =
          disponibilidades.filter(
            (item) =>
              item.ativo &&
              item.data ===
                dataRemarcacao
          );

        const slots:
          SlotRemarcacao[] = [];

        for (
          const periodo
          of periodos
        ) {
          const inicio =
            horarioParaMinutos(
              periodo.horaInicio
            );

          const fim =
            horarioParaMinutos(
              periodo.horaFim
            );

          const duracao =
            periodo.duracaoConsulta;

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

        const ocupados =
          new Set<string>();

        for (
          const agendamento
          of agendamentos
        ) {
          if (
            agendamento.id ===
            agendamentoParaRemarcar.id
          ) {
            continue;
          }

          if (
            agendamento.data !==
            dataRemarcacao
          ) {
            continue;
          }

          const ocupaHorario =
            agendamento.status ===
              "PENDENTE" ||
            agendamento.status ===
              "AGENDADA" ||
            agendamento.status ===
              "CONFIRMADA";

          if (
            ocupaHorario
          ) {
            ocupados.add(
              agendamento.horaInicio
            );
          }
        }

        const slotsUnicos =
          new Map<
            string,
            SlotRemarcacao
          >();

        for (
          const slot
          of slots
        ) {
          const chave =
            `${slot.horaInicio}-${slot.horaFim}`;

          slotsUnicos.set(
            chave,
            slot
          );
        }

        return Array.from(
          slotsUnicos.values()
        )
          .filter(
            (slot) => {
              if (
                ocupados.has(
                  slot.horaInicio
                )
              ) {
                return false;
              }

              if (
                dataRemarcacao ===
                  agendamentoParaRemarcar.data &&
                slot.horaInicio ===
                  agendamentoParaRemarcar.horaInicio
              ) {
                return false;
              }

              return true;
            }
          )
          .sort(
            (a, b) =>
              a.horaInicio.localeCompare(
                b.horaInicio
              )
          );
      },
      [
        agendamentoParaRemarcar,
        dataRemarcacao,
        disponibilidades,
        agendamentos
      ]
    );


  // ========================================
  // DATA
  // ========================================

  function montarData(
    dia: number
  ) {
    const mes =
      String(
        mesAtual + 1
      ).padStart(
        2,
        "0"
      );

    const diaFormatado =
      String(
        dia
      ).padStart(
        2,
        "0"
      );

    return (
      `${anoAtual}-${mes}-${diaFormatado}`
    );
  }


  function formatarData(
    data: string
  ) {
    const [
      ano,
      mes,
      dia
    ] =
      data.split("-");

    return (
      `${dia}/${mes}/${ano}`
    );
  }


  // ========================================
  // STATUS
  // ========================================

  function formatarStatus(
    status: StatusAgendamento
  ) {
    switch (status) {
      case "PENDENTE":
        return "Aguardando confirmação";

      case "AGENDADA":
        return "Agendada";

      case "CONFIRMADA":
        return "Confirmada";

      case "REALIZADA":
        return "Realizada";

      case "RECUSADA":
        return "Recusada";

      case "CANCELADA":
        return "Cancelada";

      case "FALTOU":
        return "Faltou";

      default:
        return status;
    }
  }


  function classeStatus(
    status: StatusAgendamento
  ) {
    switch (status) {
      case "PENDENTE":
        return "agenda-status-pendente";

      case "CONFIRMADA":
        return "agenda-status-confirmada";

      case "RECUSADA":
        return "agenda-status-recusada";

      case "CANCELADA":
        return "agenda-status-cancelada";

      case "REALIZADA":
        return "agenda-status-realizada";

      case "FALTOU":
        return "agenda-status-faltou";

      case "AGENDADA":
      default:
        return "agenda-status-agendada";
    }
  }


  // ========================================
  // DISPONIBILIDADE DO CALENDÁRIO
  // ========================================

  function dataComDisponibilidade(
    dia: number
  ) {
    const data =
      montarData(dia);

    return disponibilidades.some(
      (item) =>
        item.data === data
    );
  }


  // ========================================
  // ABRIR DIA
  // ========================================

  function abrirModalDia(
    dia: number
  ) {
    const data =
      montarData(dia);

    const horarios =
      disponibilidades
        .filter(
          (item) =>
            item.data === data
        )
        .sort(
          (
            a,
            b
          ) =>
            a.horaInicio.localeCompare(
              b.horaInicio
            )
        );

    setDataModal(
      data
    );

    setHorariosModal(
      horarios
    );
  }


  // ========================================
  // NOVO HORÁRIO
  // ========================================

  function abrirModalNovoHorario() {
    if (!dataModal) {
      return;
    }

    setDataNovoHorario(
      dataModal
    );

    setHoraInicioModal(
      "08:00"
    );

    setHoraFimModal(
      "12:00"
    );

    setDuracaoConsultaModal(
      30
    );

    setErroModal("");

    setDataModal(null);

    setModalNovoHorarioAberto(
      true
    );
  }


  function cancelarNovoHorario() {
    const data =
      dataNovoHorario;

    setModalNovoHorarioAberto(
      false
    );

    setErroModal("");

    if (!data) {
      return;
    }

    const horarios =
      disponibilidades
        .filter(
          (item) =>
            item.data === data
        )
        .sort(
          (
            a,
            b
          ) =>
            a.horaInicio.localeCompare(
              b.horaInicio
            )
        );

    setHorariosModal(
      horarios
    );

    setDataModal(
      data
    );
  }


  async function salvarHorarioModal(
    evento:
      FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setErroModal("");

    if (!dataNovoHorario) {
      setErroModal(
        "Data não encontrada."
      );

      return;
    }

    if (
      horaInicioModal >=
      horaFimModal
    ) {
      setErroModal(
        "O horário final deve ser maior que o horário inicial."
      );

      return;
    }

    if (
      duracaoConsultaModal <=
      0
    ) {
      setErroModal(
        "A duração da consulta deve ser maior que zero."
      );

      return;
    }

    if (!token) {
      setErroModal(
        "Sessão não encontrada. Faça login novamente."
      );

      return;
    }

    try {
      setSalvandoModal(
        true
      );

      const resposta =
        await fetch(
          `${API_URL}/agenda/disponibilidades`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`
            },

            body:
              JSON.stringify({
                datas: [
                  dataNovoHorario
                ],

                horaInicio:
                  horaInicioModal,

                horaFim:
                  horaFimModal,

                duracaoConsulta:
                  duracaoConsultaModal
              })
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Erro ao salvar disponibilidade."
        );
      }

      const data =
        dataNovoHorario;

      const lista =
        await carregarDisponibilidades();

      const horarios =
        lista
          .filter(
            (item) =>
              item.data === data
          )
          .sort(
            (
              a,
              b
            ) =>
              a.horaInicio.localeCompare(
                b.horaInicio
              )
          );

      setHorariosModal(
        horarios
      );

      setModalNovoHorarioAberto(
        false
      );

      setDataNovoHorario(
        null
      );

      setDataModal(
        data
      );

      setMensagem(
        "Disponibilidade adicionada com sucesso."
      );

    } catch (error) {
      setErroModal(
        error instanceof Error
          ? error.message
          : "Erro ao salvar disponibilidade."
      );

    } finally {
      setSalvandoModal(
        false
      );
    }
  }


  // ========================================
  // ALTERAR MÊS
  // ========================================

  function alterarMes(
    quantidade: number
  ) {
    const novaData =
      new Date(
        anoAtual,
        mesAtual + quantidade,
        1
      );

    setMesAtual(
      novaData.getMonth()
    );

    setAnoAtual(
      novaData.getFullYear()
    );

    setDataModal(null);
  }


  // ========================================
  // SALVAR DISPONIBILIDADE PELO CARD
  // ========================================

  async function salvarDisponibilidades(
    evento:
      FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    if (!dataConfiguracao) {
      setErro(
        "Selecione uma data."
      );

      return;
    }

    if (
      horaInicio >=
      horaFim
    ) {
      setErro(
        "O horário final deve ser maior que o horário inicial."
      );

      return;
    }

    if (
      duracaoConsulta <= 0
    ) {
      setErro(
        "A duração da consulta deve ser maior que zero."
      );

      return;
    }

    if (!token) {
      setErro(
        "Sessão não encontrada. Faça login novamente."
      );

      return;
    }

    try {
      setSalvando(true);

      const resposta =
        await fetch(
          `${API_URL}/agenda/disponibilidades`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`
            },

            body:
              JSON.stringify({
                datas: [
                  dataConfiguracao
                ],

                horaInicio,
                horaFim,
                duracaoConsulta
              })
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Erro ao salvar disponibilidade."
        );
      }

      setMensagem(
        `Horário configurado para ${formatarData(
          dataConfiguracao
        )}.`
      );

      await carregarDisponibilidades();

    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao salvar disponibilidade."
      );

    } finally {
      setSalvando(false);
    }
  }


  // ========================================
  // EXCLUSÃO DE DISPONIBILIDADE
  // ========================================

  function abrirModalExcluir(
    disponibilidade:
      Disponibilidade
  ) {
    setDataModal(null);

    setDisponibilidadeParaExcluir(
      disponibilidade
    );
  }


  async function confirmarExclusao() {
    if (
      !disponibilidadeParaExcluir
    ) {
      return;
    }

    if (!token) {
      setErro(
        "Sessão não encontrada. Faça login novamente."
      );

      return;
    }

    try {
      setExcluindo(true);

      const resposta =
        await fetch(
          `${API_URL}/agenda/disponibilidades/${disponibilidadeParaExcluir.id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Erro ao remover horário."
        );
      }

      setDisponibilidadeParaExcluir(
        null
      );

      setMensagem(
        "Disponibilidade removida com sucesso."
      );

      await carregarDisponibilidades();

    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao remover horário."
      );

    } finally {
      setExcluindo(false);
    }
  }


  // ========================================
  // AÇÕES DE AGENDAMENTO
  // ========================================

  function abrirConfirmacaoAcao(
    agendamento: Agendamento,
    acao: AcaoAgendamento
  ) {
    setErroAgendamentos("");
    setMensagemAgendamentos("");

    setConfirmacaoAcao({
      agendamento,
      acao
    });
  }


  function tituloConfirmacaoAcao(
    acao: AcaoAgendamento
  ) {
    switch (acao) {
      case "confirmar":
        return "Confirmar consulta?";

      case "recusar":
        return "Recusar solicitação?";

      case "cancelar":
        return "Desmarcar consulta?";
    }
  }


  function descricaoConfirmacaoAcao(
    acao: AcaoAgendamento
  ) {
    switch (acao) {
      case "confirmar":
        return "A consulta será confirmada e continuará ocupando este horário.";

      case "recusar":
        return "A solicitação será recusada e este horário voltará a ficar disponível.";

      case "cancelar":
        return "A consulta será cancelada e este horário voltará a ficar disponível.";
    }
  }


  async function executarAcaoAgendamento() {
    if (
      !confirmacaoAcao ||
      !token
    ) {
      return;
    }

    try {
      setExecutandoAcao(true);

      const {
        agendamento,
        acao
      } =
        confirmacaoAcao;

      const resposta =
        await fetch(
          `${API_URL}/agendamentos/${agendamento.id}/${acao}`,
          {
            method: "PATCH",

            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Não foi possível atualizar o agendamento."
        );
      }

      setConfirmacaoAcao(
        null
      );

      setMensagemAgendamentos(
        dados.mensagem ||
          "Agendamento atualizado com sucesso."
      );

      await carregarAgendamentos();
      await carregarRemarcacoesPendentes();

    } catch (error) {
      setErroAgendamentos(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar agendamento."
      );

    } finally {
      setExecutandoAcao(false);
    }
  }


  // ========================================
  // REMARCAÇÃO DIRETA
  // ========================================

  function abrirRemarcacao(
    agendamento: Agendamento
  ) {
    setAgendamentoParaRemarcar(
      agendamento
    );

    setDataRemarcacao(
      agendamento.data
    );

    setHorarioRemarcacao(
      ""
    );

    setErroRemarcacao("");
  }


  function fecharRemarcacao() {
    setAgendamentoParaRemarcar(
      null
    );

    setDataRemarcacao("");
    setHorarioRemarcacao("");
    setErroRemarcacao("");
  }


  async function confirmarRemarcacao() {
    if (
      !agendamentoParaRemarcar
    ) {
      return;
    }

    if (
      !dataRemarcacao
    ) {
      setErroRemarcacao(
        "Selecione uma nova data."
      );

      return;
    }

    if (
      !horarioRemarcacao
    ) {
      setErroRemarcacao(
        "Selecione um horário disponível."
      );

      return;
    }

    if (!token) {
      return;
    }

    try {
      setSalvandoRemarcacao(
        true
      );

      const resposta =
        await fetch(
          `${API_URL}/agendamentos/${agendamentoParaRemarcar.id}/remarcar`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`
            },

            body:
              JSON.stringify({
                data:
                  dataRemarcacao,

                horaInicio:
                  horarioRemarcacao
              })
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Não foi possível remarcar a consulta."
        );
      }

      fecharRemarcacao();

      setMensagemAgendamentos(
        dados.mensagem ||
          "Consulta remarcada com sucesso."
      );

      await carregarAgendamentos();

    } catch (error) {
      setErroRemarcacao(
        error instanceof Error
          ? error.message
          : "Erro ao remarcar consulta."
      );

      await carregarAgendamentos();

    } finally {
      setSalvandoRemarcacao(
        false
      );
    }
  }


  // ========================================
  // NOVA CONSULTA
  // ========================================

  async function abrirNovaConsulta() {
    setPacienteNovaConsulta(
      null
    );

    setBuscaPaciente("");
    setDataNovaConsulta("");
    setHoraNovaConsulta("08:00");
    setDuracaoNovaConsulta(30);
    setErroNovaConsulta("");

    setModalNovaConsultaAberto(
      true
    );

    await carregarPacientes();
  }


  function fecharNovaConsulta() {
    if (
      salvandoNovaConsulta
    ) {
      return;
    }

    setModalNovaConsultaAberto(
      false
    );

    setPacienteNovaConsulta(
      null
    );

    setBuscaPaciente("");
    setErroNovaConsulta("");
  }


  async function salvarNovaConsulta(
    evento:
      FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setErroNovaConsulta("");

    if (
      !pacienteNovaConsulta
    ) {
      setErroNovaConsulta(
        "Selecione um paciente."
      );

      return;
    }

    if (
      !dataNovaConsulta
    ) {
      setErroNovaConsulta(
        "Selecione a data da consulta."
      );

      return;
    }

    if (
      !horaNovaConsulta
    ) {
      setErroNovaConsulta(
        "Informe o horário da consulta."
      );

      return;
    }

    if (!token) {
      setErroNovaConsulta(
        "Sessão não encontrada. Faça login novamente."
      );

      return;
    }

    try {
      setSalvandoNovaConsulta(
        true
      );

      const resposta =
        await fetch(
          `${API_URL}/agendamentos/medico`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`
            },

            body:
              JSON.stringify({
                pacienteId:
                  pacienteNovaConsulta,

                data:
                  dataNovaConsulta,

                horaInicio:
                  horaNovaConsulta,

                duracaoConsulta:
                  duracaoNovaConsulta
              })
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Não foi possível cadastrar a consulta."
        );
      }

      setModalNovaConsultaAberto(
        false
      );

      setMensagemAgendamentos(
        dados.mensagem ||
          "Consulta cadastrada com sucesso."
      );

      await carregarAgendamentos();

    } catch (error) {
      setErroNovaConsulta(
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar consulta."
      );

    } finally {
      setSalvandoNovaConsulta(
        false
      );
    }
  }


  // ========================================
  // EXCLUIR CONSULTA
  // ========================================

  async function excluirConsulta() {
    if (
      !agendamentoParaExcluir ||
      !token
    ) {
      return;
    }

    try {
      setExcluindoAgendamento(
        true
      );

      const resposta =
        await fetch(
          `${API_URL}/agendamentos/${agendamentoParaExcluir.id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Não foi possível excluir a consulta."
        );
      }

      setAgendamentoParaExcluir(
        null
      );

      setMensagemAgendamentos(
        dados.mensagem ||
          "Consulta excluída definitivamente."
      );

      await carregarAgendamentos();
      await carregarRemarcacoesPendentes();

    } catch (error) {
      setErroAgendamentos(
        error instanceof Error
          ? error.message
          : "Erro ao excluir consulta."
      );

    } finally {
      setExcluindoAgendamento(
        false
      );
    }
  }


  // ========================================
  // ACEITAR / RECUSAR REMARCAÇÃO
  // ========================================

  async function executarAcaoRemarcacao() {
    if (
      !confirmacaoRemarcacao ||
      !token
    ) {
      return;
    }

    try {
      setProcessandoRemarcacao(
        true
      );

      const {
        remarcacao,
        acao
      } =
        confirmacaoRemarcacao;

      const resposta =
        await fetch(
          `${API_URL}/agendamentos/remarcacoes/${remarcacao.id}/${acao}`,
          {
            method: "PATCH",

            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Não foi possível responder à remarcação."
        );
      }

      setConfirmacaoRemarcacao(
        null
      );

      setMensagemAgendamentos(
        dados.mensagem ||
          "Solicitação atualizada com sucesso."
      );

      await carregarAgendamentos();
      await carregarRemarcacoesPendentes();

    } catch (error) {
      setErroAgendamentos(
        error instanceof Error
          ? error.message
          : "Erro ao responder à remarcação."
      );

    } finally {
      setProcessandoRemarcacao(
        false
      );
    }
  }


  // ========================================
  // RENDERIZAÇÃO
  // ========================================

  return (
    <>
      <main className="agenda-page">

        {/* CABEÇALHO */}

        <section className="agenda-header">
          <div>
            <span className="agenda-eyebrow">
              Organização da agenda
            </span>

            <h1>
              Minha agenda
            </h1>
          </div>

          <div className="agenda-resumo">
            <span>
              {
                abaAtiva ===
                "disponibilidade"
                  ? "Períodos disponíveis"
                  : "Consultas marcadas"
              }
            </span>

            <strong>
              {
                abaAtiva ===
                "disponibilidade"
                  ? disponibilidades.length
                  : agendamentos.length
              }
            </strong>
          </div>
        </section>


        {/* ABAS */}

        <nav className="agenda-tabs">
          <button
            type="button"
            className={
              abaAtiva ===
              "disponibilidade"
                ? "agenda-tab agenda-tab-active"
                : "agenda-tab"
            }
            onClick={() =>
              setAbaAtiva(
                "disponibilidade"
              )
            }
          >
            <span className="agenda-tab-icon">
              ◷
            </span>

            <span>
              <strong>
                Disponibilidade
              </strong>

              <small>
                Configure o mês
              </small>
            </span>
          </button>

          <button
            type="button"
            className={
              abaAtiva ===
              "marcados"
                ? "agenda-tab agenda-tab-active"
                : "agenda-tab"
            }
            onClick={() =>
              setAbaAtiva(
                "marcados"
              )
            }
          >
            <span className="agenda-tab-icon">
              ✓
            </span>

            <span>
              <strong>
                Horários marcados
              </strong>

              <small>
                Consultas dos pacientes
              </small>
            </span>
          </button>
        </nav>


        {/* ========================================
            DISPONIBILIDADE
        ======================================== */}

        {
          abaAtiva ===
          "disponibilidade" && (

            <div className="agenda-mensal-layout">

              <section className="agenda-calendario-card">
                <div className="agenda-calendario-header">
                  <button
                    type="button"
                    onClick={() =>
                      alterarMes(-1)
                    }
                  >
                    ‹
                  </button>

                  <div>
                    <strong>
                      {
                        nomesMeses[
                          mesAtual
                        ]
                      }
                    </strong>

                    <span>
                      {anoAtual}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      alterarMes(1)
                    }
                  >
                    ›
                  </button>
                </div>

                <div className="agenda-calendario-semana">
                  {
                    diasSemana.map(
                      (dia) => (
                        <span key={dia}>
                          {dia}
                        </span>
                      )
                    )
                  }
                </div>

                <div className="agenda-calendario-grid">
                  {
                    diasCalendario.map(
                      (
                        dia,
                        indice
                      ) => {
                        if (!dia) {
                          return (
                            <div
                              key={
                                `vazio-${indice}`
                              }
                              className="agenda-dia-vazio"
                            />
                          );
                        }

                        const disponivel =
                          dataComDisponibilidade(
                            dia
                          );

                        return (
                          <button
                            key={dia}
                            type="button"
                            className={[
                              "agenda-dia",

                              disponivel
                                ? "agenda-dia-disponivel"
                                : ""
                            ]
                              .filter(Boolean)
                              .join(" ")
                            }
                            onClick={() =>
                              abrirModalDia(
                                dia
                              )
                            }
                          >
                            <span className="agenda-dia-numero">
                              {dia}
                            </span>

                            {
                              disponivel && (
                                <small>
                                  Disponível
                                </small>
                              )
                            }
                          </button>
                        );
                      }
                    )
                  }
                </div>

                <div className="agenda-legenda">
                  <span>
                    <i className="legenda-disponivel" />

                    Com disponibilidade
                  </span>
                </div>
              </section>


              <aside className="agenda-config-card">
                <div className="agenda-config-titulo">
                  <span className="agenda-icon">
                    +
                  </span>

                  <div>
                    <h2>
                      Configurar horário
                    </h2>

                    <p>
                      Escolha uma data e defina
                      o período de atendimento.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={
                    salvarDisponibilidades
                  }
                >
                  <div className="agenda-field">
                    <label>
                      Data
                    </label>

                    <input
                      type="date"
                      value={
                        dataConfiguracao
                      }
                      onChange={(
                        evento
                      ) =>
                        setDataConfiguracao(
                          evento.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="agenda-form-row">
                    <div className="agenda-field">
                      <label>
                        Horário inicial
                      </label>

                      <input
                        type="time"
                        value={
                          horaInicio
                        }
                        onChange={(
                          evento
                        ) =>
                          setHoraInicio(
                            evento.target.value
                          )
                        }
                      />
                    </div>

                    <div className="agenda-field">
                      <label>
                        Horário final
                      </label>

                      <input
                        type="time"
                        value={
                          horaFim
                        }
                        onChange={(
                          evento
                        ) =>
                          setHoraFim(
                            evento.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="agenda-field">
                    <label>
                      Duração da consulta
                    </label>

                    <select
                      value={
                        duracaoConsulta
                      }
                      onChange={(
                        evento
                      ) =>
                        setDuracaoConsulta(
                          Number(
                            evento.target.value
                          )
                        )
                      }
                    >
                      <option value={15}>
                        15 minutos
                      </option>

                      <option value={20}>
                        20 minutos
                      </option>

                      <option value={30}>
                        30 minutos
                      </option>

                      <option value={45}>
                        45 minutos
                      </option>

                      <option value={60}>
                        60 minutos
                      </option>
                    </select>
                  </div>

                  {
                    erro && (
                      <div className="agenda-alert agenda-alert-error">
                        {erro}
                      </div>
                    )
                  }

                  {
                    mensagem && (
                      <div className="agenda-alert agenda-alert-success">
                        {mensagem}
                      </div>
                    )
                  }

                  <button
                    type="submit"
                    className="agenda-btn agenda-btn-primary agenda-btn-full"
                    disabled={
                      salvando
                    }
                  >
                    {
                      salvando
                        ? "Salvando..."
                        : "Salvar disponibilidade"
                    }
                  </button>
                </form>
              </aside>
            </div>
          )
        }


        {/* ========================================
            HORÁRIOS MARCADOS
        ======================================== */}

        {
          abaAtiva ===
          "marcados" && (

            <section className="agenda-marcados-card">

              <div className="agenda-marcados-header">
                <div>
                  <h2>
                    Horários marcados
                  </h2>

                  <p>
                    Gerencie consultas e solicitações
                    dos seus pacientes.
                  </p>
                </div>

                <div className="agenda-marcado-acoes">
                  <button
                    type="button"
                    className="agenda-btn agenda-btn-primary"
                    onClick={() => {
                      void abrirNovaConsulta();
                    }}
                  >
                    + Nova consulta
                  </button>

                  <button
                    type="button"
                    className="agenda-btn agenda-btn-primary"
                    onClick={() => {
                      void carregarAgendamentos();
                      void carregarRemarcacoesPendentes();
                    }}
                  >
                    Atualizar
                  </button>
                </div>
              </div>


              {
                erroAgendamentos && (
                  <div className="agenda-alert agenda-alert-error">
                    {erroAgendamentos}
                  </div>
                )
              }

              {
                mensagemAgendamentos && (
                  <div className="agenda-alert agenda-alert-success">
                    {mensagemAgendamentos}
                  </div>
                )
              }


              {/* SOLICITAÇÕES DE REMARCAÇÃO */}

              {
                (
                  carregandoRemarcacoes ||
                  remarcacoesPendentes.length >
                    0
                ) && (

                  <>
                    <div className="agenda-marcados-header">
                      <div>
                        <h2>
                          Solicitações de remarcação
                        </h2>

                        <p>
                          Pedidos enviados pelos pacientes
                          aguardando sua decisão.
                        </p>
                      </div>
                    </div>

                    {
                      carregandoRemarcacoes ? (

                        <div className="agenda-empty">
                          <div className="agenda-loading" />

                          <h3>
                            Carregando solicitações...
                          </h3>
                        </div>

                      ) : (

                        <div className="agenda-marcados-lista">
                          {
                            remarcacoesPendentes.map(
                              (
                                remarcacao
                              ) => (

                                <article
                                  key={
                                    remarcacao.id
                                  }
                                  className="agenda-marcado-item"
                                >
                                  <div className="agenda-marcado-info">
                                    <small>
                                      Paciente
                                    </small>

                                    <strong>
                                      {
                                        remarcacao.pacienteNome
                                      }
                                    </strong>
                                  </div>

                                  <div className="agenda-marcado-info">
                                    <small>
                                      Consulta atual
                                    </small>

                                    <strong>
                                      {
                                        formatarData(
                                          remarcacao.dataAtual
                                        )
                                      }
                                    </strong>

                                    <span>
                                      {
                                        remarcacao.horaInicioAtual
                                      }
                                      {" — "}
                                      {
                                        remarcacao.horaFimAtual
                                      }
                                    </span>
                                  </div>

                                  <div className="agenda-marcado-info">
                                    <small>
                                      Novo horário solicitado
                                    </small>

                                    <strong>
                                      {
                                        formatarData(
                                          remarcacao.novaData
                                        )
                                      }
                                    </strong>

                                    <span>
                                      {
                                        remarcacao.novaHoraInicio
                                      }
                                      {" — "}
                                      {
                                        remarcacao.novaHoraFim
                                      }
                                    </span>
                                  </div>

                                  <div className="agenda-marcado-acoes">
                                    <button
                                      type="button"
                                      className="agenda-acao agenda-acao-recusar"
                                      onClick={() =>
                                        setConfirmacaoRemarcacao({
                                          acao:
                                            "recusar",

                                          remarcacao
                                        })
                                      }
                                    >
                                      Recusar
                                    </button>

                                    <button
                                      type="button"
                                      className="agenda-acao agenda-acao-confirmar"
                                      onClick={() =>
                                        setConfirmacaoRemarcacao({
                                          acao:
                                            "aceitar",

                                          remarcacao
                                        })
                                      }
                                    >
                                      Aceitar remarcação
                                    </button>
                                  </div>
                                </article>
                              )
                            )
                          }
                        </div>
                      )
                    }
                  </>
                )
              }


              {/* CONSULTAS */}

              {
                carregandoAgendamentos ? (

                  <div className="agenda-empty">
                    <div className="agenda-loading" />

                    <h3>
                      Carregando consultas...
                    </h3>
                  </div>

                ) :
                agendamentosOrdenados.length ===
                  0 ? (

                  <div className="agenda-empty">
                    <div className="agenda-empty-icon">
                      ◷
                    </div>

                    <h3>
                      Nenhuma consulta marcada
                    </h3>

                    <p>
                      Você pode cadastrar uma consulta
                      ou aguardar uma solicitação de paciente.
                    </p>
                  </div>

                ) : (

                  <div className="agenda-marcados-lista">
                    {
                      agendamentosOrdenados.map(
                        (
                          agendamento
                        ) => {
                          const pendente =
                            agendamento.status ===
                              "PENDENTE" ||
                            agendamento.status ===
                              "AGENDADA";

                          const confirmada =
                            agendamento.status ===
                            "CONFIRMADA";

                          return (
                            <article
                              key={
                                agendamento.id
                              }
                              className="agenda-marcado-item"
                            >
                              <div className="agenda-marcado-info">
                                <small>
                                  Data
                                </small>

                                <strong>
                                  {
                                    formatarData(
                                      agendamento.data
                                    )
                                  }
                                </strong>
                              </div>

                              <div className="agenda-marcado-info">
                                <small>
                                  Paciente
                                </small>

                                <strong>
                                  {
                                    agendamento.pacienteNome ||
                                    "Paciente não identificado"
                                  }
                                </strong>
                              </div>

                              <div className="agenda-marcado-info">
                                <small>
                                  Telefone
                                </small>

                                <strong>
                                  {
                                    agendamento.pacienteTelefone ||
                                    "Não informado"
                                  }
                                </strong>
                              </div>

                              <div className="agenda-marcado-info">
                                <small>
                                  Horário
                                </small>

                                <strong>
                                  {
                                    agendamento.horaInicio
                                  }
                                  {" — "}
                                  {
                                    agendamento.horaFim
                                  }
                                </strong>
                              </div>

                              <div className="agenda-marcado-info">
                                <small>
                                  Status
                                </small>

                                <strong
                                  className={
                                    `agenda-status ${classeStatus(
                                      agendamento.status
                                    )}`
                                  }
                                >
                                  {
                                    formatarStatus(
                                      agendamento.status
                                    )
                                  }
                                </strong>
                              </div>

                              <div className="agenda-marcado-acoes">

                                {
                                  pendente && (
                                    <>
                                      <button
                                        type="button"
                                        className="agenda-acao agenda-acao-confirmar"
                                        onClick={() =>
                                          abrirConfirmacaoAcao(
                                            agendamento,
                                            "confirmar"
                                          )
                                        }
                                      >
                                        Confirmar
                                      </button>

                                      <button
                                        type="button"
                                        className="agenda-acao agenda-acao-recusar"
                                        onClick={() =>
                                          abrirConfirmacaoAcao(
                                            agendamento,
                                            "recusar"
                                          )
                                        }
                                      >
                                        Recusar
                                      </button>
                                    </>
                                  )
                                }

                                {
                                  (
                                    pendente ||
                                    confirmada
                                  ) && (
                                    <button
                                      type="button"
                                      className="agenda-acao agenda-acao-remarcar"
                                      onClick={() =>
                                        abrirRemarcacao(
                                          agendamento
                                        )
                                      }
                                    >
                                      Remarcar
                                    </button>
                                  )
                                }

                                {
                                  confirmada && (
                                    <button
                                      type="button"
                                      className="agenda-acao agenda-acao-cancelar"
                                      onClick={() =>
                                        abrirConfirmacaoAcao(
                                          agendamento,
                                          "cancelar"
                                        )
                                      }
                                    >
                                      Desmarcar
                                    </button>
                                  )
                                }

                                <button
                                  type="button"
                                  className="agenda-acao agenda-acao-recusar"
                                  onClick={() =>
                                    setAgendamentoParaExcluir(
                                      agendamento
                                    )
                                  }
                                >
                                  Excluir
                                </button>
                              </div>
                            </article>
                          );
                        }
                      )
                    }
                  </div>
                )
              }
            </section>
          )
        }
      </main>


      {/* ========================================
          MODAL NOVA CONSULTA
      ======================================== */}

      {
        modalNovaConsultaAberto && (

          <div className="agenda-modal-overlay">
            <div className="agenda-modal agenda-modal-remarcacao">

              <button
                type="button"
                className="agenda-modal-close"
                onClick={
                  fecharNovaConsulta
                }
                disabled={
                  salvandoNovaConsulta
                }
              >
                ×
              </button>

              <div className="agenda-modal-dia-header">
                <span>
                  Agenda médica
                </span>

                <h2>
                  Nova consulta
                </h2>

                <p>
                  Escolha o paciente, a data e o horário.
                </p>
              </div>

              <form
                className="agenda-modal-novo-form"
                onSubmit={
                  salvarNovaConsulta
                }
              >

                <div className="agenda-field">
                  <label>
                    Buscar paciente
                  </label>

                  <input
                    type="text"
                    placeholder="Nome, telefone ou e-mail"
                    value={
                      buscaPaciente
                    }
                    onChange={(
                      evento
                    ) =>
                      setBuscaPaciente(
                        evento.target.value
                      )
                    }
                  />
                </div>

                <div className="agenda-remarcacao-horarios">
                  <label>
                    Paciente
                  </label>

                  {
                    carregandoPacientes ? (

                      <p className="agenda-remarcacao-vazio">
                        Carregando pacientes...
                      </p>

                    ) :
                    pacientesFiltrados.length ===
                      0 ? (

                      <p className="agenda-remarcacao-vazio">
                        Nenhum paciente encontrado.
                      </p>

                    ) : (

                      <div className="agenda-remarcacao-grid">
                        {
                          pacientesFiltrados.map(
                            (
                              paciente
                            ) => (
                              <button
                                key={
                                  paciente.id
                                }
                                type="button"
                                className={
                                  pacienteNovaConsulta ===
                                  paciente.id
                                    ? "agenda-remarcacao-slot agenda-remarcacao-slot-active"
                                    : "agenda-remarcacao-slot"
                                }
                                onClick={() =>
                                  setPacienteNovaConsulta(
                                    paciente.id
                                  )
                                }
                              >
                                {
                                  paciente.nome
                                }

                                <small>
                                  {
                                    paciente.telefone ||
                                    paciente.email ||
                                    "Paciente"
                                  }
                                </small>
                              </button>
                            )
                          )
                        }
                      </div>
                    )
                  }
                </div>

                <div className="agenda-field">
                  <label>
                    Data
                  </label>

                  <input
                    type="date"
                    value={
                      dataNovaConsulta
                    }
                    onChange={(
                      evento
                    ) =>
                      setDataNovaConsulta(
                        evento.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="agenda-form-row">
                  <div className="agenda-field">
                    <label>
                      Horário
                    </label>

                    <input
                      type="time"
                      value={
                        horaNovaConsulta
                      }
                      onChange={(
                        evento
                      ) =>
                        setHoraNovaConsulta(
                          evento.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="agenda-field">
                    <label>
                      Duração
                    </label>

                    <select
                      value={
                        duracaoNovaConsulta
                      }
                      onChange={(
                        evento
                      ) =>
                        setDuracaoNovaConsulta(
                          Number(
                            evento.target.value
                          )
                        )
                      }
                    >
                      <option value={15}>
                        15 minutos
                      </option>

                      <option value={30}>
                        30 minutos
                      </option>

                      <option value={45}>
                        45 minutos
                      </option>

                      <option value={60}>
                        60 minutos
                      </option>
                    </select>
                  </div>
                </div>

                {
                  erroNovaConsulta && (
                    <div className="agenda-alert agenda-alert-error">
                      {erroNovaConsulta}
                    </div>
                  )
                }

                <div className="agenda-modal-actions">
                  <button
                    type="button"
                    className="agenda-modal-btn agenda-modal-btn-cancel"
                    onClick={
                      fecharNovaConsulta
                    }
                    disabled={
                      salvandoNovaConsulta
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="agenda-modal-btn agenda-modal-btn-primary"
                    disabled={
                      salvandoNovaConsulta
                    }
                  >
                    {
                      salvandoNovaConsulta
                        ? "Cadastrando..."
                        : "Cadastrar consulta"
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }


      {/* ========================================
          MODAL EXCLUIR CONSULTA
      ======================================== */}

      {
        agendamentoParaExcluir && (

          <div className="agenda-modal-overlay">
            <div className="agenda-modal">

              <button
                type="button"
                className="agenda-modal-close"
                onClick={() =>
                  setAgendamentoParaExcluir(
                    null
                  )
                }
                disabled={
                  excluindoAgendamento
                }
              >
                ×
              </button>

              <div className="agenda-modal-icon">
                !
              </div>

              <h2>
                Excluir consulta?
              </h2>

              <p>
                Essa ação é permanente e não poderá
                ser desfeita.
              </p>

              <div className="agenda-modal-info">
                <span>
                  {
                    agendamentoParaExcluir
                      .pacienteNome
                  }
                </span>

                <strong>
                  {
                    formatarData(
                      agendamentoParaExcluir.data
                    )
                  }
                </strong>

                <small>
                  {
                    agendamentoParaExcluir.horaInicio
                  }
                  {" — "}
                  {
                    agendamentoParaExcluir.horaFim
                  }
                </small>
              </div>

              <div className="agenda-modal-actions">
                <button
                  type="button"
                  className="agenda-modal-btn agenda-modal-btn-cancel"
                  onClick={() =>
                    setAgendamentoParaExcluir(
                      null
                    )
                  }
                  disabled={
                    excluindoAgendamento
                  }
                >
                  Voltar
                </button>

                <button
                  type="button"
                  className="agenda-modal-btn agenda-modal-btn-delete"
                  onClick={() => {
                    void excluirConsulta();
                  }}
                  disabled={
                    excluindoAgendamento
                  }
                >
                  {
                    excluindoAgendamento
                      ? "Excluindo..."
                      : "Excluir consulta"
                  }
                </button>
              </div>
            </div>
          </div>
        )
      }


      {/* ========================================
          MODAL DECISÃO DE REMARCAÇÃO
      ======================================== */}

      {
        confirmacaoRemarcacao && (

          <div className="agenda-modal-overlay">
            <div className="agenda-modal">

              <button
                type="button"
                className="agenda-modal-close"
                onClick={() =>
                  setConfirmacaoRemarcacao(
                    null
                  )
                }
                disabled={
                  processandoRemarcacao
                }
              >
                ×
              </button>

              <div className="agenda-modal-icon">
                !
              </div>

              <h2>
                {
                  confirmacaoRemarcacao.acao ===
                  "aceitar"
                    ? "Aceitar remarcação?"
                    : "Recusar remarcação?"
                }
              </h2>

              <p>
                {
                  confirmacaoRemarcacao.acao ===
                  "aceitar"
                    ? "A consulta será movida para a nova data e horário solicitados."
                    : "A consulta continuará na data e horário atuais."
                }
              </p>

              <div className="agenda-modal-info">
                <span>
                  {
                    confirmacaoRemarcacao
                      .remarcacao
                      .pacienteNome
                  }
                </span>

                <small>
                  Atual:{" "}
                  {
                    formatarData(
                      confirmacaoRemarcacao
                        .remarcacao
                        .dataAtual
                    )
                  }
                  {" • "}
                  {
                    confirmacaoRemarcacao
                      .remarcacao
                      .horaInicioAtual
                  }
                </small>

                <strong>
                  Novo:{" "}
                  {
                    formatarData(
                      confirmacaoRemarcacao
                        .remarcacao
                        .novaData
                    )
                  }
                  {" • "}
                  {
                    confirmacaoRemarcacao
                      .remarcacao
                      .novaHoraInicio
                  }
                </strong>
              </div>

              <div className="agenda-modal-actions">
                <button
                  type="button"
                  className="agenda-modal-btn agenda-modal-btn-cancel"
                  onClick={() =>
                    setConfirmacaoRemarcacao(
                      null
                    )
                  }
                  disabled={
                    processandoRemarcacao
                  }
                >
                  Voltar
                </button>

                <button
                  type="button"
                  className={
                    confirmacaoRemarcacao.acao ===
                    "aceitar"
                      ? "agenda-modal-btn agenda-modal-btn-primary"
                      : "agenda-modal-btn agenda-modal-btn-delete"
                  }
                  onClick={() => {
                    void executarAcaoRemarcacao();
                  }}
                  disabled={
                    processandoRemarcacao
                  }
                >
                  {
                    processandoRemarcacao
                      ? "Salvando..."
                      : confirmacaoRemarcacao.acao ===
                          "aceitar"
                        ? "Aceitar remarcação"
                        : "Recusar remarcação"
                  }
                </button>
              </div>
            </div>
          </div>
        )
      }


      {/* ========================================
          MODAL DO DIA
      ======================================== */}

      {
        dataModal && (

          <div className="agenda-modal-overlay">
            <div className="agenda-modal agenda-modal-dia">

              <button
                type="button"
                className="agenda-modal-close"
                onClick={() =>
                  setDataModal(null)
                }
              >
                ×
              </button>

              <div className="agenda-modal-dia-header">
                <span>
                  Horários disponíveis
                </span>

                <h2>
                  {
                    formatarData(
                      dataModal
                    )
                  }
                </h2>

                <p>
                  Veja os períodos de atendimento
                  configurados para esta data.
                </p>
              </div>

              {
                horariosModal.length ===
                0 ? (

                  <div className="agenda-modal-dia-vazio">
                    <div className="agenda-empty-calendar">
                      ◷
                    </div>

                    <h3>
                      Nenhum horário disponível
                    </h3>
                  </div>

                ) : (

                  <div className="agenda-modal-horarios">
                    {
                      horariosModal.map(
                        (
                          item
                        ) => (
                          <div
                            key={
                              item.id
                            }
                            className="agenda-modal-horario"
                          >
                            <div className="agenda-modal-horario-info">
                              <span>
                                Disponível
                              </span>

                              <strong>
                                {
                                  item.horaInicio
                                }
                                {" — "}
                                {
                                  item.horaFim
                                }
                              </strong>

                              <small>
                                {
                                  item.duracaoConsulta
                                }{" "}
                                minutos
                              </small>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                abrirModalExcluir(
                                  item
                                )
                              }
                            >
                              Remover
                            </button>
                          </div>
                        )
                      )
                    }
                  </div>
                )
              }

              <div className="agenda-modal-dia-actions">
                <button
                  type="button"
                  className="agenda-modal-btn agenda-modal-btn-cancel"
                  onClick={() =>
                    setDataModal(null)
                  }
                >
                  Fechar
                </button>

                <button
                  type="button"
                  className="agenda-modal-btn agenda-modal-btn-primary"
                  onClick={
                    abrirModalNovoHorario
                  }
                >
                  Adicionar horário
                </button>
              </div>
            </div>
          </div>
        )
      }


      {/* ========================================
          MODAL NOVO HORÁRIO
      ======================================== */}

      {
        modalNovoHorarioAberto &&
        dataNovoHorario && (

          <div className="agenda-modal-overlay">
            <div className="agenda-modal agenda-modal-novo-horario">

              <button
                type="button"
                className="agenda-modal-close"
                onClick={
                  cancelarNovoHorario
                }
              >
                ×
              </button>

              <div className="agenda-modal-dia-header">
                <span>
                  Nova disponibilidade
                </span>

                <h2>
                  {
                    formatarData(
                      dataNovoHorario
                    )
                  }
                </h2>
              </div>

              <form
                className="agenda-modal-novo-form"
                onSubmit={
                  salvarHorarioModal
                }
              >
                <div className="agenda-form-row">
                  <div className="agenda-field">
                    <label>
                      Horário inicial
                    </label>

                    <input
                      type="time"
                      value={
                        horaInicioModal
                      }
                      onChange={(
                        evento
                      ) =>
                        setHoraInicioModal(
                          evento.target.value
                        )
                      }
                    />
                  </div>

                  <div className="agenda-field">
                    <label>
                      Horário final
                    </label>

                    <input
                      type="time"
                      value={
                        horaFimModal
                      }
                      onChange={(
                        evento
                      ) =>
                        setHoraFimModal(
                          evento.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div className="agenda-field">
                  <label>
                    Duração
                  </label>

                  <select
                    value={
                      duracaoConsultaModal
                    }
                    onChange={(
                      evento
                    ) =>
                      setDuracaoConsultaModal(
                        Number(
                          evento.target.value
                        )
                      )
                    }
                  >
                    <option value={15}>
                      15 minutos
                    </option>

                    <option value={20}>
                      20 minutos
                    </option>

                    <option value={30}>
                      30 minutos
                    </option>

                    <option value={45}>
                      45 minutos
                    </option>

                    <option value={60}>
                      60 minutos
                    </option>
                  </select>
                </div>

                {
                  erroModal && (
                    <div className="agenda-alert agenda-alert-error">
                      {erroModal}
                    </div>
                  )
                }

                <div className="agenda-modal-actions">
                  <button
                    type="button"
                    className="agenda-modal-btn agenda-modal-btn-cancel"
                    onClick={
                      cancelarNovoHorario
                    }
                  >
                    Voltar
                  </button>

                  <button
                    type="submit"
                    className="agenda-modal-btn agenda-modal-btn-primary"
                  >
                    {
                      salvandoModal
                        ? "Salvando..."
                        : "Salvar horário"
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }


      {/* ========================================
          MODAL EXCLUSÃO DISPONIBILIDADE
      ======================================== */}

      {
        disponibilidadeParaExcluir && (

          <div className="agenda-modal-overlay">
            <div className="agenda-modal">

              <div className="agenda-modal-icon">
                !
              </div>

              <h2>
                Remover disponibilidade?
              </h2>

              <div className="agenda-modal-info">
                <span>
                  {
                    formatarData(
                      disponibilidadeParaExcluir.data
                    )
                  }
                </span>

                <strong>
                  {
                    disponibilidadeParaExcluir.horaInicio
                  }
                  {" — "}
                  {
                    disponibilidadeParaExcluir.horaFim
                  }
                </strong>
              </div>

              <div className="agenda-modal-actions">
                <button
                  type="button"
                  className="agenda-modal-btn agenda-modal-btn-cancel"
                  onClick={() =>
                    setDisponibilidadeParaExcluir(
                      null
                    )
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="agenda-modal-btn agenda-modal-btn-delete"
                  onClick={() => {
                    void confirmarExclusao();
                  }}
                >
                  {
                    excluindo
                      ? "Removendo..."
                      : "Sim, remover"
                  }
                </button>
              </div>
            </div>
          </div>
        )
      }


      {/* ========================================
          MODAL AÇÃO AGENDAMENTO
      ======================================== */}

      {
        confirmacaoAcao && (

          <div className="agenda-modal-overlay">
            <div className="agenda-modal">

              <div className="agenda-modal-icon">
                !
              </div>

              <h2>
                {
                  tituloConfirmacaoAcao(
                    confirmacaoAcao.acao
                  )
                }
              </h2>

              <p>
                {
                  descricaoConfirmacaoAcao(
                    confirmacaoAcao.acao
                  )
                }
              </p>

              <div className="agenda-modal-info">
                <span>
                  {
                    confirmacaoAcao
                      .agendamento
                      .pacienteNome
                  }
                </span>

                <strong>
                  {
                    formatarData(
                      confirmacaoAcao
                        .agendamento
                        .data
                    )
                  }
                </strong>

                <small>
                  {
                    confirmacaoAcao
                      .agendamento
                      .horaInicio
                  }
                  {" — "}
                  {
                    confirmacaoAcao
                      .agendamento
                      .horaFim
                  }
                </small>
              </div>

              <div className="agenda-modal-actions">
                <button
                  type="button"
                  className="agenda-modal-btn agenda-modal-btn-cancel"
                  onClick={() =>
                    setConfirmacaoAcao(
                      null
                    )
                  }
                >
                  Voltar
                </button>

                <button
                  type="button"
                  className={
                    confirmacaoAcao.acao ===
                      "confirmar"
                      ? "agenda-modal-btn agenda-modal-btn-primary"
                      : "agenda-modal-btn agenda-modal-btn-delete"
                  }
                  onClick={() => {
                    void executarAcaoAgendamento();
                  }}
                >
                  {
                    executandoAcao
                      ? "Salvando..."
                      : confirmacaoAcao.acao ===
                          "confirmar"
                        ? "Confirmar consulta"
                        : confirmacaoAcao.acao ===
                            "recusar"
                          ? "Recusar solicitação"
                          : "Desmarcar consulta"
                  }
                </button>
              </div>
            </div>
          </div>
        )
      }


      {/* ========================================
          MODAL REMARCAÇÃO DIRETA
      ======================================== */}

      {
        agendamentoParaRemarcar && (

          <div className="agenda-modal-overlay">
            <div className="agenda-modal agenda-modal-remarcacao">

              <button
                type="button"
                className="agenda-modal-close"
                onClick={
                  fecharRemarcacao
                }
              >
                ×
              </button>

              <div className="agenda-modal-dia-header">
                <span>
                  Remarcar consulta
                </span>

                <h2>
                  {
                    agendamentoParaRemarcar
                      .pacienteNome
                  }
                </h2>
              </div>

              <div className="agenda-remarcacao-atual">
                <small>
                  Horário atual
                </small>

                <strong>
                  {
                    formatarData(
                      agendamentoParaRemarcar.data
                    )
                  }
                </strong>

                <span>
                  {
                    agendamentoParaRemarcar.horaInicio
                  }
                  {" — "}
                  {
                    agendamentoParaRemarcar.horaFim
                  }
                </span>
              </div>

              <div className="agenda-field">
                <label>
                  Nova data
                </label>

                <input
                  type="date"
                  value={
                    dataRemarcacao
                  }
                  onChange={(
                    evento
                  ) => {
                    setDataRemarcacao(
                      evento.target.value
                    );

                    setHorarioRemarcacao(
                      ""
                    );
                  }}
                />
              </div>

              <div className="agenda-remarcacao-horarios">
                <label>
                  Horários disponíveis
                </label>

                {
                  slotsRemarcacao.length ===
                  0 ? (

                    <p className="agenda-remarcacao-vazio">
                      Nenhum horário disponível
                      para esta data.
                    </p>

                  ) : (

                    <div className="agenda-remarcacao-grid">
                      {
                        slotsRemarcacao.map(
                          (
                            slot
                          ) => (
                            <button
                              key={
                                `${slot.horaInicio}-${slot.horaFim}`
                              }
                              type="button"
                              className={
                                horarioRemarcacao ===
                                slot.horaInicio
                                  ? "agenda-remarcacao-slot agenda-remarcacao-slot-active"
                                  : "agenda-remarcacao-slot"
                              }
                              onClick={() =>
                                setHorarioRemarcacao(
                                  slot.horaInicio
                                )
                              }
                            >
                              {
                                slot.horaInicio
                              }

                              <small>
                                até{" "}
                                {
                                  slot.horaFim
                                }
                              </small>
                            </button>
                          )
                        )
                      }
                    </div>
                  )
                }
              </div>

              {
                erroRemarcacao && (
                  <div className="agenda-alert agenda-alert-error">
                    {erroRemarcacao}
                  </div>
                )
              }

              <div className="agenda-modal-actions">
                <button
                  type="button"
                  className="agenda-modal-btn agenda-modal-btn-cancel"
                  onClick={
                    fecharRemarcacao
                  }
                >
                  Voltar
                </button>

                <button
                  type="button"
                  className="agenda-modal-btn agenda-modal-btn-primary"
                  disabled={
                    salvandoRemarcacao ||
                    !horarioRemarcacao
                  }
                  onClick={() => {
                    void confirmarRemarcacao();
                  }}
                >
                  {
                    salvandoRemarcacao
                      ? "Remarcando..."
                      : "Confirmar remarcação"
                  }
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}


export default Agenda;