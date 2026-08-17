'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  VoiceGatewayResponse,
  VoiceMode,
  VoicePanelAction,
  VoiceState,
  VoiceStatus,
  VoiceNavigationAction,
} from '@/types/voice';
import {
  initialVoiceMode,
  VoiceApiClient,
  VoiceApiError,
} from '@/utils/voice-api';

type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

type RecognitionErrorEvent = { error: string };

type BrowserRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => BrowserRecognition;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

type VoiceControllerOptions = {
  onPanel?: (panel: VoicePanelAction | null) => void;
  onVoiceResponse?: (response: VoiceGatewayResponse) => void;
  onNavigation?: (
    action: VoiceNavigationAction,
    response: VoiceGatewayResponse,
  ) => boolean;
  onStateChange?: (state: VoiceState) => void;
  /**
   * When true (default), the voice session is created immediately on mount.
   * Pass false until auth is ready to avoid firing the session request before
   * the access token is available, which would produce a 401 and fall back
   * to demo mode.
   */
  authReady?: boolean;
};

const recoveryCopy: Record<string, { message: string; status: VoiceStatus }> = {
  'not-allowed': {
    message: 'Microphone blocked. Keyboard mode is active; update browser permissions to retry.',
    status: 'microphone_blocked',
  },
  'service-not-allowed': {
    message: 'Speech recognition is unavailable by browser policy. Keyboard mode is active.',
    status: 'recognition_unavailable',
  },
  network: {
    message: 'Recognition service unavailable. Keyboard mode is active; retry when ready.',
    status: 'recognition_unavailable',
  },
  aborted: {
    message: 'Listening was stopped. Keyboard mode remains available.',
    status: 'keyboard_mode',
  },
};

