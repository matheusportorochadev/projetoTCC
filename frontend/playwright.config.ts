import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Pasta que contém os testes automatizados.
  testDir: "./tests",

  // Testes reais de API possuem configuração própria.
  testIgnore: "**/api-*.spec.ts",

  // Executa um teste por vez inicialmente.
  workers: 1,

  // Tempo máximo de execução por teste.
  timeout: 30000,

  // Relatório dos testes.
  reporter: "html",

  use: {
    // Endereço local do frontend.
    baseURL: "http://localhost:5174",

    // Salva evidências quando um teste falha.
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],

  // Inicia o Vite automaticamente.
  webServer: {
    command: "npm run dev -- --host localhost --port 5174 --strictPort",
    url: "http://localhost:5174",
    // Processo próprio: não reutiliza frontend com VITE_API_URL de outro ambiente.
    reuseExistingServer: false,
    env: { VITE_API_URL: "http://localhost:3000" },
    timeout: 30000
  }
});
