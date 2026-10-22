import { test, expect } from "@playwright/test";
import { obterSenhaTeste } from "./helpers/credenciais";

// ========================================
// TESTES REAIS DE AUTORIZAÇÃO
// ========================================
//
// Cada cenário realiza login de verdade
// e consulta uma rota protegida.
//
// O backend utiliza exclusivamente
// o banco PostgreSQL de testes.

type Perfil = "ADMIN" | "MEDICO" | "PACIENTE";

const contas: Record<Perfil, string> = {
  ADMIN: "admin.teste@example.com",
  MEDICO: "medico.teste@example.com",
  PACIENTE: "paciente.teste@example.com"
};

// ========================================
// LER SENHA FICTÍCIA
// ========================================



// ========================================
// CENÁRIOS DE AUTORIZAÇÃO
// ========================================

const cenarios: {
  perfil: Perfil;
  rota: string;
  esperado: number;
}[] = [
  { perfil: "PACIENTE", rota: "/admin", esperado: 403 },
  { perfil: "MEDICO", rota: "/admin", esperado: 403 },
  { perfil: "PACIENTE", rota: "/medicos", esperado: 403 },
  { perfil: "ADMIN", rota: "/pacientes", esperado: 403 },
  { perfil: "PACIENTE", rota: "/pacientes", esperado: 403 },
  { perfil: "ADMIN", rota: "/admin", esperado: 200 }
];

test.describe("Permissões reais entre perfis", () => {

  for (const cenario of cenarios) {

    test(
      `${cenario.perfil} acessando ${cenario.rota}: HTTP ${cenario.esperado}`,
      async ({ playwright }) => {

        // Cria um contexto HTTP isolado.
        // Nenhum cookie é compartilhado entre testes.
        const api = await playwright.request.newContext({
          baseURL: "http://127.0.0.1:3000"
        });

        try {

          // ========================================
          // AUTENTICAR USUÁRIO
          // ========================================

          const login = await api.post("/auth/login", {
            headers: {
              Origin: "http://localhost:5173"
            },
            data: {
              email: contas[cenario.perfil],
              senha: obterSenhaTeste()
            }
          });

          expect(login.status()).toBe(200);

          // ========================================
          // CONFIRMAR SESSÃO
          // ========================================

          const perfil = await api.get("/perfil");

          expect(perfil.status()).toBe(200);

          const dados = await perfil.json();

          expect(dados.usuario.tipo).toBe(
            cenario.perfil
          );

          // ========================================
          // TESTAR PERMISSÃO NO BACKEND
          // ========================================

          const resposta = await api.get(cenario.rota);

          expect(resposta.status()).toBe(
            cenario.esperado
          );

        } finally {

          // Encerra a sessão HTTP deste teste.
          await api.dispose();

        }
      }
    );
  }
});
