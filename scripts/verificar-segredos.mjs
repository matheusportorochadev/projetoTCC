import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { parseEnv } from 'node:util';

// --staged lê blobs do índice, nunca a cópia possivelmente diferente no disco.
// O relatório contém só caminhos, linhas e classes; valores nunca são emitidos.
const staged = process.argv.slice(2).includes('--staged');
if (process.argv.slice(2).some(x => !['--staged', '--json'].includes(x))) {
  console.error('Argumento inválido. Use --staged e/ou --json.'); process.exit(2);
}
try {
  let raiz;
  const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 });
  raiz = git('rev-parse', '--show-toplevel').trim();
  const arquivos = [...new Set(git(...(staged
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
    : ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])).split('\0').filter(Boolean))];
  const conhecidos = [];
  for (const arquivo of ['backend/.env', 'backend/.env.test']) {
    const destino = resolve(raiz, arquivo);
    if (existsSync(destino)) for (const [chave, valor] of Object.entries(parseEnv(readFileSync(destino, 'utf8')))) {
      if (/SECRET|PASSWORD|SENHA|ENCRYPTION_KEY|SMTP_PASS|DATABASE_URL/.test(chave) && valor.length >= 8) conhecidos.push({ chave, valor });
    }
  }
  const politica = resolve(raiz, 'scripts/segredos-excecoes.json');
  let textoPolitica;
  if (staged) {
    // A política também deve corresponder ao que será commitado.
    if (git('ls-files', '--', 'scripts/segredos-excecoes.json').trim()) textoPolitica = git('show', ':scripts/segredos-excecoes.json');
  } else if (existsSync(politica)) textoPolitica = readFileSync(politica, 'utf8');
  const excecoes = textoPolitica ? JSON.parse(textoPolitica) : [];
  if (!Array.isArray(excecoes)) throw new Error('Política inválida.');
  const ocorrencias = []; let binarios = 0; let examinados = 0;
  const registrar = (arquivo, linha, regra, classe, bloqueia = true) => {
    if (!ocorrencias.some(x => x.arquivo === arquivo && x.linha === linha && x.regra === regra)) ocorrencias.push({ arquivo, linha, regra, classe, bloqueia });
  };
  const placeholder = v => !v || /^(?:password|senha|exemplo|example|change_me|changeme|replace_me|your_[a-z_]+)$/i.test(v) || /^<[^>]+>$/.test(v) || /\$\{|process\.env/.test(v);
  for (const arquivo of arquivos) {
    if (relative(raiz, resolve(raiz, arquivo)).startsWith('..')) throw new Error('Caminho fora do projeto.');
    const ambiente = /(?:^|\/)\.env(?:\.|$)/.test(arquivo) && !arquivo.endsWith('.env.example');
    const estado = /(?:^|\/)(?:cookies?[^/]*\.(?:txt|json)|storage[-_]?state[^/]*\.json|auth-state[^/]*\.json)$/i.test(arquivo) || /(?:^|\/)(?:playwright-report[^/]*|test-results|\.auth)\//.test(arquivo) || /(?:^|\/)trace[^/]*\.zip$|\.trace\.zip$|\.har$/i.test(arquivo);
    if (ambiente || estado) registrar(arquivo, 1, 'arquivo-sensivel', 'arquivo sensível a ignorar');
    let buffer;
    if (staged) buffer = execFileSync('git', ['show', `:${arquivo}`], { cwd: raiz, stdio: ['ignore','pipe','pipe'], maxBuffer: 32 * 1024 * 1024 });
    else {
      const caminho = resolve(raiz, arquivo);
      if (!existsSync(caminho)) continue; // Exclusão ainda não staged não entra no commit proposto.
      buffer = readFileSync(caminho);
    }
    examinados++;
    if (buffer.includes(0)) { binarios++; continue; }
    const texto = buffer.toString('utf8');
    if (arquivo.endsWith('.env.example')) {
      for (const [chave, valor] of Object.entries(parseEnv(texto))) {
        if (/SECRET|PASSWORD|SENHA|ENCRYPTION_KEY|SMTP_PASS|GITHUB_TOKEN|AWS_SECRET_ACCESS_KEY/.test(chave) && !placeholder(valor)) {
          registrar(arquivo, 1, 'env-modelo-literal', 'literal sensível a revisar');
        }
      }
    }
    for (const [i, linha] of texto.split('\n').entries()) {
      const n = i + 1;
      for (const { chave, valor } of conhecidos) if (linha.includes(valor)) registrar(arquivo, n, `valor-local:${chave}`, chave === 'TESTE_SENHA' ? 'credencial fictícia de teste exposta' : 'segredo ativo com possível exposição');
      if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(linha)) registrar(arquivo, n, 'chave-privada', 'segredo ativo com possível exposição');
      if (/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b|\bxkeysib-[A-Za-z0-9-]{20,}\b|\bSG\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/.test(linha)) registrar(arquivo, n, 'credencial-provedor', 'segredo ativo com possível exposição');
      for (const token of linha.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) || []) {
        let expirado = false;
        try { const p = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')); expirado = typeof p.exp === 'number' && p.exp < Date.now()/1000; } catch { /* Não emitir erro nem payload. */ }
        registrar(arquivo, n, 'jwt', expirado ? 'segredo expirado (continua proibido)' : 'segredo ativo com possível exposição');
      }
      for (const m of linha.matchAll(/postgres(?:ql)?:\/\/[^\s/@"']+:([^@\s/"']+)@/g)) registrar(arquivo, n, 'postgres-url', placeholder(m[1]) ? 'falso positivo: exemplo' : 'segredo ativo com possível exposição', !placeholder(m[1]));
      for (const m of linha.matchAll(/\b(JWT_SECRET|RESET_CODE_SECRET|PRONTUARIO_ENCRYPTION_KEY|SMTP_PASS|ADMIN_SENHA|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|password|senha)["']?\s*(?:=|:)\s*(["'])([^\r\n]*?)\2/gi)) {
        const teste = /(?:^|\/)(?:tests|__tests__)\//.test(arquivo) || /fixture|\.test\./.test(arquivo);
        const ficticio = teste && /fict[ií]ci|simulad|incorret|errad|apenas.no.mock/i.test(m[3]);
        const revisado = excecoes.some(e => e.arquivo === arquivo && e.regra === 'literal-credencial' &&
          e.sha256 === createHash('sha256').update(m[3]).digest('hex') && typeof e.motivo === 'string' && e.motivo.length > 10);
        const exemplo = placeholder(m[3]);
        registrar(arquivo, n, 'literal-credencial', (ficticio || revisado) ? 'credencial fictícia de teste' : exemplo ? 'falso positivo: exemplo' : 'literal sensível a revisar', !(ficticio || revisado || exemplo));
      }
    }
  }
  const bloqueios = ocorrencias.filter(x => x.bloqueia).length;
  const resultado = { modo: staged ? 'indice' : 'arquivos-atuais', arquivos: examinados, binariosSemInspecaoTextual: binarios, ocorrencias, bloqueios };
  if (process.argv.includes('--json')) console.log(JSON.stringify(resultado));
  else {
    console.log(`Auditoria local: ${examinados} arquivos; ${bloqueios} bloqueio(s); ${ocorrencias.length - bloqueios} exemplo(s)/fixture(s).`);
    for (const x of ocorrencias.filter(x => x.bloqueia)) console.log(`${x.arquivo}:${x.linha} — ${x.regra} — ${x.classe}`);
  }
  if (bloqueios) process.exitCode = 1;
} catch {
  console.error('Auditoria não concluída; falha fechada. Conteúdos e detalhes do Git foram omitidos.'); process.exitCode = 2;
}
