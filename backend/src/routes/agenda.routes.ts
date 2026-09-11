import {
  Router
} from "express";

import {
  criarDisponibilidadeController,
  editarDisponibilidadeController,
  listarDisponibilidadesController,
  removerDisponibilidadeController
} from "../controllers/agenda.controller";

import {
  authMiddleware
} from "../middlewares/auth.middleware";

import {
  permitirPerfis
} from "../middlewares/role.middleware";

const router =
  Router();

// Lista disponibilidades
router.get(
  "/disponibilidades",
  authMiddleware,
  permitirPerfis("MEDICO"),
  listarDisponibilidadesController
);

// Cria disponibilidades
router.post(
  "/disponibilidades",
  authMiddleware,
  permitirPerfis("MEDICO"),
  criarDisponibilidadeController
);

// Edita disponibilidade
router.put(
  "/disponibilidades/:id",
  authMiddleware,
  permitirPerfis("MEDICO"),
  editarDisponibilidadeController
);

// Remove disponibilidade
router.delete(
  "/disponibilidades/:id",
  authMiddleware,
  permitirPerfis("MEDICO"),
  removerDisponibilidadeController
);

export default router;