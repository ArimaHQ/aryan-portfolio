'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/providers';
import { getCustomerPortfolio, type CustomerPortfolio } from '@/lib/portfolio-api';
import {
  getWorkspaceDashboardSummary,
  type WorkspaceDashboardSummary,
} from '@/lib/dashboard-api';

const labelFor = (value: string) => value.replaceAll('_', ' ');

const displayDate = (value: string) => new Intl.DateTimeFormat(
  'en-GB',
  { dateStyle: 'medium', timeStyle: 'short' },
).format(new Date(value));

const decimalPattern = /^-?\d+(?:\.\d+)?$/;

const money = (value: string, asset: string) => (
  decimalPattern.test(value) ? `${value} ${asset}` : 'Unavailable'
);

const addDecimals = (values: string[]) => {
  if (values.length === 0 || values.some((value) => !decimalPattern.test(value))) return null;
  const scale = Math.max(...values.map((value) => value.split('.')[1]?.length ?? 0));
  const total = values.reduce((sum, value) => {
    const negative = value.startsWith('-');
    const unsigned = negative ? value.slice(1) : value;
    const [whole, fraction = ''] = unsigned.split('.');
    const scaled = BigInt(`${whole}${fraction.padEnd(scale, '0')}`);
    return sum + (negative ? -scaled : scaled);
  }, 0n);
  const negative = total < 0n;
  const absolute = negative ? -total : total;
  const raw = absolute.toString().padStart(scale + 1, '0');
  const whole = scale > 0 ? raw.slice(0, -scale) : raw;
  const fraction = scale > 0 ? raw.slice(-scale).replace(/0+$/, '') : '';
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
};

const activityLabel = (value: string) => value.replaceAll('_', ' ');

