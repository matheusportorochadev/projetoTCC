// ========================================
// SERVICE DE AUDITORIA ADMINISTRATIVA
// ========================================

import { db } from "../prisma/db";


// ========================================
// FILTROS DISPONÍVEIS
// ========================================

// Filtros compartilhados pelos módulos:
//
// - Prontuários;
// - Agenda;
// - Pacientes;
// - Login e Segurança.
//
// OBSERVAÇÃO:
//
// medicoId é utilizado somente nos
// módulos que possuem esse campo.
//
// A tabela AuditoriaLogin não possui
// medicoId. Por isso, a consulta de
// autenticação não aplica esse filtro.

export type FiltrosAuditoria = {
  medicoId?: number;
  acao?: string;
  resultado?: "SUCESSO" | "FALHA";
  dataInicio?: string;
  dataFim?: string;

  // Página solicitada pelo administrador.
  // Quando não informada, utiliza página 1.
  pagina?: number;
};


// ========================================
// VALIDAR E CONVERTER DATA
// ========================================

// Converte YYYY-MM-DD para timestamp.
//
// No filtro final, utiliza o último
// milissegundo do dia.
//
// Preserva o horário local do servidor.

function converterData(
  valor: string | undefined,
  fimDoDia: boolean
): number | null {

  if (!valor) {
    return null;
  }

  const data = new Date(
    `${valor}T${
      fimDoDia
        ? "23:59:59.999"
        : "00:00:00.000"
    }`
  );

  if (Number.isNaN(data.getTime())) {
    throw new Error("Período inválido.");
  }

  return data.getTime();
}


// ========================================
// FILTRAR REGISTROS DE AUDITORIA
// ========================================

// Campos mínimos exigidos pelo
// processamento compartilhado.

type RegistroAuditavel = {
  acao: string;
  resultado: string;
  createdAt: string;
};


// Aplica os filtros, ordena os eventos
// mais recentes primeiro e limita
// o retorno a 100 registros.
//
// Preserva a implementação anterior:
//
// 1. Consulta os registros no banco;
// 2. Aplica filtros em memória;
// 3. Ordena pela data;
// 4. Retorna até 100 eventos.
//
// Futuramente podemos acrescentar
// paginação diretamente no banco.

function filtrarRegistros<
  T extends RegistroAuditavel
>(
  registros: T[],
  filtros: FiltrosAuditoria
): T[] {

  const inicio = converterData(
    filtros.dataInicio,
    false
  );

  const fim = converterData(
    filtros.dataFim,
    true
  );


  // ========================================
  // VALIDAR PERÍODO
  // ========================================

  if (
    inicio !== null &&
    fim !== null &&
    inicio > fim
  ) {
    throw new Error(
      "A data inicial não pode ser maior que a final."
    );
  }


  // ========================================
  // APLICAR FILTROS
  // ========================================

  const filtrados = registros.filter(
    (item) => {

      // Filtrar pela ação.
      if (
        filtros.acao &&
        item.acao !== filtros.acao
      ) {
        return false;
      }

      // Filtrar pelo resultado.
      if (
        filtros.resultado &&
        item.resultado !== filtros.resultado
      ) {
        return false;
      }

      // Momento da operação.
      const momento = new Date(
        item.createdAt
      ).getTime();

      // Ignorar datas inválidas.
      if (Number.isNaN(momento)) {
        return false;
      }

      // Limite inicial.
      if (
        inicio !== null &&
        momento < inicio
      ) {
        return false;
      }

      // Limite final.
      if (
        fim !== null &&
        momento > fim
      ) {
        return false;
      }

      return true;
    }
  );


  // ========================================
  // ORDENAR POR DATA
  // ========================================

  filtrados.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );


  // ========================================
  // LIMITAR RESULTADOS
  // ========================================

  return filtrados.slice(0, 100);
}


// ========================================
// LISTAR AUDITORIA DOS PRONTUÁRIOS
// ========================================

// Consulta somente metadados.
//
// O administrador não recebe conteúdo
// clínico dos prontuários.

