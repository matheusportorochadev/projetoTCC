// Preparação autorizada: origem somente leitura; escrita limitada a dois bancos novos.
// Não aceita destino configurável nem executa DROP/limpeza do banco principal.
import { execFileSync } from 'node:child_process';
import { mkdirSync, chmodSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
let url;
try { url = new URL(process.env.DATABASE_URL || ''); }
catch { throw new Error('Configuração de origem inválida; conexão omitida.'); }
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/tcc_consultorio' || process.argv.length !== 2) {
  throw new Error('Origem local principal obrigatória; argumentos não permitidos.');
}
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const suffix = stamp + '_' + randomBytes(3).toString('hex');
const restored = 'tcc_preparacao_restore_' + suffix;
const clean = 'tcc_preparacao_limpo_' + suffix;
const directory = homedir() + '/Library/Application Support/TCC/backups/' + suffix;
const bin = '/Applications/Postgres.app/Contents/Versions/18/bin/';
const pgEnv = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGCONNECT_TIMEOUT: '5' };
const results = { data: new Date().toISOString(), backupDiretorio: directory, bancoRestauracao: restored, bancoLimpo: clean };
function run(binary, args, env, input) {
  return execFileSync(binary, args, { cwd: root, env, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 });
}
function sql(database, query, write = false) {
  if (!['postgres', 'tcc_consultorio', restored, clean].includes(database) || (write && database === 'tcc_consultorio')) throw new Error('Destino proibido.');
  return run(bin + 'psql', ['-X', '-w', '-qAt', '-v', 'ON_ERROR_STOP=1'], { ...pgEnv, PGDATABASE: database, PGOPTIONS: '-c default_transaction_read_only=' + (write ? 'off' : 'on') + ' -c statement_timeout=30000' }, query).trim();
}
const literal = value => value == null ? 'NULL' : "'" + String(value).replaceAll("'", "''") + "'";
function admins(database) {
  return JSON.parse(sql(database, `SELECT coalesce(json_agg(t),'[]') FROM (SELECT * FROM public.usuario WHERE tipo::text='ADMIN' ORDER BY id) t;`));
}
function inventory(database) {
  const tables = JSON.parse(sql(database, "SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public';"));
  return Object.fromEntries(tables.map(t => {
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(t)) throw new Error('Tabela inesperada.');
    return [t, Number(sql(database, `SELECT count(*) FROM public."${t}";`))];
  }));
}
function cli(...args) {
  const destination = new URL(url); destination.pathname = '/' + clean;
  const output = run(process.execPath, ['node_modules/prisma/dist/prisma.js', ...args, '--no-interactive'], { ...process.env, DATABASE_URL: destination.href, PRISMA_HIDE_UPDATE_MESSAGE: '1' });
  const envelope = output.trim().split('\n').map(s => { try { return JSON.parse(s); } catch { return null; } }).find(o => o?.kind === 'result')?.envelope;
  if (!envelope?.ok) throw new Error('CLI não confirmou sucesso.');
  return envelope.result;
}
try {
  process.umask(0o077);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (sql('tcc_consultorio', 'SELECT current_database();') !== 'tcc_consultorio') throw new Error('Origem efetiva incorreta.');
  const original = admins('tcc_consultorio');
  if (original.length !== 1 || !original[0].ativo || original[0].primeiroAcesso || !/^\$2[aby]\$/.test(original[0].senha || '')) throw new Error('Administrador não é único/elegível.');
  results.administradores = 1;
  const fingerprint = createHash('sha256').update(JSON.stringify(original)).digest('hex');
  results.dependencias = JSON.parse(sql('tcc_consultorio', `SELECT coalesce(json_agg(json_build_object('tabela',c.conrelid::regclass::text,'restricao',c.conname,'colunas',pg_get_constraintdef(c.oid))),'[]') FROM pg_constraint c WHERE c.contype='f' AND c.confrelid='public.usuario'::regclass;`));
  const dump = directory + '/principal.dump';
  run(bin + 'pg_dump', ['-w', '--format=custom', '--file=' + dump, '--dbname=tcc_consultorio'], { ...pgEnv, PGOPTIONS: '-c default_transaction_read_only=on' });
  chmodSync(dump, 0o600);
  results.backupSha256 = createHash('sha256').update(readFileSync(dump)).digest('hex');
  run(bin + 'pg_restore', ['--list', dump], pgEnv);
  for (const name of [restored, clean]) {
    if (sql('postgres', `SELECT count(*) FROM pg_database WHERE datname=${literal(name)};`) !== '0') throw new Error('Destino já existe.');
    sql('postgres', `CREATE DATABASE "${name}";`, true);
    if (sql(name, 'SELECT current_database();') !== name) throw new Error('Destino efetivo incorreto.');
  }
  run(bin + 'pg_restore', ['-w', '--exit-on-error', '--single-transaction', '--dbname=' + restored, dump], { ...pgEnv, PGOPTIONS: '-c default_transaction_read_only=off' });
  results.backupRestaurado = true;
  results.inventarioBackup = inventory(restored);
  const administrator = admins(restored)[0];
  if (JSON.stringify([administrator]) !== JSON.stringify(original)) throw new Error('Admin divergiu durante backup.');
  // Executa o grafo existente; qualquer erro deixa a preparação incompleta.
  cli('db', 'migrate');
  results.migracoesAplicadas = true;
  const drift = cli('db', 'update', '--dry-run');
  if (drift.plan?.operations?.length) throw new Error('Drift após migração.');
  results.diferencasContrato = 0;
  const cols = JSON.parse(sql(clean, "SELECT json_agg(column_name ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='usuario';"));
  const preserved = { ...administrator, versaoSessao: (administrator.versaoSessao ?? 0) + 1 };
  const keys = cols.filter(k => Object.hasOwn(preserved, k));
  // Cópia explícita só do administrador; dados entram por stdin privado, nunca argv/log.
  sql(clean, `BEGIN; INSERT INTO public.usuario (${keys.map(k => '"'+k+'"').join(',')}) VALUES (${keys.map(k => literal(preserved[k])).join(',')}); SELECT setval(pg_get_serial_sequence('public.usuario','id'),GREATEST((SELECT max(id) FROM public.usuario),1),true); COMMIT;`, true);
  const copied = admins(clean)[0];
  results.atributosPreservados = Object.keys(administrator).filter(k => k !== 'versaoSessao').every(k => copied[k] === administrator[k]);
  results.geracaoSessaoRenovada = copied.versaoSessao === (administrator.versaoSessao ?? 0) + 1;
  if (!results.atributosPreservados) throw new Error('Atributos do administrador divergentes.');
  results.inventarioLimpo = inventory(clean);
  results.estrutura = JSON.parse(sql(clean, `SELECT json_build_object('tabelas',(SELECT count(*) FROM pg_tables WHERE schemaname='public'),'indices',(SELECT count(*) FROM pg_indexes WHERE schemaname='public'),'fks',(SELECT count(*) FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace),'restricoesNaoValidadas',(SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated));`));
  const destination = new URL(url); destination.pathname = '/' + clean;
  const code = `import bcrypt from 'bcrypt';import {db} from './src/prisma/db.ts';import {login} from './src/services/auth.service.ts';const u=await db.orm.public.Usuario.where({tipo:'ADMIN'}).first();const password=process.env.ADMIN_SENHA;const ok=Boolean(password&&await bcrypt.compare(password,u.senha));let authenticated=false;if(ok){const r=await login({email:u.email,senha:password});authenticated=Boolean(r.token||r.access_token);}console.log(JSON.stringify({senhaDisponivelConfere:ok,loginValidado:authenticated}));process.exit(0);`;
  const loginOutput = run(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { ...process.env, DATABASE_URL: destination.href });
  results.login = JSON.parse(loginOutput.trim().split('\n').at(-1));
  results.administradorOrigemInalterado = createHash('sha256').update(JSON.stringify(admins('tcc_consultorio'))).digest('hex') === fingerprint;
  results.sucesso = results.backupRestaurado && results.atributosPreservados && results.geracaoSessaoRenovada && results.login.loginValidado && results.administradorOrigemInalterado;
  writeFileSync(directory + '/resultado.json', JSON.stringify(results, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(results));
} catch {
  results.sucesso = false;
  writeFileSync(directory + '/resultado.json', JSON.stringify(results, null, 2), { mode: 0o600 });
  console.error(JSON.stringify({ ...results, erro: 'Preparação incompleta. Detalhes sensíveis omitidos; nenhum comando destrutivo foi executado.' }));
  process.exitCode = 1;
}