function FinancialSurface({ portfolio }: { portfolio: CustomerPortfolio }) {
  const totalPnl = addDecimals(portfolio.positions.flatMap((position) => [position.realizedPnl, position.unrealizedPnl]));
  const pnlAvailable = totalPnl !== null;
  const activity = portfolio.recentLedgerActivity.filter((item) => (
    item.transactionType.toLowerCase().includes('deposit')
    || item.transactionType.toLowerCase().includes('withdraw')
    || item.transactionType.toLowerCase().includes('transfer')
  )).slice(0, 8);

  return (
    <>
      <section className="lab-panel financial-panel" aria-labelledby="financial-overview-title">
        <div className="panel-heading-row">
          <div>
            <p className="lab-eyebrow">Authoritative financial records</p>
            <h2 id="financial-overview-title">Your financial position</h2>
          </div>
          <span className="data-badge"><i /> Backend data</span>
        </div>
        <div className="financial-grid">
          {portfolio.balances.length > 0 ? portfolio.balances.map((balance) => (
            <article className="financial-card" key={balance.asset}>
              <span>{balance.asset} balance</span>
              <strong>{money(balance.authoritativeBalance, balance.asset)}</strong>
              <small>Available {money(balance.availableBalance, balance.asset)}</small>
              <small>Reserved {money(balance.reservedBalance, balance.asset)}</small>
            </article>
          )) : <div className="financial-empty">No balance has been recorded for this account.</div>}
          <article className="financial-card">
            <span>Portfolio P&amp;L</span>
            <strong className={pnlAvailable ? (totalPnl.startsWith('-') ? 'negative' : 'positive') : undefined}>
              {pnlAvailable ? totalPnl : 'Unavailable'}
            </strong>
            <small>{pnlAvailable ? 'From recorded positions only' : 'No position P&L is available'}</small>
          </article>
        </div>
      </section>
      <section className="lab-panel" aria-labelledby="holdings-title">
        <div className="panel-heading-row">
          <div>
            <p className="lab-eyebrow">Recorded positions</p>
            <h2 id="holdings-title">Holdings</h2>
          </div>
        </div>
        {portfolio.positions.length > 0 ? (
          <div className="lab-table">
            <div className="lab-row lab-table-head"><span>Asset</span><span>Quantity</span><span>Average cost</span><span>Unrealized P&amp;L</span></div>
            {portfolio.positions.map((position) => (
              <div className="lab-row" key={position.asset}>
                <span><b>{position.asset}</b><small>Recorded holding</small></span>
                <span>{position.quantity}</span>
                <span>{position.averageCost ?? 'Unavailable'}</span>
                <span className={position.unrealizedPnl.startsWith('-') ? 'negative' : 'positive'}>{position.unrealizedPnl}</span>
              </div>
            ))}
          </div>
        ) : <div className="financial-empty">No holdings have been recorded for this portfolio.</div>}
      </section>
      <section className="lab-panel" aria-labelledby="transactions-title">
        <div className="panel-heading-row">
          <div>
            <p className="lab-eyebrow">Ledger activity</p>
            <h2 id="transactions-title">Deposits, withdrawals &amp; transfers</h2>
          </div>
        </div>
        {activity.length > 0 ? (
          <div className="lab-table">
            <div className="lab-row lab-table-head"><span>Type</span><span>Status</span><span>Reference</span><span>Date</span></div>
            {activity.map((item) => (
              <div className="lab-row" key={item.id}>
                <span><b>{activityLabel(item.transactionType)}</b><small>{item.source}</small></span>
                <span>{item.status}</span>
                <span>{item.reference ?? 'No reference'}</span>
                <span>{displayDate(item.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : <div className="financial-empty">No deposits, withdrawals, or transfers have been recorded.</div>}
      </section>
    </>
  );
}

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
  const { isAuthenticated, isInitialized, user, logout } = useAuth();
  const [summary, setSummary] = useState<WorkspaceDashboardSummary | null>(null);
  const [portfolio, setPortfolio] = useState<CustomerPortfolio | null>(null);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryResult, portfolioResult] = await Promise.allSettled([
        getWorkspaceDashboardSummary(),
        getCustomerPortfolio(),
      ]);
      if (summaryResult.status === 'rejected') throw summaryResult.reason;
      setSummary(summaryResult.value);
      if (portfolioResult.status === 'fulfilled') {
        setPortfolio(portfolioResult.value);
        setPortfolioError(null);
      } else {
        setPortfolio(null);
        setPortfolioError(portfolioResult.reason instanceof Error
          ? portfolioResult.reason.message
          : 'Your financial records are unavailable right now.');
      }
    } catch (cause) {
      setSummary(null);
      setPortfolio(null);
      setPortfolioError(null);
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
  const workspaceMatchesSession = !user?.workspaceId
    || (
      summary.provenance.workspaceId === user.workspaceId
      && (!portfolio || (
        portfolio.workspaceId === user.workspaceId
        && portfolio.userId === user.id
      ))
    );

  if (!workspaceMatchesSession) {
    return (
      <main className="lab-error-page">
        <section>
          <p>Executive OS</p>
          <h1>Your workspace dashboard is unavailable.</h1>
          <p>The returned records did not match the active workspace. No workspace data was displayed.</p>
          <button type="button" onClick={() => void load()}>Retry dashboard</button>
        </section>
      </main>
    );
  }

  return (
    <main className="portfolio-lab">
      <aside className="lab-sidebar">
        <Link className="lab-mark" href="/"><i>AF</i><span>ARIMA<br />EXECUTIVE OS</span></Link>
        <div className="lab-nav-label">Workspace</div>
        <nav>
          <Link className="active" href="/dashboard"><i>01</i>Dashboard</Link>
          <Link href="/executive"><i>03</i>Avatar / AI</Link>
          <Link href="/projects"><i>04</i>Projects</Link>
          <Link href="/tasks"><i>05</i>Tasks</Link>
        </nav>
        <div className="lab-sidebar-foot">
          <span>Signed in as</span>
          <strong>{user?.name ?? user?.email ?? 'Arima member'}</strong>
        </div>
      </aside>
      <section className="lab-content">
        <header className="lab-topbar">
          <div><span>Executive OS</span><b>/ workspace dashboard</b></div>
          <div><i />Authenticated customer data</div>
        </header>
        <div className="lab-hero">
          <div>
            <p className="lab-eyebrow">Authenticated customer dashboard</p>
            <h1>Your financial position, clearly held.</h1>
            <p>Balances, holdings, and ledger activity shown here come from your authenticated backend context.</p>
          </div>
          <div className="lab-state">
            <span>Data provenance</span>
            <strong>Server-persisted customer records</strong>
            <p>Generated {displayDate(summary.generatedAt)} · {displayDate(summary.rangeStart)} — {displayDate(summary.rangeEnd)}</p>
          </div>
        </div>
        {portfolio ? <FinancialSurface portfolio={portfolio} /> : (
          <section className="lab-panel financial-unavailable" aria-labelledby="financial-unavailable-title">
            <p className="lab-eyebrow">Financial records</p>
            <h2 id="financial-unavailable-title">Your financial position is unavailable.</h2>
            <p>{portfolioError ?? 'No financial records are available for this account yet.'}</p>
            <small>No balances, holdings, P&amp;L, or transaction values are being estimated.</small>
          </section>
        )}
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
        <footer className="lab-footer">
          <span>Arima Executive OS · Financial records are scoped by the authenticated API. No simulated values are displayed.</span>
          <button type="button" className="lab-logout" onClick={() => void logout()}>Log out</button>
        </footer>
      </section>
    </main>
  );
}
