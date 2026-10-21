
// ========================================
// ROTAS DOS PRONTUÁRIOS MÉDICOS
// ========================================
//
// Todas as rotas exigem:
//
// 1. JWT principal válido.
// 2. Perfil MEDICO.
// 3. JWT adicional dos prontuários válido.
//
// Nenhum paciente poderá acessar
// diretamente estes endpoints.
//
// A propriedade de cada paciente
// também será conferida no service.

import {
  Router
} from "express";

import {
  authMiddleware
} from "../middlewares/auth.middleware";

import {
  permitirPerfis
} from "../middlewares/role.middleware";

import {
  validarBody
} from "../middlewares/validar.middleware";

import {
  protegerProntuarios
} from "../middlewares/prontuario-acesso.middleware";

import {
  criarProntuarioSchema
} from "../schemas/prontuario.schema";

import {
  listarPacientesProntuarioController,
  listarHistoricoProntuarioController,
  consultarProntuarioController,
  criarProntuarioController
} from "../controllers/prontuario.controller";


// ========================================
// INICIALIZAR ROUTER
// ========================================

const prontuarioRoutes =
  Router();


// ========================================
// PROTEGER TODAS AS ROTAS CLÍNICAS
// ========================================
//
// A ordem é importante:
//
// Primeiro validamos o login.
// Depois verificamos se é médico.
// Por último, exigimos a senha
// adicional dos prontuários.

prontuarioRoutes.use(
  authMiddleware,
  permitirPerfis("MEDICO"),
  protegerProntuarios
);


// ========================================
// LISTAR PACIENTES DO MÉDICO
// ========================================
//
// GET /prontuarios/clinicos/pacientes
//
// Retorna somente os pacientes
// ativos do médico autenticado.

prontuarioRoutes.get(
  "/pacientes",
  listarPacientesProntuarioController
);


// ========================================
// LISTAR HISTÓRICO DO PACIENTE
// ========================================
//
// GET
// /prontuarios/clinicos/pacientes/:pacienteId
//
// Retorna todos os registros anteriores,
// do mais recente para o mais antigo.

prontuarioRoutes.get(
  "/pacientes/:pacienteId",
  listarHistoricoProntuarioController
);


// ========================================
// CONSULTAR UM REGISTRO ESPECÍFICO
// ========================================
//
// GET
// /prontuarios/clinicos/pacientes/:pacienteId/:prontuarioId
//
// Permite abrir os detalhes completos
// de um prontuário já registrado.

prontuarioRoutes.get(
  "/pacientes/:pacienteId/:prontuarioId",
  consultarProntuarioController
);


// ========================================
// CADASTRAR NOVO PRONTUÁRIO
// ========================================
//
// POST
// /prontuarios/clinicos/pacientes/:pacienteId
//
// O Zod valida os campos enviados.
//
// O service sempre utiliza .create(),
// preservando os registros anteriores.

prontuarioRoutes.post(
  "/pacientes/:pacienteId",

  validarBody(
    criarProntuarioSchema
  ),

  criarProntuarioController
);


// ========================================
// EXPORTAÇÃO
// ========================================

export default prontuarioRoutes;
