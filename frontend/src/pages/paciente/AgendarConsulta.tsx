import {
  useEffect,
  useState
} from "react";

import "../../styles/agendarConsulta.css";


// ========================================
// TIPOS
// ========================================

type HorarioDisponivel = {
  horaInicio: string;
  horaFim: string;
};


type RespostaHorarios = {
  data: string;
  horarios: HorarioDisponivel[];
  mensagem?: string;
};


type QuantidadeHorariosPorDia = {
  [data: string]: number;
};


type StatusAgendamento =
  | "AGENDADA"
  | "PENDENTE"
  | "CONFIRMADA"
  | "REALIZADA"
  | "RECUSADA"
  | "CANCELADA"
  | "FALTOU";


type AgendamentoPaciente = {
  id: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: StatusAgendamento;
};


// ========================================
// DADOS DO CALENDÁRIO
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

export default function AgendarConsulta() {

  const agora = new Date();


  // ========================================
  // CALENDÁRIO
  // ========================================

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


  // ========================================
  // DIA / HORÁRIO SELECIONADO
  // ========================================

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


  // ========================================
  // QUANTIDADE DE HORÁRIOS POR DIA
  // ========================================

  const [
    quantidadePorDia,
    setQuantidadePorDia
  ] = useState<QuantidadeHorariosPorDia>({});


  // ========================================
  // PRÓXIMA CONSULTA
  // ========================================

  const [
    proximaConsulta,
    setProximaConsulta
  ] = useState<AgendamentoPaciente | null>(
    null
  );


  const [
    carregandoProximaConsulta,
    setCarregandoProximaConsulta
  ] = useState(true);


  // ========================================
  // MODAIS
  // ========================================

  const [
    modalHorariosAberto,
    setModalHorariosAberto
  ] = useState(false);


  const [
    modalConfirmacaoAberto,
    setModalConfirmacaoAberto
  ] = useState(false);


  // ========================================
  // CARREGAMENTOS
  // ========================================

  const [
    carregandoCalendario,
    setCarregandoCalendario
  ] = useState(false);


  const [
    carregandoHorarios,
    setCarregandoHorarios
  ] = useState(false);


  const [
    agendando,
    setAgendando
  ] = useState(false);


  // ========================================
  // MENSAGENS
  // ========================================

  const [
    erro,
    setErro
  ] = useState("");


  const [
    sucesso,
    setSucesso
  ] = useState("");


  // ========================================
  // MONTAR DATA YYYY-MM-DD
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

    const hoje = new Date();

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


    const [
      ano,
      mes,
      dia
    ] = data.split("-");


    return `${dia}/${mes}/${ano}`;
  }


  // ========================================
  // FORMATAR DATA POR EXTENSO
  // ========================================

  function formatarDataExtenso(
    data: string
  ) {

    if (!data) {
      return "";
    }


    const [
      ano,
      mes,
      dia
    ] = data
      .split("-")
      .map(Number);


    return `${dia} de ${
      nomesMeses[
        mes - 1
      ].toLowerCase()
    } de ${ano}`;
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
        return "pendente";

      case "CONFIRMADA":
        return "confirmada";

      case "RECUSADA":
        return "recusada";

      case "CANCELADA":
        return "cancelada";

      case "REALIZADA":
        return "realizada";

      case "FALTOU":
        return "faltou";

      case "AGENDADA":
      default:
        return "agendada";
    }
  }


  // ========================================
  // VERIFICAR DATA PASSADA
  // ========================================

  function dataJaPassou(
    data: string
  ) {

    return data < obterDataHoje();
  }


  // ========================================
  // VERIFICAR SE CONSULTA AINDA É FUTURA
  // ========================================

  function consultaAindaNaoPassou(
    agendamento: AgendamentoPaciente
  ) {

    const horarioConsulta =
      new Date(
        `${agendamento.data}T${agendamento.horaInicio}:00`
      );


    return (
      horarioConsulta.getTime() >=
      Date.now()
    );
  }


  // ========================================
  // BUSCAR PRÓXIMA CONSULTA
  // ========================================

  async function buscarProximaConsulta() {

    try {

      setCarregandoProximaConsulta(
        true
      );


      const token =
        localStorage.getItem(
          "token"
        );


      if (!token) {

        setProximaConsulta(
          null
        );

        return;
      }


      const resposta =
        await fetch(
          "http://localhost:3000/agendamentos/meus",
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


      if (
        !resposta.ok ||
        !Array.isArray(
          dados.agendamentos
        )
      ) {

        setProximaConsulta(
          null
        );

        return;
      }


      const agendamentos:
        AgendamentoPaciente[] =
          dados.agendamentos;


      // ========================================
      // SOMENTE AGENDAMENTOS QUE AINDA
      // REPRESENTAM UMA CONSULTA FUTURA
      // ========================================

      const proximos =
        agendamentos

          .filter(
            (
              agendamento
            ) => {

              const statusAtivo =
                agendamento.status ===
                  "PENDENTE" ||

                agendamento.status ===
                  "AGENDADA" ||

                agendamento.status ===
                  "CONFIRMADA";


              return (
                statusAtivo &&
                consultaAindaNaoPassou(
                  agendamento
                )
              );
            }
          )

          .sort(
            (
              a,
              b
            ) => {

              const dataHoraA =
                `${a.data} ${a.horaInicio}`;


              const dataHoraB =
                `${b.data} ${b.horaInicio}`;


              return (
                dataHoraA.localeCompare(
                  dataHoraB
                )
              );
            }
          );


      // ========================================
      // GUARDA SOMENTE A PRIMEIRA
      // ========================================

      setProximaConsulta(
        proximos[0] || null
      );


    } catch (erro) {

      console.error(
        "Erro ao buscar próxima consulta:",
        erro
      );


      // Não mostramos erro geral da página,
      // pois isso não deve impedir o paciente
      // de utilizar o calendário.
      setProximaConsulta(
        null
      );


    } finally {

      setCarregandoProximaConsulta(
        false
      );

    }
  }


  // ========================================
  // BUSCAR HORÁRIOS DO DIA
  // ========================================

  async function buscarHorariosDoDia(
    data: string,
    limparMensagens = true
  ) {

    try {

      setCarregandoHorarios(
        true
      );


      if (
        limparMensagens
      ) {

        setErro("");
        setSucesso("");

      }


      const token =
        localStorage.getItem(
          "token"
        );


      if (!token) {

        setErro(
          "Sessão não encontrada. Faça login novamente."
        );

        return;
      }


      const resposta =
        await fetch(
          `http://localhost:3000/agendamentos/horarios-disponiveis?data=${encodeURIComponent(
            data
          )}`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );


      const dados:
        RespostaHorarios =
          await resposta.json();


      if (!resposta.ok) {

        setHorarios([]);

        setErro(
          dados.mensagem ||
          "Não foi possível buscar os horários."
        );

        return;
      }


      setHorarios(
        dados.horarios || []
      );


    } catch (erro) {

      console.error(
        "Erro ao buscar horários:",
        erro
      );


      setHorarios([]);


      setErro(
        "Não foi possível conectar ao servidor."
      );


    } finally {

      setCarregandoHorarios(
        false
      );

    }
  }


  // ========================================
  // CARREGAR DISPONIBILIDADE DO MÊS
  // ========================================

  async function carregarMes(
    limparMensagens = true
  ) {

    try {

      setCarregandoCalendario(
        true
      );


      if (
        limparMensagens
      ) {

        setErro("");

      }


      const token =
        localStorage.getItem(
          "token"
        );


      if (!token) {

        setErro(
          "Sessão não encontrada. Faça login novamente."
        );

        return;
      }


      const quantidadeDias =
        new Date(
          anoAtual,
          mesAtual + 1,
          0
        ).getDate();


      const dias =
        Array.from(
          {
            length:
              quantidadeDias
          },
          (_, indice) =>
            indice + 1
        );


      const resultados =
        await Promise.all(

          dias.map(

            async (dia) => {

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

                      headers: {
                        Authorization:
                          `Bearer ${token}`
                      }
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

        (resultado) => {

          mapa[
            resultado.data
          ] =
            resultado.quantidade;

        }

      );


      setQuantidadePorDia(
        mapa
      );


    } catch (erro) {

      console.error(
        "Erro ao carregar calendário:",
        erro
      );


      setErro(
        "Não foi possível carregar o calendário."
      );


    } finally {

      setCarregandoCalendario(
        false
      );

    }
  }


  // ========================================
  // BUSCAR PRÓXIMA CONSULTA AO ABRIR
  // ========================================

  useEffect(() => {

    void buscarProximaConsulta();

  }, []);


  // ========================================
  // ATUALIZAR QUANDO TROCAR MÊS
  // ========================================

  useEffect(() => {

    setDataSelecionada("");

    setHorarioSelecionado(
      null
    );

    setHorarios([]);

    setModalHorariosAberto(
      false
    );

    setModalConfirmacaoAberto(
      false
    );

    setSucesso("");

    void carregarMes();

  }, [
    mesAtual,
    anoAtual
  ]);


  // ========================================
  // BLOQUEAR SCROLL COM MODAL
  // ========================================

  useEffect(() => {

    if (
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
    modalHorariosAberto,
    modalConfirmacaoAberto
  ]);


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


    if (
      mesAtual === 0
    ) {

      setMesAtual(
        11
      );

      setAnoAtual(
        anoAtual - 1
      );

    } else {

      setMesAtual(
        mesAtual - 1
      );

    }
  }


  // ========================================
  // PRÓXIMO MÊS
  // ========================================

  function proximoMes() {

    if (
      mesAtual === 11
    ) {

      setMesAtual(
        0
      );

      setAnoAtual(
        anoAtual + 1
      );

    } else {

      setMesAtual(
        mesAtual + 1
      );

    }
  }


  // ========================================
  // CLICAR NO DIA
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


    setErro("");
    setSucesso("");


    setModalHorariosAberto(
      true
    );


    await buscarHorariosDoDia(
      data
    );
  }


  // ========================================
  // FECHAR MODAL DE HORÁRIOS
  // ========================================

  function fecharModalHorarios() {

    setModalHorariosAberto(
      false
    );


    setHorarioSelecionado(
      null
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


    setModalHorariosAberto(
      false
    );


    setModalConfirmacaoAberto(
      true
    );

  }


  // ========================================
  // CANCELAR CONFIRMAÇÃO
  // ========================================

  function cancelarConfirmacao() {

    setModalConfirmacaoAberto(
      false
    );


    setHorarioSelecionado(
      null
    );


    setModalHorariosAberto(
      true
    );

  }


  // ========================================
  // CONFIRMAR AGENDAMENTO
  // ========================================

  async function confirmarAgendamento() {

    if (
      !dataSelecionada ||
      !horarioSelecionado
    ) {

      setErro(
        "Selecione uma data e um horário."
      );

      return;
    }


    try {

      setAgendando(
        true
      );


      setErro("");


      const token =
        localStorage.getItem(
          "token"
        );


      if (!token) {

        setErro(
          "Sessão não encontrada. Faça login novamente."
        );

        return;
      }


      const resposta =
        await fetch(
          "http://localhost:3000/agendamentos",
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
                data:
                  dataSelecionada,

                horaInicio:
                  horarioSelecionado
                    .horaInicio
              })
          }
        );


      const dados =
        await resposta.json();


      // ========================================
      // ERRO
      // ========================================

      if (!resposta.ok) {

        setErro(
          dados.mensagem ||
          "Não foi possível realizar o agendamento."
        );


        setModalConfirmacaoAberto(
          false
        );


        if (
          resposta.status === 409
        ) {

          await buscarHorariosDoDia(
            dataSelecionada,
            false
          );


          await carregarMes(
            false
          );


          setHorarioSelecionado(
            null
          );


          setModalHorariosAberto(
            true
          );

        }


        return;
      }


      // ========================================
      // MENSAGEM DE SUCESSO
      // ========================================

      setSucesso(
        dados.mensagem ||
        "Solicitação enviada com sucesso."
      );


      // ========================================
      // FECHAR MODAIS
      // ========================================

      setModalConfirmacaoAberto(
        false
      );


      setModalHorariosAberto(
        false
      );


      setHorarioSelecionado(
        null
      );


      // ========================================
      // ATUALIZAR HORÁRIOS
      // ========================================

      await buscarHorariosDoDia(
        dataSelecionada,
        false
      );


      await carregarMes(
        false
      );


      // ========================================
      // ATUALIZAR PRÓXIMA CONSULTA
      // ========================================

      await buscarProximaConsulta();


    } catch (erro) {

      console.error(
        "Erro ao criar agendamento:",
        erro
      );


      setErro(
        "Não foi possível conectar ao servidor."
      );


    } finally {

      setAgendando(
        false
      );

    }
  }


  // ========================================
  // DADOS PARA MONTAR CALENDÁRIO
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
    Array.from(
      {
        length:
          primeiroDiaSemana
      }
    );


  const diasDoMes =
    Array.from(
      {
        length:
          quantidadeDiasMes
      },
      (_, indice) =>
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

    <div className="agendamento-pagina">


      {/* =====================================
          CABEÇALHO
      ====================================== */}

      <section className="agendamento-cabecalho">

        <p className="agendamento-cabecalho-tipo">
          Agendamento
        </p>


        <h1>
          Agendar consulta
        </h1>


        <p>
          Escolha um dia disponível no calendário
          e selecione o melhor horário para sua
          consulta.
        </p>

      </section>


      {/* =====================================
          CALENDÁRIO
      ====================================== */}

      <section className="agendamento-calendario">


        {/* TOPO */}

        <div className="agendamento-calendario-topo">

          <button
            type="button"
            className="agendamento-mes-botao"
            onClick={
              mesAnterior
            }
            disabled={
              !podeVoltarMes
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
            aria-label="Próximo mês"
          >
            ›
          </button>

        </div>


        {/* CARREGAMENTO */}

        {
          carregandoCalendario && (

            <div className="agendamento-calendario-carregando">
              Buscando horários disponíveis...
            </div>

          )
        }


        {/* DIAS DA SEMANA */}

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


        {/* GRADE */}

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


                const selecionado =
                  dataSelecionada ===
                  data;


                const hoje =
                  data ===
                  obterDataHoje();


                let classeDia =
                  "agendamento-dia";


                if (passado) {

                  classeDia +=
                    " passado";

                }


                if (disponivel) {

                  classeDia +=
                    " disponivel";

                }


                if (
                  !disponivel &&
                  !passado
                ) {

                  classeDia +=
                    " indisponivel";

                }


                if (selecionado) {

                  classeDia +=
                    " selecionado";

                }


                if (hoje) {

                  classeDia +=
                    " hoje";

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
                      !disponivel
                    }
                    onClick={() =>
                      selecionarDia(
                        dia
                      )
                    }
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
                              quantidade === 1
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

      </section>


      {/* =====================================
          PRÓXIMA CONSULTA
      ====================================== */}

      {
        !carregandoProximaConsulta &&
        proximaConsulta && (

          <section className="agendamentos-recentes">

            <div className="agendamentos-recentes-cabecalho">

              <div>

                <span className="agendamentos-recentes-etiqueta">
                  Próxima consulta
                </span>


                <h2>
                  Seu próximo atendimento
                </h2>


                <p>
                  Acompanhe aqui somente a consulta
                  mais próxima. Para visualizar todas,
                  acesse Meus agendamentos.
                </p>

              </div>

            </div>


            <div className="agendamentos-recentes-lista">

              <article className="agendamento-recente-card">


                <div className="agendamento-recente-data">

                  <div className="agendamento-recente-icone">
                    ◷
                  </div>


                  <div>

                    <span>
                      Data da consulta
                    </span>


                    <strong>
                      {
                        formatarDataExtenso(
                          proximaConsulta.data
                        )
                      }
                    </strong>

                  </div>

                </div>


                <div className="agendamento-recente-horario">

                  <span>
                    Horário
                  </span>


                  <strong>
                    {
                      proximaConsulta.horaInicio
                    }

                    {" - "}

                    {
                      proximaConsulta.horaFim
                    }
                  </strong>

                </div>


                <div
                  className={
                    `agendamento-recente-status ${classeStatus(
                      proximaConsulta.status
                    )}`
                  }
                >

                  {
                    formatarStatus(
                      proximaConsulta.status
                    )
                  }

                </div>

              </article>

            </div>

          </section>

        )
      }


      {/* =====================================
          MENSAGENS
      ====================================== */}

      {
        erro && (

          <div className="agendamento-mensagem erro">
            {erro}
          </div>

        )
      }


      {
        sucesso && (

          <div className="agendamento-mensagem sucesso">
            {sucesso}
          </div>

        )
      }


      {/* =====================================
          MODAL DE HORÁRIOS
      ====================================== */}

      {
        modalHorariosAberto && (

          <div
            className="agendamento-modal-fundo"
            role="presentation"
          >

            <div
              className="agendamento-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-modal-horarios"
            >


              <div className="agendamento-modal-cabecalho">

                <div>

                  <p className="agendamento-modal-etiqueta">
                    Horários disponíveis
                  </p>


                  <h2 id="titulo-modal-horarios">
                    {
                      formatarData(
                        dataSelecionada
                      )
                    }
                  </h2>

                </div>


                <button
                  type="button"
                  className="agendamento-modal-fechar"
                  onClick={
                    fecharModalHorarios
                  }
                  aria-label="Fechar"
                >
                  ×
                </button>

              </div>


              <div className="agendamento-modal-conteudo">

                {
                  carregandoHorarios ? (

                    <div className="agendamento-modal-carregando">

                      <span className="agendamento-spinner" />

                      Buscando horários...

                    </div>

                  ) : horarios.length === 0 ? (

                    <div className="agendamento-sem-horarios">

                      <span>
                        📭
                      </span>

                      <p>
                        Não existem horários disponíveis
                        neste dia.
                      </p>

                    </div>

                  ) : (

                    <>

                      <p className="agendamento-modal-instrucao">
                        Selecione o horário desejado:
                      </p>


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
                                onClick={() =>
                                  selecionarHorario(
                                    horario
                                  )
                                }
                              >

                                <span className="agendamento-horario-inicio">
                                  {
                                    horario.horaInicio
                                  }
                                </span>


                                <span className="agendamento-horario-separador">
                                  até
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

                    </>

                  )
                }

              </div>

            </div>

          </div>

        )
      }


      {/* =====================================
          MODAL DE CONFIRMAÇÃO
      ====================================== */}

      {
        modalConfirmacaoAberto &&
        horarioSelecionado && (

          <div className="agendamento-modal-fundo">

            <div
              className="agendamento-modal confirmacao"
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-confirmacao"
            >


              <div className="agendamento-confirmacao-icone">
                ✓
              </div>


              <h2 id="titulo-confirmacao">
                Confirmar agendamento?
              </h2>


              <p className="agendamento-confirmacao-texto">
                Deseja realmente solicitar esta consulta?
              </p>


              <div className="agendamento-confirmacao-resumo">


                <div>

                  <span>
                    Data
                  </span>


                  <strong>
                    {
                      formatarData(
                        dataSelecionada
                      )
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    Horário
                  </span>


                  <strong>
                    {
                      horarioSelecionado
                        .horaInicio
                    }

                    {" - "}

                    {
                      horarioSelecionado
                        .horaFim
                    }
                  </strong>

                </div>


              </div>


              <div className="agendamento-confirmacao-acoes">

                <button
                  type="button"
                  className="agendamento-botao-cancelar"
                  onClick={
                    cancelarConfirmacao
                  }
                  disabled={
                    agendando
                  }
                >
                  Não
                </button>


                <button
                  type="button"
                  className="agendamento-botao-confirmar"
                  onClick={
                    confirmarAgendamento
                  }
                  disabled={
                    agendando
                  }
                >

                  {
                    agendando
                      ? "Enviando..."
                      : "Sim, solicitar"
                  }

                </button>

              </div>

            </div>

          </div>

        )
      }

    </div>

  );
}