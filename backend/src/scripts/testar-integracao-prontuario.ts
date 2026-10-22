
// ========================================
// TESTE DE INTEGRAÇÃO DOS PRONTUÁRIOS
// ========================================
//
// Verifica o funcionamento conjunto de:
//
// 1. Service clínico;
// 2. PostgreSQL;
// 3. Criptografia AES-256-GCM;
// 4. Descriptografia;
// 5. Histórico de prontuários;
// 6. Auditoria de operações.
//
// IMPORTANTE:
//
// Este teste cria um prontuário fictício
// somente no banco isolado confirmado.
//
// Não utiliza dados clínicos reais.
// Não modifica prontuários anteriores.
// Remove apenas a fixture criada por esta execução.

import "dotenv/config";

import {
  db
} from "../prisma/db";

import {
  criarNovoProntuario,
  buscarProntuarioPorId,
  listarHistoricoProntuarios
} from "../services/prontuario.service";


// ========================================
// IDENTIFICADORES DO AMBIENTE DE TESTE
// ========================================
//
// Obtidos dinamicamente da fixture própria.
//
// Nenhum identificador de desenvolvimento é reutilizado.

// @ts-expect-error Guarda JavaScript compartilhada com os executores.
import { validarBancoDeTestes } from "../../scripts/protecao-banco-testes.mjs";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
validarBancoDeTestes();
const identidade = randomUUID();
function fixture(acao: "criar" | "limpar") {
  const saida = execFileSync(process.execPath, ["--env-file=.env.test", "--import", "tsx", "scripts/fixture-negocio.ts", acao, identidade], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    env: { ...process.env, NODE_ENV: "test" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
  });
  if (acao === "criar") return JSON.parse(saida.trim().split("\n").at(-1)!);
}
const cenario = fixture("criar");
const USUARIO_MEDICO_ID: number = cenario.contas.medicoA.id;
const MEDICO_ID: number = cenario.medicoA.id;
const PACIENTE_ID: number = cenario.pacienteA.id;


// ========================================
// CONTEÚDO FICTÍCIO
// ========================================
//
// Nunca utilizar informações reais
// de pacientes em scripts de testes.

const DADOS_FICTICIOS = {

  queixaPrincipal:
    "TESTE AUTOMATIZADO DE CRIPTOGRAFIA",

  historiaMolestiaAtual:
    "Conteúdo fictício para validar a gravação segura.",

  historiaPatologicaPregressa:
    "Sem informações clínicas reais.",

  exameFisico:
    "Registro exclusivamente demonstrativo.",

  examesComplementares:
    "Nenhum exame real.",

  conduta:
    "Teste de integração do TCC.",

  prontuarioAnteriorId:
    null

};


// ========================================
// FUNÇÃO DE VERIFICAÇÃO
// ========================================

function verificar(
  condicao: boolean,
  descricao: string
): void {

  if (!condicao) {

    throw new Error(
      `FALHOU: ${descricao}`
    );

  }

  console.log(
    `OK: ${descricao}`
  );

}


// ========================================
// CONFIRMAR VÍNCULOS
// ========================================
//
// Evita executar o teste com IDs que
// eventualmente tenham sido alterados.

async function verificarAmbiente(): Promise<void> {

  const medico =
    await db.orm.public.Medico
      .where({
        id: MEDICO_ID,
        usuarioId: USUARIO_MEDICO_ID
      })
      .first();

  verificar(
    medico !== null,
    "Médico e usuário vinculados corretamente"
  );

  const paciente =
    await db.orm.public.Paciente
      .where({
        id: PACIENTE_ID,
        medicoId: MEDICO_ID,
        ativo: true
      })
      .first();

  verificar(
    paciente !== null,
    "Paciente ativo pertence ao médico"
  );

}


// ========================================
// TESTE PRINCIPAL
// ========================================

