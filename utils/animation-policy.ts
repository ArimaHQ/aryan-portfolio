import type { AnimationPolicy, AnimationQuality } from '@/types/experience';

export type AnimationSignals = {
  reducedMotion: boolean;
  mobile: boolean;
  hidden: boolean;
  lowPower: boolean;
};

const particleCounts: Record<AnimationQuality, number> = {
  reduced: 0,
  low: 40,
  mobile: 96,
  standard: 120,
  high: 200,
};

const depthLayers: Record<AnimationQuality, number> = {
  reduced: 1,
  low: 2,
  mobile: 3,
  standard: 4,
  high: 5,
};

export const resolveAnimationPolicy = (signals: AnimationSignals): AnimationPolicy => {
  let quality: AnimationQuality = 'high';
  if (signals.reducedMotion) quality = 'reduced';
  else if (signals.lowPower) quality = 'low';
  else if (signals.mobile) quality = 'mobile';
  else if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 4) quality = 'standard';

  return {
    quality,
    reducedMotion: signals.reducedMotion,
    lowPower: signals.lowPower,
    mobile: signals.mobile,
    hidden: signals.hidden,
    paused: signals.hidden || signals.reducedMotion,
    particleCount: particleCounts[quality],
    depthLayers: depthLayers[quality],
  };
};

export const prefersConstrainedAnimation = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const connection = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  return Boolean(
    connection.connection?.saveData
      || connection.connection?.effectiveType === 'slow-2g'
      || connection.connection?.effectiveType === '2g',
  );
};