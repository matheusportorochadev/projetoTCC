import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

type FixtureCriada = { email: string; pacienteId: number };
type MetadadosSessoes = { quantidade: number; hashesValidos: boolean; expiracoesValidas: boolean };

export function fixtureClinica(acao: 'criar' | 'criar-sem-acesso', id: string): FixtureCriada;
export function fixtureClinica(acao: 'sessoes', id: string): MetadadosSessoes;
export function fixtureClinica(acao: 'limpar' | 'revogar', id: string): void;
export function fixtureClinica(acao: 'criar' | 'criar-sem-acesso' | 'limpar' | 'revogar' | 'sessoes', id: string): FixtureCriada | MetadadosSessoes | void {
  const saida = execFileSync(process.execPath, ['--env-file=.env.test', '--import', 'tsx', 'scripts/fixture-clinica.ts', acao, id], {
    cwd: fileURLToPath(new URL('../../../backend/', import.meta.url)),
    env: { ...process.env, NODE_ENV: 'test' }, encoding: 'utf8', timeout: 15000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (acao === 'criar' || acao === 'criar-sem-acesso' || acao === 'sessoes') return JSON.parse(saida.trim().split('\n').at(-1)!);
}
