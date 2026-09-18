// Dependências da página de detalhes
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  atualizarStatusMedico,
  buscarMedico,
  excluirMedico
} from "../services/api";

import ModalSistema from "../components/ModalSistema";

import "../styles/detalheMedico.css";

// Estrutura dos dados do médico
interface Medico {
  id: number;
  crm: string;
  usuarioId: number;

  usuario: {
    id: number;
    nome: string;
    email: string;
    tipo: string;
    ativo: boolean;
    primeiroAcesso: boolean;
  };
}


// ========================================
// AÇÃO DE CONFIRMAÇÃO
// ========================================

type AcaoConfirmacao =
  | "BLOQUEAR"
  | "EXCLUIR"
  | null;


// Tela de detalhes do médico
export default function DetalheMedico() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [medico, setMedico] =
    useState<Medico | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [alterandoStatus, setAlterandoStatus] =
    useState(false);

  const [excluindo, setExcluindo] =
    useState(false);

  const [erro, setErro] =
    useState("");


  // ========================================
  // MODAL DE CONFIRMAÇÃO
  // ========================================

  const [
    acaoConfirmacao,
    setAcaoConfirmacao
  ] =
    useState<AcaoConfirmacao>(
      null
    );


  // ========================================
  // BUSCAR MÉDICO
  // ========================================

  useEffect(() => {
    async function carregarMedico() {
      try {
        setErro("");

        const dados =
          await buscarMedico(
            Number(id)
          );

        setMedico(
          dados.medico
        );

      } catch (erro) {
        setErro(
          erro instanceof Error
            ? erro.message
            : "Erro ao carregar médico."
        );

      } finally {
        setCarregando(false);
      }
    }

    carregarMedico();

  }, [id]);


  // ========================================
  // EXECUTAR ALTERAÇÃO DE STATUS
  // ========================================

  async function executarAlteracaoStatus(
    novoStatus: boolean
  ) {

    if (!medico) {
      return;
    }


    setAlterandoStatus(true);
    setErro("");


    try {

      const dados =
        await atualizarStatusMedico(
          medico.id,
          novoStatus
        );


      /*
        O endpoint retorna o Usuario
        atualizado.

        Preservamos os dados do Medico
        e atualizamos somente usuario.
      */
      setMedico(
        (medicoAtual) => {

          if (!medicoAtual) {
            return medicoAtual;
          }


          return {
            ...medicoAtual,

            usuario: {
              ...medicoAtual.usuario,
              ...dados.medico
            }
          };
        }
      );

    } catch (erro) {

      setErro(
        erro instanceof Error
          ? erro.message
          : "Erro ao atualizar status."
      );

    } finally {

      setAlterandoStatus(
        false
      );

    }
  }


  // ========================================
  // ATIVAR / BLOQUEAR MÉDICO
  // ========================================

  function alterarStatus() {

    if (!medico) {
      return;
    }


    /*
      Para BLOQUEAR mostramos
      o modal de confirmação.

      Para ATIVAR mantemos o
      comportamento direto que
      já existia.
    */
    if (
      medico.usuario.ativo
    ) {

      setAcaoConfirmacao(
        "BLOQUEAR"
      );

      return;
    }


    void executarAlteracaoStatus(
      true
    );
  }


  // ========================================
  // CONFIRMAR BLOQUEIO
  // ========================================

  async function confirmarBloqueio() {

    await executarAlteracaoStatus(
      false
    );


    setAcaoConfirmacao(
      null
    );
  }


  // ========================================
  // ABRIR CONFIRMAÇÃO DE EXCLUSÃO
  // ========================================

  function handleExcluir() {

    if (!medico) {
      return;
    }


    setAcaoConfirmacao(
      "EXCLUIR"
    );
  }


  // ========================================
  // CONFIRMAR EXCLUSÃO
  // ========================================

  async function confirmarExclusao() {

    if (!medico) {
      return;
    }


    setExcluindo(true);
    setErro("");


    try {

      await excluirMedico(
        medico.id
      );


      navigate(
        "/admin"
      );

    } catch (erro) {

      setErro(
        erro instanceof Error
          ? erro.message
          : "Erro ao excluir médico."
      );


      setAcaoConfirmacao(
        null
      );

    } finally {

      setExcluindo(
        false
      );

    }
  }


  // ========================================
  // CARREGANDO
  // ========================================

  if (carregando) {
    return (
      <div className="detalhe-medico-page">
        <p>
          Carregando médico...
        </p>
      </div>
    );
  }


  // ========================================
  // ERRO AO BUSCAR
  // ========================================

  if (
    erro &&
    !medico
  ) {
    return (
      <div className="detalhe-medico-page">

        <p className="detalhe-erro">
          {erro}
        </p>

        <button
          onClick={() =>
            navigate(
              "/admin"
            )
          }
        >
          Voltar
        </button>

      </div>
    );
  }


  // ========================================
  // MÉDICO NÃO ENCONTRADO
  // ========================================

  if (!medico) {
    return null;
  }


  // ========================================
  // INTERFACE
  // ========================================

  return (
    <div className="detalhe-medico-page">

      <div className="detalhe-medico-container">

        <div className="detalhe-medico-header">

          <div>

            <h1>
              Detalhes do médico
            </h1>

            <p>
              Informações do profissional cadastrado
            </p>

          </div>


          <button
            className="btn-voltar"
            onClick={() =>
              navigate(
                "/admin"
              )
            }
          >
            Voltar
          </button>

        </div>


        <div className="detalhe-medico-card">

          <div className="detalhe-linha">

            <span>
              Nome
            </span>

            <strong>
              {medico.usuario.nome}
            </strong>

          </div>


          <div className="detalhe-linha">

            <span>
              E-mail
            </span>

            <strong>
              {medico.usuario.email}
            </strong>

          </div>


          <div className="detalhe-linha">

            <span>
              CRM
            </span>

            <strong>
              {medico.crm}
            </strong>

          </div>


          <div className="detalhe-linha">

            <span>
              Status
            </span>

            <strong
              className={
                medico.usuario.ativo
                  ? "status ativo"
                  : "status inativo"
              }
            >
              {
                medico.usuario.ativo
                  ? "Ativo"
                  : "Bloqueado"
              }
            </strong>

          </div>


          {/* ========================================
              STATUS DO PRIMEIRO ACESSO
             ======================================== */}

          <div className="detalhe-linha">

            <span>
              Acesso ao sistema
            </span>

            <strong>
              {
                medico.usuario.primeiroAcesso
                  ? "Aguardando primeiro acesso"
                  : "Primeiro acesso concluído"
              }
            </strong>

          </div>


          {
            medico.usuario.primeiroAcesso && (

              <div className="detalhe-linha">

                <span>
                  Orientação
                </span>

                <strong>
                  O médico deve utilizar a opção
                  "Primeiro acesso" na tela de login
                  para criar sua senha.
                </strong>

              </div>

            )
          }


          {erro && (
            <p className="detalhe-erro">
              {erro}
            </p>
          )}


          <div className="detalhe-acoes">

            <button
              className={
                medico.usuario.ativo
                  ? "btn-bloquear"
                  : "btn-ativar"
              }
              onClick={
                alterarStatus
              }
              disabled={
                alterandoStatus ||
                excluindo
              }
            >
              {
                alterandoStatus
                  ? "Atualizando..."
                  : medico.usuario.ativo
                    ? "Bloquear médico"
                    : "Ativar médico"
              }
            </button>


            <button
              className="btn-excluir"
              onClick={
                handleExcluir
              }
              disabled={
                excluindo ||
                alterandoStatus
              }
            >
              {
                excluindo
                  ? "Excluindo..."
                  : "Excluir médico"
              }
            </button>

          </div>

        </div>

      </div>


      {/* ========================================
          MODAL - BLOQUEAR MÉDICO
         ======================================== */}

      <ModalSistema
        aberto={
          acaoConfirmacao ===
          "BLOQUEAR"
        }
        tipo="aviso"
        titulo="Bloquear médico"
        mensagem={
          medico
            ? `Tem certeza que deseja bloquear o médico ${medico.usuario.nome}? O acesso ao sistema ficará bloqueado até que o administrador o reative.`
            : ""
        }
        textoConfirmar="Bloquear"
        textoCancelar="Cancelar"
        carregando={
          alterandoStatus
        }
        onConfirmar={
          confirmarBloqueio
        }
        onCancelar={() =>
          setAcaoConfirmacao(
            null
          )
        }
      />


      {/* ========================================
          MODAL - EXCLUIR MÉDICO
         ======================================== */}

      <ModalSistema
        aberto={
          acaoConfirmacao ===
          "EXCLUIR"
        }
        tipo="perigo"
        titulo="Excluir médico"
        mensagem={
          medico
            ? `Tem certeza que deseja excluir o médico ${medico.usuario.nome}? Esta ação não poderá ser desfeita.`
            : ""
        }
        textoConfirmar="Excluir"
        textoCancelar="Cancelar"
        carregando={
          excluindo
        }
        onConfirmar={
          confirmarExclusao
        }
        onCancelar={() =>
          setAcaoConfirmacao(
            null
          )
        }
      />

    </div>
  );
}
