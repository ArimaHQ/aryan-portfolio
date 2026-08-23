'use client';

import { FormEvent, memo, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArimaAvatar } from '@/components/avatar/ArimaAvatar';
import { ChamberRenderer } from '@/components/chambers/ChamberRenderer';
import {
  DetailPortal,
  IntelligenceObjectLayer,
} from '@/components/intelligence-objects';
import { ConsciousnessOcean } from '@/components/neural/ConsciousnessOcean';
import { NeuralCore } from '@/components/neural/NeuralCore';
import { MicrosoftIntegrationPanel } from '@/components/executive/MicrosoftIntegrationPanel';
import styles from '@/components/neural/NeuralExperience.module.css';
import { ChamberTransition } from '@/components/transitions/ChamberTransition';
import { useNeuralExperience } from '@/hooks/useNeuralExperience';
import { useVoiceController } from '@/hooks/useVoiceController';
import { useAuth } from '@/providers';
import type { VoiceAvailability } from '@/types/voice';
import { defaultIntelligencePresentationPolicy } from '@/utils/intelligence-policy';
import { voiceMessageForDisplay } from '@/utils/voice-presentation';

const statusCopy = {
  voice_ready: 'Voice ready',
  requesting_microphone: 'Requesting microphone',
  microphone_blocked: 'Microphone blocked',
  recognition_unavailable: 'Recognition service unavailable',
  browser_unsupported: 'Browser voice unsupported',
  keyboard_mode: 'Keyboard mode active',
  retrying: 'Retrying voice',
  listening_restored: 'Listening restored',
  speech_playback_interrupted: 'Speech stopped',
  authentication_required: 'Authentication required',
  provider_unverified: 'Voice intelligence unavailable',
  provider_timeout: 'Voice provider timed out',
  provider_unavailable: 'Voice provider unavailable',
  rate_limited: 'Voice temporarily rate limited',
  voice_authorization_denied: 'Voice authorization denied',
  idle: 'Arima is ready',
};

type ArrivalPhase = 'seed' | 'spiral' | 'ocean' | 'ready';

// Extract clock into a separate component so it doesn't re-render the whole tree
function ClockDisplay() {
  const [clock, setClock] = useState('');
  useEffect(() => {
    const updateClock = () => setClock(new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()));
    updateClock();
    const interval = window.setInterval(updateClock, 1_000);
    return () => window.clearInterval(interval);
  }, []);
  return <span>{clock}</span>;
}

// Memoize the header to prevent re-renders on every state change
const ExperienceHeader = memo(function ExperienceHeader({
  mode,
  voiceAvailability,
  userName,
}: {
  mode: string;
  voiceAvailability: VoiceAvailability;
  userName?: string;
}) {
  return (
    <header className={styles.experienceHeader}>
      <Link href="/" className={styles.brand} aria-label="Return to Arima home">
        <b className={styles.brandMark}>AF</b>
        <span className={styles.brandCopy}><b>ARIMA</b>EXECUTIVE OS</span>
      </Link>
      <div className={styles.headerMode}>
        <strong className={voiceAvailability === 'verified' ? styles.liveBadge : styles.unavailableBadge}>
          {voiceAvailability === 'verified'
            ? 'VOICE VERIFIED'
            : voiceAvailability === 'checking'
              ? 'VERIFYING VOICE'
              : 'VOICE UNAVAILABLE'}
        </strong>
        <ClockDisplay />
        <span>{mode.replaceAll('_', ' ')}</span>
      </div>
      <div className={styles.userLock}><i />PRIVATE / {userName ?? 'AUTHORISED USER'}</div>
    </header>
  );
});

