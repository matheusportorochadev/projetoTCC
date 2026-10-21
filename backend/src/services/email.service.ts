
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


// ========================================
// RECUPERAÇÃO DA SENHA DOS PRONTUÁRIOS
// ========================================

// NOVA FUNÇÃO.
//
// Envia um código de 6 dígitos para
// recuperar exclusivamente a senha
// adicional dos prontuários.
//
// O e-mail do destinatário será obtido
// pelo backend a partir do usuário
// médico autenticado.
//
// Esta função utiliza o mesmo transporter
// SMTP já configurado no sistema.
//
// IMPORTANTE:
//
// - Não altera a senha de login.
// - Não modifica dados dos pacientes.
// - Não modifica prontuários.
// - Apenas envia o código por e-mail.
//
// A geração, o armazenamento seguro,
// a expiração e a validação do código
// serão realizados pelo service
// de recuperação dos prontuários.
export async function enviarCodigoRecuperacaoProntuario(
  email: string,
  codigo: string
) {

  await transporter.sendMail({

    from:
      `"Sistema Consultório Médico" <${process.env.SMTP_FROM}>`,

    to:
      email,

    subject:
      "Recuperação da senha dos prontuários",

    text:
      [
        "Foi solicitada a recuperação da senha de acesso aos prontuários médicos.",
        "",
        "Utilize o código abaixo para cadastrar uma nova senha:",
        "",
        `Código: ${codigo}`,
        "",
        "O código é válido por 10 minutos e pode ser utilizado apenas uma vez.",
        "",
        "Se você não solicitou esta recuperação, ignore esta mensagem.",
        "",
        "A senha principal de acesso ao sistema não será alterada."
      ].join("\n")

  });
}
