// ========================================
// PÁGINA INICIAL DO PACIENTE
// ========================================

import { useNavigate } from "react-router-dom";

import "../../styles/inicioPaciente.css";


export default function InicioPaciente() {

  // ========================================
  // NAVEGAÇÃO
  // ========================================

  const navigate = useNavigate();


  // ========================================
  // RECUPERAR USUÁRIO LOGADO
  // ========================================

  const usuarioSalvo =
    localStorage.getItem("usuario");

  const usuario =
    usuarioSalvo
      ? JSON.parse(usuarioSalvo)
      : null;


  // ========================================
  // PEGAR PRIMEIRO NOME
  // ========================================

  const primeiroNome =
    usuario?.nome?.split(" ")[0] || "Paciente";


  // ========================================
  // INTERFACE
  // ========================================

  return (
    <div className="inicio-paciente">

      <div className="inicio-paciente-conteudo">


        {/* ========================================
            CABEÇALHO / BOAS-VINDAS
        ======================================== */}

        <section className="inicio-paciente-hero">

          <div className="inicio-paciente-hero-conteudo">

            <span className="inicio-paciente-tipo">
              Área do paciente
            </span>

            <h1>
              Olá, {primeiroNome}!
            </h1>

            <p>
              Bem-vindo ao seu espaço de saúde.
              Acompanhe seus agendamentos e tenha
              acesso às informações dos seus
              atendimentos em um só lugar.
            </p>

          </div>


          {/* ELEMENTO VISUAL DO CABEÇALHO */}

          <div className="inicio-paciente-hero-visual">

            <div className="inicio-paciente-hero-icone">
              +
            </div>

          </div>

        </section>


        {/* ========================================
            TÍTULO DA ÁREA DE ACESSO
        ======================================== */}

        <div className="inicio-paciente-secao-titulo">

          <div>

            <h2>
              Acesso rápido
            </h2>

            <p>
              Escolha uma opção para continuar.
            </p>

          </div>

        </div>


        {/* ========================================
            CARDS
        ======================================== */}

        <div className="inicio-paciente-cards">


          {/* ========================================
              AGENDAR CONSULTA
          ======================================== */}

          <article className="inicio-paciente-card">

            <div className="inicio-paciente-card-topo">

              <div className="inicio-paciente-icone">
                <span>
                  📅
                </span>
              </div>

            </div>


            <div className="inicio-paciente-card-conteudo">

              <h3>
                Agendar consulta
              </h3>

              <p>
                Consulte os horários disponíveis
                do seu médico e solicite um novo
                agendamento de forma simples.
              </p>

            </div>


            <button
              className="inicio-paciente-botao inicio-paciente-botao-ativo"
              type="button"
              onClick={() =>
                navigate("/paciente/agendar")
              }
            >
              Agendar consulta

              <span>
                →
              </span>

            </button>

          </article>


          {/* ========================================
              MEUS AGENDAMENTOS
          ======================================== */}

          <article className="inicio-paciente-card">

            <div className="inicio-paciente-card-topo">

              <div className="inicio-paciente-icone">
                <span>
                  🩺
                </span>
              </div>

            </div>


            <div className="inicio-paciente-card-conteudo">

              <h3>
                Meus agendamentos
              </h3>

              <p>
                Visualize suas próximas consultas,
                acompanhe solicitações e consulte
                seus atendimentos.
              </p>

            </div>


            <button
              className="inicio-paciente-botao inicio-paciente-botao-ativo"
              type="button"
              onClick={() =>
                navigate("/paciente/agendamentos")
              }
            >
              Ver agendamentos

              <span>
                →
              </span>

            </button>

          </article>

        </div>


        {/* ========================================
            INFORMAÇÃO INFERIOR
        ======================================== */}

        <div className="inicio-paciente-informacao">

          <div className="inicio-paciente-informacao-icone">
            i
          </div>

          <div>

            <strong>
              Seu espaço de atendimento
            </strong>

            <p>
              Utilize as opções acima para
              agendar novas consultas e acompanhar
              seus atendimentos.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}