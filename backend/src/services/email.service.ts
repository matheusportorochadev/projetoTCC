// Dependências do envio de e-mail
import "dotenv/config";
import nodemailer from "nodemailer";

// Configuração do servidor SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Envia o código de redefinição de senha
export async function enviarCodigoRedefinicao(
  email: string,
  codigo: string
) {
  await transporter.sendMail({
    from: `"Sistema Consultório Médico" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "Redefinição de senha",
    text: `Seu código para redefinição de senha é ${codigo}. O código é válido por 10 minutos.`
  });
}