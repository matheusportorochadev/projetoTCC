
/* ========================================
   PÁGINA ADMINISTRATIVA

   ÁREAS:
   - Gerenciamento de médicos
   - Logs e auditoria

   O administrador NÃO consulta
   conteúdo clínico dos prontuários.
======================================== */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import {
  fazerLogout,
  listarMedicos
} from "../services/api";

import {
  listarAuditoriaAdmin
} from "../services/auditoriaAdminApi";

import type {
  EventoAuditoria,
  FiltrosAuditoria
} from "../services/auditoriaAdminApi";

import "../styles/admin.css";

// ========================================
// TIPOS
// ========================================

type Medico = {
  id: number;
  crm: string;

  usuario: {
    id?: number;
    nome: string;
    email: string;
    ativo: boolean;
    primeiroAcesso: boolean;
  };
};

type AbaAdmin = "medicos" | "auditoria";

type FiltrosFormulario = {
  medicoId: string;
  acao: string;
  resultado: string;
  dataInicio: string;
  dataFim: string;
};

const FILTROS_INICIAIS: FiltrosFormulario = {
  medicoId: "",
  acao: "",
  resultado: "",
  dataInicio: "",
  dataFim: ""
};

// ========================================
// FORMATAR DATA DOS LOGS
// ========================================

function formatarData(valor: string): string {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "Data indisponível";
  }

  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium"
  });
}

// ========================================
// IDENTIFICAR EVENTOS
// ========================================

function traduzirAcao(acao: string): string {
  const nomes: Record<string, string> = {
    CRIAR: "Criação de prontuário",
    CONSULTAR: "Visualização de prontuário",
    CONSULTAR_HISTORICO: "Consulta ao histórico",
    LISTAR_HISTORICO: "Consulta ao histórico",
    EXPORTAR_PDF: "Exportação de PDF",
    ACESSO_NEGADO: "Acesso negado",
    ARQUIVAR: "Arquivamento",
    RESTAURAR: "Restauração"
  };

  return nomes[acao] ?? acao.replace(/_/g, " ");
}

// ========================================
// VALIDAR FILTROS ANTES DA API
// ========================================

function prepararFiltros(
  valores: FiltrosFormulario
): FiltrosAuditoria {

  if (
    valores.dataInicio &&
    valores.dataFim &&
    valores.dataInicio > valores.dataFim
  ) {
    throw new Error(
      "A data inicial não pode ser posterior à data final."
    );
  }

  const filtros: FiltrosAuditoria = {};

  if (valores.medicoId) {
    const id = Number(valores.medicoId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Selecione um médico válido.");
    }

    filtros.medicoId = id;
  }

  if (valores.acao) {
    filtros.acao = valores.acao;
  }

  if (
    valores.resultado === "SUCESSO" ||
    valores.resultado === "FALHA"
  ) {
    filtros.resultado = valores.resultado;
  }

  if (valores.dataInicio) {
    filtros.dataInicio = valores.dataInicio;
  }

  if (valores.dataFim) {
    filtros.dataFim = valores.dataFim;
  }

  return filtros;
}

// ========================================
// COMPONENTE ADMINISTRATIVO
// ========================================

