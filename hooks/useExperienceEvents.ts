'use client';

import { useCallback } from 'react';
import type {
  ActiveChamber,
  AvatarVisualState,
  ExperienceAnnouncement,
  ExperienceEvent,
  NeuralDataObject,
} from '@/types/experience';
import type { VoiceEvent, VoiceGatewayResponse } from '@/types/voice';
import { chamberFromPath } from '@/utils/experience-router';

type EventHandlers = {
  setAvatar: (state: AvatarVisualState) => void;
  navigate: (chamber: ActiveChamber) => void;
  addObject: (object: NeuralDataObject) => void;
  updateObject: (id: string, patch: Partial<NeuralDataObject>) => void;
  dismissObject: (id: string) => void;
  announce: (announcement: ExperienceAnnouncement) => void;
};

const dataBearingEventTypes = new Set<ExperienceEvent['type']>([
  'data_object_created',
  'data_object_updated',
  'task_visualisation_requested',
  'watchlist_visualisation_requested',
  'performance_visualisation_requested',
  'approval_visualisation_requested',
  'background_job_completed',
  'system_pulse',
]);

const hasVerifiedVoiceProvenance = (response: VoiceGatewayResponse) => {
  return response.demo === false
    && response.provider_provenance === 'verified';
};

const identifier = (prefix: string) =>
  prefix + '-' + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36));

const stringValue = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const chamberValue = (value: unknown): ActiveChamber | null =>
  typeof value === 'string' ? chamberFromPath(value) : null;

const objectFromPayload = (
  payload: Record<string, unknown>,
  fallback: Pick<NeuralDataObject, 'kind' | 'chamber' | 'title'>,
  fallbackSource: NeuralDataObject['source'],
): NeuralDataObject => ({
  id: stringValue(payload.id, identifier('experience')),
  kind: (stringValue(payload.kind, fallback.kind) as NeuralDataObject['kind']),
  chamber: (stringValue(payload.chamber, fallback.chamber) as ActiveChamber),
  title: stringValue(payload.title, fallback.title),
  eyebrow: stringValue(payload.eyebrow) || undefined,
  value: stringValue(payload.value) || undefined,
  summary: stringValue(payload.summary) || undefined,
  source: fallbackSource,
  status: (stringValue(payload.status, 'active') as NeuralDataObject['status']),
  dismissible: payload.dismissible !== false,
  requiresAttention: Boolean(payload.requires_attention),
});

