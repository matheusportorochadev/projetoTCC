
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  criarProntuarioClinicoApi,
  ErroApiProntuario
} from "../../services/prontuariosClinicosApi";

import type {
  ProntuarioClinico
} from "../../services/prontuariosClinicosApi";

import "../../styles/formularioProntuario.css";

// ========================================
// TIPOS
// ========================================

type Propriedades = {
  paciente: {
    id: number;
    nome: string;
  };
  prontuarioAnterior?: ProntuarioClinico | null;
  onSalvo: (registro: ProntuarioClinico) => void;
  onCancelar: () => void;
  onAcessoExpirado: () => void;
};

type Resposta = "" | "Sim" | "Não";

type CampoTexto =
  | "queixaPrincipal"
  | "historiaMolestiaAtual"
  | "antecedentes"
  | "medicamentos"
  | "habitos"
  | "exameFisico"
  | "examesComplementares"
  | "avaliacaoClinica"
  | "conduta"
  | "orientacoes";

type DadosFormulario = Record<CampoTexto, string>;

type GrupoClinico = {
  titulo: string;
  opcoes: {
    id: string;
    nome: string;
  }[];
};

type SecaoPrevia = {
  numero: number;
  titulo: string;
  linhas: string[];
};

// ========================================
// ESTADOS INICIAIS
// ========================================

const DADOS_INICIAIS: DadosFormulario = {
  queixaPrincipal: "",
  historiaMolestiaAtual: "",
  antecedentes: "",
  medicamentos: "",
  habitos: "",
  exameFisico: "",
  examesComplementares: "",
  avaliacaoClinica: "",
  conduta: "",
  orientacoes: ""
};

// ========================================
// ANTECEDENTES
// ========================================

const GRUPOS_ANTECEDENTES: GrupoClinico[] = [
  {
    titulo: "Antecedentes pessoais",
    opcoes: [
      { id: "hpp_has", nome: "Hipertensão arterial (HAS)" },
      { id: "hpp_dm", nome: "Diabetes mellitus" },
      { id: "hpp_dlp", nome: "Dislipidemia" },
      { id: "hpp_cardiopatia", nome: "Cardiopatia" },
      { id: "hpp_dpoc", nome: "Doença respiratória crônica" },
      { id: "hpp_enxaqueca", nome: "Enxaqueca" },
      { id: "hpp_hipotireoidismo", nome: "Hipotireoidismo" },
      { id: "hpp_hipertireoidismo", nome: "Hipertireoidismo" },
      { id: "hpp_avc", nome: "AVC prévio" },
      { id: "hpp_iam", nome: "Infarto prévio" },
      { id: "hpp_cirurgia", nome: "Cirurgias anteriores" },
      { id: "hpp_internacao", nome: "Internações anteriores" },
      { id: "hpp_alergia", nome: "Histórico de alergias" }
    ]
  },
  {
    titulo: "Antecedentes familiares",
    opcoes: [
      { id: "familia_has", nome: "Hipertensão arterial" },
      { id: "familia_dm", nome: "Diabetes mellitus" },
      { id: "familia_iam", nome: "Infarto" },
      { id: "familia_avc", nome: "AVC" },
      { id: "familia_cancer", nome: "Câncer" }
    ]
  }
];

// ========================================
// HÁBITOS
// ========================================

const GRUPOS_HABITOS: GrupoClinico[] = [
  {
    titulo: "Hábitos de vida",
    opcoes: [
      { id: "habito_tabagismo", nome: "Tabagismo" },
      { id: "habito_etilismo", nome: "Consumo de álcool" },
      { id: "habito_atividade", nome: "Prática de atividade física" }
    ]
  }
];

// ========================================
// EXAME FÍSICO
// ========================================

const GRUPOS_EXAME_FISICO: GrupoClinico[] = [
  {
    titulo: "Estado geral",
    opcoes: [
      { id: "fisico_beg", nome: "Bom estado geral" },
      { id: "fisico_corado", nome: "Corado" },
      { id: "fisico_hidratado", nome: "Hidratado" },
      { id: "fisico_acianotico", nome: "Acianótico" },
      { id: "fisico_anicterico", nome: "Anictérico" }
    ]
  },
  {
    titulo: "Aparelho cardiovascular",
    opcoes: [
      {
        id: "fisico_rcr",
        nome: "Ritmo cardíaco regular em dois tempos"
      },
      {
        id: "fisico_sem_sopro",
        nome: "Ausência de sopros cardíacos"
      },
      {
        id: "fisico_carotidas",
        nome: "Ausência de sopros carotídeos"
      }
    ]
  },
  {
    titulo: "Aparelho respiratório",
    opcoes: [
      {
        id: "fisico_mv",
        nome: "Murmúrio vesicular presente"
      },
      {
        id: "fisico_sem_ra",
        nome: "Ausência de ruídos adventícios"
      }
    ]
  },
  {
    titulo: "Abdome",
    opcoes: [
      { id: "fisico_plano", nome: "Abdome plano" },
      { id: "fisico_flacido", nome: "Abdome flácido" },
      { id: "fisico_indolor", nome: "Abdome indolor" },
      {
        id: "fisico_sem_massas",
        nome: "Ausência de massas palpáveis"
      },
      {
        id: "fisico_sem_viscero",
        nome: "Ausência de visceromegalias"
      }
    ]
  },
  {
    titulo: "Membros inferiores e avaliação vascular",
    opcoes: [
      { id: "fisico_femoral", nome: "Pulsos femorais palpáveis" },
      { id: "fisico_popliteo", nome: "Pulsos poplíteos palpáveis" },
      { id: "fisico_tibial", nome: "Pulsos tibiais palpáveis" },
      { id: "fisico_pedioso", nome: "Pulsos pediosos palpáveis" },
      { id: "fisico_panturrilhas", nome: "Panturrilhas livres" },
      { id: "fisico_sem_edema", nome: "Ausência de edema" }
    ]
  }
];

