// ========================================
// PÁGINA INICIAL DO PACIENTE
// ========================================

import "../../styles/inicioPaciente.css";

export default function InicioPaciente() {
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
  // INTERFACE
  // ========================================

  return (
    <div className="inicio-paciente">

      {/* CABEÇALHO */}
      <div className="inicio-paciente-cabecalho">

        <p className="inicio-paciente-tipo">
          Área do paciente
        </p>

        <h1>
          Olá, {usuario?.nome || "Paciente"}!
        </h1>

        <p>
          Bem-vindo ao sistema médico.
          Aqui você poderá acompanhar e
          gerenciar seus atendimentos.
        </p>

      </div>


      {/* CARDS */}
      <div className="inicio-paciente-cards">

        {/* AGENDAR CONSULTA */}
        <div className="inicio-paciente-card">

          <div className="inicio-paciente-icone">
            📅
          </div>

          <h2>
            Agendar consulta
          </h2>

          <p>
            Consulte os horários disponíveis
            do seu médico e faça um novo
            agendamento.
          </p>

          <button
            type="button"
            disabled
          >
            Em breve
          </button>

        </div>


        {/* MEUS AGENDAMENTOS */}
        <div className="inicio-paciente-card">

          <div className="inicio-paciente-icone">
            🩺
          </div>

          <h2>
            Meus agendamentos
          </h2>

          <p>
            Consulte suas próximas consultas
            e acompanhe os seus atendimentos.
          </p>

          <button
            type="button"
            disabled
          >
            Em breve
          </button>

        </div>

      </div>

    </div>
  );
}