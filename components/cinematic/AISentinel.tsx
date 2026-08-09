'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AISentinelProps {
  className?: string;
}

export function AISentinel({ className = '' }: AISentinelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headAngle = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    let breath = 0;
    let scanPos = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      breath += 0.02;
      scanPos = (scanPos + 0.008) % 1;
      headAngle.current = Math.sin(breath * 0.5) * 0.08;

      // Head - abstract geometric humanoid
      ctx.save();
      ctx.translate(cx, cy - 5);
      ctx.rotate(headAngle.current);

      // Halo ring
      ctx.beginPath();
      ctx.ellipse(0, -8, 28, 8, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100, 180, 255, 0.15)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Head shape - angular/geometric
      ctx.beginPath();
      ctx.moveTo(-18, -4);
      ctx.lineTo(-14, -22);
      ctx.lineTo(0, -28);
      ctx.lineTo(14, -22);
      ctx.lineTo(18, -4);
      ctx.closePath();
      ctx.strokeStyle = `rgba(140, 210, 255, ${0.2 + Math.sin(breath) * 0.05})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Inner head lines
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.lineTo(8, -12);
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, -6);
      ctx.strokeStyle = 'rgba(100, 180, 255, 0.1)';
      ctx.lineWidth = 0.3;
      ctx.stroke();

      // Visor - scanning line
      const visorY = -4 + (scanPos - 0.5) * 16;
      ctx.beginPath();
      ctx.moveTo(-15, visorY);
      ctx.lineTo(15, visorY);
      ctx.strokeStyle = `rgba(160, 220, 255, ${0.1 + Math.abs(scanPos - 0.5) * 0.4})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Center eye
      ctx.beginPath();
      ctx.arc(0, -14, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160, 230, 255, ${0.3 + Math.sin(breath * 2) * 0.15})`;
      ctx.fill();

      // Neck lines
      ctx.beginPath();
      ctx.moveTo(-4, 4);
      ctx.lineTo(-6, 16);
      ctx.moveTo(4, 4);
      ctx.lineTo(6, 16);
      ctx.strokeStyle = 'rgba(100, 180, 255, 0.12)';
      ctx.lineWidth = 0.3;
      ctx.stroke();

      ctx.restore();

      // Shoulder structure
      ctx.beginPath();
      ctx.moveTo(cx - 25, cy + 12);
      ctx.lineTo(cx - 18, cy + 6);
      ctx.lineTo(cx + 18, cy + 6);
      ctx.lineTo(cx + 25, cy + 12);
      ctx.strokeStyle = 'rgba(100, 180, 255, 0.12)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Data particles around head
      for (let i = 0; i < 6; i++) {
        const a = breath * 0.5 + (i / 6) * Math.PI * 2;
        const r = 32 + Math.sin(breath + i) * 3;
        const px = cx + Math.cos(a) * r;
        const py = cy - 5 + Math.sin(a) * r;
        ctx.beginPath();
        ctx.arc(px, py, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160, 220, 255, ${0.15 + Math.sin(breath + i) * 0.1})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
    >
      <canvas ref={canvasRef} width={100} height={100} className="absolute" />
      <div className="absolute bottom-0">
        <span className="text-[5px] font-mono tracking-[0.25em] text-blue-400/20">AI SENTINEL</span>
      </div>
    </motion.div>
  );
}
