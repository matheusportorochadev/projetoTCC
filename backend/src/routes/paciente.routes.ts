// Dependência do Express
import { Router } from "express";

// Middleware de autenticação
import { authMiddleware } from "../middlewares/auth.middleware";

// Controllers de paciente
import {
  criarPacienteController,
  listarPacientesController,
  buscarPacienteController,
  atualizarPacienteController,
  atualizarStatusPacienteController,
  atualizarAcessoPacienteController,
  excluirPacienteController
} from "../controllers/paciente.controller";


// Cria o roteador
const pacienteRoutes = Router();


// ========================================
// AUTENTICAÇÃO
// ========================================

// Todas as rotas abaixo
// exigem usuário autenticado.
pacienteRoutes.use(
  authMiddleware
);


// ========================================
// CRIAR PACIENTE
// ========================================

pacienteRoutes.post(
  "/",
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
  buscarPacienteController
);


// ========================================
// ATUALIZAR PACIENTE
// ========================================

pacienteRoutes.patch(
  "/:id",
  atualizarPacienteController
);


// ========================================
// ATUALIZAR STATUS
// ========================================

pacienteRoutes.patch(
  "/:id/status",
  atualizarStatusPacienteController
);


// ========================================
// LIBERAR / BLOQUEAR ACESSO
// ========================================

pacienteRoutes.patch(
  "/:id/acesso",
  atualizarAcessoPacienteController
);


// ========================================
// EXCLUIR PACIENTE
// ========================================

pacienteRoutes.delete(
  "/:id",
  excluirPacienteController
);


// Exporta as rotas
export default pacienteRoutes;