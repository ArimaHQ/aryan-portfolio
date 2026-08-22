'use client';

import Link from 'next/link';
import type { ActiveChamber, AnimationPolicy } from '@/types/experience';
import { chamberDescriptions, chamberLabels } from '@/data/experience-demo';
import styles from '@/components/neural/NeuralExperience.module.css';

type Props = {
  chamber: ActiveChamber;
  policy: AnimationPolicy;
  onReturnToCore: () => void;
};

const chamberTags: Record<ActiveChamber, string[]> = {
  executive: ['priorities', 'memory', 'decisions'],
  portfolio: ['allocation', 'risk', 'watchlist'],
  quant: ['regimes', 'models', 'evidence'],
  growth: ['ideas', 'drafts', 'approvals'],
  projects: ['dependencies', 'owners', 'deadlines'],
  publications: ['archive', 'research', 'streams'],
  approvals: ['review', 'human-in-loop', 'protected'],
  health: ['telemetry', 'background', 'availability'],
};

const drillDown: Partial<Record<ActiveChamber, { href: string; label: string }>> = {
  portfolio: undefined,
  quant: { href: '/quant-research', label: 'Quant Research detail' },
  growth: { href: '/growth-studio', label: 'Growth Studio detail' },
  projects: { href: '/research-projects', label: 'Research projects' },
};

const unavailableCopy: Record<ActiveChamber, string> = {
  executive: 'Workspace intelligence is not displayed until an authenticated, provenance-verified source is available.',
  portfolio: 'Portfolio value, performance, risk and execution data are unavailable until a verified portfolio source is connected.',
  quant: 'Model outputs, rankings, backtests and market observations are unavailable until verified Quant Engine records exist.',
  growth: 'Campaign, publication and approval results are unavailable until their authenticated service responses include verified provenance.',
  projects: 'Project intelligence is unavailable until verified workspace records are connected to this chamber.',
  publications: 'Research and publication streams are unavailable until a verified source is connected.',
  approvals: 'Approval decisions are unavailable until the verified approval service is connected. No local action can be submitted here.',
  health: 'Platform health is unavailable until a verified telemetry source is connected.',
};

export function ChamberRenderer({ chamber, policy, onReturnToCore }: Props) {
  const detail = drillDown[chamber];
  return (
    <section
      className={styles.chamber}
      data-chamber={chamber}
      data-quality={policy.quality}
      aria-labelledby="chamber-title"
    >
      <div className={styles.chamberAmbient} aria-hidden="true"><i /><i /><i /></div>
      <header className={styles.chamberHeader}>
        <div>
          <span>ARIMA / {chamber.toUpperCase()} CHAMBER</span>
          <h1 id="chamber-title">{chamberLabels[chamber]}</h1>
          <p>{chamberDescriptions[chamber]}</p>
        </div>
        <div className={styles.chamberActions}>
          <button type="button" onClick={onReturnToCore}>Core map</button>
          {detail && <Link href={detail.href}>Open {detail.label}</Link>}
        </div>
      </header>
      <section className={styles.chamberDataState} role="status" aria-live="polite">
        <span>DATA PROVENANCE / UNVERIFIED</span>
        <strong>Live intelligence unavailable</strong>
        <p>{unavailableCopy[chamber]}</p>
      </section>
      <div className={styles.chamberField} aria-hidden="true">
        {chamberTags[chamber].map((tag, index) => (
          <span key={tag} style={{ '--tag-index': index } as React.CSSProperties}>{tag}</span>
        ))}
      </div>
    </section>
  );
}
