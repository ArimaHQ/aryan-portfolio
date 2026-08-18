import type {
  VoiceGatewayResponse,
  VoiceHealth,
  VoiceMode,
  VoiceSession,
} from '@/types/voice';
import { authApi, getAccessToken } from '@/lib/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
const VOICE_ENABLED = process.env.NEXT_PUBLIC_ARIMA_VOICE_ENABLED !== 'false';
const REQUEST_TIMEOUT_MS = 8_000;

export type VoiceApiErrorKind =
  | 'authentication'
  | 'authorization'
  | 'busy'
  | 'client'
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

export const initialVoiceMode: VoiceMode = 'live';

const correlationId = () =>
  globalThis.crypto?.randomUUID?.() ?? `voice-${Date.now()}`;

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
          'X-Correlation-ID': correlationId(),
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
        // Surface the original unauthorized response if refresh fails.
      }
    }
    if (!response.ok) {
      const kind: VoiceApiErrorKind = response.status === 401
        ? 'authentication'
        : response.status === 403
          ? 'authorization'
          : response.status === 409
            ? 'busy'
            : response.status >= 400 && response.status < 500
              ? 'client'
              : 'server';
      throw new VoiceApiError(`Voice API returned ${response.status}.`, kind, response.status);
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

export class VoiceApiClient {
  private session: VoiceSession | null = null;
  private sessionRequest: Promise<VoiceSession> | null = null;
  private sessionGeneration = 0;
  private currentMode: VoiceMode = initialVoiceMode;

  get mode(): VoiceMode {
    return this.currentMode;
  }

  get enabled(): boolean {
    return VOICE_ENABLED;
  }

  invalidateSession(): void {
    this.sessionGeneration += 1;
    this.session = null;
    this.sessionRequest = null;
  }

  async createSession(): Promise<VoiceSession> {
    if (this.session) return this.session;
    if (this.sessionRequest) return this.sessionRequest;
    if (!getAccessToken()) {
      throw new VoiceApiError('Sign in is required before starting an Arima voice session.', 'authentication');
    }

    const generation = this.sessionGeneration;
    const pending = request<VoiceSession>('/api/v1/voice/sessions', {
      method: 'POST',
      body: JSON.stringify({
        language: navigator.language || 'en-GB',
        locale: navigator.language || 'en-GB',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      }),
    }).then((session) => {
      if (generation !== this.sessionGeneration) {
        throw new VoiceApiError('The Arima voice session is no longer active.', 'authentication');
      }
      this.session = session;
      return session;
    });
    this.sessionRequest = pending;
    void pending.then(
      () => {
        if (this.sessionRequest === pending) this.sessionRequest = null;
      },
      () => {
        if (this.sessionRequest === pending) this.sessionRequest = null;
      },
    );
    return pending;
  }

  async submitTranscript(transcript: string): Promise<VoiceGatewayResponse> {
    if (!getAccessToken()) {
      throw new VoiceApiError('Sign in is required before using Arima voice.', 'authentication');
    }
    const generation = this.sessionGeneration;
    const session = await this.createSession();
    if (generation !== this.sessionGeneration) {
      throw new VoiceApiError('The Arima voice session is no longer active.', 'authentication');
    }
    return request<VoiceGatewayResponse>(
      `/api/v1/voice/sessions/${session.session_id}/transcript`,
      { method: 'POST', body: JSON.stringify({ transcript }) },
    );
  }

  async interrupt(): Promise<void> {
    if (!this.session) return;
    if (!getAccessToken()) {
      throw new VoiceApiError('Sign in is required before using Arima voice.', 'authentication');
    }
    await request(`/api/v1/voice/sessions/${this.session.session_id}/interrupt`, { method: 'POST' });
  }

  async cancel(): Promise<void> {
    if (!this.session) return;
    if (!getAccessToken()) {
      throw new VoiceApiError('Sign in is required before using Arima voice.', 'authentication');
    }
    await request(`/api/v1/voice/sessions/${this.session.session_id}/cancel`, { method: 'POST' });
  }

  async health(): Promise<VoiceHealth> {
    return request<VoiceHealth>('/api/v1/voice/health');
  }
}