export async function listarAuditoriaProntuarios(
  filtros: FiltrosAuditoria
) {

  // Buscar registros.
  // ========================================
  // AUDITORIA DE PRONTUÁRIOS PAGINADA
  // ========================================
  //
  // Os filtros são aplicados diretamente
  // no PostgreSQL.
  //
  // O banco retorna no máximo 50 registros
  // por página, preservando todo o histórico.
  //
  // Não são consultados dados clínicos,
  // apenas metadados da auditoria.

  // ========================================
  // VALIDAR PÁGINA
  // ========================================

  const pagina = filtros.pagina ?? 1;

  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1
  ) {
    throw new Error("Página inválida.");
  }

  const offset = (pagina - 1) * 50;

  if (!Number.isSafeInteger(offset)) {
    throw new Error("Página inválida.");
  }

  // ========================================
  // VALIDAR INTERVALO DE DATAS
  // ========================================

  const inicio = converterData(
    filtros.dataInicio,
    false
  );

  const fim = converterData(
    filtros.dataFim,
    true
  );

  if (
    inicio !== null &&
    fim !== null &&
    inicio > fim
  ) {
    throw new Error(
      "A data inicial não pode ser maior que a final."
    );
  }

  // Convertidos para o formato esperado
  // pela consulta PostgreSQL.
  const dataInicio = inicio === null
    ? null
    : new Date(inicio).toISOString();

  const dataFim = fim === null
    ? null
    : new Date(fim).toISOString();

  // ========================================
  // PREPARAR FILTROS OPCIONAIS
  // ========================================

  const medicoId = filtros.medicoId;
  const acao = filtros.acao;
  const resultado = filtros.resultado;

  // ========================================
  // CONSULTAR POSTGRESQL
  // ========================================
  //
  // Cada filtro é aplicado antes de LIMIT.
  //
  // Quando um filtro não foi informado,
  // a condição id > 0 mantém todos os
  // registros válidos.
  //
  // A ordenação usa data e ID para
  // garantir páginas consistentes.

  const registros =
    await db.orm.public.AuditoriaProntuario

      // Filtrar pelo médico.
      .where((r) =>
        medicoId !== undefined
          ? r.medicoId.eq(medicoId)
          : r.id.gt(0)
      )

      // Filtrar pelo tipo de operação.
      .where((r) =>
        acao !== undefined
          ? r.acao.eq(acao)
          : r.id.gt(0)
      )

      // Filtrar pelo resultado.
      .where((r) =>
        resultado !== undefined
          ? r.resultado.eq(resultado)
          : r.id.gt(0)
      )

      // Data inicial.
      .where((r) =>
        dataInicio !== null
          ? r.createdAt.gte(dataInicio)
          : r.id.gt(0)
      )

      // Data final.
      .where((r) =>
        dataFim !== null
          ? r.createdAt.lte(dataFim)
          : r.id.gt(0)
      )

      // Eventos mais recentes primeiro.
      .orderBy([
        (r) => r.createdAt.desc(),
        (r) => r.id.desc()
      ])

      // Pular os registros anteriores.
      .offset(offset)

      // Carregar somente 50.
      .limit(50)

      .all();

  // Os registros já estão filtrados,
  // ordenados e paginados pelo PostgreSQL.
  const filtrados = registros;


  // Retornar somente metadados.
  return filtrados.map(
    (item) => ({
      id: item.id,
      usuarioId: item.usuarioId,
      medicoId: item.medicoId,
      pacienteId: item.pacienteId,
      prontuarioId: item.prontuarioId,
      acao: item.acao,
      resultado: item.resultado,
      requisicaoId: item.requisicaoId,
      createdAt: item.createdAt
    })
  );
}


// ========================================
// LISTAR AUDITORIA DA AGENDA
// ========================================

// Consulta os eventos armazenados
// na tabela AuditoriaAgenda.
//
// Exemplos:
//
// CRIAR_DISPONIBILIDADE
// ALTERAR_DISPONIBILIDADE
// REMOVER_DISPONIBILIDADE

