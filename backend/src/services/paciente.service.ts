// Dependências do serviço de pacientes
import bcrypt from "bcrypt";

import { db } from "../prisma/db";


// ========================================
// TIPOS
// ========================================

// Dados necessários para criar
// um novo paciente.
type CriarPacienteDados = {
  medicoId: number;
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
};


// Dados que podem ser alterados
// durante a edição do paciente.
type AtualizarPacienteDados = {
  nome?: string;
  email?: string;
  telefone?: string;
  cpf?: string;
};


// ========================================
// CONSTANTES
// ========================================

// Senha padrão utilizada quando
// o acesso do paciente é liberado
// pela primeira vez.
//
// O banco não armazena esta senha
// diretamente.
//
// É armazenado apenas o hash gerado
// pelo bcrypt.
const SENHA_PADRAO_PACIENTE =
  "Paciente@";


// ========================================
// BUSCAR MÉDICO PELO USUÁRIO
// ========================================

// Recebe o ID do usuário autenticado
// e procura o médico relacionado.
//
// Dessa forma, não precisamos confiar
// em medicoId enviado pelo frontend.
export async function buscarMedicoPorUsuarioId(
  usuarioId: number
) {
  const medico =
    await db.orm.public.Medico
      .where({
        usuarioId
      })
      .first();


  if (!medico) {
    throw new Error(
      "Médico não encontrado para este usuário."
    );
  }


  return medico;
}


// ========================================
// VALIDAR PACIENTE
// ========================================

// Valida os dados recebidos
// durante o cadastro de paciente.
function validarPaciente(
  dados: CriarPacienteDados
) {
  // Permite letras, espaços e acentos.
  const nomeRegex =
    /^[A-Za-zÀ-ÿ\s]+$/;


  // Validação básica de e-mail.
  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  // ========================================
  // NOME
  // ========================================

  if (!dados.nome.trim()) {
    throw new Error(
      "O nome é obrigatório."
    );
  }


  if (
    dados.nome.trim().length < 3
  ) {
    throw new Error(
      "O nome deve ter pelo menos 3 caracteres."
    );
  }


  if (
    !nomeRegex.test(
      dados.nome.trim()
    )
  ) {
    throw new Error(
      "O nome deve conter apenas letras e espaços."
    );
  }


  // ========================================
  // E-MAIL
  // ========================================

  // O e-mail é opcional no cadastro.
  //
  // Porém, se existir,
  // precisa estar em formato válido.
  if (
    dados.email &&
    !emailRegex.test(
      dados.email.trim()
    )
  ) {
    throw new Error(
      "Informe um e-mail válido."
    );
  }
}


// ========================================
// CRIAR PACIENTE
// ========================================

// Cadastra um paciente.
//
// Neste momento ainda NÃO é criado
// o usuário de login.
//
// O usuário será criado somente quando
// o médico liberar o acesso do paciente.
export async function criarPaciente(
  dados: CriarPacienteDados
) {
  // Valida os dados.
  validarPaciente(dados);


  // ========================================
  // NORMALIZAR DADOS
  // ========================================

  const nome =
    dados.nome.trim();


  const email =
    dados.email
      ? dados.email
          .trim()
          .toLowerCase()
      : null;


  const telefone =
    dados.telefone
      ? dados.telefone.trim()
      : null;


  const cpf =
    dados.cpf
      ? dados.cpf.trim()
      : null;


  // ========================================
  // VERIFICAR CPF DUPLICADO
  // ========================================

  if (cpf) {
    const pacienteCpf =
      await db.orm.public.Paciente
        .where({
          cpf
        })
        .first();


    if (pacienteCpf) {
      throw new Error(
        "Já existe um paciente com este CPF."
      );
    }
  }


  // ========================================
  // CRIAR PACIENTE
  // ========================================

  const paciente =
    await db.orm.public.Paciente
      .create({
        medicoId:
          dados.medicoId,

        nome,

        email,

        telefone,

        cpf,

        // O paciente ainda não pode
        // acessar o sistema.
        acessoLiberado:
          false,

        // O cadastro começa ativo.
        ativo:
          true
      });


  return paciente;
}


