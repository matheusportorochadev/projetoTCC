// ========================================
// DEPENDÊNCIAS
// ========================================

import {
  db
} from "../prisma/db";


// ========================================
// TIPOS
// ========================================

// O ADMIN não define mais
// a senha inicial do médico.
//
// O próprio médico criará sua senha
// através do fluxo de Primeiro Acesso.
type CriarMedicoDados = {
  nome: string;
  email: string;
  crm: string;
};


// ========================================
// REMOVER SENHA
// ========================================

// Nunca retornamos o hash da senha
// para o frontend.
function removerSenha(
  usuario: any
) {
  const {
    senha,
    ...usuarioSemSenha
  } = usuario;

  return usuarioSemSenha;
}


// ========================================
// VALIDAR DADOS DO MÉDICO
// ========================================

function validarDadosMedico(
  dados: CriarMedicoDados
) {
  const nomeRegex =
    /^[A-Za-zÀ-ÿ\s]+$/;

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

  if (
    !emailRegex.test(
      dados.email.trim()
    )
  ) {
    throw new Error(
      "Informe um e-mail válido."
    );
  }


  // ========================================
  // CRM
  // ========================================

  if (!dados.crm.trim()) {
    throw new Error(
      "O CRM é obrigatório."
    );
  }
}


// ========================================
// CRIAR MÉDICO
// ========================================
//
// NOVO FLUXO:
//
// ADMIN cadastra médico
//        ↓
// Usuario MEDICO é criado
//        ↓
// senha = null
// primeiroAcesso = true
//        ↓
// Médico utiliza "Primeiro acesso"
//        ↓
// recebe código por e-mail
//        ↓
// cria sua própria senha
//
// Também utilizamos TRANSAÇÃO.
//
// Se Usuario for criado mas a criação
// de Medico falhar, o Usuario também
// será desfeito automaticamente.

export async function criarMedico(
  dados: CriarMedicoDados
) {
  validarDadosMedico(
    dados
  );


  // ========================================
  // NORMALIZAR DADOS
  // ========================================

  const nome =
    dados.nome.trim();

  const email =
    dados.email
      .trim()
      .toLowerCase();

  const crm =
    dados.crm
      .trim()
      .toUpperCase();


  // ========================================
  // VERIFICAR E-MAIL
  // ========================================

  const usuarioExistente =
    await db.orm.public.Usuario
      .where({
        email
      })
      .first();

  if (usuarioExistente) {
    throw new Error(
      "Já existe um usuário com este e-mail."
    );
  }


  // ========================================
  // VERIFICAR CRM
  // ========================================

  const medicoExistente =
    await db.orm.public.Medico
      .where({
        crm
      })
      .first();

  if (medicoExistente) {
    throw new Error(
      "Já existe um médico com este CRM."
    );
  }


  // ========================================
  // TRANSAÇÃO
  // ========================================

  const resultado =
    await db.transaction(
      async (tx) => {

        // ========================================
        // CRIAR USUÁRIO
        // ========================================

        const usuario =
          await tx.orm.public.Usuario
            .create({
              nome,

              email,

              // IMPORTANTE:
              //
              // O ADMIN não define
              // a senha do médico.
              senha:
                null,

              tipo:
                "MEDICO",

              ativo:
                true,

              primeiroAcesso:
                true
            });


        // ========================================
        // CRIAR MÉDICO
        // ========================================

        const medico =
          await tx.orm.public.Medico
            .create({
              usuarioId:
                usuario.id,

              crm
            });


        return {
          usuario,
          medico
        };
      }
    );


  // ========================================
  // RETORNO
  // ========================================

  return {
    ...resultado.medico,

    usuario:
      removerSenha(
        resultado.usuario
      )
  };
}


// ========================================
// LISTAR MÉDICOS
// ========================================

export async function listarMedicos() {
  const medicos =
    await db.orm.public.Medico
      .include("usuario")
      .all();

  return medicos.map(
    (medico) => ({
      ...medico,

      usuario:
        medico.usuario
          ? removerSenha(
              medico.usuario
            )
          : null
    })
  );
}


// ========================================
// BUSCAR MÉDICO POR ID
// ========================================

export async function buscarMedicoPorId(
  id: number
) {
  const medico =
    await db.orm.public.Medico
      .where({
        id
      })
      .include("usuario")
      .first();

  if (!medico) {
    throw new Error(
      "Médico não encontrado."
    );
  }

  return {
    ...medico,

    usuario:
      medico.usuario
        ? removerSenha(
            medico.usuario
          )
        : null
  };
}


