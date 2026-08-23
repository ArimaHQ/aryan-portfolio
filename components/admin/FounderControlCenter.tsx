'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiClientError } from '@/lib/api-client';
import {
  createFounderDataFeedObservation,
  getFounderDataFeeds,
  getFounderCircuit,
  getFounderCustomer,
  getFounderSystemHealth,
  searchFounderCustomers,
  setFounderCircuit,
  type FounderDataFeed,
  type FounderDataFeeds,
  type FounderHealthComponent,
  type FounderSystemHealth,
  type FounderCircuitState,
  type FounderCustomerDetail,
  type FounderCustomerSummary,
} from '@/lib/founder-api';
import styles from './FounderControlCenter.module.css';

type LoadFailure = {
  status?: number;
  message: string;
};

const displayDate = (value: string | null) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
};

const errorFrom = (cause: unknown, fallback: string): LoadFailure => {
  if (cause instanceof ApiClientError) return { status: cause.status, message: cause.message };
  if (cause instanceof Error) return { message: cause.message };
  return { message: fallback };
};

const titleCase = (value: string) => value.replaceAll('_', ' ');

function StatusBadge({ value }: { value: string }) {
  const tone = value === 'operational' || value === 'live' || value === 'current' || value === 'enabled'
    ? 'positive'
    : value === 'configuration_required' || value === 'manual' || value === 'stale' || value === 'paused'
      ? 'warning'
      : 'negative';
  return <span className={`${styles.badge} ${styles[tone]}`}>{titleCase(value)}</span>;
}

function Configuration({ label, state, environment }: FounderHealthComponent['configuration'] & { label: string }) {
  return (
    <div className={styles.configuration}>
      <div className={styles.configurationHeader}>
        <span>{label}</span>
        <StatusBadge value={state} />
      </div>
      {environment.length > 0 ? (
        <ul>
          {environment.map((item) => (
            <li key={item.name}>
              <span>{item.name}</span>
              <strong className={item.present ? styles.configured : styles.notConfigured}>
                {item.present ? 'Present' : 'Not configured'}
              </strong>
            </li>
          ))}
        </ul>
      ) : <p>No environment requirements are reported for this component.</p>}
    </div>
  );
}

function HealthCard({ component }: { component: FounderHealthComponent }) {
  return (
    <article className={styles.healthCard}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.kicker}>System component</span>
          <h2>{component.label}</h2>
        </div>
        <StatusBadge value={component.status} />
      </div>
      <dl className={styles.metaList}>
        <div><dt>Provider</dt><dd>{component.provider ?? 'Not reported'}</dd></div>
        <div><dt>Latency</dt><dd>{component.latencyMs === null ? 'Not measured' : `${component.latencyMs.toFixed(2)} ms`}</dd></div>
        <div><dt>Checked</dt><dd>{displayDate(component.checkedAt)}</dd></div>
      </dl>
      {component.message ? <p className={styles.message}>{component.message}</p> : null}
      <Configuration label="Configuration" {...component.configuration} />
    </article>
  );
}

function FeedCard({ feed }: { feed: FounderDataFeed }) {
  return (
    <article className={styles.feedCard}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.kicker}>Data-feed provenance</span>
          <h2>{feed.label}</h2>
        </div>
        <div className={styles.badgeGroup}>
          <StatusBadge value={feed.status} />
          <StatusBadge value={feed.freshness} />
        </div>
      </div>
      <dl className={styles.metaList}>
        <div><dt>Provider</dt><dd>{feed.provider ?? 'Not configured'}</dd></div>
        <div><dt>Last observed</dt><dd>{displayDate(feed.lastUpdatedAt)}</dd></div>
        <div><dt>Expires</dt><dd>{displayDate(feed.expiresAt)}</dd></div>
        <div><dt>Entered by</dt><dd>{feed.enteredBy ?? 'No observation recorded'}</dd></div>
      </dl>
      <div className={styles.provenance}>
        <span>Source</span>
        <strong>{feed.source ?? 'No provenance source has been recorded.'}</strong>
        {feed.notes ? <p>{feed.notes}</p> : null}
      </div>
      {feed.errors.length > 0 ? (
        <ul className={styles.errors} aria-label={`${feed.label} contract notices`}>
          {feed.errors.map((error) => <li key={`${error.code}-${error.message}`}><strong>{error.code}</strong>{error.message}</li>)}
        </ul>
      ) : null}
      <Configuration label="Configuration" {...feed.configuration} />
    </article>
  );
}

