// ========================================
// ESQUECI MINHA SENHA
// ========================================

import {
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import "../styles/login.css";


// ========================================
// COMPONENTE
// ========================================

function EsqueciSenha() {

  const navigate =
    useNavigate();


  // ========================================
  // ESTADOS
  // ========================================

  const [
    email,
    setEmail
  ] =
    useState("");


  const [
    mensagem,
    setMensagem
  ] =
    useState("");


  const [
    erro,
    setErro
  ] =
    useState("");


  const [
    carregando,
    setCarregando
  ] =
    useState(false);


  // ========================================
  // SOLICITAR CÓDIGO
  // ========================================

  async function solicitarCodigo() {

    setMensagem("");
    setErro("");


    // ========================================
    // VALIDAR E-MAIL
    // ========================================

    if (
      !email.trim()
    ) {

      setErro(
        "Informe seu e-mail."
      );

      return;

    }


    try {

      setCarregando(
        true
      );


      // ========================================
      // ENVIAR SOLICITAÇÃO
      // ========================================

      const resposta =
        await fetch(
          "http://localhost:3000/auth/esqueci-senha",
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify({

                email:
                  email.trim()

              })

          }
        );


      const dados =
        await resposta.json();


      // ========================================
      // TRATAR ERRO
      // ========================================

      if (
        !resposta.ok
      ) {

        throw new Error(
          dados.mensagem ||
          "Não foi possível enviar o código."
        );

      }


      // ========================================
      // SALVAR E-MAIL TEMPORARIAMENTE
      // ========================================

      /*
        A próxima tela utiliza esse e-mail
        para concluir a redefinição da senha.
      */
      sessionStorage.setItem(
        "emailRedefinicao",
        email.trim()
      );


      // ========================================
      // MENSAGEM DE SUCESSO
      // ========================================

      setMensagem(
        dados.mensagem ||
        "Código enviado com sucesso."
      );


      // ========================================
      // IR PARA REDEFINIÇÃO
      // ========================================

      navigate(
        "/redefinir-senha"
      );

    } catch (erro) {

      // ========================================
      // TRATAR ERRO
      // ========================================

      setErro(

        erro instanceof Error
          ? erro.message
          : "Erro ao solicitar código."

      );

    } finally {

      setCarregando(
        false
      );

    }

  }


  // ========================================
  // ENVIAR FORMULÁRIO
  // ========================================

  function enviarFormulario(
    evento:
      React.FormEvent<HTMLFormElement>
  ) {

    evento.preventDefault();

    solicitarCodigo();

  }


  // ========================================
  // INTERFACE
  // ========================================

  return (

    <div className="login-page">

      <div
        className="
          login-card
          recuperacao-card
        "
      >


        {/* ========================================
            CABEÇALHO
        ======================================== */}

        <div className="login-header">

          <span className="recuperacao-etapa">
            Recuperação de acesso
          </span>


          <h1>
            Esqueceu sua senha?
          </h1>


          <p>
            Informe o e-mail cadastrado
            para receber um código de
            redefinição de senha.
          </p>

        </div>


        {/* ========================================
            INFORMAÇÃO
        ======================================== */}

        <div className="recuperacao-aviso">

          <div>

            <strong>
              Código de recuperação
            </strong>


            <span>
              Enviaremos um código temporário
              para o endereço de e-mail
              cadastrado no sistema.
            </span>

          </div>

        </div>


        {/* ========================================
            FORMULÁRIO
        ======================================== */}

        <form
          className="login-form"
          onSubmit={
            enviarFormulario
          }
        >


          {/* ========================================
              E-MAIL
          ======================================== */}

          <div className="recuperacao-campo">

            <label
              htmlFor="email"
            >
              E-mail cadastrado
            </label>


            <div className="recuperacao-input-container">

              <input
                id="email"
                type="email"
                placeholder="Digite seu e-mail"
                value={
                  email
                }
                onChange={(evento) =>

                  setEmail(
                    evento.target.value
                  )

                }
                autoComplete="email"
                disabled={
                  carregando
                }
              />

            </div>

          </div>


          {/* ========================================
              ERRO
          ======================================== */}

          {
            erro && (

              <div
                className="
                  login-message
                  login-message-error
                "
              >

                {erro}

              </div>

            )
          }


          {/* ========================================
              SUCESSO
          ======================================== */}

          {
            mensagem && (

              <div
                className="
                  login-message
                  login-message-success
                "
              >

                {mensagem}

              </div>

            )
          }


          {/* ========================================
              ENVIAR CÓDIGO
          ======================================== */}

          <button
            type="submit"
            className="
              login-button
              recuperacao-botao
            "
            disabled={
              carregando
            }
          >

            {
              carregando
                ? "Enviando código..."
                : "Enviar código de recuperação"
            }

          </button>


          {/* ========================================
              VOLTAR PARA LOGIN
          ======================================== */}

          <div className="recuperacao-voltar">

            <span>
              Lembrou sua senha?
            </span>


            <button
              type="button"
              className="
                login-link-button
                recuperacao-link-voltar
              "
              onClick={() =>

                navigate(
                  "/login"
                )

              }
              disabled={
                carregando
              }
            >

              Voltar para o login

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}


export default EsqueciSenha;