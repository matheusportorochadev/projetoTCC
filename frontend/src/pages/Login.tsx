// Tela de login do sistema
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fazerLogin } from "../services/api";
import "../styles/login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();

  // Solicita o código para o primeiro acesso
  async function solicitarCodigoRedefinicao(
    emailUsuario: string
  ) {
    const resposta = await fetch(
      "http://localhost:3000/auth/esqueci-senha",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: emailUsuario
        })
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.mensagem || "Erro ao enviar código."
      );
    }
  }

  // Envia os dados de login para o backend
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setCarregando(true);
      setMensagem("");

      const dados = await fazerLogin(
        email.trim().toLowerCase(),
        senha
      );

      // Verifica o primeiro acesso do médico
      if (
        dados.usuario.tipo === "MEDICO" &&
        dados.usuario.primeiroAcesso === true
      ) {
        setMensagem(
          "Primeiro acesso identificado. Enviando código para seu e-mail..."
        );

        await solicitarCodigoRedefinicao(
          dados.usuario.email
        );

        // Guarda somente o e-mail durante a redefinição
        sessionStorage.setItem(
          "emailRedefinicao",
          dados.usuario.email
        );

        navigate("/redefinir-senha");
        return;
      }

      // Salva os dados da sessão após login normal
      localStorage.setItem(
        "token",
        dados.token
      );

      localStorage.setItem(
        "usuario",
        JSON.stringify(dados.usuario)
      );

      // Redireciona o administrador
      if (dados.usuario.tipo === "ADMIN") {
        navigate("/admin");
        return;
      }

      // Redireciona o médico
      if (dados.usuario.tipo === "MEDICO") {
        navigate("/medico");
        return;
      }

      setMensagem(
        "Login realizado com sucesso."
      );
    } catch (erro) {
      const mensagemErro =
        erro instanceof Error
          ? erro.message
          : "Erro ao realizar login.";

      setMensagem(mensagemErro);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Sistema Médico</h1>

          <p>
            Entre com seus dados para acessar o sistema
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >
          <div className="form-group">
            <label htmlFor="email">
              E-mail
            </label>

            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">
              Senha
            </label>

            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(event) =>
                setSenha(event.target.value)
              }
              required
            />
          </div>

          {mensagem && (
            <p className="login-message">
              {mensagem}
            </p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={carregando}
          >
            {carregando
              ? "Entrando..."
              : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}