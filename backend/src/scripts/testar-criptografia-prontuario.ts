
import "dotenv/config";

// ========================================
// TESTE DE CRIPTOGRAFIA DOS PRONTUÁRIOS
// ========================================
//
// Este script verifica:
//
// 1. Se conseguimos criptografar os dados.
// 2. Se conseguimos descriptografá-los.
// 3. Se o conteúdo original fica protegido.
// 4. Se alterações no texto são detectadas.
// 5. Se um médico/paciente diferente
//    consegue ou não descriptografar.
//
// IMPORTANTE:
//
// O teste usa dados fictícios.
// Nenhum registro é criado no PostgreSQL.

import {
  criptografarProntuario,
  descriptografarProntuario
} from "../services/prontuario-criptografia.service";


// ========================================
// DADOS FICTÍCIOS
// ========================================

const contextoOriginal = {
  medicoId: 1,
  pacienteId: 10
};

const prontuarioFicticio = {
  versaoSchema: 1,
  queixaPrincipal: "Teste fictício de criptografia",
  historiaMolestiaAtual: "Informação de demonstração",
  historiaPatologicaPregressa: null,
  exameFisico: null,
  examesComplementares: null,
  conduta: "Nenhuma conduta real"
};


// ========================================
// FUNÇÃO DE VERIFICAÇÃO
// ========================================

function verificar(
  condicao: boolean,
  mensagem: string
): void {

  if (!condicao) {
    throw new Error(`FALHOU: ${mensagem}`);
  }

  console.log(`OK: ${mensagem}`);
}


// ========================================
// TESTE PRINCIPAL
// ========================================

function executarTestes(): void {

  console.log("\n=== TESTE DE SEGURANÇA ===\n");

  // ----------------------------------------
  // TESTE 1: CRIPTOGRAFAR
  // ----------------------------------------

  const criptografado =
    criptografarProntuario(
      prontuarioFicticio,
      contextoOriginal
    );

  verificar(
    criptografado.startsWith("v1:1:"),
    "Conteúdo gerado no formato esperado"
  );

  verificar(
    !criptografado.includes(
      prontuarioFicticio.queixaPrincipal
    ),
    "Informação clínica não aparece em texto puro"
  );


  // ----------------------------------------
  // TESTE 2: DESCRIPTOGRAFAR
  // ----------------------------------------

  const descriptografado =
    descriptografarProntuario<
      typeof prontuarioFicticio
    >(
      criptografado,
      contextoOriginal
    );

  verificar(
    JSON.stringify(descriptografado) ===
      JSON.stringify(prontuarioFicticio),
    "Conteúdo original recuperado corretamente"
  );


  // ----------------------------------------
  // TESTE 3: IV ALEATÓRIO
  // ----------------------------------------

  const segundaCriptografia =
    criptografarProntuario(
      prontuarioFicticio,
      contextoOriginal
    );

  verificar(
    segundaCriptografia !== criptografado,
    "Duas criptografias geram resultados diferentes"
  );


  // ----------------------------------------
  // TESTE 4: CONTEXTO ERRADO
  // ----------------------------------------

  let contextoRejeitado = false;

  try {

    descriptografarProntuario(
      criptografado,
      {
        medicoId: 2,
        pacienteId: 10
      }
    );

  } catch {

    contextoRejeitado = true;

  }

  verificar(
    contextoRejeitado,
    "Conteúdo não é aceito com outro médico"
  );


  // ----------------------------------------
  // TESTE 5: ADULTERAÇÃO DO CONTEÚDO
  // ----------------------------------------

  const partes =
    criptografado.split(":");

  if (partes.length !== 5 || !partes[4]) {
    throw new Error("Formato criptográfico inesperado.");
  }

  // Modifica um byte do conteúdo cifrado.
  const bytes =
    Buffer.from(partes[4], "base64");

  bytes[0] = (bytes[0] ?? 0) ^ 1;

  partes[4] =
    bytes.toString("base64");

  const adulterado =
    partes.join(":");

  let adulteracaoRejeitada = false;

  try {

    descriptografarProntuario(
      adulterado,
      contextoOriginal
    );

  } catch {

    adulteracaoRejeitada = true;

  }

  verificar(
    adulteracaoRejeitada,
    "Conteúdo adulterado é rejeitado"
  );


  // ----------------------------------------
  // RESULTADO
  // ----------------------------------------

  console.log(
    "\nTodos os testes de criptografia passaram.\n"
  );

}


// ========================================
// EXECUÇÃO
// ========================================

try {

  executarTestes();

} catch (erro) {

  console.error(
    "\nFalha nos testes:",
    erro instanceof Error
      ? erro.message
      : "Erro desconhecido."
  );

  process.exitCode = 1;

}
