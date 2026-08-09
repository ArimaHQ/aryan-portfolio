// ─── Arima Universe — Page Transition Component ───
// 🔄 Wraps page content with enter/exit animations.

'use client';

import { motion } from 'framer-motion';
import { pageTransition } from '@/animations/framer';
import type { PageTransitionProps } from '@/types';

export function PageTransition({ children, variant = 'fade' }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen"
      data-transition={variant}
    >
      {children}
    </motion.div>
  );
}

// TODO: Add route-based transition variants
// TODO: Implement GSAP-based page transitions for more complex animations
