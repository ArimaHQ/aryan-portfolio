'use client';

import { useState } from 'react';
import { grantExecutiveAssistant } from '@/lib/founder-grant';

type GrantState = 'idle' | 'submitting' | 'success' | 'error';

export default function FounderGrantPage() {
  const [state, setState] = useState<GrantState>('idle');

  const grant = async () => {
    setState('submitting');
    try {
      await grantExecutiveAssistant();
      setState('success');
    } catch {
      setState('error');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-md border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
          Founder control
        </p>
        <h1 className="mt-4 text-2xl font-semibold">Executive Assistant access</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Grant this workspace access to the Executive Assistant.
        </p>
        <button
          className="mt-8 w-full border border-cyan-300 bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={state === 'submitting' || state === 'success'}
          onClick={() => void grant()}
          type="button"
        >
          {state === 'submitting' ? 'Granting access…' : 'Grant Executive Assistant'}
        </button>
        <p aria-live="polite" className="mt-4 min-h-5 text-sm text-slate-300">
          {state === 'success' && 'Access granted.'}
          {state === 'error' && 'Access could not be granted.'}
        </p>
      </section>
    </main>
  );
}
