'use client';

import { memo } from 'react';
import type { ActiveChamber, AnimationPolicy } from '@/types/experience';
import { NeuralNetwork } from './NeuralNetwork';
import styles from './NeuralExperience.module.css';

type Props = {
  activeChamber: ActiveChamber;
  policy: AnimationPolicy;
  active: boolean;
  onNavigate: (chamber: ActiveChamber) => void;
};

function NeuralCoreComponent({ activeChamber, policy, active, onNavigate }: Props) {
  return (
    <section className={styles.neuralCore} data-active={active} aria-label="Arima neural core">
      <div className={styles.coreDepth} aria-hidden="true">
        <i /><i /><i /><span />
      </div>
      <div className={styles.nucleus} aria-hidden="true">
        <span /><span /><span /><em />
        <b>AF</b>
      </div>
      <NeuralNetwork activeChamber={activeChamber} policy={policy} onNavigate={onNavigate} />
    </section>
  );
}

// Memoize to prevent unnecessary re-renders
export const NeuralCore = memo(NeuralCoreComponent);