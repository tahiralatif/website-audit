'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a website URL');
      return;
    }

    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }

    try {
      new URL(normalized);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }
      router.push(`/audit/${data.auditId}`);
    } catch {
      setError('Failed to submit. Is the server running?');
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Website Audit Portal</h1>
          <p className={styles.subtitle}>
            Get a comprehensive report on SEO, performance, security, and accessibility for any website.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <input
              className={styles.input}
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(''); }}
              disabled={loading}
              autoFocus
            />
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Run Audit'}
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </form>

          <div className={styles.features}>
            <div className={styles.feature}>
              <h3>SEO</h3>
              <p>Meta tags, headings, alt text, sitemap &amp; robots.txt</p>
            </div>
            <div className={styles.feature}>
              <h3>Performance</h3>
              <p>Lighthouse scores, load time, Core Web Vitals</p>
            </div>
            <div className={styles.feature}>
              <h3>Security</h3>
              <p>SSL certificate, security headers audit</p>
            </div>
            <div className={styles.feature}>
              <h3>Accessibility</h3>
              <p>Contrast ratio, ARIA labels, WCAG compliance</p>
            </div>
          </div>

          <Link href="/history" className={styles.historyLink}>View Audit History &rarr;</Link>
        </main>
      </div>
    </div>
  );
}
