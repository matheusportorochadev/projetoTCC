// ========================================
// ROTAS DE MÉDICOS
// ========================================

import {
  Router
} from "express";


// ========================================
// CONTROLLERS
// ========================================

import {
  criarMedicoController,
  listarMedicosController,
  buscarMedicoPorIdController,
  atualizarStatusMedicoController,
  excluirMedicoController
} from "../controllers/medico.controller";


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
  criarMedicoSchema,
  statusMedicoSchema
} from "../schemas/medico.schema";


// ========================================
// ROUTER
// ========================================

const medicoRoutes =
  Router();


// ========================================
// LISTAR MÉDICOS
// ========================================

medicoRoutes.get(
  "/",

  authMiddleware,

  permitirPerfis(
    "ADMIN"
  ),

  listarMedicosController
);


// ========================================
// BUSCAR MÉDICO
// ========================================

medicoRoutes.get(
  "/:id",

  authMiddleware,

  permitirPerfis(
    "ADMIN"
  ),

  validarParams(
    idParamsSchema
  ),

  buscarMedicoPorIdController
);


// ========================================
// CRIAR MÉDICO
// ========================================

medicoRoutes.post(
  "/",

  authMiddleware,

  permitirPerfis(
    "ADMIN"
  ),

  validarBody(
    criarMedicoSchema
  ),

  criarMedicoController
);


// ========================================
// ATUALIZAR STATUS
// ========================================

medicoRoutes.patch(
  "/:id/status",

  authMiddleware,

  permitirPerfis(
    "ADMIN"
  ),

  validarParams(
    idParamsSchema
  ),

  validarBody(
    statusMedicoSchema
  ),

  atualizarStatusMedicoController
);


// ========================================
// EXCLUIR MÉDICO
// ========================================

medicoRoutes.delete(
  "/:id",

  authMiddleware,

  permitirPerfis(
    "ADMIN"
  ),

  validarParams(
    idParamsSchema
  ),

  excluirMedicoController
);


// ========================================
// EXPORTAÇÃO
// ========================================

export default medicoRoutes;
