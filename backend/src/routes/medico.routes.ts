// Rotas relacionadas aos médicos
import { Router } from "express";
import {
  criarMedicoController,
  listarMedicosController,
  buscarMedicoPorIdController,
  atualizarStatusMedicoController,
  excluirMedicoController
} from "../controllers/medico.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { permitirPerfis } from "../middlewares/role.middleware";

const medicoRoutes = Router();

// Lista todos os médicos
medicoRoutes.get(
  "/",
  authMiddleware,
  permitirPerfis("ADMIN"),
  listarMedicosController
);

// Busca um médico pelo ID
medicoRoutes.get(
  "/:id",
  authMiddleware,
  permitirPerfis("ADMIN"),
  buscarMedicoPorIdController
);

// Cadastra um novo médico
medicoRoutes.post(
  "/",
  authMiddleware,
  permitirPerfis("ADMIN"),
  criarMedicoController
);

// Ativa ou bloqueia um médico
medicoRoutes.patch(
  "/:id/status",
  authMiddleware,
  permitirPerfis("ADMIN"),
  atualizarStatusMedicoController
);

// Exclui um médico
medicoRoutes.delete(
  "/:id",
  authMiddleware,
  permitirPerfis("ADMIN"),
  excluirMedicoController
);

export default medicoRoutes;