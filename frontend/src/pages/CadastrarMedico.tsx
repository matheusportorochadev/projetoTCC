// Dependências da página de cadastro
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cadastrarMedico } from "../services/api";
import "../styles/cadastrarMedico.css";

// ========================================
// ESTADOS BRASILEIROS
// ========================================

// Lista das UFs disponíveis para o CRM.
//
// O número do CRM e a UF ficam separados
// visualmente no formulário, mas serão
// unidos antes do envio ao backend.
const estados = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

// Formata automaticamente o nome.
//
// Exemplo:
//
// matheus porto rocha
//
// vira:
//
// Matheus Porto Rocha
function formatarNome(valor: string) {
  // Permite somente letras, acentos e espaços.
  const somenteLetras = valor.replace(
    /[^A-Za-zÀ-ÿ\s]/g,
    ""
  );

  // Primeiro deixa todo o texto em minúsculo.
  const minusculo =
    somenteLetras.toLocaleLowerCase("pt-BR");

  // Depois transforma a primeira letra
  // de cada palavra em maiúscula.
  return minusculo.replace(
    /(^|\s)([a-zà-ÿ])/g,
    (_, espaco, letra) =>
      `${espaco}${letra.toLocaleUpperCase("pt-BR")}`
  );
}

// Permite somente números no campo CRM.
//
// Exemplo:
//
// 123ABC456
//
// vira:
//
// 123456
function formatarNumeroCrm(valor: string) {
  return valor.replace(/\D/g, "");
}

// ========================================
// TELA DE CADASTRO DE MÉDICO
// ========================================

