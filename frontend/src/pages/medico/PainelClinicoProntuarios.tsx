
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  listarPacientesProntuarioApi,
  listarHistoricoProntuarioApi,
  buscarProntuarioClinicoApi,
  ErroApiProntuario
} from "../../services/prontuariosClinicosApi";

import type {
  PacienteProntuario,
  HistoricoProntuario,
  ProntuarioClinico
} from "../../services/prontuariosClinicosApi";

import FormularioProntuario from "./FormularioProntuario";

import "../../styles/painelClinicoProntuarios.css";
import "../../styles/formularioProntuario.css";

// ========================================
// TIPOS DO PAINEL
// ========================================

type Propriedades = {
  modo: "consultar" | "novo";
  voltar: () => void;
  acessoExpirado: () => void;
};

type SecaoProntuario = {
  numero: number;
  titulo: string;
  linhas: string[];
};

type ModalOcultacao = {
  prontuarioId: number;
} | null;

// ========================================
// MARCADORES DOS REGISTROS CLÍNICOS
// ========================================
//
// O formulário armazena informações
// estruturadas dentro dos seis campos
// clínicos utilizados pelo backend.
//
// Estes marcadores não devem aparecer
// para o médico na visualização final.

const MARCADOR_INICIO =
  "=== FICHA CLÍNICA ESTRUTURADA ===";

const MARCADOR_OBSERVACOES =
  "=== OBSERVAÇÕES ===";

const MARCADOR_SINAIS =
  "=== SINAIS VITAIS ===";

const MARCADOR_AVALIACAO =
  "=== AVALIAÇÃO CLÍNICA ===";

const MARCADOR_CID =
  "=== CID ===";

const MARCADOR_CONDUTA =
  "=== CONDUTA MÉDICA ===";

const MARCADOR_ORIENTACOES =
  "=== ORIENTAÇÕES E RETORNO ===";

// ========================================
// ARMAZENAMENTO LOCAL DOS OCULTOS
// ========================================
//
// Guarda apenas identificadores.
//
// Não guarda informações clínicas.
// Não exclui registros do PostgreSQL.
//
// A preferência é local ao navegador,
// não funciona como controle de acesso.

const CHAVE_OCULTOS =
  "tcc-consultorio:prontuarios-ocultos:v2";

function chaveOcultacao(
  pacienteId: number,
  prontuarioId: number
): string {
  return `${pacienteId}:${prontuarioId}`;
}

function lerOcultos(): string[] {
  try {
    const valor = window.localStorage.getItem(
      CHAVE_OCULTOS
    );

    if (!valor) return [];

    const resultado: unknown = JSON.parse(valor);

    if (!Array.isArray(resultado)) {
      return [];
    }

    return resultado.filter(
      (item): item is string =>
        typeof item === "string" &&
        /^\d+:\d+$/.test(item)
    );
  } catch {
    return [];
  }
}

function salvarOcultos(
  chaves: string[]
): boolean {
  try {
    window.localStorage.setItem(
      CHAVE_OCULTOS,
      JSON.stringify(chaves)
    );

    return true;
  } catch {
    return false;
  }
}

// ========================================
// FORMATAR DATA
// ========================================

function formatarData(valor: string): string {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "Data indisponível";
  }

  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

// ========================================
// TRATAR ERROS
// ========================================

function obterMensagemErro(
  falha: unknown
): string {
  return falha instanceof Error
    ? falha.message
    : "Não foi possível concluir a operação.";
}

// ========================================
// IDENTIFICAR ÚLTIMO REGISTRO
// ========================================

function obterUltimoProntuario(
  registros: ProntuarioClinico[]
): ProntuarioClinico | null {
  const ordenados = [...registros].sort(
    (a, b) => {
      const aTempo = new Date(a.createdAt).getTime();
      const bTempo = new Date(b.createdAt).getTime();

      const aValido = Number.isFinite(aTempo)
        ? aTempo
        : 0;

      const bValido = Number.isFinite(bTempo)
        ? bTempo
        : 0;

      return bValido - aValido || b.id - a.id;
    }
  );

  return ordenados[0] ?? null;
}

// ========================================
// EXTRAIR TRECHO ENTRE MARCADORES
// ========================================
//
// Compatível com a estrutura utilizada
// pelo FormularioProntuario.tsx.
//
// Caso um marcador não exista,
// retornamos uma string vazia.

function extrairSecao(
  conteudo: string,
  inicio: string,
  fim?: string
): string {
  const posicao = conteudo.indexOf(inicio);

  if (posicao < 0) {
    return "";
  }

  const restante = conteudo.slice(
    posicao + inicio.length
  );

  if (!fim) {
    return restante.trim();
  }

  const posicaoFim = restante.indexOf(fim);

  if (posicaoFim < 0) {
    return restante.trim();
  }

  return restante.slice(
    0,
    posicaoFim
  ).trim();
}

