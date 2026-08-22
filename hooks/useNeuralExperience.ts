'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAnimationPolicy } from '@/hooks/useAnimationPolicy';
import { avatarStateFromVoice, useAvatarState } from '@/hooks/useAvatarState';
import { useChamberNavigation } from '@/hooks/useChamberNavigation';
import { useExperienceEvents } from '@/hooks/useExperienceEvents';
import type {
  ActiveChamber,
  ExperienceAnnouncement,
  ExperienceMode,
  NeuralDataObject,
} from '@/types/experience';
import type {
  VoiceGatewayResponse,
  VoiceNavigationAction,
  VoiceState,
} from '@/types/voice';
import {
  chamberFromPath,
  executiveChamberPath,
  initialChamberFromLocation,
} from '@/utils/experience-router';

const deduplicate = (objects: NeuralDataObject[]) =>
  Array.from(new Map(objects.map((object) => [object.id, object])).values());

const unavailableIntelligenceMessage =
  'Live intelligence data is unavailable because provider provenance has not been verified. No simulated portfolio, market, risk, execution, or model results are shown.';

export function useNeuralExperience() {
  const [reducedMotionOverride, setReducedMotionOverride] = useState(false);
  const animation = useAnimationPolicy(reducedMotionOverride);
  const { avatarState, transitionAvatar } = useAvatarState();
  const chamber = useChamberNavigation();
  const [mode, setMode] = useState<ExperienceMode>('avatar');
  const [objects, setObjects] = useState<NeuralDataObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<ExperienceAnnouncement | null>(null);
  const entryTimers = useRef<number[]>([]);
  const dismissalTimers = useRef<number[]>([]);
  const didReadInitialRoute = useRef(false);

  const clearEntryTimers = useCallback(() => {
    entryTimers.current.forEach((timer) => window.clearTimeout(timer));
    entryTimers.current = [];
  }, []);

  const addObject = useCallback((object: NeuralDataObject) => {
    setObjects((current) => deduplicate([...current, object]));
  }, []);

  const updateObject = useCallback((id: string, patch: Partial<NeuralDataObject>) => {
    setObjects((current) => current.map((object) => (
      object.id === id ? { ...object, ...patch } : object
    )));
  }, []);

  const dismissObject = useCallback((id: string) => {
    setObjects((current) => current.map((object) => (
      object.id === id ? { ...object, returning: true } : object
    )));
    setSelectedObjectId((current) => current === id ? null : current);
    const dismissal = window.setTimeout(() => {
      setObjects((current) => current.filter((object) => object.id !== id));
      dismissalTimers.current = dismissalTimers.current.filter(
        (timer) => timer !== dismissal,
      );
    }, 460);
    dismissalTimers.current.push(dismissal);
  }, []);

  const announce = useCallback((next: ExperienceAnnouncement) => {
    setAnnouncement(next);
  }, []);

  const writeChamberPath = useCallback((target: ActiveChamber) => {
    if (typeof window === 'undefined') return;
    window.history.replaceState({}, '', executiveChamberPath(target));
  }, []);

  const openChamber = useCallback((target: ActiveChamber) => {
    if (mode === 'avatar' || mode === 'exiting') {
      clearEntryTimers();
      transitionAvatar('awakening');
      setMode('entering');
      entryTimers.current.push(window.setTimeout(() => {
        setMode('neural_core');
      }, animation.reducedMotion ? 0 : 260));
      entryTimers.current.push(window.setTimeout(() => {
        chamber.navigateToChamber(target, {
          from: 'avatar',
          onCommit: (committed) => {
            setMode('chamber');
            writeChamberPath(committed);
            transitionAvatar('presenting');
          },
        });
      }, animation.reducedMotion ? 0 : 380));
      return;
    }
    setMode('chamber');
    chamber.navigateToChamber(target, {
      onCommit: (committed) => {
        writeChamberPath(committed);
        transitionAvatar('presenting');
      },
    });
  }, [
    animation.reducedMotion,
    chamber,
    clearEntryTimers,
    mode,
    transitionAvatar,
    writeChamberPath,
  ]);

  const enterCore = useCallback(() => {
    if (mode !== 'avatar') return;
    clearEntryTimers();
    transitionAvatar('awakening');
    setMode('entering');
    announce({
      id: 'entry',
      message: 'Entering Arima’s neural core.',
    });
    entryTimers.current.push(window.setTimeout(() => {
      setMode('neural_core');
      transitionAvatar('thinking');
    }, animation.reducedMotion ? 0 : 680));
    entryTimers.current.push(window.setTimeout(() => {
      chamber.navigateToChamber('executive', {
        from: 'avatar',
        onCommit: (target) => {
          setMode('chamber');
          writeChamberPath(target);
          transitionAvatar('presenting');
        },
      });
    }, animation.reducedMotion ? 0 : 980));
  }, [
    animation.reducedMotion,
    announce,
    chamber,
    clearEntryTimers,
    mode,
    transitionAvatar,
    writeChamberPath,
  ]);

  const exitCore = useCallback(() => {
    if (mode === 'avatar' || mode === 'exiting') return;
    clearEntryTimers();
    setMode('exiting');
    transitionAvatar('dormant');
    chamber.returnToCore(() => {
      setMode('avatar');
      setSelectedObjectId(null);
      transitionAvatar('idle');
      if (typeof window !== 'undefined') window.history.replaceState({}, '', '/executive');
      announce({ id: 'exit', message: 'Returned to Arima avatar view.' });
    });
  }, [announce, chamber, clearEntryTimers, mode, transitionAvatar]);

  const showDailyIntelligence = useCallback(() => {
    announce({
      id: 'daily-intelligence',
      message: unavailableIntelligenceMessage,
    });
  }, [announce]);

  const showWeeklyPerformance = useCallback(() => {
    announce({
      id: 'weekly-performance',
      message: unavailableIntelligenceMessage,
    });
  }, [announce]);

  const handleVoiceState = useCallback((state: VoiceState) => {
    transitionAvatar(avatarStateFromVoice(state));
  }, [transitionAvatar]);

  const events = useExperienceEvents({
    setAvatar: transitionAvatar,
    navigate: openChamber,
    addObject,
    updateObject,
    dismissObject,
    announce,
  });

  const handleVoiceResponse = useCallback((response: VoiceGatewayResponse) => {
    events.applyVoiceResponse(response);
    const panelFocus = response.panel_action?.focus;
    const content = response.transcript?.toLowerCase() ?? '';
    if (panelFocus === 'today' || content.includes('what') && content.includes('today')) {
      showDailyIntelligence();
    }
    if (panelFocus === 'approvals' || content.includes('approval')) {
      openChamber('approvals');
    }
    if (content.includes('weekly') || content.includes('performance')) {
      openChamber('portfolio');
      showWeeklyPerformance();
    }
  }, [events, openChamber, showDailyIntelligence, showWeeklyPerformance]);

  const handleVoiceNavigation = useCallback((action: VoiceNavigationAction): boolean => {
    if (action.path === 'back' || action.focus === 'exit') {
      exitCore();
      return true;
    }
    if (action.focus === 'enter' || action.path === '/executive?enter=true') {
      enterCore();
      return true;
    }
    const target = chamberFromPath(action.path);
    if (target) {
      openChamber(target);
      return true;
    }
    return false;
  }, [enterCore, exitCore, openChamber]);

  const resolveObjectAction = useCallback((id: string) => {
    announce({
      id: id + '-action-unavailable',
      message: 'Approval actions are unavailable until a verified approval service is connected. No action was submitted.',
    });
  }, [announce]);

  useEffect(() => {
    if (didReadInitialRoute.current) return;
    didReadInitialRoute.current = true;
    const directChamber = initialChamberFromLocation();
    if (!directChamber || directChamber === 'executive') return undefined;
    const bootstrap = window.setTimeout(() => {
      setMode('chamber');
      chamber.setActiveChamber(directChamber);
      transitionAvatar('presenting');
      announce({
        id: 'direct-chamber',
        message: 'Opened ' + directChamber + ' intelligence chamber.',
      });
    }, 0);
    return () => window.clearTimeout(bootstrap);
  }, [announce, chamber, transitionAvatar]);

  useEffect(() => () => {
    clearEntryTimers();
    dismissalTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, [clearEntryTimers]);

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  );

  return {
    mode,
    activeChamber: chamber.activeChamber,
    transition: chamber.transition,
    avatarState,
    animation,
    objects,
    selectedObject,
    announcement,
    enterCore,
    exitCore,
    openChamber,
    handleVoiceState,
    handleVoiceResponse,
    handleVoiceNavigation,
    showDailyIntelligence,
    showWeeklyPerformance,
    selectObject: setSelectedObjectId,
    dismissObject,
    resolveObjectAction,
    reducedMotionOverride,
    setReducedMotionOverride,
  };
}
