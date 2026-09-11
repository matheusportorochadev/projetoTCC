// ========================================
// PÁGINA DE AGENDAMENTO DO PACIENTE
// ========================================

import "../../styles/inicioPaciente.css";


export default function AgendarConsulta() {
  return (
    <div className="inicio-paciente">

      <section className="inicio-paciente-cabecalho">

        <p className="inicio-paciente-tipo">
          Agendamento
        </p>

        <h1>
          Agendar consulta
        </h1>

        <p>
          Aqui serão exibidos somente os horários
          disponibilizados pelo seu médico.
        </p>

      </section>


      <section className="inicio-paciente-cards">

        <article className="inicio-paciente-card">

          <div className="inicio-paciente-icone">
            📅
          </div>

          <h2>
            Horários disponíveis
          </h2>

          <p>
            Na próxima etapa vamos conectar esta
            página à agenda do médico e mostrar
            datas e horários disponíveis.
          </p>

        </article>

      </section>

    </div>
  );
}