// ========================================
// LIMPAR VALORES VAZIOS E MARCADORES
// ========================================
//
// Retira identificadores internos
// das respostas Sim/Não.
//
// Exemplo:
// [hpp_has] Hipertensão arterial: Sim
//
// Resultado:
// Hipertensão arterial: Sim

function limparLinhas(
  conteudo: string
): string[] {
  return conteudo
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => {
      return (
        linha.length > 0 &&
        linha !== "Não informado" &&
        !linha.startsWith("===")
      );
    })
    .map((linha) =>
      linha.replace(/^\[[^\]]+\]\s*/, "")
    );
}

// ========================================
// BUSCAR OPÇÕES PREENCHIDAS
// ========================================

function obterOpcoes(
  conteudo: string,
  prefixos: string[]
): string[] {
  return conteudo
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) =>
      prefixos.some((prefixo) =>
        linha.startsWith(`[${prefixo}`)
      )
    )
    .map((linha) =>
      linha.replace(/^\[[^\]]+\]\s*/, "")
    );
}

// ========================================
// ADICIONAR CAMPO QUANDO INFORMADO
// ========================================

function campoOpcional(
  titulo: string,
  valor: string
): string[] {
  const conteudo = valor.trim();

  if (
    !conteudo ||
    conteudo === "Não informado"
  ) {
    return [];
  }

  return [`${titulo}: ${conteudo}`];
}

// ========================================
// LER ANTECEDENTES
// ========================================

function lerAntecedentes(
  conteudo: string
): string[] {
  if (!conteudo.trim()) return [];

  // Registros anteriores à ficha
  // estruturada continuam legíveis.
  if (!conteudo.startsWith(MARCADOR_INICIO)) {
    return limparLinhas(conteudo);
  }

  const pessoais = obterOpcoes(
    conteudo,
    ["hpp_"]
  );

  const familiares = obterOpcoes(
    conteudo,
    ["familia_"]
  );

  const observacoes = extrairSecao(
    conteudo,
    MARCADOR_OBSERVACOES
  );

  return [
    ...(pessoais.length > 0
      ? ["Antecedentes pessoais:", ...pessoais]
      : []),

    ...(familiares.length > 0
      ? ["Antecedentes familiares:", ...familiares]
      : []),

    ...campoOpcional(
      "Outros antecedentes",
      observacoes
    )
  ];
}

// ========================================
// LER MEDICAMENTOS E ALERGIAS
// ========================================

function lerMedicamentosEAlergias(
  conteudo: string
): string[] {
  if (!conteudo.startsWith(MARCADOR_INICIO)) {
    return [];
  }

  const medicamentos = extrairSecao(
    conteudo,
    "[medicamentos] Medicamentos em uso:",
    "[alergias] Alergias:"
  );

  const alergias = extrairSecao(
    conteudo,
    "[alergias] Alergias:",
    "[habitos] Hábitos e observações:"
  );

  return [
    ...campoOpcional(
      "Medicamentos em uso",
      medicamentos
    ),
    ...campoOpcional(
      "Alergias",
      alergias
    )
  ];
}

// ========================================
// LER HÁBITOS DE VIDA
// ========================================

function lerHabitos(
  conteudo: string
): string[] {
  if (!conteudo.startsWith(MARCADOR_INICIO)) {
    return [];
  }

  const opcoes = obterOpcoes(
    conteudo,
    ["habito_"]
  );

  const observacoes = extrairSecao(
    conteudo,
    "[habitos] Hábitos e observações:",
    MARCADOR_OBSERVACOES
  );

  return [
    ...opcoes,
    ...campoOpcional(
      "Observações",
      observacoes
    )
  ];
}

// ========================================
// LER SINAIS VITAIS
// ========================================

function lerSinaisVitais(
  conteudo: string
): string[] {
  if (!conteudo.includes(MARCADOR_SINAIS)) {
    return [];
  }

  const secao = extrairSecao(
    conteudo,
    MARCADOR_SINAIS,
    MARCADOR_OBSERVACOES
  );

  // Os sinais ficam antes das opções
  // estruturadas do exame físico.
  //
  // Filtramos apenas medidas conhecidas,
  // sem inferir qualquer resultado.
  return limparLinhas(secao).filter(
    (linha) =>
      /^(Pressão arterial|Frequência cardíaca|Frequência respiratória|Temperatura|Saturação de oxigênio|Peso|Altura):/.test(
        linha
      )
  );
}

// ========================================
// LER EXAME FÍSICO
// ========================================

