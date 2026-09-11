// Configuração principal do servidor
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import medicoRoutes from "./routes/medico.routes";
import pacienteRoutes from "./routes/paciente.routes";
import agendaRoutes from "./routes/agenda.routes";
import agendamentoRoutes from "./routes/agendamento.routes";
import {
  authMiddleware
} from "./middlewares/auth.middleware";

import {
  permitirPerfis
} from "./middlewares/role.middleware";

const app = express();

// ========================================
// CONFIGURAÇÕES
// ========================================

// Permite acesso do frontend
app.use(
  cors({
    origin: "http://localhost:5173"
  })
);

// Permite receber JSON
app.use(express.json());

// ========================================
// ROTAS
// ========================================

// Rotas de autenticação
app.use(
  "/auth",
  authRoutes
);

// Rotas de médicos
app.use(
  "/medicos",
  medicoRoutes
);

// Rotas de pacientes
app.use(
  "/pacientes",
  pacienteRoutes
);

// Rotas da agenda
app.use(
  "/agenda",
  agendaRoutes
);

// ========================================
// PERFIL
// ========================================

// Rota protegida para qualquer usuário autenticado
app.get(
  "/perfil",
  authMiddleware,
  (req, res) => {
    return res.json({
      mensagem: "Usuário autenticado.",
      usuario: req.usuario
    });
  }
);

app.use("/agendamentos", agendamentoRoutes);
// ========================================
// ADMIN
// ========================================

// Rota protegida somente para administradores
app.get(
  "/admin",
  authMiddleware,
  permitirPerfis("ADMIN"),
  (req, res) => {
    return res.json({
      mensagem:
        "Acesso de administrador autorizado."
    });
  }
);

// ========================================
// TESTE DA API
// ========================================

// Rota inicial para verificar a API
app.get(
  "/",
  (req, res) => {
    return res.json({
      message:
        "API do sistema médico funcionando"
    });
  }
);

// ========================================
// SERVIDOR
// ========================================

const PORT = 3000;

app.listen(
  PORT,
  () => {
    console.log(
      `Servidor rodando na porta ${PORT}`
    );
  }
);