// ========================================
// ATIVAR / BLOQUEAR MÉDICO
// ========================================

export async function atualizarStatusMedico(
  id: number,
  ativo: boolean
) {
  const medico =
    await db.orm.public.Medico
      .where({
        id
      })
      .first();

  if (!medico) {
    throw new Error(
      "Médico não encontrado."
    );
  }


  // ========================================
  // ATUALIZAR USUÁRIO
  // ========================================

  const usuarioAtualizado =
    await db.orm.public.Usuario
      .where({
        id:
          medico.usuarioId
      })
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


// ========================================
// EXCLUIR MÉDICO
// ========================================
//
// Toda a exclusão acontece em uma
// única TRANSAÇÃO.
//
// Não apagamos automaticamente
// pacientes ou agendamentos.
//
// Se eles ainda existirem,
// a exclusão é bloqueada.
//
// Disponibilidades antigas/inativas
// podem ser removidas automaticamente,
// pois pertencem exclusivamente à agenda
// daquele médico.
//
// Também removemos:
//
// - CodigoRedefinicaoSenha;
// - CodigoPrimeiroAcesso;
// - Medico;
// - Usuario.
//
// Qualquer falha provoca ROLLBACK.

export async function excluirMedico(
  id: number
) {
  return db.transaction(
    async (tx) => {

      // ========================================
      // BUSCAR MÉDICO
      // ========================================

      const medico =
        await tx.orm.public.Medico
          .where({
            id
          })
          .first();

      if (!medico) {
        throw new Error(
          "Médico não encontrado."
        );
      }

      const usuarioId =
        medico.usuarioId;


      // ========================================
      // VERIFICAR PACIENTES
      // ========================================

      const pacientes =
        await tx.orm.public.Paciente
          .where({
            medicoId:
              id
          })
          .all();

      if (
        pacientes.length > 0
      ) {
        throw new Error(
          "Não é possível excluir este médico porque ainda existem pacientes vinculados a ele."
        );
      }


      // ========================================
      // VERIFICAR AGENDAMENTOS
      // ========================================

      const agendamentos =
        await tx.orm.public.Agendamento
          .where({
            medicoId:
              id
          })
          .all();

      if (
        agendamentos.length > 0
      ) {
        throw new Error(
          "Não é possível excluir este médico porque ainda existem agendamentos vinculados a ele."
        );
      }


      // ========================================
      // EXCLUIR DISPONIBILIDADES
      // ========================================
      //
      // Inclui registros ativos e inativos.
      //
      // Isso corrige o erro de FK:
      //
      // disponibilidadeAgenda_medicoId_fkey

      const disponibilidades =
        await tx.orm.public.DisponibilidadeAgenda
          .where({
            medicoId:
              id
          })
          .all();

      for (
        const disponibilidade
        of disponibilidades
      ) {
        await tx.orm.public.DisponibilidadeAgenda
          .where({
            id:
              disponibilidade.id
          })
          .delete();
      }


      // ========================================
      // CÓDIGOS DE REDEFINIÇÃO
      // ========================================

      const codigosRedefinicao =
        await tx.orm.public.CodigoRedefinicaoSenha
          .where({
            usuarioId
          })
          .all();

      for (
        const codigo
        of codigosRedefinicao
      ) {
        await tx.orm.public.CodigoRedefinicaoSenha
          .where({
            id:
              codigo.id
          })
          .delete();
      }


      // ========================================
      // CÓDIGOS DE PRIMEIRO ACESSO
      // ========================================

      const codigosPrimeiroAcesso =
        await tx.orm.public.CodigoPrimeiroAcesso
          .where({
            usuarioId
          })
          .all();

      for (
        const codigo
        of codigosPrimeiroAcesso
      ) {
        await tx.orm.public.CodigoPrimeiroAcesso
          .where({
            id:
              codigo.id
          })
          .delete();
      }


      // ========================================
      // EXCLUIR MÉDICO
      // ========================================

      const medicoExcluido =
        await tx.orm.public.Medico
          .where({
            id
          })
          .delete();

      if (!medicoExcluido) {
        throw new Error(
          "Não foi possível excluir o médico."
        );
      }


      // ========================================
      // EXCLUIR USUÁRIO
      // ========================================

      const usuarioExcluido =
        await tx.orm.public.Usuario
          .where({
            id:
              usuarioId
          })
          .delete();

      if (!usuarioExcluido) {
        throw new Error(
          "Não foi possível excluir o usuário do médico."
        );
      }


      // ========================================
      // SUCESSO
      // ========================================

      return {
        mensagem:
          "Médico excluído com sucesso."
      };
    }
  );
}