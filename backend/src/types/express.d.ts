// Adiciona o usuário autenticado ao objeto Request do Express
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        tipo: "ADMIN" | "MEDICO" | "PACIENTE";
      };
    }
  }
}

export {};