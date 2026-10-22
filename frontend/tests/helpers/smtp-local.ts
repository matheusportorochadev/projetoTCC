import { createServer, type Socket } from 'node:net';
import { once } from 'node:events';

// SMTP local sem relay: apenas recebe mensagens fictícias e mantém códigos em memória.
export async function iniciarSmtpLocal() {
  const mensagens: { destinatario: string; codigo: string }[] = [];
  const sockets = new Set<Socket>();
  let rejeitarEnvio = false;
  const servidor = createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    socket.write('220 localhost teste SMTP\r\n');
    let buffer = ''; let conteudo = ''; let dados = false; let destinatario = '';
    socket.on('data', chunk => {
      buffer += chunk.toString();
      let fim: number;
      while ((fim = buffer.indexOf('\r\n')) !== -1) {
        const linha = buffer.slice(0, fim); buffer = buffer.slice(fim + 2);
        if (dados) {
          if (linha !== '.') { conteudo += linha + '\n'; continue; }
          dados = false;
          if (rejeitarEnvio) { socket.write('451 falha ficticia de envio\r\n'); continue; }
          const codigo = conteudo.match(/\b\d{6}\b/)?.[0];
          if (codigo) mensagens.push({ destinatario, codigo });
          socket.write('250 recebida localmente\r\n'); continue;
        }
        if (/^(EHLO|HELO)/i.test(linha)) socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');
        else if (/^AUTH /i.test(linha)) socket.write('235 autenticado ficticiamente\r\n');
        else if (/^MAIL FROM:/i.test(linha)) socket.write('250 OK\r\n');
        else if (/^RCPT TO:/i.test(linha)) {
          destinatario = linha.match(/<([^>]+)>/)?.[1].toLowerCase() ?? '';
          socket.write(destinatario.endsWith('@example.com') ? '250 OK\r\n' : '550 somente dados ficticios\r\n');
        } else if (/^DATA$/i.test(linha)) { dados = true; conteudo = ''; socket.write('354 finalizar com ponto\r\n'); }
        else if (/^QUIT/i.test(linha)) socket.end('221 fim\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  servidor.listen(0, '127.0.0.1'); await once(servidor, 'listening');
  const endereco = servidor.address();
  if (!endereco || typeof endereco === 'string') throw new Error('SMTP local indisponível.');
  return {
    ambiente: { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(endereco.port), SMTP_USER: 'fixture', SMTP_PASS: 'fixture', SMTP_FROM: 'teste@example.com' },
    mensagens,
    falharEnvio(estado: boolean) { rejeitarEnvio = estado; },
    codigo(email: string) {
      const mensagem = mensagens.filter(m => m.destinatario === email.toLowerCase()).at(-1);
      if (!mensagem) throw new Error('Código não recebido no SMTP local.');
      return mensagem.codigo;
    },
    async fechar() { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => servidor.close(() => resolve())); },
  };
}