function lerExameFisico(
  conteudo: string
): string[] {
  if (!conteudo.trim()) return [];

  if (!conteudo.startsWith(MARCADOR_INICIO)) {
    return limparLinhas(conteudo);
  }

  const opcoes = obterOpcoes(
    conteudo,
    ["fisico_"]
  );

  const observacoes = extrairSecao(
    conteudo,
    MARCADOR_OBSERVACOES
  );

  return [
    ...opcoes,
    ...campoOpcional(
      "Achados adicionais",
      observacoes
    )
  ];
}

// ========================================
// LER EXAMES COMPLEMENTARES
// ========================================

function lerExamesComplementares(
  conteudo: string
): string[] {
  if (!conteudo.trim()) return [];

  if (!conteudo.startsWith(MARCADOR_INICIO)) {
    return limparLinhas(conteudo);
  }

  const opcoes = obterOpcoes(
    conteudo,
    ["exame_"]
  );

  const observacoes = extrairSecao(
    conteudo,
    MARCADOR_OBSERVACOES
  );

  return [
    ...opcoes,
    ...campoOpcional(
      "Resultados e observações",
      observacoes
    )
  ];
}

// ========================================
// LER AVALIAÇÃO CLÍNICA
// ========================================

function lerAvaliacaoClinica(
  conteudo: string
): string[] {
  if (!conteudo.includes(MARCADOR_AVALIACAO)) {
    return [];
  }

  const fimAvaliacao =
    conteudo.includes(MARCADOR_CID)
      ? MARCADOR_CID
      : MARCADOR_CONDUTA;

  const avaliacao = extrairSecao(
    conteudo,
    MARCADOR_AVALIACAO,
    fimAvaliacao
  );

  const cid = extrairSecao(
    conteudo,
    MARCADOR_CID,
    MARCADOR_CONDUTA
  );

  return [
    ...campoOpcional(
      "Avaliação clínica",
      avaliacao
    ),
    ...campoOpcional(
      "CID",
      cid
    )
  ];
}

// ========================================
// LER CONDUTA MÉDICA
// ========================================

function lerConduta(
  conteudo: string
): string[] {
  if (!conteudo.trim()) return [];

  // Compatibilidade com prontuários
  // anteriores à estrutura atual.
  if (!conteudo.includes(MARCADOR_CONDUTA)) {
    return limparLinhas(conteudo);
  }

  return limparLinhas(
    extrairSecao(
      conteudo,
      MARCADOR_CONDUTA,
      MARCADOR_ORIENTACOES
    )
  );
}

// ========================================
// LER ORIENTAÇÕES
// ========================================

function lerOrientacoes(
  conteudo: string
): string[] {
  if (!conteudo.includes(MARCADOR_ORIENTACOES)) {
    return [];
  }

  return limparLinhas(
    extrairSecao(
      conteudo,
      MARCADOR_ORIENTACOES
    )
  );
}

// ========================================
// CONSTRUIR AS 11 SEÇÕES DO DOCUMENTO
// ========================================
//
// Esta função reproduz a organização
// da pré-visualização do formulário.
//
// Somente seções com informações
// preenchidas são exibidas.
//
// Registros antigos continuam acessíveis.

