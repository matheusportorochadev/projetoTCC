import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

// Executa todas as suítes mesmo quando há regressões; cancelamento é distinto de falha.
const frontend = fileURLToPath(new URL('../', import.meta.url));
const backend = fileURLToPath(new URL('../../backend/', import.meta.url));
const resultados = [];
let atual;
let cancelado = false;
for (const sinal of ['SIGINT', 'SIGTERM']) process.once(sinal, () => {
  cancelado = true;
  // Aguarda o executor finalizar seus hooks e servidores antes de encerrar este script.
  atual?.kill(sinal);
});
for (const [cwd, script] of [
  [frontend, 'test:secrets'],
  [backend, 'typecheck'], [backend, 'test:sessions'], [backend, 'test:scripts'],
  [frontend, 'test:typecheck'], [frontend, 'lint'], [frontend, 'build'],
  [frontend, 'test:e2e'], [frontend, 'test:integration'],
]) {
  if (cancelado) break;
  const inicio = Date.now();
  const codigo = await new Promise(resolve => {
    atual = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], { cwd, stdio: 'inherit' });
    atual.once('error', () => resolve(1));
    atual.once('exit', codigo => resolve(codigo ?? 1));
  });
  atual = undefined;
  resultados.push({ pasta: cwd === backend ? 'backend' : 'frontend', script, codigo, duracaoMs: Date.now() - inicio });
}
writeFileSync(new URL('../test-results-resumo.json', import.meta.url), JSON.stringify({ data: new Date().toISOString(), cancelado, resultados }, null, 2));
console.log(JSON.stringify({ verificacoes: resultados.length, falhas: resultados.filter(r => r.codigo !== 0).length, cancelado }));
if (cancelado) process.exitCode = 130;
else if (resultados.some(r => r.codigo !== 0)) process.exitCode = 1;