export async function listarAuditoriaAgenda(
  filtros: FiltrosAuditoria
) {

  // Buscar registros.
  // ========================================
  // AUDITORIA DE PRONTUÁRIOS PAGINADA
  // ========================================
  //
  // Os filtros são aplicados diretamente
  // no PostgreSQL.
  //
  // O banco retorna no máximo 50 registros
  // por página, preservando todo o histórico.
  //
  // Não são consultados dados clínicos,
  // apenas metadados da auditoria.

  // ========================================
  // VALIDAR PÁGINA
  // ========================================

  const pagina = filtros.pagina ?? 1;

  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1
  ) {
    throw new Error("Página inválida.");
  }

  const offset = (pagina - 1) * 50;

  if (!Number.isSafeInteger(offset)) {
    throw new Error("Página inválida.");
  }

  // ========================================
  // VALIDAR INTERVALO DE DATAS
  // ========================================

  const inicio = converterData(
    filtros.dataInicio,
    false
  );

  const fim = converterData(
    filtros.dataFim,
    true
  );

  if (
    inicio !== null &&
    fim !== null &&
    inicio > fim
  ) {
    throw new Error(
      "A data inicial não pode ser maior que a final."
    );
  }

  // Convertidos para o formato esperado
  // pela consulta PostgreSQL.
  const dataInicio = inicio === null
    ? null
    : new Date(inicio).toISOString();

  const dataFim = fim === null
    ? null
    : new Date(fim).toISOString();

  // ========================================
  // PREPARAR FILTROS OPCIONAIS
  // ========================================

  const medicoId = filtros.medicoId;
  const acao = filtros.acao;
  const resultado = filtros.resultado;

  // ========================================
  // CONSULTAR POSTGRESQL
  // ========================================
  //
  // Cada filtro é aplicado antes de LIMIT.
  //
  // Quando um filtro não foi informado,
  // a condição id > 0 mantém todos os
  // registros válidos.
  //
  // A ordenação usa data e ID para
  // garantir páginas consistentes.

  const registros =
    await db.orm.public.AuditoriaAgenda

      // Filtrar pelo médico.
      .where((r) =>
        medicoId !== undefined
          ? r.medicoId.eq(medicoId)
          : r.id.gt(0)
      )

      // Filtrar pelo tipo de operação.
      .where((r) =>
        acao !== undefined
          ? r.acao.eq(acao)
          : r.id.gt(0)
      )

      // Filtrar pelo resultado.
      .where((r) =>
        resultado !== undefined
          ? r.resultado.eq(resultado)
          : r.id.gt(0)
      )

      // Data inicial.
      .where((r) =>
        dataInicio !== null
          ? r.createdAt.gte(dataInicio)
          : r.id.gt(0)
      )

      // Data final.
      .where((r) =>
        dataFim !== null
          ? r.createdAt.lte(dataFim)
          : r.id.gt(0)
      )

      // Eventos mais recentes primeiro.
      .orderBy([
        (r) => r.createdAt.desc(),
        (r) => r.id.desc()
      ])

      // Pular os registros anteriores.
      .offset(offset)

      // Carregar somente 50.
      .limit(50)

      .all();

  // Os registros já estão filtrados,
  // ordenados e paginados pelo PostgreSQL.
  const filtrados = registros;


  // Retornar somente metadados.
  return filtrados.map(
    (item) => ({

      id: item.id,

      usuarioId: item.usuarioId,

      medicoId: item.medicoId,

      disponibilidadeId:
        item.disponibilidadeId,

      agendamentoId:
        item.agendamentoId,

      acao: item.acao,

      resultado: item.resultado,

      dataAgenda: item.dataAgenda,

      horaInicio: item.horaInicio,

      horaFim: item.horaFim,

      requisicaoId: item.requisicaoId,

      createdAt: item.createdAt
    })
  );
}


// ========================================
// LISTAR AUDITORIA DOS PACIENTES
// ========================================

