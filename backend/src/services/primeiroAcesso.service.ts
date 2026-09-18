// ========================================
// DEPENDÊNCIAS
// ========================================

import crypto from "crypto";
import bcrypt from "bcrypt";

import {
  db
} from "../prisma/db";

import {
  enviarCodigoPrimeiroAcesso
} from "./email.service";


// ========================================
// CONSTANTES
// ========================================

// Código válido por 10 minutos.
const TEMPO_EXPIRACAO_CODIGO =
  10 * 60 * 1000;


// Máximo de tentativas incorretas
// antes de invalidar o código.
const MAX_TENTATIVAS =
  5;


// ========================================
// GERAR CÓDIGO
// ========================================

// Gera um código numérico
// aleatório de 6 dígitos.
//
// Exemplo:
//
// 483921
function gerarCodigo() {
  return crypto
    .randomInt(
      100000,
      1000000
    )
    .toString();
}


// ========================================
// OBTER SEGREDO DO SERVIDOR
// ========================================

// Reutilizamos o RESET_CODE_SECRET
// que já existe no projeto.
//
// Esse segredo:
//
// - fica somente no backend;
// - não vai para o frontend;
// - não deve ir para o GitHub;
// - não é o JWT_SECRET.
function obterSegredoCodigo() {

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
// GERAR HASH DO CÓDIGO
// ========================================

// O código real enviado ao usuário:
//
// 483921
//
// NÃO será salvo diretamente no banco.
//
// O banco receberá somente um HMAC.
//
// Adicionamos "primeiro-acesso" na
// composição para diferenciar esse hash
// dos códigos de redefinição de senha.
function gerarHashCodigo(
  usuarioId: number,
  codigo: string
) {

  return crypto
    .createHmac(
      "sha256",
      obterSegredoCodigo()
    )
    .update(
      `primeiro-acesso:${usuarioId}:${codigo}`
    )
    .digest("hex");
}


// ========================================
// COMPARAR HASHES
// ========================================

// Compara os hashes utilizando
// timingSafeEqual.
//
// Isso evita uma comparação simples
// de strings para informação sensível.
function compararHashes(
  hashRecebido: string,
  hashSalvo: string
) {

  const bufferRecebido =
    Buffer.from(
      hashRecebido,
      "hex"
    );

  const bufferSalvo =
    Buffer.from(
      hashSalvo,
      "hex"
    );


  if (
    bufferRecebido.length !==
    bufferSalvo.length
  ) {
    return false;
  }


  return crypto.timingSafeEqual(
    bufferRecebido,
    bufferSalvo
  );
}


// ========================================
// INVALIDAR CÓDIGOS ATIVOS
// ========================================

// Quando um novo código é solicitado,
// todos os anteriores deixam de funcionar.
//
// Assim o usuário sempre possui no máximo
// um código válido de primeiro acesso.
async function invalidarCodigosAtivos(
  usuarioId: number
) {

  const codigos =
    await db.orm.public
      .CodigoPrimeiroAcesso
      .where({
        usuarioId,

        usado:
          false
      })
      .all();


  for (
    const registro
    of codigos
  ) {

    await db.orm.public
      .CodigoPrimeiroAcesso
      .where({
        id:
          registro.id
      })
      .update({
        usado:
          true
      });

  }
}


// ========================================
// BUSCAR PACIENTE PELO USUÁRIO
// ========================================
//
// Para PACIENTE, além da existência
// do Usuario, precisamos garantir:
//
// - paciente ativo;
// - acesso liberado pelo médico.

async function buscarPacienteDoUsuario(
  usuarioId: number
) {

  return db.orm.public.Paciente
    .where({
      usuarioId
    })
    .first();
}


// ========================================
// BUSCAR MÉDICO PELO USUÁRIO
// ========================================
//
// Para MEDICO verificamos se existe
// um registro Medico vinculado àquele
// Usuario.
//
// O status geral da conta já é
// controlado por Usuario.ativo.

async function buscarMedicoDoUsuario(
  usuarioId: number
) {

  return db.orm.public.Medico
    .where({
      usuarioId
    })
    .first();
}


// ========================================
// VALIDAR PERFIL PARA PRIMEIRO ACESSO
// ========================================
//
// PACIENTE:
//
// precisa:
//
// - existir;
// - estar ativo;
// - ter acesso liberado.
//
// MEDICO:
//
// precisa existir registro Medico.
//
// ADMIN:
//
// não utiliza este fluxo.

async function perfilAptoPrimeiroAcesso(
  usuarioId: number,
  tipo: string
): Promise<boolean> {

  // ========================================
  // PACIENTE
  // ========================================

  if (
    tipo ===
    "PACIENTE"
  ) {

    const paciente =
      await buscarPacienteDoUsuario(
        usuarioId
      );


    return Boolean(
      paciente &&
      paciente.ativo &&
      paciente.acessoLiberado
    );
  }


  // ========================================
  // MÉDICO
  // ========================================

  if (
    tipo ===
    "MEDICO"
  ) {

    const medico =
      await buscarMedicoDoUsuario(
        usuarioId
      );


    return Boolean(
      medico
    );
  }


  // ========================================
  // OUTROS PERFIS
  // ========================================

  return false;
}


// ========================================
// SOLICITAR PRIMEIRO ACESSO
// ========================================
//
// Fluxo:
//
// MEDICO ou PACIENTE
// clica em:
//
// "Primeiro acesso"
//
//        ↓
//
// informa o e-mail
//
//        ↓
//
// backend verifica se está apto
//
//        ↓
//
// gera código
//
//        ↓
//
// salva somente o hash
//
//        ↓
//
// envia código por e-mail

export async function solicitarPrimeiroAcesso(
  email: string
) {

  // ========================================
  // NORMALIZAR E-MAIL
  // ========================================

  const emailFormatado =
    email
      .trim()
      .toLowerCase();


  // ========================================
  // BUSCAR USUÁRIO
  // ========================================

  const usuario =
    await db.orm.public.Usuario
      .where({
        email:
          emailFormatado
      })
      .first();


  // ========================================
  // RESPOSTA GENÉRICA
  // ========================================

  // Não revelamos se o e-mail:
  //
  // - existe;
  // - pertence a médico/paciente;
  // - está bloqueado;
  // - já possui senha.
  //
  // Isso dificulta enumeração
  // de usuários.
  const respostaGenerica = {
    mensagem:
      "Se o e-mail estiver apto ao primeiro acesso, enviaremos um código."
  };


  // ========================================
  // USUÁRIO NÃO EXISTE
  // ========================================

  if (!usuario) {
    return respostaGenerica;
  }


  // ========================================
  // PERFIL
  // ========================================

  // Primeiro acesso permitido para:
  //
  // - PACIENTE;
  // - MEDICO.
  //
  // ADMIN não utiliza este fluxo.
  if (
    usuario.tipo !==
      "PACIENTE" &&
    usuario.tipo !==
      "MEDICO"
  ) {
    return respostaGenerica;
  }


  // ========================================
  // USUÁRIO BLOQUEADO
  // ========================================

  if (!usuario.ativo) {
    return respostaGenerica;
  }


  // ========================================
  // JÁ CONCLUIU PRIMEIRO ACESSO
  // ========================================

  // Para utilizar Primeiro Acesso:
  //
  // primeiroAcesso deve ser true
  //
  // E
  //
  // senha deve ser null.
  //
  // Quem já possui senha deve usar:
  //
  // "Esqueci minha senha".
  if (
    !usuario.primeiroAcesso ||
    usuario.senha !== null
  ) {
    return respostaGenerica;
  }


  // ========================================
  // VALIDAR PERFIL
  // ========================================

  const perfilApto =
    await perfilAptoPrimeiroAcesso(
      usuario.id,
      usuario.tipo
    );


  if (!perfilApto) {
    return respostaGenerica;
  }


  // ========================================
  // INVALIDAR CÓDIGOS ANTIGOS
  // ========================================

  await invalidarCodigosAtivos(
    usuario.id
  );


  // ========================================
  // GERAR NOVO CÓDIGO
  // ========================================

  const codigo =
    gerarCodigo();


  // ========================================
  // GERAR HASH DO CÓDIGO
  // ========================================

  const codigoHash =
    gerarHashCodigo(
      usuario.id,
      codigo
    );


  // ========================================
  // DEFINIR EXPIRAÇÃO
  // ========================================

  const expiraEm =
    new Date(
      Date.now() +
      TEMPO_EXPIRACAO_CODIGO
    ).toISOString();


  // ========================================
  // SALVAR NO BANCO
  // ========================================

  const registro =
    await db.orm.public
      .CodigoPrimeiroAcesso
      .create({

        usuarioId:
          usuario.id,

        // Nunca armazenamos
        // os seis números originais.
        codigoHash,

        expiraEm,

        usado:
          false,

        tentativas:
          0
      });


  // ========================================
  // ENVIAR CÓDIGO POR E-MAIL
  // ========================================

  try {

    await enviarCodigoPrimeiroAcesso(
      usuario.email,
      codigo
    );

  } catch (erro) {

    // Se o envio falhar,
    // o código criado não poderá
    // continuar válido.
    await db.orm.public
      .CodigoPrimeiroAcesso
      .where({
        id:
          registro.id
      })
      .update({
        usado:
          true
      });


    throw erro;
  }


  // ========================================
  // RETORNO
  // ========================================

  return respostaGenerica;
}


// ========================================
// CONCLUIR PRIMEIRO ACESSO
// ========================================
//
// Fluxo:
//
// MEDICO ou PACIENTE informa:
//
// - e-mail;
// - código recebido;
// - nova senha.
//
//        ↓
//
// backend valida tudo
//
//        ↓
//
// cria hash bcrypt
//
//        ↓
//
// senha deixa de ser null
//
//        ↓
//
// primeiroAcesso = false

export async function concluirPrimeiroAcesso(
  email: string,
  codigo: string,
  novaSenha: string
) {

  // ========================================
  // NORMALIZAR E-MAIL
  // ========================================

  const emailFormatado =
    email
      .trim()
      .toLowerCase();


  // ========================================
  // BUSCAR USUÁRIO
  // ========================================

  const usuario =
    await db.orm.public.Usuario
      .where({
        email:
          emailFormatado
      })
      .first();


  // ========================================
  // VALIDAR USUÁRIO
  // ========================================

  if (
    !usuario ||
    !usuario.ativo ||
    (
      usuario.tipo !==
        "PACIENTE" &&
      usuario.tipo !==
        "MEDICO"
    ) ||
    !usuario.primeiroAcesso ||
    usuario.senha !== null
  ) {
    throw new Error(
      "Código inválido ou expirado."
    );
  }


  // ========================================
  // VALIDAR PERFIL
  // ========================================

  const perfilApto =
    await perfilAptoPrimeiroAcesso(
      usuario.id,
      usuario.tipo
    );


  if (!perfilApto) {
    throw new Error(
      "Código inválido ou expirado."
    );
  }


  // ========================================
  // BUSCAR CÓDIGO ATIVO
  // ========================================

  // Como códigos anteriores são
  // invalidados, deve existir somente
  // um código não utilizado.
  const registro =
    await db.orm.public
      .CodigoPrimeiroAcesso
      .where({
        usuarioId:
          usuario.id,

        usado:
          false
      })
      .first();


  if (!registro) {
    throw new Error(
      "Código inválido ou expirado."
    );
  }


  // ========================================
  // VERIFICAR EXPIRAÇÃO
  // ========================================

  const agora =
    new Date();

  const expiracao =
    new Date(
      registro.expiraEm
    );


  if (
    agora >= expiracao
  ) {

    // Já invalida o registro expirado.
    await db.orm.public
      .CodigoPrimeiroAcesso
      .where({
        id:
          registro.id
      })
      .update({
        usado:
          true
      });


    throw new Error(
      "Código inválido ou expirado."
    );
  }


  // ========================================
  // VERIFICAR TENTATIVAS
  // ========================================

  if (
    registro.tentativas >=
    MAX_TENTATIVAS
  ) {

    await db.orm.public
      .CodigoPrimeiroAcesso
      .where({
        id:
          registro.id
      })
      .update({
        usado:
          true
      });


    throw new Error(
      "Código inválido ou expirado."
    );
  }


  // ========================================
  // GERAR HASH DO CÓDIGO INFORMADO
  // ========================================

  const codigoHashRecebido =
    gerarHashCodigo(
      usuario.id,
      codigo
    );


  // ========================================
  // COMPARAR CÓDIGO
  // ========================================

  const codigoCorreto =
    compararHashes(
      codigoHashRecebido,
      registro.codigoHash
    );


  // ========================================
  // CÓDIGO INCORRETO
  // ========================================

  if (!codigoCorreto) {

    const novasTentativas =
      registro.tentativas + 1;


    await db.orm.public
      .CodigoPrimeiroAcesso
      .where({
        id:
          registro.id
      })
      .update({

        tentativas:
          novasTentativas,

        // Na quinta tentativa errada,
        // o código já é invalidado.
        usado:
          novasTentativas >=
          MAX_TENTATIVAS
      });


    throw new Error(
      "Código inválido ou expirado."
    );
  }


  // ========================================
  // VALIDAR SENHA
  // ========================================

  // O schema/controller possui
  // validação mais completa,
  // mas mantemos proteção mínima
  // também no service.
  if (
    !novaSenha ||
    novaSenha.length < 8
  ) {
    throw new Error(
      "A senha deve possuir pelo menos 8 caracteres."
    );
  }


  // ========================================
  // GERAR HASH DA SENHA
  // ========================================

  const senhaHash =
    await bcrypt.hash(
      novaSenha,
      12
    );


  // ========================================
  // ATUALIZAR USUÁRIO
  // ========================================

  const usuarioAtualizado =
    await db.orm.public.Usuario
      .where({
        id:
          usuario.id
      })
      .update({

        senha:
          senhaHash,

        primeiroAcesso:
          false
      });


  if (!usuarioAtualizado) {
    throw new Error(
      "Erro ao concluir primeiro acesso."
    );
  }


  // ========================================
  // INVALIDAR TODOS OS CÓDIGOS
  // ========================================

  // Depois que a senha foi criada,
  // nenhum código de Primeiro Acesso
  // daquele usuário poderá funcionar.
  await invalidarCodigosAtivos(
    usuario.id
  );


  // ========================================
  // RETORNO
  // ========================================

  return {
    mensagem:
      "Senha criada com sucesso. Agora você pode entrar no sistema."
  };
}