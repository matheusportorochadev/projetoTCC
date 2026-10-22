import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

// O parser nativo respeita aspas e comentários sem expor o arquivo de ambiente.
export function obterSenhaTeste(): string {
  const env = parseEnv(readFileSync(fileURLToPath(new URL('../../../backend/.env.test', import.meta.url)), 'utf8'));
  if (!env.TESTE_SENHA) throw new Error('TESTE_SENHA não configurada.');
  return env.TESTE_SENHA;
}

// Somente para gerar JWTs adversariais em testes locais; nunca exporta a chave.
export function assinarJwtTeste(payload: Record<string, unknown>, chaveJwt: string, clinico = false, chaveInvalida = false): string {
  // Cada instância adversarial tem uma chave efêmera exclusiva em memória.
  let chave = chaveJwt;
  if (clinico) chave = createHmac('sha256', chave).update('tcc-consultorio:prontuarios:v1').digest('hex');
  if (chaveInvalida) chave = 'chave-ficticia-invalida-para-teste-apenas';
  const partes = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify(payload)).toString('base64url')];
  return [...partes, createHmac('sha256', chave).update(partes.join('.')).digest('base64url')].join('.');
}
