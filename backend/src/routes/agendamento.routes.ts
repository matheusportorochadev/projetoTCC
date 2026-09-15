// ========================================
// IMPORTAÇÕES
// ========================================

import { Router } from "express";

import {
  aceitarRemarcacaoController,
  agendarConsulta,
  agendamentosMedico,
  cancelarAgendamentoController,
  cancelarMeuAgendamentoController,
  confirmarAgendamentoController,
  criarAgendamentoPeloMedicoController,
  excluirAgendamentoController,
  horariosDisponiveis,
  minhasRemarcacoesController,
  meusAgendamentos,
  recusarAgendamentoController,
  recusarRemarcacaoController,
  remarcarAgendamentoController,
  remarcacoesPendentesMedicoController,
  solicitarRemarcacaoController,
  visualizarRemarcacaoController
} from "../controllers/agendamento.controller";

import {
  authMiddleware
} from "../middlewares/auth.middleware";

import {
  permitirPerfis
} from "../middlewares/role.middleware";


// ========================================
// ROUTER
// ========================================

const router = Router();


// ========================================
// ROTAS DO PACIENTE
// ========================================


// ----------------------------------------
// HORÁRIOS DISPONÍVEIS
// ----------------------------------------
//
// GET:
// /agendamentos/horarios-disponiveis
//
// Exemplo:
//
// /agendamentos/horarios-disponiveis
// ?data=2026-09-18
//
// O paciente não informa medicoId.
//
// O backend identifica o médico através
// do próprio cadastro do paciente.

router.get(
  "/horarios-disponiveis",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  horariosDisponiveis
);


// ----------------------------------------
// CRIAR SOLICITAÇÃO DE AGENDAMENTO
// ----------------------------------------
//
// POST:
// /agendamentos
//
// Body:
//
// {
//   "data": "2026-09-18",
//   "horaInicio": "08:30"
// }
//
// O novo agendamento solicitado pelo
// paciente nasce:
//
// status = PENDENTE
//
// Depois o médico decide:
//
// PENDENTE
//    ↓
// CONFIRMADA
//
// ou:
//
// PENDENTE
//    ↓
// RECUSADA

router.post(
  "/",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  agendarConsulta
);


// ----------------------------------------
// MEUS AGENDAMENTOS
// ----------------------------------------
//
// GET:
// /agendamentos/meus
//
// Retorna somente os agendamentos
// pertencentes ao paciente autenticado.

router.get(
  "/meus",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  meusAgendamentos
);


// ----------------------------------------
// CANCELAR MEU AGENDAMENTO
// ----------------------------------------
//
// PATCH:
// /agendamentos/:id/cancelar-paciente
//
// Exemplo:
//
// /agendamentos/15/cancelar-paciente
//
// O paciente pode cancelar:
//
// PENDENTE
// CONFIRMADA
// AGENDADA (legado)
//
// Se existir uma remarcação pendente
// relacionada à consulta, ela também
// deixa de permanecer pendente.

router.patch(
  "/:id/cancelar-paciente",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  cancelarMeuAgendamentoController
);


// ----------------------------------------
// SOLICITAR REMARCAÇÃO
// ----------------------------------------
//
// POST:
// /agendamentos/:id/remarcacoes
//
// Exemplo:
//
// /agendamentos/15/remarcacoes
//
// Body:
//
// {
//   "data": "2026-09-20",
//   "horaInicio": "10:00"
// }
//
// IMPORTANTE:
//
// Esta rota NÃO altera imediatamente
// o Agendamento.
//
// Ela cria:
//
// RemarcacaoAgendamento
//
// status = PENDENTE
//
// A consulta original continua no
// horário atual enquanto o médico
// não responder.

router.post(
  "/:id/remarcacoes",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  solicitarRemarcacaoController
);


// ----------------------------------------
// MINHAS REMARCAÇÕES
// ----------------------------------------
//
// GET:
// /agendamentos/remarcacoes/minhas
//
// Retorna o histórico de solicitações
// de remarcação do paciente:
//
// PENDENTE
// ACEITA
// RECUSADA