// ========================================
// EXAMES COMPLEMENTARES
// ========================================

const GRUPOS_EXAMES: GrupoClinico[] = [
  {
    titulo: "Exames complementares",
    opcoes: [
      {
        id: "exame_laboratorial",
        nome: "Exames laboratoriais"
      },
      {
        id: "exame_doppler",
        nome: "Ultrassonografia Doppler"
      },
      {
        id: "exame_imagem",
        nome: "Outros exames de imagem"
      }
    ]
  }
];

// ========================================
// SINAIS VITAIS
// ========================================

const SINAIS_VITAIS = [
  {
    id: "pressaoArterial",
    nome: "Pressão arterial",
    unidade: "mmHg",
    exemplo: "120/80"
  },
  {
    id: "frequenciaCardiaca",
    nome: "Frequência cardíaca",
    unidade: "bpm",
    exemplo: "80"
  },
  {
    id: "frequenciaRespiratoria",
    nome: "Frequência respiratória",
    unidade: "irpm",
    exemplo: "18"
  },
  {
    id: "temperatura",
    nome: "Temperatura",
    unidade: "°C",
    exemplo: "36,5"
  },
  {
    id: "saturacao",
    nome: "Saturação de oxigênio",
    unidade: "%",
    exemplo: "98"
  },
  {
    id: "peso",
    nome: "Peso",
    unidade: "kg",
    exemplo: "75"
  },
  {
    id: "altura",
    nome: "Altura",
    unidade: "cm",
    exemplo: "175"
  }
] as const;

type SinalVital =
  typeof SINAIS_VITAIS[number]["id"];

type SinaisVitais = Record<SinalVital, string>;

const SINAIS_INICIAIS: SinaisVitais = {
  pressaoArterial: "",
  frequenciaCardiaca: "",
  frequenciaRespiratoria: "",
  temperatura: "",
  saturacao: "",
  peso: "",
  altura: ""
};

// ========================================
// MARCADORES DE COMPATIBILIDADE
// ========================================
//
// A API atual aceita seis campos clínicos.
// Os marcadores organizam as informações
// opcionais dentro desses campos.
//
// Eles não são exibidos no PDF.

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
// SEÇÃO MINIMIZÁVEL
// ========================================
//
// Não usamos details, open ou defaultOpen.
//
// Cada seção possui um botão React.
// O estado aberta/fechada é independente.
//
// Ao fechar, os campos ficam ocultos,
// mas não são desmontados ou apagados.