async function executarTeste(): Promise<void> {

  console.log(
    "\n=== TESTE DE INTEGRAÇÃO ===\n"
  );

  // ----------------------------------------
  // ETAPA 1: VERIFICAR AMBIENTE
  // ----------------------------------------

  await verificarAmbiente();


  // ----------------------------------------
  // ETAPA 2: CRIAR PRONTUÁRIO
  // ----------------------------------------
  //
  // Chama o service real do sistema.
  //
  // O service deverá:
  //
  // - Verificar o vínculo médico/paciente;
  // - Criptografar os campos clínicos;
  // - Salvar o prontuário no PostgreSQL;
  // - Registrar a criação na auditoria.

  const criado =
    await criarNovoProntuario(
      USUARIO_MEDICO_ID,
      PACIENTE_ID,
      DADOS_FICTICIOS
    );

  const prontuarioId =
    criado.id;

  verificar(
    Number.isSafeInteger(prontuarioId) &&
    prontuarioId > 0,
    "Prontuário criado com ID válido"
  );

  console.log(
    `Prontuário de teste: ${prontuarioId}`
  );


  // ----------------------------------------
  // ETAPA 3: INSPECIONAR DADOS NO BANCO
  // ----------------------------------------

  const registroBanco =
    await db.orm.public.Prontuario
      .where({
        id: prontuarioId,
        pacienteId: PACIENTE_ID,
        medicoId: MEDICO_ID
      })
      .first();

  if (!registroBanco) {

    throw new Error(
      "Prontuário não encontrado no PostgreSQL."
    );

  }

  verificar(
    typeof registroBanco.conteudoCriptografado ===
      "string" &&
    registroBanco.conteudoCriptografado.startsWith(
      "v1:1:"
    ),
    "Conteúdo criptografado armazenado no PostgreSQL"
  );

 // ========================================
// VERIFICAR PROTEÇÃO DO CONTEÚDO CLÍNICO
// ========================================

// Confirma que existe conteúdo criptografado
// e que a queixa principal não aparece
// em texto puro dentro dele.

verificar(
  typeof registroBanco.conteudoCriptografado === "string" &&
  !registroBanco.conteudoCriptografado.includes(
    DADOS_FICTICIOS.queixaPrincipal
  ),
  "Queixa principal não aparece no conteúdo armazenado"
);


  // ----------------------------------------
  // ETAPA 4: CONFERIR COLUNAS ANTIGAS
  // ----------------------------------------
  //
  // Os novos prontuários não devem
  // armazenar dados clínicos em texto puro.

  verificar(
    registroBanco.queixaPrincipal === null &&
    registroBanco.historiaMolestiaAtual === null &&
    registroBanco.historiaPatologicaPregressa === null &&
    registroBanco.exameFisico === null &&
    registroBanco.examesComplementares === null &&
    registroBanco.conduta === null,
    "Colunas clínicas antigas estão vazias"
  );


  // ----------------------------------------
  // ETAPA 5: CONFERIR VERSÕES
  // ----------------------------------------

  verificar(
    registroBanco.versaoSchema === 1 &&
    registroBanco.versaoChave === 1,
    "Versões do schema e da chave estão corretas"
  );


  // ----------------------------------------
  // ETAPA 6: CONSULTAR PELO SERVICE
  // ----------------------------------------
  //
  // A função deve identificar o médico,
  // conferir o paciente e descriptografar.

  const consultado =
    await buscarProntuarioPorId(
      USUARIO_MEDICO_ID,
      PACIENTE_ID,
      prontuarioId
    );

  verificar(
    consultado.queixaPrincipal ===
      DADOS_FICTICIOS.queixaPrincipal &&
    consultado.conduta ===
      DADOS_FICTICIOS.conduta,
    "Prontuário descriptografado corretamente"
  );

  verificar(
    consultado.criptografado === true,
    "Resposta identifica armazenamento criptografado"
  );


  // ----------------------------------------
  // ETAPA 7: VERIFICAR RESPOSTA
  // ----------------------------------------
  //
  // O ciphertext pertence ao banco.
  // Não deve fazer parte da resposta clínica.

  verificar(
    !Object.prototype.hasOwnProperty.call(
      consultado,
      "conteudoCriptografado"
    ),
    "Resposta não expõe conteúdo criptografado bruto"
  );


  // ----------------------------------------
  // ETAPA 8: CONSULTAR HISTÓRICO
  // ----------------------------------------

  const historico =
    await listarHistoricoProntuarios(
      USUARIO_MEDICO_ID,
      PACIENTE_ID
    );

  verificar(
    historico.prontuarios.some(
      (registro) =>
        registro.id === prontuarioId
    ),
    "Prontuário aparece no histórico do paciente"
  );


  // ----------------------------------------
  // ETAPA 9: VERIFICAR AUDITORIA
  // ----------------------------------------

  const eventos =
    await db.orm.public.AuditoriaProntuario
      .where({
        prontuarioId
      })
      .all();

  verificar(
    eventos.some(
      (evento) =>
        evento.acao === "CRIAR" &&
        evento.resultado === "SUCESSO" &&
        evento.usuarioId === USUARIO_MEDICO_ID
    ),
    "Auditoria registrou a criação"
  );

  verificar(
    eventos.some(
      (evento) =>
        evento.acao === "CONSULTAR" &&
        evento.resultado === "SUCESSO" &&
        evento.usuarioId === USUARIO_MEDICO_ID
    ),
    "Auditoria registrou a consulta"
  );

  // A listagem de histórico utiliza
  // prontuarioId = null.
  //
  // Por isso verificamos esse evento
  // separadamente.

  const eventosHistorico =
    await db.orm.public.AuditoriaProntuario
      .where({
        usuarioId: USUARIO_MEDICO_ID,
        pacienteId: PACIENTE_ID,
        acao: "LISTAR_HISTORICO"
      })
      .all();

  verificar(
    eventosHistorico.some(
      (evento) =>
        evento.resultado === "SUCESSO"
    ),
    "Auditoria registrou a consulta do histórico"
  );


  // ----------------------------------------
  // RESULTADO FINAL
  // ----------------------------------------

  console.log(
    "\n=== RESULTADO ==="
  );

  console.log(
    `Prontuário criado: ${prontuarioId}`
  );

  console.log(
    "Criptografia: OK"
  );

  console.log(
    "PostgreSQL: OK"
  );

  console.log(
    "Descriptografia: OK"
  );

  console.log(
    "Histórico: OK"
  );

  console.log(
    "Auditoria: OK"
  );

  console.log(
    "\nTeste de integração concluído.\n"
  );

}


// ========================================
// EXECUTAR
// ========================================

executarTeste()
  .catch((erro: unknown) => {

    console.error(
      "\nFalha na integração:",
      erro instanceof Error
        ? erro.message
        : "Erro desconhecido."
    );

    process.exitCode = 1;

  }).finally(async () => {
    try { await db.close(); } finally { fixture("limpar"); }
  });
