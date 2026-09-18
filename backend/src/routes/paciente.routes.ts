// ========================================
// ROTAS DE PACIENTES
// ========================================

import {
  Router
} from "express";


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
  criarPacienteSchema,
  atualizarPacienteSchema,
  statusPacienteSchema,
  acessoPacienteSchema
} from "../schemas/paciente.schema";


// ========================================
// CONTROLLERS
// ========================================

import {
  criarPacienteController,
  listarPacientesController,
  buscarPacienteController,
  atualizarPacienteController,
  atualizarStatusPacienteController,
  atualizarAcessoPacienteController,
  excluirPacienteController
} from "../controllers/paciente.controller";


// ========================================
// ROUTER
// ========================================

const pacienteRoutes =
  Router();


// ========================================
// AUTENTICAÇÃO E PERFIL
// ========================================

/*
  Todas as operações desta rota são
  ferramentas de gerenciamento do médico.

  Portanto:

  - precisa estar autenticado;
  - precisa possuir perfil MEDICO.

  Um PACIENTE não poderá chamar
  diretamente /pacientes/:id.

  O ADMIN também não usa estas rotas.
*/

pacienteRoutes.use(
  authMiddleware,

  permitirPerfis(
    "MEDICO"
  )
);


// ========================================
// CRIAR PACIENTE
// ========================================

pacienteRoutes.post(
  "/",

  validarBody(
    criarPacienteSchema
  ),

  criarPacienteController
);


// ========================================
// LISTAR PACIENTES
// ========================================

pacienteRoutes.get(
  "/",

  listarPacientesController
);


// ========================================
// BUSCAR PACIENTE
// ========================================

pacienteRoutes.get(
  "/:id",

  validarParams(
    idParamsSchema
  ),

  buscarPacienteController
);


// ========================================
// ATUALIZAR PACIENTE
// ========================================

pacienteRoutes.patch(
  "/:id",

  validarParams(
    idParamsSchema
  ),

  validarBody(
    atualizarPacienteSchema
  ),

  atualizarPacienteController
);


// ========================================
// ATUALIZAR STATUS
// ========================================

pacienteRoutes.patch(
  "/:id/status",

  validarParams(
    idParamsSchema
  ),

  validarBody(
    statusPacienteSchema
  ),

  atualizarStatusPacienteController
);


// ========================================
// LIBERAR / BLOQUEAR ACESSO
// ========================================

pacienteRoutes.patch(
  "/:id/acesso",

  validarParams(
    idParamsSchema
  ),

  validarBody(
    acessoPacienteSchema
  ),

  atualizarAcessoPacienteController
);


// ========================================
// EXCLUIR PACIENTE
// ========================================

pacienteRoutes.delete(
  "/:id",

  validarParams(
    idParamsSchema
  ),

  excluirPacienteController
);


// ========================================
// EXPORTAÇÃO
// ========================================

export default pacienteRoutes;
