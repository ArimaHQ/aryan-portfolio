'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { ActiveChamber, NeuralDataObject } from '@/types/experience';
import styles from '@/components/neural/NeuralExperience.module.css';

type Props = {
  object: NeuralDataObject | null;
  activeChamber: ActiveChamber;
  onClose: () => void;
  onAction: (id: string, action: 'approve' | 'reject' | 'revision') => void;
};

const drillDownPath: Record<ActiveChamber, string | null> = {
  executive: null,
  portfolio: null,
  quant: '/quant-research',
  growth: '/growth-studio',
  projects: '/research-projects',
  publications: '/research-projects',
  approvals: null,
  health: null,
};

export function DetailPortal({ object, activeChamber, onClose, onAction }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!object) return undefined;
    const element = dialogRef.current;
    const focusable = () => Array.from(element?.querySelectorAll<HTMLElement>(
      'button, a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? []);
    const first = focusable()[0];
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) return;
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault();
          lastItem.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [object, onClose]);

  if (!object) return null;
  const drillDown = drillDownPath[activeChamber];

  return (
    <div className={styles.detailBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className={styles.detailPortal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-portal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>{object.eyebrow ?? 'ARIMA INTELLIGENCE OBJECT'}</span>
            <h2 id="detail-portal-title">{object.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close detail">Close</button>
        </header>
        {object.value && <strong className={styles.detailValue}>{object.value}</strong>}
        <p>{object.summary}</p>
        {object.details?.length ? (
          <dl>
            {object.details.map((detail) => (
              <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>
            ))}
          </dl>
        ) : null}
        <footer>
          <span>{object.source === 'live' ? 'Live backend data' : object.source === 'mixed' ? 'Mixed live and demo data' : 'Simulated demo data'}</span>
          {object.kind === 'approval' && object.status !== 'complete' && (
            <div className={styles.approvalActions}>
              <button type="button" onClick={() => onAction(object.id, 'approve')}>Approve</button>
              <button type="button" onClick={() => onAction(object.id, 'reject')}>Reject</button>
              <button type="button" onClick={() => onAction(object.id, 'revision')}>Request revision</button>
            </div>
          )}
          {drillDown && <Link href={drillDown}>Open detailed analytics</Link>}
        </footer>
      </section>
    </div>
  );
}
