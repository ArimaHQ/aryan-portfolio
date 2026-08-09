// ─── Arima Universe — Connection Line ───
// 🔗 SVG connection line between mind map nodes

'use client';

import { motion } from 'framer-motion';
import type { ConnectionLine as ConnectionLineType, MindNode } from '@/types';

interface ConnectionLineProps {
  connection: ConnectionLineType;
  sourceNode?: MindNode;
  targetNode?: MindNode;
  delay?: number;
}

export function ConnectionLine({ connection, sourceNode, targetNode, delay = 0 }: ConnectionLineProps) {
  if (!sourceNode || !targetNode) return null;

  const midX1 = sourceNode.x + 200;
  const midY1 = sourceNode.y;
  const midX2 = targetNode.x - 200;
  const midY2 = targetNode.y;

  const pathD = `M ${sourceNode.x} ${sourceNode.y} C ${midX1} ${midY1}, ${midX2} ${midY2}, ${targetNode.x} ${targetNode.y}`;

  const color = sourceNode.color || '#69c8ff';
  const isAnimated = connection.animated ?? true;

  return (
    <motion.path
      d={pathD}
      fill="none"
      stroke={color}
      strokeWidth={0.5}
      strokeOpacity={0.15}
      initial={isAnimated ? { pathLength: 0, opacity: 0 } : false}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={isAnimated
        ? {
            duration: 1.2,
            delay,
            ease: [0.16, 1, 0.3, 1],
          }
        : { duration: 0 }}
      style={{
        filter: `drop-shadow(0 0 4px ${color}44)`,
      }}
    />
  );
}