export function useExperienceEvents(handlers: EventHandlers) {
  const applyExperienceEvent = useCallback((
    event: ExperienceEvent,
    verifiedProvenance = false,
  ) => {
    const chamber = event.target_chamber ?? chamberValue(event.payload.path) ?? 'executive';
    const title = stringValue(event.payload.title, event.type.replaceAll('_', ' '));
    const source: NeuralDataObject['source'] = verifiedProvenance ? 'live' : 'demo';
    const explicitlyDemo = event.source === 'browser_demo'
      || event.payload.demo === true
      || event.payload.source === 'demo';

    if (dataBearingEventTypes.has(event.type) && (!verifiedProvenance || explicitlyDemo)) {
      handlers.announce({
        id: event.event_id + '-provenance-unverified',
        message: 'An intelligence response was withheld because its provider provenance could not be verified. No data or action was presented.',
      });
      return;
    }

    switch (event.type) {
      case 'avatar_state_changed':
        handlers.setAvatar(
          stringValue(event.payload.state, 'idle') as AvatarVisualState,
        );
        break;
      case 'neural_activity_started':
        handlers.setAvatar('thinking');
        handlers.announce({
          id: event.event_id,
          message: stringValue(event.payload.label, 'Arima is thinking.'),
        });
        break;
      case 'neural_activity_completed':
        handlers.setAvatar('completed');
        break;
      case 'chamber_transition_requested':
        if (
          event.payload.focus === 'enter'
          || event.payload.focus === 'exit'
          || event.payload.direction === 'back'
          || event.payload.path === 'back'
        ) break;
        handlers.navigate(chamber);
        handlers.announce({
          id: event.event_id,
          message: 'Entering ' + chamber + ' intelligence chamber.',
        });
        break;
      case 'data_object_created':
        handlers.addObject(objectFromPayload(event.payload, {
          kind: 'insight',
          chamber,
          title,
        }, source));
        break;
      case 'data_object_updated': {
        const objectId = stringValue(event.payload.id, stringValue(event.payload.object));
        if (objectId === 'voice_response') {
          handlers.addObject(objectFromPayload({
            ...event.payload,
            id: objectId,
            kind: 'stream',
            title: 'Arima response',
            summary: stringValue(event.payload.content),
          }, {
            kind: 'stream',
            chamber,
            title: 'Arima response',
          }, source));
        } else if (objectId) {
          handlers.updateObject(objectId, event.payload as Partial<NeuralDataObject>);
        }
        break;
      }
      case 'data_object_dismissed': {
        const objectId = stringValue(event.payload.id);
        if (objectId) handlers.dismissObject(objectId);
        break;
      }
      case 'task_visualisation_requested':
      case 'background_job_completed':
        handlers.addObject(objectFromPayload(event.payload, {
          kind: 'task',
          chamber,
          title: title || 'Task completed',
        }, source));
        handlers.setAvatar('completed');
        break;
      case 'watchlist_visualisation_requested':
        handlers.addObject(objectFromPayload(event.payload, {
          kind: 'watchlist',
          chamber: 'portfolio',
          title: title || 'Watchlist generated',
        }, source));
        break;
      case 'performance_visualisation_requested':
        handlers.addObject(objectFromPayload(event.payload, {
          kind: 'performance',
          chamber: 'portfolio',
          title: title || 'Weekly performance',
        }, source));
        break;
      case 'approval_visualisation_requested':
        handlers.addObject(objectFromPayload(event.payload, {
          kind: 'approval',
          chamber: 'approvals',
          title: title || 'Approval required',
        }, source));
        handlers.setAvatar('awaiting_approval');
        break;
      case 'warning_visualisation_requested':
        handlers.addObject(objectFromPayload(event.payload, {
          kind: 'warning',
          chamber,
          title: title || 'Attention required',
        }, source));
        handlers.setAvatar('warning');
        break;
      case 'system_pulse':
        handlers.addObject(objectFromPayload(event.payload, {
          kind: 'notification',
          chamber: 'health',
          title: title || 'System pulse',
        }, source));
        break;
      default:
        break;
    }
  }, [handlers]);

  const applyVoiceEvent = useCallback((
    event: VoiceEvent,
    response: Pick<VoiceGatewayResponse, 'session_id' | 'correlation_id'>,
  ) => {
    const now = event.timestamp;
    const chamber = chamberValue(event.data.path) ?? 'executive';
    const base = {
      event_id: 'voice-' + response.session_id + '-' + event.sequence,
      session_id: response.session_id,
      correlation_id: response.correlation_id,
      timestamp: now,
      priority: 'normal' as const,
      source: 'voice_gateway',
      target_chamber: chamber,
      payload: event.data,
      duration_hint: null,
      dismissible: true,
      requires_attention: false,
    };

    const mapped: ExperienceEvent[] = [];
    if (event.event === 'thinking_started') {
      mapped.push(
        { ...base, type: 'avatar_state_changed', payload: { state: 'thinking' } },
        { ...base, event_id: base.event_id + '-neural', type: 'neural_activity_started', payload: {} },
      );
    } else if (event.event === 'tool_started') {
      mapped.push({
        ...base,
        type: 'avatar_state_changed',
        payload: { state: 'executing', tool: event.data.tool },
      });
    } else if (event.event === 'tool_completed') {
      mapped.push({
        ...base,
        type: 'task_visualisation_requested',
        payload: {
          kind: 'task',
          title: stringValue(event.data.tool, 'Internal task') + ' complete',
          summary: event.data.success === false
            ? 'The protected operation did not complete.'
            : 'A secure execution signal returned to the neural core.',
          status: event.data.success === false ? 'warning' : 'complete',
          source: 'live',
        },
      });
    } else if (event.event === 'approval_required') {
      mapped.push({
        ...base,
        priority: 'high',
        requires_attention: true,
        type: 'approval_visualisation_requested',
        target_chamber: 'approvals',
        payload: {
          kind: 'approval',
          title: stringValue(event.data.title, 'Approval required'),
          summary: stringValue(event.data.reason, 'A protected action needs review.'),
          source: 'live',
          requires_attention: true,
        },
      });
    } else if (event.event === 'navigation_requested') {
      const target = chamberValue(event.data.path);
      if (target) {
        mapped.push({
          ...base,
          type: 'chamber_transition_requested',
          target_chamber: target,
          payload: event.data,
        });
      }
    } else if (event.event === 'panel_requested') {
      const focus = stringValue(event.data.focus);
      if (focus === 'approvals') {
        mapped.push({
          ...base,
          type: 'approval_visualisation_requested',
          target_chamber: 'approvals',
          payload: { kind: 'approval', title: 'Pending approvals', source: 'demo' },
        });
      } else if (focus === 'today') {
        mapped.push({
          ...base,
          type: 'data_object_created',
          payload: { kind: 'insight', title: 'Daily intelligence ready', source: 'demo' },
        });
      }
    } else if (event.event === 'response_chunk') {
      mapped.push({
        ...base,
        type: 'data_object_created',
        payload: {
          id: 'response-stream-' + response.session_id,
          kind: 'stream',
          title: 'Arima response',
          summary: stringValue(event.data.text),
          source: 'live',
        },
      });
    } else if (event.event === 'speaking_started') {
      mapped.push({
        ...base,
        type: 'avatar_state_changed',
        payload: { state: 'speaking' },
      });
    } else if (event.event === 'speaking_stopped') {
      mapped.push({
        ...base,
        type: 'avatar_state_changed',
        payload: { state: 'idle' },
      });
    } else if (event.event === 'session_completed') {
      mapped.push({
        ...base,
        type: 'neural_activity_completed',
        payload: {},
      });
    } else if (event.event === 'session_failed') {
      mapped.push({
        ...base,
        priority: 'high',
        type: 'warning_visualisation_requested',
        payload: { title: 'Voice recovery available', source: 'live' },
      });
    }
    mapped.forEach((mappedEvent) => applyExperienceEvent(mappedEvent, true));
  }, [applyExperienceEvent]);

  const applyVoiceResponse = useCallback((response: VoiceGatewayResponse) => {
    if (!hasVerifiedVoiceProvenance(response)) {
      handlers.announce({
        id: 'voice-' + response.session_id + '-provenance-unverified',
        message: 'Voice intelligence is unavailable until the backend supplies verified non-mock provider provenance. No response, market data, or execution result was presented.',
      });
      return false;
    }
    if (response.experience_events?.length) {
      response.experience_events.forEach((event) => applyExperienceEvent(event, true));
    } else {
      response.events.forEach((event) => applyVoiceEvent(event, response));
    }
    return true;
  }, [applyExperienceEvent, applyVoiceEvent, handlers]);

  return {
    applyExperienceEvent,
    applyVoiceResponse,
  };
}
