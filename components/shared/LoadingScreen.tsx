// ─── Arima Universe — Loading Screen Component ───
// ⏳ Full-screen loading overlay with animated progress.

'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { LoadingScreenProps } from '@/types';

export function LoadingScreen({
  message = 'Loading...',
  progress,
  onComplete,
}: LoadingScreenProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progress === 100 && onComplete) {
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <motion.div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
    >
      {/* Logo mark */}
      <motion.div
        className="mb-8"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-4xl font-bold text-white">
          ARIMA<span className="text-amber-400">◈</span>
        </span>
      </motion.div>

      {/* Progress bar */}
      <div className="w-48 h-[1px] bg-white/10 relative overflow-hidden rounded-full">
        <motion.div
          className="absolute inset-y-0 left-0 bg-white/60"
          initial={{ width: '0%' }}
          animate={{ width: progress ? `${progress}%` : '60%' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Message */}
      <p className="mt-4 text-xs text-white/30 tracking-widest uppercase">
        {message}
      </p>
    </motion.div>
  );
}