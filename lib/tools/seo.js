import * as cheerio from 'cheerio';

const TIMEOUT = 15000;

function normalizeUrl(url) {
  const u = new URL(url);
  u.hash = '';
  return u;
}

async function fetchWithTimeout(url, timeout = TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function seoAudit(url) {
  const issues = [];
  const data = {};
  let score = 0;

  try {
    const u = normalizeUrl(url);
    const res = await fetchWithTimeout(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    // --- Title ---
    const title = $('title').first().text().trim();
    data.title = title || null;
    if (!title) {
      issues.push({ type: 'error', message: 'Missing <title> tag', impact: 'critical' });
    } else {
      score += 10;
      if (title.length < 30 || title.length > 60) {
        issues.push({ type: 'warning', message: `Title length is ${title.length} chars (recommended: 30-60)`, impact: 'medium' });
      }
    }

    // --- Meta description ---
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    data.metaDescription = metaDesc || null;
    if (!metaDesc) {
      issues.push({ type: 'error', message: 'Missing meta description', impact: 'high' });
    } else {
      score += 10;
      if (metaDesc.length < 120 || metaDesc.length > 160) {
        issues.push({ type: 'warning', message: `Meta description length is ${metaDesc.length} chars (recommended: 120-160)`, impact: 'medium' });
      }
    }

    // --- Meta keywords ---
    const metaKeywords = $('meta[name="keywords"]').attr('content') || null;
    data.metaKeywords = metaKeywords;

    // --- Viewport ---
    const viewport = $('meta[name="viewport"]').attr('content') || null;
    data.viewport = viewport;
    if (viewport) score += 5;

    // --- Canonical ---
    const canonical = $('link[rel="canonical"]').attr('href') || null;
    data.canonical = canonical;
    if (!canonical) {
      issues.push({ type: 'warning', message: 'Missing canonical URL', impact: 'medium' });
    } else {
      score += 10;
    }

    // --- Open Graph ---
    const ogTags = {};
    $('meta[property^="og:"]').each((_, el) => {
      const prop = $(el).attr('property').replace('og:', '');
      ogTags[prop] = $(el).attr('content');
    });
    data.openGraph = Object.keys(ogTags).length ? ogTags : null;
    if (!ogTags.og?.title && !ogTags.title) {
      issues.push({ type: 'warning', message: 'Missing Open Graph title tag', impact: 'medium' });
    } else {
      score += 3;
    }
    if (!ogTags.og?.description && !ogTags.description) {
      issues.push({ type: 'warning', message: 'Missing Open Graph description tag', impact: 'medium' });
    } else {
      score += 3;
    }
    if (!ogTags.og?.image && !ogTags.image) {
      issues.push({ type: 'warning', message: 'Missing Open Graph image tag', impact: 'low' });
    } else {
      score += 4;
    }

    // --- Twitter Card ---
    const twitterTags = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name').replace('twitter:', '');
      twitterTags[name] = $(el).attr('content');
    });
    data.twitterCard = Object.keys(twitterTags).length ? twitterTags : null;

    // --- Headings ---
    const headings = {};
    let prevLevel = 0;
    let headingIssues = 0;
    for (let level = 1; level <= 6; level++) {
      const count = $(`h${level}`).length;
      headings[`h${level}`] = count;
      if (level === 1 && count === 0) {
        issues.push({ type: 'error', message: 'Missing <h1> heading', impact: 'critical' });
        headingIssues++;
      }
      if (level === 1 && count > 1) {
        issues.push({ type: 'warning', message: `Found ${count} <h1> headings (recommended: 1)`, impact: 'high' });
        headingIssues++;
      }
      // Check hierarchy skipping
      if (count > 0 && prevLevel > 0 && level > prevLevel + 1) {
        issues.push({ type: 'warning', message: `Heading hierarchy skipped from h${prevLevel} to h${level}`, impact: 'medium' });
        headingIssues++;
      }
      if (count > 0) prevLevel = level;
    }
    data.headings = headings;
    if (headingIssues === 0) score += 10;

    // --- Images / Alt tags ---
    let totalImages = 0;
    let missingAlt = 0;
    $('img').each((_, el) => {
      totalImages++;
      const alt = $(el).attr('alt');
      if (alt === undefined || alt.trim() === '') missingAlt++;
    });
    data.images = { total: totalImages, missingAlt };
    if (totalImages > 0) {
      const altScore = Math.round((1 - missingAlt / totalImages) * 10);
      score += altScore;
      if (missingAlt > 0) {
        issues.push({ type: 'warning', message: `${missingAlt} of ${totalImages} images missing alt text`, impact: 'high' });
      }
    }

    // --- robots.txt ---
    try {
      const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
      const robotsRes = await fetchWithTimeout(robotsUrl);
      const robotsText = await robotsRes.text();
      const isRobotsTxt = /^(User-agent|Sitemap|Allow|Disallow|Crawl-delay)/im.test(robotsText.trim());
      data.robotsTxt = isRobotsTxt ? robotsText.slice(0, 1000) : null;
      if (robotsRes.ok && isRobotsTxt) {
        score += 10;
        const sitemapMatch = robotsText.match(/Sitemap:\s*(\S+)/i);
        data.robotsTxtSitemapRef = sitemapMatch ? sitemapMatch[1] : null;
      } else if (!isRobotsTxt) {
        issues.push({ type: 'warning', message: 'robots.txt not found or returns non-standard content', impact: 'medium' });
      }
    } catch {
      issues.push({ type: 'warning', message: 'Could not fetch robots.txt', impact: 'medium' });
    }

    // --- sitemap.xml ---
    try {
      const sitemapUrl = `${u.protocol}//${u.host}/sitemap.xml`;
      const sitemapRes = await fetchWithTimeout(sitemapUrl);
      const sitemapText = await sitemapRes.text();
      if (sitemapRes.ok && sitemapText.includes('<urlset') || sitemapText.includes('<sitemapindex')) {
        data.sitemapXml = { exists: true, size: sitemapText.length };
        score += 10;
      } else {
        data.sitemapXml = { exists: false };
        issues.push({ type: 'warning', message: 'sitemap.xml exists but appears invalid', impact: 'medium' });
      }
    } catch {
      issues.push({ type: 'warning', message: 'Could not fetch sitemap.xml', impact: 'medium' });
    }

    // --- Language ---
    const lang = $('html').attr('lang');
    data.lang = lang || null;
    if (!lang) {
      issues.push({ type: 'warning', message: 'Missing lang attribute on <html>', impact: 'low' });
    } else {
      score += 5;
    }

  } catch (err) {
    return {
      tool: 'seo',
      status: 'error',
      score: 0,
      data: {},
      issues: [{ type: 'error', message: `SEO audit failed: ${err.message}`, impact: 'critical' }],
    };
  }

  score = Math.min(100, Math.max(0, score));

  return {
    tool: 'seo',
    status: 'success',
    score,
    data,
    issues,
  };
}
