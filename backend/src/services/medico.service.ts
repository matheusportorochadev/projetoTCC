// Dependências do serviço de médicos
import bcrypt from "bcrypt";
import { db } from "../prisma/db";

// Tipo dos dados para criação do médico
type CriarMedicoDados = {
  nome: string;
  email: string;
  senha: string;
  crm: string;
};

// Remove a senha antes de retornar o usuário
function removerSenha(usuario: any) {
  const { senha, ...usuarioSemSenha } = usuario;

  return usuarioSemSenha;
}

// Valida os dados do médico
function validarDadosMedico(dados: CriarMedicoDados) {
  const nomeRegex = /^[A-Za-zÀ-ÿ\s]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const senhaRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  if (!dados.nome.trim()) {
    throw new Error("O nome é obrigatório.");
  }

  if (dados.nome.trim().length < 3) {
    throw new Error(
      "O nome deve ter pelo menos 3 caracteres."
    );
  }

  if (!nomeRegex.test(dados.nome.trim())) {
    throw new Error(
      "O nome deve conter apenas letras e espaços."
    );
  }

  if (!emailRegex.test(dados.email.trim())) {
    throw new Error(
      "Informe um e-mail válido."
    );
  }

  if (!dados.crm.trim()) {
    throw new Error(
      "O CRM é obrigatório."
    );
  }

  if (!senhaRegex.test(dados.senha)) {
    throw new Error(
      "A senha deve ter no mínimo 8 caracteres, com letra maiúscula, letra minúscula, número e caractere especial."
    );
  }
}

// Cadastra um novo médico
export async function criarMedico(
  dados: CriarMedicoDados
) {
  validarDadosMedico(dados);

  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  const senha = dados.senha;
  const crm = dados.crm.trim().toUpperCase();

  const usuarioExistente = await db.orm.public.Usuario
    .where({ email })
    .first();

  if (usuarioExistente) {
    throw new Error(
      "Já existe um usuário com este e-mail."
    );
  }

  const medicoExistente = await db.orm.public.Medico
    .where({ crm })
    .first();

  if (medicoExistente) {
    throw new Error(
      "Já existe um médico com este CRM."
    );
  }

  // Criptografa a senha inicial
  const senhaHash = await bcrypt.hash(
    senha,
    12
  );

  // Cria o usuário do médico
  const usuario = await db.orm.public.Usuario.create({
    nome,
    email,
    senha: senhaHash,
    tipo: "MEDICO",
    ativo: true,
    primeiroAcesso: true
  });

  // Cria os dados específicos do médico
  const medico = await db.orm.public.Medico.create({
    usuarioId: usuario.id,
    crm
  });

  return {
    ...medico,
    usuario: removerSenha(usuario)
  };
}

// Lista todos os médicos
export async function listarMedicos() {
  const medicos = await db.orm.public.Medico
    .include("usuario")
    .all();

  return medicos.map((medico) => ({
    ...medico,
    usuario: medico.usuario
      ? removerSenha(medico.usuario)
      : null
  }));
}

// Busca um médico pelo ID
export async function buscarMedicoPorId(id: number) {
  const medico = await db.orm.public.Medico
    .where({ id })
    .include("usuario")
    .first();

  if (!medico) {
    throw new Error(
      "Médico não encontrado."
    );
  }

  return {
    ...medico,
    usuario: medico.usuario
      ? removerSenha(medico.usuario)
      : null
  };
}

// Ativa ou bloqueia o médico
export async function atualizarStatusMedico(
  id: number,
  ativo: boolean
) {
  const medico = await db.orm.public.Medico
    .where({ id })
    .first();

  if (!medico) {
    throw new Error(
      "Médico não encontrado."
    );
  }

  const usuarioAtualizado =
    await db.orm.public.Usuario
      .where({ id: medico.usuarioId })
      .update({
        ativo
      });

  if (!usuarioAtualizado) {
    throw new Error(
      "Erro ao atualizar status do médico."
    );
  }

  return removerSenha(
    usuarioAtualizado
  );
}

// Exclui o médico e todos os dados de autenticação relacionados
export async function excluirMedico(id: number) {
  const medico = await db.orm.public.Medico
    .where({ id })
    .first();

  if (!medico) {
    throw new Error(
      "Médico não encontrado."
    );
  }

  const usuarioId = medico.usuarioId;

  // Remove códigos de redefinição vinculados ao usuário
  const codigos =
    await db.orm.public.CodigoRedefinicaoSenha
      .where({ usuarioId })
      .all();

  for (const codigo of codigos) {
    await db.orm.public.CodigoRedefinicaoSenha
      .where({ id: codigo.id })
      .delete();
  }

  // Remove o registro de médico
  await db.orm.public.Medico
    .where({ id })
    .delete();

  // Remove o usuário
  await db.orm.public.Usuario
    .where({ id: usuarioId })
    .delete();

  return {
    mensagem: "Médico excluído com sucesso."
  };
}