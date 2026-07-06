import { seoAudit } from './tools/seo.js';
import { performanceAudit } from './tools/performance.js';
import { securityAudit } from './tools/security.js';
import { accessibilityAudit } from './tools/accessibility.js';

const TOOLS = [
  { name: 'seo', fn: seoAudit, timeout: 20000 },
  { name: 'security', fn: securityAudit, timeout: 15000 },
  { name: 'performance', fn: performanceAudit, timeout: 90000 },
  { name: 'accessibility', fn: accessibilityAudit, timeout: 45000 },
];

async function runWithTimeout(toolFn, url, toolName, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const result = await Promise.race([
      toolFn(url),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`${toolName} audit timed out after ${timeout}ms`));
        });
      }),
    ]);
    return result;
  } catch (err) {
    return {
      tool: toolName,
      status: 'error',
      score: 0,
      data: {},
      issues: [{ type: 'error', message: err.message, impact: 'high' }],
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runAudit(url, onProgress) {
  const results = [];
  const categoryResults = {};
  let allIssues = [];

  for (const tool of TOOLS) {
    if (onProgress) onProgress(tool.name, 'running');
    const result = await runWithTimeout(tool.fn, url, tool.name, tool.timeout);
    results.push(result);
    categoryResults[result.tool] = {
      score: result.score,
      status: result.status,
    };
    allIssues = allIssues.concat(
      result.issues.map(i => ({ ...i, category: result.tool }))
    );
    if (onProgress) onProgress(tool.name, result.status);
  }

  return {
    results,
    categoryResults,
    allIssues,
  };
}
