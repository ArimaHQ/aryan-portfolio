import type {
  VoiceGatewayResponse,
  VoiceHealth,
  VoiceMode,
  VoiceNavigationAction,
  VoicePanelAction,
  VoiceSession,
} from '@/types/voice';
import type {
  ActiveChamber,
  ExperienceEvent,
  ExperienceEventType,
} from '@/types/experience';
import { authApi, getAccessToken } from '@/lib/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
const FORCE_DEMO = process.env.NEXT_PUBLIC_ARIMA_DEMO_MODE === 'true';
const VOICE_ENABLED = process.env.NEXT_PUBLIC_ARIMA_VOICE_ENABLED !== 'false';
const REQUEST_TIMEOUT_MS = 8_000;

export type VoiceApiErrorKind =
  | 'authentication'
  | 'authorization'
  | 'server'
  | 'network'
  | 'configuration';

export class VoiceApiError extends Error {
  readonly kind: VoiceApiErrorKind;
  readonly status?: number;

  constructor(message: string, kind: VoiceApiErrorKind, status?: number) {
    super(message);
    this.name = 'VoiceApiError';
    this.kind = kind;
    this.status = status;
  }
}

export const initialVoiceMode: VoiceMode = FORCE_DEMO ? 'demo' : 'live';

const command = (transcript: string): {
  text: string;
  navigation?: VoiceNavigationAction;
  panel?: VoicePanelAction;
  presentation?: 'daily' | 'weekly' | 'watchlist' | 'quant' | 'growth' | 'task' | 'approval';
} => {
  const value = transcript.toLowerCase().replace(/[?.!,]/g, '');
  if (
    value.includes('enter arima')
    || value.includes('open your intelligence')
    || value.includes('show me your mind')
  ) return {
    text: 'Opening my neural core.',
    navigation: { path: '/executive?enter=true', label: 'Arima Neural Core', focus: 'enter' },
  };
  if (
    value.includes('exit the neural core')
    || value.includes('return to arima')
    || value.includes('exit arima')
  ) return {
    text: 'Returning to my avatar view.',
    navigation: { path: 'back', label: 'Arima avatar', focus: 'exit' },
  };
  if (value.includes('weekly') || value.includes('performance')) return {
    text: 'Opening Portfolio Intelligence with this simulated weekly performance presentation.',
    navigation: { path: '/executive?chamber=portfolio', label: 'Portfolio Intelligence' },
    presentation: 'weekly',
  };
  if (value.includes('portfolio')) return {
    text: 'Following the portfolio pathway into Portfolio Intelligence.',
    navigation: { path: '/executive?chamber=portfolio', label: 'Portfolio Intelligence' },
    presentation: 'watchlist',
  };
  if (value.includes('quant research') || value.includes('regime')) return {
    text: 'Following the Quant Research pathway. The regime field is forming.',
    navigation: { path: '/executive?chamber=quant', label: 'Quant Research' },
    presentation: 'quant',
  };
  if (value.includes('growth') && value.includes('today')) return {
    text: 'Following the Growth pathway. Today’s private output is assembling.',
    navigation: { path: '/executive?chamber=growth', label: 'Growth Studio', focus: 'today' },
    panel: { panel: 'growth_output', focus: 'today' },
    presentation: 'growth',
  };
  if (value.includes('growth studio')) return {
    text: 'Following the Growth pathway.',
    navigation: { path: '/executive?chamber=growth', label: 'Growth Studio' },
    presentation: 'growth',
  };
  if (value.includes('project') || value.includes('complete a simulated task')) return {
    text: 'Following the Projects pathway. A completion signal is returning to the core.',
    navigation: { path: '/executive?chamber=projects', label: 'Projects' },
    presentation: 'task',
  };
  if (value.includes('go back')) return {
    text: 'Returning to Arima.',
    navigation: { path: 'back', label: 'Arima avatar', focus: 'exit' },
  };
  if (value.includes('approval')) return {
    text: 'Two simulated approval objects are ready for review.',
    navigation: { path: '/executive?chamber=approvals', label: 'Approvals' },
    panel: { panel: 'executive_briefing', focus: 'approvals' },
    presentation: 'approval',
  };
  if (value.includes('brief') || value.includes("what's up") || value.includes('whats up')) return {
    text: 'Today’s simulated intelligence is ready: three priorities, five watchlist assets, scheduled research and two approvals.',
    panel: { panel: 'executive_briefing', focus: 'today' },
    presentation: 'daily',
  };
  return {
    text: 'I am in demo mode. Ask about today, Portfolio, Quant Research, Growth, Projects or approvals.',
    panel: { panel: 'executive_briefing', focus: 'today' },
    presentation: 'daily',
  };
};

