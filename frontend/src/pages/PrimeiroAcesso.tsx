// ========================================
// PRIMEIRO ACESSO
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
  
  import CodigoOtp
    from "../components/CodigoOtp";
  
  import ModalSistema
    from "../components/ModalSistema";
  
  import "../styles/login.css";
  
  
  // ========================================
  // TIPOS
  // ========================================
  
  type Etapa =
    | "EMAIL"
    | "CODIGO";
  
  
  // ========================================
  // COMPONENTE
  // ========================================
  
  export default function PrimeiroAcesso() {
  
    const navigate =
      useNavigate();
  
  
    // ========================================
    // ESTADOS
    // ========================================
  
    const [
      etapa,
      setEtapa
    ] =
      useState<Etapa>(
        "EMAIL"
      );
  
  
    const [
      email,
      setEmail
    ] =
      useState("");
  
  
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
      sucesso,
      setSucesso
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
  
  
    // ========================================
    // VALIDAR E-MAIL
    // ========================================
  
    function validarEmail(
      valor: string
    ) {
  
      return (
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          .test(
            valor
          )
      );
  
    }
  
  
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
    // SOLICITAR CÓDIGO
    // ========================================
  
    async function solicitarCodigo(
      event:
        React.FormEvent<HTMLFormElement>
    ) {
  
      event.preventDefault();
  
  
      try {
  
        setMensagem("");
  
        setSucesso("");
  
  
        // ========================================
        // NORMALIZAR E-MAIL
        // ========================================
  
        const emailFormatado =
          email
            .trim()
            .toLowerCase();
  
  
        // ========================================
        // VALIDAR E-MAIL
        // ========================================
  
        if (
          !validarEmail(
            emailFormatado
          )
        ) {
  
          throw new Error(
            "Informe um e-mail válido."
          );
  
        }
  
  
        setCarregando(
          true
        );
  
  
        // ========================================
        // CONSULTAR BACKEND
        // ========================================
  
        const resposta =
          await fetch(
            "http://localhost:3000/auth/primeiro-acesso/solicitar",
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
                    emailFormatado
  
                })
  
            }
          );
  
  
        const dados =
          await resposta.json();
  
  
        // ========================================
        // ERRO HTTP
        // ========================================
  
        if (
          !resposta.ok
        ) {
  
          throw new Error(
            dados.mensagem ||
            "Não foi possível solicitar o código."
          );
  
        }
  
  
        // ========================================
        // RESPOSTA ACEITA PELO BACKEND
        // ========================================
  
        /*
          O backend utiliza uma resposta genérica
          por segurança.
  
          Ele não informa se o e-mail existe
          ou se está realmente apto ao
          Primeiro Acesso.
  
          Portanto, quando recebemos HTTP 200,
          avançamos para a etapa do código.
  
          Se o e-mail estiver realmente apto,
          ele receberá o código.
        */
  
  
        // ========================================
        // PREPARAR ETAPA DO CÓDIGO
        // ========================================
  
        sessionStorage.setItem(
          "emailPrimeiroAcesso",
          emailFormatado
        );
  
  
        setEmail(
          emailFormatado
        );
  
  
        setCodigo("");
  
        setNovaSenha("");
  
        setConfirmarSenha("");
  
  
        // ========================================
        // SOMENTE AGORA AVANÇA
        // ========================================
  
        setEtapa(
          "CODIGO"
        );
  
  
        setSucesso(
          dados.mensagem ||
          "Se o e-mail estiver apto ao primeiro acesso, enviaremos um código."
        );
  
      } catch (erro) {
  
        setMensagem(
  
          erro instanceof Error
            ? erro.message
            : "Erro ao solicitar primeiro acesso."
  
        );
  
      } finally {
  
        setCarregando(
          false
        );
  
      }
  
    }
  
  
    // ========================================
    // CONCLUIR PRIMEIRO ACESSO
    // ========================================
  
    async function concluirAcesso(
      event:
        React.FormEvent<HTMLFormElement>
    ) {
  
      event.preventDefault();
  
  
      try {
  
        setMensagem("");
  
        setSucesso("");
  
  
        // ========================================
        // BUSCAR E-MAIL
        // ========================================
  
        const emailPrimeiroAcesso =
          sessionStorage.getItem(
            "emailPrimeiroAcesso"
          );
  
  
        if (
          !emailPrimeiroAcesso
        ) {
  
          throw new Error(
            "E-mail do primeiro acesso não encontrado. Solicite um novo código."
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
            "Preencha os 6 números do código."
          );
  
        }
  
  
        // ========================================
        // VALIDAR SENHA
        // ========================================
  
        validarSenha();
  
  
        setCarregando(
          true
        );
  
  
        // ========================================
        // ENVIAR PARA BACKEND
        // ========================================
  
        const resposta =
          await fetch(
            "http://localhost:3000/auth/primeiro-acesso/concluir",
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
                    emailPrimeiroAcesso,
  
                  codigo,
  
                  novaSenha,
  
                  confirmarSenha
  
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
            "Não foi possível concluir o primeiro acesso."
          );
  
        }
  
  
        // ========================================
        // LIMPAR DADOS TEMPORÁRIOS
        // ========================================
  
        sessionStorage.removeItem(
          "emailPrimeiroAcesso"
        );
  
  
        /*
          Limpeza para versões antigas.
          O JWT atual não fica no localStorage.
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
            : "Erro ao concluir primeiro acesso."
  
        );
  
      } finally {
  
        setCarregando(
          false
        );
  
      }
  
    }
  
  
    // ========================================
    // REENVIAR CÓDIGO
    // ========================================
  
    async function reenviarCodigo() {
  
      try {
  
        setMensagem("");
  
        setSucesso("");
  
  
        const emailPrimeiroAcesso =
          sessionStorage.getItem(
            "emailPrimeiroAcesso"
          );
  
  
        if (
          !emailPrimeiroAcesso
        ) {
  
          throw new Error(
            "E-mail não encontrado. Volte e informe seu e-mail novamente."
          );
  
        }
  
  
        setCarregando(
          true
        );
  
  
        const resposta =
          await fetch(
            "http://localhost:3000/auth/primeiro-acesso/solicitar",
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
                    emailPrimeiroAcesso
  
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
            "Não foi possível reenviar o código."
          );
  
        }
  
  
        // ========================================
        // VERIFICAR SE AINDA ESTÁ APTO
        // ========================================
  
        if (
          dados.apto !== true
        ) {
  
          sessionStorage.removeItem(
            "emailPrimeiroAcesso"
          );
  
  
          setCodigo("");
  
          setNovaSenha("");
  
          setConfirmarSenha("");
  
  
          setEtapa(
            "EMAIL"
          );
  
  
          throw new Error(
            dados.mensagem ||
            "Este e-mail não está disponível para primeiro acesso."
          );
  
        }
  
  
        // ========================================
        // LIMPAR CÓDIGO
        // ========================================
  
        setCodigo("");
  
  
        setNovaSenha("");
  
        setConfirmarSenha("");
  
  
        setSucesso(
          "Um novo código foi enviado. Verifique seu e-mail."
        );
  
      } catch (erro) {
  
        setMensagem(
  
          erro instanceof Error
            ? erro.message
            : "Erro ao reenviar código."
  
        );
  
      } finally {
  
        setCarregando(
          false
        );
  
      }
  
    }
  
  
    // ========================================
    // ALTERAR E-MAIL
    // ========================================
  
    function voltarParaEmail() {
  
      setCodigo("");
  
      setNovaSenha("");
  
      setConfirmarSenha("");
  
      setMensagem("");
  
      setSucesso("");
  
  
      sessionStorage.removeItem(
        "emailPrimeiroAcesso"
      );
  
  
      setEtapa(
        "EMAIL"
      );
  
    }
  
  
    // ========================================
    // ETAPA 1 - E-MAIL
    // ========================================
  
    function renderizarEtapaEmail() {
  
      return (
  
        <div className="login-card">
  
          {/* ========================================
              CABEÇALHO
          ======================================== */}
  
          <div className="login-header">
  
            <h1>
              Primeiro acesso
            </h1>
  
  
            <p>
              Informe o e-mail cadastrado
              pelo seu médico para receber
              o código de criação da senha.
            </p>
  
          </div>
  
  
          {/* ========================================
              FORMULÁRIO
          ======================================== */}
  
          <form
            onSubmit={
              solicitarCodigo
            }
            className="login-form"
          >
  
  
            {/* E-MAIL */}
  
            <div className="form-group">
  
              <label
                htmlFor="emailPrimeiroAcesso"
              >
                E-mail
              </label>
  
  
              <input
                id="emailPrimeiroAcesso"
                type="email"
                autoComplete="email"
                placeholder="Digite seu e-mail"
                value={
                  email
                }
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                required
                disabled={
                  carregando
                }
              />
  
            </div>
  
  
            {/* ========================================
                ERRO
            ======================================== */}
  
            {
              mensagem && (
  
                <p
                  className={
                    mensagem
                      .toLowerCase()
                      .includes(
                        "se o e-mail estiver apto"
                      )
                      ? "login-message login-message-success"
                      : "login-message login-message-error"
                  }
                >
  
                  {mensagem}
  
                </p>
  
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
                  ? "Verificando..."
                  : "Enviar código"
              }
  
            </button>
  
  
            {/* ========================================
                VOLTAR
            ======================================== */}
  
            <button
              type="button"
              className="login-secondary-button"
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
  
          </form>
  
        </div>
  
      );
  
    }
  
  
    // ========================================
    // ETAPA 2 - CÓDIGO E SENHA
    // ========================================
  
    function renderizarEtapaCodigo() {
  
      return (
  
        <div className="login-card">
  
          {/* ========================================
              CABEÇALHO
          ======================================== */}
  
          <div className="login-header">
  
            <h1>
              Crie sua senha
            </h1>
  
  
            <p>
              Digite o código enviado para
              seu e-mail e escolha sua senha.
            </p>
  
          </div>
  
  
          {/* ========================================
              E-MAIL
          ======================================== */}
  
          <div className="login-email-info">
  
            Código enviado para
  
            {" "}
  
            <strong>
              {email}
            </strong>
  
          </div>
  
  
          {/* ========================================
              FORMULÁRIO
          ======================================== */}
  
          <form
            onSubmit={
              concluirAcesso
            }
            className="login-form"
          >
  
  
            {/* ========================================
                CÓDIGO DE 6 DÍGITOS
            ======================================== */}
  
            <div className="form-group">
  
              <label>
                Código
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
              placeholder="Crie sua senha"
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
              ajuda="Mínimo de 8 caracteres, contendo letra maiúscula, minúscula, número e caractere especial."
            />
  
  
            {/* ========================================
                CONFIRMAR SENHA
            ======================================== */}
  
            <CampoSenha
              id="confirmarSenha"
              label="Confirmar senha"
              placeholder="Digite novamente sua senha"
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
                MENSAGENS
            ======================================== */}
  
            {
              mensagem && (
  
                <p className="login-message login-message-error">
  
                  {mensagem}
  
                </p>
  
              )
            }
  
  
            {
              sucesso && (
  
                <p className="login-message login-message-success">
  
                  {sucesso}
  
                </p>
  
              )
            }
  
  
            {/* ========================================
                CRIAR SENHA
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
                  ? "Criando senha..."
                  : "Criar minha senha"
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
                onClick={
                  reenviarCodigo
                }
                disabled={
                  carregando
                }
              >
                Reenviar código
              </button>
  
  
              <button
                type="button"
                className="login-link-button"
                onClick={
                  voltarParaEmail
                }
                disabled={
                  carregando
                }
              >
                Alterar e-mail
              </button>
  
            </div>
  
  
            {/* ========================================
                VOLTAR PARA LOGIN
            ======================================== */}
  
            <button
              type="button"
              className="login-secondary-button"
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
  
          </form>
  
        </div>
  
      );
  
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
  
  
          {/* ========================================
              APENAS TEMA CLARO / ESCURO
          ======================================== */}
  
          <div className="login-navbar-tema">
  
            <BotaoTema />
  
          </div>
  
        </header>
  
  
        {/* ========================================
            CONTEÚDO
        ======================================== */}
  
        <main className="login-page">
  
          {
            etapa === "EMAIL"
              ? renderizarEtapaEmail()
              : renderizarEtapaCodigo()
          }
  
        </main>
  
  
        {/* ========================================
            MODAL - PRIMEIRO ACESSO CONCLUÍDO
           ======================================== */}
  
        <ModalSistema
          aberto={
            modalSucessoAberto
          }
          tipo="sucesso"
          titulo="Senha criada"
          mensagem="Senha criada com sucesso. Agora você já pode acessar sua conta."
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