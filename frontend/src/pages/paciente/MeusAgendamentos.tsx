// ========================================
// MEUS AGENDAMENTOS
// ========================================

import "../../styles/inicioPaciente.css";


export default function MeusAgendamentos() {
  return (
    <div className="inicio-paciente">

      <section className="inicio-paciente-cabecalho">

        <p className="inicio-paciente-tipo">
          Consultas
        </p>

        <h1>
          Meus agendamentos
        </h1>

        <p>
          Consulte seus horários marcados e
          acompanhe o status de suas consultas.
        </p>

      </section>


      <section className="inicio-paciente-cards">

        <article className="inicio-paciente-card">

          <div className="inicio-paciente-icone">
            🩺
          </div>

          <h2>
            Consultas agendadas
          </h2>

          <p>
            Seus próximos agendamentos aparecerão
            aqui.
          </p>

        </article>

      </section>

    </div>
  );
}