import { execFileSync } from 'node:child_process';
import { validarBancoDeTestes } from './protecao-banco-testes.mjs';

// Este executor nunca carrega .env e nunca aceita uma URL pela linha de comando.
validarBancoDeTestes();
const aplicar = process.argv.slice(2);
if (aplicar.length > 1 || (aplicar.length === 1 && aplicar[0] !== '--apply')) {
  throw new Error('Use somente --apply ou nenhum argumento para visualizar.');
}
const destino = '262d9014fd79fd6570d42e23c5c465a2c6afc07dc6a0627f78d6387e4ef74e67';
const argumentos = ['node_modules/prisma/dist/prisma.js', 'db', 'update', '--to', destino, '--no-interactive'];
function executar(args) {
  return execFileSync(process.execPath, args, {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, NODE_ENV: 'test', PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000,
  });
}
try {
  const previa = executar([...argumentos, '--dry-run']);
  const evento = previa.trim().split('\n').map(linha => JSON.parse(linha))
    .find(item => item.kind === 'result');
  const operacoes = evento?.envelope?.result?.plan?.operations;
  const permitidas = new Set(['column.public.usuario.versaoSessao']);
  if (!Array.isArray(operacoes) || operacoes.some(op =>
    op.operationClass !== 'additive' || !permitidas.has(op.id))) {
    throw new Error('Plano fora do escopo.');
  }
  if (aplicar.length) {
    validarBancoDeTestes();
    process.stdout.write(executar(argumentos));
  } else {
    process.stdout.write(previa);
  }
} catch {
  console.error('Migração de testes não concluída. Nenhum segredo foi registrado.');
  process.exitCode = 1;
}
