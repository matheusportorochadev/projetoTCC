// Dependências da autenticação
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// Estrutura do token
interface TokenPayload {
  tipo: "ADMIN" | "MEDICO" | "PACIENTE";
  sub: string;
}

// Valida o token enviado na requisição
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      mensagem: "Token não informado."
    });
  }

  const [, token] = authHeader.split(" ");

  if (!token) {
    return res.status(401).json({
      mensagem: "Token inválido."
    });
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({
      mensagem: "JWT_SECRET não configurado."
    });
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as TokenPayload;

    req.usuario = {
      id: Number(payload.sub),
      tipo: payload.tipo
    };

    return next();
  } catch {
    return res.status(401).json({
      mensagem: "Token inválido ou expirado."
    });
  }
}