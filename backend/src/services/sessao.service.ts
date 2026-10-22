import { createHash } from 'node:crypto';
import { db } from '../prisma/db';

// As mensagens não incluem token, hash, consulta SQL ou detalhes de conexão.
export class PersistenciaSessaoIndisponivel extends Error {
  constructor() {
    super('Não foi possível confirmar a situação da sessão. Tente novamente.');
  }
}

export function identificadorSessaoValido(jti: unknown): jti is string {
  return typeof jti === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jti);
}

function hashSessao(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Uma busca pela PK; sem cache local que permita reutilização em outro processo.
export async function sessaoFoiRevogada(token: string): Promise<boolean> {
  try {
    return Boolean(await db.orm.public.SessaoRevogada
      .where({ tokenHash: hashSessao(token) }).first());
  } catch {
    throw new PersistenciaSessaoIndisponivel();
  }
}

export async function revogarSessao(token: string, usuarioId: number, expiracao: number): Promise<void> {
  const tokenHash = hashSessao(token);
  try {
    // Upsert nativo do contrato do Prisma 8: a PK impede duplicação;
    // update vazio preserva o registro original em logouts concorrentes.
    await db.orm.public.SessaoRevogada.upsert({
      create: {
        tokenHash,
        usuarioId,
        expiresAt: new Date(expiracao * 1000).toISOString(),
      },
      update: {},
    });
  } catch {
    throw new PersistenciaSessaoIndisponivel();
  }
}
