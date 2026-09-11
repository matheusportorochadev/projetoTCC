// Dependências da página de cadastro
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cadastrarMedico } from "../services/api";
import "../styles/cadastrarMedico.css";

// Tela de cadastro de médico
export default function CadastrarMedico() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [crm, setCrm] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Valida os dados do formulário
  function validarFormulario() {
    const nomeRegex = /^[A-Za-zÀ-ÿ\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const senhaRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!nome.trim()) {
      throw new Error("O nome é obrigatório.");
    }

    if (!nomeRegex.test(nome.trim())) {
      throw new Error(
        "O nome deve conter apenas letras e espaços."
      );
    }

    if (!emailRegex.test(email.trim())) {
      throw new Error("Informe um e-mail válido.");
    }

    if (!crm.trim()) {
      throw new Error("O CRM é obrigatório.");
    }

    if (!senhaRegex.test(senha)) {
      throw new Error(
        "A senha deve ter no mínimo 8 caracteres, com letra maiúscula, letra minúscula, número e caractere especial."
      );
    }
  }

  // Envia os dados para o backend
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setMensagem("");
    setErro("");

    try {
      validarFormulario();

      setCarregando(true);

      await cadastrarMedico(
        nome.trim(),
        email.trim().toLowerCase(),
        senha,
        crm.trim()
      );

      setMensagem("Médico cadastrado com sucesso.");

      setNome("");
      setEmail("");
      setSenha("");
      setCrm("");
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

  return (
    <div className="cadastro-medico-page">
      <div className="cadastro-medico-container">
        <div className="cadastro-medico-header">
          <div>
            <h1>Cadastrar médico</h1>
            <p>Adicione um novo profissional ao sistema</p>
          </div>

          <button
            className="btn-voltar"
            onClick={() => navigate("/admin")}
          >
            Voltar
          </button>
        </div>

        <form
          className="cadastro-medico-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label>Nome</label>

            <input
              type="text"
              value={nome}
              onChange={(event) =>
                setNome(
                  event.target.value.replace(
                    /[^A-Za-zÀ-ÿ\s]/g,
                    ""
                  )
                )
              }
              placeholder="Nome completo"
              minLength={3}
              maxLength={100}
              required
            />
          </div>

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
              required
            />
          </div>

          <div className="form-group">
            <label>CRM</label>

            <input
              type="text"
              value={crm}
              onChange={(event) =>
                setCrm(event.target.value)
              }
              placeholder="Ex: MG 123456"
              minLength={4}
              maxLength={20}
              required
            />
          </div>

          <div className="form-group">
            <label>Senha inicial</label>

            <input
              type="password"
              value={senha}
              onChange={(event) =>
                setSenha(event.target.value)
              }
              placeholder="Digite uma senha inicial"
              minLength={8}
              maxLength={100}
              required
            />

            <small>
              Mínimo 8 caracteres, com letra maiúscula,
              minúscula, número e caractere especial.
            </small>
          </div>

          {erro && (
            <p className="form-erro">{erro}</p>
          )}

          {mensagem && (
            <p className="form-sucesso">{mensagem}</p>
          )}

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