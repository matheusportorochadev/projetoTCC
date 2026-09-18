// ========================================
// LAYOUT DA ÁREA DO MÉDICO
// ========================================

import {
  NavLink,
  Outlet,
  useNavigate
} from "react-router-dom";

import {
  useState
} from "react";

import {
  fazerLogout
} from "../services/api";

import BotaoTema from "../components/BotaoTema";

import "../styles/medicoLayout.css";


// ========================================
// COMPONENTE
// ========================================

export default function MedicoLayout() {

  const navigate =
    useNavigate();


  // ========================================
  // MENU MOBILE
  // ========================================

  const [
    menuAberto,
    setMenuAberto
  ] =
    useState(false);


  // ========================================
  // DADOS DO USUÁRIO
  // ========================================

  /*
    O JWT não deve mais ser obtido
    pelo localStorage.

    O objeto "usuario" permanece
    temporariamente apenas para
    informações visuais como nome.
  */
  const usuarioSalvo =
    localStorage.getItem(
      "usuario"
    );


  const usuario =
    usuarioSalvo
      ? JSON.parse(
          usuarioSalvo
        )
      : null;


  // ========================================
  // LOGOUT
  // ========================================

  async function sair() {

    try {

      /*
        Chama:

        POST /auth/logout

        O backend remove o cookie:

        access_token
      */
      await fazerLogout();

    } catch (erro) {

      console.error(
        "Erro ao realizar logout:",
        erro
      );

    } finally {

      /*
        Remove qualquer token antigo
        que ainda tenha ficado salvo
        durante a migração.
      */
      localStorage.removeItem(
        "token"
      );


      localStorage.removeItem(
        "usuario"
      );


      setMenuAberto(
        false
      );


      navigate(
        "/login"
      );

    }
  }


  // ========================================
  // FECHAR MENU
  // ========================================

  function fecharMenu() {

    setMenuAberto(
      false
    );

  }


  // ========================================
  // INTERFACE
  // ========================================

  return (
    <div className="medico-layout">

      <header className="medico-navbar">

        {/* LOGO */}
        <div className="medico-navbar-brand">

          <h2>
            Sistema Médico
          </h2>

        </div>


        {/* MENU MOBILE */}
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
          aria-expanded={
            menuAberto
          }
        >

          <span></span>
          <span></span>
          <span></span>

        </button>


        {/* CONTEÚDO DA NAVBAR */}
        <div
          className={
            menuAberto
              ? "medico-navbar-conteudo aberto"
              : "medico-navbar-conteudo"
          }
        >

          {/* NAVEGAÇÃO */}
          <nav className="medico-navbar-menu">

            <NavLink
              to="/medico/pacientes"
              onClick={
                fecharMenu
              }
              className={({
                isActive
              }) =>
                isActive
                  ? "medico-nav-link ativo"
                  : "medico-nav-link"
              }
            >
              Pacientes
            </NavLink>


            <NavLink
              to="/medico/agenda"
              onClick={
                fecharMenu
              }
              className={({
                isActive
              }) =>
                isActive
                  ? "medico-nav-link ativo"
                  : "medico-nav-link"
              }
            >
              Agenda
            </NavLink>


            <NavLink
              to="/medico/prontuarios"
              onClick={
                fecharMenu
              }
              className={({
                isActive
              }) =>
                isActive
                  ? "medico-nav-link ativo"
                  : "medico-nav-link"
              }
            >
              Prontuários
            </NavLink>

          </nav>


          {/* USUÁRIO */}
          <div className="medico-navbar-user">

            <span className="medico-nome-usuario">

              {
                usuario?.nome ||
                "Médico"
              }

            </span>


            <BotaoTema />


            <button
              type="button"
              className="medico-btn-sair"
              onClick={
                sair
              }
            >
              Sair
            </button>

          </div>

        </div>

      </header>


      {/* CONTEÚDO */}
      <main className="medico-main">

        <Outlet />

      </main>

    </div>
  );
}