'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useVoiceController } from '@/hooks/useVoiceController';
import { useAuth } from '@/providers';

type Props = {
  context: 'portfolio' | 'quant' | 'growth';
};

const prompts = {
  portfolio: [
    ['Performance', 'Tell me about portfolio performance'],
    ['Drawdown', 'Show portfolio drawdown'],
    ['Holdings', 'Open portfolio holdings'],
    ['Risk', 'Open portfolio risk'],
    ['Allocation', 'Open portfolio allocation'],
  ],
  quant: [
    ['Regime', 'Explain the current market regime'],
    ['Latest run', 'Summarise the latest research run'],
    ['Risk', 'Show quant research risk warnings'],
  ],
  growth: [
    ['Today', 'Show what Growth created today'],
    ['Approvals', 'Show pending approvals'],
    ['History', 'Show Growth execution history'],
  ],
};

export function VoiceDock({ context }: Props) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isInitialized } = useAuth();
  const voice = useVoiceController({
    authReady: isInitialized && isAuthenticated,
  });
  return (
    <aside className={`voice-dock${open ? ' is-open' : ''}`} aria-label="Arima voice dock">
      <button
        type="button"
        className={`voice-dock-core state-${voice.state}`}
        onClick={() => (
          voice.state === 'speaking'
            ? void voice.interrupt()
            : void voice.startListening()
        )}
        aria-label={voice.state === 'speaking' ? 'Interrupt Arima' : 'Speak to Arima. Current state: ' + voice.state}
      >
        <i /><i />
        <span>AF</span>
      </button>
      <div className="voice-dock-copy">
        <span>ARIMA / {voice.mode}</span>
        <strong>{voice.voiceStatus.replaceAll('_', ' ')}</strong>
      </div>
      <button type="button" className="voice-dock-expand" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {open ? 'Close' : 'Ask'}
      </button>
      {open && (
        <div className="voice-dock-menu">
          {prompts[context].map(([label, prompt]) => (
            <button type="button" key={label} onClick={() => void voice.submitTranscript(prompt)}>{label}</button>
          ))}
          <button type="button" onClick={() => void voice.interrupt()}>Stop</button>
          {voice.voiceStatus === 'recognition_unavailable' && <button type="button" onClick={() => void voice.retryListening()}>Retry voice</button>}
          <Link href="/executive">Executive</Link>
          {voice.response && <p aria-live="polite">{voice.response}</p>}
        </div>
      )}
    </aside>
  );
}
