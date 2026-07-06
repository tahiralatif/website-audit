const CATEGORY_WEIGHTS = {
  seo: 0.25,
  performance: 0.30,
  security: 0.25,
  accessibility: 0.20,
};

const GRADE_THRESHOLDS = [
  { min: 90, label: 'A', color: '#22c55e', text: 'Excellent' },
  { min: 80, label: 'B', color: '#84cc16', text: 'Good' },
  { min: 60, label: 'C', color: '#eab308', text: 'Fair' },
  { min: 40, label: 'D', color: '#f97316', text: 'Poor' },
  { min: 0, label: 'F', color: '#ef4444', text: 'Critical' },
];

const SUGGESTION_TEMPLATES = {
  'Missing <title> tag': {
    suggestion: 'Add a descriptive <title> tag (30-60 characters) that includes primary keywords and accurately describes the page content.',
    effort: 'low',
  },
  'Missing meta description': {
    suggestion: 'Add a meta description (120-160 characters) summarizing the page content. This appears in search results and impacts CTR.',
    effort: 'low',
  },
  'Missing canonical URL': {
    suggestion: 'Add a <link rel="canonical"> tag pointing to the preferred URL version to prevent duplicate content issues.',
    effort: 'low',
  },
  'Missing <h1> heading': {
    suggestion: 'Add one <h1> heading that clearly describes the page topic. Each page should have exactly one h1.',
    effort: 'low',
  },
  'Missing Open Graph': {
    suggestion: 'Add Open Graph meta tags (og:title, og:description, og:image) to control how your page appears when shared on social media.',
    effort: 'low',
  },
  'robots.txt not found': {
    suggestion: 'Create a robots.txt file at the root of your domain to manage search engine crawler access to your site.',
    effort: 'medium',
  },
  'sitemap.xml': {
    suggestion: 'Create and submit an XML sitemap to search engines to help them discover and index your pages more efficiently.',
    effort: 'medium',
  },
  'alt text': {
    suggestion: 'Add descriptive alt text to all images. Alt text improves accessibility for screen readers and helps search engines understand image content.',
    effort: 'medium',
  },
  'heading hierarchy': {
    suggestion: 'Fix the heading hierarchy so it follows a logical order (h1 → h2 → h3) without skipping levels. This improves both SEO and accessibility.',
    effort: 'medium',
  },
  'lang attribute': {
    suggestion: 'Add a lang attribute to the <html> tag (e.g., lang="en") to specify the page language for browsers and screen readers.',
    effort: 'low',
  },
  'SSL certificate expired': {
    suggestion: 'Renew your SSL certificate immediately. An expired certificate will cause browsers to show security warnings and users may leave your site.',
    effort: 'high',
  },
  'SSL certificate mismatch': {
    suggestion: 'Update your SSL certificate to include the correct domain name in the Subject Alternative Names (SANs).',
    effort: 'high',
  },
  'self-signed': {
    suggestion: 'Replace the self-signed certificate with one from a trusted Certificate Authority (Let\'s Encrypt offers free certificates).',
    effort: 'medium',
  },
  'Missing Strict-Transport-Security': {
    suggestion: 'Enable HTTP Strict Transport Security (HSTS) by adding the Strict-Transport-Security header. This forces browsers to always use HTTPS.',
    effort: 'medium',
  },
  'Missing Content-Security-Policy': {
    suggestion: 'Implement a Content Security Policy (CSP) header to protect against XSS attacks by controlling which resources can be loaded.',
    effort: 'high',
  },
  'Missing X-Frame-Options': {
    suggestion: 'Add the X-Frame-Options header (or use CSP frame-ancestors) to prevent clickjacking attacks by controlling if your page can be embedded in iframes.',
    effort: 'low',
  },
  'Missing X-Content-Type-Options': {
    suggestion: 'Add the X-Content-Type-Options: nosniff header to prevent MIME type sniffing attacks.',
    effort: 'low',
  },
  'Missing Referrer-Policy': {
    suggestion: 'Add a Referrer-Policy header to control how much referrer information is included with requests from your site.',
    effort: 'low',
  },
  'Performance': {
    suggestion: 'Optimize page performance by compressing images, minifying CSS/JS, leveraging browser caching, and using a CDN.',
    effort: 'medium',
  },
  'LCP': {
    suggestion: 'Improve Largest Contentful Paint (LCP) by optimizing images, preloading key resources, and reducing server response times.',
    effort: 'medium',
  },
  'FCP': {
    suggestion: 'Improve First Contentful Paint (FCP) by eliminating render-blocking resources and reducing server response times.',
    effort: 'medium',
  },
  'color-contrast': {
    suggestion: 'Increase the color contrast between text and background colors to meet WCAG AA standards (minimum ratio 4.5:1 for normal text).',
    effort: 'medium',
  },
  'ARIA': {
    suggestion: 'Fix ARIA attributes to ensure they are used correctly. Invalid ARIA can actually harm accessibility instead of helping it.',
    effort: 'medium',
  },
  'landmark': {
    suggestion: 'Add ARIA landmark roles (banner, navigation, main, complementary, contentinfo) to help screen reader users navigate your page.',
    effort: 'medium',
  },
  'default': {
    suggestion: 'Review and fix this issue following best practices for web development.',
    effort: 'medium',
  },
};