router.get(
  "/remarcacoes/minhas",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  minhasRemarcacoesController
);


// ----------------------------------------
// MARCAR RESPOSTA COMO VISUALIZADA
// ----------------------------------------
//
// PATCH:
// /agendamentos/remarcacoes/:id/visualizar
//
// Utilizada quando o paciente recebe:
//
// "Sua remarcação foi aceita"
//
// ou:
//
// "Sua remarcação foi recusada"
//
// e clica em:
//
// "Entendi"
//
// O registro continua no histórico.
//
// Apenas:
//
// visualizadoPaciente = true

router.patch(
  "/remarcacoes/:id/visualizar",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  visualizarRemarcacaoController
);


// ========================================
// ROTAS DO MÉDICO
// ========================================


// ----------------------------------------
// LISTAR AGENDAMENTOS DO MÉDICO
// ----------------------------------------
//
// GET:
// /agendamentos/medico
//
// Alimenta a área de consultas
// da agenda do médico.

router.get(
  "/medico",
  authMiddleware,
  permitirPerfis("MEDICO"),
  agendamentosMedico
);


// ----------------------------------------
// CRIAR CONSULTA DIRETAMENTE PELO MÉDICO
// ----------------------------------------
//
// POST:
// /agendamentos/medico
//
// Body:
//
// {
//   "pacienteId": 15,
//   "data": "2026-09-20",
//   "horaInicio": "14:30",
//   "duracaoConsulta": 30
// }
//
// IMPORTANTE:
//
// Esta rota NÃO depende de:
//
// DisponibilidadeAgenda
//
// A médica pode escolher diretamente:
//
// - paciente;
// - data;
// - horário;
// - duração.
//
// O backend verifica se já existe alguma
// consulta ocupando o período.
//
// Também verifica se existe alguma
// solicitação de remarcação pendente
// reservando o mesmo período.
//
// Se estiver livre:
//
// Agendamento
//     ↓
// status = CONFIRMADA
//
// Não existe uma segunda confirmação,
// pois foi a própria médica quem criou
// a consulta.

router.post(
  "/medico",
  authMiddleware,
  permitirPerfis("MEDICO"),
  criarAgendamentoPeloMedicoController
);


// ----------------------------------------
// CONFIRMAR NOVO AGENDAMENTO
// ----------------------------------------
//
// PATCH:
// /agendamentos/:id/confirmar
//
// Utilizado quando o agendamento foi
// solicitado pelo paciente.
//
// Fluxo:
//
// PENDENTE
//    ↓
// CONFIRMADA

router.patch(
  "/:id/confirmar",
  authMiddleware,
  permitirPerfis("MEDICO"),
  confirmarAgendamentoController
);


// ----------------------------------------
// RECUSAR NOVO AGENDAMENTO
// ----------------------------------------
//
// PATCH:
// /agendamentos/:id/recusar
//
// Fluxo:
//
// PENDENTE
//    ↓
// RECUSADA
//
// O horário volta a ficar disponível.

router.patch(
  "/:id/recusar",
  authMiddleware,
  permitirPerfis("MEDICO"),
  recusarAgendamentoController
);


// ----------------------------------------
// CANCELAR CONSULTA PELO MÉDICO
// ----------------------------------------
//
// PATCH:
// /agendamentos/:id/cancelar
//
// IMPORTANTE:
//
// Cancelar NÃO exclui o registro.
//
// Fluxo:
//
// CONFIRMADA
//     ↓
// CANCELADA
//
// O registro continua no banco.
//
// O horário deixa de ser considerado
// ocupado.

router.patch(
  "/:id/cancelar",
  authMiddleware,
  permitirPerfis("MEDICO"),
  cancelarAgendamentoController
);


