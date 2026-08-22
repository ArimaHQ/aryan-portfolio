'use client';

import Link from 'next/link';
import { VoiceDock } from './VoiceDock';
import styles from './QuantResearchExperience.module.css';

type PipelineState = 'connected' | 'dependency' | 'restricted';

type PipelineStage = {
  name: string;
  description: string;
  state: PipelineState;
};

const pipeline: PipelineStage[] = [
  {
    name: 'Market data',
    description: 'Awaiting a secured, versioned market-data contract.',
    state: 'dependency',
  },
  {
    name: 'Quant engine',
    description: 'No verified strategy or backtest engine is provisioned.',
    state: 'dependency',
  },
  {
    name: 'Risk engine',
    description: 'No user-scoped portfolio-risk contract is available.',
    state: 'dependency',
  },
  {
    name: 'AI / intelligence',
    description: 'Quant research orchestration remains mock-only.',
    state: 'dependency',
  },
  {
    name: 'Strategy ranking',
    description: 'Ranks unlock only from verified model evidence.',
    state: 'restricted',
  },
  {
    name: 'Trading bot',
    description: 'No bot configuration or control plane is connected.',
    state: 'restricted',
  },
  {
    name: 'Execution',
    description: 'Execution is intentionally disabled.',
    state: 'restricted',
  },
  {
    name: 'Trade data',
    description: 'No tenant-scoped trade ledger is available.',
    state: 'dependency',
  },
];

const stateLabel: Record<PipelineState, string> = {
  connected: 'Connected',
  dependency: 'Dependency required',
  restricted: 'Restricted',
};