const id = () => globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}`;

const now = () => new Date().toISOString();

const event = (
  sessionId: string,
  correlationId: string,
  type: ExperienceEventType,
  timestamp: string,
  payload: Record<string, unknown>,
  targetChamber: ActiveChamber | null = null,
): ExperienceEvent => ({
  event_id: id(),
  session_id: sessionId,
  correlation_id: correlationId,
  timestamp,
  type,
  priority: targetChamber === 'approvals' ? 'high' : 'normal',
  source: 'browser_demo',
  target_chamber: targetChamber,
  payload,
  duration_hint: 1_000,
  dismissible: true,
  requires_attention: targetChamber === 'approvals',
});

function demoExperienceEvents(
  sessionId: string,
  correlationId: string,
  timestamp: string,
  resolved: ReturnType<typeof command>,
): ExperienceEvent[] {
  const events: ExperienceEvent[] = [
    event(sessionId, correlationId, 'avatar_state_changed', timestamp, { state: 'thinking' }),
    event(sessionId, correlationId, 'neural_activity_started', timestamp, { activity: 'demo_request' }),
  ];
  const path = resolved.navigation?.path;
  const target = path?.includes('portfolio') ? 'portfolio'
    : path?.includes('quant') ? 'quant'
      : path?.includes('growth') ? 'growth'
        : path?.includes('projects') ? 'projects'
          : path?.includes('approvals') ? 'approvals'
            : null;
  if (target) {
    events.push(event(
      sessionId,
      correlationId,
      'chamber_transition_requested',
      timestamp,
      { path, label: resolved.navigation?.label ?? target, demo: true },
      target,
    ));
  }
  if (resolved.presentation === 'daily') {
    events.push(
      event(sessionId, correlationId, 'data_object_created', timestamp, {
        id: 'daily-intelligence',
        kind: 'insight',
        title: 'Daily intelligence ready',
        source: 'demo',
      }, 'executive'),
      event(sessionId, correlationId, 'watchlist_visualisation_requested', timestamp, {
        title: 'Daily watchlist generated',
        source: 'demo',
      }, 'portfolio'),
    );
  }
  if (resolved.presentation === 'weekly') {
    events.push(event(sessionId, correlationId, 'performance_visualisation_requested', timestamp, {
      title: 'Weekly performance complete',
      source: 'demo',
    }, 'portfolio'));
  }
  if (resolved.presentation === 'quant') {
    events.push(event(sessionId, correlationId, 'data_object_created', timestamp, {
      kind: 'research',
      title: 'Market regime analysis',
      source: 'demo',
    }, 'quant'));
  }
  if (resolved.presentation === 'growth') {
    events.push(event(sessionId, correlationId, 'task_visualisation_requested', timestamp, {
      kind: 'task',
      title: 'Growth task complete',
      source: 'demo',
    }, 'growth'));
  }
  if (resolved.presentation === 'task') {
    events.push(event(sessionId, correlationId, 'task_visualisation_requested', timestamp, {
      kind: 'task',
      title: 'Portfolio Risk Report',
      source: 'demo',
      status: 'complete',
    }, 'projects'));
  }
  if (resolved.presentation === 'approval') {
    events.push(event(sessionId, correlationId, 'approval_visualisation_requested', timestamp, {
      kind: 'approval',
      title: 'Investor update draft',
      source: 'demo',
      requires_attention: true,
    }, 'approvals'));
  }
  events.push(
    event(sessionId, correlationId, 'avatar_state_changed', timestamp, { state: 'speaking' }),
    event(sessionId, correlationId, 'neural_activity_completed', timestamp, { activity: 'demo_request' }),
  );
  return events;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw new VoiceApiError('Arima API URL is not configured.', 'configuration');
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const performRequest = () => {
      const token = getAccessToken();
      return fetch(`${API_URL}${path}`, {
        ...init,
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': id(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });
    };
    let response = await performRequest();
    if (response.status === 401) {
      try {
        await authApi.refresh();
        response = await performRequest();
      } catch {
        // Preserve the original unauthorized response below when rotation fails.
      }
    }
    if (!response.ok) {
      let detail: string | undefined;
      try {
        const body = await response.clone().json() as { detail?: unknown };
        if (typeof body.detail === 'string') detail = body.detail;
      } catch {
        // Keep provider/backend response details out of the browser error when absent.
      }
      const message = detail || `Voice API returned ${response.status}.`;
      const kind: VoiceApiErrorKind = response.status === 401
        ? 'authentication'
        : response.status === 403 || response.status < 500
          ? 'authorization'
          : 'server';
      throw new VoiceApiError(message, kind, response.status);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof VoiceApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new VoiceApiError('The Arima voice service timed out. Please try again.', 'network');
    }
    throw new VoiceApiError('Unable to reach the Arima voice service. Please try again.', 'network');
  } finally {
    window.clearTimeout(timeout);
  }
}

function demoSession(): VoiceSession {
  const timestamp = now();
  return {
    session_id: id(),
    user_id: 'demo-user',
    correlation_id: id(),
    state: 'idle',
    language: 'en',
    locale: 'en-GB',
    timezone: 'Europe/London',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function demoResponse(sessionId: string, transcript: string): VoiceGatewayResponse {
  const resolved = command(transcript);
  const timestamp = now();
  const correlationId = id();
  return {
    session_id: sessionId,
    correlation_id: correlationId,
    state: 'completed',
    transcript,
    response_text: resolved.text,
    visual_response_text: resolved.text,
    navigation_action: resolved.navigation,
    panel_action: resolved.panel,
    approval_request: null,
    demo: true,
    experience_events: demoExperienceEvents(sessionId, correlationId, timestamp, resolved),
    events: [
      { event: 'transcript_final', sequence: 0, timestamp, data: { transcript } },
      { event: 'thinking_started', sequence: 1, timestamp, data: {} },
      ...(resolved.navigation ? [{
        event: 'navigation_requested' as const,
        sequence: 2,
        timestamp,
        data: resolved.navigation,
      }] : []),
      ...(resolved.panel ? [{
        event: 'panel_requested' as const,
        sequence: 3,
        timestamp,
        data: resolved.panel,
      }] : []),
      { event: 'speaking_started', sequence: 4, timestamp, data: { text: resolved.text } },
      { event: 'session_completed', sequence: 5, timestamp, data: {} },
    ],
  };
}

export class VoiceApiClient {
  private session: VoiceSession | null = null;
  private currentMode: VoiceMode = initialVoiceMode;

  get mode(): VoiceMode {
    return this.currentMode;
  }

  get enabled(): boolean {
    return VOICE_ENABLED;
  }

  async createSession(): Promise<VoiceSession> {
    if (this.currentMode === 'demo') {
      this.session = demoSession();
      return this.session;
    }
    this.session = await request<VoiceSession>('/api/v1/voice/sessions', {
      method: 'POST',
      body: JSON.stringify({
        language: navigator.language || 'en-GB',
        locale: navigator.language || 'en-GB',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      }),
    });
    return this.session;
  }

  async submitTranscript(transcript: string): Promise<VoiceGatewayResponse> {
    const session = this.session ?? await this.createSession();
    if (this.currentMode === 'demo') return demoResponse(session.session_id, transcript);
    return request<VoiceGatewayResponse>(
      `/api/v1/voice/sessions/${session.session_id}/transcript`,
      { method: 'POST', body: JSON.stringify({ transcript }) },
    );
  }

  async interrupt(): Promise<void> {
    if (!this.session || this.currentMode === 'demo') return;
    await request(`/api/v1/voice/sessions/${this.session.session_id}/interrupt`, { method: 'POST' });
  }

  async cancel(): Promise<void> {
    if (!this.session || this.currentMode === 'demo') return;
    await request(`/api/v1/voice/sessions/${this.session.session_id}/cancel`, { method: 'POST' });
  }

  async health(): Promise<VoiceHealth> {
    if (this.currentMode === 'demo') {
      return {
        status: 'demo',
        enabled: VOICE_ENABLED,
        provider_neutral: true,
        session_store: 'browser_demo',
        orchestration_available: false,
        checked_at: now(),
      };
    }
    return request<VoiceHealth>('/api/v1/voice/health');
  }
}