// Consulta os registros da tabela
// AuditoriaPaciente.
//
// Inicialmente, o cadastro de pacientes
// gera o evento:
//
// CADASTRAR_PACIENTE
//
// Os registros identificam:
//
// - Usuário responsável;
// - Médico responsável;
// - Paciente afetado;
// - Ação executada;
// - Resultado;
// - Data e hora.
//
// Não retornamos nome, CPF, telefone,
// e-mail ou informações clínicas.

export async function listarAuditoriaPacientes(
  filtros: FiltrosAuditoria
) {

  // Buscar registros.
  // ========================================
  // AUDITORIA DE PRONTUÁRIOS PAGINADA
  // ========================================
  //
  // Os filtros são aplicados diretamente
  // no PostgreSQL.
  //
  // O banco retorna no máximo 50 registros
  // por página, preservando todo o histórico.
  //
  // Não são consultados dados clínicos,
  // apenas metadados da auditoria.

  // ========================================
  // VALIDAR PÁGINA
  // ========================================

  const pagina = filtros.pagina ?? 1;

  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1
  ) {
    throw new Error("Página inválida.");
  }

  const offset = (pagina - 1) * 50;

  if (!Number.isSafeInteger(offset)) {
    throw new Error("Página inválida.");
  }

  // ========================================
  // VALIDAR INTERVALO DE DATAS
  // ========================================

  const inicio = converterData(
    filtros.dataInicio,
    false
  );

  const fim = converterData(
    filtros.dataFim,
    true
  );

  if (
    inicio !== null &&
    fim !== null &&
    inicio > fim
  ) {
    throw new Error(
      "A data inicial não pode ser maior que a final."
    );
  }

  // Convertidos para o formato esperado
  // pela consulta PostgreSQL.
  const dataInicio = inicio === null
    ? null
    : new Date(inicio).toISOString();

  const dataFim = fim === null
    ? null
    : new Date(fim).toISOString();

  // ========================================
  // PREPARAR FILTROS OPCIONAIS
  // ========================================

  const medicoId = filtros.medicoId;
  const acao = filtros.acao;
  const resultado = filtros.resultado;

  // ========================================
  // CONSULTAR POSTGRESQL
  // ========================================
  //
  // Cada filtro é aplicado antes de LIMIT.
  //
  // Quando um filtro não foi informado,
  // a condição id > 0 mantém todos os
  // registros válidos.
  //
  // A ordenação usa data e ID para
  // garantir páginas consistentes.

  const registros =
    await db.orm.public.AuditoriaPaciente

      // Filtrar pelo médico.
      .where((r) =>
        medicoId !== undefined
          ? r.medicoId.eq(medicoId)
          : r.id.gt(0)
      )

      // Filtrar pelo tipo de operação.
      .where((r) =>
        acao !== undefined
          ? r.acao.eq(acao)
          : r.id.gt(0)
      )

      // Filtrar pelo resultado.
      .where((r) =>
        resultado !== undefined
          ? r.resultado.eq(resultado)
          : r.id.gt(0)
      )

      // Data inicial.
      .where((r) =>
        dataInicio !== null
          ? r.createdAt.gte(dataInicio)
          : r.id.gt(0)
      )

      // Data final.
      .where((r) =>
        dataFim !== null
          ? r.createdAt.lte(dataFim)
          : r.id.gt(0)
      )

      // Eventos mais recentes primeiro.
      .orderBy([
        (r) => r.createdAt.desc(),
        (r) => r.id.desc()
      ])

      // Pular os registros anteriores.
      .offset(offset)

      // Carregar somente 50.
      .limit(50)

      .all();

  // Os registros já estão filtrados,
  // ordenados e paginados pelo PostgreSQL.
  const filtrados = registros;


  // Retornar somente metadados.
  return filtrados.map(
    (item) => ({

      // Identificador do evento.
      id: item.id,

      // Usuário que cadastrou o paciente.
      usuarioId: item.usuarioId,

      // Médico responsável.
      medicoId: item.medicoId,

      // Paciente cadastrado.
      pacienteId: item.pacienteId,

      // Tipo de operação.
      acao: item.acao,

      // Resultado da operação.
      resultado: item.resultado,

      // Identificador opcional.
      requisicaoId: item.requisicaoId,

      // Data e hora do evento.
      createdAt: item.createdAt
    })
  );
}


