// ========================================
// INICIALIZAR BACKEND DE TESTES
// ========================================
//
// Este script impede que o servidor de
// testes utilize o banco principal.

import { spawn } from "node:child_process";

// ========================================
// VERIFICAR AMBIENTE
// ========================================

import { validarBancoDeTestes } from "./protecao-banco-testes.mjs";

process.env.NODE_ENV = "test";
validarBancoDeTestes();

// ========================================
// INICIAR SERVIDOR
// ========================================

const processo = spawn(
  process.execPath,
  [
    "--import",
    "tsx",
    "src/server.ts"
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "test"
    }
  }
);

processo.on("exit", (codigo) => {
  process.exitCode = codigo ?? 1;
});

// Encaminha o encerramento do executor para não deixar APIs de teste órfãs.
for (const sinal of ["SIGTERM", "SIGINT"]) {
  process.on(sinal, () => processo.kill(sinal));
}
