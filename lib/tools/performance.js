import { getBrowser, releaseBrowser } from '../browser.js';

const TIMEOUT = 60000;

export async function performanceAudit(url) {
  const issues = [];
  const data = {};
  let score = 0;

  let browser;
  try {
    browser = await getBrowser();
    const endpoint = browser.wsEndpoint();
    const port = new URL(endpoint).port;

    const { default: lighthouse } = await import('lighthouse');
    const runnerResult = await lighthouse(url, {
      port: Number(port),
      logLevel: 'silent',
      output: 'json',
      onlyCategories: ['performance'],
    });

    if (!runnerResult) {
      return {
        tool: 'performance',
        status: 'error',
        score: 0,
        data: {},
        issues: [{ type: 'error', message: 'Lighthouse returned no results', impact: 'high' }],
      };
    }

    const lhr = runnerResult.lhr;
    const audits = lhr.audits || {};
    let perfScore = lhr.categories?.performance?.score;

    if (perfScore === null || perfScore === undefined) {
      const fcp = audits['first-contentful-paint']?.score || 0;
      const lcp = audits['largest-contentful-paint']?.score || 0;
      const tbt = audits['total-blocking-time']?.score || 0;
      const cls = audits['cumulative-layout-shift']?.score || 0;
      const si = audits['speed-index']?.score || 0;
      perfScore = (fcp + lcp + tbt + cls + si) / 5;
    }

    score = Math.round(perfScore * 100);

    data.lighthouse = {
      score: perfScore * 100,
      metrics: {
        fcp: audits['first-contentful-paint']?.numericValue || null,
        lcp: audits['largest-contentful-paint']?.numericValue || null,
        tbt: audits['total-blocking-time']?.numericValue || null,
        cls: audits['cumulative-layout-shift']?.numericValue || null,
        si: audits['speed-index']?.numericValue || null,
      },
    };

    // --- Simple page load timing ---
    const page = await browser.newPage();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const navStart = Date.now();
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      const loadTime = Date.now() - navStart;
      data.pageLoadTime = loadTime;
      clearTimeout(timer);
      await page.close();
    } catch {
      clearTimeout(timer);
      await page.close().catch(() => {});
      data.pageLoadTime = null;
    }

    // --- Generate issues from Lighthouse diagnostics ---
    const perfAudits = [
      { id: 'first-contentful-paint', name: 'First Contentful Paint (FCP)', threshold: 2500, impact: 'medium' },
      { id: 'largest-contentful-paint', name: 'Largest Contentful Paint (LCP)', threshold: 4000, impact: 'high' },
      { id: 'total-blocking-time', name: 'Total Blocking Time (TBT)', threshold: 600, impact: 'high' },
      { id: 'cumulative-layout-shift', name: 'Cumulative Layout Shift (CLS)', threshold: 0.25, impact: 'medium' },
      { id: 'speed-index', name: 'Speed Index', threshold: 4000, impact: 'medium' },
    ];

    for (const auditDef of perfAudits) {
      const audit = audits[auditDef.id];
      if (audit && audit.score !== null && audit.score < 0.5) {
        const value = audit.numericValue
          ? (auditDef.id === 'cumulative-layout-shift' ? audit.numericValue.toFixed(3) : `${Math.round(audit.numericValue)}ms`)
          : 'poor';
        issues.push({
          type: 'warning',
          message: `${auditDef.name} is poor (${value})`,
          impact: auditDef.impact,
          detail: audit.title,
        });
      }
    }

  } catch (err) {
    return {
      tool: 'performance',
      status: 'error',
      score: 0,
      data: {},
      issues: [{ type: 'error', message: `Performance audit failed: ${err.message}`, impact: 'high' }],
    };
  } finally {
    await releaseBrowser();
  }

  score = Math.min(100, Math.max(0, score));

  return {
    tool: 'performance',
    status: 'success',
    score,
    data,
    issues,
  };
}
