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

    // Na porta 587 exigimos STARTTLS.
    requireTLS:
      smtpPort === 587,

    auth: {

      user:
        process.env.SMTP_USER,

      pass:
        process.env.SMTP_PASS

    },

    // Não aceitamos versões antigas
    // de TLS.
    tls: {
      minVersion:
        "TLSv1.2"
    }

  });


// ========================================
// ENVIAR CÓDIGO
// ========================================

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
      `Seu código para redefinição de senha é ${codigo}. O código é válido por 10 minutos.`

  });

}