import {
  useEffect,
  useMemo,
  useState
} from "react";

import { Link } from "react-router-dom";

import "../../styles/pacientes.css";


// ========================================
// TIPOS
// ========================================

// Estrutura de um paciente retornado
// pelo backend.
type Paciente = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  ativo: boolean;
  acessoLiberado: boolean;
};


// ========================================
// FORMATAR CPF
// ========================================

// Formata o CPF somente para exibição.
//
// Exemplo:
// 12345678901
//
// vira:
//
// 123.456.789-01
function formatarCpf(
  cpf: string | null
) {
  if (!cpf) {
    return "-";
  }

  const numeros =
    cpf.replace(/\D/g, "");

  if (numeros.length !== 11) {
    return cpf;
  }

  return numeros.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}


// ========================================
// FORMATAR TELEFONE
// ========================================

// Formata telefone/celular
// somente para exibição.
function formatarTelefone(
  telefone: string | null
) {
  if (!telefone) {
    return "-";
  }

  const numeros =
    telefone.replace(/\D/g, "");

  // Celular com 11 números
  if (numeros.length === 11) {
    return numeros.replace(
      /(\d{2})(\d{5})(\d{4})/,
      "($1) $2-$3"
    );
  }

  // Telefone com 10 números
  if (numeros.length === 10) {
    return numeros.replace(
      /(\d{2})(\d{4})(\d{4})/,
      "($1) $2-$3"
    );
  }

  return telefone;
}


// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function Pacientes() {
  // Lista completa de pacientes
  const [
    pacientes,
    setPacientes
  ] = useState<Paciente[]>([]);


  // Texto da pesquisa
  const [
    busca,
    setBusca
  ] = useState("");


  // Controla o carregamento
  const [
    carregando,
    setCarregando
  ] = useState(true);


  // Mensagem de erro geral
  const [
    erro,
    setErro
  ] = useState("");


  // Paciente atualmente aberto
  // no modal.
  const [
    pacienteSelecionado,
    setPacienteSelecionado
  ] =
    useState<Paciente | null>(
      null
    );


  // Controla quando uma ação
  // do modal está sendo executada.
  const [
    processando,
    setProcessando
  ] = useState(false);


  // Mensagem de erro dentro
  // do modal.
  const [
    erroModal,
    setErroModal
  ] = useState("");


  // ========================================
  // CARREGAMENTO INICIAL
  // ========================================

  useEffect(() => {
    carregarPacientes();
  }, []);


  // ========================================
  // CARREGAR PACIENTES
  // ========================================

  async function carregarPacientes() {
    try {
      setCarregando(true);
      setErro("");

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        throw new Error(
          "Sessão não encontrada."
        );
      }

      const resposta =
        await fetch(
          "http://localhost:3000/pacientes",
          {
            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Erro ao carregar pacientes."
        );
      }

      setPacientes(dados);
    } catch (erro) {
      setErro(
        erro instanceof Error
          ? erro.message
          : "Erro ao carregar pacientes."
      );
    } finally {
      setCarregando(false);
    }
  }


  // ========================================
  // ABRIR MODAL
  // ========================================

  function abrirModal(
    paciente: Paciente
  ) {
    setPacienteSelecionado(
      paciente
    );

    setErroModal("");
  }


  // ========================================
  // FECHAR MODAL
  // ========================================

  function fecharModal() {
    // Impede fechar enquanto alguma
    // operação estiver sendo executada.
    if (processando) {
      return;
    }

    setPacienteSelecionado(
      null
    );

    setErroModal("");
  }


  // ========================================
  // ATUALIZAR PACIENTE LOCALMENTE
  // ========================================

  // Atualiza o paciente na tabela
  // sem precisar recarregar a página.
  function atualizarPacienteNaLista(
    pacienteAtualizado: Paciente
  ) {
    setPacientes(
      pacientesAtuais =>
        pacientesAtuais.map(
          paciente =>
            paciente.id ===
            pacienteAtualizado.id
              ? pacienteAtualizado
              : paciente
        )
    );

    setPacienteSelecionado(
      pacienteAtualizado
    );
  }


  // ========================================
  // LIBERAR / BLOQUEAR ACESSO
  // ========================================

  async function alterarAcesso() {
    if (!pacienteSelecionado) {
      return;
    }

    try {
      setProcessando(true);
      setErroModal("");

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        throw new Error(
          "Sessão não encontrada."
        );
      }

      // Inverte o estado atual.
      //
      // Se está liberado:
      // true -> false
      //
      // Se está bloqueado:
      // false -> true
      const novoAcesso =
        !pacienteSelecionado
          .acessoLiberado;

      const resposta =
        await fetch(
          `http://localhost:3000/pacientes/${pacienteSelecionado.id}/acesso`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`
            },

            body: JSON.stringify({
              acessoLiberado:
                novoAcesso
            })
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Erro ao atualizar acesso."
        );
      }

      // Atualiza a tabela e o modal
      // com o paciente retornado
      // pelo backend.
      atualizarPacienteNaLista(
        dados
      );
    } catch (erro) {
      setErroModal(
        erro instanceof Error
          ? erro.message
          : "Erro ao atualizar acesso."
      );
    } finally {
      setProcessando(false);
    }
  }


  // ========================================
  // ATIVAR / BLOQUEAR PACIENTE
  // ========================================

  async function alterarStatus() {
    if (!pacienteSelecionado) {
      return;
    }

    try {
      setProcessando(true);
      setErroModal("");

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        throw new Error(
          "Sessão não encontrada."
        );
      }

      const novoStatus =
        !pacienteSelecionado.ativo;

      const resposta =
        await fetch(
          `http://localhost:3000/pacientes/${pacienteSelecionado.id}/status`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`
            },

            body: JSON.stringify({
              ativo:
                novoStatus
            })
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Erro ao atualizar status."
        );
      }

      atualizarPacienteNaLista(
        dados
      );
    } catch (erro) {
      setErroModal(
        erro instanceof Error
          ? erro.message
          : "Erro ao atualizar status."
      );
    } finally {
      setProcessando(false);
    }
  }


  // ========================================
  // EXCLUIR PACIENTE
  // ========================================

  async function excluirPaciente() {
    if (!pacienteSelecionado) {
      return;
    }

    // Confirmação antes de excluir.
    const confirmou =
      window.confirm(
        `Deseja realmente excluir o paciente "${pacienteSelecionado.nome}"?`
      );

    if (!confirmou) {
      return;
    }

    try {
      setProcessando(true);
      setErroModal("");

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        throw new Error(
          "Sessão não encontrada."
        );
      }

      const resposta =
        await fetch(
          `http://localhost:3000/pacientes/${pacienteSelecionado.id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Erro ao excluir paciente."
        );
      }

      // Remove o paciente da lista.
      setPacientes(
        pacientesAtuais =>
          pacientesAtuais.filter(
            paciente =>
              paciente.id !==
              pacienteSelecionado.id
          )
      );

      // Fecha o modal.
      setPacienteSelecionado(
        null
      );
    } catch (erro) {
      setErroModal(
        erro instanceof Error
          ? erro.message
          : "Erro ao excluir paciente."
      );
    } finally {
      setProcessando(false);
    }
  }


  // ========================================
  // FILTRO DE PACIENTES
  // ========================================

  const pacientesFiltrados =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      if (!termo) {
        return pacientes;
      }

      const termoNumerico =
        termo.replace(
          /\D/g,
          ""
        );

      return pacientes.filter(
        paciente => {
          const nome =
            paciente.nome
              .toLowerCase();

          const email =
            paciente.email
              ?.toLowerCase() ||
            "";

          const cpf =
            paciente.cpf ||
            "";

          const telefone =
            paciente.telefone ||
            "";

          return (
            nome.includes(termo) ||
            email.includes(termo) ||
            cpf.includes(
              termoNumerico
            ) ||
            telefone.includes(
              termoNumerico
            )
          );
        }
      );
    }, [
      busca,
      pacientes
    ]);


  // ========================================
  // INTERFACE
  // ========================================

  return (
    <div className="pacientes-pagina">

      {/* ============================= */}
      {/* CABEÇALHO */}
      {/* ============================= */}

      <div className="pacientes-cabecalho">
        <div>
          <h1>
            Pacientes
          </h1>
        </div>

        <Link
          to="/medico/pacientes/novo"
          className="botao-novo-paciente"
        >
          Novo paciente
        </Link>
      </div>


      {/* ============================= */}
      {/* PESQUISA */}
      {/* ============================= */}

      <div className="pacientes-filtros">
        <input
          type="text"
          placeholder="Buscar por nome, CPF, celular ou e-mail"
          value={busca}
          onChange={event =>
            setBusca(
              event.target.value
            )
          }
        />
      </div>


      {/* ============================= */}
      {/* CARREGAMENTO */}
      {/* ============================= */}

      {carregando && (
        <p>
          Carregando pacientes...
        </p>
      )}


      {/* ============================= */}
      {/* ERRO */}
      {/* ============================= */}

      {erro && (
        <div className="pacientes-erro">
          {erro}
        </div>
      )}


      {/* ============================= */}
      {/* LISTA VAZIA */}
      {/* ============================= */}

      {!carregando &&
        !erro &&
        pacientesFiltrados.length ===
          0 && (
          <div className="pacientes-vazio">
            Nenhum paciente encontrado.
          </div>
        )}


      {/* ============================= */}
      {/* TABELA */}
      {/* ============================= */}

      {!carregando &&
        !erro &&
        pacientesFiltrados.length >
          0 && (
          <div className="pacientes-tabela-container">

            <table className="pacientes-tabela">

              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Celular</th>
                  <th>Status</th>
                  <th>Acesso</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>

                {pacientesFiltrados.map(
                  paciente => (
                    <tr
                      key={
                        paciente.id
                      }
                    >

                      {/* NOME / E-MAIL */}

                      <td>
                        <strong>
                          {
                            paciente.nome
                          }
                        </strong>

                        {paciente.email && (
                          <span className="paciente-email">
                            {
                              paciente.email
                            }
                          </span>
                        )}
                      </td>


                      {/* CPF */}

                      <td>
                        {formatarCpf(
                          paciente.cpf
                        )}
                      </td>


                      {/* TELEFONE */}

                      <td>
                        {formatarTelefone(
                          paciente.telefone
                        )}
                      </td>


                      {/* STATUS */}

                      <td>
                        <span
                          className={
                            paciente.ativo
                              ? "status status-ativo"
                              : "status status-bloqueado"
                          }
                        >
                          {paciente.ativo
                            ? "Ativo"
                            : "Bloqueado"}
                        </span>
                      </td>


                      {/* ACESSO */}

                      <td>
                        <span
                          className={
                            paciente
                              .acessoLiberado
                              ? "status status-acesso"
                              : "status status-sem-acesso"
                          }
                        >
                          {paciente
                            .acessoLiberado
                            ? "Liberado"
                            : "Bloqueado"}
                        </span>
                      </td>


                      {/* BOTÃO VER */}

                      <td>
                        <button
                          type="button"
                          className="botao-detalhes"
                          onClick={() =>
                            abrirModal(
                              paciente
                            )
                          }
                        >
                          Ver
                        </button>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}


      {/* ================================= */}
      {/* MODAL DO PACIENTE */}
      {/* ================================= */}

      {pacienteSelecionado && (
        <div
          className="paciente-modal-overlay"
          onMouseDown={
            fecharModal
          }
        >

          <div
            className="paciente-modal"
            onMouseDown={event =>
              event.stopPropagation()
            }
          >

            {/* CABEÇALHO */}

            <div className="paciente-modal-cabecalho">

              <div>
                <span className="paciente-modal-subtitulo">
                  Paciente
                </span>

                <h2>
                  {
                    pacienteSelecionado.nome
                  }
                </h2>
              </div>

              <button
                type="button"
                className="paciente-modal-fechar"
                onClick={
                  fecharModal
                }
                disabled={
                  processando
                }
              >
                ×
              </button>

            </div>


            {/* ERRO */}

            {erroModal && (
              <div className="paciente-modal-erro">
                {erroModal}
              </div>
            )}


            {/* INFORMAÇÕES */}

            <div className="paciente-modal-informacoes">

              <div className="paciente-modal-campo">
                <span>
                  E-mail
                </span>

                <strong>
                  {
                    pacienteSelecionado.email ||
                    "-"
                  }
                </strong>
              </div>


              <div className="paciente-modal-campo">
                <span>
                  CPF
                </span>

                <strong>
                  {formatarCpf(
                    pacienteSelecionado.cpf
                  )}
                </strong>
              </div>


              <div className="paciente-modal-campo">
                <span>
                  Telefone
                </span>

                <strong>
                  {formatarTelefone(
                    pacienteSelecionado
                      .telefone
                  )}
                </strong>
              </div>


              <div className="paciente-modal-campo">
                <span>
                  Status
                </span>

                <strong>
                  {pacienteSelecionado
                    .ativo
                    ? "Ativo"
                    : "Bloqueado"}
                </strong>
              </div>


              <div className="paciente-modal-campo">
                <span>
                  Acesso ao sistema
                </span>

                <strong>
                  {pacienteSelecionado
                    .acessoLiberado
                    ? "Liberado"
                    : "Bloqueado"}
                </strong>
              </div>

            </div>


            {/* ========================= */}
            {/* AÇÕES */}
            {/* ========================= */}

            <div className="paciente-modal-acoes">

              {/* EDITAR */}

              <Link
                to={`/medico/pacientes/${pacienteSelecionado.id}`}
                className="paciente-acao paciente-acao-editar"
              >
                Editar paciente
              </Link>


              {/* LIBERAR / BLOQUEAR ACESSO */}

              <button
                type="button"
                className="paciente-acao paciente-acao-acesso"
                onClick={
                  alterarAcesso
                }
                disabled={
                  processando
                }
              >
                {processando
                  ? "Processando..."
                  : pacienteSelecionado
                      .acessoLiberado
                    ? "Bloquear acesso"
                    : "Liberar acesso"}
              </button>


              {/* ATIVAR / BLOQUEAR */}

              <button
                type="button"
                className="paciente-acao paciente-acao-status"
                onClick={
                  alterarStatus
                }
                disabled={
                  processando
                }
              >
                {pacienteSelecionado
                  .ativo
                  ? "Bloquear paciente"
                  : "Ativar paciente"}
              </button>


              {/* EXCLUIR */}

              <button
                type="button"
                className="paciente-acao paciente-acao-excluir"
                onClick={
                  excluirPaciente
                }
                disabled={
                  processando
                }
              >
                Excluir paciente
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}