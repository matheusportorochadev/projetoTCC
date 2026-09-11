// Dependências da página administrativa
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarMedicos } from "../services/api";
import "../styles/admin.css";

// Estrutura dos dados de médico
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

// Dashboard principal do administrador
export default function Admin() {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Busca os médicos cadastrados no backend
  useEffect(() => {
    async function carregarMedicos() {
      try {
        const dados = await listarMedicos();
        setMedicos(dados.medicos);
      } catch (erro) {
        setErro(
          erro instanceof Error
            ? erro.message
            : "Erro ao carregar médicos."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarMedicos();
  }, []);

  // Encerra a sessão do administrador
  function sair() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  }

  const medicosAtivos = medicos.filter(
    (medico) => medico.usuario.ativo
  ).length;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Painel Administrativo</h1>
          <p>Gerenciamento do sistema médico</p>
        </div>

        <button onClick={sair}>
          Sair
        </button>
      </header>

      <main className="admin-content">
        <section className="admin-cards">
          <div className="admin-card">
            <span>Médicos cadastrados</span>
            <strong>{medicos.length}</strong>
          </div>

          <div className="admin-card">
            <span>Médicos ativos</span>
            <strong>{medicosAtivos}</strong>
          </div>

          <div className="admin-card">
            <span>Pacientes cadastrados</span>
            <strong>0</strong>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>Médicos</h2>
              <p>Profissionais cadastrados no sistema</p>
            </div>

            <button
              onClick={() =>
                navigate("/admin/medicos/cadastrar")
              }
            >
              + Cadastrar médico
            </button>
          </div>

          {carregando && (
            <p>Carregando médicos...</p>
          )}

          {erro && (
            <p className="admin-error">{erro}</p>
          )}

          {!carregando &&
            !erro &&
            medicos.length === 0 && (
              <p>Nenhum médico cadastrado.</p>
            )}

          <div className="medicos-lista">
            {medicos.map((medico) => (
              <button
                key={medico.id}
                className="medico-item"
                onClick={() =>
                  navigate(`/admin/medicos/${medico.id}`)
                }
              >
                <div>
                  <strong>{medico.usuario.nome}</strong>
                  <span>{medico.usuario.email}</span>
                </div>

                <div>
                  <span>{medico.crm}</span>

                  <span
                    className={
                      medico.usuario.ativo
                        ? "status ativo"
                        : "status inativo"
                    }
                  >
                    {medico.usuario.ativo
                      ? "Ativo"
                      : "Bloqueado"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}