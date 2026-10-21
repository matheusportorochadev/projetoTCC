
// ========================================
// SERVICE DE RECUPERAÇÃO DOS PRONTUÁRIOS
// ========================================

// Este service implementa:
//
// 1. Solicitação de código por e-mail.
// 2. Geração de código aleatório de 6 dígitos.
// 3. Armazenamento seguro com HMAC.
// 4. Validade de 10 minutos.
// 5. Limite de 5 tentativas incorretas.
// 6. Redefinição da senha com bcrypt.
// 7. Incremento da versão de autorização.
//
// IMPORTANTE:
//
// Não altera a senha principal de login.
// Não modifica pacientes ou prontuários.

import {
  randomInt,
  createHmac,
  timingSafeEqual
} from "node:crypto";

import bcrypt from "bcrypt";

import { db } from "../prisma/db";

import {
  buscarMedicoPorUsuarioId
} from "./paciente.service";

import {
  enviarCodigoRecuperacaoProntuario
} from "./email.service";


// ========================================
// CONFIGURAÇÕES
// ========================================

const VALIDADE_CODIGO_MS =
  10 * 60 * 1000;

const MAX_TENTATIVAS = 5;

const BCRYPT_ROUNDS = 12;


// ========================================
// GERAR CÓDIGO ALEATÓRIO
// ========================================

// randomInt utiliza um gerador
// criptograficamente seguro.
//
// O código terá exatamente 6 dígitos.
function gerarCodigo(): string {

  return randomInt(
    100000,
    1000000
  ).toString();

}


// ========================================
// OBTER SEGREDO DOS CÓDIGOS
// ========================================

// Reutilizamos a variável segura
// já usada nos fluxos de recuperação.
//
// Não reutilizamos diretamente
// o JWT_SECRET.
function obterSegredoCodigo(): string {

  const segredo =
    process.env.RESET_CODE_SECRET;

  if (
    !segredo ||
    segredo.length < 32
  ) {

    throw new Error(
      "RESET_CODE_SECRET não está configurado corretamente."
    );

  }

  return segredo;

}


// ========================================
// GERAR HMAC DO CÓDIGO
// ========================================

// Incluímos:
//
// - identificação do módulo;
// - ID do médico;
// - código recebido.
//
// Assim, o mesmo código em outros
// fluxos não produz o mesmo hash.
function gerarHashCodigo(
  medicoId: number,
  codigo: string
): string {

  return createHmac(
    "sha256",
    obterSegredoCodigo()
  )
    .update(
      `recuperacao-prontuario:${medicoId}:${codigo}`
    )
    .digest("hex");

}


// ========================================
// COMPARAR HASHES
// ========================================

// Evita comparação simples de strings
// para verificar o HMAC do código.
function compararHashes(
  recebido: string,
  armazenado: string
): boolean {

  const bufferRecebido =
    Buffer.from(recebido, "hex");

  const bufferArmazenado =
    Buffer.from(armazenado, "hex");

  if (
    bufferRecebido.length === 0 ||
    bufferRecebido.length !==
      bufferArmazenado.length
  ) {

    return false;

  }

  return timingSafeEqual(
    bufferRecebido,
    bufferArmazenado
  );

}


// ========================================
// INVALIDAR CÓDIGOS ANTERIORES
// ========================================

// Ao solicitar um novo código,
// os anteriores deixam de funcionar.
async function invalidarCodigosAtivos(
  medicoId: number
): Promise<void> {

  const registros =
    await db.orm.public.CodigoRecuperacaoProntuario
      .where({
        medicoId,
        usado: false
      })
      .all();

  for (const registro of registros) {

    await db.orm.public.CodigoRecuperacaoProntuario
      .where({
        id: registro.id
      })
      .update({
        usado: true
      });

  }

}


// ========================================
// SOLICITAR RECUPERAÇÃO
// ========================================

// Recebe somente o ID do usuário
// autenticado pelo JWT principal.
//
// O frontend não escolhe o e-mail
// que receberá o código.
export async function solicitarRecuperacaoProntuario(
  usuarioId: number
) {

  // Localiza o médico autenticado.
  const medico =
    await buscarMedicoPorUsuarioId(
      usuarioId
    );

  // Confirma que o médico já possui
  // uma senha adicional cadastrada.
  const acesso =
    await db.orm.public.AcessoProntuario
      .where({
        medicoId: medico.id
      })
      .first();

  if (!acesso) {

    throw new Error(
      "A senha dos prontuários ainda não foi cadastrada."
    );

  }

  // Obtém o e-mail diretamente do banco.
  const usuario =
    await db.orm.public.Usuario
      .where({
        id: usuarioId
      })
      .first();

  if (
    !usuario ||
    !usuario.ativo ||
    usuario.tipo !== "MEDICO"
  ) {

    throw new Error(
      "Não foi possível solicitar a recuperação."
    );

  }

  // Invalida códigos antigos.
  await invalidarCodigosAtivos(
    medico.id
  );

  // Gera um novo código.
  const codigo =
    gerarCodigo();

  // Armazena somente o HMAC.
  const codigoHash =
    gerarHashCodigo(
      medico.id,
      codigo
    );

  // Calcula a expiração de 10 minutos.
  const expiraEm =
    new Date(
      Date.now() + VALIDADE_CODIGO_MS
    ).toISOString();

  // Salva o registro temporário.
  const registro =
    await db.orm.public.CodigoRecuperacaoProntuario
      .create({

        medicoId: medico.id,

        codigoHash,

        expiraEm,

        usado: false,

        tentativas: 0

      });

  // ========================================
  // ENVIAR CÓDIGO POR E-MAIL
  // ========================================

  try {

    await enviarCodigoRecuperacaoProntuario(
      usuario.email,
      codigo
    );

  } catch (erro) {

    // Se o e-mail não foi enviado,
    // invalidamos o registro criado.
    await db.orm.public.CodigoRecuperacaoProntuario
      .where({
        id: registro.id
      })
      .update({
        usado: true
      });

    throw erro;

  }

  // Não devolvemos o código ao frontend.
  return {
    mensagem:
      "Um código de recuperação foi enviado ao e-mail cadastrado."
  };

}


