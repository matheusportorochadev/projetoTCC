import {
  NavLink,
  Outlet,
  useNavigate
} from "react-router-dom";

import {
  useState
} from "react";

import "../styles/medicoLayout.css";

import BotaoTema from "../components/BotaoTema";

// Layout principal da área do médico
export default function MedicoLayout() {

  const navigate = useNavigate();

  // Controla se o menu mobile está aberto ou fechado
  const [menuAberto, setMenuAberto] =
    useState(false);

  // Busca os dados do usuário salvos
  const usuarioSalvo =
    localStorage.getItem("usuario");

  const usuario = usuarioSalvo
    ? JSON.parse(usuarioSalvo)
    : null;

  // Encerra a sessão
  function sair() {

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    navigate("/login");
  }

  // Fecha o menu quando o usuário
  // clicar em alguma opção
  function fecharMenu() {
    setMenuAberto(false);
  }

  return (
    <div className="medico-layout">

      <header className="medico-navbar">

        {/* Logo / nome do sistema */}
        <div className="medico-navbar-brand">
          <h2>
            Sistema Médico
          </h2>
        </div>


        {/* Botão do menu mobile */}
        <button
          type="button"
          className="medico-menu-toggle"
          onClick={() =>
            setMenuAberto(
              (estadoAtual) =>
                !estadoAtual
            )
          }
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
        >

          {/* Ícone hambúrguer */}
          <span></span>
          <span></span>
          <span></span>

        </button>


        {/* Conteúdo da navbar */}
        <div
          className={
            menuAberto
              ? "medico-navbar-conteudo aberto"
              : "medico-navbar-conteudo"
          }
        >

          {/* Navegação */}
          <nav className="medico-navbar-menu">

            <NavLink
              to="/medico/pacientes"
              onClick={fecharMenu}
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
              onClick={fecharMenu}
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
              onClick={fecharMenu}
              className={({ isActive }) =>
                isActive
                  ? "medico-nav-link ativo"
                  : "medico-nav-link"
              }
            >
              Prontuários
            </NavLink>

          </nav>


          {/* Área do usuário */}
          <div className="medico-navbar-user">

            <span className="medico-nome-usuario">
              {usuario?.nome || "Médico"}
            </span>

            <BotaoTema />

            <button
              type="button"
              className="medico-btn-sair"
              onClick={sair}
            >
              Sair
            </button>

          </div>

        </div>

      </header>


      {/* Conteúdo das páginas */}
      <main className="medico-main">
        <Outlet />
      </main>

    </div>
  );
}