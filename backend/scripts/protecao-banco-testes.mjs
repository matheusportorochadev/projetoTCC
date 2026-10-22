import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// Falha fechada: nenhuma escrita é autorizada apenas pelo nome na URL.
export function validarBancoDeTestes() {
  const conexao = process.env.DATABASE_URL;
  if (process.env.NODE_ENV !== 'test' || !conexao) {
    throw new Error('BLOQUEADO: ambiente de testes inválido.');
  }
  const configurada = parseEnv(readFileSync(new URL('../.env.test', import.meta.url), 'utf8')).DATABASE_URL;
  if (!configurada || conexao !== configurada) {
    throw new Error('BLOQUEADO: conexão diverge do arquivo exclusivo .env.test.');
  }
  const url = new URL(conexao);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      decodeURIComponent(url.pathname.slice(1)) !== 'tcc_consultorio_testes') {
    throw new Error('BLOQUEADO: somente o banco local exclusivo de testes é permitido.');
  }
  const postgresApp = '/Applications/Postgres.app/Contents/Versions/18/bin/psql';
  let banco;
  try {
    banco = execFileSync(existsSync(postgresApp) ? postgresApp : 'psql', [
      '--no-psqlrc', '--no-password', '--tuples-only', '--no-align',
      '--set=ON_ERROR_STOP=1', '--command=SELECT current_database();'
    ], {
      env: { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432',
        PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
        PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGCONNECT_TIMEOUT: '5' },
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000
    }).trim();
  } catch {
    // Não propaga erros do cliente que poderiam conter detalhes da conexão.
    throw new Error('BLOQUEADO: não foi possível confirmar o PostgreSQL efetivo.');
  }
  if (banco !== 'tcc_consultorio_testes') {
    throw new Error('BLOQUEADO: banco efetivo inesperado.');
  }
  console.log('Banco efetivo confirmado: tcc_consultorio_testes; NODE_ENV=test.');
}
