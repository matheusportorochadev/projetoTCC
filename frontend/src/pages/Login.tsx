// ========================================
// TELA DE LOGIN DO SISTEMA
// ========================================

import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { fazerLogin } from "../services/api";

import "../styles/login.css";


export default function Login() {
  // ========================================
  // ESTADOS DO FORMULÁRIO
  // ========================================

  // Armazena o e-mail digitado.
  const [email, setEmail] =
    useState("");

  // Armazena a senha digitada.
  const [senha, setSenha] =
    useState("");

  // Armazena mensagens de erro ou informação.
  const [mensagem, setMensagem] =
    useState("");

  // Controla o estado do botão enquanto
  // o login está sendo processado.
  const [carregando, setCarregando] =
    useState(false);


  // ========================================
  // NAVEGAÇÃO
  // ========================================

  // Permite redirecionar o usuário
  // para outras páginas.
  const navigate =
    useNavigate();


  // ========================================
  // REALIZAR LOGIN
  // ========================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    // Impede o recarregamento padrão do formulário.
    event.preventDefault();


    try {
      // Ativa o estado de carregamento.
      setCarregando(true);

      // Limpa mensagens anteriores.
      setMensagem("");


      // ========================================
      // ENVIAR LOGIN PARA O BACKEND
      // ========================================

      const dados =
        await fazerLogin(
          email
            .trim()
            .toLowerCase(),

          senha
        );


      // ========================================
      // PRIMEIRO ACESSO
      // ========================================

      /*
        Essa verificação vale tanto para:

        - MEDICO
        - PACIENTE

        Se primeiroAcesso for true,
        o backend já envia o código
        de redefinição por e-mail.

        Depois disso, enviamos o usuário
        para a tela de criação da nova senha.
      */
      if (
        dados.usuario.primeiroAcesso ===
        true
      ) {
        // Guarda temporariamente o e-mail.

        /*
          Esse e-mail será utilizado pela
          página RedefinirSenha.tsx.

          sessionStorage é usado porque
          precisamos manter esse dado apenas
          durante essa sessão.
        */
        sessionStorage.setItem(
          "emailRedefinicao",
          dados.usuario.email
        );


        // Redireciona para a página
        // de primeiro acesso.
        navigate(
          "/redefinir-senha"
        );


        // Interrompe a função para evitar
        // o login normal antes da redefinição.
        return;
      }


      // ========================================
      // LOGIN NORMAL
      // ========================================

      /*
        Se primeiroAcesso for false,
        o usuário já possui sua própria senha.

        Nesse caso salvamos a sessão normalmente.
      */

      // Salva o token JWT.
      localStorage.setItem(
        "token",
        dados.token
      );


      // Salva os dados básicos do usuário.
      localStorage.setItem(
        "usuario",
        JSON.stringify(
          dados.usuario
        )
      );


      // ========================================
      // REDIRECIONAMENTO POR PERFIL
      // ========================================


      // ========================================
      // ADMINISTRADOR
      // ========================================

      if (
        dados.usuario.tipo ===
        "ADMIN"
      ) {
        navigate(
          "/admin"
        );

        return;
      }


      // ========================================
      // MÉDICO
      // ========================================

      if (
        dados.usuario.tipo ===
        "MEDICO"
      ) {
        navigate(
          "/medico"
        );

        return;
      }


      // ========================================
      // PACIENTE
      // ========================================

      /*
        Se o paciente já realizou
        o primeiro acesso e criou
        sua nova senha, ele será
        enviado para sua própria área.
      */
      if (
        dados.usuario.tipo ===
        "PACIENTE"
      ) {
        navigate(
          "/paciente"
        );

        return;
      }


      // ========================================
      // PERFIL NÃO IDENTIFICADO
      // ========================================

      // Caso algum perfil inesperado
      // seja recebido do backend.
      setMensagem(
        "Tipo de usuário não reconhecido."
      );
    } catch (erro) {
      // ========================================
      // TRATAMENTO DE ERRO
      // ========================================

      const mensagemErro =
        erro instanceof Error
          ? erro.message
          : "Erro ao realizar login.";


      setMensagem(
        mensagemErro
      );
    } finally {
      // Libera novamente o botão.
      setCarregando(false);
    }
  }


  // ========================================
  // INTERFACE
  // ========================================

  return (
    <div className="login-page">

      <div className="login-card">

        {/* ========================================
            CABEÇALHO
        ======================================== */}

        <div className="login-header">

          <h1>
            Sistema Médico
          </h1>

          <p>
            Entre com seus dados para acessar o sistema
          </p>

        </div>


        {/* ========================================
            FORMULÁRIO
        ======================================== */}

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

          {/* ========================================
              E-MAIL
          ======================================== */}

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
                setEmail(
                  event.target.value
                )
              }
              required
            />

          </div>


          {/* ========================================
              SENHA
          ======================================== */}

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
                setSenha(
                  event.target.value
                )
              }
              required
            />

          </div>


          {/* ========================================
              MENSAGEM
          ======================================== */}

          {mensagem && (
            <p className="login-message">
              {mensagem}
            </p>
          )}


          {/* ========================================
              BOTÃO
          ======================================== */}

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