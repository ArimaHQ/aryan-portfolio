'use client';

import Link from 'next/link';
import MarketIntelligencePanel from "./MarketIntelligencePanel";
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/providers';
import {
  getWorkspaceDashboardSummary,
  type WorkspaceDashboardSummary,
} from '@/lib/dashboard-api';

const labelFor = (value: string) => value.replaceAll('_', ' ');

const displayDate = (value: string) => new Intl.DateTimeFormat(
  'en-GB',
  { dateStyle: 'medium', timeStyle: 'short' },
).format(new Date(value));

function Metric({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  return (
    <article className="lab-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={tone === 'neutral' ? undefined : tone}>{detail}</small>
    </article>
  );
}

function Distribution({
  title,
  values,
  total,
}: {
  title: string;
  values: Record<string, number>;
  total: number;
}) {
  const entries = Object.entries(values).sort(([left], [right]) => left.localeCompare(right));
  return (
    <section className="lab-panel">
      <p className="lab-eyebrow">Live status</p>
      <h2>{title}</h2>
      <div className="allocation-list">
        {entries.map(([status, count]) => {
          const share = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={status}>
              <div>
                <span>{labelFor(status)}</span>
                <strong>{count} · {share.toFixed(0)}%</strong>
              </div>
              <i><b style={{ width: `${share}%` }} /></i>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function WorkspaceDashboard() {
  const { isAuthenticated, isInitialized, user } = useAuth();
  const [summary, setSummary] = useState<WorkspaceDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSummary(await getWorkspaceDashboardSummary());
    } catch (cause) {
      setSummary(null);
      setError(cause instanceof Error ? cause.message : 'Unable to load your workspace dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    // Defer the network request until after effect setup. This keeps the
    // effect focused on synchronising the authenticated dashboard lifecycle,
    // while `load` remains reusable by the explicit retry action.
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [isAuthenticated, isInitialized, load]);

  if (!isInitialized || isLoading) {
    return (
      <main className="lab-loading-page">
        <span className="lab-loading-mark">AF</span>
        <div>
          <p>Executive OS</p>
          <strong>Loading your workspace dashboard</strong>
          <i />
        </div>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="lab-error-page">
        <section>
          <p>Executive OS</p>
          <h1>Your workspace dashboard is unavailable.</h1>
          <p>{error ?? 'Please try again in a moment.'}</p>
          <button type="button" onClick={() => void load()}>Retry dashboard</button>
        </section>
      </main>
    );
  }

  const completion = `${(summary.completionRate * 100).toFixed(0)}%`;
  const overdueDetail = summary.overdueTasks > 0
    ? `${summary.overdueRate * 100}% of all tasks`
    : 'No overdue tasks';

  return (
    <main className="portfolio-lab">
      <aside className="lab-sidebar">
        <Link className="lab-mark" href="/"><i>AF</i><span>ARIMA<br />EXECUTIVE OS</span></Link>
        <div className="lab-nav-label">Workspace</div>
        <nav>
          <Link className="active" href="/dashboard"><i>01</i>Dashboard</Link>
          <Link href="/executive"><i>02</i>Executive mode</Link>
          <Link href="/growth-studio"><i>03</i>Growth studio</Link>
        </nav>
        <div className="lab-sidebar-foot">
          <span>Signed in as</span>
          <strong>{user?.name ?? user?.email ?? 'Arima member'}</strong>
        </div>
      </aside>
      <section className="lab-content">
        <header className="lab-topbar">
          <div><span>Executive OS</span><b>/ workspace dashboard</b></div>
          <div><i />Live backend data</div>
        </header>
        <div className="lab-hero">
          <div>
            <p className="lab-eyebrow">Authenticated workspace intelligence</p>
            <h1>Clarity across your operating system.</h1>
            <p>Projects, tasks, and activity are loaded from your permitted Arima data.</p>
          </div>
          <div className="lab-state">
            <span>Last generated</span>
            <strong>{displayDate(summary.generatedAt)}</strong>
            <p>{displayDate(summary.rangeStart)} — {displayDate(summary.rangeEnd)}</p>
          </div>
        </div>
        <div className="metric-grid">
          <Metric label="Active projects" value={String(summary.activeProjects)} detail={`${summary.totalProjects} total projects`} />
          <Metric label="Task completion" value={completion} detail={`${summary.completedTasks} completed`} tone="positive" />
          <Metric label="Overdue tasks" value={String(summary.overdueTasks)} detail={overdueDetail} tone={summary.overdueTasks > 0 ? 'negative' : 'positive'} />
          <Metric label="Active collaborators" value={String(summary.activeUsers)} detail={`${summary.recentActivityCount} recent activities`} />
        </div>
        <div className="lab-layout">
          <Distribution title="Project status" values={summary.projectsByStatus} total={summary.totalProjects} />
          <Distribution title="Task status" values={summary.tasksByStatus} total={summary.totalTasks} />
        </div>
        <section className="lab-panel">
          <p className="lab-eyebrow">Operating signals</p>
          <h2>Where attention is needed</h2>
          <div className="holding-strip">
            <div><span>Due next 7 days</span><strong>{summary.tasksDueNext7Days}</strong><small>Tasks approaching their deadline</small></div>
            <div><span>Due next 30 days</span><strong>{summary.tasksDueNext30Days}</strong><small>Upcoming planned work</small></div>
            <div><span>Unassigned tasks</span><strong>{summary.unassignedTasks}</strong><small>Work awaiting ownership</small></div>
            <div><span>Avg. completion</span><strong>{summary.averageCompletionTimeHours.toFixed(1)}h</strong><small>Across completed workspace tasks</small></div>
          </div>
        </section>
        <MarketIntelligencePanel />
        <footer className="lab-footer">Arima Executive OS · Live backend data is scoped to your permitted access.</footer>
      </section>
    </main>
  );
}
