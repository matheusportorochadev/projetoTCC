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
  useState
} from "react";

import "../styles/pacienteLayout.css";


export default function PacienteLayout() {
  // ========================================
  // NAVEGAÇÃO
  // ========================================

  const navigate =
    useNavigate();


  // ========================================
  // BUSCAR USUÁRIO LOGADO
  // ========================================

  /*
    Durante o login, os dados básicos
    do usuário são salvos no localStorage.

    Aqui recuperamos esses dados para
    mostrar o nome do paciente na navbar.
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
  // TEMA CLARO / ESCURO
  // ========================================

  /*
    Recuperamos a preferência de tema
    armazenada anteriormente.

    Se não existir nenhuma preferência,
    começamos no tema claro.
  */
  const [temaEscuro, setTemaEscuro] =
    useState(
      localStorage.getItem("tema") ===
        "escuro"
    );


  // ========================================
  // APLICAR TEMA AO CARREGAR
  // ========================================

  useEffect(() => {
    if (temaEscuro) {
      document.body.classList.add(
        "modo-escuro"
      );
    } else {
      document.body.classList.remove(
        "modo-escuro"
      );
    }
  }, [temaEscuro]);


  // ========================================
  // ALTERAR TEMA
  // ========================================

  function alterarTema() {
    const novoTema =
      !temaEscuro;


    setTemaEscuro(
      novoTema
    );


    /*
      Salva a preferência para que
      o sistema lembre o tema quando
      o usuário entrar novamente.
    */
    localStorage.setItem(
      "tema",
      novoTema
        ? "escuro"
        : "claro"
    );
  }


  // ========================================
  // SAIR DO SISTEMA
  // ========================================

  function sair() {
    /*
      Removemos apenas os dados
      relacionados à autenticação.

      Não removemos o tema porque queremos
      manter a preferência do usuário.
    */
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "usuario"
    );


    navigate(
      "/login"
    );
  }


  // ========================================
  // INTERFACE
  // ========================================

  return (
    <div className="paciente-layout">

      {/* ========================================
          NAVBAR
      ======================================== */}

      <header className="paciente-navbar">

        {/* LOGO / NOME DO SISTEMA */}
        <div className="paciente-navbar-logo">

          <span className="paciente-logo-icone">
            +
          </span>

          <span>
            Sistema Médico
          </span>

        </div>


        {/* ========================================
            MENU PRINCIPAL
        ======================================== */}

        <nav className="paciente-navbar-menu">

          {/* INÍCIO */}
          <NavLink
            to="/paciente"
            end
            className={({ isActive }) =>
              isActive
                ? "paciente-menu-link ativo"
                : "paciente-menu-link"
            }
          >
            Início
          </NavLink>


          {/* AGENDAR CONSULTA */}
          <NavLink
            to="/paciente/agendar"
            className={({ isActive }) =>
              isActive
                ? "paciente-menu-link ativo"
                : "paciente-menu-link"
            }
          >
            Agendar consulta
          </NavLink>


          {/* MEUS AGENDAMENTOS */}
          <NavLink
            to="/paciente/agendamentos"
            className={({ isActive }) =>
              isActive
                ? "paciente-menu-link ativo"
                : "paciente-menu-link"
            }
          >
            Meus agendamentos
          </NavLink>

        </nav>


        {/* ========================================
            LADO DIREITO DA NAVBAR
        ======================================== */}

        <div className="paciente-navbar-direita">

          {/* BOTÃO DE TEMA */}
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
            {temaEscuro
              ? "☀️"
              : "🌙"}
          </button>


          {/* NOME DO PACIENTE */}
          <div className="paciente-navbar-usuario">

            <div className="paciente-avatar">
              {usuario?.nome
                ? usuario.nome
                    .charAt(0)
                    .toUpperCase()
                : "P"}
            </div>


            <div className="paciente-usuario-info">

              <span className="paciente-usuario-nome">
                {usuario?.nome ||
                  "Paciente"}
              </span>

              <span className="paciente-usuario-tipo">
                Paciente
              </span>

            </div>

          </div>


          {/* BOTÃO SAIR */}
          <button
            type="button"
            onClick={sair}
            className="paciente-botao-sair"
          >
            Sair
          </button>

        </div>

      </header>


      {/* ========================================
          CONTEÚDO DAS PÁGINAS
      ======================================== */}

      <main className="paciente-conteudo">

        {/*
          O Outlet mostra a página correspondente
          à rota selecionada.

          Exemplos:

          /paciente
          /paciente/agendar
          /paciente/agendamentos
        */}
        <Outlet />

      </main>

    </div>
  );
}