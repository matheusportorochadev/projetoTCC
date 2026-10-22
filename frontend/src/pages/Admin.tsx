
/* ========================================
   PÁGINA ADMINISTRATIVA

   ÁREAS:
   - Gerenciamento de médicos
   - Logs e auditoria

   MÓDULOS DE AUDITORIA:
   - Prontuários
   - Agenda
   - Pacientes

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
  FiltrosAuditoria,
  ModuloAuditoria
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

type EventoExibicao = EventoAuditoria & {
  medicoId: number | null;
};

type FiltrosFormulario = {
  medicoId: string;
  acao: string;
  resultado: string;
  dataInicio: string;
  dataFim: string;
};


// ========================================
// FILTROS INICIAIS
// ========================================

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
// TRADUZIR AÇÕES DA AUDITORIA
// ========================================

function traduzirAcao(acao: string): string {

  const nomes: Record<string, string> = {

    // ========================================
    // PRONTUÁRIOS
    // ========================================

    CRIAR:
      "Criação de prontuário",

    CONSULTAR:
      "Visualização de prontuário",

    CONSULTAR_HISTORICO:
      "Consulta ao histórico",

    LISTAR_HISTORICO:
      "Consulta ao histórico",

    EXPORTAR_PDF:
      "Exportação de PDF",

    ACESSO_NEGADO:
      "Acesso negado",

    ARQUIVAR:
      "Arquivamento",

    RESTAURAR:
      "Restauração",


    // ========================================
    // AGENDA — DISPONIBILIDADES
    // ========================================

    CRIAR_DISPONIBILIDADE:
      "Criação de disponibilidade",

    ALTERAR_DISPONIBILIDADE:
      "Alteração de disponibilidade",

    REMOVER_DISPONIBILIDADE:
      "Remoção de disponibilidade",


    // ========================================
    // AGENDA — AGENDAMENTOS
    // ========================================

    SOLICITAR_AGENDAMENTO:
      "Solicitação de consulta pelo paciente",

    CRIAR_AGENDAMENTO_MEDICO:
      "Consulta criada pelo médico",

    CONFIRMAR_AGENDAMENTO:
      "Confirmação de consulta",

    RECUSAR_AGENDAMENTO:
      "Recusa de consulta",

    CANCELAR_AGENDAMENTO:
      "Cancelamento pelo médico",

    CANCELAR_AGENDAMENTO_PACIENTE:
      "Cancelamento pelo paciente",


    // ========================================
    // AGENDA — REMARCAÇÕES
    // ========================================

    SOLICITAR_REMARCACAO:
      "Solicitação de remarcação",

    ACEITAR_REMARCACAO:
      "Remarcação aceita pelo médico",

    RECUSAR_REMARCACAO:
      "Remarcação recusada pelo médico",

    REMARCAR_AGENDAMENTO:
      "Remarcação direta pelo médico",


    // ========================================
    // AGENDA — EXCLUSÃO
    // ========================================

    EXCLUIR_AGENDAMENTO:
      "Exclusão definitiva de consulta",


    // ========================================
    // PACIENTES
    // ========================================

    CADASTRAR_PACIENTE:
      "Cadastro de paciente",

    SENHA_REDEFINIDA:
      "Senha de login redefinida",

    SENHA_CRIADA_PRIMEIRO_ACESSO:
      "Senha criada no primeiro acesso",

    SENHA_PRONTUARIO_REDEFINIDA:
      "Senha dos prontuários redefinida",

    SENHA_PRONTUARIO_CRIADA:
      "Senha dos prontuários criada",

    LOGIN_SUCESSO:
      "Login realizado",

    LOGIN_FALHA:
      "Tentativa de login inválida",

    LOGIN_BLOQUEADO:
      "Login bloqueado",

    LOGOUT:
      "Saída do sistema"
  };

  return nomes[acao] ?? acao.replace(/_/g, " ");
}


// ========================================
// VALIDAR FILTROS ANTES DA API
// ========================================

function prepararFiltros(
  valores: FiltrosFormulario
): FiltrosAuditoria {

  // Impede intervalo invertido.
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


  // ========================================
  // MÉDICO
  // ========================================

  if (valores.medicoId) {

    const id = Number(valores.medicoId);

    if (
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      throw new Error(
        "Selecione um médico válido."
      );
    }

    filtros.medicoId = id;
  }


  // ========================================
  // AÇÃO
  // ========================================

  if (valores.acao) {
    filtros.acao = valores.acao;
  }


  // ========================================
  // RESULTADO
  // ========================================

  if (
    valores.resultado === "SUCESSO" ||
    valores.resultado === "FALHA"
  ) {
    filtros.resultado = valores.resultado;
  }


  // ========================================
  // PERÍODO
  // ========================================

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

  // Permite selecionar:
  //
  // - prontuarios
  // - agenda
  // - pacientes

  const [moduloAuditoria, setModuloAuditoria] =
    useState<ModuloAuditoria>("prontuarios");

  const [filtros, setFiltros] =
    useState<FiltrosFormulario>({
      ...FILTROS_INICIAIS
    });

  const [eventos, setEventos] =
    useState<EventoExibicao[]>([]);

  // ========================================
  // PAGINAÇÃO DA AUDITORIA
  // ========================================
  // Guarda somente os metadados da consulta.
  // Os eventos continuam no estado "eventos".

  const [paginacaoAuditoria, setPaginacaoAuditoria] =
    useState<{
      pagina: number;
      tamanhoPagina: number;
      totalPaginas: number;
      total: number;
      sucessos: number;
      falhas: number;
    } | null>(null);

  const [carregandoLogs, setCarregandoLogs] =
    useState(false);

  const [erroLogs, setErroLogs] =
    useState("");

  const [consultouLogs, setConsultouLogs] =
    useState(false);


  // Impede que respostas antigas
  // sobrescrevam os resultados atuais.

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

        // Preserva os formatos aceitos:
        //
        // - Array direto
        // - Objeto com propriedade medicos

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
  // ESTATÍSTICAS DOS MÉDICOS
  // ========================================

  const medicosAtivos = medicos.filter(
    (medico) => medico.usuario.ativo
  ).length;

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

    let acoesIniciais: string[];

    // Cada módulo possui suas
    // próprias opções de ação.

    if (moduloAuditoria === "agenda") {

      // ========================================
      // AÇÕES DA AGENDA
      // ========================================

      // Inclui os eventos de disponibilidade
      // e as 11 operações de agendamentos
      // auditadas no backend.

      acoesIniciais = [

        // Disponibilidades
        "CRIAR_DISPONIBILIDADE",
        "ALTERAR_DISPONIBILIDADE",
        "REMOVER_DISPONIBILIDADE",

        // Agendamentos
        "SOLICITAR_AGENDAMENTO",
        "CRIAR_AGENDAMENTO_MEDICO",
        "CONFIRMAR_AGENDAMENTO",
        "RECUSAR_AGENDAMENTO",
        "CANCELAR_AGENDAMENTO",
        "CANCELAR_AGENDAMENTO_PACIENTE",

        // Remarcações
        "SOLICITAR_REMARCACAO",
        "ACEITAR_REMARCACAO",
        "RECUSAR_REMARCACAO",
        "REMARCAR_AGENDAMENTO",

        // Exclusão
        "EXCLUIR_AGENDAMENTO"
      ];

    } else if (moduloAuditoria === "login") {

      acoesIniciais = [
        "LOGIN_SUCESSO",
        "LOGIN_FALHA",
        "LOGIN_BLOQUEADO",
        "LOGOUT",
        "SENHA_REDEFINIDA",
        "SENHA_CRIADA_PRIMEIRO_ACESSO",
        "SENHA_PRONTUARIO_REDEFINIDA",
        "SENHA_PRONTUARIO_CRIADA"
      ];

    } else if (moduloAuditoria === "pacientes") {

      // ========================================
      // AÇÕES DE PACIENTES
      // ========================================

      acoesIniciais = [
        "CADASTRAR_PACIENTE"
      ];

    } else {

      // ========================================
      // AÇÕES DOS PRONTUÁRIOS
      // ========================================

      acoesIniciais = [
        "CRIAR",
        "CONSULTAR",
        "CONSULTAR_HISTORICO",
        "LISTAR_HISTORICO",
        "EXPORTAR_PDF",
        "ACESSO_NEGADO"
      ];
    }

    const acoes = new Set(
      acoesIniciais
    );

    // Também inclui novas ações
    // recebidas do banco.

    for (const evento of eventos) {
      acoes.add(evento.acao);
    }

    return [...acoes].sort();

  }, [eventos, moduloAuditoria]);


  // ========================================
  // EXECUTAR CONSULTA DE LOGS
  // ========================================

  const consultarLogs = useCallback(
    async (
      filtrosAtuais: FiltrosFormulario,
      moduloAtual: ModuloAuditoria,
      paginaSolicitada: number = 1
    ) => {

      // Cada consulta recebe uma versão.
      // Resultados antigos são ignorados.

      const versaoAtual =
        ++versaoConsulta.current;

      setErroLogs("");
      setCarregandoLogs(true);

      try {

        const filtrosApi =
          prepararFiltros(filtrosAtuais);

        // Solicita somente a página desejada.
        filtrosApi.pagina = paginaSolicitada;

        const resposta =
          await listarAuditoriaAdmin(
            filtrosApi,
            moduloAtual
          );

        if (
          versaoAtual !== versaoConsulta.current
        ) {
          return;
        }

        setEventos(
          resposta.registros.map((evento) => ({
            ...evento,
            medicoId:
              "medicoId" in evento
                ? evento.medicoId
                : null
          }))
        );
        // Atualiza os contadores e a navegação
        // quando o backend fornece paginação.
        if (
          typeof resposta.total === "number" &&
          typeof resposta.sucessos === "number" &&
          typeof resposta.falhas === "number" &&
          typeof resposta.pagina === "number" &&
          typeof resposta.tamanhoPagina === "number" &&
          typeof resposta.totalPaginas === "number"
        ) {
          setPaginacaoAuditoria({
            pagina: resposta.pagina,
            tamanhoPagina: resposta.tamanhoPagina,
            totalPaginas: resposta.totalPaginas,
            total: resposta.total,
            sucessos: resposta.sucessos,
            falhas: resposta.falhas
          });
        } else {
          // Compatibilidade com módulos ainda
          // não atualizados para paginação.
          setPaginacaoAuditoria(null);
        }

        setConsultouLogs(true);

      } catch (falha) {

        if (
          versaoAtual !== versaoConsulta.current
        ) {
          return;
        }

        setEventos([]);
        setPaginacaoAuditoria(null);
        setConsultouLogs(false);

        setErroLogs(
          falha instanceof Error
            ? falha.message
            : "Erro ao carregar auditoria."
        );

      } finally {

        if (
          versaoAtual === versaoConsulta.current
        ) {
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

    if (
      !consultouLogs &&
      !carregandoLogs
    ) {
      void consultarLogs(
        filtros,
        moduloAuditoria
      );
    }
  }


  // ========================================
  // TROCAR MÓDULO DE AUDITORIA
  // ========================================

  function selecionarModulo(
    modulo: ModuloAuditoria
  ) {

    if (modulo === moduloAuditoria) {
      return;
    }

    // Impede que um filtro de ação
    // seja aplicado ao módulo errado.

    const novosFiltros = {
      ...filtros,
      acao: ""
    };

    setModuloAuditoria(modulo);
    setFiltros(novosFiltros);
    setEventos([]);
    setConsultouLogs(false);

    void consultarLogs(
      novosFiltros,
      modulo
    );
  }


  // ========================================
  // APLICAR FILTROS
  // ========================================

  function aplicarFiltros() {
    void consultarLogs(
      filtros,
      moduloAuditoria
    );
  }


  // ========================================
  // LIMPAR FILTROS
  // ========================================

  function limparFiltros() {

    const valores = {
      ...FILTROS_INICIAIS
    };

    setFiltros(valores);

    void consultarLogs(
      valores,
      moduloAuditoria
    );
  }


  // ========================================
  // ALTERAR UM FILTRO
  // ========================================

  function atualizarFiltro(
    campo: keyof FiltrosFormulario,
    valor: string
  ) {

    setFiltros(
      (anterior) => ({
        ...anterior,
        [campo]: valor
      })
    );
  }


  // ========================================
  // LOGOUT
  // ========================================

  const [erroLogout, setErroLogout] = useState("");

  async function sair() {
    setErroLogout("");
    try {
      await fazerLogout();
    } catch {
      // Só anuncia a saída quando a revogação foi confirmada pelo backend.
      setErroLogout("Não foi possível encerrar a sessão com segurança. Tente novamente.");
      return;
    }
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  }


  // ========================================
  // ESTATÍSTICAS DOS LOGS
  // ========================================

  // Utiliza totais do PostgreSQL quando
  // disponíveis. Nos módulos ainda não
  // paginados, preserva o cálculo anterior.

  const totalSucessos =
    paginacaoAuditoria?.sucessos ??
    eventos.filter(
      (evento) => evento.resultado === "SUCESSO"
    ).length;

  const totalFalhas =
    paginacaoAuditoria?.falhas ??
    eventos.filter(
      (evento) => evento.resultado === "FALHA"
    ).length;


  // ========================================
  // EXPORTAR LOGS EM CSV
  // ========================================

  function exportarCsv() {

    if (eventos.length === 0) {
      return;
    }

    // Evita interpretação como fórmula
    // em programas de planilhas.

    const escapar = (valor: unknown) => {

      const texto = String(valor ?? "");

      const seguro =
        /^[=+\-@\t\r]/.test(texto)
          ? `'${texto}`
          : texto;

      return `"${seguro.replace(/"/g, '""')}"`;
    };


    // ========================================
    // COLUNAS DO CSV
    // ========================================

    let colunas: string[];

    if (moduloAuditoria === "agenda") {

      colunas = [
        "ID",
        "Data do evento",
        "Médico",
        "Médico ID",
        "Usuário ID",
        "Disponibilidade ID",
        "Agendamento ID",
        "Data da agenda",
        "Início",
        "Fim",
        "Ação",
        "Resultado"
      ];

    } else if (moduloAuditoria === "pacientes") {

      // CSV DE PACIENTES

      colunas = [
        "ID",
        "Data do evento",
        "Médico",
        "Médico ID",
        "Usuário ID",
        "Paciente ID",
        "Ação",
        "Resultado"
      ];

    } else {

      colunas = [
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
    }


    // ========================================
    // DADOS DOS EVENTOS
    // ========================================

    const linhas = eventos.map((evento) => {

      const medicoNome =
        evento.medicoId !== null
          ? nomesMedicos.get(evento.medicoId) ??
            "Médico não localizado"
          : "";

      const informacoesBasicas = [
        evento.id,
        formatarData(evento.createdAt),
        medicoNome,
        evento.medicoId,
        evento.usuarioId
      ];


      // ========================================
      // CSV DA AGENDA
      // ========================================

      if (moduloAuditoria === "login") {

        return [
          evento.id,
          formatarData(evento.createdAt),
          evento.usuarioId,
          "perfil" in evento ? evento.perfil : null,
          evento.acao,
          evento.resultado,
          "ip" in evento ? evento.ip : null
        ];
      }

      if (moduloAuditoria === "agenda") {

        return [
          ...informacoesBasicas,

          "disponibilidadeId" in evento
            ? evento.disponibilidadeId
            : null,

          "agendamentoId" in evento
            ? evento.agendamentoId
            : null,

          "dataAgenda" in evento
            ? evento.dataAgenda
            : null,

          "horaInicio" in evento
            ? evento.horaInicio
            : null,

          "horaFim" in evento
            ? evento.horaFim
            : null,

          evento.acao,
          evento.resultado
        ];
      }


      // ========================================
      // CSV DE PACIENTES
      // ========================================

      if (moduloAuditoria === "pacientes") {

        return [
          ...informacoesBasicas,

          "pacienteId" in evento
            ? evento.pacienteId
            : null,

          evento.acao,
          evento.resultado
        ];
      }


      // ========================================
      // CSV DE PRONTUÁRIOS
      // ========================================

      return [
        ...informacoesBasicas,

        "pacienteId" in evento
          ? evento.pacienteId
          : null,

        "prontuarioId" in evento
          ? evento.prontuarioId
          : null,

        evento.acao,
        evento.resultado
      ];
    });


    // ========================================
    // GERAR ARQUIVO CSV
    // ========================================

    const conteudo = [
      moduloAuditoria === "login"
        ? [
            "Evento",
            "Data e hora",
            "Usuário ID",
            "Perfil",
            "Ação",
            "Resultado",
            "IP"
          ]
        : colunas,
      ...linhas
    ]
      .map(
        (linha) =>
          linha.map(escapar).join(";")
      )
      .join("\r\n");

    const arquivo = new Blob(
      ["\uFEFF", conteudo],
      {
        type: "text/csv;charset=utf-8"
      }
    );

    const url =
      URL.createObjectURL(arquivo);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `auditoria-${moduloAuditoria}.csv`;

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
      {erroLogout && <p role="alert">{erroLogout}</p>}

      {/* ====================================
          CABEÇALHO
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

            {/* INDICADORES DOS MÉDICOS */}

            <section className="admin-cards">

              <div className="admin-card">
                <span>
                  Médicos cadastrados
                </span>

                <strong>
                  {medicos.length}
                </strong>
              </div>

              <div className="admin-card">
                <span>
                  Médicos ativos
                </span>

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


            {/* LISTAGEM DOS MÉDICOS */}

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


              {/* CARREGAMENTO */}

              {carregando && (
                <p>
                  Carregando médicos...
                </p>
              )}


              {/* ERROS */}

              {erro && (
                <p
                  className="admin-error"
                  role="alert"
                >
                  {erro}
                </p>
              )}


              {/* NENHUM MÉDICO */}

              {!carregando &&
                !erro &&
                medicos.length === 0 && (
                  <p>
                    Nenhum médico cadastrado.
                  </p>
                )}


              {/* LISTA */}

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

                <h2>
                  Logs e Auditoria
                </h2>

                <p>
                  Consulte eventos dos prontuários,
                  da agenda médica e dos cadastros
                  de pacientes.
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


            {/* ==================================
                SUBABAS DE AUDITORIA
            ================================== */}

            <div
              className="admin-auditoria-modulos"
              role="group"
              aria-label="Módulo de auditoria"
            >

              {/* PRONTUÁRIOS */}

              <button
                type="button"
                className={
                  moduloAuditoria === "prontuarios"
                    ? "admin-auditoria-modulo ativo"
                    : "admin-auditoria-modulo"
                }
                aria-pressed={
                  moduloAuditoria === "prontuarios"
                }
                onClick={() => {
                  selecionarModulo("prontuarios");
                }}
              >
                Prontuários
              </button>


              {/* AGENDA */}

              <button
                type="button"
                className={
                  moduloAuditoria === "agenda"
                    ? "admin-auditoria-modulo ativo"
                    : "admin-auditoria-modulo"
                }
                aria-pressed={
                  moduloAuditoria === "agenda"
                }
                onClick={() => {
                  selecionarModulo("agenda");
                }}
              >
                Agenda
              </button>


              {/* PACIENTES */}

              <button
                type="button"
                className={
                  moduloAuditoria === "pacientes"
                    ? "admin-auditoria-modulo ativo"
                    : "admin-auditoria-modulo"
                }
                aria-pressed={
                  moduloAuditoria === "pacientes"
                }
                onClick={() => {
                  selecionarModulo("pacientes");
                }}
              >
                Pacientes
              </button>

              {/* LOGIN E SEGURANÇA */}

              <button
                type="button"
                className={
                  moduloAuditoria === "login"
                    ? "admin-auditoria-modulo ativo"
                    : "admin-auditoria-modulo"
                }
                aria-pressed={moduloAuditoria === "login"}
                onClick={() => {
                  selecionarModulo("login");
                }}
              >
                Login e Segurança
              </button>

            </div>


            {/* ==================================
                FILTROS
            ================================== */}

            <div className="admin-auditoria-filtros">

              {/* MÉDICO */}

              {moduloAuditoria !== "login" && (
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
              )}


              {/* AÇÃO */}

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


              {/* RESULTADO */}

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


              {/* DATA INICIAL */}

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


              {/* DATA FINAL */}

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


            {/* ==================================
                BOTÕES DOS FILTROS
            ================================== */}

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


            {/* ==================================
                ERROS
            ================================== */}

            {erroLogs && (
              <p
                className="admin-error admin-auditoria-erro"
                role="alert"
              >
                {erroLogs}
              </p>
            )}


            {/* ==================================
                CARREGAMENTO
            ================================== */}

            {carregandoLogs && (
              <p role="status">
                Consultando atividades...
              </p>
            )}


            {/* ==================================
                INDICADORES
            ================================== */}

            {consultouLogs && (
              <div className="admin-auditoria-resumo">

                {paginacaoAuditoria !== null && (
                  <div>
                    <span>Total de eventos</span>
                    <strong>
                      {paginacaoAuditoria.total}
                    </strong>
                  </div>
                )}

                <div>
                  <span>
                    Eventos exibidos
                  </span>

                  <strong>
                    {eventos.length}
                  </strong>
                </div>

                <div>
                  <span>
                    Sucessos
                  </span>

                  <strong>
                    {totalSucessos}
                  </strong>
                </div>

                <div>
                  <span>
                    Falhas
                  </span>

                  <strong>
                    {totalFalhas}
                  </strong>
                </div>

              </div>
            )}


            {/* ==================================
                TÍTULO DA TABELA
            ================================== */}

            <div className="admin-auditoria-lista-topo">

              <div>

                <h3>
                  Histórico de atividades
                </h3>

                <p>
                  {paginacaoAuditoria
                    ? "Até 50 eventos por página. Os indicadores consideram todos os registros encontrados pelos filtros."
                    : "Indicadores referentes aos registros carregados."}
                </p>

              </div>

              <button
                type="button"
                className="admin-auditoria-exportar"
                onClick={exportarCsv}
                disabled={
                  eventos.length === 0 ||
                  carregandoLogs ||
                  Boolean(erroLogs)
                }
              >
                Exportar CSV
              </button>

            </div>


            {/* ==================================
                ESTADO VAZIO
            ================================== */}

            {!carregandoLogs &&
              consultouLogs &&
              eventos.length === 0 &&
              !erroLogs && (

                <div className="admin-auditoria-vazio">
                  Nenhuma atividade encontrada
                  para os filtros selecionados.
                </div>

              )}


            {/* ==================================
                TABELA DE AUDITORIA
            ================================== */}

            {!carregandoLogs &&
              eventos.length > 0 && (

                <div className="admin-auditoria-tabela-wrapper">

                  <table className="admin-auditoria-tabela">

                    <thead>

                      <tr>

                        <th>
                          Data e hora
                        </th>

                        <th>
                          {moduloAuditoria === "login"
                            ? "Usuário / Perfil"
                            : "Médico"}
                        </th>

                        <th>
                          Ação
                        </th>

                        <th>
                          {moduloAuditoria === "login"
                            ? "IP de origem"
                            : moduloAuditoria === "agenda"
                            ? "Registro da agenda"
                            : moduloAuditoria === "pacientes"
                              ? "Paciente"
                              : "Prontuário"}
                        </th>

                        <th>
                          Resultado
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {eventos.map((evento) => (

                        <tr key={evento.id}>

                          {/* DATA */}

                          <td>
                            {formatarData(
                              evento.createdAt
                            )}
                          </td>


                          {/* MÉDICO */}

                          <td>

                            <strong>
                              {moduloAuditoria === "login"
                                ? evento.usuarioId !== null
                                  ? (
                                    "usuarioNome" in evento &&
                                    typeof evento.usuarioNome === "string" &&
                                    evento.usuarioNome.trim()
                                      ? evento.usuarioNome
                                      : `Usuário ${evento.usuarioId}`
                                  )
                                  : "Não identificado"
                                : evento.medicoId !== null
                                  ? nomesMedicos.get(
                                      evento.medicoId
                                    ) ??
                                    "Médico não localizado"
                                  : "Não identificado"}
                            </strong>

                            {moduloAuditoria === "login"
                              ? (
                                  "perfil" in evento &&
                                  evento.perfil && (
                                    <small>
                                      {evento.perfil}
                                    </small>
                                  )
                                )
                              : (
                                  evento.medicoId !== null && (
                                    <small>
                                      Médico {evento.medicoId}
                                    </small>
                                  )
                                )}

                          </td>


                          {/* AÇÃO */}

                          <td>
                            {traduzirAcao(
                              evento.acao
                            )}
                          </td>


                          {/* REGISTRO AFETADO */}

                          <td>

                            {moduloAuditoria === "login"
                              ? (
                                  "ip" in evento
                                    ? evento.ip ?? "—"
                                    : "—"
                                )
                              : moduloAuditoria === "agenda"

                              // AGENDA
                              ? (
                                "disponibilidadeId" in evento &&
                                evento.disponibilidadeId !== null

                                  ? `Disponibilidade ${evento.disponibilidadeId}`

                                  : "agendamentoId" in evento &&
                                    evento.agendamentoId !== null

                                    ? `Agendamento ${evento.agendamentoId}`

                                    : "—"
                              )

                              : moduloAuditoria === "pacientes"

                                // PACIENTES
                                ? (
                                  "pacienteId" in evento &&
                                  evento.pacienteId !== null

                                    ? `Paciente ${evento.pacienteId}`

                                    : "—"
                                )

                                // PRONTUÁRIOS
                                : (
                                  "prontuarioId" in evento &&
                                  evento.prontuarioId !== null

                                    ? `Prontuário ${evento.prontuarioId}`

                                    : "—"
                                )
                            }


                            {/* DETALHES DA AGENDA */}

                            {moduloAuditoria === "agenda" &&
                              "dataAgenda" in evento &&
                              evento.dataAgenda && (

                                <small>

                                  {evento.dataAgenda}

                                  {evento.horaInicio
                                    ? ` • ${evento.horaInicio}`
                                    : ""}

                                  {evento.horaFim
                                    ? `–${evento.horaFim}`
                                    : ""}

                                </small>

                              )}

                          </td>


                          {/* RESULTADO */}

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


            {/* ==================================
                NAVEGAÇÃO ENTRE PÁGINAS
            ================================== */}

            {consultouLogs &&
              !carregandoLogs &&
              !erroLogs &&
              paginacaoAuditoria !== null &&
              (
                moduloAuditoria === "login" ||
                moduloAuditoria === "prontuarios" ||
                moduloAuditoria === "agenda" ||
                moduloAuditoria === "pacientes"
              ) && (

                <div
                  className="admin-auditoria-lista-topo"
                  style={{
                    marginTop: "16px",
                    gap: "12px",
                    flexWrap: "wrap"
                  }}
                >

                  <button
                    type="button"
                    className="admin-auditoria-exportar"
                    disabled={paginacaoAuditoria.pagina <= 1}
                    onClick={() => {
                      void consultarLogs(
                        filtros,
                        moduloAuditoria,
                        paginacaoAuditoria.pagina - 1
                      );
                    }}
                  >
                    Anterior
                  </button>

                  <span>
                    Página {paginacaoAuditoria.pagina}
                    {" de "}
                    {Math.max(
                      1,
                      paginacaoAuditoria.totalPaginas
                    )}
                    {" — "}
                    {eventos.length} eventos nesta página
                  </span>

                  <button
                    type="button"
                    className="admin-auditoria-exportar"
                    disabled={
                      paginacaoAuditoria.pagina >=
                      paginacaoAuditoria.totalPaginas
                    }
                    onClick={() => {
                      void consultarLogs(
                        filtros,
                        moduloAuditoria,
                        paginacaoAuditoria.pagina + 1
                      );
                    }}
                  >
                    Próxima
                  </button>

                </div>

              )}

            {/* ==================================
                AVISO DE PRIVACIDADE
            ================================== */}

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
