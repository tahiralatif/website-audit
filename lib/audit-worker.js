import { getAudit, updateAudit } from './db.js';

const WORKER_TIMEOUT = 300000;

const auditId = process.argv[2];
if (!auditId) {
  process.exit(1);
}

const timer = setTimeout(() => {
  updateAudit(auditId, {
    status: 'error',
    error: 'Audit timed out after 5 minutes',
  });
  process.exit(1);
}, WORKER_TIMEOUT);

function cleanup(code) {
  clearTimeout(timer);
  process.exit(code);
}

process.on('uncaughtException', (err) => {
  updateAudit(auditId, {
    status: 'error',
    error: err.message,
  });
  cleanup(1);
});

process.on('unhandledRejection', (err) => {
  updateAudit(auditId, {
    status: 'error',
    error: 'Unhandled rejection: ' + (err.message || err),
  });
  cleanup(1);
});

const audit = getAudit(auditId);
if (!audit) {
  cleanup(1);
}

const { runAudit } = await import('./orchestrator.js');
const { generateReport } = await import('./reporter.js');

try {
  updateAudit(auditId, { status: 'running', current_tool: 'seo' });

  const auditResult = await runAudit(audit.url, (toolName) => {
    updateAudit(auditId, { current_tool: toolName });
  });

  const report = generateReport(auditResult);

  updateAudit(auditId, {
    status: 'completed',
    current_tool: null,
    results: {
      tools: auditResult.results,
      categories: auditResult.categoryResults,
      issues: auditResult.allIssues,
      report,
    },
  });

  cleanup(0);
} catch (err) {
  updateAudit(auditId, {
    status: 'error',
    current_tool: null,
    error: err.message,
  });
  cleanup(1);
}
