'use client';

import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { ActiveChamber, AnimationPolicy } from '@/types/experience';
import { chamberLabels } from '@/data/experience-demo';
import styles from './NeuralExperience.module.css';

type NetworkNode = {
  id: ActiveChamber | 'memory' | 'background';
  label: string;
  x: number;
  y: number;
  colour: string;
  chamber?: ActiveChamber;
};

const nodes: NetworkNode[] = [
  { id: 'executive', label: 'Executive', x: 50, y: 17, colour: 'white-blue', chamber: 'executive' },
  { id: 'portfolio', label: 'Portfolio', x: 76, y: 29, colour: 'emerald', chamber: 'portfolio' },
  { id: 'quant', label: 'Quant Research', x: 84, y: 52, colour: 'violet', chamber: 'quant' },
  { id: 'growth', label: 'Growth', x: 71, y: 76, colour: 'magenta', chamber: 'growth' },
  { id: 'projects', label: 'Projects', x: 45, y: 84, colour: 'blue', chamber: 'projects' },
  { id: 'publications', label: 'Publications', x: 20, y: 71, colour: 'cyan', chamber: 'publications' },
  { id: 'approvals', label: 'Approvals', x: 15, y: 46, colour: 'amber', chamber: 'approvals' },
  { id: 'health', label: 'System Health', x: 27, y: 25, colour: 'pale', chamber: 'health' },
  { id: 'memory', label: 'Memory', x: 39, y: 31, colour: 'cyan' },
  { id: 'background', label: 'Background', x: 62, y: 62, colour: 'blue' },
];

const organicPath = (node: NetworkNode, index: number) => {
  const directionX = node.x - 50;
  const directionY = node.y - 50;
  const bend = (index % 2 === 0 ? 1 : -1) * (4 + index % 3 * 2);
  const controlOneX = 50 + directionX * 0.23 + bend;
  const controlOneY = 50 + directionY * 0.14 - bend * 0.72;
  const controlTwoX = 50 + directionX * 0.77 - bend * 0.58;
  const controlTwoY = 50 + directionY * 0.82 + bend * 0.44;
  return 'M 50 50 C ' + controlOneX + ' ' + controlOneY + ' '
    + controlTwoX + ' ' + controlTwoY + ' ' + node.x + ' ' + node.y;
};

type Props = {
  activeChamber: ActiveChamber;
  policy: AnimationPolicy;
  onNavigate: (chamber: ActiveChamber) => void;
};

function NeuralNetworkComponent({ activeChamber, policy, onNavigate }: Props) {
  return (
    <div className={styles.network} data-quality={policy.quality} aria-label="Arima intelligence pathways">
      <svg className={styles.networkLines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="neural-path" x1="0" x2="1">
            <stop offset="0%" stopColor="#65c7ff" stopOpacity=".08" />
            <stop offset="50%" stopColor="#d9f6ff" stopOpacity=".72" />
            <stop offset="100%" stopColor="#65c7ff" stopOpacity=".08" />
          </linearGradient>
        </defs>
        {nodes.map((node, index) => (
          <path
            key={node.id}
            className={node.chamber === activeChamber ? styles.networkPathActive : styles.networkPath}
            d={organicPath(node, index)}
          />
        ))}
      </svg>
      {nodes.map((node) => {
        const active = node.chamber === activeChamber;
        const style = {
          '--node-x': node.x + '%',
          '--node-y': node.y + '%',
        } as CSSProperties;
        const content = (
          <>
            <i className={styles.nodePulse} />
            <span>{node.label}</span>
          </>
        );
        return node.chamber ? (
          <button
            key={node.id}
            type="button"
            className={styles.networkNode + ' ' + styles['node' + node.colour] + (active ? ' ' + styles.networkNodeActive : '')}
            style={style}
            onClick={() => onNavigate(node.chamber!)}
            aria-label={'Open ' + chamberLabels[node.chamber] + ' chamber'}
            aria-current={active ? 'page' : undefined}
          >
            {content}
          </button>
        ) : (
          <span
            key={node.id}
            className={styles.networkNode + ' ' + styles['node' + node.colour] + ' ' + styles.networkNodePassive}
            style={style}
            aria-hidden="true"
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const NeuralNetwork = memo(NeuralNetworkComponent);