export function QuantResearchExperience() {
  return (
    <main className={styles.shell}>
      <a className={styles.skipLink} href="#quant-main">Skip to Quant Lab content</a>

      <header className={styles.header}>
        <Link href="/executive" className={styles.brand} aria-label="Return to Executive OS">
          <b>AF</b>
          <span><strong>ARIMA</strong>EXECUTIVE OS</span>
        </Link>
        <div className={styles.headerMeta}>
          <span className={styles.privateStatus}><i />AUTHENTICATED RESEARCH SPACE</span>
          <span>QUANT LAB / READ ONLY</span>
        </div>
      </header>

      <div className={styles.notice} role="status" aria-live="polite">
        <strong>NO SIMULATED RESULTS</strong>
        <span>
          This workspace displays verified backend evidence only. The current platform has no
          secured Quant Engine contract, so no market prices, model scores, or ranks are shown.
        </span>
      </div>

      <div id="quant-main" className={styles.content}>
        <section className={styles.hero} aria-labelledby="quant-title">
          <p className={styles.eyebrow}>ARIMA FINANCE / QUANTITATIVE RESEARCH</p>
          <h1 id="quant-title">Quant Trading Lab</h1>
          <p className={styles.lede}>
            A controlled research surface for market data, model evidence, risk controls and
            strategy ranking. It remains read-only until each data boundary is authenticated,
            typed and auditable.
          </p>
          <div className={styles.heroMeta} aria-label="Quant Lab state">
            <span>DATA PROVENANCE REQUIRED</span>
            <span>NO EXECUTION PATH</span>
            <span>NO INVESTMENT ADVICE</span>
          </div>
        </section>

        <section className={styles.summaryGrid} aria-label="Quant Lab availability">
          <article className={styles.summaryCard}>
            <span>MARKET DATA</span>
            <strong>Awaiting secured feed</strong>
            <p>Current market endpoints are not a verified frontend contract.</p>
          </article>
          <article className={styles.summaryCard}>
            <span>MODEL EVIDENCE</span>
            <strong>No Quant Engine record</strong>
            <p>Backtest runs, sample windows and model outputs have not been published.</p>
          </article>
          <article className={styles.summaryCard}>
            <span>RISK CONTROL</span>
            <strong>Portfolio scope unavailable</strong>
            <p>User-owned risk, positions and limits require a tenant-scoped service.</p>
          </article>
          <article className={styles.summaryCard}>
            <span>EXECUTION</span>
            <strong className={styles.riskText}>Restricted</strong>
            <p>No broker, bot or order capability is exposed by this workspace.</p>
          </article>
        </section>

        <section className={styles.workspaceGrid} aria-label="Quant Lab research workspace">
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>STRATEGY RANKING</p>
                <h2>Candidate evidence</h2>
              </div>
              <span className={styles.rankMark} aria-hidden="true">#</span>
            </div>
            <div className={styles.tableRegion} role="region" aria-label="Strategy candidate ranking" tabIndex={0}>
              <table>
                <caption className={styles.srOnly}>
                  Strategy ranking is unavailable until verified Quant Engine records exist.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Candidate</th>
                    <th scope="col">Model score</th>
                    <th scope="col">OOS evidence</th>
                    <th scope="col">Maximum drawdown</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={6} className={styles.emptyCell}>
                      No verified candidate records are available. Ranking will be derived from
                      backend model evidence—not frontend fixtures.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className={styles.methodNote}>
              <b>Ranking policy:</b> out-of-sample robustness, risk-adjusted return, drawdown
              control, sample size and confidence must be supplied by the Quant Engine.
            </p>
          </article>

          <aside className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>RISK BOUNDARY</p>
                <h2>Execution protection</h2>
              </div>
              <span className={styles.signalDot} aria-hidden="true" />
            </div>
            <dl className={styles.definitionList}>
              <div><dt>Trading permission</dt><dd className={styles.riskText}>Not available</dd></div>
              <div><dt>Portfolio exposure</dt><dd>Requires position service</dd></div>
              <div><dt>Risk limit</dt><dd>Requires user policy</dd></div>
              <div><dt>Approval</dt><dd>Required before execution</dd></div>
            </dl>
            <p className={styles.panelCopy}>
              Crimson is reserved for risk, drawdown, rejection and ranked competition pressure.
              It never implies a live trading signal.
            </p>
          </aside>
        </section>

        <section className={styles.pipelineSection} aria-labelledby="pipeline-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>IMPLEMENTATION PATH</p>
            <h2 id="pipeline-title">Data must earn its way into the Lab.</h2>
            <p>
              Each boundary is explicit so unreliable feeds or incomplete models cannot be
              presented as investment-ready intelligence.
            </p>
          </div>
          <ol className={styles.pipeline}>
            {pipeline.map((stage, index) => (
              <li key={stage.name} data-state={stage.state}>
                <span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{stage.name}</strong>
                  <p>{stage.description}</p>
                </div>
                <em>{stateLabel[stage.state]}</em>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.dataSection} aria-labelledby="data-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>DATA CONTRACT</p>
            <h2 id="data-title">What must be connected next</h2>
          </div>
          <div className={styles.dataGrid}>
            <article>
              <span>01 / MARKET SNAPSHOTS</span>
              <h3>Versioned, timestamped data</h3>
              <p>
                A provider-backed time series with source, freshness, symbol mapping, failure
                policy and read-only authenticated access.
              </p>
            </article>
            <article>
              <span>02 / QUANT EVIDENCE</span>
              <h3>Tenant-scoped model records</h3>
              <p>
                Strategy definitions, backtest runs, out-of-sample metrics and provenance must
                exist before ranks appear.
              </p>
            </article>
            <article>
              <span>03 / RISK &amp; EXECUTION</span>
              <h3>Explicit approval boundary</h3>
              <p>
                Portfolio positions, risk limits, approvals and execution receipts require
                separate audited services. This interface will not synthesize them.
              </p>
            </article>
          </div>
        </section>
      </div>

      <nav className={styles.dock} aria-label="Executive OS modules">
        <Link href="/executive">Executive</Link>
        <Link className={styles.active} href="/quant-research">Quant Lab</Link>
        <Link href="/growth-studio">Growth</Link>
      </nav>
      <VoiceDock context="quant" />
    </main>
  );
}