// Memoize the voice bar
const VoiceBar = memo(function VoiceBar({
  voiceState,
  voiceStatus,
  voiceMessage,
  isSpeaking,
  voiceAvailable,
  onSpeak,
  onRetry,
  onRetryVoice,
}: {
  voiceState: string;
  voiceStatus: string;
  voiceMessage: string;
  isSpeaking: boolean;
  voiceAvailable: boolean;
  onSpeak: () => void;
  onRetry: () => void;
  onRetryVoice: () => void;
}) {
  return (
    <div className={styles.voiceBar} data-state={voiceState} role="status" aria-live="polite">
      <i aria-hidden="true" />
      <span>{statusCopy[voiceStatus as keyof typeof statusCopy] ?? voiceStatus}</span>
      {voiceMessage && <p>{voiceMessage}</p>}
      <button
        type="button"
        onClick={onSpeak}
        disabled={!voiceAvailable && !isSpeaking}
      >
        {isSpeaking ? 'Interrupt' : voiceAvailable ? 'Speak' : 'Unavailable'}
      </button>
      {voiceStatus === 'recognition_unavailable' && (
        <button type="button" onClick={onRetry}>Retry</button>
      )}
      {['provider_timeout', 'provider_unavailable', 'rate_limited'].includes(voiceStatus) && (
        <button type="button" onClick={onRetryVoice}>Try again</button>
      )}
    </div>
  );
});

// Memoize the controls
const ExperienceControls = memo(function ExperienceControls({
  keyboardOpen,
  muted,
  captions,
  reducedMotion,
  highContrast,
  canExit,
  canRepeat,
  onKeyboard,
  onMute,
  onCaptions,
  onReducedMotion,
  onContrast,
  onRepeat,
  onExit,
}: {
  keyboardOpen: boolean;
  muted: boolean;
  captions: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  canExit: boolean;
  canRepeat: boolean;
  onKeyboard: () => void;
  onMute: () => void;
  onCaptions: () => void;
  onReducedMotion: () => void;
  onContrast: () => void;
  onRepeat: () => void;
  onExit: () => void;
}) {
  return (
    <div className={styles.experienceControls} aria-label="Experience controls">
      <button type="button" onClick={onKeyboard} aria-expanded={keyboardOpen}>Keyboard</button>
      <button type="button" onClick={onMute} aria-pressed={muted}>{muted ? 'Unmute' : 'Mute'}</button>
      <button type="button" onClick={onCaptions} aria-pressed={captions}>Captions</button>
      <button type="button" onClick={onReducedMotion} aria-pressed={reducedMotion}>Simplify</button>
      <button type="button" onClick={onContrast} aria-pressed={highContrast}>Contrast</button>
      <button type="button" onClick={onRepeat} disabled={!canRepeat}>Repeat</button>
      <button type="button" onClick={onExit} disabled={!canExit}>Exit</button>
    </div>
  );
});

