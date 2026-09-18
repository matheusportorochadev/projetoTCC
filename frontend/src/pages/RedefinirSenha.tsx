// ========================================
// TELA DE REDEFINIÇÃO DE SENHA
// ========================================

import {
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import CampoSenha
  from "../components/CampoSenha";

import CodigoOtp
  from "../components/CodigoOtp";

import ModalSistema
  from "../components/ModalSistema";

import "../styles/login.css";


// ========================================
// COMPONENTE
// ========================================

export default function RedefinirSenha() {

  // ========================================
  // ESTADOS
  // ========================================

  const [
    codigo,
    setCodigo
  ] =
    useState("");


  const [
    novaSenha,
    setNovaSenha
  ] =
    useState("");


  const [
    confirmarSenha,
    setConfirmarSenha
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
  // MODAL DE SUCESSO
  // ========================================

  const [
    modalSucessoAberto,
    setModalSucessoAberto
  ] =
    useState(false);


  const navigate =
    useNavigate();


  // ========================================
  // E-MAIL
  // ========================================

  const email =
    sessionStorage.getItem(
      "emailRedefinicao"
    );


  // ========================================
  // VALIDAR SENHA
  // ========================================

  function validarSenha() {

    const senhaRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;


    if (
      !senhaRegex.test(
        novaSenha
      )
    ) {

      throw new Error(
        "A senha deve ter no mínimo 8 caracteres, com letra maiúscula, letra minúscula, número e caractere especial."
      );

    }


    if (
      novaSenha !==
      confirmarSenha
    ) {

      throw new Error(
        "As senhas informadas não são iguais."
      );

    }

  }


  // ========================================
  // REDEFINIR SENHA
  // ========================================

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    try {

      setMensagem("");


      // ========================================
      // VALIDAR E-MAIL
      // ========================================

      if (!email) {

        throw new Error(
          "E-mail de redefinição não encontrado. Solicite um novo código."
        );

      }


      // ========================================
      // VALIDAR CÓDIGO
      // ========================================

      if (
        !/^\d{6}$/.test(
          codigo
        )
      ) {

        throw new Error(
          "Informe os 6 números do código enviado para seu e-mail."
        );

      }


      // ========================================
      // VALIDAR SENHAS
      // ========================================

      validarSenha();


      setCarregando(
        true
      );


      // ========================================
      // BACKEND
      // ========================================

      const resposta =
        await fetch(
          "http://localhost:3000/auth/redefinir-senha",
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify({

                email,
                codigo,
                novaSenha

              })

          }
        );


      const dados =
        await resposta.json();


      if (
        !resposta.ok
      ) {

        throw new Error(
          dados.mensagem ||
          "Erro ao redefinir senha."
        );

      }


      // ========================================
      // LIMPAR DADOS TEMPORÁRIOS
      // ========================================

      sessionStorage.removeItem(
        "emailRedefinicao"
      );


      /*
        Mantemos esta limpeza somente
        para remover possíveis dados
        antigos de versões anteriores.
      */
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "usuario"
      );


      // ========================================
      // SUCESSO
      // ========================================

      setModalSucessoAberto(
        true
      );

    } catch (erro) {

      setMensagem(

        erro instanceof Error
          ? erro.message
          : "Erro ao redefinir senha."

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

    <div className="login-page">

      <div className="login-card">

        {/* CABEÇALHO */}

        <div className="login-header">

          <h1>
            Redefinir senha
          </h1>

          <p>
            Digite o código enviado para
            seu e-mail e escolha uma nova senha.
          </p>

        </div>


        {/* E-MAIL */}

        {
          email && (

            <div className="login-email-info">

              Código enviado para:

              {" "}

              <strong>
                {email}
              </strong>

            </div>

          )
        }


        <form
          onSubmit={
            handleSubmit
          }
          className="login-form"
        >


          {/* ========================================
              CÓDIGO
          ======================================== */}

          <div className="form-group">

            <label>
              Código de segurança
            </label>


            <CodigoOtp
              value={
                codigo
              }
              onChange={
                setCodigo
              }
              disabled={
                carregando
              }
            />


            <small>
              Digite os 6 números enviados
              para seu e-mail.
            </small>

          </div>


          {/* ========================================
              NOVA SENHA
          ======================================== */}

          <CampoSenha
            id="novaSenha"
            label="Nova senha"
            placeholder="Digite sua nova senha"
            value={
              novaSenha
            }
            onChange={
              setNovaSenha
            }
            minLength={8}
            maxLength={100}
            required
            disabled={
              carregando
            }
            autoComplete="new-password"
            ajuda="Mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial."
          />


          {/* ========================================
              CONFIRMAR SENHA
          ======================================== */}

          <CampoSenha
            id="confirmarSenha"
            label="Confirmar nova senha"
            placeholder="Digite novamente sua nova senha"
            value={
              confirmarSenha
            }
            onChange={
              setConfirmarSenha
            }
            minLength={8}
            maxLength={100}
            required
            disabled={
              carregando
            }
            autoComplete="new-password"
          />


          {/* ========================================
              ERRO
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
              BOTÃO
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
                ? "Redefinindo..."
                : "Redefinir senha"
            }

          </button>


          {/* VOLTAR */}

          <div className="login-links">

            <button
              type="button"
              className="login-link-button"
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


      {/* ========================================
          MODAL - SENHA REDEFINIDA
         ======================================== */}

      <ModalSistema
        aberto={
          modalSucessoAberto
        }
        tipo="sucesso"
        titulo="Senha redefinida"
        mensagem="Senha redefinida com sucesso. Faça login utilizando sua nova senha."
        textoConfirmar="Continuar"
        onConfirmar={() => {

          setModalSucessoAberto(
            false
          );

          navigate(
            "/login"
          );

        }}
      />

    </div>

  );

}