// ========================================
// NOVO — LISTAR AUDITORIA DE LOGIN
// ========================================

/*
  Consulta os eventos armazenados
  na tabela AuditoriaLogin.

  Eventos disponíveis:

  LOGIN_SUCESSO
  LOGIN_FALHA
  LOGIN_BLOQUEADO
  LOGOUT

  Essa auditoria permite identificar:

  - Qual usuário realizou o login;
  - Qual perfil estava autenticado;
  - Quando ocorreu a operação;
  - Qual foi o resultado;
  - Qual IP originou a requisição.

  IMPORTANTE:

  Não retornamos senhas, JWTs,
  cookies ou códigos de recuperação.

  Nas tentativas malsucedidas, o
  usuarioId pode ser null porque a
  autenticação não foi concluída.
*/

export async function listarAuditoriaLogin(
  filtros: FiltrosAuditoria
) {

  // ========================================
  // BUSCAR REGISTROS
  // ========================================

  /*
    Diferentemente da auditoria
    de agenda e pacientes, a tabela
    AuditoriaLogin não possui medicoId.

    Isso acontece porque o login pode
    ser realizado por qualquer perfil:

    ADMIN
    MEDICO
    PACIENTE

    Portanto, consultamos os eventos
    de autenticação independentemente
    do filtro de médico.
  */

  // ========================================
  // CONSULTA OTIMIZADA — LOGIN E SEGURANÇA
  // ========================================
  //
  // Sem filtros, o PostgreSQL retorna
  // somente os 50 eventos mais recentes.
  //
  // Durante a implementação da paginação,
  // preservamos a consulta anterior quando
  // existem filtros, evitando resultados
  // incompletos.

  // ========================================
  // CONSULTA PAGINADA NO POSTGRESQL
  // ========================================
  // Os filtros são aplicados no banco
  // ANTES da ordenação e da paginação.
  //
  // Assim, mesmo com milhares de eventos,
  // somente 50 registros são carregados.

  const pagina = filtros.pagina ?? 1;

  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1
  ) {
    throw new Error("Página inválida.");
  }

  const offset = (pagina - 1) * 50;

  if (!Number.isSafeInteger(offset)) {
    throw new Error("Página inválida.");
  }

  // Preserva a interpretação de datas
  // utilizada anteriormente no sistema.
  const inicio = converterData(
    filtros.dataInicio,
    false
  );

  const fim = converterData(
    filtros.dataFim,
    true
  );

  if (
    inicio !== null &&
    fim !== null &&
    inicio > fim
  ) {
    throw new Error(
      "A data inicial não pode ser maior que a final."
    );
  }

  const dataInicio = inicio === null
    ? null
    : new Date(inicio).toISOString();

  const dataFim = fim === null
    ? null
    : new Date(fim).toISOString();

  const acao = filtros.acao;
  const resultado = filtros.resultado;

  // Os filtros opcionais utilizam uma
  // condição verdadeira quando ausentes.
  //
  // Nenhuma consulta irrestrita é feita:
  // o LIMIT sempre é aplicado no banco.
  const registros =
    await db.orm.public.AuditoriaLogin

      .where((r) =>
        acao !== undefined
          ? r.acao.eq(acao)
          : r.id.gt(0)
      )

      .where((r) =>
        resultado !== undefined
          ? r.resultado.eq(resultado)
          : r.id.gt(0)
      )

      .where((r) =>
        dataInicio !== null
          ? r.createdAt.gte(dataInicio)
          : r.id.gt(0)
      )

      .where((r) =>
        dataFim !== null
          ? r.createdAt.lte(dataFim)
          : r.id.gt(0)
      )

      .orderBy([
        (r) => r.createdAt.desc(),
        (r) => r.id.desc()
      ])

      .offset(offset)
      .limit(50)
      .all();


  // ========================================
  // FILTRAR E ORDENAR
  // ========================================

  /*
    Reutilizamos o processamento
    compartilhado de auditoria.

    Filtros aplicáveis:

    - Ação;
    - Resultado;
    - Data inicial;
    - Data final.

    Os registros mais recentes ficam
    no início da lista.

    O retorno permanece limitado
    a 100 eventos.
  */

  // Os registros já chegam filtrados,
  // ordenados e paginados do PostgreSQL.
  const filtrados = registros;


  // ========================================
  // IDENTIFICAR USUÁRIOS DOS EVENTOS
  // ========================================

  // Reúne somente os IDs conhecidos nos
  // até 100 eventos retornados.
  //
  // Eventos com falha de login geralmente
  // não possuem usuarioId.
  //
  // Uma conta excluída não impede que
  // seu evento continue no histórico.

  const usuarioIds = [
    ...new Set(
      filtrados
        .map((item) => item.usuarioId)
        .filter((id): id is number => id !== null)
    )
  ];

  // Busca os nomes sem consultar a senha
  // ou retornar dados particulares.
  // Um ID repetido é consultado uma vez.
  const usuarios = await Promise.all(
    usuarioIds.map(async (id) => {
      const usuario = await db.orm.public.Usuario
        .where({ id })
        .first();

      return {
        id,
        nome: usuario?.nome ?? null
      };
    })
  );

  const nomesUsuarios = new Map(
    usuarios.map((usuario) => [
      usuario.id,
      usuario.nome
    ])
  );

  // ========================================
  // RETORNAR METADADOS DA AUDITORIA
  // ========================================

  // usuarioNome será null quando não
  // houver identificação ou quando a
  // conta não existir mais.
  // Senhas, e-mails e tokens não são
  // enviados ao administrador.

  return filtrados.map(
    (item) => ({
      id: item.id,
      usuarioId: item.usuarioId,
      usuarioNome: item.usuarioId !== null
        ? nomesUsuarios.get(item.usuarioId) ?? null
        : null,
      perfil: item.perfil,
      acao: item.acao,
      resultado: item.resultado,
      ip: item.ip,
      requisicaoId: item.requisicaoId,
      createdAt: item.createdAt
    })
  );

}



