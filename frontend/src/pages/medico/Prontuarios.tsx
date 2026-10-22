
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import type {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent
} from "react";

import {
  buscarSituacaoProntuario,
  buscarSessaoProntuario,
  cadastrarSenhaProntuarioApi,
  verificarSenhaProntuarioApi,
  solicitarRecuperacaoProntuarioApi,
  concluirRecuperacaoProntuarioApi
} from "../../services/prontuariosApi";

import PainelClinicoProntuarios from "./PainelClinicoProntuarios";

import "../../styles/prontuarios.css";

// ========================================
// TIPOS DA PÁGINA
// ========================================

// Estados possíveis da proteção adicional.
type EstadoPagina =
  | "carregando"
  | "erro"
  | "cadastrar"
  | "desbloquear"
  | "recuperacao-solicitar"
  | "recuperacao-codigo"
  | "liberado";

// Navegação dentro da área desbloqueada.
//
// "inicio" mostra os cartões.
// "consultar" abre o histórico.
// "novo" abre a criação de prontuários.
type VisaoClinica =
  | "inicio"
  | "consultar"
  | "novo";

// Ícones disponíveis.
type TipoIcone =
  | "cadeado"
  | "pasta"
  | "documento"
  | "email"
  | "voltar"
  | "chave";

// ========================================
// ÍCONES SVG
// ========================================

