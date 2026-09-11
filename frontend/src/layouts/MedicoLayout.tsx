// Dependências do layout
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../styles/medicoLayout.css";

// Layout principal da área do médico
export default function MedicoLayout() {
  const navigate = useNavigate();

  const usuarioSalvo = localStorage.getItem("usuario");

  const usuario = usuarioSalvo
    ? JSON.parse(usuarioSalvo)
    : null;

  // Encerra a sessão do usuário
  function sair() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    navigate("/login");
  }

  return (
    <div className="medico-layout">
      <header className="medico-navbar">
        <div className="medico-navbar-brand">
          <h2>Sistema Médico</h2>
        </div>

        <nav className="medico-navbar-menu">
          <NavLink
            to="/medico/pacientes"
            className={({ isActive }) =>
              isActive
                ? "medico-nav-link ativo"
                : "medico-nav-link"
            }
          >
            Pacientes
          </NavLink>

          <NavLink
            to="/medico/agenda"
            className={({ isActive }) =>
              isActive
                ? "medico-nav-link ativo"
                : "medico-nav-link"
            }
          >
            Agenda
          </NavLink>

          <NavLink
            to="/medico/prontuarios"
            className={({ isActive }) =>
              isActive
                ? "medico-nav-link ativo"
                : "medico-nav-link"
            }
          >
            Prontuários
          </NavLink>
        </nav>

        <div className="medico-navbar-user">
          <span>
            {usuario?.nome || "Médico"}
          </span>

          <button
            className="medico-btn-sair"
            onClick={sair}
          >
            Sair
          </button>
        </div>
      </header>

      <main className="medico-main">
        <Outlet />
      </main>
    </div>
  );
}