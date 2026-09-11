// Configuração das rotas de autenticação
import { Router } from "express";
import { loginController } from "../controllers/auth.controller";
import {
  solicitarRedefinicaoSenhaController,
  redefinirSenhaController
} from "../controllers/redefinicaoSenha.controller";

const authRoutes = Router();

// Rota responsável pelo login
authRoutes.post("/login", loginController);

// Solicita o código de redefinição
authRoutes.post(
  "/esqueci-senha",
  solicitarRedefinicaoSenhaController
);

// Redefine a senha utilizando o código recebido
authRoutes.post(
  "/redefinir-senha",
  redefinirSenhaController
);

export default authRoutes;