'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers';
import { SuperAdminLink } from '@/components/navigation/SuperAdminLink';
import { listActivities } from '@/lib/activity-api';
import type { ActivityResponse } from '@/lib/activity-api';

export default function ActivityPage() {
  const { isInitialized, isAuthenticated } = useAuth();
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit] = useState(50);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listActivities({ limit });
      setActivities(data.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load activity.');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isInitialized, isAuthenticated, load]);

  if (!isInitialized || isLoading) {
    return (
      <main className="lab-loading-page">
        <span className="lab-loading-mark">AF</span>
        <div>
          <p>Executive OS</p>
          <strong>Loading activity</strong>
          <i />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="lab-error-page">
        <section>
          <p>Executive OS</p>
          <h1>Activity unavailable</h1>
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>Retry</button>
        </section>
      </main>
    );
  }

  return (
    <main className="portfolio-lab">
      <aside className="lab-sidebar">
        <Link className="lab-mark" href="/">
          <i>AF</i>
          <span>ARIMA<br />EXECUTIVE OS</span>
        </Link>
        <div className="lab-nav-label">Workspace</div>
        <nav>
          <Link href="/dashboard"><i>01</i>Dashboard</Link>
          <Link href="/projects"><i>02</i>Projects</Link>
          <Link href="/tasks"><i>03</i>Tasks</Link>
          <Link className="active" href="/activity"><i>04</i>Activity</Link>
          <SuperAdminLink href="/executive"><i>05</i>Executive mode</SuperAdminLink>
          <Link href="/growth-studio"><i>06</i>Growth studio</Link>
        </nav>
      </aside>

      <section className="lab-content">
        <header className="lab-topbar">
          <div><span>Executive OS</span><b>/ activity</b></div>
          <div><i />Live backend data</div>
        </header>

        <div className="lab-hero">
          <div>
            <p className="lab-eyebrow">Workspace</p>
            <h1>Activity</h1>
            <p>Recent workspace events and audit history.</p>
          </div>
          <div>
            <button type="button" onClick={() => void load()}>Refresh</button>
          </div>
        </div>

        <section className="lab-panel">
          <p className="lab-eyebrow">Feed</p>
          <h2>Recent activity</h2>
          {activities.length === 0 ? (
            <p className="lab-muted">No activity found.</p>
          ) : (
            <ul className="holding-strip">
              {activities.map((item) => (
                <li key={item.id}>
                  <strong>{item.action}</strong>
                  <small>{item.entity}</small>
                  <small>{new Date(item.timestamp).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="lab-footer">Arima Executive OS · Activity is scoped to your permitted access.</footer>
      </section>
    </main>
  );
}
