// ========================================
// LAYOUT DA ÁREA DO PACIENTE
// ========================================

import {
  NavLink,
  Outlet,
  useNavigate
} from "react-router-dom";

import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  fazerLogout
} from "../services/api";

import "../styles/pacienteLayout.css";


// ========================================
// COMPONENTE
// ========================================

export default function PacienteLayout() {

  // ========================================
  // NAVEGAÇÃO
  // ========================================

  const navigate =
    useNavigate();


  // ========================================
  // REFERÊNCIA DO MENU RESPONSIVO
  // ========================================

  const menuResponsivoRef =
    useRef<HTMLDivElement | null>(
      null
    );


  // ========================================
  // USUÁRIO
  // ========================================

  /*
    O usuário continua salvo localmente
    somente para exibir informações
    visuais como o nome.

    O JWT não deve mais depender
    desse armazenamento.
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
  // TEMA
  // ========================================

  const [
    temaEscuro,
    setTemaEscuro
  ] =
    useState(

      localStorage.getItem(
        "tema"
      ) === "escuro"

    );


  // ========================================
  // MENU RESPONSIVO
  // ========================================

  const [
    menuAberto,
    setMenuAberto
  ] =
    useState(false);


  // ========================================
  // APLICAR TEMA
  // ========================================

  useEffect(() => {

    if (
      temaEscuro
    ) {

      document.body.classList.add(
        "modo-escuro"
      );

    } else {

      document.body.classList.remove(
        "modo-escuro"
      );

    }

  }, [
    temaEscuro
  ]);


  // ========================================
  // FECHAR MENU AO CLICAR FORA
  // ========================================

  useEffect(() => {

    function verificarCliqueFora(
      evento: MouseEvent
    ) {

      if (
        menuResponsivoRef.current &&
        !menuResponsivoRef.current.contains(
          evento.target as Node
        )
      ) {

        setMenuAberto(
          false
        );

      }

    }


    document.addEventListener(
      "mousedown",
      verificarCliqueFora
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        verificarCliqueFora
      );

    };

  }, []);


  // ========================================
  // ALTERAR TEMA
  // ========================================

  function alterarTema() {

    const novoTema =
      !temaEscuro;


    setTemaEscuro(
      novoTema
    );


    localStorage.setItem(

      "tema",

      novoTema
        ? "escuro"
        : "claro"

    );

  }


  // ========================================
  // ABRIR / FECHAR MENU
  // ========================================

  function alternarMenu() {

    setMenuAberto(
      !menuAberto
    );

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
  // SAIR DO SISTEMA
  // ========================================

  async function sair() {

    try {

      /*
        O cookie HttpOnly não pode
        ser removido diretamente
        pelo JavaScript.

        Por isso chamamos o backend.
      */
      await fazerLogout();

    } catch (erro) {

      console.error(
        "Erro ao realizar logout:",
        erro
      );

    } finally {

      /*
        Limpeza dos dados antigos
        usados durante a migração.
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
  // INTERFACE
  // ========================================

  return (
    <div className="paciente-layout">

      {/* NAVBAR */}
      <header className="paciente-navbar">

        {/* LOGO */}
        <div className="paciente-navbar-logo">

          <span className="paciente-logo-icone">
            +
          </span>

          <span>
            Sistema Médico
          </span>

        </div>


        {/* MENU DESKTOP */}
        <nav className="paciente-navbar-menu">

          <NavLink
            to="/paciente"
            end
            className={({
              isActive
            }) =>
              isActive
                ? "paciente-menu-link ativo"
                : "paciente-menu-link"
            }
          >
            Início
          </NavLink>


          <NavLink
            to="/paciente/agendar"
            className={({
              isActive
            }) =>
              isActive
                ? "paciente-menu-link ativo"
                : "paciente-menu-link"
            }
          >
            Agendar consulta
          </NavLink>


          <NavLink
            to="/paciente/agendamentos"
            className={({
              isActive
            }) =>
              isActive
                ? "paciente-menu-link ativo"
                : "paciente-menu-link"
            }
          >
            Meus agendamentos
          </NavLink>

        </nav>


        {/* LADO DIREITO */}
        <div className="paciente-navbar-direita">

          {/* TEMA */}
          <button
            type="button"
            className="paciente-botao-tema"
            onClick={
              alterarTema
            }
            title={
              temaEscuro
                ? "Ativar tema claro"
                : "Ativar tema escuro"
            }
          >

            {
              temaEscuro
                ? "☀️"
                : "🌙"
            }

          </button>


          {/* USUÁRIO */}
          <div className="paciente-navbar-usuario">

            <div className="paciente-avatar">

              {
                usuario?.nome
                  ? usuario.nome
                      .charAt(0)
                      .toUpperCase()
                  : "P"
              }

            </div>


            <div className="paciente-usuario-info">

              <span className="paciente-usuario-nome">

                {
                  usuario?.nome ||
                  "Paciente"
                }

              </span>


              <span className="paciente-usuario-tipo">
                Paciente
              </span>

            </div>

          </div>


          {/* SAIR */}
          <button
            type="button"
            onClick={
              sair
            }
            className="paciente-botao-sair"
          >
            Sair
          </button>

        </div>


        {/* MENU RESPONSIVO */}
        <div
          className="paciente-menu-responsivo"
          ref={
            menuResponsivoRef
          }
        >

          <button
            type="button"
            className="paciente-menu-responsivo-botao"
            onClick={
              alternarMenu
            }
            aria-label="Abrir menu"
            aria-expanded={
              menuAberto
            }
          >
            ⋮
          </button>


          {/* DROPDOWN */}
          {
            menuAberto && (

              <div className="paciente-menu-dropdown">

                {/* USUÁRIO */}
                <div className="paciente-menu-dropdown-usuario">

                  <div className="paciente-avatar">

                    {
                      usuario?.nome
                        ? usuario.nome
                            .charAt(0)
                            .toUpperCase()
                        : "P"
                    }

                  </div>


                  <div className="paciente-usuario-info">

                    <span className="paciente-usuario-nome">

                      {
                        usuario?.nome ||
                        "Paciente"
                      }

                    </span>


                    <span className="paciente-usuario-tipo">
                      Paciente
                    </span>

                  </div>

                </div>


                <div className="paciente-menu-separador" />


                {/* INÍCIO */}
                <NavLink
                  to="/paciente"
                  end
                  onClick={
                    fecharMenu
                  }
                  className={({
                    isActive
                  }) =>
                    isActive
                      ? "paciente-dropdown-link ativo"
                      : "paciente-dropdown-link"
                  }
                >

                  <span className="paciente-dropdown-icone">
                    🏠
                  </span>

                  Início

                </NavLink>


                {/* AGENDAR */}
                <NavLink
                  to="/paciente/agendar"
                  onClick={
                    fecharMenu
                  }
                  className={({
                    isActive
                  }) =>
                    isActive
                      ? "paciente-dropdown-link ativo"
                      : "paciente-dropdown-link"
                  }
                >

                  <span className="paciente-dropdown-icone">
                    📅
                  </span>

                  Agendar consulta

                </NavLink>


                {/* AGENDAMENTOS */}
                <NavLink
                  to="/paciente/agendamentos"
                  onClick={
                    fecharMenu
                  }
                  className={({
                    isActive
                  }) =>
                    isActive
                      ? "paciente-dropdown-link ativo"
                      : "paciente-dropdown-link"
                  }
                >

                  <span className="paciente-dropdown-icone">
                    🕐
                  </span>

                  Meus agendamentos

                </NavLink>


                <div className="paciente-menu-separador" />


                {/* TEMA */}
                <button
                  type="button"
                  className="paciente-dropdown-botao"
                  onClick={
                    alterarTema
                  }
                >

                  <span className="paciente-dropdown-icone">

                    {
                      temaEscuro
                        ? "☀️"
                        : "🌙"
                    }

                  </span>


                  {
                    temaEscuro
                      ? "Tema claro"
                      : "Tema escuro"
                  }

                </button>


                {/* SAIR */}
                <button
                  type="button"
                  className="paciente-dropdown-botao sair"
                  onClick={
                    sair
                  }
                >

                  <span className="paciente-dropdown-icone">
                    ↪
                  </span>

                  Sair

                </button>

              </div>

            )
          }

        </div>

      </header>


      {/* CONTEÚDO */}
      <main className="paciente-conteudo">

        <Outlet />

      </main>

    </div>
  );
}