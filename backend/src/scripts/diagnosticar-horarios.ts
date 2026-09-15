// ========================================
// DEPENDÊNCIAS
// ========================================

import "dotenv/config";

import {
  listarHorariosDisponiveis
} from "../services/agendamento.service";


// ========================================
// DIAGNÓSTICO
// ========================================

async function diagnosticarHorarios() {

  const medicoId = 7;

  const data =
    "2026-09-22";


  console.log(
    "\n========================================"
  );

  console.log(
    "DIAGNÓSTICO DE HORÁRIOS DISPONÍVEIS"
  );

  console.log(
    "========================================"
  );


  console.log(
    "\nMédico:",
    medicoId
  );

  console.log(
    "Data:",
    data
  );


  const horarios =
    await listarHorariosDisponiveis(
      medicoId,
      data
    );


  console.log(
    "\nHORÁRIOS RETORNADOS:\n"
  );


  console.table(
    horarios
  );


  console.log(
    "\nQuantidade:",
    horarios.length
  );


  console.log(
    "\n========================================\n"
  );
}


// ========================================
// EXECUÇÃO
// ========================================

diagnosticarHorarios()
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