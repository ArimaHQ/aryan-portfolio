'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiClientError } from '@/lib/api-client';
import {
  getFounderCustomerPortfolio,
  getFounderCustomerFinancialState,
  getFounderCustomerTrades,
  recordFounderCustomerTrade,
  reverseFounderCustomerTrade,
  type CustomerPortfolio,
  type FounderFinancialState,
  type FounderTrade,
  type FounderTradeInput,
} from '@/lib/portfolio-api';
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

type TradeDraft = Omit<FounderTradeInput, 'idempotency_key'> & { idempotency_key: string };

const newIdempotencyKey = () => globalThis.crypto?.randomUUID?.() ?? `founder-trade-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const newTradeDraft = (): TradeDraft => ({
  side: 'buy',
  base_asset: 'BTC',
  quote_asset: 'USD',
  quantity: '',
  price: '',
  fee_amount: '0',
  executed_at: new Date().toISOString().slice(0, 16),
  reason: 'Founder manual accounting entry: ',
  idempotency_key: newIdempotencyKey(),
});

const displayTrade = (trade: FounderTrade) => (
  `${trade.side.toUpperCase()} ${trade.quantity} ${trade.baseAsset} at ${trade.price} ${trade.quoteAsset}`
);

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
  const [customerPortfolio, setCustomerPortfolio] = useState<CustomerPortfolio | null>(null);
  const [customerFinancialState, setCustomerFinancialState] = useState<FounderFinancialState | null>(null);
  const [customerTrades, setCustomerTrades] = useState<FounderTrade[]>([]);
  const [tradeDraft, setTradeDraft] = useState<TradeDraft>(() => newTradeDraft());
  const [tradeConfirmation, setTradeConfirmation] = useState<TradeDraft | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeNotice, setTradeNotice] = useState<string | null>(null);
  const [tradeMutationLoading, setTradeMutationLoading] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<FounderTrade | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalIdempotencyKey, setReversalIdempotencyKey] = useState('');
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

  const refreshCustomerData = async (userId: string, workspaceId: string | null) => {
    const [detailResult, portfolioResult, financialStateResult, tradesResult, circuitResult] = await Promise.allSettled([
      getFounderCustomer(userId),
      getFounderCustomerPortfolio(userId),
      getFounderCustomerFinancialState(userId),
      getFounderCustomerTrades(userId),
      workspaceId ? getFounderCircuit(workspaceId) : Promise.resolve(null),
    ]);
    if (detailResult.status === 'fulfilled') setCustomer(detailResult.value);
    if (portfolioResult.status === 'fulfilled') setCustomerPortfolio(portfolioResult.value);
    if (financialStateResult.status === 'fulfilled') setCustomerFinancialState(financialStateResult.value);
    if (tradesResult.status === 'fulfilled') setCustomerTrades(tradesResult.value);
    if (circuitResult.status === 'fulfilled' && circuitResult.value) setCircuit(circuitResult.value);
    const failedResult = [detailResult, portfolioResult, financialStateResult, tradesResult, circuitResult].find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failedResult) throw failedResult.reason;
  };

  const inspectCustomer = async (summary: FounderCustomerSummary) => {
    setCustomerLoading(true);
    setCustomerFailure(null);
    setCustomerPortfolio(null);
    setCustomerFinancialState(null);
    setCustomerTrades([]);
    setTradeError(null);
    setTradeNotice(null);
    setTradeConfirmation(null);
    setReversalTarget(null);
    setTradeDraft(newTradeDraft());
    try {
      await refreshCustomerData(summary.id, summary.workspaceId);
    } catch (cause) {
      setCustomerFailure(errorFrom(cause, 'Customer inspection is unavailable.'));
    } finally {
      setCustomerLoading(false);
    }
  };

  const updateTradeDraft = <K extends keyof TradeDraft>(field: K, value: TradeDraft[K]) => {
    setTradeDraft((current) => ({ ...current, [field]: value }));
    setTradeError(null);
    setTradeNotice(null);
  };

  const validateTradeDraft = (draft: TradeDraft): string | null => {
    if (!draft.quantity || Number(draft.quantity) <= 0) return 'Enter a positive quantity.';
    if (!draft.price || Number(draft.price) <= 0) return 'Enter a positive price.';
    if (!draft.fee_amount || Number(draft.fee_amount) < 0) return 'Fee amount cannot be negative.';
    if (!draft.executed_at || Number.isNaN(new Date(draft.executed_at).valueOf())) return 'Enter a valid execution time.';
    if (!draft.reason.trim()) return 'A Founder accounting reason is required.';
    if (draft.idempotency_key.length < 16) return 'The idempotency key is invalid.';
    return null;
  };

  const requestTradeConfirmation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateTradeDraft(tradeDraft);
    if (validationError) {
      setTradeError(validationError);
      return;
    }
    setTradeConfirmation(tradeDraft);
  };

  const recordTrade = async () => {
    if (!customer || !tradeConfirmation) return;
    setTradeMutationLoading(true);
    setTradeError(null);
    setTradeNotice(null);
    try {
      await recordFounderCustomerTrade(customer.id, {
        ...tradeConfirmation,
        executed_at: new Date(tradeConfirmation.executed_at).toISOString(),
        reason: tradeConfirmation.reason.trim(),
        external_execution_id: tradeConfirmation.external_execution_id?.trim() || undefined,
      });
      await refreshCustomerData(customer.id, customer.workspaceId);
      setTradeNotice('Trade recorded and persisted. Portfolio and trade history were refreshed from the backend.');
      setTradeDraft(newTradeDraft());
      setTradeConfirmation(null);
    } catch (cause) {
      setTradeError(errorFrom(cause, 'Trade recording failed. The same idempotency key remains available for retry.').message);
    } finally {
      setTradeMutationLoading(false);
    }
  };

  const requestTradeReversal = (trade: FounderTrade) => {
    setTradeError(null);
    setTradeNotice(null);
    setReversalReason('');
    setReversalIdempotencyKey(newIdempotencyKey());
    setReversalTarget(trade);
  };

  const reverseTrade = async () => {
    if (!customer || !reversalTarget) return;
    if (!reversalReason.trim()) {
      setTradeError('A reversal reason is required.');
      return;
    }
    setTradeMutationLoading(true);
    setTradeError(null);
    try {
      await reverseFounderCustomerTrade(customer.id, reversalTarget.id, reversalReason.trim(), reversalIdempotencyKey);
      await refreshCustomerData(customer.id, customer.workspaceId);
      setTradeNotice('Trade reversal recorded. The original trade remains in immutable history.');
      setReversalTarget(null);
    } catch (cause) {
      setTradeError(errorFrom(cause, 'Trade reversal failed. The same idempotency key remains available for retry.').message);
    } finally {
      setTradeMutationLoading(false);
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
  const mfaEnrollmentRequired = forbidden && loadFailure?.message === 'Privileged MFA enrollment is required';
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
          {mfaEnrollmentRequired ? <Link href="/mfa-enroll">Enroll privileged MFA</Link> : null}
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
          {customer ? <article className={styles.healthCard} aria-label="Customer detail"><div className={styles.cardHeader}><div><span className={styles.kicker}>Authorized inspection</span><h2>{customer.name}</h2><p>{customer.email}</p></div><StatusBadge value={customer.supportStatus} /></div><dl className={styles.metaList}><div><dt>Account</dt><dd>{customer.isActive ? 'Active' : 'Inactive'} · {customer.isVerified ? 'Verified' : 'Unverified'}</dd></div><div><dt>Workspace</dt><dd>{customer.workspaceId ?? 'Unavailable'}</dd></div><div><dt>Withdrawal states</dt><dd>{customer.withdrawalStatuses.join(', ') || 'None recorded'}</dd></div></dl><h3>Authoritative portfolio</h3>{customerPortfolio ? <><h4>Balances</h4>{customerPortfolio.balances.length ? <ul>{customerPortfolio.balances.map((balance) => <li key={balance.asset}>{balance.asset}: {balance.authoritativeBalance} (available {balance.availableBalance})</li>)}</ul> : <p>No balances returned.</p>}<h4>Positions</h4>{customerPortfolio.positions.length ? <ul>{customerPortfolio.positions.map((position) => <li key={position.asset}>{position.asset}: {position.quantity} · average cost {position.averageCost ?? 'Unavailable'} · unrealized P&amp;L {position.unrealizedPnl}</li>)}</ul> : <p>No positions returned.</p>}<h4>Recent ledger activity</h4>{customerPortfolio.recentLedgerActivity.length ? <ul>{customerPortfolio.recentLedgerActivity.slice(0, 8).map((item) => <li key={item.id}>{item.transactionType} · {item.status} · {item.reference ?? 'No reference'}</li>)}</ul> : <p>No ledger activity returned.</p>}</> : <p>Authoritative portfolio data is unavailable.</p>}</article> : null}
          {customerFinancialState ? (
            <article className={styles.healthCard} aria-label="Read-only financial state">
              <div className={styles.cardHeader}>
                <div><span className={styles.kicker}>Read-only financial state</span><h3>Persisted accounting records</h3></div>
                <span>{customerFinancialState.workspaceId}</span>
              </div>
              <dl className={styles.metaList}>
                <div><dt>Portfolio ID</dt><dd>{customerFinancialState.portfolioId ?? 'No portfolio record'}</dd></div>
                <div><dt>Ledger activity count</dt><dd>{customerFinancialState.ledgerActivityCount}</dd></div>
                <div><dt>Settled trade count</dt><dd>{customerFinancialState.settledTradeCount}</dd></div>
              </dl>
              <h4>Financial accounts</h4>
              {customerFinancialState.financialAccounts.length ? <ul>{customerFinancialState.financialAccounts.map((account) => <li key={account.id}>{account.asset} · {account.accountKind} · balance {account.balance.authoritativeBalance} · available {account.balance.availableBalance}</li>)}</ul> : <p>No financial accounts returned.</p>}
              <h4>Positions</h4>
              {customerFinancialState.positions.length ? <ul>{customerFinancialState.positions.map((position) => <li key={position.asset}>{position.asset}: {position.quantity}</li>)}</ul> : <p>No persisted positions returned.</p>}
              <p role="status">{customerFinancialState.financialAccounts.length === 0 && customerFinancialState.positions.length === 0 && customerFinancialState.ledgerActivityCount === 0 && customerFinancialState.settledTradeCount === 0 ? 'Empty persisted financial state.' : 'Persisted financial state returned.'}</p>
            </article>
          ) : null}
          {customer ? (
            <section className={styles.section} aria-labelledby="trade-recording-heading">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>Manual / Founder-recorded trade</p>
                  <h2 id="trade-recording-heading">Record persisted accounting activity</h2>
                </div>
                <span>Founder-only financial operation</span>
              </div>
              <p className={styles.message}>This creates a real settled trade, ledger entries, balance changes, and position changes through the authoritative backend.</p>
              <form className={styles.form} onSubmit={requestTradeConfirmation}>
                <label>Side<select value={tradeDraft.side} onChange={(event) => updateTradeDraft('side', event.target.value as TradeDraft['side'])}><option value="buy">BUY</option><option value="sell">SELL</option></select></label>
                <label>Base asset<select value={tradeDraft.base_asset} onChange={(event) => updateTradeDraft('base_asset', event.target.value as TradeDraft['base_asset'])}><option value="BTC">BTC</option><option value="ETH">ETH</option></select></label>
                <label>Quote asset<select value={tradeDraft.quote_asset} onChange={(event) => updateTradeDraft('quote_asset', event.target.value as TradeDraft['quote_asset'])}><option value="USD">USD</option></select></label>
                <label>Quantity<input inputMode="decimal" value={tradeDraft.quantity} onChange={(event) => updateTradeDraft('quantity', event.target.value)} required /></label>
                <label>Price<input inputMode="decimal" value={tradeDraft.price} onChange={(event) => updateTradeDraft('price', event.target.value)} required /></label>
                <label>Fee amount (USD)<input inputMode="decimal" value={tradeDraft.fee_amount} onChange={(event) => updateTradeDraft('fee_amount', event.target.value)} required /></label>
                <label>Executed at<input type="datetime-local" value={tradeDraft.executed_at} onChange={(event) => updateTradeDraft('executed_at', event.target.value)} required /></label>
                <label>Reference <span>Optional</span><input value={tradeDraft.external_execution_id ?? ''} onChange={(event) => updateTradeDraft('external_execution_id', event.target.value)} maxLength={180} /></label>
                <label className={styles.notes}>Reason<input value={tradeDraft.reason} onChange={(event) => updateTradeDraft('reason', event.target.value)} maxLength={1000} required /></label>
                {tradeError ? <p className={styles.formError} role="alert">{tradeError}</p> : null}
                {tradeNotice ? <p className={styles.formNotice} role="status">{tradeNotice}</p> : null}
                <div className={styles.formActions}><button type="submit" disabled={tradeMutationLoading}>Review trade</button><p>Retries keep the same idempotency key; no duplicate trade is silently submitted.</p></div>
              </form>
              {tradeConfirmation ? (
                <div className={styles.healthCard} role="dialog" aria-label="Confirm manual trade">
                  <span className={styles.kicker}>Confirm persisted mutation</span>
                  <h3>{tradeConfirmation.side.toUpperCase()} {tradeConfirmation.base_asset}</h3>
                  <dl className={styles.metaList}>
                    <div><dt>Customer</dt><dd>{customer.name}</dd></div>
                    <div><dt>Quantity</dt><dd>{tradeConfirmation.quantity} {tradeConfirmation.base_asset}</dd></div>
                    <div><dt>Price</dt><dd>{tradeConfirmation.price} {tradeConfirmation.quote_asset}</dd></div>
                    <div><dt>Quote value</dt><dd>{(Number(tradeConfirmation.quantity) * Number(tradeConfirmation.price)).toFixed(8)} {tradeConfirmation.quote_asset} <span>(summary only)</span></dd></div>
                    <div><dt>Fee</dt><dd>{tradeConfirmation.fee_amount} {tradeConfirmation.quote_asset}</dd></div>
                  </dl>
                  <div className={styles.formActions}><button type="button" onClick={() => void recordTrade()} disabled={tradeMutationLoading}>{tradeMutationLoading ? 'Recording…' : 'Confirm and record trade'}</button><button type="button" onClick={() => setTradeConfirmation(null)} disabled={tradeMutationLoading}>Cancel</button></div>
                </div>
              ) : null}
            </section>
          ) : null}
          {customer ? (
            <section className={styles.section} aria-labelledby="trade-history-heading">
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Persisted trade history</p><h2 id="trade-history-heading">Recorded trades</h2></div><span>{customerTrades.length} trade{customerTrades.length === 1 ? '' : 's'}</span></div>
              {customerTrades.length > 0 ? <ul className={styles.errors} aria-label="Recorded trades">{customerTrades.map((trade) => <li key={trade.id}><strong>{displayTrade(trade)}</strong> · {titleCase(trade.status)} · {displayDate(trade.executedAt)} · fee {trade.feeAmount} {trade.feeAsset}{trade.externalExecutionId ? ` · ${trade.externalExecutionId}` : ''}{trade.status === 'recorded' && !trade.reversalOfId ? <button type="button" onClick={() => requestTradeReversal(trade)} disabled={tradeMutationLoading}>Reverse</button> : null}</li>)}</ul> : <p className={styles.message}>No recorded trades returned.</p>}
              {reversalTarget ? <div className={styles.healthCard} role="dialog" aria-label="Confirm trade reversal"><span className={styles.kicker}>Confirm immutable correction</span><h3>Reverse {displayTrade(reversalTarget)}</h3><label>Reversal reason<input value={reversalReason} onChange={(event) => setReversalReason(event.target.value)} maxLength={1000} required /></label><div className={styles.formActions}><button type="button" onClick={() => void reverseTrade()} disabled={tradeMutationLoading}>{tradeMutationLoading ? 'Reversing…' : 'Confirm reversal'}</button><button type="button" onClick={() => setReversalTarget(null)} disabled={tradeMutationLoading}>Cancel</button></div></div> : null}
            </section>
          ) : null}
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
