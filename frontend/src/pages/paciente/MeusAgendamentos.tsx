// ========================================
// MEUS AGENDAMENTOS
// ========================================

import {
  useEffect,
  useState
} from "react";

import ModalSistema from "../../components/ModalSistema";

import "../../styles/meusAgendamentos.css";
import "../../styles/agendarConsulta.css";


// ========================================
// TIPOS
// ========================================

type StatusAgendamento =
  | "AGENDADA"
  | "PENDENTE"
  | "CONFIRMADA"
  | "REALIZADA"
  | "RECUSADA"
  | "CANCELADA"
  | "FALTOU";


type StatusRemarcacao =
  | "PENDENTE"
  | "ACEITA"
  | "RECUSADA";


type Agendamento = {
  id: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: StatusAgendamento;
};


type RemarcacaoPaciente = {
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


type HorarioDisponivel = {
  horaInicio: string;
  horaFim: string;
};


type RespostaHorarios = {
  data?: string;
  horarios?: HorarioDisponivel[];
  mensagem?: string;
};


type QuantidadeHorariosPorDia = {
  [data: string]: number;
};


// ========================================
// CALENDÁRIO
// ========================================

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


// ========================================
// COMPONENTE
// ========================================

export default function MeusAgendamentos() {

  const agora = new Date();


  // ========================================
  // ESTADOS
  // ========================================

  const [
    agendamentos,
    setAgendamentos
  ] = useState<Agendamento[]>([]);


  const [
    remarcacoes,
    setRemarcacoes
  ] = useState<RemarcacaoPaciente[]>([]);


  const [
    carregando,
    setCarregando
  ] = useState(true);


  const [
    erro,
    setErro
  ] = useState("");


  const [
    cancelandoId,
    setCancelandoId
  ] = useState<number | null>(null);


  // ========================================
  // MODAL DE CANCELAMENTO
  // ========================================

  const [
    agendamentoCancelamento,
    setAgendamentoCancelamento
  ] =
    useState<Agendamento | null>(
      null
    );


  // ========================================
  // MODAL DE ERRO DO CANCELAMENTO
  // ========================================

  const [
    erroCancelamentoModal,
    setErroCancelamentoModal
  ] =
    useState("");


  const [
    agendamentoRemarcacao,
    setAgendamentoRemarcacao
  ] = useState<Agendamento | null>(null);


  const [
    modalCalendarioAberto,
    setModalCalendarioAberto
  ] = useState(false);


  const [
    modalHorariosAberto,
    setModalHorariosAberto
  ] = useState(false);


  const [
    modalConfirmacaoAberto,
    setModalConfirmacaoAberto
  ] = useState(false);


  const [
    mesAtual,
    setMesAtual
  ] = useState(
    agora.getMonth()
  );


  const [
    anoAtual,
    setAnoAtual
  ] = useState(
    agora.getFullYear()
  );


  const [
    quantidadePorDia,
    setQuantidadePorDia
  ] = useState<QuantidadeHorariosPorDia>({});


  const [
    dataSelecionada,
    setDataSelecionada
  ] = useState("");


  const [
    horarios,
    setHorarios
  ] = useState<HorarioDisponivel[]>([]);


  const [
    horarioSelecionado,
    setHorarioSelecionado
  ] = useState<HorarioDisponivel | null>(
    null
  );


  const [
    carregandoCalendario,
    setCarregandoCalendario
  ] = useState(false);


  const [
    carregandoHorarios,
    setCarregandoHorarios
  ] = useState(false);


  const [
    solicitandoRemarcacao,
    setSolicitandoRemarcacao
  ] = useState(false);


  const [
    erroRemarcacao,
    setErroRemarcacao
  ] = useState("");


  const [
    sucesso,
    setSucesso
  ] = useState("");


  // ========================================
  // MONTAR DATA
  // ========================================

  function montarData(
    ano: number,
    mes: number,
    dia: number
  ) {

    const mesFormatado =
      String(
        mes + 1
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


    return `${ano}-${mesFormatado}-${diaFormatado}`;
  }


  // ========================================
  // DATA DE HOJE
  // ========================================

  function obterDataHoje() {

    const hoje =
      new Date();


    return montarData(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate()
    );
  }


  // ========================================
  // FORMATAR DATA
  // ========================================

  function formatarData(
    data: string
  ) {

    if (!data) {
      return "";
    }


    const partes =
      data.split("-");


    if (
      partes.length !== 3
    ) {
      return data;
    }


    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }


  // ========================================
  // FORMATAR STATUS
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


  // ========================================
  // CLASSE DO STATUS
  // ========================================

  function classeStatus(
    status: StatusAgendamento
  ) {

    switch (status) {

      case "PENDENTE":
        return "meus-agendamentos-status-pendente";

      case "CONFIRMADA":
        return "meus-agendamentos-status-confirmada";

      case "RECUSADA":
        return "meus-agendamentos-status-recusada";

      case "CANCELADA":
        return "meus-agendamentos-status-cancelada";

      case "REALIZADA":
        return "meus-agendamentos-status-realizada";

      case "FALTOU":
        return "meus-agendamentos-status-faltou";

      case "AGENDADA":
      default:
        return "meus-agendamentos-status-agendada";
    }
  }


  // ========================================
  // DESCRIÇÃO DO STATUS
  // ========================================

  function descricaoStatus(
    status: StatusAgendamento
  ) {

    switch (status) {

      case "PENDENTE":
        return "Sua solicitação foi enviada e aguarda a confirmação do médico.";

      case "CONFIRMADA":
        return "Sua consulta foi confirmada pelo médico.";

      case "RECUSADA":
        return "Esta solicitação não foi aceita pelo médico.";

      case "CANCELADA":
        return "Esta consulta foi cancelada.";

      case "REALIZADA":
        return "Esta consulta foi realizada.";

      case "FALTOU":
        return "A consulta foi marcada como falta.";

      case "AGENDADA":
        return "Consulta registrada no sistema.";

      default:
        return "";
    }
  }


  // ========================================
  // VERIFICAR DATA PASSADA
  // ========================================

  function dataJaPassou(
    data: string
  ) {

    return (
      data < obterDataHoje()
    );
  }


  // ========================================
  // PODE ALTERAR AGENDAMENTO
  // ========================================

  function podeAlterarAgendamento(
    status: StatusAgendamento
  ) {

    return (
      status === "PENDENTE" ||
      status === "CONFIRMADA" ||
      status === "AGENDADA"
    );
  }


  // ========================================
  // BUSCAR REMARCAÇÃO PENDENTE
  // ========================================

  function buscarRemarcacaoPendente(
    agendamentoId: number
  ) {

    return remarcacoes.find(
      (
        remarcacao
      ) =>
        Number(
          remarcacao.agendamentoId
        ) ===
          Number(
            agendamentoId
          ) &&
        remarcacao.status ===
          "PENDENTE"
    );
  }


  // ========================================
  // BUSCAR AGENDAMENTOS
  // ========================================

  async function buscarAgendamentos() {

    try {

      setCarregando(true);

      setErro("");






      const resposta =
        await fetch(
          "http://localhost:3000/agendamentos/meus",
          {
            method: "GET",

            credentials: "include"
          }
        );


      const dados =
        await resposta.json();


      if (!resposta.ok) {

        setErro(
          dados.mensagem ||
          "Não foi possível carregar os agendamentos."
        );

        return;
      }


      if (
        Array.isArray(
          dados.agendamentos
        )
      ) {

        setAgendamentos(
          dados.agendamentos
        );

      } else {

        setAgendamentos([]);

      }

    } catch (error) {

      console.error(
        "Erro ao buscar agendamentos:",
        error
      );


      setErro(
        "Não foi possível conectar ao servidor."
      );

    } finally {

      setCarregando(false);

    }
  }


  // ========================================
  // BUSCAR REMARCAÇÕES
  // ========================================

  async function buscarRemarcacoes() {

    try {





      const resposta =
        await fetch(
          "http://localhost:3000/agendamentos/remarcacoes/minhas",
          {
            method: "GET",

            credentials: "include"
          }
        );


      const dados =
        await resposta.json();


      if (!resposta.ok) {

        console.error(
          "Erro ao buscar remarcações:",
          dados.mensagem
        );

        setRemarcacoes([]);

        return;
      }


      if (
        Array.isArray(
          dados.remarcacoes
        )
      ) {

        setRemarcacoes(
          dados.remarcacoes
        );

      } else {

        setRemarcacoes([]);

      }

    } catch (error) {

      console.error(
        "Erro ao buscar remarcações:",
        error
      );


      setRemarcacoes([]);

    }
  }


  // ========================================
  // ATUALIZAR TELA
  // ========================================

  async function atualizarDados() {

    await Promise.all([
      buscarAgendamentos(),
      buscarRemarcacoes()
    ]);
  }


  // ========================================
  // ABRIR CONFIRMAÇÃO DE CANCELAMENTO
  // ========================================

  function cancelarConsulta(
    agendamento: Agendamento
  ) {

    setErroCancelamentoModal(
      ""
    );


    setAgendamentoCancelamento(
      agendamento
    );
  }


  // ========================================
  // CONFIRMAR CANCELAMENTO
  // ========================================

  async function confirmarCancelamentoConsulta() {

    if (
      !agendamentoCancelamento
    ) {
      return;
    }


    /*
      Guardamos o agendamento atual
      porque o modal poderá ser fechado
      depois da resposta da API.
    */
    const agendamento =
      agendamentoCancelamento;


    try {

      setCancelandoId(
        agendamento.id
      );


      setErroCancelamentoModal(
        ""
      );


      const resposta =
        await fetch(
          `http://localhost:3000/agendamentos/${agendamento.id}/cancelar-paciente`,
          {
            method: "PATCH",

            credentials: "include"
          }
        );


      const dados =
        await resposta.json();


      if (!resposta.ok) {

        // Fecha a confirmação.
        setAgendamentoCancelamento(
          null
        );


        // Abre o modal de erro.
        setErroCancelamentoModal(
          dados.mensagem ||
          "Não foi possível cancelar a consulta."
        );


        return;
      }


      await atualizarDados();


      // Fecha o modal após sucesso.
      setAgendamentoCancelamento(
        null
      );

    } catch (error) {

      console.error(
        "Erro ao cancelar consulta:",
        error
      );


      // Fecha a confirmação.
      setAgendamentoCancelamento(
        null
      );


      // Exibe o erro no modal do sistema.
      setErroCancelamentoModal(
        "Não foi possível conectar ao servidor."
      );

    } finally {

      setCancelandoId(
        null
      );

    }
  }


  // ========================================
  // BUSCAR HORÁRIOS DO DIA
  // ========================================

  async function buscarHorariosDoDia(
    data: string
  ) {

    try {

      setCarregandoHorarios(
        true
      );

      setErroRemarcacao("");

      setHorarios([]);

      setHorarioSelecionado(
        null
      );






      const resposta =
        await fetch(
          `http://localhost:3000/agendamentos/horarios-disponiveis?data=${encodeURIComponent(
            data
          )}`,
          {
            method: "GET",

            credentials: "include"
          }
        );


      const dados:
        RespostaHorarios =
          await resposta.json();


      if (!resposta.ok) {

        setErroRemarcacao(
          dados.mensagem ||
          "Não foi possível buscar os horários."
        );

        return;
      }


      setHorarios(
        dados.horarios || []
      );

    } catch (error) {

      console.error(
        "Erro ao buscar horários:",
        error
      );


      setErroRemarcacao(
        "Não foi possível conectar ao servidor."
      );

    } finally {

      setCarregandoHorarios(
        false
      );

    }
  }


  // ========================================
  // CARREGAR MÊS
  // ========================================

  async function carregarMes(
    mes: number,
    ano: number
  ) {

    try {

      setCarregandoCalendario(
        true
      );

      setErroRemarcacao("");






      const quantidadeDias =
        new Date(
          ano,
          mes + 1,
          0
        ).getDate();


      const dias =
        Array.from(
          {
            length:
              quantidadeDias
          },
          (
            _,
            indice
          ) =>
            indice + 1
        );


      const resultados =
        await Promise.all(

          dias.map(
            async (
              dia
            ) => {

              const data =
                montarData(
                  ano,
                  mes,
                  dia
                );


              if (
                dataJaPassou(
                  data
                )
              ) {

                return {
                  data,
                  quantidade: 0
                };
              }


              try {

                const resposta =
                  await fetch(
                    `http://localhost:3000/agendamentos/horarios-disponiveis?data=${encodeURIComponent(
                      data
                    )}`,
                    {
                      method: "GET",

                      credentials: "include"
                    }
                  );


                if (!resposta.ok) {

                  return {
                    data,
                    quantidade: 0
                  };
                }


                const dados:
                  RespostaHorarios =
                    await resposta.json();


                return {
                  data,

                  quantidade:
                    dados.horarios
                      ?.length || 0
                };

              } catch {

                return {
                  data,
                  quantidade: 0
                };

              }
            }
          )
        );


      const mapa:
        QuantidadeHorariosPorDia = {};


      resultados.forEach(
        (
          resultado
        ) => {

          mapa[
            resultado.data
          ] =
            resultado.quantidade;

        }
      );


      setQuantidadePorDia(
        mapa
      );

    } catch (error) {

      console.error(
        "Erro ao carregar calendário de remarcação:",
        error
      );


      setErroRemarcacao(
        "Não foi possível carregar o calendário."
      );

    } finally {

      setCarregandoCalendario(
        false
      );

    }
  }


  // ========================================
  // ABRIR REMARCAÇÃO
  // ========================================

  function abrirRemarcacao(
    agendamento: Agendamento
  ) {

    const remarcacaoPendente =
      buscarRemarcacaoPendente(
        agendamento.id
      );


    if (
      remarcacaoPendente
    ) {

      setSucesso(
        "Já existe uma remarcação aguardando confirmação do médico."
      );

      return;
    }


    const hoje =
      new Date();


    setAgendamentoRemarcacao(
      agendamento
    );


    setMesAtual(
      hoje.getMonth()
    );

    setAnoAtual(
      hoje.getFullYear()
    );


    setQuantidadePorDia({});

    setDataSelecionada("");

    setHorarios([]);

    setHorarioSelecionado(
      null
    );

    setErroRemarcacao("");

    setSucesso("");


    setModalHorariosAberto(
      false
    );

    setModalConfirmacaoAberto(
      false
    );

    setModalCalendarioAberto(
      true
    );


    void carregarMes(
      hoje.getMonth(),
      hoje.getFullYear()
    );
  }


  // ========================================
  // FECHAR REMARCAÇÃO
  // ========================================

  function fecharRemarcacao() {

    if (
      solicitandoRemarcacao
    ) {
      return;
    }


    setModalCalendarioAberto(
      false
    );

    setModalHorariosAberto(
      false
    );

    setModalConfirmacaoAberto(
      false
    );


    setAgendamentoRemarcacao(
      null
    );

    setDataSelecionada("");

    setHorarios([]);

    setHorarioSelecionado(
      null
    );

    setQuantidadePorDia({});

    setErroRemarcacao("");
  }


  // ========================================
  // MÊS ANTERIOR
  // ========================================

  function mesAnterior() {

    const mesAnteriorData =
      new Date(
        anoAtual,
        mesAtual - 1,
        1
      );


    const mesAtualReal =
      new Date(
        agora.getFullYear(),
        agora.getMonth(),
        1
      );


    if (
      mesAnteriorData <
      mesAtualReal
    ) {
      return;
    }


    let novoMes =
      mesAtual - 1;

    let novoAno =
      anoAtual;


    if (
      novoMes < 0
    ) {

      novoMes = 11;

      novoAno -= 1;
    }


    setMesAtual(
      novoMes
    );

    setAnoAtual(
      novoAno
    );

    setDataSelecionada("");

    setQuantidadePorDia({});


    void carregarMes(
      novoMes,
      novoAno
    );
  }


  // ========================================
  // PRÓXIMO MÊS
  // ========================================

  function proximoMes() {

    let novoMes =
      mesAtual + 1;

    let novoAno =
      anoAtual;


    if (
      novoMes > 11
    ) {

      novoMes = 0;

      novoAno += 1;
    }


    setMesAtual(
      novoMes
    );

    setAnoAtual(
      novoAno
    );

    setDataSelecionada("");

    setQuantidadePorDia({});


    void carregarMes(
      novoMes,
      novoAno
    );
  }


  // ========================================
  // SELECIONAR DIA
  // ========================================

  async function selecionarDia(
    dia: number
  ) {

    const data =
      montarData(
        anoAtual,
        mesAtual,
        dia
      );


    if (
      dataJaPassou(
        data
      )
    ) {
      return;
    }


    const quantidade =
      quantidadePorDia[
        data
      ] || 0;


    if (
      quantidade === 0
    ) {
      return;
    }


    setDataSelecionada(
      data
    );

    setHorarioSelecionado(
      null
    );

    setErroRemarcacao("");


    setModalCalendarioAberto(
      false
    );

    setModalHorariosAberto(
      true
    );


    await buscarHorariosDoDia(
      data
    );
  }


  // ========================================
  // VOLTAR PARA CALENDÁRIO
  // ========================================

  function voltarParaCalendario() {

    setModalHorariosAberto(
      false
    );

    setHorarioSelecionado(
      null
    );

    setErroRemarcacao("");

    setModalCalendarioAberto(
      true
    );
  }


  // ========================================
  // SELECIONAR HORÁRIO
  // ========================================

  function selecionarHorario(
    horario: HorarioDisponivel
  ) {

    setHorarioSelecionado(
      horario
    );

    setErroRemarcacao("");

    setModalHorariosAberto(
      false
    );

    setModalConfirmacaoAberto(
      true
    );
  }


  // ========================================
  // VOLTAR PARA HORÁRIOS
  // ========================================

  function voltarParaHorarios() {

    setModalConfirmacaoAberto(
      false
    );

    setErroRemarcacao("");

    setModalHorariosAberto(
      true
    );
  }


  // ========================================
  // CONFIRMAR REMARCAÇÃO
  // ========================================

  async function confirmarRemarcacao() {

    if (
      !agendamentoRemarcacao ||
      !dataSelecionada ||
      !horarioSelecionado
    ) {

      setErroRemarcacao(
        "Selecione uma nova data e um novo horário."
      );

      return;
    }


    try {

      setSolicitandoRemarcacao(
        true
      );

      setErroRemarcacao("");






      const resposta =
        await fetch(
          `http://localhost:3000/agendamentos/${agendamentoRemarcacao.id}/remarcacoes`,
          {
            method: "POST",

            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",

            },

            body:
              JSON.stringify({
                data:
                  dataSelecionada,

                horaInicio:
                  horarioSelecionado.horaInicio
              })
          }
        );


      const dados =
        await resposta.json();


      if (!resposta.ok) {

        setErroRemarcacao(
          dados.mensagem ||
          "Não foi possível solicitar a remarcação."
        );


        if (
          resposta.status ===
          409
        ) {

          setModalConfirmacaoAberto(
            false
          );

          setHorarioSelecionado(
            null
          );


          await buscarHorariosDoDia(
            dataSelecionada
          );


          setModalHorariosAberto(
            true
          );
        }


        return;
      }


      setModalConfirmacaoAberto(
        false
      );

      setModalHorariosAberto(
        false
      );

      setModalCalendarioAberto(
        false
      );


      setAgendamentoRemarcacao(
        null
      );

      setDataSelecionada("");

      setHorarioSelecionado(
        null
      );

      setHorarios([]);

      setQuantidadePorDia({});


      setSucesso(
        dados.mensagem ||
        "Solicitação de remarcação enviada. Aguarde a confirmação do médico."
      );


      // Atualiza consulta + remarcação.
      // Isso faz o card mudar imediatamente.
      await atualizarDados();

    } catch (error) {

      console.error(
        "Erro ao solicitar remarcação:",
        error
      );


      setErroRemarcacao(
        "Não foi possível conectar ao servidor."
      );

    } finally {

      setSolicitandoRemarcacao(
        false
      );

    }
  }


  // ========================================
  // CARREGAMENTO INICIAL
  // ========================================

  useEffect(() => {

    void atualizarDados();

  }, []);


  // ========================================
  // BLOQUEAR SCROLL COM MODAL
  // ========================================

  useEffect(() => {

    if (
      modalCalendarioAberto ||
      modalHorariosAberto ||
      modalConfirmacaoAberto
    ) {

      document.body.classList.add(
        "agendamento-modal-aberto"
      );

    } else {

      document.body.classList.remove(
        "agendamento-modal-aberto"
      );

    }


    return () => {

      document.body.classList.remove(
        "agendamento-modal-aberto"
      );

    };

  }, [
    modalCalendarioAberto,
    modalHorariosAberto,
    modalConfirmacaoAberto
  ]);


  // ========================================
  // CALENDÁRIO
  // ========================================

  const primeiroDiaSemana =
    new Date(
      anoAtual,
      mesAtual,
      1
    ).getDay();


  const quantidadeDiasMes =
    new Date(
      anoAtual,
      mesAtual + 1,
      0
    ).getDate();


  const espacosInicio =
    Array.from({
      length:
        primeiroDiaSemana
    });


  const diasDoMes =
    Array.from(
      {
        length:
          quantidadeDiasMes
      },
      (
        _,
        indice
      ) =>
        indice + 1
    );


  const podeVoltarMes = !(
    mesAtual ===
      agora.getMonth() &&
    anoAtual ===
      agora.getFullYear()
  );


  // ========================================
  // INTERFACE
  // ========================================

  return (

    <main className="meus-agendamentos-page">

      {/* ========================================
          CABEÇALHO
      ======================================== */}

      <section className="meus-agendamentos-header">

        <div>

          <span className="meus-agendamentos-eyebrow">
            Consultas
          </span>

          <h1>
            Meus agendamentos
          </h1>

          <p>
            Acompanhe suas consultas e
            solicitações de remarcação.
          </p>

        </div>

      </section>


      {/* ========================================
          MENSAGENS
      ======================================== */}

      {
        sucesso !== "" && (

          <div className="agendamento-mensagem sucesso">
            {sucesso}
          </div>

        )
      }


      {
        erro !== "" && (

          <div className="agendamento-mensagem erro">
            {erro}
          </div>

        )
      }


      {/* ========================================
          CARREGANDO
      ======================================== */}

      {
        carregando && (

          <div className="meus-agendamentos-carregando">
            Carregando agendamentos...
          </div>

        )
      }


      {/* ========================================
          SEM AGENDAMENTOS
      ======================================== */}

      {
        !carregando &&
        agendamentos.length === 0 &&
        erro === "" && (

          <div className="meus-agendamentos-vazio">

            <h2>
              Nenhum agendamento encontrado
            </h2>

            <p>
              Suas consultas aparecerão aqui.
            </p>

          </div>

        )
      }


      {/* ========================================
          LISTA DE AGENDAMENTOS
      ======================================== */}

      {
        !carregando &&
        agendamentos.length > 0 && (

          <section className="meus-agendamentos-lista">

            {
              agendamentos.map(
                (
                  agendamento
                ) => {

                  // Procura uma remarcação PENDENTE
                  // relacionada especificamente a este
                  // agendamento.
                  const remarcacaoPendente =
                    buscarRemarcacaoPendente(
                      agendamento.id
                    );


                  return (

                    <article
                      key={
                        agendamento.id
                      }
                      className="meus-agendamentos-card"
                    >

                      {/* ========================================
                          TOPO DO CARD
                      ======================================== */}

                      <div className="meus-agendamentos-card-topo">

                        <div className="meus-agendamentos-data">

                          <span>
                            Data da consulta
                          </span>

                          <strong>
                            {
                              formatarData(
                                agendamento.data
                              )
                            }
                          </strong>

                        </div>


                        {/*
                          IMPORTANTE:

                          Se existir uma remarcação pendente,
                          NÃO mostramos "Confirmada".

                          Visualmente o status passa a ser:
                          "Aguardando confirmação da remarcação".

                          O agendamento continua CONFIRMADA no
                          banco até o médico tomar uma decisão.
                        */}

                        <span
                          className={
                            remarcacaoPendente
                              ? "meus-agendamentos-status meus-agendamentos-status-pendente"
                              : `meus-agendamentos-status ${classeStatus(
                                  agendamento.status
                                )}`
                          }
                        >

                          {
                            remarcacaoPendente
                              ? "Aguardando confirmação da remarcação"
                              : formatarStatus(
                                  agendamento.status
                                )
                          }

                        </span>

                      </div>


                      {/* ========================================
                          HORÁRIO ATUAL
                      ======================================== */}

                      <div className="meus-agendamentos-horario">

                        <div className="meus-agendamentos-horario-icone">
                          ◷
                        </div>

                        <div>

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

                      </div>


                      {/* ========================================
                          DESCRIÇÃO
                      ======================================== */}

                      <div className="meus-agendamentos-descricao">

                        <span
                          className={
                            remarcacaoPendente
                              ? "meus-agendamentos-indicador meus-agendamentos-status-pendente"
                              : `meus-agendamentos-indicador ${classeStatus(
                                  agendamento.status
                                )}`
                          }
                        />


                        <p>

                          {
                            remarcacaoPendente
                              ? "Sua solicitação de remarcação foi enviada e aguarda a confirmação do médico."
                              : descricaoStatus(
                                  agendamento.status
                                )
                          }

                        </p>

                      </div>


                      {/* ========================================
                          DADOS DA REMARCAÇÃO PENDENTE
                      ======================================== */}

                      {
                        remarcacaoPendente && (

                          <div className="meus-agendamentos-remarcacao-pendente">

                            <div className="meus-agendamentos-remarcacao-pendente-topo">

                              <div className="meus-agendamentos-remarcacao-pendente-icone">
                                ◷
                              </div>


                              <div>

                                <strong>
                                  Remarcação aguardando confirmação
                                </strong>

                                <span>
                                  Aguardando resposta do médico
                                </span>

                              </div>

                            </div>


                            <div className="meus-agendamentos-remarcacao-pendente-dados">

                              <div>

                                <small>
                                  Nova data solicitada
                                </small>

                                <strong>
                                  {
                                    formatarData(
                                      remarcacaoPendente.novaData
                                    )
                                  }
                                </strong>

                              </div>


                              <div>

                                <small>
                                  Novo horário
                                </small>

                                <strong>

                                  {
                                    remarcacaoPendente.novaHoraInicio
                                  }

                                  {" — "}

                                  {
                                    remarcacaoPendente.novaHoraFim
                                  }

                                </strong>

                              </div>

                            </div>


                            <p className="meus-agendamentos-remarcacao-pendente-aviso">
                              Sua consulta atual continua válida
                              até o médico confirmar a remarcação.
                            </p>

                          </div>

                        )
                      }


                      {/* ========================================
                          AÇÕES
                      ======================================== */}

                      {
                        podeAlterarAgendamento(
                          agendamento.status
                        ) && (

                          <div className="meus-agendamentos-acoes">

                            <button
                              type="button"
                              className={
                                remarcacaoPendente
                                  ? "meus-agendamentos-btn-remarcar meus-agendamentos-btn-remarcacao-pendente"
                                  : "meus-agendamentos-btn-remarcar"
                              }
                              disabled={
                                cancelandoId ===
                                  agendamento.id ||
                                Boolean(
                                  remarcacaoPendente
                                )
                              }
                              onClick={() => {

                                abrirRemarcacao(
                                  agendamento
                                );

                              }}
                            >

                              {
                                remarcacaoPendente
                                  ? "Remarcação pendente"
                                  : "Remarcar"
                              }

                            </button>


                            <button
                              type="button"
                              className="meus-agendamentos-btn-cancelar"
                              disabled={
                                cancelandoId ===
                                agendamento.id
                              }
                              onClick={() => {

                                void cancelarConsulta(
                                  agendamento
                                );

                              }}
                            >

                              {
                                cancelandoId ===
                                agendamento.id

                                  ? "Cancelando..."

                                  : agendamento.status ===
                                      "PENDENTE"

                                    ? "Cancelar solicitação"

                                    : "Cancelar consulta"
                              }

                            </button>

                          </div>

                        )
                      }

                    </article>

                  );
                }
              )
            }

          </section>

        )
      }


      {/* ========================================
          MODAL DO CALENDÁRIO
      ======================================== */}

      {
        modalCalendarioAberto &&
        agendamentoRemarcacao && (

          <div
            className="agendamento-modal-fundo"
            onMouseDown={
              (
                evento
              ) => {

                if (
                  evento.target ===
                  evento.currentTarget
                ) {

                  fecharRemarcacao();

                }

              }
            }
          >

            <div className="agendamento-modal meus-agendamentos-modal-calendario">

              <div className="agendamento-modal-cabecalho">

                <div>

                  <p className="agendamento-modal-etiqueta">
                    Remarcação
                  </p>

                  <h2>
                    Escolha uma nova data
                  </h2>

                </div>


                <button
                  type="button"
                  className="agendamento-modal-fechar"
                  onClick={
                    fecharRemarcacao
                  }
                  aria-label="Fechar"
                >
                  ×
                </button>

              </div>


              {/* ========================================
                  CONSULTA ATUAL
              ======================================== */}

              <div className="meus-agendamentos-remarcacao-atual">

                <span>
                  Consulta atual
                </span>

                <strong>
                  {
                    formatarData(
                      agendamentoRemarcacao.data
                    )
                  }
                </strong>

                <p>

                  {
                    agendamentoRemarcacao.horaInicio
                  }

                  {" — "}

                  {
                    agendamentoRemarcacao.horaFim
                  }

                </p>

              </div>


              {/* ========================================
                  CALENDÁRIO
              ======================================== */}

              <div className="agendamento-calendario meus-agendamentos-calendario-remarcacao">

                <div className="agendamento-calendario-topo">

                  <button
                    type="button"
                    className="agendamento-mes-botao"
                    onClick={
                      mesAnterior
                    }
                    disabled={
                      !podeVoltarMes ||
                      carregandoCalendario
                    }
                    aria-label="Mês anterior"
                  >
                    ‹
                  </button>


                  <div className="agendamento-mes-titulo">

                    <h2>

                      {
                        nomesMeses[
                          mesAtual
                        ]
                      }

                      {" "}

                      {anoAtual}

                    </h2>

                    <p>
                      Dias em verde possuem horários disponíveis
                    </p>

                  </div>


                  <button
                    type="button"
                    className="agendamento-mes-botao"
                    onClick={
                      proximoMes
                    }
                    disabled={
                      carregandoCalendario
                    }
                    aria-label="Próximo mês"
                  >
                    ›
                  </button>

                </div>


                {
                  carregandoCalendario && (

                    <div className="agendamento-calendario-carregando">

                      <div className="agendamento-spinner" />

                      <span>
                        Buscando horários disponíveis...
                      </span>

                    </div>

                  )
                }


                <div className="agendamento-semana">

                  {
                    diasSemana.map(
                      (
                        diaSemana
                      ) => (

                        <div
                          key={
                            diaSemana
                          }
                          className="agendamento-semana-dia"
                        >
                          {diaSemana}
                        </div>

                      )
                    )
                  }

                </div>


                <div className="agendamento-calendario-grade">

                  {
                    espacosInicio.map(
                      (
                        _,
                        indice
                      ) => (

                        <div
                          key={
                            `vazio-${indice}`
                          }
                          className="agendamento-dia vazio"
                        />

                      )
                    )
                  }


                  {
                    diasDoMes.map(
                      (
                        dia
                      ) => {

                        const data =
                          montarData(
                            anoAtual,
                            mesAtual,
                            dia
                          );


                        const quantidade =
                          quantidadePorDia[
                            data
                          ] || 0;


                        const passado =
                          dataJaPassou(
                            data
                          );


                        const disponivel =
                          quantidade > 0 &&
                          !passado;


                        const hoje =
                          data ===
                          obterDataHoje();


                        const selecionado =
                          data ===
                          dataSelecionada;


                        let classeDia =
                          "agendamento-dia";


                        if (passado) {

                          classeDia +=
                            " passado";

                        } else if (
                          disponivel
                        ) {

                          classeDia +=
                            " disponivel";

                        } else {

                          classeDia +=
                            " indisponivel";

                        }


                        if (hoje) {

                          classeDia +=
                            " hoje";
                        }


                        if (
                          selecionado
                        ) {

                          classeDia +=
                            " selecionado";
                        }


                        return (

                          <button
                            key={
                              data
                            }
                            type="button"
                            className={
                              classeDia
                            }
                            disabled={
                              !disponivel ||
                              carregandoCalendario
                            }
                            onClick={() => {

                              void selecionarDia(
                                dia
                              );

                            }}
                          >

                            <span className="agendamento-dia-numero">
                              {dia}
                            </span>


                            {
                              hoje && (

                                <span className="agendamento-dia-hoje">
                                  Hoje
                                </span>

                              )
                            }


                            {
                              disponivel ? (

                                <div className="agendamento-dia-disponibilidade">

                                  <span className="agendamento-dia-ponto" />

                                  <span className="agendamento-dia-quantidade">

                                    {quantidade}

                                    {" "}

                                    {
                                      quantidade ===
                                      1
                                        ? "horário"
                                        : "horários"
                                    }

                                  </span>

                                </div>

                              ) : (

                                !passado && (

                                  <span className="agendamento-dia-sem-horario">
                                    Sem horários
                                  </span>

                                )

                              )
                            }

                          </button>

                        );
                      }
                    )
                  }

                </div>

              </div>


              {
                erroRemarcacao !==
                "" && (

                  <div className="agendamento-mensagem erro">
                    {erroRemarcacao}
                  </div>

                )
              }

            </div>

          </div>

        )
      }


      {/* ========================================
          MODAL DE HORÁRIOS
      ======================================== */}

      {
        modalHorariosAberto &&
        agendamentoRemarcacao && (

          <div className="agendamento-modal-fundo">

            <div className="agendamento-modal">

              <div className="agendamento-modal-cabecalho">

                <div>

                  <p className="agendamento-modal-etiqueta">
                    Remarcação
                  </p>

                  <h2>
                    Horários disponíveis
                  </h2>

                </div>


                <button
                  type="button"
                  className="agendamento-modal-fechar"
                  onClick={
                    fecharRemarcacao
                  }
                  aria-label="Fechar"
                >
                  ×
                </button>

              </div>


              <div className="agendamento-modal-conteudo">

                <p className="agendamento-modal-instrucao">

                  Escolha um novo horário para{" "}

                  <strong>
                    {
                      formatarData(
                        dataSelecionada
                      )
                    }
                  </strong>.

                </p>


                {
                  erroRemarcacao !==
                  "" && (

                    <div className="agendamento-mensagem erro">
                      {erroRemarcacao}
                    </div>

                  )
                }


                {
                  carregandoHorarios && (

                    <div className="agendamento-modal-carregando">

                      <div className="agendamento-spinner" />

                      <span>
                        Buscando horários disponíveis...
                      </span>

                    </div>

                  )
                }


                {
                  !carregandoHorarios &&
                  horarios.length > 0 && (

                    <div className="agendamento-horarios">

                      {
                        horarios.map(
                          (
                            horario
                          ) => (

                            <button
                              key={
                                `${horario.horaInicio}-${horario.horaFim}`
                              }
                              type="button"
                              className="agendamento-horario"
                              onClick={() => {

                                selecionarHorario(
                                  horario
                                );

                              }}
                            >

                              <span className="agendamento-horario-inicio">
                                {
                                  horario.horaInicio
                                }
                              </span>

                              <span className="agendamento-horario-separador">
                                —
                              </span>

                              <span>
                                {
                                  horario.horaFim
                                }
                              </span>

                            </button>

                          )
                        )
                      }

                    </div>

                  )
                }


                {
                  !carregandoHorarios &&
                  horarios.length ===
                    0 &&
                  erroRemarcacao ===
                    "" && (

                    <div className="agendamento-sem-horarios">

                      <span>
                        ◷
                      </span>

                      <p>
                        Não existem mais horários
                        disponíveis para esta data.
                      </p>

                    </div>

                  )
                }


                <div className="meus-agendamentos-modal-voltar-container">

                  <button
                    type="button"
                    className="meus-agendamentos-confirmacao-voltar"
                    onClick={
                      voltarParaCalendario
                    }
                  >
                    ← Escolher outra data
                  </button>

                </div>

              </div>

            </div>

          </div>

        )
      }


      {/* ========================================
          MODAL DE CONFIRMAÇÃO
      ======================================== */}

      {
        modalConfirmacaoAberto &&
        agendamentoRemarcacao &&
        horarioSelecionado && (

          <div className="agendamento-modal-fundo">

            <div className="agendamento-modal confirmacao">

              <div className="agendamento-confirmacao-icone">
                ↻
              </div>


              <h2>
                Solicitar remarcação?
              </h2>


              <p className="agendamento-confirmacao-texto">
                Confira a alteração antes de enviar
                a solicitação ao médico.
              </p>


              {/* ========================================
                  CONSULTA ATUAL X NOVA
              ======================================== */}

              <div className="meus-agendamentos-comparacao">

                <div className="meus-agendamentos-comparacao-item atual">

                  <span>
                    Consulta atual
                  </span>

                  <strong>
                    {
                      formatarData(
                        agendamentoRemarcacao.data
                      )
                    }
                  </strong>

                  <p>

                    {
                      agendamentoRemarcacao.horaInicio
                    }

                    {" — "}

                    {
                      agendamentoRemarcacao.horaFim
                    }

                  </p>

                </div>


                <div className="meus-agendamentos-comparacao-seta">
                  →
                </div>


                <div className="meus-agendamentos-comparacao-item nova">

                  <span>
                    Nova solicitação
                  </span>

                  <strong>
                    {
                      formatarData(
                        dataSelecionada
                      )
                    }
                  </strong>

                  <p>

                    {
                      horarioSelecionado.horaInicio
                    }

                    {" — "}

                    {
                      horarioSelecionado.horaFim
                    }

                  </p>

                </div>

              </div>


              {/* ========================================
                  AVISO
              ======================================== */}

              <div className="meus-agendamentos-remarcacao-aviso">

                <strong>
                  Importante
                </strong>

                <p>
                  Sua consulta atual continuará válida
                  até o médico aceitar a solicitação
                  de remarcação.
                </p>

              </div>


              {
                erroRemarcacao !==
                "" && (

                  <div className="agendamento-mensagem erro">
                    {erroRemarcacao}
                  </div>

                )
              }


              {/* ========================================
                  BOTÕES
              ======================================== */}

              <div className="meus-agendamentos-confirmacao-acoes">

                <button
                  type="button"
                  className="meus-agendamentos-confirmacao-voltar"
                  disabled={
                    solicitandoRemarcacao
                  }
                  onClick={
                    voltarParaHorarios
                  }
                >
                  Voltar
                </button>


                <button
                  type="button"
                  className="meus-agendamentos-confirmacao-enviar"
                  disabled={
                    solicitandoRemarcacao
                  }
                  onClick={() => {

                    void confirmarRemarcacao();

                  }}
                >

                  {
                    solicitandoRemarcacao
                      ? "Enviando..."
                      : "Solicitar remarcação"
                  }

                </button>

              </div>

            </div>

          </div>

        )
      }




      {/* ========================================
          MODAL - CANCELAR CONSULTA
         ======================================== */}

      <ModalSistema
        aberto={
          agendamentoCancelamento !==
          null
        }
        tipo="aviso"
        titulo={
          agendamentoCancelamento?.status ===
          "PENDENTE"
            ? "Cancelar solicitação"
            : "Cancelar consulta"
        }
        mensagem={
          agendamentoCancelamento?.status ===
          "PENDENTE"
            ? "Tem certeza que deseja cancelar esta solicitação de consulta?"
            : "Tem certeza que deseja cancelar esta consulta?"
        }
        textoConfirmar="Cancelar"
        textoCancelar="Voltar"
        carregando={
          cancelandoId !== null
        }
        onConfirmar={() => {
          void confirmarCancelamentoConsulta();
        }}
        onCancelar={() =>
          setAgendamentoCancelamento(
            null
          )
        }
      />


      {/* ========================================
          MODAL - ERRO AO CANCELAR
         ======================================== */}

      <ModalSistema
        aberto={
          erroCancelamentoModal !==
          ""
        }
        tipo="erro"
        titulo="Não foi possível cancelar"
        mensagem={
          erroCancelamentoModal
        }
        textoConfirmar="Entendi"
        onConfirmar={() =>
          setErroCancelamentoModal(
            ""
          )
        }
      />


    </main>

  );
}