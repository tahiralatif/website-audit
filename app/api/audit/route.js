import { spawn } from 'node:child_process';
import { createAudit } from '@/lib/db.js';

export async function POST(request) {
  let url;
  try {
    const body = await request.json();
    url = body.url;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'URL is required' }, { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error();
    }
  } catch {
    return Response.json({ error: 'Invalid URL. Must be a valid http or https URL.' }, { status: 400 });
  }

  const audit = createAudit(url);

  const workerPath = process.cwd() + '/lib/audit-worker.js';
  const child = spawn(process.execPath, [workerPath, audit.id], {
    stdio: 'inherit',
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  });

  child.on('error', (err) => {
    console.error('Worker spawn failed:', err);
  });

  return Response.json({ auditId: audit.id, url: audit.url }, { status: 201 });
}
