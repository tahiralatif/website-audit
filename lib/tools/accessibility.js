import { AxePuppeteer } from '@axe-core/puppeteer';
import { getBrowser, releaseBrowser } from '../browser.js';

const TIMEOUT = 30000;

const IMPACT_WEIGHTS = {
  critical: 40,
  serious: 25,
  moderate: 10,
  minor: 5,
};

const FOCUS_RULES = [
  'color-contrast',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-allowed-attr',
  'aria-prohibited-attr',
  'aria-input-field-name',
  'aria-toggle-field-name',
  'aria-prohibited-role',
  'aria-text',
  'label',
  'label-title-only',
  'frame-title',
  'button-name',
  'link-name',
  'image-alt',
  'input-button-name',
  'select-name',
  'region',
];

export async function accessibilityAudit(url) {
  const issues = [];
  const data = {};
  let score = 100;

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: TIMEOUT });
    } catch {
      await page.goto(url, { waitUntil: 'load', timeout: TIMEOUT });
    }
    clearTimeout(timer);

    const results = await new AxePuppeteer(page)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();

    await page.close();

    const violations = results.violations || [];
    const passes = results.passes || [];
    const incomplete = results.incomplete || [];

    data.violations = violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodesCount: v.nodes.length,
      tags: v.tags,
    }));

    data.passesCount = passes.length;
    data.incompleteCount = incomplete.length;

    // Calculate score from violations
    let totalDeduction = 0;
    for (const violation of violations) {
      const weight = IMPACT_WEIGHTS[violation.impact] || 10;
      totalDeduction += weight * Math.min(violation.nodes.length, 5);
    }
    score = Math.max(0, 100 - totalDeduction);

    // Generate issues — focus on contrast, ARIA, and label rules
    const contrastViolations = violations.filter(v => v.id === 'color-contrast');
    for (const v of contrastViolations) {
      issues.push({
        type: 'error',
        message: `Color contrast issue: ${v.help} (${v.nodes.length} elements)`,
        impact: v.impact === 'critical' ? 'critical' : 'high',
        detail: v.description,
      });
    }

    for (const violation of violations) {
      if (FOCUS_RULES.includes(violation.id) && violation.id !== 'color-contrast') {
        const isAria = violation.id.startsWith('aria-');
        issues.push({
          type: 'error',
          message: isAria
            ? `ARIA issue: ${violation.help} (${violation.nodes.length} elements)`
            : `Accessibility issue: ${violation.help} (${violation.nodes.length} elements)`,
          impact: violation.impact === 'critical' ? 'critical' : violation.impact === 'serious' ? 'high' : 'medium',
          detail: violation.description,
        });
      }
    }

    // Report other violations too
    for (const violation of violations) {
      if (!FOCUS_RULES.includes(violation.id) && violation.id !== 'color-contrast') {
        issues.push({
          type: 'warning',
          message: `${violation.help} (${violation.nodes.length} elements)`,
          impact: violation.impact === 'critical' ? 'high' : violation.impact === 'serious' ? 'medium' : 'low',
          detail: violation.description,
        });
      }
    }

  } catch (err) {
    return {
      tool: 'accessibility',
      status: 'error',
      score: 0,
      data: {},
      issues: [{ type: 'error', message: `Accessibility audit failed: ${err.message}`, impact: 'high' }],
    };
  } finally {
    await releaseBrowser();
  }

  return {
    tool: 'accessibility',
    status: 'success',
    score,
    data,
    issues,
  };
}