// ========================================
// LISTAR PACIENTES
// ========================================

// Lista todos os pacientes
// pertencentes ao médico.
export async function listarPacientes(
  medicoId: number
) {
  const pacientes =
    await db.orm.public.Paciente
      .where({
        medicoId
      })
      .all();


  return pacientes;
}


// ========================================
// BUSCAR PACIENTE POR ID
// ========================================

// Busca um paciente específico.
//
// Também verifica se aquele paciente
// pertence ao médico informado.
export async function buscarPacientePorId(
  id: number,
  medicoId: number
) {
  const paciente =
    await db.orm.public.Paciente
      .where({
        id,
        medicoId
      })
      .first();


  if (!paciente) {
    throw new Error(
      "Paciente não encontrado."
    );
  }


  return paciente;
}


// ========================================
// ATUALIZAR PACIENTE
// ========================================

// Atualiza os dados cadastrais
// de um paciente.
export async function atualizarPaciente(
  id: number,
  medicoId: number,
  dados: AtualizarPacienteDados
) {
  // Confirma que o paciente existe
  // e pertence ao médico.
  const paciente =
    await buscarPacientePorId(
      id,
      medicoId
    );


  // Objeto que receberá apenas
  // os dados enviados pelo frontend.
  const dadosAtualizados:
    AtualizarPacienteDados = {};


  // ========================================
  // NOME
  // ========================================

  if (
    dados.nome !== undefined
  ) {
    const nome =
      dados.nome.trim();


    if (
      nome.length < 3
    ) {
      throw new Error(
        "O nome deve ter pelo menos 3 caracteres."
      );
    }


    const nomeRegex =
      /^[A-Za-zÀ-ÿ\s]+$/;


    if (
      !nomeRegex.test(nome)
    ) {
      throw new Error(
        "O nome deve conter apenas letras e espaços."
      );
    }


    dadosAtualizados.nome =
      nome;
  }


  // ========================================
  // E-MAIL
  // ========================================

  if (
    dados.email !== undefined
  ) {
    const email =
      dados.email
        .trim()
        .toLowerCase();


    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
      email &&
      !emailRegex.test(email)
    ) {
      throw new Error(
        "Informe um e-mail válido."
      );
    }


    dadosAtualizados.email =
      email;
  }


  // ========================================
  // TELEFONE
  // ========================================

  if (
    dados.telefone !== undefined
  ) {
    dadosAtualizados.telefone =
      dados.telefone.trim();
  }


  // ========================================
  // CPF
  // ========================================

  if (
    dados.cpf !== undefined
  ) {
    const cpf =
      dados.cpf.trim();


    // Verifica se outro paciente
    // já utiliza esse CPF.
    const cpfExistente =
      await db.orm.public.Paciente
        .where({
          cpf
        })
        .first();


    if (
      cpfExistente &&
      cpfExistente.id !==
        paciente.id
    ) {
      throw new Error(
        "Já existe um paciente com este CPF."
      );
    }


    dadosAtualizados.cpf =
      cpf;
  }


  // ========================================
  // ATUALIZAR NO BANCO
  // ========================================

  const pacienteAtualizado =
    await db.orm.public.Paciente
      .where({
        id,
        medicoId
      })
      .update(
        dadosAtualizados
      );


  if (!pacienteAtualizado) {
    throw new Error(
      "Erro ao atualizar paciente."
    );
  }


  return pacienteAtualizado;
}


// ========================================
// ATIVAR / BLOQUEAR PACIENTE
// ========================================

