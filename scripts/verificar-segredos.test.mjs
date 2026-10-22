import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
const scanner = fileURLToPath(new URL('./verificar-segredos.mjs', import.meta.url));
function fixture() {
  // Repositórios temporários vazios: sem commit, remoto, dados reais ou limpeza ampla.
  const cwd = mkdtempSync(join(tmpdir(), 'tcc-scanner-'));
  const git = (...args) => execFileSync('git', args, { cwd, stdio: ['ignore','pipe','pipe'] });
  git('init', '-q');
  return { cwd, git, salvar: (nome, valor) => writeFileSync(join(cwd, nome), valor),
    scan: (staged = true) => spawnSync(process.execPath, [scanner, '--json', ...(staged ? ['--staged'] : [])], { cwd, encoding: 'utf8' }) };
}

test('Índice com JWT expirado é bloqueado mesmo com cópia limpa; saída não expõe token', () => {
  const f = fixture();
  const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: 'ficticio', exp: 1 })).toString('base64url'), Buffer.from('assinatura-ficticia-sem-uso').toString('base64url')].join('.');
  f.salvar('amostra.txt', token); f.git('add', '--', 'amostra.txt'); f.salvar('amostra.txt', 'Conteúdo limpo');
  const r = f.scan(); assert.equal(r.status, 1); assert.equal(r.stdout.includes(token), false);
  assert.equal(JSON.parse(r.stdout).ocorrencias.some(x => x.regra === 'jwt' && x.classe.includes('expirado')), true);
  assert.equal(f.scan(false).status, 0);
  mkdirSync(join(f.cwd, 'frontend'));
  const sub = staged => spawnSync(process.execPath, [scanner, '--json', ...(staged ? ['--staged'] : [])], { cwd: join(f.cwd, 'frontend'), encoding: 'utf8' });
  assert.equal(sub(true).status, 1); // Também precisa ler o índice a partir de subpasta.
  f.salvar('outro.txt', token);
  assert.equal(sub(false).status, 1); // Arquivo novo na raiz não pode escapar ao npm run.
  assert.equal(sub(false).stdout.includes(token), false);
});
test('Estado de autenticação é bloqueado mesmo quando não contém JWT', () => {
  const f = fixture(); f.salvar('storage-state.json', '{"cookies":[],"origins":[]}'); f.git('add', '-f', '--', 'storage-state.json');
  const r = f.scan(); assert.equal(r.status, 1); assert.equal(JSON.parse(r.stdout).ocorrencias[0].regra, 'arquivo-sensivel');
});
test('Chaves privadas e credenciais de provedores são detectadas sem valores na saída', () => {
  const f = fixture(); const aws = 'AK' + 'IA' + 'A'.repeat(16); const github = 'gh' + 'p_' + 'a'.repeat(36);
  const chave = ['-----BEGIN ', 'PRIVATE KEY-----'].join('');
  f.salvar('amostra.txt', [chave, aws, github].join('\n')); f.git('add', '--', 'amostra.txt');
  const r = f.scan(); assert.equal(r.status, 1);
  for (const valor of [chave, aws, github]) assert.equal(r.stdout.includes(valor), false);
  assert.equal(JSON.parse(r.stdout).ocorrencias.some(x => x.regra === 'chave-privada'), true);
  assert.equal(JSON.parse(r.stdout).ocorrencias.some(x => x.regra === 'credencial-provedor'), true);
  f.salvar('config.json', JSON.stringify({ password: randomBytes(20).toString('hex') })); f.git('add', '--', 'config.json');
  assert.equal(JSON.parse(f.scan().stdout).ocorrencias.some(x => x.arquivo === 'config.json' && x.regra === 'literal-credencial'), true);
});
test('Arquivo de ambiente staged é bloqueado apesar de conter só placeholders', () => {
  const f = fixture(); f.salvar('.env', 'JWT_SECRET=\n'); f.git('add', '-f', '--', '.env');
  assert.equal(f.scan().status, 1);
  f.git('rm', '--cached', '--', '.env');
  f.salvar('.env.example', ['JWT_SECRET', randomBytes(20).toString('hex')].join('=')); f.git('add', '-f', '--', '.env.example');
  assert.equal(JSON.parse(f.scan().stdout).ocorrencias.some(x => x.regra === 'env-modelo-literal'), true);
});
test('Exceção de fixture exige hash e caminho exatos; valor novo volta a bloquear', () => {
  const f = fixture(); const valor = randomBytes(20).toString('hex');
  mkdirSync(join(f.cwd, 'scripts'));
  f.salvar('scripts/segredos-excecoes.json', JSON.stringify([{ arquivo: 'amostra.ts', regra: 'literal-credencial', sha256: createHash('sha256').update(valor).digest('hex'), motivo: 'Fixture específica revisada para este teste.' }]));
  f.git('add', '--', 'scripts/segredos-excecoes.json');
  f.salvar('amostra.ts', `const senha = '${valor}';`); f.git('add', '--', 'amostra.ts'); assert.equal(f.scan().status, 0);
  f.salvar('amostra.ts', `const senha = '${randomBytes(20).toString('hex')}';`); f.git('add', '--', 'amostra.ts'); assert.equal(f.scan().status, 1);
  f.salvar('outra.ts', `const senha = '${valor}';`); f.git('add', '--', 'outra.ts'); assert.equal(f.scan().status, 1);
});
test('Política inválida falha fechada sem imprimir conteúdo ou stack', () => {
  const f = fixture(); mkdirSync(join(f.cwd, 'scripts')); const invalido = 'fixture-invalida-nao-publicar';
  f.salvar('scripts/segredos-excecoes.json', invalido); f.git('add', '--', 'scripts/segredos-excecoes.json');
  const r = f.scan(); assert.equal(r.status, 2); assert.equal(r.stderr.includes(invalido), false); assert.equal(r.stderr.includes('SyntaxError'), false);
});
