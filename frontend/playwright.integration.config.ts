import { defineConfig } from "@playwright/test";

// ========================================
// TESTES DE INTEGRAÇÃO DO BACKEND
// ========================================
//
// Executa apenas os arquivos api-*.spec.ts.
//
// Inicia automaticamente o backend usando
// a conexão exclusiva do banco de testes.
//
// Não reutiliza servidores já existentes,
// evitando acessar um backend de desenvolvimento.

export default defineConfig({
  testDir: "./tests",

  // Seleciona somente os testes reais da API.
  testMatch: "**/api-*.spec.ts",

  workers: 1,
  timeout: 30000,

  reporter: [
    ["list"],
    ["html", {
      outputFolder: "playwright-report-integration",
      open: "never"
    }]
  ],

  use: {
    baseURL: "http://127.0.0.1:3000",

    trace: "retain-on-failure"
  },

  // ========================================
  // INICIALIZAÇÃO AUTOMÁTICA
  // ========================================

  webServer: {
    // Executa o comando protegido do backend.
    command: "npm run dev:test",

    // Localiza o package.json do backend.
    cwd: "../backend",

    // Aguarda o endpoint responder.
    // A resposta HTTP 401 é esperada sem login.
    url: "http://127.0.0.1:3000/perfil",

    // PROTEÇÃO IMPORTANTE:
    // nunca reutilizar um servidor já aberto.
    reuseExistingServer: false,

    timeout: 30000
  }
});
