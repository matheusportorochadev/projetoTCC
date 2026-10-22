import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { validarBancoDeTestes } from './protecao-banco-testes.mjs';

// Exceção autorizada: banco descartável adicional. Sem URL/nome por argumento.
validarBancoDeTestes();
if (process.argv.length !== 2) throw new Error('Este validador não aceita argumentos.');
const nome = 'tcc_consultorio_bootstrap_validacao_20261022';
const url = new URL(process.env.DATABASE_URL);
const bin = '/Applications/Postgres.app/Contents/Versions/18/bin/psql';
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGCONNECT_TIMEOUT: '5' };
function consultar(banco, sql, leitura = true) {
  if (![nome, 'postgres'].includes(banco)) throw new Error('Banco fora do escopo.');
  return execFileSync(existsSync(bin) ? bin : 'psql', ['-X', '-w', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    env: { ...env, PGDATABASE: banco, PGOPTIONS: `-c default_transaction_read_only=${leitura ? 'on' : 'off'} -c statement_timeout=15000` },
    stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 20000,
  }).trim();
}
function contarRegistros() {
  const tabelas = JSON.parse(consultar(nome, "SELECT coalesce(json_agg(tablename),'[]') FROM pg_tables WHERE schemaname='public'"));
  if (!tabelas.length) return 0;
  if (tabelas.some(t => !/^[a-zA-Z][a-zA-Z0-9]*$/.test(t))) throw new Error('Tabela inesperada no banco descartável.');
  const sql = tabelas.map(t => `SELECT count(*) AS total FROM public."${t}"`).join(' UNION ALL ');
  return Number(consultar(nome, `SELECT sum(total) FROM (${sql}) contagens`));
}
function cli(...argumentos) {
  const raw = execFileSync(process.execPath, ['node_modules/prisma/dist/prisma.js', ...argumentos, '--no-interactive'], {
    cwd: new URL('../', import.meta.url), env: { ...process.env, DATABASE_URL: url.href, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000,
  });
  const resultado = raw.trim().split('\n').map(x => JSON.parse(x)).find(x => x.kind === 'result')?.envelope;
  if (!resultado?.ok) throw new Error('CLI não confirmou sucesso.');
  return resultado.result;
}
try {
  if (consultar('postgres', 'SELECT current_database()') !== 'postgres') throw new Error('Conexão inesperada.');
  const existe = consultar('postgres', `SELECT count(*) FROM pg_database WHERE datname = '${nome}'`) === '1';
  if (!existe) consultar('postgres', `CREATE DATABASE "${nome}"`, false);
  if (consultar(nome, 'SELECT current_database()') !== nome) throw new Error('Banco efetivo inesperado.');
  url.pathname = '/' + nome;
  const tabelasAntes = Number(consultar(nome, "SELECT count(*) FROM pg_tables WHERE schemaname='public'"));
  if (contarRegistros() !== 0) throw new Error('Banco descartável contém dados: execução bloqueada.');
  const previa = cli('db', 'init', '--dry-run');
  const operacoes = previa.plan?.operations ?? [];
  if (operacoes.some(op => op.operationClass !== 'additive')) throw new Error('Plano não aditivo.');
  cli('db', 'init');
  const depois = cli('db', 'update', '--dry-run');
  if (depois.plan?.operations?.length) throw new Error('Há diferenças após bootstrap.');
  const metadados = JSON.parse(consultar(nome, `SELECT json_build_object('banco',current_database(),'tabelas',(SELECT count(*) FROM pg_tables WHERE schemaname='public'),'indices',(SELECT count(*) FROM pg_indexes WHERE schemaname='public'),'fks',(SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND contype='f'),'usuarios',(SELECT count(*) FROM public.usuario),'contrato',(SELECT core_hash FROM prisma_contract.marker WHERE space='app'))`));
  console.log(JSON.stringify({ ...metadados, registrosAplicacao: contarRegistros(), tabelasAntes, operacoesIniciais: operacoes.length, diferencasDepois: 0, preservadoParaInspecao: true }));
} catch {
  console.error('Bootstrap não validado. Conferir somente o banco descartável e os contratos; detalhes da conexão omitidos.');
  process.exitCode = 1;
}
