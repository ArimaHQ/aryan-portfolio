// ─── Arima Universe — Mind Map Canvas ───
// 🧠 Cinematic interactive mind map with camera controls

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MindNodeComponent } from './MindNode';
import { ConnectionLine } from './ConnectionLine';
import { CameraController } from './CameraController';
import type { MindNode, ConnectionLine as ConnectionLineType, CameraState } from '@/types';

interface MindMapCanvasProps {
  nodes: MindNode[];
  connections: ConnectionLineType[];
  onNodeClick?: (nodeId: string) => void;
}

const INITIAL_CAMERA: CameraState = { x: 0, y: 0, zoom: 1 };

export function MindMapCanvas({ nodes, connections, onNodeClick }: MindMapCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<CameraState>(INITIAL_CAMERA);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleCameraChange = useCallback((newCamera: Partial<CameraState>) => {
    setCamera((prev) => ({ ...prev, ...newCamera }));
  }, []);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-screen overflow-hidden bg-black"
    >
      {/* Cinematic background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 via-blue-950/5 to-black" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(100, 180, 255, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 180, 255, 0.12) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vmin] h-[80vmin] rounded-full bg-gradient-to-br from-blue-500/[0.03] via-transparent to-transparent blur-3xl pointer-events-none" />

      {/* Camera Transform Layer */}
      <motion.div
        className="absolute inset-0"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isReady ? 1 : 0 }}
        transition={{ duration: 1.5 }}
      >
        {/* Connection Lines Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((conn, index) => {
            const sourceNode = nodes.find((n) => n.id === conn.sourceId);
            const targetNode = nodes.find((n) => n.id === conn.targetId);
            return (
              <ConnectionLine
                key={conn.id}
                connection={conn}
                sourceNode={sourceNode}
                targetNode={targetNode}
                delay={index * 0.05}
              />
            );
          })}
        </svg>

        {/* Nodes Layer */}
        {nodes.map((node, index) => (
          <MindNodeComponent
            key={node.id}
            node={node}
            onClick={() => onNodeClick?.(node.id)}
            delay={index * 0.03}
          />
        ))}
      </motion.div>

      {/* Camera Controls */}
      <CameraController
        camera={camera}
        onCameraChange={handleCameraChange}
        containerRef={canvasRef}
      />

      {/* Zoom indicator */}
      <div className="fixed bottom-6 right-6 text-[8px] font-mono text-blue-400/30 tracking-wider pointer-events-none">
        {Math.round(camera.zoom * 100)}%
      </div>
    </div>
  );
}
