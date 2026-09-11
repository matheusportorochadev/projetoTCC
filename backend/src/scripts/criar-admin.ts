// Carrega variáveis de ambiente e dependências
import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "../prisma/db";

// Cria o administrador inicial do sistema
async function main() {
  const nome = process.env.ADMIN_NOME;
  const email = process.env.ADMIN_EMAIL;
  const senha = process.env.ADMIN_SENHA;

  if (!nome || !email || !senha) {
    throw new Error(
      "ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA precisam estar definidos no .env"
    );
  }

  // Verifica se o administrador já existe
  const usuarioExistente = await db.orm.public.Usuario
    .where({ email })
    .first();

  if (usuarioExistente) {
    console.log("Administrador já cadastrado.");
    return;
  }

  // Criptografa a senha
  const senhaHash = await bcrypt.hash(senha, 12);

  // Salva o administrador no banco
  const admin = await db.orm.public.Usuario.create({
    nome,
    email,
    senha: senhaHash,
    tipo: "ADMIN",
    ativo: true
  });

  console.log("Administrador criado com sucesso.");
  console.log({
    id: admin.id,
    nome: admin.nome,
    email: admin.email,
    tipo: admin.tipo
  });
}

main().catch((erro) => {
  console.error("Erro ao criar administrador:", erro);
});