'use client';

import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { AvatarVisualState } from '@/types/experience';
import styles from '@/components/neural/NeuralExperience.module.css';

type Props = {
  state: AvatarVisualState;
  amplitude: number;
  arrival?: 'seed' | 'spiral' | 'ocean' | 'ready';
  onActivate: () => void;
  onInterrupt?: () => void;
};

const stateCopy: Record<AvatarVisualState, string> = {
  dormant: 'Dormant intelligence',
  idle: 'Arima is ready',
  awakening: 'Arima is awakening',
  listening: 'Arima is listening',
  speech_detected: 'Speech detected',
  processing: 'Arima is processing',
  thinking: 'Arima is thinking',
  executing: 'Arima is executing a protected plan',
  awaiting_approval: 'Arima is awaiting approval',
  presenting: 'Arima is presenting intelligence',
  speaking: 'Arima is speaking',
  interrupted: 'Arima was interrupted',
  warning: 'Arima has a warning',
  error: 'Arima needs attention',
  completed: 'Arima completed the task',
};

function ArimaAvatarComponent({
  state,
  amplitude,
  arrival = 'ready',
  onActivate,
  onInterrupt,
}: Props) {
  const speaking = state === 'speaking';
  const voiceLevel = Math.min(1, Math.max(0, amplitude));
  return (
    <div
      className={styles.avatarStage}
      data-avatar-state={state}
      data-arrival={arrival}
      style={{ '--voice-level': (voiceLevel * 28).toFixed(1) + '%' } as CSSProperties}
    >
      <button
        type="button"
        className={styles.avatar}
        onClick={speaking && onInterrupt ? onInterrupt : onActivate}
        aria-label={speaking ? 'Interrupt Arima' : 'Enter Arima neural core'}
        aria-describedby="arima-avatar-state"
      >
        <span className={styles.avatarAssembly} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span>
        <span className={styles.avatarAura} aria-hidden="true"><i /><i /><i /></span>
        <span className={styles.avatarEnergyShell} aria-hidden="true"><i /><i /><i /><i /></span>
        <span className={styles.avatarFrame} aria-hidden="true" />
        <svg className={styles.avatarMask} viewBox="0 0 280 320" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="avatar-mask" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#d8f8ff" stopOpacity=".7" />
              <stop offset="45%" stopColor="#5ac4ff" stopOpacity=".24" />
              <stop offset="100%" stopColor="#081e35" stopOpacity=".85" />
            </linearGradient>
            <linearGradient id="avatar-neural" x1="0" x2="1">
              <stop offset="0%" stopColor="#48b7ff" stopOpacity=".05" />
              <stop offset="50%" stopColor="#d5f8ff" stopOpacity=".9" />
              <stop offset="100%" stopColor="#c56cff" stopOpacity=".1" />
            </linearGradient>
            <radialGradient id="avatar-energy" cx="50%" cy="43%" r="58%">
              <stop offset="0%" stopColor="#ebfcff" stopOpacity=".95" />
              <stop offset="24%" stopColor="#80d8ff" stopOpacity=".54" />
              <stop offset="66%" stopColor="#18689f" stopOpacity=".2" />
              <stop offset="100%" stopColor="#051121" stopOpacity=".04" />
            </radialGradient>
          </defs>
          <path className={styles.avatarEnergyBody} d="M140 16C84 18 53 59 52 118c-1 39 11 72 35 97 7 8 10 18 10 31v35h86v-35c0-13 3-23 10-31 24-25 36-58 35-97-1-59-32-100-88-102Z" />
          <path className={styles.avatarHead} d="M140 16C84 18 53 59 52 118c-1 39 11 72 35 97 7 8 10 18 10 31v35h86v-35c0-13 3-23 10-31 24-25 36-58 35-97-1-59-32-100-88-102Z" />
          <path className={styles.avatarFace} d="M140 45c-35 0-59 27-59 68 0 30 11 54 30 70l7 59h44l7-59c19-16 30-40 30-70 0-41-24-68-59-68Z" />
          <path className={styles.avatarBridge} d="M140 73v111M95 135l45 14 45-14M109 190l31-12 31 12M115 224h50" />
          <path className={styles.avatarCircuit} d="M73 120C99 96 105 67 140 50c35 17 41 46 67 70M79 160c22 6 32 20 42 40M201 160c-22 6-32 20-42 40M100 95l18 22M180 95l-18 22M92 213l24-5M188 213l-24-5" />
          <path className={styles.avatarCurrent} d="M57 146C81 131 88 99 110 75c16-17 38-27 63-31M223 154c-27 10-38 40-54 61-13 16-33 27-57 34M78 203c21-4 35 16 62 19 29 3 47-18 64-26" />
          <path className={styles.avatarWave} d="M64 99C105 68 166 66 215 106M57 178c38 29 117 40 167 5M89 244c31 16 74 16 103-1" />
          <path className={styles.avatarWave} d="M72 128c42-19 91-18 137 3M82 210c38 20 79 21 119 2" />
          <circle className={styles.avatarEye} cx="112" cy="132" r="7" />
          <circle className={styles.avatarEye} cx="168" cy="132" r="7" />
          <circle className={styles.avatarCore} cx="140" cy="160" r="11" />
        </svg>
        <span className={styles.avatarVoiceField} data-active={speaking} aria-hidden="true">
          <i /><i /><i />
        </span>
        <span className={styles.avatarReadout} aria-hidden="true">
          <b>ARIMA</b>
        </span>
      </button>
      <p id="arima-avatar-state" className={styles.avatarStatus} role="status" aria-live="polite">
        {stateCopy[state]}
      </p>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders when parent re-renders
export const ArimaAvatar = memo(ArimaAvatarComponent);