export default function CadastrarMedico() {
  const navigate = useNavigate();

  // ========================================
  // DADOS DO FORMULÁRIO
  // ========================================

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  // O CRM foi dividido em duas partes:
  //
  // crmNumero → número do registro
  // crmUf     → estado do CRM
  //
  // Antes de enviar ao backend,
  // os dois serão unidos.
  const [crmNumero, setCrmNumero] = useState("");
  const [crmUf, setCrmUf] = useState("");

  // ========================================
  // ESTADOS VISUAIS
  // ========================================

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // ========================================
  // VALIDAÇÃO DO FORMULÁRIO
  // ========================================

  function validarFormulario() {
    const nomeRegex = /^[A-Za-zÀ-ÿ\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const crmRegex = /^\d+$/;

    // -------------------------
    // NOME
    // -------------------------

    if (!nome.trim()) {
      throw new Error("O nome é obrigatório.");
    }

    if (!nomeRegex.test(nome.trim())) {
      throw new Error(
        "O nome deve conter apenas letras e espaços."
      );
    }

    // -------------------------
    // E-MAIL
    // -------------------------

    if (!emailRegex.test(email.trim())) {
      throw new Error(
        "Informe um e-mail válido."
      );
    }

    // -------------------------
    // CRM
    // -------------------------

    if (!crmNumero.trim()) {
      throw new Error(
        "O número do CRM é obrigatório."
      );
    }

    if (!crmRegex.test(crmNumero)) {
      throw new Error(
        "O CRM deve conter somente números."
      );
    }

    // -------------------------
    // UF DO CRM
    // -------------------------

    if (!crmUf) {
      throw new Error(
        "Selecione o estado do CRM."
      );
    }
  }

  // ========================================
  // CADASTRAR MÉDICO
  // ========================================

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    // Limpa mensagens anteriores.
    setMensagem("");
    setErro("");

    try {
      // Valida todos os campos.
      validarFormulario();

      setCarregando(true);

      // ========================================
      // MONTA O CRM COMPLETO
      // ========================================
      //
      // Exemplo:
      //
      // crmNumero = 123456
      // crmUf     = MG
      //
      // resultado:
      //
      // MG 123456
      //
      // O banco continua utilizando apenas
      // um campo chamado "crm".
      const crmCompleto =
        `${crmUf} ${crmNumero}`;

      // ========================================
      // ENVIA PARA O BACKEND
      // ========================================
      //
      // O ADMIN envia somente:
      //
      // nome
      // email
      // crm
      //
      // Não existe senha inicial.
      await cadastrarMedico(
        nome.trim(),
        email.trim().toLowerCase(),
        crmCompleto
      );

      // Mensagem de sucesso.
      setMensagem(
        "Médico cadastrado com sucesso. O médico deverá utilizar o Primeiro Acesso para criar sua senha."
      );

      // Limpa o formulário.
      setNome("");
      setEmail("");
      setCrmNumero("");
      setCrmUf("");
    } catch (erro) {
      setErro(
        erro instanceof Error
          ? erro.message
          : "Erro ao cadastrar médico."
      );
    } finally {
      setCarregando(false);
    }
  }

  // ========================================
  // INTERFACE
  // ========================================

  return (
    <div className="cadastro-medico-page">
      <div className="cadastro-medico-container">
        {/* ====================================
            CABEÇALHO
        ==================================== */}

        <div className="cadastro-medico-header">
          <div>
            <h1>Cadastrar médico</h1>

            <p>
              Adicione um novo profissional ao sistema
            </p>
          </div>

          <button
            className="btn-voltar"
            type="button"
            onClick={() =>
              navigate("/admin")
            }
          >
            Voltar
          </button>
        </div>

        {/* ====================================
            FORMULÁRIO
        ==================================== */}

        <form
          className="cadastro-medico-form"
          onSubmit={handleSubmit}
        >
          {/* ==================================
              NOME
          ================================== */}

          <div className="form-group">
            <label>Nome</label>

            <input
              type="text"
              value={nome}
              onChange={(event) =>
                setNome(
                  formatarNome(
                    event.target.value
                  )
                )
              }
              placeholder="Nome completo"
              minLength={3}
              maxLength={100}
              autoComplete="name"
              required
            />

            <small>
              O nome será formatado
              automaticamente.
            </small>
          </div>

          {/* ==================================
              E-MAIL
          ================================== */}

          <div className="form-group">
            <label>E-mail</label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="medico@email.com"
              maxLength={150}
              autoComplete="email"
              required
            />
          </div>

          {/* ==================================
              CRM
          ================================== */}

          <div className="form-group">
            <label>CRM</label>

            <div className="crm-campos">
              {/* Número do CRM */}
              <input
                className="crm-numero"
                type="text"
                value={crmNumero}
                onChange={(event) =>
                  setCrmNumero(
                    formatarNumeroCrm(
                      event.target.value
                    )
                  )
                }
                placeholder="123456"
                inputMode="numeric"
                pattern="[0-9]*"
                minLength={4}
                maxLength={10}
                required
              />

              {/* Estado do CRM */}
              <select
                className="crm-uf"
                value={crmUf}
                onChange={(event) =>
                  setCrmUf(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  UF
                </option>

                {estados.map((estado) => (
                  <option
                    key={estado}
                    value={estado}
                  >
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            <small>
              Informe o número do CRM e
              selecione o estado de registro.
            </small>
          </div>

          {/* ==================================
              PRIMEIRO ACESSO
          ================================== */}

          <div className="form-group">
            <small>
              O médico não receberá uma senha
              inicial. Após o cadastro, deverá
              utilizar a opção Primeiro Acesso
              para receber um código por e-mail
              e criar a própria senha.
            </small>
          </div>

          {/* ==================================
              ERRO
          ================================== */}

          {erro && (
            <p className="form-erro">
              {erro}
            </p>
          )}

          {/* ==================================
              SUCESSO
          ================================== */}

          {mensagem && (
            <p className="form-sucesso">
              {mensagem}
            </p>
          )}

          {/* ==================================
              BOTÃO
          ================================== */}

          <button
            className="btn-cadastrar"
            type="submit"
            disabled={carregando}
          >
            {carregando
              ? "Cadastrando..."
              : "Cadastrar médico"}
          </button>
        </form>
      </div>
    </div>
  );
}