// ========================================
// CONCLUIR RECUPERAÇÃO
// ========================================

// Valida o código e substitui somente
// a senha adicional dos prontuários.
export async function concluirRecuperacaoProntuario(
  usuarioId: number,
  codigo: string,
  novaSenha: string
) {

  // ========================================
  // VALIDAÇÕES INICIAIS
  // ========================================

  // A rota também utilizará Zod.
  // Mantemos verificações básicas aqui
  // para não depender apenas do controller.
  if (!/^\d{6}$/.test(codigo)) {

    throw new Error(
      "Código inválido ou expirado."
    );

  }

  if (
    !novaSenha ||
    novaSenha.length < 8 ||
    novaSenha.length > 100
  ) {

    throw new Error(
      "Nova senha inválida."
    );

  }

  // ========================================
  // IDENTIFICAR MÉDICO
  // ========================================

  const medico =
    await buscarMedicoPorUsuarioId(
      usuarioId
    );

  const acesso =
    await db.orm.public.AcessoProntuario
      .where({
        medicoId: medico.id
      })
      .first();

  if (!acesso) {

    throw new Error(
      "Não foi possível redefinir a senha."
    );

  }

  // ========================================
  // BUSCAR CÓDIGO ATIVO
  // ========================================

  const registros =
    await db.orm.public.CodigoRecuperacaoProntuario
      .where({
        medicoId: medico.id,
        usado: false
      })
      .all();

  // Trabalhamos com o registro ativo
  // mais recente do médico.
  const registro =
    [...registros]
      .sort(
        (a, b) =>
          b.id - a.id
      )[0];

  if (!registro) {

    throw new Error(
      "Código inválido ou expirado."
    );

  }

  // ========================================
  // VERIFICAR EXPIRAÇÃO
  // ========================================

  if (
    Date.now() >=
    new Date(registro.expiraEm).getTime()
  ) {

    await db.orm.public.CodigoRecuperacaoProntuario
      .where({
        id: registro.id
      })
      .update({
        usado: true
      });

    throw new Error(
      "Código inválido ou expirado."
    );

  }

  // ========================================
  // VERIFICAR LIMITE DE TENTATIVAS
  // ========================================

  if (
    registro.tentativas >= MAX_TENTATIVAS
  ) {

    await db.orm.public.CodigoRecuperacaoProntuario
      .where({
        id: registro.id
      })
      .update({
        usado: true
      });

    throw new Error(
      "Código inválido ou expirado."
    );

  }

  // ========================================
  // COMPARAR CÓDIGO
  // ========================================

  const codigoHashRecebido =
    gerarHashCodigo(
      medico.id,
      codigo
    );

  const codigoCorreto =
    compararHashes(
      codigoHashRecebido,
      registro.codigoHash
    );

  if (!codigoCorreto) {

    const novasTentativas =
      registro.tentativas + 1;

    await db.orm.public.CodigoRecuperacaoProntuario
      .where({
        id: registro.id
      })
      .update({

        tentativas: novasTentativas,

        usado:
          novasTentativas >= MAX_TENTATIVAS

      });

    throw new Error(
      "Código inválido ou expirado."
    );

  }

  // ========================================
  // GERAR HASH DA NOVA SENHA
  // ========================================

  const senhaHash =
    await bcrypt.hash(
      novaSenha,
      BCRYPT_ROUNDS
    );

  // ========================================
  // ATUALIZAR SENHA E INVALIDAR CÓDIGO
  // ========================================

  // A transação reúne a alteração
  // da credencial e a marcação do código.
  //
  // A versão de autorização aumenta,
  // permitindo rejeitar JWTs emitidos
  // antes desta redefinição.
  await db.transaction(async (tx) => {

    await tx.orm.public.AcessoProntuario
      .where({
        id: acesso.id
      })
      .update({

        senhaHash,

        versaoAutorizacao:
          acesso.versaoAutorizacao + 1

      });

    await tx.orm.public.CodigoRecuperacaoProntuario
      .where({
        id: registro.id
      })
      .update({
        usado: true
      });

  });

  // Invalida quaisquer outros códigos
  // de recuperação ainda ativos.
  await invalidarCodigosAtivos(
    medico.id
  );

  return {
    mensagem:
      "Senha dos prontuários redefinida com sucesso."
  };

}
