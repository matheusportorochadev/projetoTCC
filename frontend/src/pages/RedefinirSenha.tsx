// ========================================
// TELA DE REDEFINIÇÃO DE SENHA
// ========================================

import { useState } from "react";

import { useNavigate } from "react-router-dom";

import "../styles/login.css";


export default function RedefinirSenha() {
  // ========================================
  // ESTADOS
  // ========================================

  const [codigo, setCodigo] =
    useState("");

  const [novaSenha, setNovaSenha] =
    useState("");

  const [
    confirmarSenha,
    setConfirmarSenha
  ] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  const [carregando, setCarregando] =
    useState(false);


  const navigate =
    useNavigate();


  // ========================================
  // E-MAIL DO USUÁRIO
  // ========================================

  /*
    O e-mail foi salvo pelo Login.tsx
    antes do redirecionamento.

    Isso evita pedir novamente
    o e-mail para o usuário.
  */
  const email =
    sessionStorage.getItem(
      "emailRedefinicao"
    );


  // ========================================
  // VALIDAR SENHA
  // ========================================

  function validarSenha() {
    /*
      Regras:

      - mínimo de 8 caracteres;
      - pelo menos uma letra minúscula;
      - pelo menos uma letra maiúscula;
      - pelo menos um número;
      - pelo menos um caractere especial.
    */
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


    // Confirma se as duas senhas
    // digitadas são iguais.
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
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();


    try {
      setMensagem("");


      // ========================================
      // VALIDAR E-MAIL
      // ========================================

      if (!email) {
        throw new Error(
          "E-mail de redefinição não encontrado. Faça o login novamente."
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
          "O código deve conter exatamente 6 números."
        );
      }


      // ========================================
      // VALIDAR NOVA SENHA
      // ========================================

      validarSenha();


      setCarregando(true);


      // ========================================
      // ENVIAR PARA O BACKEND
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


      // ========================================
      // TRATAR ERRO DO BACKEND
      // ========================================

      if (!resposta.ok) {
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


      // Também removemos qualquer sessão
      // antiga por segurança.
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "usuario"
      );


      // ========================================
      // SUCESSO
      // ========================================

      alert(
        "Senha definida com sucesso. Faça login novamente utilizando sua nova senha."
      );


      // Depois de criar a nova senha,
      // volta para a tela de login.
      navigate(
        "/login"
      );
    } catch (erro) {
      const mensagemErro =
        erro instanceof Error
          ? erro.message
          : "Erro ao redefinir senha.";


      setMensagem(
        mensagemErro
      );
    } finally {
      setCarregando(false);
    }
  }


  // ========================================
  // INTERFACE
  // ========================================

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <h1>
            Primeiro acesso
          </h1>

          <p>
            Digite o código enviado para seu e-mail e crie sua nova senha.
          </p>
        </div>


        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

          {/* CÓDIGO */}
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
                    .replace(
                      /\D/g,
                      ""
                    )
                    .slice(
                      0,
                      6
                    )
                )
              }
              minLength={6}
              maxLength={6}
              required
            />
          </div>


          {/* NOVA SENHA */}
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
                setNovaSenha(
                  event.target.value
                )
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


          {/* CONFIRMAR SENHA */}
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
                setConfirmarSenha(
                  event.target.value
                )
              }
              minLength={8}
              maxLength={100}
              required
            />
          </div>


          {/* ERRO */}
          {mensagem && (
            <p className="login-message">
              {mensagem}
            </p>
          )}


          {/* BOTÃO */}
          <button
            type="submit"
            className="login-button"
            disabled={carregando}
          >
            {carregando
              ? "Redefinindo..."
              : "Definir nova senha"}
          </button>

        </form>

      </div>
    </div>
  );
}