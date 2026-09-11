// Configuração principal do servidor
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import medicoRoutes from "./routes/medico.routes";
import { authMiddleware } from "./middlewares/auth.middleware";
import { permitirPerfis } from "./middlewares/role.middleware";

const app = express();

// Configuração de acesso do frontend e leitura de JSON
app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());

// Rotas da aplicação
app.use("/auth", authRoutes);
app.use("/medicos", medicoRoutes);

// Rota protegida para qualquer usuário autenticado
app.get("/perfil", authMiddleware, (req, res) => {
  return res.json({
    mensagem: "Usuário autenticado.",
    usuario: req.usuario
  });
});

// Rota protegida somente para ADMIN
app.get(
  "/admin",
  authMiddleware,
  permitirPerfis("ADMIN"),
  (req, res) => {
    return res.json({
      mensagem: "Acesso de administrador autorizado."
    });
  }
);

// Rota inicial de teste
app.get("/", (req, res) => {
  return res.json({
    message: "API do sistema médico funcionando"
  });
});

// Inicialização do servidor
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});