export default function Admin() {

  const navigate = useNavigate();

  // ========================================
  // NAVEGAÇÃO INTERNA
  // ========================================

  const [abaAtiva, setAbaAtiva] =
    useState<AbaAdmin>("medicos");

  // ========================================
  // MÉDICOS
  // ========================================

  const [medicos, setMedicos] =
    useState<Medico[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");

  // ========================================
  // AUDITORIA
  // ========================================

  const [filtros, setFiltros] =
    useState<FiltrosFormulario>({
      ...FILTROS_INICIAIS
    });

  const [eventos, setEventos] =
    useState<EventoAuditoria[]>([]);

  const [carregandoLogs, setCarregandoLogs] =
    useState(false);

  const [erroLogs, setErroLogs] =
    useState("");

  const [consultouLogs, setConsultouLogs] =
    useState(false);

  // Distingue solicitações sucessivas,
  // evitando que um filtro antigo
  // sobrescreva os resultados atuais.
  const versaoConsulta = useRef(0);

  // ========================================
  // CARREGAR MÉDICOS
  // ========================================

  useEffect(() => {

    let ativo = true;

    async function carregarMedicos() {

      try {

        setErro("");
        setCarregando(true);

        const dados = await listarMedicos();

        if (!ativo) return;

        /*
          Preservamos os dois formatos
          aceitos pelo painel anterior:

          - Array direto
          - Objeto com propriedade medicos
        */
        if (Array.isArray(dados)) {
          setMedicos(dados);
        } else if (Array.isArray(dados?.medicos)) {
          setMedicos(dados.medicos);
        } else {
          setMedicos([]);
        }

      } catch (falha) {

        if (!ativo) return;

        setErro(
          falha instanceof Error
            ? falha.message
            : "Erro ao carregar médicos."
        );

      } finally {

        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarMedicos();

    return () => {
      ativo = false;
    };

  }, []);

  // ========================================
  // MÉDICOS ATIVOS
  // ========================================

  const medicosAtivos = medicos.filter(
    (medico) => medico.usuario.ativo
  ).length;

  // ========================================
  // PRIMEIRO ACESSO PENDENTE
  // ========================================

  const medicosAguardandoPrimeiroAcesso =
    medicos.filter(
      (medico) =>
        medico.usuario.primeiroAcesso
    ).length;

  // ========================================
  // MAPEAR ID DO MÉDICO PARA NOME
  // ========================================

  const nomesMedicos = useMemo(() => {

    const mapa = new Map<number, string>();

    for (const medico of medicos) {
      mapa.set(
        medico.id,
        medico.usuario.nome
      );
    }

    return mapa;

  }, [medicos]);

  // ========================================
  // AÇÕES DISPONÍVEIS NO FILTRO
  // ========================================

  const acoesDisponiveis = useMemo(() => {

    const acoes = new Set([
      "CRIAR",
      "CONSULTAR",
      "CONSULTAR_HISTORICO",
      "LISTAR_HISTORICO",
      "EXPORTAR_PDF",
      "ACESSO_NEGADO"
    ]);

    // Inclui também ações recebidas
    // do banco que não estejam na lista.
    for (const evento of eventos) {
      acoes.add(evento.acao);
    }

    return [...acoes].sort();

  }, [eventos]);

  // ========================================
  // EXECUTAR CONSULTA DE LOGS
  // ========================================

  const consultarLogs = useCallback(
    async (filtrosAtuais: FiltrosFormulario) => {

      // Toda consulta recebe uma versão própria.
      // Respostas de consultas antigas são ignoradas.
      const versaoAtual = ++versaoConsulta.current;

      setErroLogs("");
      setCarregandoLogs(true);

      try {
        const filtrosApi = prepararFiltros(filtrosAtuais);
        const resposta = await listarAuditoriaAdmin(filtrosApi);

        if (versaoAtual !== versaoConsulta.current) {
          return;
        }

        setEventos(resposta.registros);
        setConsultouLogs(true);
      } catch (falha) {
        if (versaoAtual !== versaoConsulta.current) {
          return;
        }

        setEventos([]);
        setConsultouLogs(false);
        setErroLogs(
          falha instanceof Error
            ? falha.message
            : "Erro ao carregar auditoria."
        );
      } finally {
        if (versaoAtual === versaoConsulta.current) {
          setCarregandoLogs(false);
        }
      }
    },
    []
  );

  // ========================================
  // ABRIR ABA AUDITORIA
  // ========================================

  function abrirAuditoria() {
    setAbaAtiva("auditoria");

    if (!consultouLogs && !carregandoLogs) {
      void consultarLogs(filtros);
    }
  }

  // ========================================
  // APLICAR FILTROS
  // ========================================

  function aplicarFiltros() {
    void consultarLogs(filtros);
  }

  // ========================================
  // LIMPAR FILTROS
  // ========================================

  function limparFiltros() {
    const valores = { ...FILTROS_INICIAIS };
    setFiltros(valores);
    void consultarLogs(valores);
  }

  // ========================================
  // ALTERAR UM FILTRO
  // ========================================

  function atualizarFiltro(
    campo: keyof FiltrosFormulario,
    valor: string
  ) {
    setFiltros((anterior) => ({
      ...anterior,
      [campo]: valor
    }));
  }

  // ========================================
  // LOGOUT
  // ========================================

  async function sair() {

    try {

      await fazerLogout();

    } catch (falha) {

      console.error(
        "Erro ao realizar logout:",
        falha
      );

    } finally {

      // Mantemos o comportamento anterior.
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");

      navigate("/login");
    }
  }

  // ========================================
  // ESTATÍSTICAS DOS LOGS RETORNADOS
  // ========================================

  const totalSucessos = eventos.filter(
    (evento) =>
      evento.resultado === "SUCESSO"
  ).length;

  const totalFalhas = eventos.filter(
    (evento) =>
      evento.resultado === "FALHA"
  ).length;

  // ========================================
  // EXPORTAR LOGS EXIBIDOS EM CSV
  // ========================================

  function exportarCsv() {

    if (eventos.length === 0) return;

    // Protege as células do CSV contra
    // interpretações como fórmulas.
    const escapar = (valor: unknown) => {
      const texto = String(valor ?? "");
      const seguro = /^[=+\-@\t\r]/.test(texto)
        ? `'${texto}`
        : texto;

      return `"${seguro.replace(/"/g, '""')}"`;
    };

    const colunas = [
      "ID",
      "Data",
      "Médico",
      "Médico ID",
      "Usuário ID",
      "Paciente ID",
      "Prontuário ID",
      "Ação",
      "Resultado"
    ];

    const linhas = eventos.map((evento) => [
      evento.id,
      formatarData(evento.createdAt),
      evento.medicoId
        ? nomesMedicos.get(evento.medicoId) ??
          "Médico não localizado"
        : "",
      evento.medicoId,
      evento.usuarioId,
      evento.pacienteId,
      evento.prontuarioId,
      evento.acao,
      evento.resultado
    ]);

    const conteudo = [
      colunas,
      ...linhas
    ].map((linha) =>
      linha.map(escapar).join(";")
    ).join("\r\n");

    const arquivo = new Blob(
      ["\uFEFF", conteudo],
      {
        type: "text/csv;charset=utf-8"
      }
    );

    const url = URL.createObjectURL(arquivo);

    const link = document.createElement("a");
    link.href = url;
    link.download = "auditoria-prontuarios.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  // ========================================
  // INTERFACE
  // ========================================

  return (
    <div className="admin-page">

      {/* ====================================
          CABEÇALHO ORIGINAL
      ==================================== */}

      <header className="admin-header">

        <div>
          <h1>Painel Administrativo</h1>

          <p>
            Gerenciamento do sistema médico
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void sair();
          }}
        >
          Sair
        </button>

      </header>

      <main className="admin-content">

        {/* ==================================
            ABAS DA ADMINISTRAÇÃO
        ================================== */}

        <nav
          className="admin-abas"
          aria-label="Áreas administrativas"
        >

          <button
            type="button"
            className={
              abaAtiva === "medicos"
                ? "admin-aba ativa"
                : "admin-aba"
            }
            aria-current={
              abaAtiva === "medicos"
                ? "page"
                : undefined
            }
            onClick={() => {
              setAbaAtiva("medicos");
            }}
          >
            Médicos
          </button>

          <button
            type="button"
            className={
              abaAtiva === "auditoria"
                ? "admin-aba ativa"
                : "admin-aba"
            }
            aria-current={
              abaAtiva === "auditoria"
                ? "page"
                : undefined
            }
            onClick={abrirAuditoria}
          >
            Logs e Auditoria
          </button>

        </nav>

        {/* ==================================
            ABA MÉDICOS
        ================================== */}

        {abaAtiva === "medicos" && (
          <>

            {/* CARDS ORIGINAIS */}

            <section className="admin-cards">

              <div className="admin-card">
                <span>Médicos cadastrados</span>

                <strong>
                  {medicos.length}
                </strong>
              </div>

              <div className="admin-card">
                <span>Médicos ativos</span>

                <strong>
                  {medicosAtivos}
                </strong>
              </div>

              <div className="admin-card">
                <span>
                  Aguardando primeiro acesso
                </span>

                <strong>
                  {medicosAguardandoPrimeiroAcesso}
                </strong>
              </div>

            </section>

            {/* LISTAGEM ORIGINAL */}

            <section className="admin-section">

              <div className="admin-section-header">

                <div>
                  <h2>Médicos</h2>

                  <p>
                    Profissionais cadastrados no sistema
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigate(
                      "/admin/medicos/cadastrar"
                    );
                  }}
                >
                  + Cadastrar médico
                </button>

              </div>

              {carregando && (
                <p>
                  Carregando médicos...
                </p>
              )}

              {erro && (
                <p
                  className="admin-error"
                  role="alert"
                >
                  {erro}
                </p>
              )}

              {!carregando &&
                !erro &&
                medicos.length === 0 && (
                  <p>
                    Nenhum médico cadastrado.
                  </p>
                )}

              <div className="medicos-lista">

                {medicos.map((medico) => (

                  <button
                    key={medico.id}
                    type="button"
                    className="medico-item"
                    onClick={() => {
                      navigate(
                        `/admin/medicos/${medico.id}`
                      );
                    }}
                  >

                    <div>
                      <strong>
                        {medico.usuario.nome}
                      </strong>

                      <span>
                        {medico.usuario.email}
                      </span>
                    </div>

                    <div>
                      <span>
                        {medico.crm}
                      </span>

                      <span
                        className={
                          medico.usuario.ativo
                            ? "status ativo"
                            : "status inativo"
                        }
                      >
                        {medico.usuario.ativo
                          ? "Ativo"
                          : "Bloqueado"}
                      </span>

                      {medico.usuario.primeiroAcesso && (
                        <span>
                          Primeiro acesso pendente
                        </span>
                      )}
                    </div>

                  </button>

                ))}

              </div>

            </section>

          </>
        )}

        {/* ==================================
            ABA LOGS E AUDITORIA
        ================================== */}

        {abaAtiva === "auditoria" && (
          <section className="admin-section">

            {/* CABEÇALHO */}

            <div className="admin-section-header">

              <div>
                <h2>Logs e Auditoria</h2>

                <p>
                  Atividades registradas no módulo
                  de prontuários
                </p>
              </div>

              <button
                type="button"
                disabled={carregandoLogs}
                onClick={aplicarFiltros}
              >
                Atualizar registros
              </button>

            </div>

            {/* FILTROS */}

            <div className="admin-auditoria-filtros">

              <div className="admin-auditoria-campo">
                <label htmlFor="auditoria-medico">
                  Médico
                </label>

                <select
                  id="auditoria-medico"
                  value={filtros.medicoId}
                  onChange={(evento) => {
                    atualizarFiltro(
                      "medicoId",
                      evento.target.value
                    );
                  }}
                >
                  <option value="">
                    Todos os médicos
                  </option>

                  {medicos.map((medico) => (
                    <option
                      key={medico.id}
                      value={medico.id}
                    >
                      {medico.usuario.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-auditoria-campo">
                <label htmlFor="auditoria-acao">
                  Ação
                </label>

                <select
                  id="auditoria-acao"
                  value={filtros.acao}
                  onChange={(evento) => {
                    atualizarFiltro(
                      "acao",
                      evento.target.value
                    );
                  }}
                >
                  <option value="">
                    Todas as ações
                  </option>

                  {acoesDisponiveis.map((acao) => (
                    <option
                      key={acao}
                      value={acao}
                    >
                      {traduzirAcao(acao)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-auditoria-campo">
                <label htmlFor="auditoria-resultado">
                  Resultado
                </label>

                <select
                  id="auditoria-resultado"
                  value={filtros.resultado}
                  onChange={(evento) => {
                    atualizarFiltro(
                      "resultado",
                      evento.target.value
                    );
                  }}
                >
                  <option value="">
                    Todos
                  </option>

                  <option value="SUCESSO">
                    Sucesso
                  </option>

                  <option value="FALHA">
                    Falha
                  </option>
                </select>
              </div>

              <div className="admin-auditoria-campo">
                <label htmlFor="auditoria-inicio">
                  Data inicial
                </label>

                <input
                  id="auditoria-inicio"
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(evento) => {
                    atualizarFiltro(
                      "dataInicio",
                      evento.target.value
                    );
                  }}
                />
              </div>

              <div className="admin-auditoria-campo">
                <label htmlFor="auditoria-fim">
                  Data final
                </label>

                <input
                  id="auditoria-fim"
                  type="date"
                  value={filtros.dataFim}
                  onChange={(evento) => {
                    atualizarFiltro(
                      "dataFim",
                      evento.target.value
                    );
                  }}
                />
              </div>

            </div>

            {/* BOTÕES DOS FILTROS */}

            <div className="admin-auditoria-acoes">

              <button
                type="button"
                className="admin-auditoria-btn-secundario"
                onClick={limparFiltros}
                disabled={carregandoLogs}
              >
                Limpar filtros
              </button>

              <button
                type="button"
                className="admin-auditoria-btn-primario"
                onClick={aplicarFiltros}
                disabled={carregandoLogs}
              >
                {carregandoLogs
                  ? "Consultando..."
                  : "Aplicar filtros"}
              </button>

            </div>

            {/* ERROS */}

            {erroLogs && (
              <p
                className="admin-error admin-auditoria-erro"
                role="alert"
              >
                {erroLogs}
              </p>
            )}

            {/* CARREGAMENTO */}

            {carregandoLogs && (
              <p role="status">
                Consultando atividades...
              </p>
            )}

            {/* INDICADORES */}

            {consultouLogs && (
              <div className="admin-auditoria-resumo">

                <div>
                  <span>Eventos exibidos</span>
                  <strong>{eventos.length}</strong>
                </div>

                <div>
                  <span>Sucessos</span>
                  <strong>{totalSucessos}</strong>
                </div>

                <div>
                  <span>Falhas</span>
                  <strong>{totalFalhas}</strong>
                </div>

              </div>
            )}

            {/* TÍTULO DA TABELA */}

            <div className="admin-auditoria-lista-topo">

              <div>
                <h3>Histórico de atividades</h3>

                <p>
                  Até 100 eventos por consulta.
                  Os indicadores consideram apenas
                  os registros retornados.
                </p>
              </div>

              <button
                type="button"
                className="admin-auditoria-exportar"
                onClick={exportarCsv}
                disabled={eventos.length === 0 || carregandoLogs || Boolean(erroLogs)}
              >
                Exportar CSV
              </button>

            </div>

            {/* TABELA */}

            {!carregandoLogs &&
              consultouLogs &&
              eventos.length === 0 &&
              !erroLogs && (
                <div className="admin-auditoria-vazio">
                  Nenhuma atividade encontrada
                  para os filtros selecionados.
                </div>
              )}

            {eventos.length > 0 && (
              <div className="admin-auditoria-tabela-wrapper">

                <table className="admin-auditoria-tabela">

                  <thead>
                    <tr>
                      <th>Data e hora</th>
                      <th>Médico</th>
                      <th>Ação</th>
                      <th>Prontuário</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>

                  <tbody>

                    {eventos.map((evento) => (
                      <tr key={evento.id}>

                        <td>
                          {formatarData(
                            evento.createdAt
                          )}
                        </td>

                        <td>
                          <strong>
                            {evento.medicoId !== null
                              ? nomesMedicos.get(
                                  evento.medicoId
                                ) ??
                                "Médico não localizado"
                              : "Não identificado"}
                          </strong>

                          {evento.medicoId !== null && (
                            <small>
                              Médico {evento.medicoId}
                            </small>
                          )}
                        </td>

                        <td>
                          {traduzirAcao(
                            evento.acao
                          )}
                        </td>

                        <td>
                          {evento.prontuarioId !== null
                            ? `Prontuário ${evento.prontuarioId}`
                            : "—"}
                        </td>

                        <td>
                          <span
                            className={
                              evento.resultado === "SUCESSO"
                                ? "admin-auditoria-status sucesso"
                                : "admin-auditoria-status falha"
                            }
                          >
                            {evento.resultado === "SUCESSO"
                              ? "Sucesso"
                              : evento.resultado === "FALHA"
                                ? "Falha"
                                : evento.resultado}
                          </span>
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>
            )}

            {/* AVISO DE PRIVACIDADE */}

            <p className="admin-auditoria-privacidade">
              Esta área apresenta somente metadados
              de auditoria. O conteúdo clínico dos
              prontuários não é disponibilizado
              ao administrador.
            </p>

          </section>
        )}

      </main>

    </div>
  );
}
