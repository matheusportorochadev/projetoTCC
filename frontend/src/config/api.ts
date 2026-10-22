// URL pública substituída pelo Vite no build; nunca colocar segredos em VITE_*.
// O padrão mantém o desenvolvimento local e a infraestrutura de testes atuais.
export const API_ORIGIN = (import.meta.env.VITE_API_URL?.trim() || "http://localhost:3000")
  .replace(/\/+$/, "");