// ----------------------------------------
// REMARCAR CONSULTA DIRETAMENTE PELO MÉDICO
// ----------------------------------------
//
// PATCH:
// /agendamentos/:id/remarcar
//
// Exemplo:
//
// PATCH /agendamentos/15/remarcar
//
// Body:
//
// {
//   "data": "2026-09-22",
//   "horaInicio": "09:30"
// }
//
// Este fluxo é diferente da solicitação
// de remarcação feita pelo paciente.
//
// Aqui é a própria médica quem está
// alterando a consulta.
//
// Por isso:
//
// - não cria RemarcacaoAgendamento;
// - não fica aguardando aprovação;
// - a alteração acontece imediatamente;
// - o Agendamento continua CONFIRMADA.
//
// Para este fluxo de remarcação direta,
// o horário escolhido deve pertencer
// às disponibilidades configuradas.
//
// O backend também:
//
// - ignora a própria consulta na
//   verificação de conflito;
//
// - verifica outras consultas;
//
// - verifica remarcações pendentes;
//
// - impede remarcação direta caso exista
//   solicitação de remarcação pendente
//   para a própria consulta.

router.patch(
  "/:id/remarcar",
  authMiddleware,
  permitirPerfis("MEDICO"),
  remarcarAgendamentoController
);


// ----------------------------------------
// EXCLUIR CONSULTA DEFINITIVAMENTE
// ----------------------------------------
//
// DELETE:
// /agendamentos/:id
//
// Exemplo:
//
// DELETE /agendamentos/15
//
// ATENÇÃO:
//
// Esta operação é diferente de cancelar.
//
// CANCELAR:
//
// Agendamento continua no banco:
//
// status = CANCELADA
//
// EXCLUIR:
//
// Agendamento é removido definitivamente.
//
// As RemarcacaoAgendamento relacionadas
// também são removidas pelo service.
//
// No frontend essa rota será chamada
// somente depois que o médico confirmar
// a exclusão através de um modal próprio.

router.delete(
  "/:id",
  authMiddleware,
  permitirPerfis("MEDICO"),
  excluirAgendamentoController
);


// ========================================
// REMARCAÇÕES — MÉDICO
// ========================================


// ----------------------------------------
// LISTAR REMARCAÇÕES PENDENTES
// ----------------------------------------
//
// GET:
// /agendamentos/remarcacoes/pendentes
//
// Retorna as solicitações feitas
// pelos pacientes que ainda aguardam
// uma decisão do médico.

router.get(
  "/remarcacoes/pendentes",
  authMiddleware,
  permitirPerfis("MEDICO"),
  remarcacoesPendentesMedicoController
);


// ----------------------------------------
// ACEITAR REMARCAÇÃO
// ----------------------------------------
//
// PATCH:
// /agendamentos/remarcacoes/:id/aceitar
//
// Quando o médico aceita:
//
// RemarcacaoAgendamento
//
// PENDENTE
//    ↓
// ACEITA
//
// E somente neste momento:
//
// Agendamento
//    ↓
// recebe nova data
// recebe nova horaInicio
// recebe nova horaFim
// status = CONFIRMADA

router.patch(
  "/remarcacoes/:id/aceitar",
  authMiddleware,
  permitirPerfis("MEDICO"),
  aceitarRemarcacaoController
);


// ----------------------------------------
// RECUSAR REMARCAÇÃO
// ----------------------------------------
//
// PATCH:
// /agendamentos/remarcacoes/:id/recusar
//
// Quando o médico recusa:
//
// RemarcacaoAgendamento
//
// PENDENTE
//    ↓
// RECUSADA
//
// O Agendamento original NÃO muda.
//
// Portanto, a consulta continua na
// data e horário que já possuía.
//
// O horário solicitado na remarcação
// volta a ficar livre.

router.patch(
  "/remarcacoes/:id/recusar",
  authMiddleware,
  permitirPerfis("MEDICO"),
  recusarRemarcacaoController
);


// ========================================
// EXPORTAÇÃO
// ========================================

export default router;