// ========================================
// CONTADORES DA AUDITORIA DE LOGIN
// ========================================

// Calcula os totais diretamente no banco.
//
// Não carrega todos os logs na memória.
// Os filtros são iguais aos da listagem.
//
// O parâmetro pagina não é utilizado:
// a contagem representa todas as páginas.

export async function contarAuditoriaLogin(
  filtros: FiltrosAuditoria
) {

  // Validar período utilizando as mesmas
  // regras da listagem de auditoria.
  const inicio = converterData(
    filtros.dataInicio,
    false
  );

  const fim = converterData(
    filtros.dataFim,
    true
  );

  if (
    inicio !== null &&
    fim !== null &&
    inicio > fim
  ) {
    throw new Error(
      "A data inicial não pode ser maior que a final."
    );
  }

  const dataInicio = inicio === null
    ? null
    : new Date(inicio).toISOString();

  const dataFim = fim === null
    ? null
    : new Date(fim).toISOString();

  const acao = filtros.acao;
  const resultado = filtros.resultado;

  // Executa uma contagem aplicando os filtros
  // no PostgreSQL, antes da agregação.
  async function contar(
    tipo: "TODOS" | "SUCESSO" | "FALHA"
  ): Promise<number> {

    const consulta = db.orm.public.AuditoriaLogin
      .where((r) =>
        acao !== undefined
          ? r.acao.eq(acao)
          : r.id.gt(0)
      )
      .where((r) =>
        resultado !== undefined
          ? r.resultado.eq(resultado)
          : r.id.gt(0)
      )
      .where((r) =>
        dataInicio !== null
          ? r.createdAt.gte(dataInicio)
          : r.id.gt(0)
      )
      .where((r) =>
        dataFim !== null
          ? r.createdAt.lte(dataFim)
          : r.id.gt(0)
      )
      .where((r) =>
        tipo === "TODOS"
          ? r.id.gt(0)
          : r.resultado.eq(tipo)
      );

    const resposta = await consulta.aggregate(
      (a) => ({
        total: a.count()
      })
    );

    return resposta.total;
  }

  // Todos os contadores respeitam os filtros
  // selecionados pelo administrador.
  const [total, sucessos, falhas] =
    await Promise.all([
      contar("TODOS"),
      contar("SUCESSO"),
      contar("FALHA")
    ]);

  return {
    total,
    sucessos,
    falhas
  };
}


