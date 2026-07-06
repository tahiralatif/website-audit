import Link from 'next/link';
import styles from './page.module.css';

async function getHistory() {
  const { listAudits } = await import('@/lib/db.js');
  return listAudits(50);
}

function gradeColor(score) {
  if (score >= 90) return '#22c55e';
  if (score >= 80) return '#84cc16';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

export default async function HistoryPage() {
  const audits = await getHistory();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>&larr; Back to Home</Link>
        <h1 className={styles.title}>Audit History</h1>

        {audits.length === 0 ? (
          <div className={styles.empty}>
            <p>No audits yet.</p>
            <Link href="/" className={styles.runBtn}>Run your first audit</Link>
          </div>
        ) : (
          <div className={styles.list}>
            {audits.map((audit) => (
              <Link key={audit.id} href={`/audit/${audit.id}`} className={styles.card}>
                <div className={styles.cardMain}>
                  <span className={styles.cardUrl}>{audit.url}</span>
                  <span className={styles.cardStatus} data-status={audit.status}>
                    {audit.status}
                  </span>
                </div>
                <div className={styles.cardMeta}>
                  <span>{audit.created_at}</span>
                  {audit.results?.report?.overallScore !== undefined && (
                    <span className={styles.cardScore}
                      style={{ color: gradeColor(audit.results.report.overallScore) }}>
                      {audit.results.report.overallScore}/100
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
