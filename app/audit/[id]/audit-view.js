'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';

const CATEGORY_LABELS = {
  seo: 'SEO',
  performance: 'Performance',
  security: 'Security',
  accessibility: 'Accessibility',
};

const GRADE_COLORS = {
  A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444',
};

const IMPACT_LABELS = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
const IMPACT_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#64748b' };

function ScoreRing({ score, size = 140 }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  let grade = 'F', color = GRADE_COLORS.F;
  if (score >= 90) { grade = 'A'; color = GRADE_COLORS.A; }
  else if (score >= 80) { grade = 'B'; color = GRADE_COLORS.B; }
  else if (score >= 60) { grade = 'C'; color = GRADE_COLORS.C; }
  else if (score >= 40) { grade = 'D'; color = GRADE_COLORS.D; }

  return (
    <div className={styles.scoreRing} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className={styles.scoreLabel}>
        <span className={styles.scoreNumber}>{score}</span>
        <span className={styles.scoreGrade} style={{ color }}>{grade}</span>
      </div>
    </div>
  );
}

function ScoreBar({ score, label }) {
  let color = GRADE_COLORS.F;
  if (score >= 90) color = GRADE_COLORS.A;
  else if (score >= 80) color = GRADE_COLORS.B;
  else if (score >= 60) color = GRADE_COLORS.C;
  else if (score >= 40) color = GRADE_COLORS.D;

  return (
    <div className={styles.scoreBar}>
      <div className={styles.scoreBarLabel}>
        <span>{label}</span>
        <span className={styles.scoreBarValue} style={{ color }}>{score}</span>
      </div>
      <div className={styles.scoreBarTrack}>
        <div className={styles.scoreBarFill} style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

function IssueCard({ issue }) {
  const color = IMPACT_COLORS[issue.impact] || '#64748b';
  return (
    <div className={styles.issueCard}>
      <div className={styles.issueHeader}>
        <span className={styles.issueCategory}>{CATEGORY_LABELS[issue.category] || issue.category}</span>
        <span className={styles.issueImpact} style={{ background: color }}>{IMPACT_LABELS[issue.impact] || issue.impact}</span>
      </div>
      <p className={styles.issueMessage}>{issue.message}</p>
      {issue.suggestion && (
        <div className={styles.issueSuggestion}><strong>Fix:</strong> {issue.suggestion}</div>
      )}
      {issue.effort && <span className={styles.issueEffort}>Effort: {issue.effort}</span>}
    </div>
  );
}

function LoadingState({ currentTool, url }) {
  const toolLabel = CATEGORY_LABELS[currentTool] || currentTool || '...';
  return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <h2>Running Audit</h2>
      {url && <p className={styles.auditUrl}>Scanning: <strong>{url}</strong></p>}
      <p>Currently analyzing: <strong>{toolLabel}</strong></p>
      <p className={styles.loadingHint}>This may take up to 2 minutes for a full audit.</p>
    </div>
  );
}

function ErrorState({ error, url }) {
  return (
    <div className={styles.errorState}>
      <h2>Audit {error === 'Audit not found' ? 'Not Found' : 'Failed'}</h2>
      {url && <p className={styles.auditUrl}>{url}</p>}
      <p>{error || 'An unexpected error occurred.'}</p>
      <a href="/" className={styles.retryButton}>Try Again</a>
    </div>
  );
}

function ResultsDashboard({ report, issues, url }) {
  return (
    <div className={styles.results}>
      <div className={styles.overallSection}>
        {url && <p className={styles.auditUrl}>Audited: <strong>{url}</strong></p>}
        <h2>Overall Score</h2>
        <ScoreRing score={report.overallScore} />
        <p className={styles.overallText}>{report.overallGrade.text}</p>
        <div className={styles.summaryBar}>
          <span>Total issues: <strong>{report.summary.totalIssues}</strong></span>
          {report.summary.criticalIssues > 0 && (
            <span className={styles.badge} style={{ background: '#ef4444' }}>{report.summary.criticalIssues} critical</span>
          )}
          {report.summary.highIssues > 0 && (
            <span className={styles.badge} style={{ background: '#f97316' }}>{report.summary.highIssues} high</span>
          )}
        </div>
      </div>

      <div className={styles.categoriesSection}>
        <h2>Category Breakdown</h2>
        <div className={styles.scoreBars}>
          {Object.entries(report.categories).map(([key, cat]) => (
            <ScoreBar key={key} score={cat.score} label={CATEGORY_LABELS[key] || key} />
          ))}
        </div>
      </div>

      <div className={styles.suggestionsSection}>
        <h2>Improvement Suggestions</h2>
        {issues.length === 0 ? (
          <p className={styles.noIssues}>No issues found — great job!</p>
        ) : (
          <div className={styles.issuesList}>
            {issues.map((issue, i) => (
              <IssueCard key={i} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditView({ initialData }) {
  const params = useParams();
  const id = params.id;

  const [audit, setAudit] = useState(initialData);
  const [error, setError] = useState(
    initialData ? null : 'Audit not found'
  );

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch(`/api/audit/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Audit not found');
        return null;
      }
      setAudit(data);
      return data;
    } catch {
      setError('Failed to fetch audit results');
      return null;
    }
  }, [id]);

  useEffect(() => {
    if (!audit || audit.status === 'pending' || audit.status === 'running') {
      let stopped = false;
      let interval;

      async function poll() {
        if (stopped) return;
        const data = await fetchAudit();
        if (data && (data.status === 'completed' || data.status === 'error')) {
          stopped = true;
          clearInterval(interval);
        }
      }

      poll();
      interval = setInterval(poll, 2000);
      return () => { stopped = true; clearInterval(interval); };
    }
  }, [id, fetchAudit, audit?.status]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <a href="/" className={styles.backLink}>&larr; Back to Home</a>
        {error && <ErrorState error={error} url={audit?.url} />}
        {!error && (!audit || audit.status === 'pending' || audit.status === 'running') && (
          <LoadingState currentTool={audit?.currentTool || null} url={audit?.url} />
        )}
        {!error && audit?.status === 'error' && <ErrorState error={audit.error} url={audit.url} />}
        {!error && audit?.status === 'completed' && (
          <ResultsDashboard
            report={audit.results.report}
            issues={audit.results.report.suggestions}
            url={audit.url}
          />
        )}
      </div>
    </div>
  );
}
