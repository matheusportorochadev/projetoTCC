// Página para solicitar código de redefinição de senha
import { useState } from "react";

function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  async function solicitarCodigo() {
    setMensagem("");
    setErro("");

    try {
      const resposta = await fetch(
        "http://localhost:3000/auth/esqueci-senha",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email
          })
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.mensagem);
      }

      setMensagem(
        "Código enviado para seu e-mail."
      );
    } catch (erro) {
      const mensagemErro =
        erro instanceof Error
          ? erro.message
          : "Erro ao solicitar código.";

      setErro(mensagemErro);
    }
  }

  return (
    <div>
      <h1>Esqueci minha senha</h1>

      <p>
        Informe seu e-mail para receber o código de redefinição.
      </p>

      <input
        type="email"
        placeholder="Digite seu e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button onClick={solicitarCodigo}>
        Enviar código
      </button>

      {mensagem && <p>{mensagem}</p>}
      {erro && <p>{erro}</p>}
    </div>
  );
}

export default EsqueciSenha;