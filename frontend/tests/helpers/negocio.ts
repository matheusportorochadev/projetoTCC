import { test as base, expect, type APIRequest, type APIRequestContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomInt } from 'node:crypto';
import { iniciarApiIsolada } from './api-isolada';
import { obterSenhaTeste } from './credenciais';

export const origem = { Origin: 'http://localhost:5173' };
export type Papel = 'admin' | 'medicoA' | 'medicoB' | 'pacienteA' | 'pacienteA2' | 'pacienteB';
type Fixture = {
  contas: Record<Papel, { id: number; email: string }>;
  medicoA: { id: number; crm: string }; medicoB: { id: number; crm: string };
  pacienteA: { id: number }; pacienteA2: { id: number }; pacienteB: { id: number; cpf: string };
};
export type Negocio = Fixture & {
  id: string; email(rotulo: string): string; crm(rotulo?: string): string;
  api(papel: Papel): Promise<APIRequestContext>;
};
export type Evento = { id: number; usuarioId: number | null; medicoId?: number; pacienteId?: number; acao: string; resultado: string; createdAt: string };
type Estado = {
  auditorias: Record<'login' | 'pacientes' | 'agenda' | 'prontuarios', Evento[]>;
  codigos: { tipo: string; usado: boolean; tentativas?: number; hashSeguro: boolean }[];
  usuarios: { id: number; email: string; nome: string; tipo: string; ativo: boolean; primeiroAcesso: boolean; temSenha: boolean }[];
  pacientes: { id: number; usuarioId: number | null; medicoId: number; ativo: boolean; acessoLiberado: boolean }[];
  agendamentos: { id: number; medicoId: number; pacienteId: number; data: string; horaInicio: string; status: string }[];
  disponibilidades: { id: number; ativo: boolean }[];
};
export function inspecionarNegocio(id: string): Estado {
  return executar('inspecionar', id);
}
function executar(acao: 'criar', id: string): Fixture;
function executar(acao: 'inspecionar', id: string): Estado;
function executar(acao: 'limpar', id: string): void;
function executar(acao: string, id: string): Fixture | Estado | void { return executarAcao(acao, id); }
function executarAcao(acao: string, id: string, papel?: Papel): Fixture | Estado | void {
  const saida = execFileSync(process.execPath, ['--env-file=.env.test', '--import', 'tsx', 'scripts/fixture-negocio.ts', acao, id, ...(papel ? [papel] : [])], {
    cwd: fileURLToPath(new URL('../../../backend/', import.meta.url)), env: { ...process.env, NODE_ENV: 'test' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000,
  });
  if (acao !== 'limpar') return JSON.parse(saida.trim().split('\n').at(-1)!);
}

export function operarNegocio(acao: 'elegivel' | 'expirar-primeiro' | 'expirar-reset' | 'expirar-clinico' | 'paginar' | 'paginar-login' | 'paginar-agenda' | 'paginar-clinico' | 'alterar-perfil', id: string, papel: Papel = 'medicoA'): void {
  executarAcao(acao, id, papel);
}
// Backend exclusivo desta bateria: rate limits normais, sem cookies compartilhados.
export const test = base.extend<{ negocio: Negocio }, { negocioURL: string }>({
  negocioURL: [async ({ playwright }, usarFixture) => {
    void playwright;
    const servidor = await iniciarApiIsolada();
    try { await usarFixture(servidor.baseURL); } finally { await servidor.fechar(); }
  }, { scope: 'worker' }],
  negocio: async ({ playwright, negocioURL }, usarFixture) => {
    await usarNegocio(playwright, negocioURL, usarFixture);
  },
});
export { expect };
const inicioBateria = new Date();
export function dataFutura(dias = 30): string {
  // Mantém a referência estável se a execução atravessar meia-noite.
  const data = new Date(inicioBateria); data.setUTCDate(data.getUTCDate() + dias); return data.toISOString().slice(0, 10);
}
export function cpfFicticio(): string {
  // Dados exclusivos das fixtures; gera os dígitos para evitar CPFs constantes.
  const digitos = Array.from({ length: 9 }, () => randomInt(0, 10));
  for (const tamanho of [9, 10]) {
    const resto = digitos.reduce((soma, d, i) => soma + d * (tamanho + 1 - i), 0) % 11;
    digitos.push(resto < 2 ? 0 : 11 - resto);
  }
  return digitos.join('');
}
export async function disponibilidade(negocio: Negocio, data = dataFutura(), inicio = '08:00', fim = '10:00', duracao = 30) {
  const api = await negocio.api('medicoA');
  const resposta = await api.post('/agenda/disponibilidades', { headers: origem, data: {
    datas: [data], horaInicio: inicio, horaFim: fim, duracaoConsulta: duracao,
  } });
  expect(resposta.status()).toBe(201);
  return (await resposta.json()).disponibilidades[0] as { id: number; data: string };
}
export async function solicitar(negocio: Negocio, horaInicio = '08:00', data = dataFutura(), papel: 'pacienteA' | 'pacienteA2' = 'pacienteA') {
  const paciente = await negocio.api(papel);
  const resposta = await paciente.post('/agendamentos', { headers: origem, data: { data, horaInicio } });
  expect(resposta.status()).toBe(201);
  return (await resposta.json()).agendamento as { id: number; data: string; status: string; pacienteId: number; medicoId: number };
}

export async function usarNegocio(playwright: { request: APIRequest }, negocioURL: string, usarFixture: (negocio: Negocio) => Promise<void>) {
    const id = randomUUID();
    const contextos = new Map<Papel, APIRequestContext>();
    try {
      const fixture = executar('criar', id);
      await usarFixture({
        ...fixture, id,
        email: rotulo => `negocio.${id}.${rotulo}@example.com`.toLowerCase(),
        crm: (rotulo = 'C') => `TST${rotulo}${id.replaceAll('-', '').slice(0, 20)}`.toUpperCase(),
        async api(papel) {
          if (!contextos.has(papel)) {
            const api = await playwright.request.newContext({ baseURL: negocioURL });
            contextos.set(papel, api);
            expect((await api.post('/auth/login', { headers: origem, data: {
              email: fixture.contas[papel].email, senha: obterSenhaTeste(),
            } })).status()).toBe(200);
          }
          return contextos.get(papel)!;
        },
      });
    } finally {
      try { await Promise.all([...contextos.values()].map(api => api.dispose())); }
      finally { executar('limpar', id); }
    }
}