// Altera o campo ativo
// do cadastro do paciente.
//
// Caso ele possua Usuario,
// o usuário também será
// ativado ou bloqueado.
export async function atualizarStatusPaciente(
  id: number,
  medicoId: number,
  ativo: boolean
) {
  // Busca o paciente.
  const paciente =
    await buscarPacientePorId(
      id,
      medicoId
    );


  // ========================================
  // ATUALIZAR PACIENTE
  // ========================================

  const pacienteAtualizado =
    await db.orm.public.Paciente
      .where({
        id,
        medicoId
      })
      .update({
        ativo
      });


  if (!pacienteAtualizado) {
    throw new Error(
      "Erro ao atualizar status do paciente."
    );
  }


  // ========================================
  // ATUALIZAR USUÁRIO
  // ========================================

  // Caso o paciente possua
  // usuário de autenticação,
  // alteramos o status dele também.
  if (paciente.usuarioId) {
    await db.orm.public.Usuario
      .where({
        id:
          paciente.usuarioId
      })
      .update({
        ativo
      });
  }


  return pacienteAtualizado;
}


// ========================================
// LIBERAR / BLOQUEAR ACESSO
// ========================================

// Controla o acesso do paciente
// ao sistema.
//
// Fluxo:
//
// Médico cadastra paciente
//        ↓
// acessoLiberado = false
//        ↓
// Médico libera acesso
//        ↓
// Sistema cria Usuario
//        ↓
// tipo = PACIENTE
//        ↓
// senha = Paciente@
//        ↓
// primeiroAcesso = true
export async function atualizarAcessoPaciente(
  id: number,
  medicoId: number,
  acessoLiberado: boolean
) {
  // Busca o paciente.
  const paciente =
    await buscarPacientePorId(
      id,
      medicoId
    );


  // ========================================
  // BLOQUEAR ACESSO
  // ========================================

  if (!acessoLiberado) {
    const pacienteAtualizado =
      await db.orm.public.Paciente
        .where({
          id,
          medicoId
        })
        .update({
          acessoLiberado:
            false
        });


    if (!pacienteAtualizado) {
      throw new Error(
        "Erro ao bloquear acesso do paciente."
      );
    }


    // Caso exista usuário de login,
    // também bloqueamos esse usuário.
    if (paciente.usuarioId) {
      await db.orm.public.Usuario
        .where({
          id:
            paciente.usuarioId
        })
        .update({
          ativo:
            false
        });
    }


    return pacienteAtualizado;
  }


  // ========================================
  // LIBERAR ACESSO
  // ========================================

  // Um paciente precisa de e-mail
  // para conseguir autenticar.
  if (!paciente.email) {
    throw new Error(
      "O paciente precisa possuir um e-mail para liberar o acesso."
    );
  }


  // ========================================
  // PACIENTE JÁ POSSUI USUÁRIO
  // ========================================

  // Se usuarioId já existir,
  // não criamos outro Usuario.
  //
  // Apenas reativamos o acesso.
  if (paciente.usuarioId) {
    // Reativa o usuário.
    await db.orm.public.Usuario
      .where({
        id:
          paciente.usuarioId
      })
      .update({
        ativo:
          true
      });


    // Libera o paciente.
    const pacienteAtualizado =
      await db.orm.public.Paciente
        .where({
          id,
          medicoId
        })
        .update({
          acessoLiberado:
            true
        });


    if (!pacienteAtualizado) {
      throw new Error(
        "Erro ao liberar acesso do paciente."
      );
    }


    return pacienteAtualizado;
  }


  // ========================================
  // NORMALIZAR E-MAIL
  // ========================================

  const email =
    paciente.email
      .trim()
      .toLowerCase();


  // ========================================
  // VERIFICAR E-MAIL EXISTENTE
  // ========================================

  // Não permitimos criar dois usuários
  // utilizando o mesmo e-mail.
  const usuarioExistente =
    await db.orm.public.Usuario
      .where({
        email
      })
      .first();


  if (usuarioExistente) {
    throw new Error(
      "Já existe um usuário cadastrado com o e-mail deste paciente."
    );
  }


  // ========================================
  // GERAR HASH DA SENHA
  // ========================================

  // A senha inicial é:
  //
  // Paciente@
  //
  // Porém, somente o hash
  // será salvo no banco.
  const senhaHash =
    await bcrypt.hash(
      SENHA_PADRAO_PACIENTE,
      12
    );


  // ========================================
  // CRIAR USUÁRIO
  // ========================================

  const usuario =
    await db.orm.public.Usuario
      .create({
        nome:
          paciente.nome,

        email,

        senha:
          senhaHash,

        tipo:
          "PACIENTE",

        ativo:
          true,

        // Força troca de senha
        // no primeiro acesso.
        primeiroAcesso:
          true
      });


  // ========================================
  // VINCULAR USUÁRIO AO PACIENTE
  // ========================================

  const pacienteAtualizado =
    await db.orm.public.Paciente
      .where({
        id,
        medicoId
      })
      .update({
        usuarioId:
          usuario.id,

        acessoLiberado:
          true
      });


  if (!pacienteAtualizado) {
    throw new Error(
      "Erro ao vincular usuário ao paciente."
    );
  }


  return pacienteAtualizado;
}


