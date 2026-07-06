import { connect } from 'node:tls';
import { parse } from 'node:url';

const TIMEOUT = 10000;

const SECURITY_HEADERS = {
  'strict-transport-security': { name: 'Strict-Transport-Security (HSTS)', impact: 'high' },
  'content-security-policy': { name: 'Content-Security-Policy (CSP)', impact: 'high' },
  'x-frame-options': { name: 'X-Frame-Options', impact: 'medium' },
  'x-content-type-options': { name: 'X-Content-Type-Options', impact: 'medium' },
  'referrer-policy': { name: 'Referrer-Policy', impact: 'low' },
  'permissions-policy': { name: 'Permissions-Policy', impact: 'low' },
};

function checkSsl(hostname, port = 443) {
  return new Promise((resolve) => {
    const socket = connect(port, hostname, {
      servername: hostname,
      rejectUnauthorized: false,
    });

    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ error: 'SSL connection timed out' });
    }, TIMEOUT);

    socket.once('secureConnect', () => {
      clearTimeout(timer);
      const cert = socket.getPeerCertificate();
      const protocol = socket.getProtocol();

      socket.end();

      const now = new Date();
      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);
      const san = (cert.subjectaltname || '').split(', ').map(s => s.replace(/^DNS:/, ''));
      const hostnameMatch = san.some(name => {
        if (name.startsWith('*.')) {
          const domain = name.slice(2);
          return hostname.endsWith(domain);
        }
        return name === hostname;
      });

      resolve({
        issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown',
        subject: cert.subject?.CN || 'Unknown',
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        expired: validTo < now,
        notYetValid: validFrom > now,
        daysRemaining: Math.floor((validTo - now) / (1000 * 60 * 60 * 24)),
        san,
        hostnameMatch,
        protocol,
        selfSigned: !cert.issuercert || cert.issuercert === cert,
      });
    });

    socket.once('error', (err) => {
      clearTimeout(timer);
      resolve({ error: err.message });
    });
  });
}

export async function securityAudit(url) {
  const issues = [];
  const data = {};
  let score = 0;

  try {
    const parsed = parse(url);
    const hostname = parsed.hostname;

    // --- SSL Check ---
    const ssl = await checkSsl(hostname);
    data.ssl = ssl;

    if (ssl.error) {
      issues.push({ type: 'error', message: `SSL check failed: ${ssl.error}`, impact: 'critical' });
    } else {
      if (ssl.expired) {
        issues.push({ type: 'error', message: `SSL certificate expired on ${ssl.validTo.slice(0, 10)}`, impact: 'critical' });
      } else if (ssl.daysRemaining < 30) {
        issues.push({ type: 'warning', message: `SSL certificate expires in ${ssl.daysRemaining} days`, impact: 'high' });
      } else {
        score += 25;
      }

      if (ssl.notYetValid) {
        issues.push({ type: 'error', message: 'SSL certificate is not yet valid', impact: 'critical' });
      }

      if (!ssl.hostnameMatch) {
        issues.push({ type: 'error', message: `SSL certificate does not match hostname "${hostname}"`, impact: 'critical' });
      } else {
        score += 5;
      }

      if (ssl.selfSigned) {
        issues.push({ type: 'warning', message: 'SSL certificate is self-signed', impact: 'high' });
      } else {
        score += 5;
      }

      const tlsVersion = ssl.protocol ? parseFloat(ssl.protocol.replace('TLSv', '')) : 0;
      if (tlsVersion >= 1.2) {
        score += 10;
      } else if (tlsVersion > 0) {
        issues.push({ type: 'warning', message: `Using ${ssl.protocol} (recommended: TLSv1.2+)`, impact: 'high' });
      }
    }

    // --- Security Headers ---
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        method: 'HEAD',
      });
      clearTimeout(timer);

      data.headers = {};
      const headerScorePerItem = 10;

      for (const [headerKey, headerInfo] of Object.entries(SECURITY_HEADERS)) {
        const value = res.headers.get(headerKey);
        if (value) {
          data.headers[headerKey] = value;
          score += headerScorePerItem;
        } else {
          issues.push({
            type: 'warning',
            message: `Missing ${headerInfo.name} header`,
            impact: headerInfo.impact,
          });
        }
      }
    } catch {
      clearTimeout(timer);
      // HEAD request might fail, try GET
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(TIMEOUT),
          redirect: 'follow',
        });

        data.headers = {};
        for (const [headerKey, headerInfo] of Object.entries(SECURITY_HEADERS)) {
          const value = res.headers.get(headerKey);
          if (value) {
            data.headers[headerKey] = value;
            score += 10;
          } else {
            issues.push({
              type: 'warning',
              message: `Missing ${headerInfo.name} header`,
              impact: headerInfo.impact,
            });
          }
        }
      } catch {
        issues.push({ type: 'error', message: 'Could not fetch security headers', impact: 'high' });
      }
    }

  } catch (err) {
    return {
      tool: 'security',
      status: 'error',
      score: 0,
      data: {},
      issues: [{ type: 'error', message: `Security audit failed: ${err.message}`, impact: 'critical' }],
    };
  }

  score = Math.min(100, Math.max(0, score));

  return {
    tool: 'security',
    status: 'success',
    score,
    data,
    issues,
  };
}
