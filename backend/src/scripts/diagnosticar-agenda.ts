import "dotenv/config";

import {
  db
} from "../prisma/db";


// ========================================
// DIAGNÓSTICO DA AGENDA
// ========================================

async function diagnosticarAgenda() {

  console.log(
    "\n========================================"
  );

  console.log(
    "DIAGNÓSTICO DA AGENDA"
  );

  console.log(
    "========================================\n"
  );


  // ========================================
  // MÉDICOS
  // ========================================

  const medicos =
    await db.orm.public.Medico
      .all();


  console.log(
    "MÉDICOS:\n"
  );


  console.table(
    medicos.map(
      (medico) => ({
        id:
          medico.id,

        usuarioId:
          medico.usuarioId,

        crm:
          medico.crm
      })
    )
  );


  // ========================================
  // PACIENTES
  // ========================================

  const pacientes =
    await db.orm.public.Paciente
      .all();


  console.log(
    "\nPACIENTES:\n"
  );


  console.table(
    pacientes.map(
      (paciente) => ({
        id:
          paciente.id,

        nome:
          paciente.nome,

        usuarioId:
          paciente.usuarioId,

        medicoId:
          paciente.medicoId,

        ativo:
          paciente.ativo,

        acessoLiberado:
          paciente.acessoLiberado
      })
    )
  );


  // ========================================
  // DISPONIBILIDADES
  // ========================================

  const disponibilidades =
    await db.orm.public
      .DisponibilidadeAgenda
      .all();


  console.log(
    "\nDISPONIBILIDADES:\n"
  );


  console.table(
    disponibilidades.map(
      (disponibilidade) => ({
        id:
          disponibilidade.id,

        medicoId:
          disponibilidade.medicoId,

        data:
          disponibilidade.data,

        horaInicio:
          disponibilidade.horaInicio,

        horaFim:
          disponibilidade.horaFim,

        duracao:
          disponibilidade.duracaoConsulta,

        ativo:
          disponibilidade.ativo
      })
    )
  );


  console.log(
    "\n========================================"
  );

  console.log(
    "FIM DO DIAGNÓSTICO"
  );

  console.log(
    "========================================\n"
  );
}


// ========================================
// EXECUTAR
// ========================================

diagnosticarAgenda()
  .then(() => {

    process.exit(0);

  })
  .catch(
    (erro) => {

      console.error(
        "Erro no diagnóstico:",
        erro
      );

      process.exit(1);

    }
  );