import { createServer, type Server, type Socket } from 'node:net';

type SmtpSink = {
  close(): Promise<void>;
  messages: string[];
};

function send(socket: Socket, line: string): void {
  socket.write(`${line}\r\n`);
}

function decodeBase64(value: string): string {
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

export async function startLocalSmtpSink(port = 1025): Promise<SmtpSink> {
  const messages: string[] = [];
  const server = createServer((socket) => {
    let buffer = '';
    let dataLines: string[] = [];
    let inData = false;
    let authStage: 'none' | 'login-user' | 'login-pass' = 'none';

    send(socket, '220 careerhub-local-smtp ESMTP ready');

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');

      while (buffer.includes('\n')) {
        const newlineIndex = buffer.indexOf('\n');
        const rawLine = buffer.slice(0, newlineIndex).replace(/\r$/, '');
        buffer = buffer.slice(newlineIndex + 1);

        if (inData) {
          if (rawLine === '.') {
            messages.push(dataLines.join('\n'));
            dataLines = [];
            inData = false;
            send(socket, '250 2.0.0 OK: queued');
            continue;
          }

          if (rawLine.startsWith('.')) {
            dataLines.push(rawLine.slice(1));
          } else {
            dataLines.push(rawLine);
          }
          continue;
        }

        if (authStage === 'login-user') {
          authStage = 'login-pass';
          send(socket, '334 UGFzc3dvcmQ6');
          continue;
        }

        if (authStage === 'login-pass') {
          authStage = 'none';
          decodeBase64(rawLine);
          send(socket, '235 2.7.0 Authentication successful');
          continue;
        }

        const upper = rawLine.toUpperCase();

        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
          send(socket, '250-careerhub-local-smtp');
          send(socket, '250-AUTH PLAIN LOGIN');
          send(socket, '250 SIZE 10485760');
          continue;
        }

        if (upper.startsWith('AUTH PLAIN')) {
          const parts = rawLine.split(' ');
          if (parts.length >= 3) {
            decodeBase64(parts.slice(2).join(' '));
            send(socket, '235 2.7.0 Authentication successful');
          } else {
            send(socket, '235 2.7.0 Authentication successful');
          }
          continue;
        }

        if (upper.startsWith('AUTH LOGIN')) {
          authStage = 'login-user';
          send(socket, '334 VXNlcm5hbWU6');
          continue;
        }

        if (upper.startsWith('MAIL FROM:') || upper.startsWith('RCPT TO:')) {
          send(socket, '250 2.1.0 OK');
          continue;
        }

        if (upper === 'DATA') {
          inData = true;
          dataLines = [];
          send(socket, '354 End data with <CR><LF>.<CR><LF>');
          continue;
        }

        if (upper === 'RSET' || upper === 'NOOP') {
          send(socket, '250 2.0.0 OK');
          continue;
        }

        if (upper === 'QUIT') {
          send(socket, '221 2.0.0 Bye');
          socket.end();
          continue;
        }

        send(socket, '250 2.0.0 OK');
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  return {
    close(): Promise<void> {
      return new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
    messages
  };
}
