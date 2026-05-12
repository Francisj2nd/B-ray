import net from 'net';
import { lookupMx } from './mx-lookup';

export type VerifyReason = 'valid' | 'invalid' | 'catch_all' | 'no_mx' | 'timeout' | 'blocked' | 'dns_only';

export interface VerifyResult {
  email: string;
  valid: boolean;
  reason: VerifyReason;
  mxFound: boolean;
}

// Vercel blocks outbound port 25. We detect this early (ECONNREFUSED / fast error)
// and fall back to dns_only so the caller knows MX exists but SMTP is unavailable.
function smtpProbe(host: string, email: string, domain: string): Promise<VerifyReason> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let step = 0;
    let catchAllDetected = false;
    const randomAddr = `noreply-${Math.random().toString(36).slice(2)}@${domain}`;

    const done = (reason: VerifyReason) => {
      clearTimeout(timer);
      socket.destroy();
      resolve(reason);
    };

    // 8 s total — generous enough for slow mail servers, tight enough for Vercel
    const timer = setTimeout(() => done('timeout'), 8000);

    socket.connect(25, host);

    socket.on('data', chunk => {
      const line = chunk.toString();

      if (step === 0 && line.startsWith('220')) {
        socket.write('EHLO verify.leadgen.app\r\n');
        step = 1;
      } else if (step === 1 && line.startsWith('250')) {
        socket.write('MAIL FROM:<verify@leadgen.app>\r\n');
        step = 2;
      } else if (step === 2 && line.startsWith('250')) {
        // Probe with a random address first to detect catch-all servers
        socket.write(`RCPT TO:<${randomAddr}>\r\n`);
        step = 3;
      } else if (step === 3) {
        catchAllDetected = line.startsWith('250');
        socket.write(`RCPT TO:<${email}>\r\n`);
        step = 4;
      } else if (step === 4) {
        socket.write('QUIT\r\n');
        if (catchAllDetected) return done('catch_all');
        done(line.startsWith('250') ? 'valid' : 'invalid');
      }
    });

    socket.on('error', (err: NodeJS.ErrnoException) => {
      // ECONNREFUSED means port 25 is blocked at network level (Vercel free tier)
      done(err.code === 'ECONNREFUSED' || err.code === 'ENETUNREACH' ? 'blocked' : 'timeout');
    });
  });
}

export async function verifyEmail(email: string): Promise<VerifyResult> {
  const domain = email.split('@')[1];
  if (!domain) return { email, valid: false, reason: 'invalid', mxFound: false };

  const mxRecords = await lookupMx(domain);
  if (mxRecords.length === 0) {
    return { email, valid: false, reason: 'no_mx', mxFound: false };
  }

  const reason = await smtpProbe(mxRecords[0].exchange, email, domain);

  // If SMTP is blocked at the network level, we at least know MX exists.
  // Return dns_only so the caller can decide how to present confidence.
  if (reason === 'blocked') {
    return { email, valid: true, reason: 'dns_only', mxFound: true };
  }

  return { email, valid: reason === 'valid', reason, mxFound: true };
}

export async function verifyBatch(emails: string[]): Promise<VerifyResult[]> {
  // Sequential — avoids hammering a single mail server
  const results: VerifyResult[] = [];
  for (const email of emails) {
    results.push(await verifyEmail(email));
  }
  return results;
}
