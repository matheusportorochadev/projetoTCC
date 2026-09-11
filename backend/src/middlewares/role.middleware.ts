// Define os perfis permitidos em uma rota
type TipoUsuario = "ADMIN" | "MEDICO" | "PACIENTE";

// Verifica se o usuário possui permissão para acessar a rota
export function permitirPerfis(...perfisPermitidos: TipoUsuario[]) {
  return (req: any, res: any, next: any) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensagem: "Usuário não autenticado."
      });
    }

    if (!perfisPermitidos.includes(req.usuario.tipo)) {
      return res.status(403).json({
        mensagem: "Acesso não autorizado."
      });
    }

    return next();
  };
}