// ========================================
// IMPORTAÇÕES
// ========================================

import { Router } from "express";

import {
  agendarConsulta,
  agendamentosMedico,
  horariosDisponiveis,
  meusAgendamentos
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

// Lista horários disponíveis de uma data
router.get(
  "/horarios-disponiveis",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  horariosDisponiveis
);


// Cria um novo agendamento
router.post(
  "/",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  agendarConsulta
);


// Lista os agendamentos do paciente
router.get(
  "/meus",
  authMiddleware,
  permitirPerfis("PACIENTE"),
  meusAgendamentos
);


// ========================================
// ROTAS DO MÉDICO
// ========================================

// Lista os agendamentos do médico
router.get(
  "/medico",
  authMiddleware,
  permitirPerfis("MEDICO"),
  agendamentosMedico
);


// ========================================
// EXPORTAÇÃO
// ========================================

export default router;
