// ─── Arima Universe — 404 Page ───
// 🌑 Custom not-found page with cosmic styling.

'use client';

import { motion } from 'framer-motion';
import { AnimatedButton, BackgroundEffects } from '@/components/shared';
import { staggerContainer, staggerItem } from '@/animations/framer';

export default function NotFoundPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
      <BackgroundEffects />

      <motion.div
        className="relative z-10 text-center px-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem} className="mb-8">
          <span className="text-8xl font-bold text-white/10">404</span>
        </motion.div>

        <motion.h1
          variants={staggerItem}
          className="text-3xl md:text-4xl font-bold text-white mb-4"
        >
          Lost in the Universe
        </motion.h1>

        <motion.p
          variants={staggerItem}
          className="text-white/40 mb-8 max-w-md mx-auto"
        >
          This dimension doesn&apos;t exist — or has yet to be discovered. Return to familiar space.
        </motion.p>

        <motion.div variants={staggerItem}>
          <AnimatedButton variant="primary" size="lg" href="/">
            Return Home
          </AnimatedButton>
        </motion.div>
      </motion.div>
    </div>
  );
}
