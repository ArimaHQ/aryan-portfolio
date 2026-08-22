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
    ['Workspace', 'Open my portfolio workspace'],
    ['Research', 'Open portfolio research'],
    ['Risk', 'Open portfolio risk'],
  ],
  quant: [
    ['Regime', 'Explain the current market regime'],
    ['Latest run', 'Summarise the latest research run'],
    ['Research', 'Open quant research'],
    ['Methods', 'Show quant research methods'],
    ['Risk', 'Open research risk controls'],
  ],
  growth: [
    ['Today', 'Show what Growth created today'],
    ['Workspace', 'Open Growth Studio'],
    ['Projects', 'Open projects'],
    ['Approvals', 'Open approvals'],
    ['History', 'Show Growth execution history'],
  ],
};

export function VoiceDock({ context }: Props) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isInitialized } = useAuth();
  const authReady = isInitialized && isAuthenticated;
  const voice = useVoiceController({ authReady });
  const voiceAvailable = authReady && voice.availability === 'verified';
  const voiceLabel = !isInitialized
    ? 'VOICE / CHECKING SESSION'
    : !isAuthenticated
      ? 'VOICE / SIGN IN REQUIRED'
      : voiceAvailable
        ? 'VOICE / VERIFIED'
        : 'VOICE / UNAVAILABLE';

  const handleCoreClick = () => {
    if (voice.state === 'speaking') {
      void voice.interrupt();
      return;
    }
    if (voiceAvailable) {
      void voice.startListening();
      return;
    }
    setOpen(true);
  };

  return (
    <aside className={`voice-dock${open ? ' is-open' : ''}`} aria-label="Arima voice dock">
      <button
        type="button"
        className={`voice-dock-core state-${voice.state}`}
        onClick={handleCoreClick}
        aria-label={voice.state === 'speaking'
          ? 'Interrupt Arima'
          : voiceAvailable
            ? 'Speak to Arima. Current state: ' + voice.state
            : 'Voice intelligence is unavailable. Open status details.'}
      >
        <i /><i />
        <span>AF</span>
      </button>
      <div className="voice-dock-copy">
        <span>{voiceLabel}</span>
        <strong>{voice.voiceStatus.replaceAll('_', ' ')}</strong>
      </div>
      <button type="button" className="voice-dock-expand" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {open ? 'Close' : 'Ask'}
      </button>
      {open && (
        <div className="voice-dock-menu">
          {voiceAvailable ? (
            <>
              {prompts[context].map(([label, prompt]) => (
                <button type="button" key={label} onClick={() => void voice.submitTranscript(prompt)}>{label}</button>
              ))}
              <button type="button" onClick={() => void voice.interrupt()}>Stop</button>
              {voice.voiceStatus === 'recognition_unavailable' && <button type="button" onClick={() => void voice.retryListening()}>Retry voice</button>}
            </>
          ) : (
            <p role="status">
              {isAuthenticated
                ? voice.error ?? 'Voice is disabled until the backend verifies a non-mock provider.'
                : 'Sign in to access private voice intelligence.'}
            </p>
          )}
          <Link href="/executive">Executive</Link>
          {voiceAvailable && voice.response && <p aria-live="polite">{voice.response}</p>}
        </div>
      )}
    </aside>
  );
}