export function ExecutiveExperience() {
  const { user, isInitialized, isAuthenticated } = useAuth();
  const experienceRootRef = useRef<HTMLElement | null>(null);
  const experience = useNeuralExperience();
  const {
    mode,
    activeChamber,
    transition,
    avatarState,
    animation,
    objects,
    selectedObject,
    announcement,
    enterCore,
    exitCore,
    openChamber,
    handleVoiceState,
    handleVoiceResponse: consumeVoiceResponse,
    handleVoiceNavigation: routeVoiceNavigation,
    showDailyIntelligence,
    showWeeklyPerformance,
    selectObject,
    dismissObject,
    resolveObjectAction,
    reducedMotionOverride,
    setReducedMotionOverride,
  } = experience;
  const [keyboardValue, setKeyboardValue] = useState('');
  const [highContrast, setHighContrast] = useState(false);
  const [arrival, setArrival] = useState<ArrivalPhase>('seed');
  const presentationStarted = useRef(false);
  const arrivalStarted = useRef(false);

  const handleVoiceResponse = useCallback((response: Parameters<typeof consumeVoiceResponse>[0]) => {
    consumeVoiceResponse(response);
  }, [consumeVoiceResponse]);

  const handleVoiceNavigation = useCallback((
    action: Parameters<typeof routeVoiceNavigation>[0],
  ) => routeVoiceNavigation(action), [routeVoiceNavigation]);

  const voice = useVoiceController({
    onVoiceResponse: handleVoiceResponse,
    onNavigation: handleVoiceNavigation,
    onStateChange: handleVoiceState,
    // Wait until auth has fully restored the session (and the access token is
    // available) before creating the voice session. Otherwise the voice
    // request fires without Authorization and receives a 401, which falls
    // back to demo mode.
    authReady: isInitialized && isAuthenticated,
  });
  const {
    state: voiceControllerState,
    muted,
    captions,
    setKeyboardOpen,
    setMuted,
    setCaptions,
    startListening,
    retryListening,
    retryVoice,
    interrupt,
    repeat,
  } = voice;

  useEffect(() => {
    if (animation.reducedMotion) {
      const settle = window.setTimeout(() => setArrival('ready'), 0);
      return () => window.clearTimeout(settle);
    }
    if (arrivalStarted.current) return undefined;
    arrivalStarted.current = true;
    const spiral = window.setTimeout(() => setArrival('spiral'), 260);
    const ocean = window.setTimeout(() => setArrival('ocean'), 880);
    const ready = window.setTimeout(() => setArrival('ready'), 1_520);
    return () => {
      window.clearTimeout(spiral);
      window.clearTimeout(ocean);
      window.clearTimeout(ready);
    };
  }, [animation.reducedMotion]);

  useEffect(() => {
    const root = experienceRootRef.current;
    if (!root || animation.reducedMotion || animation.mobile) return undefined;
    let frame = 0;
    let nextX = 0;
    let nextY = 0;
    const applyParallax = () => {
      frame = 0;
      root.style.setProperty('--parallax-x', (nextX * 7).toFixed(2) + 'px');
      root.style.setProperty('--parallax-y', (nextY * 5).toFixed(2) + 'px');
      root.style.setProperty('--parallax-fog-x', (nextX * -2).toFixed(2) + 'px');
      root.style.setProperty('--parallax-fog-y', (nextY * -1.5).toFixed(2) + 'px');
    };
    const onMove = (event: PointerEvent) => {
      nextX = event.clientX / window.innerWidth - 0.5;
      nextY = event.clientY / window.innerHeight - 0.5;
      if (!frame) frame = window.requestAnimationFrame(applyParallax);
    };
    const reset = () => {
      nextX = 0;
      nextY = 0;
      if (!frame) frame = window.requestAnimationFrame(applyParallax);
    };
    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', reset);
    return () => {
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', reset);
      window.cancelAnimationFrame(frame);
      root.style.removeProperty('--parallax-x');
      root.style.removeProperty('--parallax-y');
      root.style.removeProperty('--parallax-fog-x');
      root.style.removeProperty('--parallax-fog-y');
    };
  }, [animation.mobile, animation.reducedMotion]);

  useEffect(() => {
    if (mode !== 'chamber' || activeChamber !== 'executive') return;
    if (presentationStarted.current) return;
    presentationStarted.current = true;
    if (defaultIntelligencePresentationPolicy(new Date()) === 'weekly') {
      showWeeklyPerformance();
      openChamber('portfolio');
    } else {
      showDailyIntelligence();
    }
  }, [
    activeChamber,
    mode,
    openChamber,
    showDailyIntelligence,
    showWeeklyPerformance,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedObject) {
        selectObject(null);
        return;
      }
      exitCore();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exitCore, selectObject, selectedObject]);

  const submitKeyboard = (event: FormEvent) => {
    event.preventDefault();
    void voice.submitTranscript(keyboardValue);
    setKeyboardValue('');
  };

  const coreActive = mode !== 'avatar';
  const voiceState = voice.state === 'warning' ? 'warning' : voice.state;
  const voiceMessage = voiceMessageForDisplay({
    error: voice.error,
    partialTranscript: voice.partialTranscript,
    response: voice.response,
  });

  // Memoize the handlers to prevent unnecessary re-renders
  const handleSpeak = useCallback(() => {
    if (voiceControllerState === 'speaking') {
      void interrupt();
    } else {
      void startListening();
    }
  }, [interrupt, startListening, voiceControllerState]);

  const handleKeyboardToggle = useCallback(() => {
    setKeyboardOpen((previous) => !previous);
  }, [setKeyboardOpen]);

  const handleMuteToggle = useCallback(() => {
    setMuted(!muted);
  }, [muted, setMuted]);

  const handleCaptionsToggle = useCallback(() => {
    setCaptions(!captions);
  }, [captions, setCaptions]);

  const handleReducedMotionToggle = useCallback(() => {
    setReducedMotionOverride(!reducedMotionOverride);
  }, [reducedMotionOverride, setReducedMotionOverride]);

  const handleContrastToggle = useCallback(() => {
    setHighContrast((value) => !value);
  }, []);

  const handleRepeat = useCallback(() => {
    repeat();
  }, [repeat]);

  const handleExit = useCallback(() => {
    exitCore();
  }, [exitCore]);

  const handleRetry = useCallback(() => {
    void retryListening();
  }, [retryListening]);

  return (
    <main
      ref={experienceRootRef}
      className={styles.experience}
      data-mode={mode}
      data-high-contrast={highContrast}
      data-paused={animation.paused}
      aria-label="Arima Living Intelligence Environment"
    >
      <ConsciousnessOcean
        policy={animation}
        mode={mode}
        avatarState={avatarState}
        amplitude={voice.speechAmplitude}
        transitionPhase={transition.phase}
        arrival={arrival}
      />
      <div className={styles.worldGrid} aria-hidden="true" />
      <div className={styles.worldVignette} aria-hidden="true" />
      <ExperienceHeader
        mode={mode}
        voiceAvailability={voice.availability}
        userName={user?.name}
      />

      <div
        className={styles.cameraWorld}
        data-mode={mode}
        data-arrival={arrival}
        data-avatar-state={avatarState}
      >
        {!coreActive && (
          <ArimaAvatar
            state={avatarState}
            amplitude={voice.speechAmplitude}
            arrival={arrival}
            onActivate={enterCore}
            onInterrupt={() => void voice.interrupt()}
          />
        )}

        <NeuralCore
          activeChamber={activeChamber}
          policy={animation}
          active={coreActive}
          onNavigate={openChamber}
        />

        {mode === 'neural_core' && (
          <section className={styles.coreInterstitial} aria-live="polite">
            <span>NEURAL CORE / CONNECTED INTELLIGENCE</span>
            <strong>Choose a pathway or ask Arima.</strong>
            <p>Executive, portfolio, research, growth, projects, publications, approvals and system health are available through verified workspace services.</p>
          </section>
        )}

        {mode === 'chamber' && (
          <>
            <ChamberRenderer
              chamber={activeChamber}
              policy={animation}
              onReturnToCore={exitCore}
            />
            <IntelligenceObjectLayer
              activeChamber={activeChamber}
              objects={objects}
              onFocus={(object) => selectObject(object.id)}
              onDismiss={dismissObject}
            />
          </>
        )}
      </div>

      <ChamberTransition transition={transition} />
      <MicrosoftIntegrationPanel />

      <VoiceBar
        voiceState={voiceState}
        voiceStatus={voice.voiceStatus}
        voiceMessage={voiceMessage}
        isSpeaking={voice.state === 'speaking'}
        voiceAvailable={voice.availability === 'verified'}
        onSpeak={handleSpeak}
        onRetry={handleRetry}
        onRetryVoice={retryVoice}
      />

      <ExperienceControls
        keyboardOpen={voice.keyboardOpen}
        muted={voice.muted}
        captions={voice.captions}
        reducedMotion={reducedMotionOverride}
        highContrast={highContrast}
        canExit={mode !== 'avatar'}
        canRepeat={Boolean(voice.response)}
        onKeyboard={handleKeyboardToggle}
        onMute={handleMuteToggle}
        onCaptions={handleCaptionsToggle}
        onReducedMotion={handleReducedMotionToggle}
        onContrast={handleContrastToggle}
        onRepeat={handleRepeat}
        onExit={handleExit}
      />

      {voice.keyboardOpen && voice.availability === 'verified' && (
        <form className={styles.keyboardFallback} onSubmit={submitKeyboard}>
          <label htmlFor="neural-keyboard">Keyboard fallback / no audio is sent or stored</label>
          <input
            id="neural-keyboard"
            value={keyboardValue}
            onChange={(event) => setKeyboardValue(event.target.value)}
            placeholder="Ask Arima: What’s up today?"
            autoFocus
          />
          <button type="submit">Send</button>
        </form>
      )}

      {voice.keyboardOpen && voice.availability !== 'verified' && (
        <section className={styles.voiceUnavailable} role="status" aria-live="polite">
          <strong>Voice intelligence unavailable</strong>
          <p>{voice.error ?? 'A verified non-mock provider is required before Arima can accept or respond to voice requests.'}</p>
        </section>
      )}

      {announcement && (
        <p className={styles.announcement} aria-live={announcement.politeness ?? 'polite'}>
          {announcement.message}
        </p>
      )}

      <DetailPortal
        object={selectedObject}
        activeChamber={activeChamber}
        onClose={() => selectObject(null)}
        onAction={resolveObjectAction}
      />
    </main>
  );
}
