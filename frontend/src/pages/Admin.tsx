// ========================================
// PÁGINA ADMINISTRATIVA
// ========================================

import {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  fazerLogout,
  listarMedicos
} from "../services/api";

import "../styles/admin.css";


// ========================================
// TIPOS
// ========================================

type Medico = {
  id: number;
  crm: string;

  usuario: {
    id?: number;
    nome: string;
    email: string;
    ativo: boolean;
    primeiroAcesso: boolean;
  };
};


// ========================================
// COMPONENTE
// ========================================

export default function Admin() {

  const navigate =
    useNavigate();


  // ========================================
  // ESTADOS
  // ========================================

  const [
    medicos,
    setMedicos
  ] =
    useState<Medico[]>([]);


  const [
    carregando,
    setCarregando
  ] =
    useState(true);


  const [
    erro,
    setErro
  ] =
    useState("");


  // ========================================
  // CARREGAR MÉDICOS
  // ========================================

  useEffect(() => {

    async function carregarMedicos() {

      try {

        setErro("");

        setCarregando(
          true
        );


        const dados =
          await listarMedicos();


        /*
          Mantemos compatibilidade caso
          o backend retorne diretamente:

          [...]

          ou:

          {
            medicos: [...]
          }
        */
        if (
          Array.isArray(
            dados
          )
        ) {

          setMedicos(
            dados
          );

        } else if (
          Array.isArray(
            dados?.medicos
          )
        ) {

          setMedicos(
            dados.medicos
          );

        } else {

          setMedicos(
            []
          );

        }

      } catch (erro) {

        const mensagem =
          erro instanceof Error
            ? erro.message
            : "Erro ao carregar médicos.";


        setErro(
          mensagem
        );

      } finally {

        setCarregando(
          false
        );

      }
    }


    carregarMedicos();

  }, []);


  // ========================================
  // LOGOUT
  // ========================================

  async function sair() {

    try {

      /*
        O backend remove:

        access_token

        que está armazenado como
        cookie HttpOnly.
      */
      await fazerLogout();

    } catch (erro) {

      /*
        Mesmo se houver algum problema
        de rede no logout, limpamos os
        dados locais da interface.
      */
      console.error(
        "Erro ao realizar logout:",
        erro
      );

    } finally {

      // Remove dados antigos da migração.
      localStorage.removeItem(
        "token"
      );


      // Dados usados apenas
      // para exibição na interface.
      localStorage.removeItem(
        "usuario"
      );


      navigate(
        "/login"
      );

    }
  }


  // ========================================
  // MÉDICOS ATIVOS
  // ========================================

  const medicosAtivos =
    medicos.filter(
      (medico) =>
        medico.usuario.ativo
    ).length;


  // ========================================
  // MÉDICOS AGUARDANDO PRIMEIRO ACESSO
  // ========================================

  /*
    Um médico recém-cadastrado pelo ADMIN
    deve possuir:

    primeiroAcesso = true

    enquanto ainda não criou
    sua própria senha.

    Depois de concluir o Primeiro Acesso:

    primeiroAcesso = false
  */
  const medicosAguardandoPrimeiroAcesso =
    medicos.filter(
      (medico) =>
        medico.usuario.primeiroAcesso
    ).length;


  // ========================================
  // INTERFACE
  // ========================================

  return (
    <div className="admin-page">

      <header className="admin-header">

        <div>

          <h1>
            Painel Administrativo
          </h1>

          <p>
            Gerenciamento do sistema médico
          </p>

        </div>


        <button
          type="button"
          onClick={sair}
        >
          Sair
        </button>

      </header>


      <main className="admin-content">

        <section className="admin-cards">

          <div className="admin-card">

            <span>
              Médicos cadastrados
            </span>

            <strong>
              {medicos.length}
            </strong>

          </div>


          <div className="admin-card">

            <span>
              Médicos ativos
            </span>

            <strong>
              {medicosAtivos}
            </strong>

          </div>


          <div className="admin-card">

            <span>
              Aguardando primeiro acesso
            </span>

            <strong>
              {medicosAguardandoPrimeiroAcesso}
            </strong>

          </div>

        </section>


        <section className="admin-section">

          <div className="admin-section-header">

            <div>

              <h2>
                Médicos
              </h2>

              <p>
                Profissionais cadastrados no sistema
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/medicos/cadastrar"
                )
              }
            >
              + Cadastrar médico
            </button>

          </div>


          {carregando && (
            <p>
              Carregando médicos...
            </p>
          )}


          {erro && (
            <p className="admin-error">
              {erro}
            </p>
          )}


          {!carregando &&
            !erro &&
            medicos.length === 0 && (

              <p>
                Nenhum médico cadastrado.
              </p>

            )}


          <div className="medicos-lista">

            {medicos.map(
              (medico) => (

                <button
                  key={
                    medico.id
                  }
                  type="button"
                  className="medico-item"
                  onClick={() =>
                    navigate(
                      `/admin/medicos/${medico.id}`
                    )
                  }
                >

                  <div>

                    <strong>
                      {medico.usuario.nome}
                    </strong>

                    <span>
                      {medico.usuario.email}
                    </span>

                  </div>


                  <div>

                    <span>
                      {medico.crm}
                    </span>


                    <span
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
                    </span>


                    {medico.usuario.primeiroAcesso && (
                      <span>
                        Primeiro acesso pendente
                      </span>
                    )}

                  </div>

                </button>

              )
            )}

          </div>

        </section>

      </main>

    </div>
  );
}
