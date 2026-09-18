// ========================================
// DEPENDÊNCIAS
// ========================================

import "dotenv/config";
import nodemailer from "nodemailer";


// ========================================
// CONFIGURAÇÃO SMTP
// ========================================

const smtpPort =
  Number(
    process.env.SMTP_PORT
  );


// ========================================
// TRANSPORTER
// ========================================

const transporter =
  nodemailer.createTransport({

    host:
      process.env.SMTP_HOST,

    port:
      smtpPort,

    // Porta 465 inicia diretamente
    // utilizando TLS.
    secure:
      smtpPort === 465,

    // Porta 587 utiliza STARTTLS.
    requireTLS:
      smtpPort === 587,

    auth: {

      user:
        process.env.SMTP_USER,

      pass:
        process.env.SMTP_PASS

    },

    // Não permitimos versões antigas
    // do protocolo TLS.
    tls: {
      minVersion:
        "TLSv1.2"
    }

  });


// ========================================
// ENVIAR CÓDIGO DE REDEFINIÇÃO
// ========================================

// Utilizado pelo fluxo:
//
// "Esqueci minha senha".
export async function enviarCodigoRedefinicao(
  email: string,
  codigo: string
) {

  await transporter.sendMail({

    from:
      `"Sistema Consultório Médico" <${process.env.SMTP_FROM}>`,

    to:
      email,

    subject:
      "Redefinição de senha",

    text:
      [
        "Você solicitou a redefinição da sua senha.",
        "",
        `Seu código é: ${codigo}`,
        "",
        "O código é válido por 10 minutos.",
        "",
        "Caso você não tenha solicitado a redefinição, ignore este e-mail."
      ].join("\n")

  });
}


// ========================================
// ENVIAR CÓDIGO DE PRIMEIRO ACESSO
// ========================================

// Utilizado exclusivamente quando
// o paciente ainda não criou sua
// primeira senha.
//
// Este fluxo é separado da
// recuperação de senha.
export async function enviarCodigoPrimeiroAcesso(
  email: string,
  codigo: string
) {

  await transporter.sendMail({

    from:
      `"Sistema Consultório Médico" <${process.env.SMTP_FROM}>`,

    to:
      email,

    subject:
      "Código de primeiro acesso",

    text:
      [
        "Seu acesso ao Sistema Consultório Médico foi liberado.",
        "",
        "Para criar sua senha, utilize o código abaixo:",
        "",
        `Código: ${codigo}`,
        "",
        "O código é válido por 10 minutos.",
        "",
        "Caso você não esperasse receber este e-mail, ignore esta mensagem."
      ].join("\n")

  });
}