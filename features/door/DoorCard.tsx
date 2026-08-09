// ─── Arima Universe — Door Card Component ───
// 🚪 Interactive door card with theme-aware styling.

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { doorReveal, doorHover } from '@/animations/framer';
import type { DoorCardProps } from '@/types';

const DOOR_INDEX: Record<string, number> = {
  'work-with-us': 0,
  'client-portfolio': 1,
  'research-projects': 2,
};

const DOOR_ICONS: Record<string, string> = {
  'work-with-us': '🤝',
  'client-portfolio': '🔐',
  'research-projects': '🔬',
};

export function DoorCard({ door, onEnter, isLocked = false }: DoorCardProps) {
  return (
    <motion.div
      className="relative perspective-[1200px]"
      custom={DOOR_INDEX[door.id] ?? 0}
      variants={doorReveal}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className={cn(
          'relative group cursor-pointer rounded-2xl overflow-hidden',
          'min-h-[400px] md:min-h-[500px]',
          'border border-white/10 hover:border-white/30',
          'transition-all duration-500'
        )}
        whileHover={doorHover.hover}
        whileTap={doorHover.tap}
        onClick={() => !isLocked && onEnter?.(door.id)}
        style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
      >
        {/* Door Background */}
        <div
          className={cn(
            'absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity duration-700'
          )}
          style={{ background: `radial-gradient(ellipse at center, ${door.ambientGlow}, transparent 70%)` }}
        />

        {/* Glass overlay */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm group-hover:backdrop-blur-none transition-all duration-700" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="mb-6">
            {/* Door Icon */}
            <div className="w-20 h-20 mx-auto rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/40 transition-all duration-500">
              <span className="text-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                {DOOR_ICONS[door.id]}
              </span>
            </div>
          </div>

          <h2
            data-animate="door-label"
            className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight"
          >
            {door.label}
          </h2>
          <p className="text-sm text-white/50 uppercase tracking-widest mb-6">
            {door.subtitle}
          </p>
          <p className="text-sm text-white/40 max-w-xs leading-relaxed">
            {door.description}
          </p>

          {/* Enter indicator */}
          {!isLocked && (
            <motion.div
              className="mt-8 text-xs uppercase tracking-widest text-white/30"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Enter →
            </motion.div>
          )}

          {/* Locked indicator */}
          {isLocked && (
            <div className="mt-8 text-xs uppercase tracking-widest text-white/20">
              🔒 Locked
            </div>
          )}
        </div>

        {/* Edge glow on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent" />
        </div>
      </motion.div>
    </motion.div>
  );
}