// ========================================
// CONTADORES DE PRONTUÁRIOS
// ========================================

export async function contarAuditoriaProntuarios(
  filtros: FiltrosAuditoria
) {

  // Validar período utilizando as mesmas
  // regras da listagem de auditoria.
  const inicio = converterData(
    filtros.dataInicio,
    false
  );

  const fim = converterData(
    filtros.dataFim,
    true
  );

  if (
    inicio !== null &&
    fim !== null &&
    inicio > fim
  ) {
    throw new Error(
      "A data inicial não pode ser maior que a final."
    );
  }

  const dataInicio = inicio === null
    ? null
    : new Date(inicio).toISOString();

  const dataFim = fim === null
    ? null
    : new Date(fim).toISOString();

  const acao = filtros.acao;
  const resultado = filtros.resultado;

  // Filtra pelo médico selecionado.
  const medicoId = filtros.medicoId;

  // Executa uma contagem aplicando os filtros
  // no PostgreSQL, antes da agregação.
  async function contar(
    tipo: "TODOS" | "SUCESSO" | "FALHA"
  ): Promise<number> {

    const consulta = db.orm.public.AuditoriaProntuario
      .where((r) =>
        medicoId !== undefined
          ? r.medicoId.eq(medicoId)
          : r.id.gt(0)
      )
      .where((r) =>
        acao !== undefined
          ? r.acao.eq(acao)
          : r.id.gt(0)
      )
      .where((r) =>
        resultado !== undefined
          ? r.resultado.eq(resultado)
          : r.id.gt(0)
      )
      .where((r) =>
        dataInicio !== null
          ? r.createdAt.gte(dataInicio)
          : r.id.gt(0)
      )
      .where((r) =>
        dataFim !== null
          ? r.createdAt.lte(dataFim)
          : r.id.gt(0)
      )
      .where((r) =>
        tipo === "TODOS"
          ? r.id.gt(0)
          : r.resultado.eq(tipo)
      );

    const resposta = await consulta.aggregate(
      (a) => ({
        total: a.count()
      })
    );

    return resposta.total;
  }

  // Todos os contadores respeitam os filtros
  // selecionados pelo administrador.
  const [total, sucessos, falhas] =
    await Promise.all([
      contar("TODOS"),
      contar("SUCESSO"),
      contar("FALHA")
    ]);

  return {
    total,
    sucessos,
    falhas
  };
}


// ========================================
// CONTADORES DE AGENDA
// ========================================

