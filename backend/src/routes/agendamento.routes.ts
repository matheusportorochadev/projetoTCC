// ========================================
// IMPORTAÇÕES
// ========================================

import { Router } from "express";

import {
  agendarConsulta,
  agendamentosMedico,
  cancelarAgendamentoController,
  confirmarAgendamentoController,
  horariosDisponiveis,
  meusAgendamentos,
  recusarAgendamentoController,
  remarcarAgendamentoController
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
// Retorna os horários livres
// de determinada data.
//
// Exemplo:
//
// GET
// /agendamentos/horarios-disponiveis
// ?data=2026-09-18
//
// O paciente NÃO informa medicoId.
//
// O backend descobre o médico através
// do próprio paciente autenticado.
router.get(
  "/horarios-disponiveis",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  horariosDisponiveis
);


// ----------------------------------------
// CRIAR SOLICITAÇÃO
// ----------------------------------------
//
// O paciente solicita um horário.
//
// Exemplo:
//
// POST /agendamentos
//
// Body:
//
// {
//   "data": "2026-09-18",
//   "horaInicio": "08:30"
// }
//
// O backend cria:
//
// status = PENDENTE
//
// Portanto, neste momento a consulta
// ainda depende da decisão do médico.
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
// Retorna somente os agendamentos
// pertencentes ao paciente autenticado.
//
// GET /agendamentos/meus
router.get(
  "/meus",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  meusAgendamentos
);


// ========================================
// ROTAS DO MÉDICO
// ========================================


// ----------------------------------------
// LISTAR AGENDAMENTOS DO MÉDICO
// ----------------------------------------
//
// Retorna os agendamentos relacionados
// ao médico autenticado.
//
// GET /agendamentos/medico
//
// Essa rota alimenta a aba:
//
// "Horários marcados"
router.get(
  "/medico",
  authMiddleware,
  permitirPerfis("MEDICO"),
  agendamentosMedico
);


// ----------------------------------------
// CONFIRMAR AGENDAMENTO
// ----------------------------------------
//
// Fluxo:
//
// PENDENTE
//    ↓
// CONFIRMADA
//
// PATCH
// /agendamentos/:id/confirmar
//
// Exemplo:
//
// /agendamentos/15/confirmar
router.patch(
  "/:id/confirmar",
  authMiddleware,
  permitirPerfis("MEDICO"),
  confirmarAgendamentoController
);


// ----------------------------------------
// RECUSAR AGENDAMENTO
// ----------------------------------------
//
// Fluxo:
//
// PENDENTE
//    ↓
// RECUSADA
//
// Quando recusado,
// o slot volta a ficar disponível.
//
// PATCH
// /agendamentos/:id/recusar
router.patch(
  "/:id/recusar",
  authMiddleware,
  permitirPerfis("MEDICO"),
  recusarAgendamentoController
);


// ----------------------------------------
// CANCELAR / DESMARCAR
// ----------------------------------------
//
// Fluxo:
//
// CONFIRMADA
//     ↓
// CANCELADA
//
// Depois do cancelamento,
// o horário volta a ficar disponível.
//
// PATCH
// /agendamentos/:id/cancelar
router.patch(
  "/:id/cancelar",
  authMiddleware,
  permitirPerfis("MEDICO"),
  cancelarAgendamentoController
);


// ----------------------------------------
// REMARCAR
// ----------------------------------------
//
// Permite alterar a data e o horário
// de um agendamento.
//
// PATCH
// /agendamentos/:id/remarcar
//
// Body:
//
// {
//   "data": "2026-09-20",
//   "horaInicio": "10:00"
// }
//
// O horaFim NÃO é enviado pelo frontend.
//
// O backend busca o slot verdadeiro
// e determina o horaFim.
//
// Podem ser remarcados:
//
// PENDENTE
// CONFIRMADA
//
// AGENDADA também é aceita
// temporariamente por compatibilidade
// com registros antigos.
router.patch(
  "/:id/remarcar",
  authMiddleware,
  permitirPerfis("MEDICO"),
  remarcarAgendamentoController
);


// ========================================
// EXPORTAÇÃO
// ========================================

export default router;