export function FounderControlCenter() {
  const [health, setHealth] = useState<FounderSystemHealth | null>(null);
  const [feeds, setFeeds] = useState<FounderDataFeeds | null>(null);
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeedKey, setSelectedFeedKey] = useState('');
  const [source, setSource] = useState('');
  const [observedAt, setObservedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState<FounderCustomerSummary[]>([]);
  const [customer, setCustomer] = useState<FounderCustomerDetail | null>(null);
  const [customerFailure, setCustomerFailure] = useState<LoadFailure | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [circuit, setCircuit] = useState<FounderCircuitState | null>(null);
  const [circuitLoading, setCircuitLoading] = useState(false);
  const [circuitFailure, setCircuitFailure] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadFailure(null);
    const [healthResult, feedsResult] = await Promise.allSettled([
      getFounderSystemHealth(),
      getFounderDataFeeds(),
    ]);
    const failures = [healthResult, feedsResult]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => errorFrom(result.reason, 'Founder Control is unavailable.'));

    setHealth(healthResult.status === 'fulfilled' ? healthResult.value : null);
    setFeeds(feedsResult.status === 'fulfilled' ? feedsResult.value : null);
    setLoadFailure(failures[0] ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const manualFeeds = useMemo(
    () => feeds?.feeds.filter((feed) => feed.manualEntrySupported) ?? [],
    [feeds],
  );

  const activeFeedKey = manualFeeds.some((feed) => feed.key === selectedFeedKey)
    ? selectedFeedKey
    : manualFeeds[0]?.key ?? '';

  const submitObservation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormNotice(null);
    if (!activeFeedKey) {
      setFormError('Select a data feed before recording provenance.');
      return;
    }
    const observed = new Date(observedAt);
    const expires = expiresAt ? new Date(expiresAt) : null;
    if (Number.isNaN(observed.valueOf())) {
      setFormError('Enter the observed time in your local timezone.');
      return;
    }
    if (expires && (Number.isNaN(expires.valueOf()) || expires <= observed)) {
      setFormError('Expiry must be later than the observed time.');
      return;
    }
    setIsSubmitting(true);
    try {
      const observation = await createFounderDataFeedObservation(activeFeedKey, {
        source,
        observedAt: observed.toISOString(),
        expiresAt: expires?.toISOString() ?? null,
        notes,
      });
      setSource('');
      setObservedAt('');
      setExpiresAt('');
      setNotes('');
      setFormNotice(`Observation recorded. Correlation ID: ${observation.correlationId}`);
      await load();
    } catch (cause) {
      setFormError(errorFrom(cause, 'Unable to record the observation.').message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchCustomers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = customerQuery.trim();
    if (!query) return;
    setCustomerLoading(true);
    setCustomerFailure(null);
    setCustomer(null);
    try {
      setCustomers(await searchFounderCustomers(query));
    } catch (cause) {
      setCustomerFailure(errorFrom(cause, 'Customer inspection is unavailable.'));
    } finally {
      setCustomerLoading(false);
    }
  };

  const inspectCustomer = async (summary: FounderCustomerSummary) => {
    setCustomerLoading(true);
    setCustomerFailure(null);
    try {
      const detail = await getFounderCustomer(summary.id);
      setCustomer(detail);
      if (detail.workspaceId) setCircuit(await getFounderCircuit(detail.workspaceId));
    } catch (cause) {
      setCustomerFailure(errorFrom(cause, 'Customer inspection is unavailable.'));
    } finally {
      setCustomerLoading(false);
    }
  };

  const toggleCircuit = async () => {
    if (!circuit || !customer?.workspaceId) return;
    const next = circuit.state === 'enabled' ? 'paused' : 'enabled';
    if (!window.confirm(`Change the withdrawal circuit to ${next.toUpperCase()}?`)) return;
    setCircuitLoading(true);
    setCircuitFailure(null);
    try {
      setCircuit(await setFounderCircuit(circuit.workspaceId, next, `Founder Control set ${next}`));
    } catch (cause) {
      setCircuitFailure(errorFrom(cause, 'Circuit breaker update failed.').message);
    } finally {
      setCircuitLoading(false);
    }
  };

  const forbidden = loadFailure?.status === 403;
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>← Executive OS</Link>
        <span>Authenticated operational surface</span>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Founder control</p>
          <h1>System truth, without inferred data.</h1>
          <p>Health and provenance are returned by the authenticated API. This interface does not determine access or synthesize operational results.</p>
        </div>
        <button type="button" className={styles.refresh} onClick={() => void load()} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : 'Refresh status'}
        </button>
      </section>

      {forbidden ? (
        <section className={styles.state} aria-live="polite">
          <p className={styles.eyebrow}>Access restricted</p>
          <h2>Founder authorization is required.</h2>
          <p>{loadFailure?.message ?? 'The server did not authorize this account for Founder Control.'}</p>
          <button type="button" onClick={() => void load()}>Try again</button>
        </section>
      ) : null}

      {!forbidden && loadFailure ? (
        <section className={styles.state} aria-live="polite">
          <p className={styles.eyebrow}>Connection unavailable</p>
          <h2>Founder Control could not load.</h2>
          <p>{loadFailure.message}</p>
          <button type="button" onClick={() => void load()}>Retry</button>
        </section>
      ) : null}

      {!forbidden && !loadFailure && isLoading ? (
        <section className={styles.state} aria-live="polite">
          <p className={styles.eyebrow}>Founder control</p>
          <h2>Loading authenticated system status…</h2>
        </section>
      ) : null}

      {!forbidden && health ? (
        <section className={styles.section} aria-labelledby="health-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>System health</p>
              <h2 id="health-heading">Server-reported component status</h2>
            </div>
            <span>Generated {displayDate(health.generatedAt)}</span>
          </div>
          <div className={styles.healthGrid}>
            {health.components.map((component) => <HealthCard key={component.key} component={component} />)}
          </div>
        </section>
      ) : null}

      {!forbidden && feeds ? (
        <section className={styles.section} aria-labelledby="feeds-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Data feeds</p>
              <h2 id="feeds-heading">Provenance and ingestion readiness</h2>
            </div>
            <span>Generated {displayDate(feeds.generatedAt)}</span>
          </div>
          <div className={styles.feedGrid}>
            {feeds.feeds.map((feed) => <FeedCard key={feed.key} feed={feed} />)}
          </div>
        </section>
      ) : null}

      {!forbidden && feeds && manualFeeds.length > 0 ? (
        <section className={`${styles.section} ${styles.observationSection}`} aria-labelledby="observation-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Manual provenance</p>
              <h2 id="observation-heading">Record source observation</h2>
            </div>
            <span>Creates an immutable, audited provenance record</span>
          </div>
          <form className={styles.form} onSubmit={submitObservation}>
            <label>
              Data feed
              <select value={activeFeedKey} onChange={(event) => setSelectedFeedKey(event.target.value)}>
                {manualFeeds.map((feed) => <option key={feed.key} value={feed.key}>{feed.label}</option>)}
              </select>
            </label>
            <label>
              Source
              <input value={source} onChange={(event) => setSource(event.target.value)} maxLength={500} required placeholder="Verified source reference" />
            </label>
            <label>
              Observed at
              <input type="datetime-local" value={observedAt} onChange={(event) => setObservedAt(event.target.value)} required />
            </label>
            <label>
              Expires at <span>Optional</span>
              <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </label>
            <label className={styles.notes}>
              Notes <span>Optional</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={4} placeholder="Provenance context only — no business metrics are stored here." />
            </label>
            {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
            {formNotice ? <p className={styles.formNotice} role="status">{formNotice}</p> : null}
            <div className={styles.formActions}>
              <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Recording…' : 'Record observation'}</button>
              <p>Submission uses the existing authenticated API, CSRF protection, and server-side founder authorization.</p>
            </div>
          </form>
        </section>
      ) : null}

      {!forbidden ? (
        <section className={styles.section} aria-labelledby="customers-heading">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Customer management</p><h2 id="customers-heading">Inspect an authenticated customer account</h2></div><span>Read-only founder access</span></div>
          <form className={styles.form} onSubmit={searchCustomers}>
            <label>Search by name, email, or account ID<input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="customer@example.com" required /></label>
            <div className={styles.formActions}><button type="submit" disabled={customerLoading}>{customerLoading ? 'Searching…' : 'Search customers'}</button></div>
          </form>
          {customerFailure ? <p className={styles.formError} role="alert">{customerFailure.message}</p> : null}
          {customers.length === 0 && !customerLoading && customerQuery ? <p className={styles.message}>No matching customer accounts.</p> : null}
          {customers.length > 0 ? <ul className={styles.errors} aria-label="Customer results">{customers.map((item) => <li key={item.id}><strong>{item.name}</strong> {item.email} <button type="button" onClick={() => void inspectCustomer(item)}>Inspect</button></li>)}</ul> : null}
          {customer ? <article className={styles.healthCard} aria-label="Customer detail"><div className={styles.cardHeader}><div><span className={styles.kicker}>Authorized inspection</span><h2>{customer.name}</h2><p>{customer.email}</p></div><StatusBadge value={customer.supportStatus} /></div><dl className={styles.metaList}><div><dt>Account</dt><dd>{customer.isActive ? 'Active' : 'Inactive'} · {customer.isVerified ? 'Verified' : 'Unverified'}</dd></div><div><dt>Workspace</dt><dd>{customer.workspaceId ?? 'Unavailable'}</dd></div><div><dt>Withdrawal states</dt><dd>{customer.withdrawalStatuses.join(', ') || 'None recorded'}</dd></div></dl><h3>Portfolio balances</h3>{customer.portfolioBalances.length ? <ul>{customer.portfolioBalances.map((balance) => <li key={balance.asset}>{balance.asset}: {balance.authoritativeBalance} (available {balance.availableBalance})</li>)}</ul> : <p>No balances returned.</p>}</article> : null}
        </section>
      ) : null}

      {!forbidden && customer?.workspaceId && circuit ? (
        <section className={styles.section} aria-labelledby="circuit-heading">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Withdrawal safety control</p><h2 id="circuit-heading">Circuit breaker</h2></div><StatusBadge value={circuit.state} /></div>
          <p>{circuit.reason ?? 'No reason recorded.'} · Changed {displayDate(circuit.changedAt)}</p>
          {circuitFailure ? <p className={styles.formError} role="alert">{circuitFailure}</p> : null}
          <button type="button" onClick={() => void toggleCircuit()} disabled={circuitLoading}>{circuitLoading ? 'Updating…' : circuit.state === 'enabled' ? 'Pause withdrawals' : 'Enable withdrawals'}</button>
          <p className={styles.message}>This control uses the existing server-side Founder authorization, CSRF protection, and WithdrawalService circuit state.</p>
        </section>
      ) : null}
    </main>
  );
}