export async function contarAuditoriaAgenda(
  filtros: FiltrosAuditoria
) {

  // Validar período utilizando as mesmas
  // regras da listagem de auditoria.
  const inicio = converterData(
    filtros.dataInicio,
    false
  );

  const fim = converterData(
    filtros.dataFim,
    true
  );

  if (
    inicio !== null &&
    fim !== null &&
    inicio > fim
  ) {
    throw new Error(
      "A data inicial não pode ser maior que a final."
    );
  }

  const dataInicio = inicio === null
    ? null
    : new Date(inicio).toISOString();

  const dataFim = fim === null
    ? null
    : new Date(fim).toISOString();

  const acao = filtros.acao;
  const resultado = filtros.resultado;

  // Filtra pelo médico selecionado.
  const medicoId = filtros.medicoId;

  // Executa uma contagem aplicando os filtros
  // no PostgreSQL, antes da agregação.
  async function contar(
    tipo: "TODOS" | "SUCESSO" | "FALHA"
  ): Promise<number> {

    const consulta = db.orm.public.AuditoriaAgenda
      .where((r) =>
        medicoId !== undefined
          ? r.medicoId.eq(medicoId)
          : r.id.gt(0)
      )
      .where((r) =>
        acao !== undefined
          ? r.acao.eq(acao)
          : r.id.gt(0)
      )
      .where((r) =>
        resultado !== undefined
          ? r.resultado.eq(resultado)
          : r.id.gt(0)
      )
      .where((r) =>
        dataInicio !== null
          ? r.createdAt.gte(dataInicio)
          : r.id.gt(0)
      )
      .where((r) =>
        dataFim !== null
          ? r.createdAt.lte(dataFim)
          : r.id.gt(0)
      )
      .where((r) =>
        tipo === "TODOS"
          ? r.id.gt(0)
          : r.resultado.eq(tipo)
      );

    const resposta = await consulta.aggregate(
      (a) => ({
        total: a.count()
      })
    );

    return resposta.total;
  }

  // Todos os contadores respeitam os filtros
  // selecionados pelo administrador.
  const [total, sucessos, falhas] =
    await Promise.all([
      contar("TODOS"),
      contar("SUCESSO"),
      contar("FALHA")
    ]);

  return {
    total,
    sucessos,
    falhas
  };
}


// ========================================
// CONTADORES DE PACIENTES
// ========================================

export async function contarAuditoriaPacientes(
  filtros: FiltrosAuditoria
) {

  // Validar período utilizando as mesmas
  // regras da listagem de auditoria.
  const inicio = converterData(
    filtros.dataInicio,
    false
  );

  const fim = converterData(
    filtros.dataFim,
    true
  );

  if (
    inicio !== null &&
    fim !== null &&
    inicio > fim
  ) {
    throw new Error(
      "A data inicial não pode ser maior que a final."
    );
  }

  const dataInicio = inicio === null
    ? null
    : new Date(inicio).toISOString();

  const dataFim = fim === null
    ? null
    : new Date(fim).toISOString();

  const acao = filtros.acao;
  const resultado = filtros.resultado;

  // Filtra pelo médico selecionado.
  const medicoId = filtros.medicoId;

  // Executa uma contagem aplicando os filtros
  // no PostgreSQL, antes da agregação.
  async function contar(
    tipo: "TODOS" | "SUCESSO" | "FALHA"
  ): Promise<number> {

    const consulta = db.orm.public.AuditoriaPaciente
      .where((r) =>
        medicoId !== undefined
          ? r.medicoId.eq(medicoId)
          : r.id.gt(0)
      )
      .where((r) =>
        acao !== undefined
          ? r.acao.eq(acao)
          : r.id.gt(0)
      )
      .where((r) =>
        resultado !== undefined
          ? r.resultado.eq(resultado)
          : r.id.gt(0)
      )
      .where((r) =>
        dataInicio !== null
          ? r.createdAt.gte(dataInicio)
          : r.id.gt(0)
      )
      .where((r) =>
        dataFim !== null
          ? r.createdAt.lte(dataFim)
          : r.id.gt(0)
      )
      .where((r) =>
        tipo === "TODOS"
          ? r.id.gt(0)
          : r.resultado.eq(tipo)
      );

    const resposta = await consulta.aggregate(
      (a) => ({
        total: a.count()
      })
    );

    return resposta.total;
  }

  // Todos os contadores respeitam os filtros
  // selecionados pelo administrador.
  const [total, sucessos, falhas] =
    await Promise.all([
      contar("TODOS"),
      contar("SUCESSO"),
      contar("FALHA")
    ]);

  return {
    total,
    sucessos,
    falhas
  };
}
