// ========================================
// MEUS AGENDAMENTOS
// ========================================

import {
  useEffect,
  useState
} from "react";

import "../../styles/meusAgendamentos.css";


// ========================================
// STATUS DO AGENDAMENTO
// ========================================

type StatusAgendamento =
  | "AGENDADA"
  | "PENDENTE"
  | "CONFIRMADA"
  | "REALIZADA"
  | "RECUSADA"
  | "CANCELADA"
  | "FALTOU";


// ========================================
// TIPO DO AGENDAMENTO
// ========================================

type Agendamento = {
  id: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: StatusAgendamento;
};


// ========================================
// COMPONENTE
// ========================================

export default function MeusAgendamentos() {

  // ========================================
  // ESTADOS
  // ========================================

  const [
    agendamentos,
    setAgendamentos
  ] = useState<Agendamento[]>([]);

  const [
    carregando,
    setCarregando
  ] = useState(true);

  const [
    erro,
    setErro
  ] = useState("");


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
  // TEXTO AUXILIAR DO STATUS
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
  // BUSCAR AGENDAMENTOS
  // ========================================

  async function buscarAgendamentos() {

    try {

      setCarregando(true);
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
  // CARREGAR AO ABRIR
  // ========================================

  useEffect(() => {

    void buscarAgendamentos();

  }, []);


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
            Consulte suas consultas e acompanhe
            a confirmação do médico.
          </p>

        </div>


        <div className="meus-agendamentos-resumo">

          <span>
            Agendamentos
          </span>

          <strong>
            {agendamentos.length}
          </strong>

        </div>

      </section>


      {/* ========================================
          CARREGANDO
      ======================================== */}

      {
        carregando && (

          <section className="meus-agendamentos-estado">

            <div className="meus-agendamentos-loading" />

            <h2>
              Carregando agendamentos...
            </h2>

            <p>
              Aguarde enquanto buscamos
              suas consultas.
            </p>

          </section>

        )
      }


      {/* ========================================
          ERRO
      ======================================== */}

      {
        !carregando &&
        erro !== "" && (

          <section className="meus-agendamentos-estado">

            <div className="meus-agendamentos-estado-icone meus-agendamentos-estado-erro">
              !
            </div>

            <h2>
              Não foi possível carregar
            </h2>

            <p>
              {erro}
            </p>

            <button
              type="button"
              className="meus-agendamentos-btn"
              onClick={() => {
                void buscarAgendamentos();
              }}
            >
              Tentar novamente
            </button>

          </section>

        )
      }


      {/* ========================================
          SEM AGENDAMENTOS
      ======================================== */}

      {
        !carregando &&
        erro === "" &&
        agendamentos.length === 0 && (

          <section className="meus-agendamentos-estado">

            <div className="meus-agendamentos-estado-icone">
              ◷
            </div>

            <h2>
              Nenhuma consulta agendada
            </h2>

            <p>
              Quando você solicitar uma consulta,
              ela aparecerá aqui.
            </p>

          </section>

        )
      }


      {/* ========================================
          LISTA
      ======================================== */}

      {
        !carregando &&
        erro === "" &&
        agendamentos.length > 0 && (

          <section className="meus-agendamentos-lista">

            {
              agendamentos.map(
                (
                  agendamento
                ) => (

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


                      <span
                        className={
                          `meus-agendamentos-status ${classeStatus(
                            agendamento.status
                          )}`
                        }
                      >
                        {
                          formatarStatus(
                            agendamento.status
                          )
                        }
                      </span>

                    </div>


                    {/* ========================================
                        HORÁRIO
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
                        DESCRIÇÃO DO STATUS
                    ======================================== */}

                    <div className="meus-agendamentos-descricao">

                      <span
                        className={
                          `meus-agendamentos-indicador ${classeStatus(
                            agendamento.status
                          )}`
                        }
                      />

                      <p>
                        {
                          descricaoStatus(
                            agendamento.status
                          )
                        }
                      </p>

                    </div>

                  </article>

                )
              )
            }

          </section>

        )
      }

    </main>

  );
}