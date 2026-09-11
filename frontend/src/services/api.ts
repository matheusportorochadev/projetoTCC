// Endereço principal da API
const API_URL = "http://localhost:3000";

// Envia os dados de login para o backend
export async function fazerLogin(email: string, senha: string) {
  const resposta = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      senha
    })
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.mensagem || "Erro ao realizar login.");
  }

  return dados;
}

// Retorna o token salvo após o login
function obterToken() {
  return localStorage.getItem("token");
}

// Lista os médicos cadastrados
export async function listarMedicos() {
  const resposta = await fetch(`${API_URL}/medicos`, {
    headers: {
      Authorization: `Bearer ${obterToken()}`
    }
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.mensagem || "Erro ao listar médicos.");
  }

  return dados;
}

// Busca um médico pelo ID
export async function buscarMedico(id: number) {
  const resposta = await fetch(`${API_URL}/medicos/${id}`, {
    headers: {
      Authorization: `Bearer ${obterToken()}`
    }
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.mensagem || "Erro ao buscar médico.");
  }

  return dados;
}

// Cadastra um novo médico
export async function cadastrarMedico(
  nome: string,
  email: string,
  senha: string,
  crm: string
) {
  const resposta = await fetch(`${API_URL}/medicos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${obterToken()}`
    },
    body: JSON.stringify({
      nome,
      email,
      senha,
      crm
    })
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.mensagem || "Erro ao cadastrar médico.");
  }

  return dados;
}

// Ativa ou bloqueia um médico
export async function atualizarStatusMedico(
  id: number,
  ativo: boolean
) {
  const resposta = await fetch(`${API_URL}/medicos/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${obterToken()}`
    },
    body: JSON.stringify({
      ativo
    })
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem || "Erro ao atualizar status do médico."
    );
  }

  return dados;
}

// Exclui um médico
export async function excluirMedico(id: number) {
  const resposta = await fetch(`${API_URL}/medicos/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${obterToken()}`
    }
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem || "Erro ao excluir médico."
    );
  }

  return dados;
}