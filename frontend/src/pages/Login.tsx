// ========================================
// TELA DE LOGIN
// ========================================

import {
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import BotaoTema
  from "../components/BotaoTema";

import CampoSenha
  from "../components/CampoSenha";

import "../styles/login.css";


// ========================================
// TIPOS
// ========================================

type TipoUsuario =
  | "ADMIN"
  | "MEDICO"
  | "PACIENTE";


type UsuarioLogin = {

  id: number;

  nome: string;

  email: string;

  tipo: TipoUsuario;

  ativo: boolean;

  primeiroAcesso: boolean;

};


type RespostaLogin = {

  usuario: UsuarioLogin;

  mensagem?: string;

};


// ========================================
// COMPONENTE
// ========================================

export default function Login() {

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
    senha,
    setSenha
  ] =
    useState("");


  const [
    mensagem,
    setMensagem
  ] =
    useState("");


  const [
    carregando,
    setCarregando
  ] =
    useState(false);


  // ========================================
  // LOGIN
  // ========================================

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    try {

      setMensagem("");

      setCarregando(
        true
      );


      // ========================================
      // VALIDAR CAMPOS
      // ========================================

      if (
        !email.trim() ||
        !senha
      ) {

        throw new Error(
          "Informe o e-mail e a senha."
        );

      }


      // ========================================
      // ENVIAR LOGIN PARA O BACKEND
      // ========================================

      const resposta =
        await fetch(
          "http://localhost:3000/auth/login",
          {

            method:
              "POST",


            /*
              Necessário para que o navegador
              receba e envie o cookie HttpOnly.
            */
            credentials:
              "include",


            headers: {

              "Content-Type":
                "application/json"

            },


            body:
              JSON.stringify({

                email:
                  email.trim(),

                senha

              })

          }
        );


      const dados:
        RespostaLogin & {
          mensagem?: string;
        } =
          await resposta.json();


      // ========================================
      // ERRO DE LOGIN
      // ========================================

      if (
        !resposta.ok
      ) {

        throw new Error(
          dados.mensagem ||
          "Erro ao realizar login."
        );

      }


      if (
        !dados.usuario
      ) {

        throw new Error(
          "Não foi possível iniciar a sessão."
        );

      }


      // ========================================
      // PRIMEIRO ACESSO LEGADO
      // ========================================

      /*
        Este trecho permanece para usuários
        antigos que ainda possam estar com
        primeiroAcesso = true.

        Novos pacientes utilizam a tela
        específica de Primeiro Acesso.
      */
      if (
        dados.usuario.primeiroAcesso
      ) {

        sessionStorage.setItem(
          "emailRedefinicao",
          dados.usuario.email
        );


        /*
          Limpeza de possíveis dados antigos
          de versões anteriores do sistema.
        */
        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "usuario"
        );


        navigate(
          "/redefinir-senha"
        );


        return;

      }


      // ========================================
      // DADOS VISUAIS DO USUÁRIO
      // ========================================

      /*
        O JWT NÃO é armazenado aqui.

        Ele permanece somente dentro do
        cookie HttpOnly criado pelo backend.

        O localStorage guarda apenas dados
        utilizados na interface.
      */
      localStorage.setItem(
        "usuario",
        JSON.stringify(
          dados.usuario
        )
      );


      // ========================================
      // REDIRECIONAMENTO POR PERFIL
      // ========================================


      // ADMIN

      if (
        dados.usuario.tipo ===
        "ADMIN"
      ) {

        navigate(
          "/admin"
        );

        return;

      }


      // MÉDICO

      if (
        dados.usuario.tipo ===
        "MEDICO"
      ) {

        navigate(
          "/medico"
        );

        return;

      }


      // PACIENTE

      if (
        dados.usuario.tipo ===
        "PACIENTE"
      ) {

        navigate(
          "/paciente"
        );

        return;

      }


      throw new Error(
        "Tipo de usuário não reconhecido."
      );

    } catch (erro) {

      setMensagem(

        erro instanceof Error
          ? erro.message
          : "Erro ao realizar login."

      );

    } finally {

      setCarregando(
        false
      );

    }

  }


  // ========================================
  // INTERFACE
  // ========================================

  return (

    <div className="login-container">


      {/* ========================================
          NAVBAR
      ======================================== */}

      <header className="login-navbar">

        <div className="login-navbar-brand">

          <span className="login-navbar-logo">
            +
          </span>


          <span className="login-navbar-nome">
            Sistema Médico
          </span>

        </div>


        {/* ÚNICA FUNÇÃO DA NAVBAR:
            TEMA CLARO / ESCURO */}

        <div className="login-navbar-tema">

          <BotaoTema />

        </div>

      </header>


      {/* ========================================
          CONTEÚDO
      ======================================== */}

      <main className="login-page">

        <div className="login-card">


          {/* ========================================
              CABEÇALHO
          ======================================== */}

          <div className="login-header">

            <h1>
              Sistema Médico
            </h1>


            <p>
              Entre com seus dados para
              acessar o sistema
            </p>

          </div>


          {/* ========================================
              FORMULÁRIO
          ======================================== */}

          <form
            onSubmit={
              handleSubmit
            }
            className="login-form"
          >


            {/* ========================================
                E-MAIL
            ======================================== */}

            <div className="form-group">

              <label
                htmlFor="email"
              >
                E-mail
              </label>


              <input
                id="email"
                type="email"
                placeholder="Digite seu e-mail"
                value={
                  email
                }
                onChange={(event) =>

                  setEmail(
                    event.target.value
                  )

                }
                autoComplete="email"
                required
                disabled={
                  carregando
                }
              />

            </div>


            {/* ========================================
                SENHA COM OLHINHO
            ======================================== */}

            <CampoSenha
              id="senha"
              label="Senha"
              placeholder="Digite sua senha"
              value={
                senha
              }
              onChange={
                setSenha
              }
              required
              disabled={
                carregando
              }
              autoComplete="current-password"
            />


            {/* ========================================
                MENSAGEM
            ======================================== */}

            {
              mensagem && (

                <div
                  className="
                    login-message
                    login-message-error
                  "
                >

                  {mensagem}

                </div>

              )
            }


            {/* ========================================
                ENTRAR
            ======================================== */}

            <button
              type="submit"
              className="login-button"
              disabled={
                carregando
              }
            >

              {
                carregando
                  ? "Entrando..."
                  : "Entrar"
              }

            </button>


            {/* ========================================
                LINKS
            ======================================== */}

            <div className="login-links">

              <button
                type="button"
                className="
                  login-link-button
                  login-link-primary
                "
                onClick={() =>
                  navigate(
                    "/primeiro-acesso"
                  )
                }
                disabled={
                  carregando
                }
              >
                Primeiro acesso
              </button>


              <button
                type="button"
                className="login-link-button"
                onClick={() =>
                  navigate(
                    "/esqueci-senha"
                  )
                }
                disabled={
                  carregando
                }
              >
                Esqueci minha senha
              </button>

            </div>

          </form>

        </div>

      </main>

    </div>

  );

}