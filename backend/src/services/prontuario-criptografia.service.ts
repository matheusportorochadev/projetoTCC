
// ========================================
// CRIPTOGRAFIA DOS PRONTUÁRIOS MÉDICOS
// ========================================
//
// Utiliza AES-256-GCM.
//
// Responsabilidades:
//
// 1. Criptografar informações clínicas.
// 2. Descriptografar informações autorizadas.
// 3. Detectar alterações no conteúdo.
// 4. Separar a chave do banco de dados.
// 5. Vincular os dados ao médico e paciente.
//
// IMPORTANTE:
//
// - Nunca armazenar a chave no PostgreSQL.
// - Nunca enviar a chave ao frontend.
// - Nunca registrar dados clínicos nos logs.
// - Nunca colocar a chave no GitHub.

import {
  randomBytes,
  createCipheriv,
  createDecipheriv
} from "node:crypto";


// ========================================
// CONFIGURAÇÕES
// ========================================

const ALGORITMO = "aes-256-gcm";

// Cada operação utiliza um IV aleatório
// de 12 bytes, recomendado para GCM.
const TAMANHO_IV = 12;

// Tag de autenticação de 16 bytes.
const TAMANHO_TAG = 16;

// Identifica o formato utilizado.
const VERSAO_FORMATO = "v1";

// Identifica a chave usada.
//
// Futuramente poderemos criar
// mecanismos para rotação de chaves.
const IDENTIFICADOR_CHAVE = "1";


// ========================================
// OBTER CHAVE DE CRIPTOGRAFIA
// ========================================
//
// A variável precisa conter 32 bytes
// codificados em Base64.
//
// AES-256 utiliza uma chave de 256 bits.

function obterChave(): Buffer {

  const chaveBase64 =
    process.env.PRONTUARIO_ENCRYPTION_KEY;

  if (!chaveBase64) {

    throw new Error(
      "Chave de criptografia dos prontuários não configurada."
    );
  }

  // Exige Base64 canônico para evitar
  // configurações incorretas.
  const formatoBase64 =
    /^(?:[A-Za-z0-9+/]{4}){10}[A-Za-z0-9+/]{3}=$/;

  if (!formatoBase64.test(chaveBase64)) {

    throw new Error(
      "Formato da chave de criptografia inválido."
    );
  }

  const chave =
    Buffer.from(chaveBase64, "base64");

  if (chave.length !== 32) {

    throw new Error(
      "A chave dos prontuários precisa ter 32 bytes."
    );
  }

  return chave;
}


// ========================================
// CONTEXTO DE SEGURANÇA
// ========================================
//
// O contexto será usado como AAD
// (Additional Authenticated Data).
//
// Não é criptografado, mas sua
// integridade é protegida pelo GCM.
//
// Isso impede que um conteúdo
// criptografado para um paciente
// seja simplesmente copiado para outro.

export type ContextoCriptografiaProntuario = {
  medicoId: number;
  pacienteId: number;
};

function gerarContexto(
  contexto: ContextoCriptografiaProntuario
): Buffer {

  const {
    medicoId,
    pacienteId
  } = contexto;

  if (
    !Number.isSafeInteger(medicoId) ||
    medicoId <= 0 ||
    !Number.isSafeInteger(pacienteId) ||
    pacienteId <= 0
  ) {

    throw new Error(
      "Contexto do prontuário inválido."
    );
  }

  return Buffer.from(
    `prontuario:v1:medico:${medicoId}:paciente:${pacienteId}`,
    "utf8"
  );
}


// ========================================
// CRIPTOGRAFAR CONTEÚDO CLÍNICO
// ========================================
//
// Recebe um objeto JavaScript com os
// dados estruturados do prontuário.
//
// Retorna uma string no formato:
//
// v1:1:IV:TAG:CONTEUDO
//
// IV, TAG e CONTEUDO usam Base64.
//
// O texto original não deve ser salvo
// em outra coluna do banco.

export function criptografarProntuario(
  conteudo: unknown,
  contexto: ContextoCriptografiaProntuario
): string {

  const chave =
    obterChave();

  const iv =
    randomBytes(TAMANHO_IV);

  const dados =
    Buffer.from(
      JSON.stringify(conteudo),
      "utf8"
    );

  const cipher =
    createCipheriv(
      ALGORITMO,
      chave,
      iv,
      {
        authTagLength: TAMANHO_TAG
      }
    );

  // Vincula o conteúdo ao contexto
  // do médico e do paciente.
  cipher.setAAD(
    gerarContexto(contexto)
  );

  const criptografado =
    Buffer.concat([
      cipher.update(dados),
      cipher.final()
    ]);

  const tag =
    cipher.getAuthTag();

  return [
    VERSAO_FORMATO,
    IDENTIFICADOR_CHAVE,
    iv.toString("base64"),
    tag.toString("base64"),
    criptografado.toString("base64")
  ].join(":");
}


// ========================================
// DESCRIPTOGRAFAR CONTEÚDO CLÍNICO
// ========================================
//
// A autorização do médico deve ser
// verificada antes desta função.
//
// A descriptografia precisa utilizar
// os mesmos IDs de médico e paciente
// usados originalmente.
//
// Se o conteúdo tiver sido alterado,
// ou se a chave/contexto for diferente,
// a operação será rejeitada.

export function descriptografarProntuario<T>(
  conteudoCriptografado: string,
  contexto: ContextoCriptografiaProntuario
): T {

  const partes =
    conteudoCriptografado.split(":");

  if (partes.length !== 5) {

    throw new Error(
      "Formato do prontuário criptografado inválido."
    );
  }

  const [
    versao,
    chaveId,
    ivBase64,
    tagBase64,
    dadosBase64
  ] = partes;

  if (
    versao !== VERSAO_FORMATO ||
    chaveId !== IDENTIFICADOR_CHAVE ||
    !ivBase64 ||
    !tagBase64 ||
    !dadosBase64
  ) {

    throw new Error(
      "Versão de criptografia não suportada."
    );
  }

  const iv =
    Buffer.from(ivBase64, "base64");

  const tag =
    Buffer.from(tagBase64, "base64");

  const dados =
    Buffer.from(dadosBase64, "base64");

  if (
    iv.length !== TAMANHO_IV ||
    tag.length !== TAMANHO_TAG
  ) {

    throw new Error(
      "Conteúdo criptografado inválido."
    );
  }

  const decipher =
    createDecipheriv(
      ALGORITMO,
      obterChave(),
      iv,
      {
        authTagLength: TAMANHO_TAG
      }
    );

  decipher.setAAD(
    gerarContexto(contexto)
  );

  decipher.setAuthTag(tag);

  try {

    // A verificação de integridade ocorre
    // em decipher.final().
    //
    // Se a autenticação falhar,
    // nenhum conteúdo é retornado.
    const descriptografado =
      Buffer.concat([
        decipher.update(dados),
        decipher.final()
      ]);

    return JSON.parse(
      descriptografado.toString("utf8")
    ) as T;

  } catch {

    // Nunca mostramos dados internos
    // nem informações clínicas no erro.
    throw new Error(
      "Não foi possível verificar a integridade do prontuário."
    );
  }
}
