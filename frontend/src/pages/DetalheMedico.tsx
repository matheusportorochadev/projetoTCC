// Dependências da página de detalhes
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  atualizarStatusMedico,
  buscarMedico,
  excluirMedico
} from "../services/api";
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
  };
}

// Tela de detalhes do médico
export default function DetalheMedico() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [medico, setMedico] = useState<Medico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  // Busca os dados do médico
  useEffect(() => {
    async function carregarMedico() {
      try {
        const dados = await buscarMedico(Number(id));
        setMedico(dados.medico);
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

  // Ativa ou bloqueia o médico
  async function alterarStatus() {
    if (!medico) {
      return;
    }

    if (medico.usuario.ativo) {
      const confirmar = window.confirm(
        `Tem certeza que deseja bloquear o médico ${medico.usuario.nome}?`
      );

      if (!confirmar) {
        return;
      }
    }

    setAlterandoStatus(true);
    setErro("");

    try {
      const dados = await atualizarStatusMedico(
        medico.id,
        !medico.usuario.ativo
      );

      setMedico(dados.medico);
    } catch (erro) {
      setErro(
        erro instanceof Error
          ? erro.message
          : "Erro ao atualizar status."
      );
    } finally {
      setAlterandoStatus(false);
    }
  }

  // Exclui o médico
  async function handleExcluir() {
    if (!medico) {
      return;
    }

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir o médico ${medico.usuario.nome}? Esta ação não poderá ser desfeita.`
    );

    if (!confirmar) {
      return;
    }

    setExcluindo(true);
    setErro("");

    try {
      await excluirMedico(medico.id);
      navigate("/admin");
    } catch (erro) {
      setErro(
        erro instanceof Error
          ? erro.message
          : "Erro ao excluir médico."
      );

      setExcluindo(false);
    }
  }

  if (carregando) {
    return (
      <div className="detalhe-medico-page">
        <p>Carregando médico...</p>
      </div>
    );
  }

  if (erro && !medico) {
    return (
      <div className="detalhe-medico-page">
        <p className="detalhe-erro">{erro}</p>

        <button onClick={() => navigate("/admin")}>
          Voltar
        </button>
      </div>
    );
  }

  if (!medico) {
    return null;
  }

  return (
    <div className="detalhe-medico-page">
      <div className="detalhe-medico-container">
        <div className="detalhe-medico-header">
          <div>
            <h1>Detalhes do médico</h1>
            <p>Informações do profissional cadastrado</p>
          </div>

          <button
            className="btn-voltar"
            onClick={() => navigate("/admin")}
          >
            Voltar
          </button>
        </div>

        <div className="detalhe-medico-card">
          <div className="detalhe-linha">
            <span>Nome</span>
            <strong>{medico.usuario.nome}</strong>
          </div>

          <div className="detalhe-linha">
            <span>E-mail</span>
            <strong>{medico.usuario.email}</strong>
          </div>

          <div className="detalhe-linha">
            <span>CRM</span>
            <strong>{medico.crm}</strong>
          </div>

          <div className="detalhe-linha">
            <span>Status</span>

            <strong
              className={
                medico.usuario.ativo
                  ? "status ativo"
                  : "status inativo"
              }
            >
              {medico.usuario.ativo
                ? "Ativo"
                : "Bloqueado"}
            </strong>
          </div>

          {erro && (
            <p className="detalhe-erro">{erro}</p>
          )}

          <div className="detalhe-acoes">
            <button
              className={
                medico.usuario.ativo
                  ? "btn-bloquear"
                  : "btn-ativar"
              }
              onClick={alterarStatus}
              disabled={alterandoStatus || excluindo}
            >
              {alterandoStatus
                ? "Atualizando..."
                : medico.usuario.ativo
                  ? "Bloquear médico"
                  : "Ativar médico"}
            </button>

            <button
              className="btn-excluir"
              onClick={handleExcluir}
              disabled={excluindo || alterandoStatus}
            >
              {excluindo
                ? "Excluindo..."
                : "Excluir médico"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}