function matchTemplate(issue) {
  const msg = issue.message;
  const cat = issue.category;

  if (msg.includes('<title>') || msg.includes('Missing <title>')) {
    return SUGGESTION_TEMPLATES['Missing <title> tag'];
  }
  if (msg.includes('meta description')) {
    return SUGGESTION_TEMPLATES['Missing meta description'];
  }
  if (msg.includes('Missing canonical')) {
    return SUGGESTION_TEMPLATES['Missing canonical URL'];
  }
  if (msg.includes('Missing <h1>')) {
    return SUGGESTION_TEMPLATES['Missing <h1> heading'];
  }
  if (msg.includes('Open Graph') || msg.includes('og:title')) {
    return SUGGESTION_TEMPLATES['Missing Open Graph'];
  }
  if (msg.includes('robots.txt')) {
    return SUGGESTION_TEMPLATES['robots.txt not found'];
  }
  if (msg.includes('sitemap.xml')) {
    return SUGGESTION_TEMPLATES['sitemap.xml'];
  }
  if (msg.includes('alt text') || msg.includes('alt tag') || msg.includes('missing alt')) {
    return SUGGESTION_TEMPLATES['alt text'];
  }
  if (msg.includes('heading hierarchy') || msg.includes('Heading hierarchy')) {
    return SUGGESTION_TEMPLATES['heading hierarchy'];
  }
  if (msg.includes('lang attribute') || msg.includes('Missing lang')) {
    return SUGGESTION_TEMPLATES['lang attribute'];
  }
  if (msg.includes('SSL certificate expired') || msg.includes('expired on')) {
    return SUGGESTION_TEMPLATES['SSL certificate expired'];
  }
  if (msg.includes('certificate does not match') || msg.includes('mismatch')) {
    return SUGGESTION_TEMPLATES['SSL certificate mismatch'];
  }
  if (msg.includes('self-signed')) {
    return SUGGESTION_TEMPLATES['self-signed'];
  }
  if (msg.includes('Strict-Transport-Security') || msg.includes('HSTS')) {
    return SUGGESTION_TEMPLATES['Missing Strict-Transport-Security'];
  }
  if (msg.includes('Content-Security-Policy') || msg.includes('CSP')) {
    return SUGGESTION_TEMPLATES['Missing Content-Security-Policy'];
  }
  if (msg.includes('X-Frame-Options')) {
    return SUGGESTION_TEMPLATES['Missing X-Frame-Options'];
  }
  if (msg.includes('X-Content-Type-Options')) {
    return SUGGESTION_TEMPLATES['Missing X-Content-Type-Options'];
  }
  if (msg.includes('Referrer-Policy')) {
    return SUGGESTION_TEMPLATES['Missing Referrer-Policy'];
  }
  if (msg.includes('LCP') || msg.includes('Largest Contentful')) {
    return SUGGESTION_TEMPLATES['LCP'];
  }
  if (msg.includes('FCP') || msg.includes('First Contentful')) {
    return SUGGESTION_TEMPLATES['FCP'];
  }
  if (msg.includes('Performance')) {
    return SUGGESTION_TEMPLATES['Performance'];
  }
  if (msg.includes('contrast') || msg.includes('color-contrast')) {
    return SUGGESTION_TEMPLATES['color-contrast'];
  }
  if (msg.includes('ARIA') || msg.includes('aria-')) {
    return SUGGESTION_TEMPLATES['ARIA'];
  }
  if (msg.includes('landmark') || msg.includes('Landmark')) {
    return SUGGESTION_TEMPLATES['landmark'];
  }
  return SUGGESTION_TEMPLATES['default'];
}

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function prioritizeIssues(issues) {
  return [...issues].sort((a, b) => {
    const aP = PRIORITY_ORDER[a.impact] ?? 3;
    const bP = PRIORITY_ORDER[b.impact] ?? 3;
    if (aP !== bP) return aP - bP;
    return a.category.localeCompare(b.category);
  });
}

function getGrade(score) {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return { label: t.label, color: t.color, text: t.text };
  }
  return GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
}

export function generateReport(auditResult) {
  const { results, categoryResults, allIssues } = auditResult;

  const overallScore = Math.round(
    (categoryResults.seo?.score || 0) * CATEGORY_WEIGHTS.seo +
    (categoryResults.performance?.score || 0) * CATEGORY_WEIGHTS.performance +
    (categoryResults.security?.score || 0) * CATEGORY_WEIGHTS.security +
    (categoryResults.accessibility?.score || 0) * CATEGORY_WEIGHTS.accessibility
  );

  const prioritized = prioritizeIssues(allIssues);
  const suggestions = prioritized.map(issue => {
    const template = matchTemplate(issue);
    return {
      category: issue.category,
      message: issue.message,
      impact: issue.impact,
      priority: PRIORITY_ORDER[issue.impact] ?? 3,
      suggestion: template.suggestion,
      effort: template.effort,
    };
  });

  const categories = {};
  for (const [name, result] of Object.entries(categoryResults)) {
    categories[name] = {
      score: result.score,
      grade: getGrade(result.score),
      status: result.status,
    };
  }

  return {
    overallScore,
    overallGrade: getGrade(overallScore),
    categories,
    suggestions,
    summary: {
      totalIssues: allIssues.length,
      criticalIssues: allIssues.filter(i => i.impact === 'critical').length,
      highIssues: allIssues.filter(i => i.impact === 'high').length,
      mediumIssues: allIssues.filter(i => i.impact === 'medium').length,
      lowIssues: allIssues.filter(i => i.impact === 'low').length,
    },
  };
}