function SecaoRecolhivel({
  numero,
  titulo,
  obrigatorio = false,
  children
}: {
  numero: number;
  titulo: string;
  obrigatorio?: boolean;
  children: ReactNode;
}) {
  // As seções obrigatórias começam abertas.
  // As opcionais começam minimizadas.
  const [aberta, setAberta] = useState(obrigatorio);

  const idConteudo = `secao-prontuario-${numero}`;

  return (
    <section className="formulario-prontuario-recolhivel">

      <button
        type="button"
        className="formulario-prontuario-recolhivel-titulo"
        aria-expanded={aberta}
        aria-controls={idConteudo}
        onClick={() => {
          setAberta((anterior) => !anterior);
        }}
      >
        <span className="formulario-prontuario-recolhivel-nome">
          {String(numero).padStart(2, "0")}. {titulo}

          {obrigatorio && (
            <span className="formulario-prontuario-obrigatorio">
              {" "}*
            </span>
          )}
        </span>

        <span
          className="formulario-prontuario-seta"
          aria-hidden="true"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      <div
        id={idConteudo}
        className="formulario-prontuario-recolhivel-conteudo"
        hidden={!aberta}
      >
        {children}
      </div>

    </section>
  );
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function textoOuNull(valor: string): string | null {
  return valor.trim() || null;
}

function formatarData(valor: string | Date): string {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "Data indisponível";
  }

  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function limparNaoInformado(valor: string): string {
  return valor.trim() === "Não informado"
    ? ""
    : valor.trim();
}

// ========================================
// SERIALIZAR RESPOSTAS SIM / NÃO
// ========================================

function serializarGrupos(
  grupos: GrupoClinico[],
  respostas: Record<string, Resposta>
): string[] {
  const linhas: string[] = [];

  for (const grupo of grupos) {
    const selecionadas = grupo.opcoes.flatMap((opcao) => {
      const resposta = respostas[opcao.id] ?? "";

      if (!resposta) return [];

      return [
        `[${opcao.id}] ${opcao.nome}: ${resposta}`
      ];
    });

    if (selecionadas.length > 0) {
      linhas.push(grupo.titulo, ...selecionadas, "");
    }
  }

  return linhas;
}

// ========================================
// RECUPERAR RESPOSTAS SALVAS
// ========================================

function recuperarEstruturado(
  conteudo: string | null | undefined,
  grupos: GrupoClinico[]
): {
  texto: string;
  respostas: Record<string, Resposta>;
} {
  const valor = conteudo ?? "";

  if (!valor.startsWith(MARCADOR_INICIO)) {
    return {
      texto: valor,
      respostas: {}
    };
  }

  const respostas: Record<string, Resposta> = {};
  const linhas = valor.split("\n");

  for (const grupo of grupos) {
    for (const opcao of grupo.opcoes) {
      const prefixo = `[${opcao.id}] `;

      const linha = linhas.find((item) =>
        item.startsWith(prefixo)
      );

      if (linha?.endsWith(": Sim")) {
        respostas[opcao.id] = "Sim";
      } else if (linha?.endsWith(": Não")) {
        respostas[opcao.id] = "Não";
      }
    }
  }

  const posicao = valor.indexOf(MARCADOR_OBSERVACOES);

  return {
    texto: posicao >= 0
      ? valor.slice(
          posicao + MARCADOR_OBSERVACOES.length
        ).trim()
      : "",
    respostas
  };
}

// ========================================
// EXTRAIR INFORMAÇÕES POR MARCADORES
// ========================================

function extrairSecao(
  conteudo: string,
  inicio: string,
  fim?: string
): string {
  const posicao = conteudo.indexOf(inicio);

  if (posicao < 0) return "";

  const restante = conteudo.slice(
    posicao + inicio.length
  );

  if (!fim) return restante.trim();

  const posicaoFinal = restante.indexOf(fim);

  return posicaoFinal >= 0
    ? restante.slice(0, posicaoFinal).trim()
    : restante.trim();
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function FormularioProntuario({
  paciente,
  prontuarioAnterior = null,
  onSalvo,
  onCancelar,
  onAcessoExpirado
}: Propriedades) {

  // ========================================
  // ESTADOS CLÍNICOS
  // ========================================

  const [dados, setDados] =
    useState<DadosFormulario>({ ...DADOS_INICIAIS });

  const [respostas, setRespostas] =
    useState<Record<string, Resposta>>({});

  const [sinais, setSinais] =
    useState<SinaisVitais>({ ...SINAIS_INICIAIS });

  const [alergias, setAlergias] = useState("");
  const [cid, setCid] = useState("");

  const [
    prontuarioAnteriorId,
    setProntuarioAnteriorId
  ] = useState<number | null>(null);

  // ========================================
  // ESTADOS DA INTERFACE
  // ========================================

  const [visualizando, setVisualizando] =
    useState(false);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  // Controle do modal personalizado.
  const [modalCarregarAberto, setModalCarregarAberto] =
    useState(false);

  // Registra se o médico escolheu
  // explicitamente começar em branco.
  const [comecouEmBranco, setComecouEmBranco] =
    useState(false);

  // ========================================
  // RESET AO TROCAR PACIENTE
  // ========================================



  // ========================================
  // ALTERAR CAMPOS
  // ========================================

  function atualizarTexto(
    chave: CampoTexto,
    valor: string
  ) {
    setDados((anterior) => ({
      ...anterior,
      [chave]: valor
    }));
    setErro("");
  }

  function atualizarResposta(
    id: string,
    valor: Resposta
  ) {
    setRespostas((anterior) => ({
      ...anterior,
      [id]: valor
    }));
    setErro("");
  }

  function atualizarSinal(
    chave: SinalVital,
    valor: string
  ) {
    setSinais((anterior) => ({
      ...anterior,
      [chave]: valor
    }));
    setErro("");
  }

  // ========================================
  // VERIFICAR PREENCHIMENTO
  // ========================================

  function possuiPreenchimento(): boolean {
    return (
      Object.values(dados).some((valor) => !!valor.trim()) ||
      Object.values(respostas).some(Boolean) ||
      Object.values(sinais).some((valor) => !!valor.trim()) ||
      Boolean(alergias.trim()) ||
      Boolean(cid.trim())
    );
  }

  // ========================================
  // CONSTRUIR CONTEÚDO PARA A API
  // ========================================

  function gerarConteudo() {

    const antecedentesSelecionados =
      serializarGrupos(
        GRUPOS_ANTECEDENTES,
        respostas
      );

    const habitosSelecionados =
      serializarGrupos(
        GRUPOS_HABITOS,
        respostas
      );

    const possuiAntecedentes =
      antecedentesSelecionados.length > 0 ||
      habitosSelecionados.length > 0 ||
      Boolean(dados.antecedentes.trim()) ||
      Boolean(dados.medicamentos.trim()) ||
      Boolean(dados.habitos.trim()) ||
      Boolean(alergias.trim());

    const historiaPatologicaPregressa =
      possuiAntecedentes
        ? [
            MARCADOR_INICIO,
            ...antecedentesSelecionados,
            ...habitosSelecionados,
            "[medicamentos] Medicamentos em uso:",
            dados.medicamentos.trim() || "Não informado",
            "",
            "[alergias] Alergias:",
            alergias.trim() || "Não informado",
            "",
            "[habitos] Hábitos e observações:",
            dados.habitos.trim() || "Não informado",
            "",
            MARCADOR_OBSERVACOES,
            dados.antecedentes.trim()
          ].join("\n").trim()
        : null;

    const sinaisInformados = SINAIS_VITAIS
      .filter((item) => Boolean(sinais[item.id].trim()))
      .map((item) =>
        `${item.nome}: ${sinais[item.id].trim()} ${item.unidade}`
      );

    const fisicoSelecionado =
      serializarGrupos(
        GRUPOS_EXAME_FISICO,
        respostas
      );

    const possuiExameFisico =
      sinaisInformados.length > 0 ||
      fisicoSelecionado.length > 0 ||
      Boolean(dados.exameFisico.trim());

    const exameFisico =
      possuiExameFisico
        ? [
            MARCADOR_INICIO,
            MARCADOR_SINAIS,
            ...sinaisInformados,
            "",
            ...fisicoSelecionado,
            MARCADOR_OBSERVACOES,
            dados.exameFisico.trim()
          ].join("\n").trim()
        : null;

    const examesSelecionados =
      serializarGrupos(
        GRUPOS_EXAMES,
        respostas
      );

    const possuiExames =
      examesSelecionados.length > 0 ||
      Boolean(dados.examesComplementares.trim());

    const examesComplementares =
      possuiExames
        ? [
            MARCADOR_INICIO,
            ...examesSelecionados,
            MARCADOR_OBSERVACOES,
            dados.examesComplementares.trim()
          ].join("\n").trim()
        : null;

    const conduta = [
      MARCADOR_AVALIACAO,
      dados.avaliacaoClinica.trim(),
      "",
      MARCADOR_CID,
      cid.trim() || "Não informado",
      "",
      MARCADOR_CONDUTA,
      dados.conduta.trim(),
      "",
      MARCADOR_ORIENTACOES,
      dados.orientacoes.trim() || "Não informado"
    ].join("\n").trim();

    return {
      queixaPrincipal:
        textoOuNull(dados.queixaPrincipal),

      historiaMolestiaAtual:
        textoOuNull(dados.historiaMolestiaAtual),

      historiaPatologicaPregressa,
      exameFisico,
      examesComplementares,
      conduta,
      prontuarioAnteriorId
    };
  }

  // ========================================
  // VALIDAR FORMULÁRIO
  // ========================================

  function validarFormulario(): boolean {

    if (
      !Number.isSafeInteger(paciente.id) ||
      paciente.id <= 0 ||
      !paciente.nome.trim()
    ) {
      setErro("Selecione um paciente válido.");
      return false;
    }

    const obrigatorios = [
      {
        titulo: "Queixa principal",
        valor: dados.queixaPrincipal
      },
      {
        titulo: "História da doença atual",
        valor: dados.historiaMolestiaAtual
      },
      {
        titulo: "Avaliação clínica",
        valor: dados.avaliacaoClinica
      },
      {
        titulo: "Conduta médica",
        valor: dados.conduta
      }
    ];

    const faltantes = obrigatorios.filter(
      (item) => !item.valor.trim()
    );

    if (faltantes.length > 0) {
      setErro(
        "Preencha os campos obrigatórios: " +
        faltantes.map((item) => item.titulo).join(", ") +
        "."
      );
      return false;
    }

    const conteudo = gerarConteudo();

    const camposClinicos = [
      conteudo.queixaPrincipal,
      conteudo.historiaMolestiaAtual,
      conteudo.historiaPatologicaPregressa,
      conteudo.exameFisico,
      conteudo.examesComplementares,
      conteudo.conduta
    ];

    if (
      camposClinicos.some(
        (valor) => (valor?.length ?? 0) > 10000
      )
    ) {
      setErro(
        "Uma seção ultrapassou 10.000 caracteres."
      );
      return false;
    }

    const tamanho = new TextEncoder().encode(
      JSON.stringify(conteudo)
    ).length;

    if (tamanho > 8000) {
      setErro(
        "O prontuário ultrapassou o limite da API atual. " +
        "Reduza as observações antes de salvar."
      );
      return false;
    }

    return true;
  }

  // ========================================
  // LIMPAR FORMULÁRIO
  // ========================================

  function limparCampos() {
    setDados({ ...DADOS_INICIAIS });
    setRespostas({});
    setSinais({ ...SINAIS_INICIAIS });
    setAlergias("");
    setCid("");
    setProntuarioAnteriorId(null);
    setVisualizando(false);
    setErro("");
    setMensagem("");
  }

  // Botão "Começar em branco".
  function comecarEmBranco() {
    if (salvando) return;

    limparCampos();
    setComecouEmBranco(true);
  }

  // Botão "Limpar formulário".
  function limparFormulario() {
    if (salvando) return;

    // Evita apagar dados sem confirmação.
    if (possuiPreenchimento()) {
      setModalLimparAberto(true);
      return;
    }

    limparCampos();
  }

  // Modal para limpar preenchimento.
  const [modalLimparAberto, setModalLimparAberto] =
    useState(false);

  // ========================================
  // SOLICITAR CARREGAMENTO ANTERIOR
  // ========================================

  function solicitarDadosAnteriores() {
    if (salvando || !prontuarioAnterior) return;

    // Após começar em branco, sempre
    // mostramos o modal personalizado.
    //
    // Também confirmamos quando existem
    // informações digitadas que seriam
    // substituídas.
    if (comecouEmBranco || possuiPreenchimento()) {
      setModalCarregarAberto(true);
      return;
    }

    executarCarregamentoAnterior();
  }

  // ========================================
  // RECUPERAR PRONTUÁRIO ANTERIOR
  // ========================================

  function executarCarregamentoAnterior() {

    setModalCarregarAberto(false);

    if (!prontuarioAnterior) return;

    if (prontuarioAnterior.pacienteId !== paciente.id) {
      setErro(
        "O prontuário anterior não pertence ao paciente selecionado."
      );
      return;
    }

    const hpp =
      prontuarioAnterior.historiaPatologicaPregressa ?? "";

    const fisico =
      prontuarioAnterior.exameFisico ?? "";

    const exames =
      prontuarioAnterior.examesComplementares ?? "";

    const condutaAnterior =
      prontuarioAnterior.conduta ?? "";

    const antecedentesRecuperados =
      recuperarEstruturado(
        hpp,
        [...GRUPOS_ANTECEDENTES, ...GRUPOS_HABITOS]
      );

    const fisicoRecuperado =
      recuperarEstruturado(
        fisico,
        GRUPOS_EXAME_FISICO
      );

    const examesRecuperados =
      recuperarEstruturado(
        exames,
        GRUPOS_EXAMES
      );

    const possuiEstrutura =
      condutaAnterior.includes(MARCADOR_AVALIACAO) &&
      condutaAnterior.includes(MARCADOR_CONDUTA);

    const fimAvaliacao =
      condutaAnterior.includes(MARCADOR_CID)
        ? MARCADOR_CID
        : MARCADOR_CONDUTA;

    const avaliacaoAnterior =
      possuiEstrutura
        ? extrairSecao(
            condutaAnterior,
            MARCADOR_AVALIACAO,
            fimAvaliacao
          )
        : "";

    const cidAnterior =
      possuiEstrutura
        ? extrairSecao(
            condutaAnterior,
            MARCADOR_CID,
            MARCADOR_CONDUTA
          )
        : "";

    const condutaTexto =
      possuiEstrutura
        ? extrairSecao(
            condutaAnterior,
            MARCADOR_CONDUTA,
            MARCADOR_ORIENTACOES
          )
        : condutaAnterior;

    const orientacoesAnteriores =
      possuiEstrutura
        ? extrairSecao(
            condutaAnterior,
            MARCADOR_ORIENTACOES
          )
        : "";

    const medicamentosAnteriores = extrairSecao(
      hpp,
      "[medicamentos] Medicamentos em uso:",
      "[alergias] Alergias:"
    );

    const alergiasAnteriores = extrairSecao(
      hpp,
      "[alergias] Alergias:",
      "[habitos] Hábitos e observações:"
    );

    const habitosAnteriores = extrairSecao(
      hpp,
      "[habitos] Hábitos e observações:",
      MARCADOR_OBSERVACOES
    );

    // ====================================
    // RECUPERAR SINAIS VITAIS
    // ====================================

    const sinaisRecuperados: SinaisVitais = {
      ...SINAIS_INICIAIS
    };

    const secaoSinais = extrairSecao(
      fisico,
      MARCADOR_SINAIS,
      MARCADOR_OBSERVACOES
    );

    for (const campo of SINAIS_VITAIS) {
      const prefixo = `${campo.nome}: `;

      const linha = secaoSinais.split("\n").find(
        (item) => item.startsWith(prefixo)
      );

      if (!linha) continue;

      const valorComUnidade = linha
        .slice(prefixo.length)
        .trim();

      const sufixo = ` ${campo.unidade}`;

      sinaisRecuperados[campo.id] =
        valorComUnidade.endsWith(sufixo)
          ? valorComUnidade.slice(0, -sufixo.length)
          : valorComUnidade;
    }

    // ====================================
    // PREENCHER CAMPOS
    // ====================================

    setDados({
      queixaPrincipal:
        prontuarioAnterior.queixaPrincipal ?? "",

      historiaMolestiaAtual:
        prontuarioAnterior.historiaMolestiaAtual ?? "",

      antecedentes:
        antecedentesRecuperados.texto,

      medicamentos:
        limparNaoInformado(medicamentosAnteriores),

      habitos:
        limparNaoInformado(habitosAnteriores),

      exameFisico:
        fisicoRecuperado.texto,

      examesComplementares:
        examesRecuperados.texto,

      avaliacaoClinica:
        avaliacaoAnterior,

      conduta:
        condutaTexto,

      orientacoes:
        limparNaoInformado(orientacoesAnteriores)
    });

    setRespostas({
      ...antecedentesRecuperados.respostas,
      ...fisicoRecuperado.respostas,
      ...examesRecuperados.respostas
    });

    setSinais(sinaisRecuperados);

    setAlergias(
      limparNaoInformado(alergiasAnteriores)
    );

    setCid(
      limparNaoInformado(cidAnterior)
    );

    setProntuarioAnteriorId(
      prontuarioAnterior.id
    );

    setComecouEmBranco(false);
    setVisualizando(false);
    setErro("");

    setMensagem(
      `Dados do prontuário ${prontuarioAnterior.id} carregados. ` +
      "Revise as informações antes de salvar."
    );
  }

  // ========================================
  // PRÉ-VISUALIZAÇÃO
  // ========================================

  function abrirPrevia(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (salvando || !validarFormulario()) return;

    setErro("");
    setVisualizando(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  // ========================================
  // SALVAR PRONTUÁRIO
  // ========================================

  async function salvarProntuario() {

    if (salvando || !visualizando) return;

    if (!validarFormulario()) return;

    setSalvando(true);
    setErro("");

    try {
      const registro =
        await criarProntuarioClinicoApi(
          paciente.id,
          gerarConteudo()
        );

      onSalvo(registro);

    } catch (falha) {

      if (
        falha instanceof ErroApiProntuario &&
        (falha.status === 401 || falha.status === 403)
      ) {
        onAcessoExpirado();
        return;
      }

      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar o prontuário."
      );

    } finally {
      setSalvando(false);
    }
  }

  // ========================================
  // COMPONENTES VISUAIS
  // ========================================

  function renderizarGrupos(
    grupos: GrupoClinico[]
  ) {
    return grupos.map((grupo) => (
      <fieldset
        key={grupo.titulo}
        className="formulario-prontuario-grupo"
      >
        <legend>{grupo.titulo}</legend>

        <div className="formulario-prontuario-opcoes">
          {grupo.opcoes.map((opcao) => (
            <div
              key={opcao.id}
              className="formulario-prontuario-opcao"
            >
              <span>{opcao.nome}</span>

              <select
                aria-label={opcao.nome}
                value={respostas[opcao.id] ?? ""}
                disabled={salvando}
                onChange={(evento) => {
                  atualizarResposta(
                    opcao.id,
                    evento.target.value as Resposta
                  );
                }}
              >
                <option value="">Não informado</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
          ))}
        </div>
      </fieldset>
    ));
  }

  function campoTexto(
    chave: CampoTexto,
    titulo: string,
    linhas = 4,
    obrigatorio = false
  ) {
    return (
      <div className="formulario-prontuario-campo">
        <label
          htmlFor={`campo-${chave}`}
          className="formulario-prontuario-label"
        >
          {titulo}

          {obrigatorio && (
            <span className="formulario-prontuario-obrigatorio">
              {" "}*
            </span>
          )}
        </label>

        <textarea
          id={`campo-${chave}`}
          rows={linhas}
          maxLength={10000}
          value={dados[chave]}
          disabled={salvando}
          placeholder="Digite as informações..."
          onChange={(evento) => {
            atualizarTexto(
              chave,
              evento.target.value
            );
          }}
        />
      </div>
    );
  }

  // ========================================
  // PREPARAR PRÉ-VISUALIZAÇÃO
  // ========================================

  function obterSelecoesPreenchidas(
    grupos: GrupoClinico[]
  ): string[] {
    const linhas: string[] = [];

    for (const grupo of grupos) {
      const selecionadas = grupo.opcoes
        .filter((opcao) =>
          respostas[opcao.id] === "Sim" ||
          respostas[opcao.id] === "Não"
        )
        .map((opcao) =>
          `${opcao.nome}: ${respostas[opcao.id]}`
        );

      if (selecionadas.length > 0) {
        linhas.push(
          `${grupo.titulo}:`,
          ...selecionadas
        );
      }
    }

    return linhas;
  }

  function linhaOpcional(
    titulo: string,
    valor: string
  ): string[] {
    return valor.trim()
      ? [`${titulo}: ${valor.trim()}`]
      : [];
  }

  const sinaisPreenchidos = SINAIS_VITAIS
    .filter((item) => sinais[item.id].trim())
    .map((item) =>
      `${item.nome}: ${sinais[item.id].trim()} ${item.unidade}`
    );

  const camposPrevia: SecaoPrevia[] = [
    {
      numero: 1,
      titulo: "Queixa principal",
      linhas: dados.queixaPrincipal.trim()
        ? [dados.queixaPrincipal.trim()]
        : []
    },
    {
      numero: 2,
      titulo: "História da doença atual",
      linhas: dados.historiaMolestiaAtual.trim()
        ? [dados.historiaMolestiaAtual.trim()]
        : []
    },
    {
      numero: 3,
      titulo: "Antecedentes pessoais e familiares",
      linhas: [
        ...obterSelecoesPreenchidas(GRUPOS_ANTECEDENTES),
        ...linhaOpcional("Outros antecedentes", dados.antecedentes)
      ]
    },
    {
      numero: 4,
      titulo: "Medicamentos e alergias",
      linhas: [
        ...linhaOpcional("Medicamentos em uso", dados.medicamentos),
        ...linhaOpcional("Alergias", alergias)
      ]
    },
    {
      numero: 5,
      titulo: "Hábitos de vida",
      linhas: [
        ...obterSelecoesPreenchidas(GRUPOS_HABITOS),
        ...linhaOpcional("Observações", dados.habitos)
      ]
    },
    {
      numero: 6,
      titulo: "Sinais vitais",
      linhas: sinaisPreenchidos
    },
    {
      numero: 7,
      titulo: "Exame físico",
      linhas: [
        ...obterSelecoesPreenchidas(GRUPOS_EXAME_FISICO),
        ...linhaOpcional("Achados adicionais", dados.exameFisico)
      ]
    },
    {
      numero: 8,
      titulo: "Exames complementares",
      linhas: [
        ...obterSelecoesPreenchidas(GRUPOS_EXAMES),
        ...linhaOpcional(
          "Resultados e observações",
          dados.examesComplementares
        )
      ]
    },
    {
      numero: 9,
      titulo: "Avaliação clínica e hipótese diagnóstica",
      linhas: [
        ...linhaOpcional("Avaliação clínica", dados.avaliacaoClinica),
        ...linhaOpcional("CID", cid)
      ]
    },
    {
      numero: 10,
      titulo: "Conduta médica",
      linhas: dados.conduta.trim()
        ? [dados.conduta.trim()]
        : []
    },
    {
      numero: 11,
      titulo: "Orientações e retorno",
      linhas: dados.orientacoes.trim()
        ? [dados.orientacoes.trim()]
        : []
    }
  ].filter((secao) => secao.linhas.length > 0);

  // ========================================
  // EXPORTAR PDF
  // ========================================

  function exportarPdf() {
    if (salvando || !visualizando) return;
    if (!validarFormulario()) return;

    window.print();
  }

  // ========================================
  // INTERFACE
  // ========================================

  return (
    <div className="formulario-prontuario">

      {/* ====================================
          ÚNICO RESUMO DO REGISTRO ANTERIOR
      ==================================== */}

      {!visualizando && prontuarioAnterior && (
        <div className="formulario-prontuario-anterior-compacto">

          <div className="formulario-prontuario-anterior-info">
            <strong>
              Prontuário anterior {prontuarioAnterior.id}
            </strong>

            <span>
              {formatarData(prontuarioAnterior.createdAt)}
            </span>
          </div>

          <div className="formulario-prontuario-anterior-acoes">
            <button
              type="button"
              className="formulario-prontuario-secundario"
              onClick={comecarEmBranco}
              disabled={salvando}
            >
              Começar em branco
            </button>

            <button
              type="button"
              className="formulario-prontuario-primario"
              onClick={solicitarDadosAnteriores}
              disabled={salvando}
            >
              Carregar dados anteriores
            </button>
          </div>

        </div>
      )}

      {/* ====================================
          MENSAGENS
      ==================================== */}

      {mensagem && (
        <p className="prontuario-sucesso" role="status">
          {mensagem}
        </p>
      )}

      {erro && (
        <p
          className="formulario-prontuario-erro"
          role="alert"
        >
          {erro}
        </p>
      )}

      {/* ====================================
          FORMULÁRIO CLÍNICO
      ==================================== */}

      {!visualizando ? (
        <form onSubmit={abrirPrevia}>

          <SecaoRecolhivel
            numero={1}
            titulo="Queixa principal"
            obrigatorio
          >
            {campoTexto(
              "queixaPrincipal",
              "Queixa principal",
              3,
              true
            )}
          </SecaoRecolhivel>

          <SecaoRecolhivel
            numero={2}
            titulo="História da doença atual"
            obrigatorio
          >
            {campoTexto(
              "historiaMolestiaAtual",
              "História da doença atual",
              6,
              true
            )}
          </SecaoRecolhivel>

          <SecaoRecolhivel
            numero={3}
            titulo="Antecedentes pessoais e familiares"
          >
            {renderizarGrupos(GRUPOS_ANTECEDENTES)}

            {campoTexto(
              "antecedentes",
              "Outros antecedentes e observações",
              4
            )}
          </SecaoRecolhivel>

          <SecaoRecolhivel
            numero={4}
            titulo="Medicamentos e alergias"
          >
            {campoTexto(
              "medicamentos",
              "Medicamentos em uso, doses e frequência",
              4
            )}

            <div className="formulario-prontuario-campo">
              <label
                htmlFor="alergias-prontuario"
                className="formulario-prontuario-label"
              >
                Alergias e reações conhecidas
              </label>

              <textarea
                id="alergias-prontuario"
                rows={3}
                maxLength={3000}
                value={alergias}
                disabled={salvando}
                placeholder="Informe as alergias conhecidas..."
                onChange={(evento) => {
                  setAlergias(evento.target.value);
                  setErro("");
                }}
              />
            </div>
          </SecaoRecolhivel>

          <SecaoRecolhivel
            numero={5}
            titulo="Hábitos de vida"
          >
            {renderizarGrupos(GRUPOS_HABITOS)}

            {campoTexto(
              "habitos",
              "Observações sobre os hábitos",
              3
            )}
          </SecaoRecolhivel>

          <SecaoRecolhivel
            numero={6}
            titulo="Sinais vitais"
          >
            <div className="formulario-prontuario-sinais">
              {SINAIS_VITAIS.map((campo) => (
                <div
                  key={campo.id}
                  className="formulario-prontuario-sinal"
                >
                  <label htmlFor={`sinal-${campo.id}`}>
                    {campo.nome}
                    {" "}
                    <small>({campo.unidade})</small>
                  </label>

                  <input
                    id={`sinal-${campo.id}`}
                    type="text"
                    maxLength={30}
                    value={sinais[campo.id]}
                    placeholder={campo.exemplo}
                    disabled={salvando}
                    onChange={(evento) => {
                      atualizarSinal(
                        campo.id,
                        evento.target.value
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          </SecaoRecolhivel>

          <SecaoRecolhivel
            numero={7}
            titulo="Exame físico"
          >
            {renderizarGrupos(GRUPOS_EXAME_FISICO)}

            {campoTexto(
              "exameFisico",
              "Achados físicos adicionais",
              5
            )}
          </SecaoRecolhivel>

          <SecaoRecolhivel
            numero={8}
            titulo="Exames complementares"
          >
            {renderizarGrupos(GRUPOS_EXAMES)}

            {campoTexto(
              "examesComplementares",
              "Exames, resultados e observações",
              5
            )}
          </SecaoRecolhivel>

          <SecaoRecolhivel
            numero={9}
            titulo="Avaliação clínica e hipótese diagnóstica"
            obrigatorio
          >
            {campoTexto(
              "avaliacaoClinica",
              "Avaliação clínica / hipótese diagnóstica",
              5,
              true
            )}

            <div className="formulario-prontuario-campo">
              <label
                htmlFor="cid-prontuario"
                className="formulario-prontuario-label"
              >
                CID (opcional)
              </label>

              <input
                id="cid-prontuario"
                type="text"
                maxLength={30}
                value={cid}
                disabled={salvando}
                placeholder="Código CID"
                onChange={(evento) => {
                  setCid(evento.target.value);
                  setErro("");
                }}
              />
            </div>
          </SecaoRecolhivel>

          <SecaoRecolhivel
            numero={10}
            titulo="Conduta médica"
            obrigatorio
          >
            {campoTexto(
              "conduta",
              "Conduta médica",
              6,
              true
            )}
          </SecaoRecolhivel>

          <SecaoRecolhivel
            numero={11}
            titulo="Orientações e retorno"
          >
            {campoTexto(
              "orientacoes",
              "Orientações ao paciente e retorno",
              4
            )}
          </SecaoRecolhivel>

          <div className="formulario-prontuario-acoes">

            {/* Volta ao painel sem salvar o prontuário. */}
            <button
              type="button"
              className="formulario-prontuario-secundario"
              onClick={onCancelar}
              disabled={salvando}
            >
              Cancelar e voltar
            </button>

            <button
              type="button"
              className="formulario-prontuario-secundario"
              onClick={limparFormulario}
              disabled={salvando}
            >
              Limpar formulário
            </button>

            <button
              type="submit"
              className="formulario-prontuario-primario"
              disabled={salvando}
            >
              Pré-visualizar prontuário
            </button>

          </div>

        </form>
      ) : (

        /* ==================================
           PRÉ-VISUALIZAÇÃO
        ================================== */

        <div className="formulario-prontuario-previa">

          <div className="prontuario-documento-pdf">

            <header className="prontuario-documento-cabecalho">
              <div>
                <span className="prontuario-documento-sistema">
                  SISTEMA DE CONSULTÓRIO
                </span>

                <h2>PRONTUÁRIO MÉDICO</h2>

                <p>Documento clínico para conferência</p>
              </div>

              <span className="prontuario-documento-status">
                PRÉ-VISUALIZAÇÃO — NÃO SALVO
              </span>
            </header>

            <section className="prontuario-documento-identificacao">

              <div>
                <span>Paciente</span>
                <strong>{paciente.nome}</strong>
              </div>

              <div>
                <span>Data da pré-visualização</span>
                <strong>
                  {formatarData(new Date())}
                </strong>
              </div>

              {prontuarioAnteriorId !== null && (
                <div>
                  <span>Registro de referência</span>
                  <strong>
                    Prontuário {prontuarioAnteriorId}
                  </strong>
                </div>
              )}

            </section>

            <div className="prontuario-documento-corpo">
              {camposPrevia.map((secao) => (
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
                      <p key={`${secao.numero}-${indice}`}>
                        {linha}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <footer className="prontuario-documento-rodape">
              <p>
                Documento gerado para conferência.
                O registro ainda não foi salvo.
              </p>
            </footer>

          </div>

          <div className="prontuario-previa-acoes">

            <button
              type="button"
              className="formulario-prontuario-secundario"
              onClick={() => {
                setVisualizando(false);
              }}
              disabled={salvando}
            >
              Voltar e editar
            </button>

            <button
              type="button"
              className="prontuario-botao-pdf"
              onClick={exportarPdf}
              disabled={salvando}
            >
              Exportar PDF
            </button>

            <button
              type="button"
              className="formulario-prontuario-primario"
              onClick={() => {
                void salvarProntuario();
              }}
              disabled={salvando}
            >
              {salvando
                ? "Salvando prontuário..."
                : "Confirmar e salvar"}
            </button>

          </div>

        </div>
      )}

      {/* ====================================
          MODAL: CARREGAR DADOS ANTERIORES
      ==================================== */}

      {modalCarregarAberto && (
        <div
          className="formulario-prontuario-modal-overlay"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              setModalCarregarAberto(false);
            }
          }}
        >
          <div
            className="formulario-prontuario-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-carregar-titulo"
            aria-describedby="modal-carregar-descricao"
          >
            <div className="formulario-prontuario-modal-icone">
              <svg
                width="25"
                height="25"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 17v3h14v-3" />
              </svg>
            </div>

            <h3 id="modal-carregar-titulo">
              Carregar dados anteriores?
            </h3>

            <p id="modal-carregar-descricao">
              As informações do prontuário anterior
              serão carregadas neste formulário.
              Os campos preenchidos atualmente
              serão substituídos.
            </p>

            <p className="formulario-prontuario-modal-aviso">
              O registro anterior continuará
              salvo e não será modificado.
            </p>

            <div className="formulario-prontuario-modal-acoes">

              <button
                type="button"
                className="formulario-prontuario-secundario"
                onClick={() => {
                  setModalCarregarAberto(false);
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="formulario-prontuario-primario"
                onClick={executarCarregamentoAnterior}
              >
                Sim, carregar dados
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ====================================
          MODAL: LIMPAR FORMULÁRIO
      ==================================== */}

      {modalLimparAberto && (
        <div
          className="formulario-prontuario-modal-overlay"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              setModalLimparAberto(false);
            }
          }}
        >
          <div
            className="formulario-prontuario-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-limpar-titulo"
          >
            <h3 id="modal-limpar-titulo">
              Limpar formulário?
            </h3>

            <p>
              Todos os campos preenchidos neste
              atendimento serão apagados.
              Nenhum prontuário salvo será alterado.
            </p>

            <div className="formulario-prontuario-modal-acoes">
              <button
                type="button"
                className="formulario-prontuario-secundario"
                onClick={() => {
                  setModalLimparAberto(false);
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="formulario-prontuario-primario"
                onClick={() => {
                  limparCampos();
                  setModalLimparAberto(false);
                  setComecouEmBranco(true);
                }}
              >
                Sim, limpar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
