'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const signals = ['SYSTEMS ONLINE', 'LONDON 51.5072° N', 'MARKET STRUCTURE', 'AF // 001', 'SIGNAL INTEGRITY', 'CAPITAL INTELLIGENCE'];

export default function ArrivalPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setReady(true), reduceMotion ? 50 : 1250);
    return () => window.clearTimeout(timeout);
  }, [reduceMotion]);

  return (
    <main className="arrival-world">
      <div className="arrival-grain" aria-hidden="true" />
      <div className="arrival-grid" aria-hidden="true" />
      <div className="arrival-horizon" aria-hidden="true" />
      <div className="arrival-orbit orbit-one" aria-hidden="true" />
      <div className="arrival-orbit orbit-two" aria-hidden="true" />

      <div className="arrival-signals" aria-hidden="true">
        {signals.map((signal, index) => <span key={signal} style={{ '--i': index } as React.CSSProperties}>{signal}</span>)}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: ready ? 1 : 0, scale: ready ? 1 : 0.7 }}
        transition={{ duration: reduceMotion ? 0.01 : 1.7, ease: [0.16, 1, 0.3, 1] }}
        className="arrival-core"
        aria-hidden="true"
      >
        <i /><i /><i />
      </motion.div>

      <section className="arrival-content">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 10 }}
          transition={{ delay: reduceMotion ? 0 : 0.35, duration: 0.8 }}
          className="arrival-kicker"
        >
          ARIMA FINANCE / EST. LONDON
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 22 }}
          transition={{ delay: reduceMotion ? 0 : 0.55, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="arrival-title"
        >
          <span>AF</span>
          <h1>ARIMA<br />FINANCE</h1>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.9, duration: 0.9 }}
          className="arrival-statement"
        >
          Intelligence for capital in motion.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 26 }}
          transition={{ delay: reduceMotion ? 0 : 1.15, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="arrival-portals"
        >
          <Portal index="01" title="Client portfolio" detail="Secure private access" onClick={() => router.push('/client-portfolio')} />
          <Portal index="02" title="Experience the journey" detail="Enter the complete Arima film" subdued onClick={() => router.push('/journey/')} />
        </motion.div>
      </section>

      <p className="arrival-footnote">PRIVATE INTELLIGENCE · PUBLIC PURPOSE</p>
    </main>
  );
}

function Portal({ index, title, detail, subdued, onClick }: { index: string; title: string; detail: string; subdued?: boolean; onClick: () => void }) {
  return (
    <button className={`arrival-portal${subdued ? ' is-subdued' : ''}`} onClick={onClick}>
      <span className="portal-index">{index}</span>
      <span className="portal-line" />
      <span className="portal-copy"><strong>{title}</strong><small>{detail}</small></span>
      <span className="portal-arrow" aria-hidden="true">↗</span>
    </button>
  );
}
