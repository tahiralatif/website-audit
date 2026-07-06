import { getAudit, updateAudit } from './db.js';

async function run() {
  const auditId = process.argv[2];
  if (!auditId) {
    console.error('No audit ID provided');
    process.exit(1);
  }

  const audit = getAudit(auditId);
  if (!audit) {
    console.error('Audit not found:', auditId);
    process.exit(1);
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

    console.log('Audit completed:', auditId);
    process.exit(0);
  } catch (err) {
    updateAudit(auditId, {
      status: 'error',
      current_tool: null,
      error: err.message,
    });
    console.error('Audit failed:', auditId, err.message);
    process.exit(1);
  }
}

run();