// ========================================
// EXCLUIR PACIENTE
// ========================================

// Exclui definitivamente um paciente.
//
// Antes de excluir:
//
// 1. verifica se o paciente existe;
// 2. verifica se pertence ao médico;
// 3. verifica se possui agendamentos;
// 4. exclui o paciente;
// 5. exclui códigos de redefinição;
// 6. exclui o usuário relacionado.
//
// Pacientes com agendamentos não
// podem ser excluídos para preservar
// o histórico do sistema.
export async function excluirPaciente(
  id: number,
  medicoId: number
) {
  // ========================================
  // BUSCAR PACIENTE
  // ========================================

  const paciente =
    await buscarPacientePorId(
      id,
      medicoId
    );


  // ========================================
  // VERIFICAR AGENDAMENTOS
  // ========================================

  // Procura qualquer agendamento
  // vinculado ao paciente.
  const agendamentos =
    await db.orm.public.Agendamento
      .where({
        pacienteId:
          paciente.id
      })
      .all();


  // Se houver agendamentos,
  // não permitimos excluir.
  if (
    agendamentos.length > 0
  ) {
    throw new Error(
      "Não é possível excluir este paciente porque ele possui agendamentos cadastrados."
    );
  }


  // Guardamos o usuarioId antes
  // da exclusão do paciente.
  const usuarioId =
    paciente.usuarioId;


  // ========================================
  // EXCLUIR PACIENTE
  // ========================================

  const pacienteExcluido =
    await db.orm.public.Paciente
      .where({
        id:
          paciente.id,

        medicoId
      })
      .delete();


  if (!pacienteExcluido) {
    throw new Error(
      "Erro ao excluir paciente."
    );
  }


  // ========================================
  // EXCLUIR USUÁRIO RELACIONADO
  // ========================================

  // Nem todo paciente possui
  // usuário de autenticação.
  if (usuarioId) {
    // ========================================
    // BUSCAR CÓDIGOS DE REDEFINIÇÃO
    // ========================================

    const codigos =
      await db.orm.public.CodigoRedefinicaoSenha
        .where({
          usuarioId
        })
        .all();


    // ========================================
    // EXCLUIR CÓDIGOS
    // ========================================

    // Antes de excluir o usuário,
    // removemos os códigos relacionados.
    for (const codigo of codigos) {
      await db.orm.public.CodigoRedefinicaoSenha
        .where({
          id:
            codigo.id
        })
        .delete();
    }


    // ========================================
    // EXCLUIR USUÁRIO
    // ========================================

    await db.orm.public.Usuario
      .where({
        id:
          usuarioId
      })
      .delete();
  }


  // ========================================
  // RETORNO
  // ========================================

  return {
    mensagem:
      "Paciente excluído com sucesso."
  };
}