// Tela de redefinição de senha
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RedefinirSenha() {
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();

  const email = sessionStorage.getItem("emailRedefinicao");

  // Valida a nova senha
  function validarSenha() {
    const senhaRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!senhaRegex.test(novaSenha)) {
      throw new Error(
        "A senha deve ter no mínimo 8 caracteres, com letra maiúscula, letra minúscula, número e caractere especial."
      );
    }

    if (novaSenha !== confirmarSenha) {
      throw new Error(
        "As senhas informadas não são iguais."
      );
    }
  }

  // Envia o código e a nova senha para o backend
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setMensagem("");

      if (!email) {
        throw new Error(
          "E-mail de redefinição não encontrado."
        );
      }

      if (!/^\d{6}$/.test(codigo)) {
        throw new Error(
          "O código deve conter exatamente 6 números."
        );
      }

      validarSenha();

      setCarregando(true);

      const resposta = await fetch(
        "http://localhost:3000/auth/redefinir-senha",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            codigo,
            novaSenha
          })
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Erro ao redefinir senha."
        );
      }

      sessionStorage.removeItem(
        "emailRedefinicao"
      );

      alert(
        "Senha redefinida com sucesso. Faça login novamente."
      );

      navigate("/login");
    } catch (erro) {
      const mensagemErro =
        erro instanceof Error
          ? erro.message
          : "Erro ao redefinir senha.";

      setMensagem(mensagemErro);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Primeiro acesso</h1>

          <p>
            Digite o código enviado para seu e-mail e crie sua nova senha.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >
          <div className="form-group">
            <label htmlFor="codigo">
              Código
            </label>

            <input
              id="codigo"
              type="text"
              inputMode="numeric"
              placeholder="Código de 6 dígitos"
              value={codigo}
              onChange={(event) =>
                setCodigo(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              minLength={6}
              maxLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="novaSenha">
              Nova senha
            </label>

            <input
              id="novaSenha"
              type="password"
              placeholder="Digite sua nova senha"
              value={novaSenha}
              onChange={(event) =>
                setNovaSenha(event.target.value)
              }
              minLength={8}
              maxLength={100}
              required
            />

            <small>
              Mínimo 8 caracteres, com letra maiúscula,
              minúscula, número e caractere especial.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmarSenha">
              Confirmar nova senha
            </label>

            <input
              id="confirmarSenha"
              type="password"
              placeholder="Digite novamente sua nova senha"
              value={confirmarSenha}
              onChange={(event) =>
                setConfirmarSenha(event.target.value)
              }
              minLength={8}
              maxLength={100}
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
              ? "Redefinindo..."
              : "Redefinir senha"}
          </button>
        </form>
      </div>
    </div>
  );
}