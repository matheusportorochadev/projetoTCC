// ========================================
// ROTAS DE AGENDAMENTOS
// ========================================

import {
  Router
} from "express";


// ========================================
// CONTROLLERS
// ========================================

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


// ========================================
// MIDDLEWARES
// ========================================

import {
  authMiddleware
} from "../middlewares/auth.middleware";

import {
  permitirPerfis
} from "../middlewares/role.middleware";

import {
  validarBody,
  validarParams,
  validarQuery
} from "../middlewares/validar.middleware";


// ========================================
// SCHEMAS
// ========================================

import {
  idParamsSchema
} from "../schemas/comum.schema";

import {
  criarAgendamentoMedicoSchema,
  criarAgendamentoPacienteSchema,
  horariosDisponiveisQuerySchema,
  remarcarAgendamentoMedicoSchema,
  solicitarRemarcacaoSchema
} from "../schemas/agendamento.schema";


// ========================================
// ROUTER
// ========================================

const router =
  Router();


// ========================================
// PACIENTE
// ========================================


// ========================================
// HORÁRIOS DISPONÍVEIS
// ========================================

router.get(
  "/horarios-disponiveis",

  authMiddleware,

  permitirPerfis(
    "PACIENTE"
  ),

  validarQuery(
    horariosDisponiveisQuerySchema
  ),

  horariosDisponiveis
);


// ========================================
// CRIAR SOLICITAÇÃO
// ========================================

router.post(
  "/",

  authMiddleware,

  permitirPerfis(
    "PACIENTE"
  ),

  validarBody(
    criarAgendamentoPacienteSchema
  ),

  agendarConsulta
);


// ========================================
// MEUS AGENDAMENTOS
// ========================================

router.get(
  "/meus",

  authMiddleware,

  permitirPerfis(
    "PACIENTE"
  ),

  meusAgendamentos
);


// ========================================
// CANCELAR PELO PACIENTE
// ========================================

router.patch(
  "/:id/cancelar-paciente",

  authMiddleware,

  permitirPerfis(
    "PACIENTE"
  ),

  validarParams(
    idParamsSchema
  ),

  cancelarMeuAgendamentoController
);


// ========================================
// SOLICITAR REMARCAÇÃO
// ========================================

router.post(
  "/:id/remarcacoes",

  authMiddleware,

  permitirPerfis(
    "PACIENTE"
  ),

  validarParams(
    idParamsSchema
  ),

  validarBody(
    solicitarRemarcacaoSchema
  ),

  solicitarRemarcacaoController
);


// ========================================
// MINHAS REMARCAÇÕES
// ========================================

router.get(
  "/remarcacoes/minhas",

  authMiddleware,

  permitirPerfis(
    "PACIENTE"
  ),

  minhasRemarcacoesController
);


// ========================================
// VISUALIZAR RESPOSTA
// ========================================

router.patch(
  "/remarcacoes/:id/visualizar",

  authMiddleware,

  permitirPerfis(
    "PACIENTE"
  ),

  validarParams(
    idParamsSchema
  ),

  visualizarRemarcacaoController
);


// ========================================
// MÉDICO
// ========================================


// ========================================
// LISTAR AGENDAMENTOS
// ========================================

router.get(
  "/medico",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  agendamentosMedico
);


// ========================================
// CRIAR CONSULTA PELO MÉDICO
// ========================================

router.post(
  "/medico",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  validarBody(
    criarAgendamentoMedicoSchema
  ),

  criarAgendamentoPeloMedicoController
);


// ========================================
// CONFIRMAR
// ========================================

router.patch(
  "/:id/confirmar",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  validarParams(
    idParamsSchema
  ),

  confirmarAgendamentoController
);


// ========================================
// RECUSAR
// ========================================

router.patch(
  "/:id/recusar",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  validarParams(
    idParamsSchema
  ),

  recusarAgendamentoController
);


// ========================================
// CANCELAR
// ========================================

router.patch(
  "/:id/cancelar",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  validarParams(
    idParamsSchema
  ),

  cancelarAgendamentoController
);


// ========================================
// REMARCAR DIRETAMENTE
// ========================================

router.patch(
  "/:id/remarcar",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  validarParams(
    idParamsSchema
  ),

  validarBody(
    remarcarAgendamentoMedicoSchema
  ),

  remarcarAgendamentoController
);


// ========================================
// EXCLUIR
// ========================================

router.delete(
  "/:id",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  validarParams(
    idParamsSchema
  ),

  excluirAgendamentoController
);


// ========================================
// REMARCAÇÕES — MÉDICO
// ========================================


// ========================================
// LISTAR PENDENTES
// ========================================

router.get(
  "/remarcacoes/pendentes",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  remarcacoesPendentesMedicoController
);


// ========================================
// ACEITAR
// ========================================

router.patch(
  "/remarcacoes/:id/aceitar",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  validarParams(
    idParamsSchema
  ),

  aceitarRemarcacaoController
);


// ========================================
// RECUSAR
// ========================================

router.patch(
  "/remarcacoes/:id/recusar",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  validarParams(
    idParamsSchema
  ),

  recusarRemarcacaoController
);


// ========================================
// EXPORTAÇÃO
// ========================================

export default router;
