// Dependências do serviço de pacientes
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
//
// IMPORTANTE:
//
// Se o paciente já possuir Usuario,
// nome e e-mail também serão
// sincronizados com a conta de login.
//
// Isso evita situações como:
//
// Paciente.email = novo@email.com
//
// mas:
//
// Usuario.email = antigo@email.com
//
// o que poderia impedir o paciente
// de realizar login ou primeiro acesso.
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


  // Guarda os valores normalizados
  // que também poderão ser utilizados
  // para atualizar Usuario.
  let nomeAtualizado:
    string | undefined;

  let emailAtualizado:
    string | undefined;


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

    nomeAtualizado =
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


    // ========================================
    // PACIENTE COM USUÁRIO
    // ========================================

    // Se o paciente já possui uma conta
    // de autenticação, não permitimos
    // remover completamente o e-mail,
    // porque ele é necessário para login,
    // primeiro acesso e recuperação de senha.
    if (
      paciente.usuarioId &&
      !email
    ) {
      throw new Error(
        "Não é possível remover o e-mail de um paciente que já possui acesso ao sistema."
      );
    }


    // Se foi informado algum e-mail,
    // validamos o formato.
    if (
      email &&
      !emailRegex.test(email)
    ) {
      throw new Error(
        "Informe um e-mail válido."
      );
    }


    // ========================================
    // VERIFICAR E-MAIL EM USUARIO
    // ========================================

    // Evita que o e-mail do paciente seja
    // alterado para um endereço que já está
    // sendo utilizado por outra conta.
    if (email) {
      const usuarioComMesmoEmail =
        await db.orm.public.Usuario
          .where({
            email
          })
          .first();

      if (
        usuarioComMesmoEmail &&
        usuarioComMesmoEmail.id !==
          paciente.usuarioId
      ) {
        throw new Error(
          "Já existe um usuário cadastrado com este e-mail."
        );
      }
    }

    dadosAtualizados.email =
      email;

    emailAtualizado =
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
  // ATUALIZAR PACIENTE
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


  // ========================================
  // SINCRONIZAR USUÁRIO
  // ========================================

  // Se o paciente já possui uma conta
  // de autenticação, mantemos nome e
  // e-mail sincronizados.
  if (paciente.usuarioId) {
    const dadosUsuario: {
      nome?: string;
      email?: string;
    } = {};

    if (
      nomeAtualizado !== undefined
    ) {
      dadosUsuario.nome =
        nomeAtualizado;
    }

    if (
      emailAtualizado !== undefined
    ) {
      dadosUsuario.email =
        emailAtualizado;
    }


    // Só fazemos update se realmente
    // houver algo para sincronizar.
    if (
      Object.keys(
        dadosUsuario
      ).length > 0
    ) {
      await db.orm.public.Usuario
        .where({
          id:
            paciente.usuarioId
        })
        .update(
          dadosUsuario
        );
    }
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
// NOVO FLUXO:
//
// Médico cadastra paciente
//        ↓
// acessoLiberado = false
// usuarioId = null
//        ↓
// Médico libera acesso
//        ↓
// Sistema cria Usuario
//        ↓
// tipo = PACIENTE
// senha = null
// primeiroAcesso = true
//        ↓
// Paciente utiliza
// "Primeiro acesso"
//        ↓
// Recebe código por e-mail
//        ↓
// Cria sua própria senha
//        ↓
// primeiroAcesso = false
//
// IMPORTANTE:
//
// Não existe mais senha padrão
// como "Paciente@".
//
// SEGURANÇA:
//
// Toda esta operação agora ocorre
// dentro de uma TRANSAÇÃO.
//
// Dessa forma, se a atualização de
// Usuario ou Paciente falhar,
// nenhuma alteração parcial fica
// salva no banco.
export async function atualizarAcessoPaciente(
  id: number,
  medicoId: number,
  acessoLiberado: boolean
) {
  return db.transaction(
    async (tx) => {

      // ========================================
      // BUSCAR PACIENTE NA TRANSAÇÃO
      // ========================================

      // Não utilizamos buscarPacientePorId()
      // aqui porque ela usa db.orm.
      //
      // Dentro de uma transação devemos
      // utilizar somente tx.orm.
      const paciente =
        await tx.orm.public.Paciente
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


      // ========================================
      // BLOQUEAR ACESSO
      // ========================================

      if (!acessoLiberado) {

        const pacienteAtualizado =
          await tx.orm.public.Paciente
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
          const usuarioAtualizado =
            await tx.orm.public.Usuario
              .where({
                id:
                  paciente.usuarioId
              })
              .update({
                ativo:
                  false
              });

          if (!usuarioAtualizado) {
            throw new Error(
              "Erro ao bloquear usuário do paciente."
            );
          }
        }


        // Se chegarmos aqui,
        // tudo ocorreu corretamente.
        //
        // A transação será confirmada.
        return pacienteAtualizado;
      }


      // ========================================
      // LIBERAR ACESSO
      // ========================================

      // Um paciente precisa de e-mail
      // para conseguir realizar:
      //
      // - primeiro acesso;
      // - login;
      // - recuperação de senha.
      if (!paciente.email) {
        throw new Error(
          "O paciente precisa possuir um e-mail para liberar o acesso."
        );
      }


      // Normaliza o e-mail que será utilizado
      // na conta de autenticação.
      const email =
        paciente.email
          .trim()
          .toLowerCase();


      // ========================================
      // PACIENTE JÁ POSSUI USUÁRIO
      // ========================================

      // Se usuarioId já existir,
      // não criamos outro Usuario.
      //
      // Apenas reativamos a conta
      // já existente.
      if (paciente.usuarioId) {

        // ========================================
        // VERIFICAR E-MAIL
        // ========================================

        // Garante que o e-mail atual do
        // paciente não pertence a outra conta.
        const usuarioComMesmoEmail =
          await tx.orm.public.Usuario
            .where({
              email
            })
            .first();

        if (
          usuarioComMesmoEmail &&
          usuarioComMesmoEmail.id !==
            paciente.usuarioId
        ) {
          throw new Error(
            "Já existe um usuário cadastrado com o e-mail deste paciente."
          );
        }


        // ========================================
        // REATIVAR USUÁRIO
        // ========================================

        // Também sincronizamos nome e e-mail
        // para evitar inconsistências antigas.
        const usuarioAtualizado =
          await tx.orm.public.Usuario
            .where({
              id:
                paciente.usuarioId
            })
            .update({
              nome:
                paciente.nome,

              email,

              ativo:
                true
            });

        if (!usuarioAtualizado) {
          throw new Error(
            "Erro ao reativar usuário do paciente."
          );
        }


        // ========================================
        // LIBERAR PACIENTE
        // ========================================

        const pacienteAtualizado =
          await tx.orm.public.Paciente
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


        // As duas atualizações somente
        // serão confirmadas juntas.
        return pacienteAtualizado;
      }


      // ========================================
      // VERIFICAR E-MAIL EXISTENTE
      // ========================================

      // Não permitimos criar dois usuários
      // utilizando o mesmo e-mail.
      const usuarioExistente =
        await tx.orm.public.Usuario
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
      // CRIAR USUÁRIO
      // ========================================

      // NOVO COMPORTAMENTO:
      //
      // Não criamos mais uma senha padrão.
      //
      // O usuário nasce com:
      //
      // senha = null
      // primeiroAcesso = true
      //
      // Depois, no fluxo de "Primeiro acesso",
      // o próprio paciente criará sua senha.
      const usuario =
        await tx.orm.public.Usuario
          .create({
            nome:
              paciente.nome,

            email,

            senha:
              null,

            tipo:
              "PACIENTE",

            ativo:
              true,

            primeiroAcesso:
              true
          });


      // ========================================
      // VINCULAR USUÁRIO AO PACIENTE
      // ========================================

      const pacienteAtualizado =
        await tx.orm.public.Paciente
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

        // O usuário acabou de ser criado.
        //
        // Porém, como estamos dentro de uma
        // transação, este erro também desfaz
        // a criação daquele Usuario.
        throw new Error(
          "Erro ao vincular usuário ao paciente."
        );
      }


      // ========================================
      // COMMIT
      // ========================================

      // Se chegarmos aqui:
      //
      // Usuario foi criado
      // +
      // Paciente foi vinculado.
      //
      // O Prisma confirma a transação.
      return pacienteAtualizado;
    }
  );
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
// 6. exclui códigos de primeiro acesso;
// 7. exclui o usuário relacionado.
//
// Pacientes com agendamentos não
// podem ser excluídos para preservar
// o histórico do sistema.
//
// SEGURANÇA:
//
// Agora todo o processo de exclusão
// acontece dentro de uma TRANSAÇÃO.
//
// Se qualquer uma das exclusões falhar,
// todas as exclusões anteriores daquela
// operação são automaticamente desfeitas.
export async function excluirPaciente(
  id: number,
  medicoId: number
) {
  return db.transaction(
    async (tx) => {

      // ========================================
      // BUSCAR PACIENTE
      // ========================================

      const paciente =
        await tx.orm.public.Paciente
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


      // ========================================
      // VERIFICAR AGENDAMENTOS
      // ========================================

      // Procura qualquer agendamento
      // vinculado ao paciente.
      const agendamentos =
        await tx.orm.public.Agendamento
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
        await tx.orm.public.Paciente
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
      // PACIENTE SEM USUÁRIO
      // ========================================

      // Nem todo paciente possui uma
      // conta de autenticação.
      //
      // Se não existir usuarioId,
      // a exclusão termina aqui.
      if (!usuarioId) {
        return {
          mensagem:
            "Paciente excluído com sucesso."
        };
      }


      // ========================================
      // CÓDIGOS DE REDEFINIÇÃO DE SENHA
      // ========================================

      const codigosRedefinicao =
        await tx.orm.public.CodigoRedefinicaoSenha
          .where({
            usuarioId
          })
          .all();


      // Remove todos os códigos relacionados
      // antes de excluir Usuario.
      for (
        const codigo of
          codigosRedefinicao
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

      // O fluxo de primeiro acesso
      // também possui relacionamento
      // obrigatório com Usuario.
      //
      // Por isso removemos esses registros
      // antes de excluir a conta.
      const codigosPrimeiroAcesso =
        await tx.orm.public.CodigoPrimeiroAcesso
          .where({
            usuarioId
          })
          .all();


      for (
        const codigo of
          codigosPrimeiroAcesso
      ) {
        await tx.orm.public.CodigoPrimeiroAcesso
          .where({
            id:
              codigo.id
          })
          .delete();
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

        // Se esta última operação falhar,
        // o throw provoca rollback.
        //
        // Isso restaura:
        //
        // - Paciente;
        // - códigos de redefinição;
        // - códigos de primeiro acesso;
        // - demais alterações desta transação.
        throw new Error(
          "Erro ao excluir usuário do paciente."
        );
      }


      // ========================================
      // RETORNO
      // ========================================

      // Se chegarmos aqui,
      // todas as exclusões ocorreram
      // corretamente e a transação
      // será confirmada.
      return {
        mensagem:
          "Paciente excluído com sucesso."
      };
    }
  );
}