export function useVoiceController({
  onPanel,
  onVoiceResponse,
  onNavigation,
  onStateChange,
  authReady = true,
}: VoiceControllerOptions = {}) {
  const router = useRouter();
  const api = useRef(new VoiceApiClient());
  const recognition = useRef<BrowserRecognition | null>(null);
  const recognitionAttempt = useRef<symbol | null>(null);
  const lastResponse = useRef('');
  const recoveryTimer = useRef<number | null>(null);
  const speechPulseTimer = useRef<number | null>(null);
  const speechWasCancelled = useRef(false);
  const submissionInFlight = useRef(false);
  const [state, setState] = useState<VoiceState>('idle');
  const [mode, setMode] = useState<VoiceMode>(initialVoiceMode);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('voice_ready');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState<
    'unknown' | 'granted' | 'denied'
  >('unknown');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechAmplitude, setSpeechAmplitude] = useState(0.24);

  const clearRecoveryTimer = useCallback(() => {
    if (recoveryTimer.current !== null) {
      window.clearTimeout(recoveryTimer.current);
      recoveryTimer.current = null;
    }
  }, []);

  const clearSpeechPulse = useCallback(() => {
    if (speechPulseTimer.current !== null) {
      window.clearInterval(speechPulseTimer.current);
      speechPulseTimer.current = null;
    }
    setSpeechAmplitude(0.24);
  }, []);

  const settle = useCallback((delay = 0) => {
    clearRecoveryTimer();
    recoveryTimer.current = window.setTimeout(() => {
      setState('idle');
      recoveryTimer.current = null;
    }, delay);
  }, [clearRecoveryTimer]);

  const navigate = useCallback((result: VoiceGatewayResponse) => {
    onPanel?.(result.panel_action ?? null);
    const action = result.navigation_action;
    if (!action) return;
    if (onNavigation?.(action, result)) return;
    if (action.path === 'back') {
      router.back();
      return;
    }
    const destination = action.focus
      ? action.path + '#' + encodeURIComponent(action.focus)
      : action.path;
    window.setTimeout(() => router.push(destination), 300);
  }, [onNavigation, onPanel, router]);

  const stopSpeech = useCallback(() => {
    speechWasCancelled.current = true;
    clearSpeechPulse();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [clearSpeechPulse]);

  const speak = useCallback((text: string) => {
    if (muted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('idle');
      setVoiceStatus('voice_ready');
      return;
    }
    stopSpeech();
    speechWasCancelled.current = false;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language || 'en-GB';
    utterance.rate = 0.96;
    utterance.pitch = 0.92;
    utterance.onstart = () => {
      setState('speaking');
      setVoiceStatus('voice_ready');
      let tick = 0;
      speechPulseTimer.current = window.setInterval(() => {
        tick += 1;
        setSpeechAmplitude(0.28 + (Math.sin(tick * 1.47) + 1) * 0.26);
      }, 130);
    };
    utterance.onend = () => {
      clearSpeechPulse();
      setState('idle');
      setVoiceStatus('voice_ready');
    };
    utterance.onerror = (event) => {
      clearSpeechPulse();
      const errorCode = (event as SpeechSynthesisErrorEvent).error;
      if (speechWasCancelled.current || errorCode === 'interrupted' || errorCode === 'canceled') {
        setVoiceStatus('speech_playback_interrupted');
        settle(180);
        return;
      }
      setError('Browser speech playback was interrupted. You can continue by keyboard.');
      setVoiceStatus('keyboard_mode');
      setKeyboardOpen(true);
      setState('warning');
      settle(700);
    };
    window.speechSynthesis.speak(utterance);
  }, [clearSpeechPulse, muted, settle, stopSpeech]);

  const submitTranscript = useCallback(async (value: string) => {
    const finalTranscript = value.trim();
    if (!finalTranscript || submissionInFlight.current) return;
    clearRecoveryTimer();
    setTranscript(finalTranscript);
    setPartialTranscript('');
    setError(null);
    setVoiceStatus('idle');
    setState('thinking');
    try {
      submissionInFlight.current = true;
      const result = await api.current.submitTranscript(finalTranscript);
      setMode(api.current.mode);
      setResponse(result.visual_response_text);
      lastResponse.current = result.response_text;
      onVoiceResponse?.(result);
      if (result.approval_request) {
        setState('awaiting_approval');
        setVoiceStatus('voice_ready');
      }
      navigate(result);
      if (!result.approval_request) speak(result.response_text);
    } catch (caught) {
      setError(
        caught instanceof VoiceApiError && caught.kind === 'busy'
          ? 'Arima is still processing your previous request.'
          : caught instanceof Error ? caught.message : 'Voice request failed.',
      );
      setVoiceStatus('keyboard_mode');
      setKeyboardOpen(true);
      setState('warning');
      settle(800);
    } finally {
      submissionInFlight.current = false;
    }
  }, [clearRecoveryTimer, navigate, onVoiceResponse, settle, speak]);

  const handleRecognitionFailure = useCallback((code: string) => {
    const normalized = code.toLowerCase();
    const recovery = recoveryCopy[normalized] ?? {
      message: 'Speech recognition is unavailable right now. Keyboard mode is active; retry when ready.',
      status: 'recognition_unavailable' as VoiceStatus,
    };
    if (normalized === 'not-allowed') setMicrophonePermission('denied');
    setError(recovery.message);
    setVoiceStatus(recovery.status);
    setKeyboardOpen(true);
    setPartialTranscript('');
    setState('warning');
    settle(700);
  }, [settle]);

  const startListening = useCallback(async () => {
    if (recognition.current !== null || recognitionAttempt.current !== null) return;
    if (!api.current.enabled) {
      setError('Voice is disabled by configuration. Keyboard fallback remains available.');
      setVoiceStatus('keyboard_mode');
      setKeyboardOpen(true);
      return;
    }
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechSupported(false);
      setError('Browser voice unsupported. Keyboard mode is active.');
      setVoiceStatus('browser_unsupported');
      setKeyboardOpen(true);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setSpeechSupported(false);
      setError('Microphone access is unavailable in this browser. Keyboard mode is active.');
      setVoiceStatus('browser_unsupported');
      setKeyboardOpen(true);
      return;
    }
    const attempt = Symbol('voice-recognition');
    recognitionAttempt.current = attempt;
    clearRecoveryTimer();
    setState('requesting_microphone');
    setVoiceStatus('requesting_microphone');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophonePermission('granted');
    } catch {
      if (recognitionAttempt.current !== attempt) return;
      recognitionAttempt.current = null;
      setMicrophonePermission('denied');
      setError('Microphone blocked. Keyboard mode is active; update browser permissions to retry.');
      setVoiceStatus('microphone_blocked');
      setKeyboardOpen(true);
      setState('warning');
      settle(700);
      return;
    }
    if (recognitionAttempt.current !== attempt) return;
    const recognizer = new Recognition();
    let finalSubmitted = false;
    recognizer.continuous = false;
    recognizer.interimResults = true;
    recognizer.lang = navigator.language || 'en-GB';
    recognizer.onresult = (event) => {
      if (recognition.current !== recognizer || finalSubmitted) return;
      let partial = '';
      let final = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const item = event.results[index];
        if (item.isFinal) final += item[0].transcript;
        else partial += item[0].transcript;
      }
      if (partial) {
        setState('speech_detected');
        setPartialTranscript(partial);
      }
      if (final) {
        finalSubmitted = true;
        void submitTranscript(final);
      }
    };
    recognizer.onerror = (event) => {
      if (recognition.current !== recognizer) return;
      recognition.current = null;
      handleRecognitionFailure(event.error);
    };
    recognizer.onend = () => {
      if (recognition.current !== recognizer) return;
      recognition.current = null;
      setState((current) => (
        current === 'listening' || current === 'speech_detected' ? 'idle' : current
      ));
    };
    recognitionAttempt.current = null;
    recognition.current = recognizer;
    try {
      recognizer.start();
      setState('listening');
      setVoiceStatus('listening_restored');
    } catch {
      if (recognition.current === recognizer) recognition.current = null;
      handleRecognitionFailure('network');
    }
  }, [clearRecoveryTimer, handleRecognitionFailure, settle, submitTranscript]);

  const retryListening = useCallback(async () => {
    setVoiceStatus('retrying');
    setError(null);
    await startListening();
  }, [startListening]);

  const stopListening = useCallback(() => {
    recognitionAttempt.current = null;
    const activeRecognition = recognition.current;
    recognition.current = null;
    activeRecognition?.stop();
    setPartialTranscript('');
    setState('idle');
    setVoiceStatus('voice_ready');
  }, []);

  const interrupt = useCallback(async () => {
    recognitionAttempt.current = null;
    recognition.current?.abort();
    recognition.current = null;
    stopSpeech();
    setState('interrupted');
    setVoiceStatus('speech_playback_interrupted');
    settle(460);
    try {
      await api.current.interrupt();
    } catch {
      setError('Arima stopped locally; the live gateway could not be notified.');
    }
  }, [settle, stopSpeech]);

  const cancel = useCallback(async () => {
    recognitionAttempt.current = null;
    recognition.current?.abort();
    recognition.current = null;
    stopSpeech();
    setState('cancelled');
    setVoiceStatus('voice_ready');
    settle(460);
    try {
      await api.current.cancel();
    } catch {
      setError('The local session was cancelled; the live gateway could not be notified.');
    }
  }, [settle, stopSpeech]);

  const repeat = useCallback(() => {
    if (lastResponse.current) speak(lastResponse.current);
  }, [speak]);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  useEffect(() => {
    let active = true;
    if (!authReady) return undefined;
    void api.current.createSession().then(() => {
      if (active) setMode(api.current.mode);
    }).catch((caught) => {
      if (!active) return;
      setError(caught instanceof Error ? caught.message : 'Voice session setup failed.');
      setVoiceStatus('keyboard_mode');
      setKeyboardOpen(true);
      setState('warning');
    });
    const supportTimer = window.setTimeout(() => {
      const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      setSpeechSupported(Boolean(Recognition));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(supportTimer);
      recognitionAttempt.current = null;
      recognition.current?.abort();
      recognition.current = null;
      stopSpeech();
      clearRecoveryTimer();
    };
  }, [authReady, clearRecoveryTimer, stopSpeech]);

  return {
    state,
    mode,
    voiceStatus,
    partialTranscript,
    transcript,
    response,
    error,
    muted,
    captions,
    keyboardOpen,
    microphonePermission,
    speechSupported,
    speechAmplitude,
    setMuted,
    setCaptions,
    setKeyboardOpen,
    startListening,
    retryListening,
    stopListening,
    submitTranscript,
    interrupt,
    cancel,
    repeat,
  };
}
