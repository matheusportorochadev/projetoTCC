// ========================================
// ROTAS DE AGENDA
// ========================================

import {
  Router
} from "express";


// ========================================
// CONTROLLERS
// ========================================

import {
  criarDisponibilidadeController,
  editarDisponibilidadeController,
  listarDisponibilidadesController,
  removerDisponibilidadeController
} from "../controllers/agenda.controller";


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
  validarParams
} from "../middlewares/validar.middleware";


// ========================================
// SCHEMAS
// ========================================

import {
  idParamsSchema
} from "../schemas/comum.schema";

import {
  criarDisponibilidadeSchema,
  editarDisponibilidadeSchema
} from "../schemas/agenda.schema";


// ========================================
// ROUTER
// ========================================

const router =
  Router();


// ========================================
// LISTAR DISPONIBILIDADES
// ========================================

router.get(
  "/disponibilidades",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  listarDisponibilidadesController
);


// ========================================
// CRIAR DISPONIBILIDADES
// ========================================

router.post(
  "/disponibilidades",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  validarBody(
    criarDisponibilidadeSchema
  ),

  criarDisponibilidadeController
);


// ========================================
// EDITAR DISPONIBILIDADE
// ========================================

router.put(
  "/disponibilidades/:id",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  validarParams(
    idParamsSchema
  ),

  validarBody(
    editarDisponibilidadeSchema
  ),

  editarDisponibilidadeController
);


// ========================================
// REMOVER DISPONIBILIDADE
// ========================================

router.delete(
  "/disponibilidades/:id",

  authMiddleware,

  permitirPerfis(
    "MEDICO"
  ),

  validarParams(
    idParamsSchema
  ),

  removerDisponibilidadeController
);


// ========================================
// EXPORTAÇÃO
// ========================================

export default router;
