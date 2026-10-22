// Compartilhada pelo schema e pelos serviços; não modifica registros históricos.
export function normalizarCpf(cpf: string): string {
  if (!/^[0-9.\-\s]+$/.test(cpf) || cpf.replace(/\D/g, "").length !== 11) {
    throw new Error("O CPF deve possuir 11 números e somente caracteres válidos.");
  }
  return cpf.replace(/\D/g, "");
}