function IconeProntuario({
  tipo
}: {
  tipo: TipoIcone;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {tipo === "cadeado" && (
        <>
          <rect
            x="4"
            y="10"
            width="16"
            height="11"
            rx="2"
          />

          <path d="M8 10V7a4 4 0 0 1 8 0v3" />

          <circle
            cx="12"
            cy="15.5"
            r="1"
          />
        </>
      )}

      {tipo === "pasta" && (
        <path
          d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        />
      )}

      {tipo === "documento" && (
        <>
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />

          <path d="M13 2v7h7" />

          <path d="M12 13v6" />

          <path d="M9 16h6" />
        </>
      )}

      {tipo === "email" && (
        <>
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
          />

          <path d="m3 7 9 6 9-6" />
        </>
      )}

      {tipo === "voltar" && (
        <>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </>
      )}

      {tipo === "chave" && (
        <>
          <circle
            cx="8"
            cy="15"
            r="4"
          />

          <path d="m10.8 12.2 8.7-8.7 2 2-2.5 2.5" />

          <path d="m16 7 2 2" />
        </>
      )}
    </svg>
  );
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function Prontuarios() {

  // ========================================
  // CONTROLE DE SEGURANÇA
  // ========================================

  const [
    estado,
    setEstado
  ] = useState<EstadoPagina>(
    "carregando"
  );

  // ========================================
  // NAVEGAÇÃO CLÍNICA
  // ========================================

  const [
    visaoClinica,
    setVisaoClinica
  ] = useState<VisaoClinica>(
    "inicio"
  );

  // ========================================
  // SENHA ADICIONAL
  // ========================================

  const [
    senha,
    setSenha
  ] = useState("");

  const [
    confirmarSenha,
    setConfirmarSenha
  ] = useState("");

  const [
    mostrarSenha,
    setMostrarSenha
  ] = useState(false);

  // ========================================
  // CARREGAMENTO E MENSAGENS
  // ========================================

  const [
    processando,
    setProcessando
  ] = useState(false);

  const [
    erro,
    setErro
  ] = useState("");

  const [
    mensagem,
    setMensagem
  ] = useState("");

  // ========================================
  // RECUPERAÇÃO DE SENHA
  // ========================================

  // Cada posição armazena um dos
  // seis dígitos do código enviado.
  const [
    digitosCodigo,
    setDigitosCodigo
  ] = useState<string[]>(
    Array(6).fill("")
  );

  const [
    novaSenha,
    setNovaSenha
  ] = useState("");

  const [
    confirmarNovaSenha,
    setConfirmarNovaSenha
  ] = useState("");

  const [
    mostrarNovaSenha,
    setMostrarNovaSenha
  ] = useState(false);

  // Referências utilizadas para controlar
  // o foco dos seis quadrados do código.
  const inputsCodigo =
    useRef<(HTMLInputElement | null)[]>([]);

  // ========================================
  // LIMPAR SENHAS
  // ========================================

  function limparSenhas() {

    setSenha("");
    setConfirmarSenha("");
    setMostrarSenha(false);
  }

  // ========================================
  // LIMPAR RECUPERAÇÃO
  // ========================================

  function limparRecuperacao() {

    setDigitosCodigo(
      Array(6).fill("")
    );

    setNovaSenha("");
    setConfirmarNovaSenha("");
    setMostrarNovaSenha(false);
  }

  // ========================================
  // VERIFICAR ACESSO AO ENTRAR
  // ========================================

  const carregarAcesso = useCallback(() => {
    return buscarSituacaoProntuario().then(async situacao => {
      if (!situacao.senhaCadastrada) { setEstado("cadastrar"); return; }
      try {
        const sessao = await buscarSessaoProntuario();
        if (sessao.autorizado) { setEstado("liberado"); return; }
      } catch { /* Cookie clínico ausente: solicitar desbloqueio. */ }
      setEstado("desbloquear");
    }).catch((falha: unknown) => {
      setErro(falha instanceof Error ? falha.message : "Não foi possível verificar o acesso.");
      setEstado("erro");
    });
  }, []);

  // ========================================
  // CARREGAMENTO INICIAL
  // ========================================

  useEffect(() => {

    void carregarAcesso();

  }, [carregarAcesso]);

  // ========================================
  // CADASTRAR SENHA ADICIONAL
  // ========================================

  async function cadastrarSenha(
    evento: FormEvent<HTMLFormElement>
  ) {

    evento.preventDefault();

    if (processando) {
      return;
    }

    setErro("");
    setMensagem("");

    if (senha !== confirmarSenha) {

      setErro(
        "As senhas informadas não coincidem."
      );

      return;
    }

    setProcessando(true);

    try {

      // O backend valida a senha
      // e armazena seu hash.
      await cadastrarSenhaProntuarioApi(
        senha,
        confirmarSenha
      );

      // Depois do cadastro, solicita
      // a autorização adicional.
      const resultado =
        await verificarSenhaProntuarioApi(
          senha
        );

      if (!resultado.autorizado) {

        throw new Error(
          "A senha foi cadastrada, mas não foi possível liberar o acesso."
        );
      }

      limparSenhas();

      setVisaoClinica("inicio");

      setEstado("liberado");

      setMensagem(
        "Senha cadastrada e acesso autorizado."
      );

    } catch (falha) {

      const mensagemErro =
        falha instanceof Error
          ? falha.message
          : "Não foi possível cadastrar a senha.";

      // O cadastro pode ter sido realizado,
      // mesmo se a autorização falhar.
      //
      // Consultamos o backend para não
      // apresentar o cadastro novamente
      // quando a senha já existe.
      try {

        const situacao =
          await buscarSituacaoProntuario();

        setEstado(
          situacao.senhaCadastrada
            ? "desbloquear"
            : "cadastrar"
        );

      } catch {

        setEstado("erro");
      }

      setErro(mensagemErro);

    } finally {

      setProcessando(false);
    }
  }

  // ========================================
  // DESBLOQUEAR PRONTUÁRIOS
  // ========================================

  async function desbloquear(
    evento: FormEvent<HTMLFormElement>
  ) {

    evento.preventDefault();

    if (processando) {
      return;
    }

    setErro("");
    setMensagem("");
    setProcessando(true);

    try {

      const resultado =
        await verificarSenhaProntuarioApi(
          senha
        );

      if (!resultado.autorizado) {

        throw new Error(
          "Não foi possível autorizar o acesso."
        );
      }

      limparSenhas();

      setVisaoClinica("inicio");

      setEstado("liberado");

    } catch (falha) {

      setErro(
        falha instanceof Error
          ? falha.message
          : "Erro ao verificar a senha."
      );

    } finally {

      setProcessando(false);
    }
  }

  // ========================================
  // AUTORIZAÇÃO ADICIONAL EXPIRADA
  // ========================================
  //
  // O PainelClinicoProntuarios chama
  // esta função quando recebe HTTP
  // 401 ou 403.
  //
  // A página desmonta o painel
  // e exige uma nova autorização.

  const acessoExpirado = useCallback(
    () => {

      setVisaoClinica("inicio");

      // Apaga os valores temporários
      // de credenciais da interface.
      setSenha("");
      setConfirmarSenha("");
      setMostrarSenha(false);

      setDigitosCodigo(
        Array(6).fill("")
      );

      setNovaSenha("");
      setConfirmarNovaSenha("");
      setMostrarNovaSenha(false);

      setEstado("desbloquear");

      setMensagem("");

      setErro(
        "Sua autorização adicional expirou. Informe a senha novamente."
      );

    },
    []
  );

  // ========================================
  // ABRIR RECUPERAÇÃO DE SENHA
  // ========================================

  function abrirRecuperacao() {

    if (processando) {
      return;
    }

    limparSenhas();
    limparRecuperacao();

    setErro("");
    setMensagem("");

    setEstado("recuperacao-solicitar");
  }

  // ========================================
  // VOLTAR AO DESBLOQUEIO
  // ========================================

  function voltarAoDesbloqueio() {

    if (processando) {
      return;
    }

    limparSenhas();
    limparRecuperacao();

    setErro("");
    setMensagem("");

    setEstado("desbloquear");
  }

  // ========================================
  // SOLICITAR CÓDIGO POR E-MAIL
  // ========================================

  async function solicitarCodigo() {

    if (processando) {
      return;
    }

    setErro("");
    setMensagem("");
    setProcessando(true);

    try {

      // O backend identifica o e-mail
      // do médico autenticado.
      //
      // Não enviamos um endereço
      // informado pelo navegador.
      const resultado =
        await solicitarRecuperacaoProntuarioApi();

      // Invalida visualmente o código
      // que estava preenchido.
      setDigitosCodigo(
        Array(6).fill("")
      );

      setMensagem(resultado.mensagem);

      setEstado("recuperacao-codigo");

    } catch (falha) {

      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível enviar o código."
      );

    } finally {

      setProcessando(false);
    }
  }

  // ========================================
  // FOCAR QUADRADO DO CÓDIGO
  // ========================================

  function focarDigito(
    indice: number
  ) {

    if (
      indice < 0 ||
      indice >= 6
    ) {
      return;
    }

    const input =
      inputsCodigo.current[indice];

    input?.focus();
    input?.select();
  }

  // ========================================
  // ALTERAR DÍGITO
  // ========================================

  function alterarDigito(
    indice: number,
    valor: string
  ) {

    // Permite somente números.
    const numeros =
      valor.replace(/\D/g, "");

    const novosDigitos =
      [...digitosCodigo];

    // Aceita preenchimento múltiplo,
    // por exemplo quando o celular
    // sugere automaticamente o código.
    if (numeros.length > 1) {

      for (
        let posicao = 0;
        posicao < numeros.length &&
        indice + posicao < 6;
        posicao++
      ) {

        novosDigitos[indice + posicao] =
          numeros[posicao] ?? "";
      }

      setDigitosCodigo(novosDigitos);

      focarDigito(
        Math.min(
          indice + numeros.length,
          5
        )
      );

      return;
    }

    novosDigitos[indice] =
      numeros.slice(0, 1);

    setDigitosCodigo(novosDigitos);

    // Avança para o próximo input
    // quando um dígito é preenchido.
    if (
      numeros.length > 0 &&
      indice < 5
    ) {

      focarDigito(indice + 1);
    }
  }

  // ========================================
  // CONTROLE DO TECLADO DO OTP
  // ========================================

  function tratarTeclaCodigo(
    evento: KeyboardEvent<HTMLInputElement>,
    indice: number
  ) {

    if (evento.key === "Backspace") {

      evento.preventDefault();

      const novosDigitos =
        [...digitosCodigo];

      if (novosDigitos[indice]) {

        novosDigitos[indice] = "";

      } else if (indice > 0) {

        novosDigitos[indice - 1] = "";

        focarDigito(indice - 1);
      }

      setDigitosCodigo(novosDigitos);

      return;
    }

    if (evento.key === "ArrowLeft") {

      evento.preventDefault();

      focarDigito(indice - 1);

      return;
    }

    if (evento.key === "ArrowRight") {

      evento.preventDefault();

      focarDigito(indice + 1);

      return;
    }

    if (evento.key === "Delete") {

      evento.preventDefault();

      const novosDigitos =
        [...digitosCodigo];

      novosDigitos[indice] = "";

      setDigitosCodigo(novosDigitos);
    }
  }

  // ========================================
  // COLAR CÓDIGO COMPLETO
  // ========================================

  function colarCodigo(
    evento: ClipboardEvent<HTMLInputElement>
  ) {

    evento.preventDefault();

    const numeros =
      evento.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);

    if (!numeros) {
      return;
    }

    const novosDigitos =
      Array(6).fill("") as string[];

    numeros.split("").forEach(
      (numero, indice) => {

        novosDigitos[indice] = numero;
      }
    );

    setDigitosCodigo(novosDigitos);

    focarDigito(
      Math.min(numeros.length, 5)
    );
  }

  // ========================================
  // CONCLUIR RECUPERAÇÃO
  // ========================================

  async function concluirRecuperacao(
    evento: FormEvent<HTMLFormElement>
  ) {

    evento.preventDefault();

    if (processando) {
      return;
    }

    setErro("");
    setMensagem("");

    const codigo =
      digitosCodigo.join("");

    if (!/^\d{6}$/.test(codigo)) {

      setErro(
        "Informe o código completo de 6 números."
      );

      return;
    }

    if (
      novaSenha !== confirmarNovaSenha
    ) {

      setErro(
        "As novas senhas não coincidem."
      );

      return;
    }

    setProcessando(true);

    try {

      // O backend valida o código,
      // a validade e as tentativas.
      const resultado =
        await concluirRecuperacaoProntuarioApi({
          codigo,
          novaSenha,
          confirmarSenha: confirmarNovaSenha
        });

      limparRecuperacao();
      limparSenhas();

      // Após redefinir a senha,
      // é necessário desbloquear
      // o módulo novamente.
      setEstado("desbloquear");

      setMensagem(resultado.mensagem);

    } catch (falha) {

      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível redefinir a senha."
      );

    } finally {

      setProcessando(false);
    }
  }

  // ========================================
  // TELA DE CARREGAMENTO
  // ========================================

  if (estado === "carregando") {

    return (
      <section className="prontuario-pagina">

        <div className="prontuario-cartao">

          <div className="prontuario-cadeado">
            <IconeProntuario tipo="cadeado" />
          </div>

          <h1>
            Prontuários médicos
          </h1>

          <p className="prontuario-descricao">
            Verificando o acesso aos prontuários...
          </p>

        </div>

      </section>
    );
  }

  // ========================================
  // TELA DE ERRO DE ACESSO
  // ========================================

  if (estado === "erro") {

    return (
      <section className="prontuario-pagina">

        <div className="prontuario-cartao">

          <div className="prontuario-cadeado">
            <IconeProntuario tipo="cadeado" />
          </div>

          <h1>
            Não foi possível carregar
          </h1>

          <p className="prontuario-descricao">
            Ocorreu um problema ao verificar
            o acesso aos prontuários.
          </p>

          {erro && (
            <p
              className="prontuario-erro"
              role="alert"
            >
              {erro}
            </p>
          )}

          <button
            type="button"
            className="prontuario-botao"
            onClick={() => {
              setEstado("carregando"); setVisaoClinica("inicio"); setErro(""); setMensagem("");
              void carregarAcesso();
            }}
          >
            Tentar novamente
          </button>

        </div>

      </section>
    );
  }

  // ========================================
  // ÁREA CLÍNICA LIBERADA
  // ========================================

  if (estado === "liberado") {

    return (
      <section className="prontuario-pagina">

        {/* CABEÇALHO */}

        <div className="prontuario-cabecalho">

          <div>

            <h1>
              Prontuários médicos
            </h1>

            <p>
              Consulte o histórico clínico
              e registre novas informações
              dos seus pacientes.
            </p>

          </div>

          <span className="prontuario-selo">
            Acesso autorizado
          </span>

        </div>

        {/* MENSAGEM */}

        {mensagem && (
          <p
            className="prontuario-sucesso"
            role="status"
          >
            {mensagem}
          </p>
        )}

        {/* ====================================
            TELA INICIAL COM DOIS CARTÕES
        ==================================== */}

        {visaoClinica === "inicio" && (

          <div className="prontuario-opcoes">

            {/* CONSULTAR PRONTUÁRIOS */}

            <article className="prontuario-opcao">

              <div className="prontuario-icone">
                <IconeProntuario tipo="pasta" />
              </div>

              <h2>
                Consultar prontuários
              </h2>

              <p>
                Consulte os registros clínicos
                anteriores dos pacientes
                cadastrados para você.
              </p>

              <button
                type="button"
                className="prontuario-botao"
                onClick={() => {

                  setErro("");
                  setMensagem("");

                  setVisaoClinica("consultar");
                }}
              >
                Consultar prontuários
              </button>

            </article>

            {/* NOVO PRONTUÁRIO */}

            <article className="prontuario-opcao">

              <div className="prontuario-icone">
                <IconeProntuario tipo="documento" />
              </div>

              <h2>
                Novo prontuário
              </h2>

              <p>
                Crie um novo registro clínico
                para um paciente cadastrado,
                preservando os prontuários
                anteriores.
              </p>

              <button
                type="button"
                className="prontuario-botao"
                onClick={() => {

                  setErro("");
                  setMensagem("");

                  setVisaoClinica("novo");
                }}
              >
                Novo prontuário
              </button>

            </article>

          </div>

        )}

        {/* ====================================
            CONSULTAR PRONTUÁRIOS
        ==================================== */}

        {visaoClinica === "consultar" && (

          <PainelClinicoProntuarios
            key="consultar"
            modo="consultar"
            voltar={() => {

              setVisaoClinica("inicio");
            }}
            acessoExpirado={acessoExpirado}
          />

        )}

        {/* ====================================
            NOVO PRONTUÁRIO
        ==================================== */}

        {visaoClinica === "novo" && (

          <PainelClinicoProntuarios
            key="novo"
            modo="novo"
            voltar={() => {

              setVisaoClinica("inicio");
            }}
            acessoExpirado={acessoExpirado}
          />

        )}

        {/* OBSERVAÇÃO DA SEGURANÇA */}

      

      </section>
    );
  }

  // ========================================
  // RECUPERAÇÃO — SOLICITAR CÓDIGO
  // ========================================

  if (
    estado === "recuperacao-solicitar"
  ) {

    return (
      <section className="prontuario-pagina">

        <div className="prontuario-cartao">

          <div className="prontuario-cadeado">
            <IconeProntuario tipo="email" />
          </div>

          <h1>
            Recuperar senha
          </h1>

          <p className="prontuario-descricao">
            Vamos enviar um código de
            verificação de seis dígitos
            ao e-mail cadastrado.
          </p>

          <p className="prontuario-ajuda prontuario-texto-central">
            Por segurança, o código será
            enviado somente ao endereço
            associado à conta médica.
          </p>

          <form
            className="prontuario-formulario"
            onSubmit={(evento) => {

              evento.preventDefault();

              void solicitarCodigo();
            }}
          >

            {erro && (
              <p
                className="prontuario-erro"
                role="alert"
              >
                {erro}
              </p>
            )}

            <button
              type="submit"
              className="prontuario-botao"
              disabled={processando}
            >
              {processando
                ? "Enviando código..."
                : "Enviar código por e-mail"}
            </button>

          </form>

          <button
            type="button"
            className="prontuario-link-voltar"
            onClick={voltarAoDesbloqueio}
            disabled={processando}
          >
            <IconeProntuario tipo="voltar" />
            Voltar ao acesso
          </button>

        </div>

      </section>
    );
  }

  // ========================================
  // RECUPERAÇÃO — INSERIR CÓDIGO
  // ========================================

  if (
    estado === "recuperacao-codigo"
  ) {

    return (
      <section className="prontuario-pagina">

        <div className="prontuario-cartao">

          <div className="prontuario-cadeado">
            <IconeProntuario tipo="chave" />
          </div>

          <h1>
            Definir nova senha
          </h1>

          <p className="prontuario-descricao">
            Informe o código enviado ao
            e-mail cadastrado e escolha uma
            nova senha para os prontuários.
          </p>

          {mensagem && (
            <p
              className="prontuario-sucesso"
              role="status"
            >
              {mensagem}
            </p>
          )}

          <form
            className="prontuario-formulario"
            onSubmit={concluirRecuperacao}
          >

            {/* CÓDIGO COM SEIS QUADRADOS */}

            <label id="titulo-codigo-prontuario">
              Código de verificação
            </label>

            <div
              className="prontuario-codigo-otp"
              role="group"
              aria-labelledby="titulo-codigo-prontuario"
            >

              {digitosCodigo.map(
                (digito, indice) => (

                  <input
                    key={indice}
                    ref={(elemento) => {

                      inputsCodigo.current[indice] =
                        elemento;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={
                      indice === 0
                        ? "one-time-code"
                        : "off"
                    }
                    aria-label={
                      `Dígito ${indice + 1} de 6`
                    }
                    maxLength={6}
                    value={digito}
                    onChange={(evento) => {

                      alterarDigito(
                        indice,
                        evento.target.value
                      );
                    }}
                    onKeyDown={(evento) => {

                      tratarTeclaCodigo(
                        evento,
                        indice
                      );
                    }}
                    onPaste={colarCodigo}
                    disabled={processando}
                  />

                )
              )}

            </div>

            {/* NOVA SENHA */}

            <label htmlFor="nova-senha-prontuario">
              Nova senha
            </label>

            <input
              id="nova-senha-prontuario"
              type={
                mostrarNovaSenha
                  ? "text"
                  : "password"
              }
              autoComplete="new-password"
              minLength={8}
              maxLength={100}
              value={novaSenha}
              placeholder="Digite a nova senha"
              onChange={(evento) => {

                setNovaSenha(
                  evento.target.value
                );
              }}
              disabled={processando}
              required
            />

            {/* CONFIRMAR NOVA SENHA */}

            <label
              htmlFor="confirmar-nova-senha-prontuario"
            >
              Confirmar nova senha
            </label>

            <input
              id="confirmar-nova-senha-prontuario"
              type={
                mostrarNovaSenha
                  ? "text"
                  : "password"
              }
              autoComplete="new-password"
              minLength={8}
              maxLength={100}
              value={confirmarNovaSenha}
              placeholder="Confirme a nova senha"
              onChange={(evento) => {

                setConfirmarNovaSenha(
                  evento.target.value
                );
              }}
              disabled={processando}
              required
            />

            {/* MOSTRAR SENHAS */}

            <label className="prontuario-mostrar-senha">

              <input
                type="checkbox"
                checked={mostrarNovaSenha}
                onChange={(evento) => {

                  setMostrarNovaSenha(
                    evento.target.checked
                  );
                }}
                disabled={processando}
              />

              Mostrar senhas

            </label>

            {/* ORIENTAÇÕES */}

            <p className="prontuario-ajuda">
              A senha deve possuir pelo
              menos oito caracteres,
              incluindo letra maiúscula,
              minúscula, número e
              caractere especial.
            </p>

            {/* ERROS */}

            {erro && (
              <p
                className="prontuario-erro"
                role="alert"
              >
                {erro}
              </p>
            )}

            {/* SALVAR NOVA SENHA */}

            <button
              type="submit"
              className="prontuario-botao"
              disabled={processando}
            >
              {processando
                ? "Redefinindo senha..."
                : "Redefinir senha"}
            </button>

          </form>

          {/* REENVIAR CÓDIGO */}

          <button
            type="button"
            className="prontuario-link"
            onClick={() => {

              void solicitarCodigo();
            }}
            disabled={processando}
          >
            Reenviar código
          </button>

          {/* VOLTAR */}

          <button
            type="button"
            className="prontuario-link-voltar"
            onClick={voltarAoDesbloqueio}
            disabled={processando}
          >
            <IconeProntuario tipo="voltar" />
            Voltar ao acesso
          </button>

          <p className="prontuario-observacao">
            O código expira em dez minutos.
            Ao solicitar outro código,
            o anterior será invalidado.
          </p>

        </div>

      </section>
    );
  }

  // ========================================
  // CADASTRO OU DESBLOQUEIO
  // ========================================

  const primeiroCadastro =
    estado === "cadastrar";

  return (
    <section className="prontuario-pagina">

      <div className="prontuario-cartao">

        {/* ÍCONE */}

        <div className="prontuario-cadeado">
          <IconeProntuario tipo="cadeado" />
        </div>

        {/* TÍTULO */}

        <h1>
          {primeiroCadastro
            ? "Criar senha dos prontuários"
            : "Acessar prontuários"}
        </h1>

        {/* DESCRIÇÃO */}

        <p className="prontuario-descricao">

          {primeiroCadastro
            ? (
              "Este é seu primeiro acesso. " +
              "Crie uma senha adicional para " +
              "proteger os prontuários médicos."
            )
            : (
              "Informe sua senha adicional " +
              "para acessar os prontuários."
            )}

        </p>

        {/* MENSAGEM */}

        {mensagem && (
          <p
            className="prontuario-sucesso"
            role="status"
          >
            {mensagem}
          </p>
        )}

        {/* FORMULÁRIO */}

        <form
          className="prontuario-formulario"
          onSubmit={
            primeiroCadastro
              ? cadastrarSenha
              : desbloquear
          }
        >

          <label htmlFor="senha-prontuario">
            Senha dos prontuários
          </label>

          <input
            id="senha-prontuario"
            type={
              mostrarSenha
                ? "text"
                : "password"
            }
            value={senha}
            onChange={(evento) => {

              setSenha(
                evento.target.value
              );
            }}
            autoComplete={
              primeiroCadastro
                ? "new-password"
                : "current-password"
            }
            minLength={
              primeiroCadastro ? 8 : 1
            }
            maxLength={100}
            placeholder="Digite sua senha"
            required
            disabled={processando}
          />

          {/* CONFIRMAR PRIMEIRO CADASTRO */}

          {primeiroCadastro && (
            <>

              <label
                htmlFor="confirmar-senha-prontuario"
              >
                Confirmar senha
              </label>

              <input
                id="confirmar-senha-prontuario"
                type={
                  mostrarSenha
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                minLength={8}
                maxLength={100}
                value={confirmarSenha}
                placeholder="Confirme sua senha"
                onChange={(evento) => {

                  setConfirmarSenha(
                    evento.target.value
                  );
                }}
                disabled={processando}
                required
              />

            </>
          )}

          {/* MOSTRAR SENHA */}

          <label className="prontuario-mostrar-senha">

            <input
              type="checkbox"
              checked={mostrarSenha}
              onChange={(evento) => {

                setMostrarSenha(
                  evento.target.checked
                );
              }}
              disabled={processando}
            />

            Mostrar senha

          </label>

          {/* REQUISITOS */}

          {primeiroCadastro && (
            <p className="prontuario-ajuda">
              A senha deve possuir pelo menos
              oito caracteres, incluindo letra
              maiúscula, minúscula, número
              e caractere especial.
            </p>
          )}

          {/* ERROS */}

          {erro && (
            <p
              className="prontuario-erro"
              role="alert"
            >
              {erro}
            </p>
          )}

          {/* BOTÃO PRINCIPAL */}

          <button
            type="submit"
            className="prontuario-botao"
            disabled={processando}
          >
            {processando
              ? "Aguarde..."
              : primeiroCadastro
                ? "Cadastrar e entrar"
                : "Desbloquear prontuários"}
          </button>

        </form>

        {/* RECUPERAR SENHA */}

        {!primeiroCadastro && (
          <button
            type="button"
            className="prontuario-link"
            onClick={abrirRecuperacao}
            disabled={processando}
          >
            Esqueci minha senha
          </button>
        )}

        {/* OBSERVAÇÃO */}

        <p className="prontuario-observacao">
          Esta área possui proteção adicional
          independente da senha principal
          do sistema.
        </p>

      </div>

    </section>
  );
}
