import {
  useEffect,
  useMemo,
  useState
} from "react";

import "../../styles/agenda.css";

type Disponibilidade = {
  id: number;
  medicoId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  duracaoConsulta: number;
  ativo: boolean;
};

type AbaAgenda =
  | "disponibilidade"
  | "marcados";

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
  const hoje = new Date();

  const [
    abaAtiva,
    setAbaAtiva
  ] = useState<AbaAgenda>(
    "disponibilidade"
  );

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

  const [
    datasSelecionadas,
    setDatasSelecionadas
  ] = useState<string[]>([]);

  const [
    disponibilidades,
    setDisponibilidades
  ] = useState<Disponibilidade[]>(
    []
  );

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

  const [
    carregando,
    setCarregando
  ] = useState(true);

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
    disponibilidadeParaExcluir,
    setDisponibilidadeParaExcluir
  ] = useState<Disponibilidade | null>(
    null
  );

  const [
    excluindo,
    setExcluindo
  ] = useState(false);

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

  const token =
    localStorage.getItem(
      "token"
    );

  // ========================================
  // CARREGAR DISPONIBILIDADES
  // ========================================

  async function carregarDisponibilidades() {
    try {
      setCarregando(true);
      setErro("");

      const resposta =
        await fetch(
          "http://localhost:3000/agenda/disponibilidades",
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

      setDisponibilidades(
        dados
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar agenda."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDisponibilidades();
  }, []);

  // ========================================
  // FECHAR MODAIS COM ESC
  // ========================================

  useEffect(() => {
    function fecharComEsc(
      evento: KeyboardEvent
    ) {
      if (
        evento.key === "Escape"
      ) {
        setDataModal(null);
        setDisponibilidadeParaExcluir(
          null
        );
      }
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
  // FORMATAR DATA
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
      String(dia).padStart(
        2,
        "0"
      );

    return `${anoAtual}-${mes}-${diaFormatado}`;
  }

  function formatarData(
    data: string
  ) {
    const [
      ano,
      mes,
      dia
    ] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  // ========================================
  // SELEÇÃO DOS DIAS
  // ========================================

  function selecionarDia(
    dia: number
  ) {
    const data =
      montarData(dia);

    setDatasSelecionadas(
      (anteriores) => {
        if (
          anteriores.includes(
            data
          )
        ) {
          return anteriores.filter(
            (item) =>
              item !== data
          );
        }

        return [
          ...anteriores,
          data
        ];
      }
    );

    setErro("");
    setMensagem("");
  }

  function dataSelecionada(
    dia: number
  ) {
    return datasSelecionadas.includes(
      montarData(dia)
    );
  }

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
  // MODAL DO DIA
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
          (a, b) =>
            a.horaInicio.localeCompare(
              b.horaInicio
            )
        );

    setDataModal(data);
    setHorariosModal(
      horarios
    );
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
        mesAtual +
          quantidade,
        1
      );

    setMesAtual(
      novaData.getMonth()
    );

    setAnoAtual(
      novaData.getFullYear()
    );

    setDatasSelecionadas(
      []
    );

    setDataModal(null);
  }

  // ========================================
  // SALVAR DISPONIBILIDADES
  // ========================================

  async function salvarDisponibilidades(
    evento: React.FormEvent
  ) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    if (
      datasSelecionadas.length ===
      0
    ) {
      setErro(
        "Selecione pelo menos uma data."
      );

      return;
    }

    if (
      horaInicio >= horaFim
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

    try {
      setSalvando(true);

      const resposta =
        await fetch(
          "http://localhost:3000/agenda/disponibilidades",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`
            },
            body: JSON.stringify({
              datas:
                datasSelecionadas,
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
        `${datasSelecionadas.length} dia(s) configurado(s) com sucesso.`
      );

      setDatasSelecionadas(
        []
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
  // EXCLUSÃO
  // ========================================

  function abrirModalExcluir(
    disponibilidade: Disponibilidade
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

    try {
      setExcluindo(true);
      setErro("");
      setMensagem("");

      const resposta =
        await fetch(
          `http://localhost:3000/agenda/disponibilidades/${disponibilidadeParaExcluir.id}`,
          {
            method:
              "DELETE",
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

  return (
    <>
      <main className="agenda-page">
        {/* ========================================
            CABEÇALHO
        ======================================== */}

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
              Períodos disponíveis
            </span>

            <strong>
              {
                disponibilidades.length
              }
            </strong>
          </div>
        </section>

        {/* ========================================
            ABAS
        ======================================== */}

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

        {abaAtiva ===
          "disponibilidade" && (
          <div className="agenda-mensal-layout">
            {/* ========================================
                CALENDÁRIO
            ======================================== */}

            <section className="agenda-calendario-card">
              <div className="agenda-calendario-header">
                <button
                  type="button"
                  aria-label="Mês anterior"
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
                  aria-label="Próximo mês"
                  onClick={() =>
                    alterarMes(1)
                  }
                >
                  ›
                </button>
              </div>

              <div className="agenda-calendario-semana">
                {diasSemana.map(
                  (dia) => (
                    <span
                      key={dia}
                    >
                      {dia}
                    </span>
                  )
                )}
              </div>

              <div className="agenda-calendario-grid">
                {diasCalendario.map(
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

                    const selecionado =
                      dataSelecionada(
                        dia
                      );

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
                          selecionado
                            ? "agenda-dia-selecionado"
                            : "",
                          disponivel
                            ? "agenda-dia-disponivel"
                            : ""
                        ]
                          .filter(
                            Boolean
                          )
                          .join(" ")}
                        onClick={() =>
                          abrirModalDia(
                            dia
                          )
                        }
                      >
                        <span className="agenda-dia-numero">
                          {dia}
                        </span>

                        {disponivel && (
                          <small>
                            Disponível
                          </small>
                        )}

                        <span
                          className={
                            selecionado
                              ? "agenda-dia-selecionar agenda-dia-selecionar-ativo"
                              : "agenda-dia-selecionar"
                          }
                          title={
                            selecionado
                              ? "Remover seleção"
                              : "Selecionar para configurar"
                          }
                          onClick={(
                            evento
                          ) => {
                            evento.stopPropagation();

                            selecionarDia(
                              dia
                            );
                          }}
                        >
                          {selecionado
                            ? "✓"
                            : "+"}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="agenda-legenda">
                <span>
                  <i className="legenda-selecionado" />
                  Selecionado
                </span>

                <span>
                  <i className="legenda-disponivel" />
                  Com disponibilidade
                </span>
              </div>
            </section>

            {/* ========================================
                CONFIGURAR HORÁRIOS
            ======================================== */}

            <aside className="agenda-config-card">
              <div className="agenda-config-titulo">
                <span className="agenda-icon">
                  +
                </span>

                <div>
                  <h2>
                    Configurar horários
                  </h2>

                  <p>
                    Selecione um ou mais
                    dias usando o botão +
                    do calendário.
                  </p>
                </div>
              </div>

              <form
                onSubmit={
                  salvarDisponibilidades
                }
              >
                <div className="agenda-selecao-info">
                  <span>
                    Dias selecionados
                  </span>

                  <strong>
                    {
                      datasSelecionadas.length
                    }
                  </strong>
                </div>

                {datasSelecionadas.length >
                  0 && (
                  <div className="agenda-datas-selecionadas">
                    {[
                      ...datasSelecionadas
                    ]
                      .sort()
                      .map(
                        (data) => (
                          <span
                            key={
                              data
                            }
                          >
                            {
                              formatarData(
                                data
                              )
                            }
                          </span>
                        )
                      )}
                  </div>
                )}

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
                          evento
                            .target
                            .value
                        )
                      }
                      required
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
                          evento
                            .target
                            .value
                        )
                      }
                      required
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
                          evento
                            .target
                            .value
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

                {erro && (
                  <div className="agenda-alert agenda-alert-error">
                    {erro}
                  </div>
                )}

                {mensagem && (
                  <div className="agenda-alert agenda-alert-success">
                    {mensagem}
                  </div>
                )}

                <button
                  type="submit"
                  className="agenda-btn agenda-btn-primary agenda-btn-full"
                  disabled={
                    salvando
                  }
                >
                  {salvando
                    ? "Salvando..."
                    : "Salvar disponibilidade"}
                </button>
              </form>
            </aside>
          </div>
        )}

        {/* ========================================
            HORÁRIOS MARCADOS
        ======================================== */}

        {abaAtiva ===
          "marcados" && (
          <section className="agenda-marcados-card">
            <div className="agenda-marcados-header">
              <h2>
                Horários marcados
              </h2>

              <p>
                As consultas agendadas
                pelos pacientes aparecerão
                aqui.
              </p>
            </div>

            <div className="agenda-empty">
              <div className="agenda-empty-icon">
                ◷
              </div>

              <h3>
                Nenhuma consulta marcada
              </h3>

              <p>
                Quando um paciente fizer
                um agendamento, a consulta
                será exibida nesta aba.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* ========================================
          MODAL DO DIA
      ======================================== */}

      {dataModal && (
        <div
          className="agenda-modal-overlay"
          onMouseDown={(
            evento
          ) => {
            if (
              evento.target ===
              evento.currentTarget
            ) {
              setDataModal(null);
            }
          }}
        >
          <div className="agenda-modal agenda-modal-dia">
            <button
              type="button"
              className="agenda-modal-close"
              aria-label="Fechar"
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
                Veja os períodos de
                atendimento configurados
                para esta data.
              </p>
            </div>

            {carregando ? (
              <div className="agenda-modal-dia-vazio">
                <div className="agenda-loading" />

                <p>
                  Carregando horários...
                </p>
              </div>
            ) : horariosModal.length ===
              0 ? (
              <div className="agenda-modal-dia-vazio">
                <div className="agenda-empty-calendar">
                  ◷
                </div>

                <h3>
                  Nenhum horário disponível
                </h3>

                <p>
                  Ainda não foi
                  configurado nenhum
                  período para esta data.
                </p>
              </div>
            ) : (
              <div className="agenda-modal-horarios">
                {horariosModal.map(
                  (item) => (
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
                          Consultas de{" "}
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
                )}
              </div>
            )}

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
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL DE EXCLUSÃO
      ======================================== */}

      {disponibilidadeParaExcluir && (
        <div
          className="agenda-modal-overlay"
          onMouseDown={(
            evento
          ) => {
            if (
              evento.target ===
              evento.currentTarget
            ) {
              setDisponibilidadeParaExcluir(
                null
              );
            }
          }}
        >
          <div className="agenda-modal">
            <button
              type="button"
              className="agenda-modal-close"
              aria-label="Fechar"
              onClick={() =>
                setDisponibilidadeParaExcluir(
                  null
                )
              }
            >
              ×
            </button>

            <div className="agenda-modal-icon">
              !
            </div>

            <h2>
              Remover disponibilidade?
            </h2>

            <p>
              Este período deixará de
              estar disponível para novos
              agendamentos.
            </p>

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

              <small>
                {
                  disponibilidadeParaExcluir.duracaoConsulta
                }{" "}
                minutos por consulta
              </small>
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
                onClick={
                  confirmarExclusao
                }
                disabled={
                  excluindo
                }
              >
                {excluindo
                  ? "Removendo..."
                  : "Sim, remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Agenda;