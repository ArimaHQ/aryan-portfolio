'use client';

import { useState } from 'react';
import Link from 'next/link';
import { VoiceDock } from './VoiceDock';

type Status = 'pending' | 'approved' | 'rejected' | 'revision';

const seed = [
  { id: 1, type: 'LinkedIn', title: 'Why executive AI needs permission boundaries', status: 'pending' as Status },
  { id: 2, type: 'X / Thread', title: 'Five signals behind disciplined portfolio systems', status: 'pending' as Status },
  { id: 3, type: 'Newsletter', title: 'Capital Intelligence / Issue 01', status: 'approved' as Status },
  { id: 4, type: 'Campaign', title: 'The Operating System for Executive Decisions', status: 'revision' as Status },
  { id: 5, type: 'Investor outreach', title: 'Private platform introduction', status: 'pending' as Status },
  { id: 6, type: 'Website', title: 'Quant research evidence strip', status: 'rejected' as Status },
];

export function GrowthStudioExperience() {
  const [items, setItems] = useState(seed);
  const update = (id: number, status: Status) => setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  return (
    <main className="growth-world">
      <header className="module-header">
        <Link href="/executive"><b>AF</b><span>EXECUTIVE OS</span></Link>
        <div><strong>PRIVATE / MOCK WORKSPACE</strong><span>GROWTH STUDIO</span></div>
      </header>
      <section className="growth-hero" id="today">
        <div><span>CREATED TODAY</span><h1>Ideas prepared.<br />Nothing published.</h1><p>Review private drafts before any future external execution layer is connected.</p></div>
        <div className="growth-count"><strong>{items.length}</strong><span>outputs</span><i>{items.filter((item) => item.status === 'pending').length} awaiting review</i></div>
      </section>
      <section className="growth-board" aria-label="Growth outputs">
        {items.map((item) => (
          <article key={item.id} className={`growth-card status-${item.status}`}>
            <header><span>{item.type}</span><em>{item.status}</em></header>
            <h2>{item.title}</h2>
            <p>Deterministic draft preview for the Milestone 5 executive workflow.</p>
            <div>
              <button type="button" onClick={() => window.alert(`${item.title}\n\nMock preview only.`)}>Preview</button>
              <button type="button" onClick={() => update(item.id, 'approved')}>Approve</button>
              <button type="button" onClick={() => update(item.id, 'rejected')}>Reject</button>
              <button type="button" onClick={() => update(item.id, 'revision')}>Revise</button>
            </div>
          </article>
        ))}
      </section>
      <section className="growth-history"><span>EXECUTION HISTORY</span><p>No external actions have run. This milestone does not publish, email, post or contact anyone.</p></section>
      <nav className="module-dock"><Link href="/executive">Executive</Link><Link href="/quant-research">Quant Research</Link><Link className="active" href="/growth-studio">Growth</Link></nav>
      <VoiceDock context="growth" />
    </main>
  );
}
