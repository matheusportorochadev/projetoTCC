
// ========================================
// API DE ACESSO AOS PRONTUÁRIOS
// ========================================

// Centraliza a comunicação entre o
// frontend e o backend dos prontuários.
//
// Todas as requisições utilizam
// credentials: "include" para enviar
// os cookies HttpOnly do sistema.

const API_URL = "http://localhost:3000";


// ========================================
// TIPOS DAS RESPOSTAS
// ========================================

// Indica se a senha adicional já existe.
export type SituacaoProntuario = {
  senhaCadastrada: boolean;
};

// Indica se a autorização está válida.
export type SessaoProntuario = {
  autorizado: boolean;
};

// Respostas com mensagens do servidor.
export type RespostaProntuario = {
  mensagem: string;
};

// Dados necessários para redefinir
// a senha adicional usando o código.
export type DadosRecuperacaoProntuario = {
  codigo: string;
  novaSenha: string;
  confirmarSenha: string;
};


// ========================================
// TRATAR RESPOSTAS HTTP
// ========================================

// Lê a resposta e transforma erros HTTP
// em mensagens que poderão ser exibidas
// na interface.
//
// O backend continua responsável por
// validar os dados e autorizar operações.
async function tratarResposta<T>(
  resposta: Response,
  mensagemPadrao: string
): Promise<T> {

  const dados: unknown =
    await resposta.json().catch(() => null);

  if (!resposta.ok) {

    let mensagem = mensagemPadrao;

    if (
      dados !== null &&
      typeof dados === "object" &&
      "mensagem" in dados &&
      typeof dados.mensagem === "string"
    ) {
      mensagem = dados.mensagem;
    }

    throw new Error(mensagem);
  }

  return dados as T;
}


// ========================================
// 1. CONSULTAR SITUAÇÃO DA SENHA
// ========================================

// GET /prontuarios/acesso/situacao
//
// Verifica se o médico já possui
// senha adicional cadastrada.
export async function buscarSituacaoProntuario():
  Promise<SituacaoProntuario> {

  const resposta = await fetch(
    `${API_URL}/prontuarios/acesso/situacao`,
    {
      method: "GET",
      credentials: "include"
    }
  );

  return tratarResposta<SituacaoProntuario>(
    resposta,
    "Não foi possível verificar a senha dos prontuários."
  );
}


// ========================================
// 2. CONSULTAR AUTORIZAÇÃO ATUAL
// ========================================

// GET /prontuarios/acesso/sessao
//
// Verifica se o médico ainda possui
// autorização adicional válida.
export async function buscarSessaoProntuario():
  Promise<SessaoProntuario> {

  const resposta = await fetch(
    `${API_URL}/prontuarios/acesso/sessao`,
    {
      method: "GET",
      credentials: "include"
    }
  );

  return tratarResposta<SessaoProntuario>(
    resposta,
    "A autorização dos prontuários expirou."
  );
}


// ========================================
// 3. CADASTRAR SENHA ADICIONAL
// ========================================

// POST /prontuarios/acesso/cadastrar
//
// Utilizado somente no primeiro cadastro.
export async function cadastrarSenhaProntuarioApi(
  senha: string,
  confirmarSenha: string
): Promise<RespostaProntuario> {

  const resposta = await fetch(
    `${API_URL}/prontuarios/acesso/cadastrar`,
    {
      method: "POST",
      credentials: "include",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        senha,
        confirmarSenha
      })
    }
  );

  return tratarResposta<RespostaProntuario>(
    resposta,
    "Não foi possível cadastrar a senha dos prontuários."
  );
}


// ========================================
// 4. VERIFICAR SENHA ADICIONAL
// ========================================

// POST /prontuarios/acesso/verificar
//
// Valida a senha e recebe a autorização
// adicional por meio de cookie HttpOnly.
export async function verificarSenhaProntuarioApi(
  senha: string
): Promise<SessaoProntuario & RespostaProntuario> {

  const resposta = await fetch(
    `${API_URL}/prontuarios/acesso/verificar`,
    {
      method: "POST",
      credentials: "include",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        senha
      })
    }
  );

  return tratarResposta<
    SessaoProntuario & RespostaProntuario
  >(
    resposta,
    "Não foi possível verificar a senha dos prontuários."
  );
}


// ========================================
// 5. SOLICITAR CÓDIGO DE RECUPERAÇÃO
// ========================================

// POST /prontuarios/acesso/recuperacao/solicitar
//
// O frontend não envia um endereço
// de e-mail.
//
// O backend identifica o médico pelo
// JWT principal e utiliza o e-mail
// cadastrado no banco.
//
// Enviamos um objeto vazio porque o
// schema Zod do endpoint exige
// um objeto sem propriedades.
export async function solicitarRecuperacaoProntuarioApi():
  Promise<RespostaProntuario> {

  const resposta = await fetch(
    `${API_URL}/prontuarios/acesso/recuperacao/solicitar`,
    {
      method: "POST",
      credentials: "include",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({})
    }
  );

  return tratarResposta<RespostaProntuario>(
    resposta,
    "Não foi possível solicitar o código de recuperação."
  );
}


// ========================================
// 6. CONCLUIR RECUPERAÇÃO
// ========================================

// POST /prontuarios/acesso/recuperacao/concluir
//
// Envia:
//
// - código de 6 dígitos;
// - nova senha;
// - confirmação da nova senha.
//
// A API não recebe medicoId ou e-mail.
// A recuperação sempre corresponde
// ao médico autenticado.
export async function concluirRecuperacaoProntuarioApi(
  dados: DadosRecuperacaoProntuario
): Promise<RespostaProntuario> {

  const resposta = await fetch(
    `${API_URL}/prontuarios/acesso/recuperacao/concluir`,
    {
      method: "POST",
      credentials: "include",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(dados)
    }
  );

  return tratarResposta<RespostaProntuario>(
    resposta,
    "Não foi possível redefinir a senha dos prontuários."
  );
}
