import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

// Cada instância possui seu próprio armazenamento de rate limiting.
// Não altera limites ou comportamento do ambiente normal.
export async function iniciarApiIsolada(ambiente: NodeJS.ProcessEnv = {}) {
  const reserva = createServer();
  reserva.listen(0, '127.0.0.1');
  await once(reserva, 'listening');
  const endereco = reserva.address();
  if (!endereco || typeof endereco === 'string') throw new Error('Porta de testes indisponível.');
  const porta = endereco.port;
  await new Promise<void>((resolve, reject) => reserva.close(erro => erro ? reject(erro) : resolve()));
  const processo = spawn(process.execPath, ['--env-file=.env.test', 'scripts/iniciar-backend-testes.mjs'], {
    cwd: fileURLToPath(new URL('../../../backend/', import.meta.url)),
    env: { ...process.env, PORT: String(porta), NODE_ENV: 'test', FRONTEND_URLS: 'http://localhost:5173,http://localhost:5174', ...ambiente },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const tempo = setTimeout(() => reject(new Error('API isolada não iniciou.')), 15000);
      processo.once('error', () => { clearTimeout(tempo); reject(new Error('Falha ao iniciar API isolada.')); });
      processo.once('exit', () => { clearTimeout(tempo); reject(new Error('API isolada encerrou antes de iniciar.')); });
      processo.stdout.on('data', (dados: Buffer) => {
        if (dados.toString().includes(`Servidor rodando na porta ${porta}`)) { clearTimeout(tempo); resolve(); }
      });
      // Drena o stderr sem copiar possíveis dados sensíveis para os relatórios.
      processo.stderr.resume();
    });
  } catch (erro) { processo.kill('SIGTERM'); throw erro; }
  return {
    baseURL: `http://127.0.0.1:${porta}`,
    async fechar() {
      if (processo.exitCode !== null || processo.signalCode !== null) return;
      const encerrado = once(processo, 'exit');
      processo.kill('SIGTERM');
      await encerrado;
    },
  };
}
