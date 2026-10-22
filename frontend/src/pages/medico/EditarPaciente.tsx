import { API_ORIGIN } from "../../config/api";

import {
  useEffect,
  useState,
  type FormEvent
} from "react";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import "../../styles/pacientes.css";

// ========================================
// TIPOS
// ========================================

// Representa os dados cadastrais recebidos
// da API de pacientes.
type Paciente = {
  id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  cpf?: string | null;
};

// Representa somente os campos que
// podem ser enviados para atualização.
type AlteracoesPaciente = {
  nome?: string;
  email?: string;
  telefone?: string;
  cpf?: string;
};

// ========================================
// FORMATAR CPF
// ========================================

function formatarCpf(valor: string) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// ========================================
// FORMATAR TELEFONE
// ========================================

function formatarTelefone(valor: string) {
  const numeros = valor
    .replace(/\D/g, "")
    .slice(0, 11);

  if (numeros.length <= 10) {
    return numeros
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return numeros
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

// ========================================
// COMPONENTE EDITAR PACIENTE
// ========================================

export default function EditarPaciente() {
  const navigate = useNavigate();

  // Obtém o ID informado na URL:
  // /medico/pacientes/:id
  const { id } = useParams();

  // ========================================
  // ESTADOS DO FORMULÁRIO
  // ========================================

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");

  // Guarda os dados carregados inicialmente.
  // Isso permite identificar quais campos
  // foram realmente alterados.
  const [pacienteOriginal, setPacienteOriginal] =
    useState<Paciente | null>(null);

  // ========================================
  // ESTADOS DE CONTROLE
  // ========================================

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState("");

  // ========================================
  // BUSCAR PACIENTE
  // ========================================

  useEffect(() => {
    // Permite cancelar a requisição
    // caso o usuário saia da página.
    const controller = new AbortController();

    async function carregarPaciente() {
      try {
        setCarregando(true);
        setErro("");
        setPacienteOriginal(null);

        const pacienteId = Number(id);

        // Impede consultas com IDs inválidos.
        if (
          !Number.isSafeInteger(pacienteId) ||
          pacienteId <= 0
        ) {
          throw new Error(
            "Identificador do paciente inválido."
          );
        }

        // O backend utiliza a sessão
        // autenticada por cookie.
        const resposta = await fetch(
          `${API_ORIGIN}/pacientes/${pacienteId}`,
          {
            method: "GET",
            credentials: "include",
            signal: controller.signal
          }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados.mensagem ||
              "Erro ao carregar paciente."
          );
        }

        // Compatibilidade com retorno direto
        // ou dentro da propriedade paciente.
        const paciente: Paciente =
          dados.paciente ?? dados;

        // Verifica se a resposta corresponde
        // ao paciente solicitado.
        if (
          Number(paciente.id) !== pacienteId ||
          typeof paciente.nome !== "string"
        ) {
          throw new Error(
            "Dados do paciente inválidos."
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        // Salva os dados originais.
        setPacienteOriginal(paciente);

        // Preenche os campos do formulário.
        setNome(paciente.nome);

        setEmail(
          paciente.email ?? ""
        );

        setTelefone(
          formatarTelefone(
            paciente.telefone ?? ""
          )
        );

        setCpf(
          formatarCpf(
            paciente.cpf ?? ""
          )
        );
      } catch (falha) {
        if (controller.signal.aborted) {
          return;
        }

        setErro(
          falha instanceof Error
            ? falha.message
            : "Erro ao carregar paciente."
        );
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    carregarPaciente();

    // Cancela requisição pendente
    // ao desmontar o componente.
    return () => {
      controller.abort();
    };
  }, [id]);

  // ========================================
  // SALVAR ALTERAÇÕES
  // ========================================

  async function salvarAlteracoes(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    // Não permite salvar antes
    // de carregar o paciente.
    if (!pacienteOriginal || salvando) {
      return;
    }

    try {
      setErro("");
      setSalvando(true);

      // ========================================
      // NORMALIZAR VALORES
      // ========================================

      const nomeAtual =
        nome.trim();

      const emailAtual =
        email.trim();

      const telefoneAtual =
        telefone.replace(/\D/g, "");

      const cpfAtual =
        cpf.replace(/\D/g, "");

      // ========================================
      // VALIDAR CAMPOS
      // ========================================

      if (nomeAtual.length < 3) {
        throw new Error(
          "Informe o nome completo do paciente."
        );
      }

      if (
        cpfAtual &&
        cpfAtual.length !== 11
      ) {
        throw new Error(
          "Informe um CPF com 11 dígitos."
        );
      }

      if (
        telefoneAtual &&
        telefoneAtual.length < 10
      ) {
        throw new Error(
          "Informe um telefone válido."
        );
      }

      // ========================================
      // IDENTIFICAR ALTERAÇÕES
      // ========================================

      // O PATCH enviará somente os
      // campos que realmente mudaram.
      const alteracoes: AlteracoesPaciente = {};

      if (
        nomeAtual !==
        pacienteOriginal.nome.trim()
      ) {
        alteracoes.nome = nomeAtual;
      }

      if (
        emailAtual !==
        (pacienteOriginal.email ?? "").trim()
      ) {
        alteracoes.email = emailAtual;
      }

      if (
        telefoneAtual !==
        (pacienteOriginal.telefone ?? "")
          .replace(/\D/g, "")
      ) {
        alteracoes.telefone = telefoneAtual;
      }

      if (
        cpfAtual !==
        (pacienteOriginal.cpf ?? "")
          .replace(/\D/g, "")
      ) {
        alteracoes.cpf = cpfAtual;
      }

      // Se não houve nenhuma alteração,
      // retorna à lista sem enviar PATCH.
      if (
        Object.keys(alteracoes).length === 0
      ) {
        navigate("/medico/pacientes");
        return;
      }

      // ========================================
      // ATUALIZAR NO BACKEND
      // ========================================

      const resposta = await fetch(
        `${API_ORIGIN}/pacientes/${pacienteOriginal.id}`,
        {
          method: "PATCH",

          credentials: "include",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(alteracoes)
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Erro ao atualizar paciente."
        );
      }

      // ========================================
      // RETORNAR À LISTA
      // ========================================

      navigate("/medico/pacientes");
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Erro ao atualizar paciente."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ========================================
  // TELA DE CARREGAMENTO
  // ========================================

  if (carregando) {
    return (
      <div className="pacientes-pagina">
        <div className="novo-paciente-conteudo">
          <p>
            Carregando dados do paciente...
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // ERRO AO BUSCAR PACIENTE
  // ========================================

  if (!pacienteOriginal) {
    return (
      <div className="pacientes-pagina">
        <div className="novo-paciente-conteudo">
          <div className="novo-paciente-cabecalho">
            <h1>Editar paciente</h1>
          </div>

          <div className="pacientes-erro">
            {erro || "Paciente não encontrado."}
          </div>

          <div className="formulario-acoes">
            <button
              type="button"
              className="botao-cancelar"
              onClick={() =>
                navigate("/medico/pacientes")
              }
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // FORMULÁRIO DE EDIÇÃO
  // ========================================

  return (
    <div className="pacientes-pagina">
      <div className="novo-paciente-conteudo">

        {/* CABEÇALHO */}

        <div className="novo-paciente-cabecalho">
          <h1>Editar paciente</h1>

          <p>
            Atualize os dados cadastrais
            do paciente.
          </p>
        </div>

        {/* FORMULÁRIO */}

        <form
          className="paciente-formulario"
          onSubmit={salvarAlteracoes}
        >
          {/* MENSAGEM DE ERRO */}

          {erro && (
            <div className="pacientes-erro">
              {erro}
            </div>
          )}

          {/* NOME */}

          <div className="formulario-campo">
            <label htmlFor="nome">
              Nome *
            </label>

            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(event) =>
                setNome(event.target.value)
              }
              placeholder="Nome completo"
              required
            />
          </div>

          {/* CPF E TELEFONE */}

          <div className="formulario-linha">

            {/* CPF */}

            <div className="formulario-campo">
              <label htmlFor="cpf">
                CPF
              </label>

              <input
                id="cpf"
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(event) =>
                  setCpf(
                    formatarCpf(
                      event.target.value
                    )
                  )
                }
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            {/* TELEFONE */}

            <div className="formulario-campo">
              <label htmlFor="telefone">
                Celular
              </label>

              <input
                id="telefone"
                type="text"
                inputMode="numeric"
                value={telefone}
                onChange={(event) =>
                  setTelefone(
                    formatarTelefone(
                      event.target.value
                    )
                  )
                }
                placeholder="(34) 99999-9999"
                maxLength={15}
              />
            </div>
          </div>

          {/* E-MAIL */}

          <div className="formulario-campo">
            <label htmlFor="email">
              E-mail
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="paciente@email.com"
            />
          </div>

          {/* BOTÕES */}

          <div className="formulario-acoes">

            {/* CANCELAR */}

            <button
              type="button"
              className="botao-cancelar"
              onClick={() =>
                navigate("/medico/pacientes")
              }
              disabled={salvando}
            >
              Cancelar
            </button>

            {/* SALVAR */}

            <button
              type="submit"
              className="botao-salvar"
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : "Salvar alterações"}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}
