// ─── Arima Universe — Stage 2: Mind Map ───
// 🧠 Interactive cinematic mind map with Arima ecosystem
// Stable production version — cinematic integration deferred

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MindMapCanvas } from '@/features/mindmap/MindMapCanvas';
import { MIND_MAP_NODES, MIND_MAP_CONNECTIONS } from '@/features/mindmap/data';

export default function MindMapPage() {
  const router = useRouter();
  const [showChoices, setShowChoices] = useState(false);

  const handleNodeClick = useCallback(() => {
    setShowChoices(true);
  }, []);

  return (
    <div className="relative">
      <MindMapCanvas
        nodes={MIND_MAP_NODES}
        connections={MIND_MAP_CONNECTIONS}
        onNodeClick={handleNodeClick}
      />

      {/* Bottom choices overlay */}
      <AnimatePresence>
        {showChoices && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent h-48" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 pb-10 pt-20 px-6 pointer-events-auto">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/register')}
                className="group relative px-10 py-4 min-w-[220px]"
              >
                <div className="absolute inset-0 border border-white/20 group-hover:border-blue-400/50 transition-colors duration-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative text-white/80 group-hover:text-white text-sm tracking-[0.2em] uppercase font-light">
                  Create an Account
                </span>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/watch-intro')}
                className="group relative px-10 py-4 min-w-[220px]"
              >
                <div className="absolute inset-0 border border-white/10 group-hover:border-white/30 transition-colors duration-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative text-white/40 group-hover:text-white/70 text-sm tracking-[0.2em] uppercase font-light">
                  Watch the Full Journey
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint to explore */}
      {!showChoices && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-mono text-blue-400/30 tracking-widest uppercase animate-pulse pointer-events-none">
          Explore the map to continue
        </div>
      )}
    </div>
  );
}
