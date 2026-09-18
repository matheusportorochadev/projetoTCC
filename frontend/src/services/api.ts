// ========================================
// SERVIÇO CENTRAL DE COMUNICAÇÃO COM A API
// ========================================


// ========================================
// ENDEREÇO PRINCIPAL DA API
// ========================================

const API_URL =
  "http://localhost:3000";


// ========================================
// TRATAR RESPOSTA DA API
// ========================================

async function tratarResposta(
  resposta: Response,
  mensagemPadrao: string
) {

  const dados =
    await resposta.json();


  if (!resposta.ok) {

    throw new Error(
      dados.mensagem ||
        mensagemPadrao
    );

  }


  return dados;
}


// ========================================
// LOGIN
// ========================================

export async function fazerLogin(
  email: string,
  senha: string
) {

  const resposta =
    await fetch(
      `${API_URL}/auth/login`,
      {

        method:
          "POST",

        credentials:
          "include",

        headers: {

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify({

            email,

            senha

          })

      }
    );


  return tratarResposta(
    resposta,
    "Erro ao realizar login."
  );
}


// ========================================
// LOGOUT
// ========================================

export async function fazerLogout() {

  const resposta =
    await fetch(
      `${API_URL}/auth/logout`,
      {

        method:
          "POST",

        credentials:
          "include"

      }
    );


  return tratarResposta(
    resposta,
    "Erro ao realizar logout."
  );
}


// ========================================
// PERFIL DO USUÁRIO
// ========================================

export async function buscarPerfil() {

  const resposta =
    await fetch(
      `${API_URL}/perfil`,
      {

        credentials:
          "include"

      }
    );


  return tratarResposta(
    resposta,
    "Não foi possível verificar a sessão."
  );
}


// ========================================
// LISTAR MÉDICOS
// ========================================

export async function listarMedicos() {

  const resposta =
    await fetch(
      `${API_URL}/medicos`,
      {

        credentials:
          "include"

      }
    );


  return tratarResposta(
    resposta,
    "Erro ao listar médicos."
  );
}


// ========================================
// BUSCAR MÉDICO POR ID
// ========================================

export async function buscarMedico(
  id: number
) {

  const resposta =
    await fetch(
      `${API_URL}/medicos/${id}`,
      {

        credentials:
          "include"

      }
    );


  return tratarResposta(
    resposta,
    "Erro ao buscar médico."
  );
}


// ========================================
// CADASTRAR NOVO MÉDICO
// ========================================

export async function cadastrarMedico(
  nome: string,
  email: string,
  crm: string
) {

  const resposta =
    await fetch(
      `${API_URL}/medicos`,
      {

        method:
          "POST",

        credentials:
          "include",

        headers: {

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify({

            nome,

            email,

            crm

          })

      }
    );


  return tratarResposta(
    resposta,
    "Erro ao cadastrar médico."
  );
}


// ========================================
// ATIVAR / BLOQUEAR MÉDICO
// ========================================

export async function atualizarStatusMedico(
  id: number,
  ativo: boolean
) {

  const resposta =
    await fetch(
      `${API_URL}/medicos/${id}/status`,
      {

        method:
          "PATCH",

        credentials:
          "include",

        headers: {

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify({

            ativo

          })

      }
    );


  return tratarResposta(
    resposta,
    "Erro ao atualizar status do médico."
  );
}


// ========================================
// EXCLUIR MÉDICO
// ========================================

export async function excluirMedico(
  id: number
) {

  const resposta =
    await fetch(
      `${API_URL}/medicos/${id}`,
      {

        method:
          "DELETE",

        credentials:
          "include"

      }
    );


  return tratarResposta(
    resposta,
    "Erro ao excluir médico."
  );
}
