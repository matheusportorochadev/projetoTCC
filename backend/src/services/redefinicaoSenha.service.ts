// Dependências da redefinição de senha
import crypto from "crypto";
import bcrypt from "bcrypt";
import { db } from "../prisma/db";
import { enviarCodigoRedefinicao } from "./email.service";

// Gera um código numérico de 6 dígitos
function gerarCodigo() {
  return crypto.randomInt(100000, 1000000).toString();
}

// Cria e envia um código temporário de redefinição
export async function solicitarRedefinicaoSenha(email: string) {
  const usuario = await db.orm.public.Usuario
    .where({ email })
    .first();

  if (!usuario) {
    throw new Error("Usuário não encontrado.");
  }

  if (!usuario.ativo) {
    throw new Error("Usuário bloqueado.");
  }

  // Gera o código e define validade de 10 minutos
  const codigo = gerarCodigo();
  const expiraEm = new Date(
    Date.now() + 10 * 60 * 1000
  ).toISOString();

  // Salva o código temporário
  await db.orm.public.CodigoRedefinicaoSenha.create({
    usuarioId: usuario.id,
    codigo,
    expiraEm,
    usado: false
  });

  // Envia o código para o e-mail do usuário
  await enviarCodigoRedefinicao(
    usuario.email,
    codigo
  );

  return {
    email: usuario.email,
    expiraEm
  };
}

// Valida o código e redefine a senha
export async function redefinirSenha(
  email: string,
  codigo: string,
  novaSenha: string
) {
  const usuario = await db.orm.public.Usuario
    .where({ email })
    .first();

  if (!usuario) {
    throw new Error("Usuário não encontrado.");
  }

  const codigoRedefinicao =
    await db.orm.public.CodigoRedefinicaoSenha
      .where({
        usuarioId: usuario.id,
        codigo,
        usado: false
      })
      .first();

  if (!codigoRedefinicao) {
    throw new Error("Código inválido.");
  }

  const agora = new Date();
  const expiracao = new Date(
    codigoRedefinicao.expiraEm
  );

  if (agora > expiracao) {
    throw new Error("Código expirado.");
  }

  // Criptografa a nova senha
  const senhaHash = await bcrypt.hash(
    novaSenha,
    12
  );

  // Atualiza a senha e encerra o primeiro acesso
  const usuarioAtualizado =
    await db.orm.public.Usuario
      .where({ id: usuario.id })
      .update({
        senha: senhaHash,
        primeiroAcesso: false
      });

  if (!usuarioAtualizado) {
    throw new Error(
      "Erro ao atualizar senha."
    );
  }

  // Marca o código como utilizado
  await db.orm.public.CodigoRedefinicaoSenha
    .where({ id: codigoRedefinicao.id })
    .update({
      usado: true
    });

  return {
    mensagem: "Senha redefinida com sucesso."
  };
}