function montarSecoesProntuario(
  registro: ProntuarioClinico
): SecaoProntuario[] {

  const hpp =
    registro.historiaPatologicaPregressa ?? "";

  const fisico =
    registro.exameFisico ?? "";

  const exames =
    registro.examesComplementares ?? "";

  const conduta =
    registro.conduta ?? "";

  const secoes: SecaoProntuario[] = [
    {
      numero: 1,
      titulo: "Queixa principal",
      linhas: limparLinhas(
        registro.queixaPrincipal ?? ""
      )
    },
    {
      numero: 2,
      titulo: "História da doença atual",
      linhas: limparLinhas(
        registro.historiaMolestiaAtual ?? ""
      )
    },
    {
      numero: 3,
      titulo: "Antecedentes pessoais e familiares",
      linhas: lerAntecedentes(hpp)
    },
    {
      numero: 4,
      titulo: "Medicamentos e alergias",
      linhas: lerMedicamentosEAlergias(hpp)
    },
    {
      numero: 5,
      titulo: "Hábitos de vida",
      linhas: lerHabitos(hpp)
    },
    {
      numero: 6,
      titulo: "Sinais vitais",
      linhas: lerSinaisVitais(fisico)
    },
    {
      numero: 7,
      titulo: "Exame físico",
      linhas: lerExameFisico(fisico)
    },
    {
      numero: 8,
      titulo: "Exames complementares",
      linhas: lerExamesComplementares(exames)
    },
    {
      numero: 9,
      titulo: "Avaliação clínica e hipótese diagnóstica",
      linhas: lerAvaliacaoClinica(conduta)
    },
    {
      numero: 10,
      titulo: "Conduta médica",
      linhas: lerConduta(conduta)
    },
    {
      numero: 11,
      titulo: "Orientações e retorno",
      linhas: lerOrientacoes(conduta)
    }
  ];

  return secoes.filter(
    (secao) => secao.linhas.length > 0
  );
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function PainelClinicoProntuarios({
  modo,
  voltar,
  acessoExpirado
}: Propriedades) {

  // ========================================
  // PACIENTES
  // ========================================

  const [pacientes, setPacientes] =
    useState<PacienteProntuario[]>([]);

  const [pacienteId, setPacienteId] =
    useState<number | null>(null);

  // ========================================
  // HISTÓRICO E DOCUMENTOS
  // ========================================

  const [historico, setHistorico] =
    useState<HistoricoProntuario | null>(null);

  const [registro, setRegistro] =
    useState<ProntuarioClinico | null>(null);

  const [
    prontuarioAnterior,
    setProntuarioAnterior
  ] = useState<ProntuarioClinico | null>(null);

  // ========================================
  // FORMULÁRIO
  // ========================================

  const [formularioAberto, setFormularioAberto] =
    useState(false);

  const [prontuarioSalvo, setProntuarioSalvo] =
    useState(false);

  // ========================================
  // CARREGAMENTOS
  // ========================================

  const [carregandoPacientes, setCarregandoPacientes] =
    useState(true);

  const [carregandoHistorico, setCarregandoHistorico] =
    useState(false);

  const [carregandoRegistro, setCarregandoRegistro] =
    useState(false);

  // ========================================
  // MENSAGENS
  // ========================================

  const [erro, setErro] = useState("");

  const [erroHistorico, setErroHistorico] =
    useState("");

  const [mensagem, setMensagem] = useState("");

  // ========================================
  // REGISTROS OCULTOS
  // ========================================

  const [ocultos, setOcultos] =
    useState<string[]>(lerOcultos);

  const [mostrarOcultos, setMostrarOcultos] =
    useState(false);

  const [modalOcultacao, setModalOcultacao] =
    useState<ModalOcultacao>(null);

  // ========================================
  // CONTROLE DE REQUISIÇÕES ASSÍNCRONAS
  // ========================================

  const versaoSelecao = useRef(0);

  const componenteAtivo = useRef(false);

  // ========================================
  // CONTROLE DE ACESSO EXPIRADO
  // ========================================

  const verificarErroDeAcesso = useCallback(
    (falha: unknown): boolean => {

      if (
        falha instanceof ErroApiProntuario &&
        (falha.status === 401 ||
         falha.status === 403)
      ) {
        acessoExpirado();
        return true;
      }

      return false;
    },
    [acessoExpirado]
  );

  // ========================================
  // CARREGAR PACIENTES
  // ========================================

  useEffect(() => {

    let ativo = true;

    componenteAtivo.current = true;

    async function carregarPacientes() {

      setCarregandoPacientes(true);
      setErro("");

      try {

        const resultado =
          await listarPacientesProntuarioApi();

        if (!ativo) return;

        if (!Array.isArray(resultado)) {
          throw new Error(
            "O servidor retornou uma lista inválida de pacientes."
          );
        }

        setPacientes(resultado);

      } catch (falha) {

        if (!ativo) return;

        if (
          falha instanceof ErroApiProntuario &&
          (falha.status === 401 ||
           falha.status === 403)
        ) {
          acessoExpirado();
          return;
        }

        setErro(obterMensagemErro(falha));

      } finally {
        if (ativo) {
          setCarregandoPacientes(false);
        }
      }
    }

    void carregarPacientes();

    return () => {
      ativo = false;
      componenteAtivo.current = false;
      versaoSelecao.current += 1;
    };

  }, [acessoExpirado]);

  // ========================================
  // IDENTIFICAR PACIENTE
  // ========================================

  const pacienteSelecionado =
    pacientes.find(
      (paciente) => paciente.id === pacienteId
    ) ?? null;

  // ========================================
  // SEPARAR REGISTROS VISÍVEIS E OCULTOS
  // ========================================

  const registros =
    historico?.prontuarios ?? [];

  const registrosVisiveis = registros.filter(
    (item) =>
      !ocultos.includes(
        chaveOcultacao(
          item.pacienteId,
          item.id
        )
      )
  );

  const registrosOcultos = registros.filter(
    (item) =>
      ocultos.includes(
        chaveOcultacao(
          item.pacienteId,
          item.id
        )
      )
  );

  const registrosExibidos = mostrarOcultos
    ? registrosOcultos
    : registrosVisiveis;

  // ========================================
  // SEÇÕES DO DOCUMENTO SELECIONADO
  // ========================================

  const secoesRegistro = registro
    ? montarSecoesProntuario(registro)
    : [];

  // ========================================
  // LIMPAR DADOS AO TROCAR PACIENTE
  // ========================================

  function limparDadosPaciente() {

    setHistorico(null);
    setRegistro(null);
    setProntuarioAnterior(null);

    setFormularioAberto(false);
    setProntuarioSalvo(false);

    setCarregandoHistorico(false);
    setCarregandoRegistro(false);

    setMostrarOcultos(false);
    setModalOcultacao(null);

    setErro("");
    setErroHistorico("");
    setMensagem("");
  }

  // ========================================
  // CARREGAR HISTÓRICO
  // ========================================

  async function carregarHistorico(
    id: number,
    versaoAtual: number
  ) {

    setCarregandoHistorico(true);
    setErroHistorico("");

    try {

      const resultado =
        await listarHistoricoProntuarioApi(id);

      if (
        !componenteAtivo.current ||
        versaoAtual !== versaoSelecao.current
      ) {
        return;
      }

      if (resultado.paciente.id !== id) {
        throw new Error(
          "O histórico retornado não corresponde ao paciente selecionado."
        );
      }

      setHistorico(resultado);

      if (modo === "consultar") {
        return;
      }

      // No modo novo, o último prontuário
      // é disponibilizado para que o médico
      // possa carregar dados anteriores.
      const ultimo = obterUltimoProntuario(
        resultado.prontuarios
      );

      if (!ultimo) {
        setProntuarioAnterior(null);
        return;
      }

      const detalhes =
        await buscarProntuarioClinicoApi(
          id,
          ultimo.id
        );

      if (
        !componenteAtivo.current ||
        versaoAtual !== versaoSelecao.current
      ) {
        return;
      }

      if (detalhes.pacienteId !== id) {
        throw new Error(
          "O registro anterior pertence a outro paciente."
        );
      }

      setProntuarioAnterior(detalhes);

    } catch (falha) {

      if (
        !componenteAtivo.current ||
        versaoAtual !== versaoSelecao.current
      ) {
        return;
      }

      if (verificarErroDeAcesso(falha)) {
        return;
      }

      setErroHistorico(
        obterMensagemErro(falha)
      );

    } finally {

      if (
        componenteAtivo.current &&
        versaoAtual === versaoSelecao.current
      ) {
        setCarregandoHistorico(false);
      }
    }
  }

  // ========================================
  // SELECIONAR PACIENTE
  // ========================================

  function selecionarPaciente(id: number) {

    const versaoAtual =
      ++versaoSelecao.current;

    limparDadosPaciente();

    setPacienteId(id);

    if (modo === "novo") {
      setFormularioAberto(true);
    }

    void carregarHistorico(
      id,
      versaoAtual
    );
  }

  function alterarPaciente(valor: string) {

    if (!valor) {
      versaoSelecao.current += 1;

      setPacienteId(null);
      limparDadosPaciente();
      return;
    }

    const id = Number(valor);

    if (
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      return;
    }

    selecionarPaciente(id);
  }

  // ========================================
  // VISUALIZAR PRONTUÁRIO SALVO
  // ========================================

  async function visualizarProntuario(
    prontuarioId: number
  ) {

    if (pacienteId === null) return;

    const pacienteAtual = pacienteId;

    const versaoAtual =
      versaoSelecao.current;

    setErro("");
    setMensagem("");
    setRegistro(null);
    setCarregandoRegistro(true);

    try {

      const resultado =
        await buscarProntuarioClinicoApi(
          pacienteAtual,
          prontuarioId
        );

      if (
        !componenteAtivo.current ||
        versaoAtual !== versaoSelecao.current
      ) {
        return;
      }

      if (
        resultado.pacienteId !== pacienteAtual ||
        resultado.id !== prontuarioId
      ) {
        throw new Error(
          "O registro não corresponde ao prontuário solicitado."
        );
      }

      // O conteúdo ainda está nos
      // seis campos da API.
      //
      // A organização em 11 seções
      // é feita durante a renderização.
      setRegistro(resultado);

    } catch (falha) {

      if (
        !componenteAtivo.current ||
        versaoAtual !== versaoSelecao.current
      ) {
        return;
      }

      if (verificarErroDeAcesso(falha)) {
        return;
      }

      setErro(obterMensagemErro(falha));

    } finally {

      if (
        componenteAtivo.current &&
        versaoAtual === versaoSelecao.current
      ) {
        setCarregandoRegistro(false);
      }
    }
  }

  // ========================================
  // OCULTAR PRONTUÁRIO LOCALMENTE
  // ========================================

  function solicitarOcultacao(
    prontuarioId: number
  ) {
    setModalOcultacao({
      prontuarioId
    });
  }

  function confirmarOcultacao() {

    if (
      !modalOcultacao ||
      pacienteId === null
    ) {
      return;
    }

    const id = modalOcultacao.prontuarioId;

    const chave = chaveOcultacao(
      pacienteId,
      id
    );

    const atualizados = Array.from(
      new Set([...ocultos, chave])
    );

    const persistiu =
      salvarOcultos(atualizados);

    setOcultos(atualizados);
    setModalOcultacao(null);

    if (registro?.id === id) {
      setRegistro(null);
    }

    setMensagem(
      persistiu
        ? `Prontuário ${id} ocultado neste navegador.`
        : `Prontuário ${id} ocultado nesta sessão.`
    );
  }

  // ========================================
  // RESTAURAR PRONTUÁRIO
  // ========================================

  function restaurarProntuario(
    prontuarioId: number
  ) {

    if (pacienteId === null) return;

    const chave = chaveOcultacao(
      pacienteId,
      prontuarioId
    );

    const atualizados = ocultos.filter(
      (item) => item !== chave
    );

    salvarOcultos(atualizados);

    setOcultos(atualizados);

    setMensagem(
      `Prontuário ${prontuarioId} restaurado na lista principal.`
    );
  }

  function restaurarTodos() {

    if (pacienteId === null) return;

    const prefixo = `${pacienteId}:`;

    const atualizados = ocultos.filter(
      (item) => !item.startsWith(prefixo)
    );

    salvarOcultos(atualizados);

    setOcultos(atualizados);
    setMostrarOcultos(false);

    setMensagem(
      "Prontuários restaurados na lista principal."
    );
  }

  // ========================================
  // PRONTUÁRIO SALVO
  // ========================================

  function tratarProntuarioSalvo(
    novoProntuario: ProntuarioClinico
  ) {

    if (
      pacienteId === null ||
      novoProntuario.pacienteId !== pacienteId
    ) {
      setErro(
        "O prontuário salvo não corresponde ao paciente selecionado."
      );
      return;
    }

    setRegistro(novoProntuario);
    setProntuarioAnterior(novoProntuario);

    setProntuarioSalvo(true);
    setFormularioAberto(false);

    setErro("");

    setMensagem(
      `Prontuário ${novoProntuario.id} salvo com sucesso.`
    );
  }

  // ========================================
  // CONTROLE DO FORMULÁRIO
  // ========================================

  function cancelarFormulario() {

    setFormularioAberto(false);
    setRegistro(null);
    setProntuarioSalvo(false);

    setErro("");
    setMensagem("");
  }

  function abrirNovoFormulario() {

    setRegistro(null);
    setProntuarioSalvo(false);

    setErro("");
    setMensagem("");
    setFormularioAberto(true);
  }

  // ========================================
  // INTERFACE
  // ========================================

  return (
    <section className="painel-clinico">

      {/* ====================================
          CABEÇALHO
      ==================================== */}

      <header className="painel-clinico-cabecalho">

        <div>
          <h2>
            {modo === "consultar"
              ? "Consultar prontuários"
              : "Novo prontuário"}
          </h2>

          <p>
            {modo === "consultar"
              ? "Consulte os registros dos seus pacientes."
              : "Selecione o paciente para registrar o atendimento."}
          </p>
        </div>

        <button
          type="button"
          className="painel-clinico-voltar"
          onClick={voltar}
        >
          Voltar aos prontuários
        </button>

      </header>

      {/* ====================================
          MENSAGENS
      ==================================== */}

      {erro && (
        <p
          className="painel-clinico-erro"
          role="alert"
        >
          {erro}
        </p>
      )}

      {mensagem && (
        <p
          className="prontuario-sucesso"
          role="status"
        >
          {mensagem}
        </p>
      )}

      {/* ====================================
          SELEÇÃO DO PACIENTE
      ==================================== */}

      <div className="painel-clinico-selecao">

        <label
          htmlFor="paciente-prontuario"
          className="painel-clinico-rotulo"
        >
          Paciente
        </label>

        <select
          id="paciente-prontuario"
          value={pacienteId ?? ""}
          onChange={(evento) => {
            alterarPaciente(evento.target.value);
          }}
          disabled={
            carregandoPacientes ||
            carregandoRegistro ||
            (modo === "novo" && formularioAberto)
          }
        >
          <option value="">
            Selecione um paciente
          </option>

          {pacientes.map((paciente) => (
            <option
              key={paciente.id}
              value={paciente.id}
            >
              {paciente.nome}
            </option>
          ))}
        </select>

        {carregandoPacientes && (
          <p role="status">
            Carregando pacientes...
          </p>
        )}

        {!carregandoPacientes &&
          pacientes.length === 0 &&
          !erro && (
            <p>
              Nenhum paciente encontrado.
            </p>
          )}

      </div>

      {/* ====================================
          CONSULTAR PRONTUÁRIOS
      ==================================== */}

      {modo === "consultar" && (
        <>

          {carregandoHistorico && (
            <p role="status">
              Carregando histórico...
            </p>
          )}

          {erroHistorico && (
            <p
              className="painel-clinico-erro"
              role="alert"
            >
              {erroHistorico}
            </p>
          )}

          {historico && (
            <div className="painel-clinico-historico">

              <h3>
                Histórico de {historico.paciente.nome}
              </h3>

              {/* FILTROS */}

              <div className="painel-clinico-filtros">

                <button
                  type="button"
                  className={
                    mostrarOcultos
                      ? "painel-clinico-filtro"
                      : "painel-clinico-filtro ativo"
                  }
                  onClick={() => {
                    setMostrarOcultos(false);
                    setRegistro(null);
                  }}
                >
                  Prontuários ({registrosVisiveis.length})
                </button>

                <button
                  type="button"
                  className={
                    mostrarOcultos
                      ? "painel-clinico-filtro ativo"
                      : "painel-clinico-filtro"
                  }
                  onClick={() => {
                    setMostrarOcultos(true);
                    setRegistro(null);
                  }}
                >
                  Ocultos ({registrosOcultos.length})
                </button>

                {mostrarOcultos &&
                  registrosOcultos.length > 0 && (
                    <button
                      type="button"
                      className="painel-clinico-restaurar-todos"
                      onClick={restaurarTodos}
                    >
                      Restaurar todos
                    </button>
                  )}

              </div>

              {/* LISTA DE REGISTROS */}

              {registrosExibidos.length === 0 ? (
                <div className="painel-clinico-aviso">
                  <p>
                    {mostrarOcultos
                      ? "Nenhum prontuário oculto."
                      : registros.length === 0
                        ? "Este paciente ainda não possui prontuários."
                        : "Todos os registros estão ocultos neste navegador."}
                  </p>
                </div>
              ) : (
                <ul className="painel-clinico-lista">

                  {registrosExibidos.map((item) => (
                    <li
                      key={item.id}
                      className="painel-clinico-item"
                    >

                      <span>
                        <strong>
                          Prontuário {item.id}
                        </strong>

                        {" — "}

                        {formatarData(item.createdAt)}
                      </span>

                      <div className="painel-clinico-item-acoes">

                        <button
                          type="button"
                          disabled={carregandoRegistro}
                          onClick={() => {
                            void visualizarProntuario(
                              item.id
                            );
                          }}
                        >
                          Visualizar
                        </button>

                        {mostrarOcultos ? (
                          <button
                            type="button"
                            className="painel-clinico-acao-restaurar"
                            onClick={() => {
                              restaurarProntuario(item.id);
                            }}
                          >
                            Restaurar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="painel-clinico-acao-ocultar"
                            onClick={() => {
                              solicitarOcultacao(item.id);
                            }}
                          >
                            Ocultar
                          </button>
                        )}

                      </div>
                    </li>
                  ))}

                </ul>
              )}

              <p className="painel-clinico-observacao">
                Ocultar retira o prontuário apenas
                desta lista. Ele continua salvo
                no banco de dados.
              </p>

            </div>
          )}

        </>
      )}

      {/* ====================================
          NOVO PRONTUÁRIO
      ==================================== */}

      {modo === "novo" &&
        pacienteSelecionado &&
        formularioAberto && (
          <>

            {erroHistorico && (
              <p
                className="painel-clinico-erro"
                role="alert"
              >
                Não foi possível carregar o
                prontuário anterior: {erroHistorico}
              </p>
            )}

            {carregandoHistorico && (
              <p role="status">
                Verificando registro anterior...
              </p>
            )}

            <FormularioProntuario
              paciente={{
                id: pacienteSelecionado.id,
                nome: pacienteSelecionado.nome
              }}
              prontuarioAnterior={prontuarioAnterior}
              onSalvo={tratarProntuarioSalvo}
              onCancelar={cancelarFormulario}
              onAcessoExpirado={acessoExpirado}
            />

          </>
        )}

      {/* ====================================
          FORMULÁRIO FECHADO
      ==================================== */}

      {modo === "novo" &&
        pacienteSelecionado &&
        !formularioAberto &&
        !prontuarioSalvo && (
          <div className="painel-clinico-aviso">

            <p>
              O formulário foi fechado sem criar
              um novo registro.
            </p>

            <button
              type="button"
              className="painel-clinico-voltar"
              onClick={abrirNovoFormulario}
            >
              Abrir formulário
            </button>

          </div>
        )}

      {/* ====================================
          PRONTUÁRIO CRIADO
      ==================================== */}

      {modo === "novo" &&
        prontuarioSalvo &&
        registro && (
          <div className="painel-clinico-aviso">

            <h3>
              Prontuário salvo
            </h3>

            <p>
              Prontuário {registro.id} registrado
              no histórico do paciente.
            </p>

            <button
              type="button"
              className="painel-clinico-voltar"
              onClick={abrirNovoFormulario}
            >
              Criar outro prontuário
            </button>

          </div>
        )}

      {/* ====================================
          VISUALIZAÇÃO DO PRONTUÁRIO SALVO
      ==================================== */}

      {carregandoRegistro && (
        <p role="status">
          Carregando prontuário...
        </p>
      )}

      {registro && pacienteSelecionado && (

        <div className="formulario-prontuario-previa">

          {/*
            Utilizamos as mesmas classes
            visuais da pré-visualização
            do formulário.

            Nenhum marcador técnico
            é exibido para o médico.
          */}

          <article className="prontuario-documento-pdf">

            {/* CABEÇALHO DO DOCUMENTO */}

            <header className="prontuario-documento-cabecalho">

              <div>
                <span className="prontuario-documento-sistema">
                  SISTEMA DE CONSULTÓRIO
                </span>

                <h2>PRONTUÁRIO MÉDICO</h2>

                <p>
                  Registro clínico salvo
                </p>
              </div>

              <span className="painel-clinico-status-salvo">
                Prontuário {registro.id}
              </span>

            </header>

            {/* IDENTIFICAÇÃO */}

            <section className="prontuario-documento-identificacao">

              <div>
                <span>Paciente</span>

                <strong>
                  {pacienteSelecionado.nome}
                </strong>
              </div>

              <div>
                <span>Data do registro</span>

                <strong>
                  {formatarData(registro.createdAt)}
                </strong>
              </div>

              {registro.prontuarioAnteriorId != null && (
                <div>
                  <span>Registro de referência</span>

                  <strong>
                    Prontuário {registro.prontuarioAnteriorId}
                  </strong>
                </div>
              )}

            </section>

            {/* SEÇÕES PREENCHIDAS */}

            <div className="prontuario-documento-corpo">

              {secoesRegistro.map((secao) => (

                <section
                  key={secao.numero}
                  className="prontuario-documento-secao"
                >

                  <h3>
                    <span>
                      {String(secao.numero).padStart(2, "0")}
                    </span>

                    {secao.titulo}
                  </h3>

                  <div className="prontuario-documento-conteudo">

                    {secao.linhas.map((linha, indice) => (
                      <p
                        key={`${secao.numero}-${indice}`}
                      >
                        {linha}
                      </p>
                    ))}

                  </div>

                </section>

              ))}

              {secoesRegistro.length === 0 && (
                <p>
                  Nenhum conteúdo clínico disponível.
                </p>
              )}

            </div>

            {/* RODAPÉ */}

            <footer className="prontuario-documento-rodape">

              <p>
                Prontuário registrado no sistema.
                O acesso a este documento está
                sujeito à autorização clínica
                adicional.
              </p>

            </footer>

          </article>

          {/* AÇÃO DE FECHAR A VISUALIZAÇÃO */}

          <div className="prontuario-previa-acoes">

            <button
              type="button"
              className="formulario-prontuario-secundario"
              onClick={() => {
                setRegistro(null);
              }}
            >
              Fechar visualização
            </button>

          </div>

        </div>

      )}

      {/* ====================================
          MODAL DE OCULTAÇÃO
      ==================================== */}

      {modalOcultacao && (
        <div
          className="painel-clinico-modal-overlay"
          onMouseDown={(evento) => {
            if (
              evento.target ===
              evento.currentTarget
            ) {
              setModalOcultacao(null);
            }
          }}
        >

          <div
            className="painel-clinico-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-ocultar-titulo"
            aria-describedby="modal-ocultar-descricao"
          >

            <div className="painel-clinico-modal-icone">

              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 5.1A11 11 0 0 1 12 5c7 0 10 7 10 7a14 14 0 0 1-3 4" />
                <path d="M6.5 6.5C3.8 8.3 2 12 2 12s3 7 10 7a10.5 10.5 0 0 0 4.5-.9" />
              </svg>

            </div>

            <h3 id="modal-ocultar-titulo">
              Ocultar prontuário?
            </h3>

            <p id="modal-ocultar-descricao">
              O prontuário{" "}
              <strong>
                {modalOcultacao.prontuarioId}
              </strong>{" "}
              será retirado da lista principal
              deste navegador.
            </p>

            <p className="painel-clinico-modal-info">
              O registro continuará salvo no banco
              de dados e poderá ser restaurado
              pela aba Ocultos.
            </p>

            <div className="painel-clinico-modal-acoes">

              <button
                type="button"
                className="painel-clinico-modal-cancelar"
                onClick={() => {
                  setModalOcultacao(null);
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="painel-clinico-modal-confirmar"
                onClick={confirmarOcultacao}
              >
                Sim, ocultar
              </button>

            </div>

          </div>

        </div>
      )}

    </section>
  );
}
