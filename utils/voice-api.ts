import type {
  VoiceAvailability,
  VoiceGatewayResponse,
  VoiceHealth,
  VoiceMode,
  VoiceSession,
} from '@/types/voice';
import { authApi, getAccessToken } from '@/lib/auth-api';
import { voiceFailureState } from '@/utils/voice-error-contract';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
const VOICE_ENABLED = process.env.NEXT_PUBLIC_ARIMA_VOICE_ENABLED !== 'false';
// Leave response margin after the backend's bounded voice execution deadline.
const REQUEST_TIMEOUT_MS = 25_000;

export const initialVoiceMode: VoiceMode = 'unavailable';

export class VoiceProviderUnavailableError extends Error {
  constructor(message = 'Voice intelligence is unavailable until a verified provider is configured.') {
    super(message);
    this.name = 'VoiceProviderUnavailableError';
  }
}

class VoiceGatewayTimeoutError extends Error {}
class VoiceGatewayUnavailableError extends Error {}
class VoiceAuthorizationError extends Error {}
class VoiceNetworkError extends Error {}

const id = () => globalThis.crypto?.randomUUID?.() ?? `voice-${Date.now()}`;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error('Arima API URL is not configured');
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
    try {
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
        if (response.status === 403) throw new VoiceAuthorizationError('Voice authorization was denied.');
        if (response.status === 504) throw new VoiceGatewayTimeoutError('The verified voice provider timed out. Please try again.');
        if (response.status === 503) throw new VoiceGatewayUnavailableError('The verified voice provider is currently unavailable.');
        throw new Error(`Voice API returned ${response.status}`);
      }
      return await response.json() as T;
    } catch (error) {
      if (error instanceof VoiceAuthorizationError
        || error instanceof VoiceGatewayTimeoutError
        || error instanceof VoiceGatewayUnavailableError
        || error instanceof VoiceNetworkError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new VoiceNetworkError('Unable to reach the Arima voice service before the request timed out.');
      }
      throw new VoiceNetworkError('Unable to reach the Arima voice service. Please try again.');
    }
  } finally {
    window.clearTimeout(timeout);
  }
}

export class VoiceApiClient {
  private session: VoiceSession | null = null;
  private currentMode: VoiceMode = initialVoiceMode;
  private currentAvailability: VoiceAvailability = 'unavailable';
  private currentUnavailableMessage = 'Voice intelligence is unavailable until a verified provider is configured.';

  get mode(): VoiceMode {
    return this.currentMode;
  }

  get availability(): VoiceAvailability {
    return this.currentAvailability;
  }

  get unavailableMessage(): string {
    return this.currentUnavailableMessage;
  }

  get enabled(): boolean {
    return VOICE_ENABLED;
  }

  private markUnavailable(message: string): VoiceProviderUnavailableError {
    this.session = null;
    this.currentMode = 'unavailable';
    this.currentAvailability = 'unavailable';
    this.currentUnavailableMessage = message;
    return new VoiceProviderUnavailableError(message);
  }

  async initialize(): Promise<VoiceAvailability> {
    if (!VOICE_ENABLED) {
      this.markUnavailable('Voice intelligence is disabled by configuration.');
      return this.currentAvailability;
    }
    if (!API_URL) {
      this.markUnavailable('Voice intelligence is unavailable because the Arima API is not configured.');
      return this.currentAvailability;
    }

    this.currentAvailability = 'checking';
    try {
      const health = await request<VoiceHealth>('/api/v1/voice/health');
      const isVerified = health.enabled
        && health.orchestration_available
        && health.provider_provenance === 'verified';
      if (!isVerified) {
        const reason = health.provider_provenance === 'mock'
          ? 'Voice intelligence is unavailable because the configured provider is a mock.'
          : 'Voice intelligence is unavailable until the backend verifies a non-mock provider.';
        this.markUnavailable(reason);
        return this.currentAvailability;
      }
      this.currentMode = 'live';
      this.currentAvailability = 'verified';
      this.currentUnavailableMessage = '';
      return this.currentAvailability;
    } catch {
      this.markUnavailable('Voice intelligence is unavailable while provider provenance cannot be verified.');
      return this.currentAvailability;
    }
  }

  private assertVerified(): void {
    if (this.currentAvailability !== 'verified') {
      throw this.markUnavailable(this.currentUnavailableMessage);
    }
  }

  async createSession(): Promise<VoiceSession> {
    this.assertVerified();
    try {
      this.session = await request<VoiceSession>('/api/v1/voice/sessions', {
        method: 'POST',
        body: JSON.stringify({
          language: 'en',
          locale: navigator.language || 'en-GB',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }),
      });
      return this.session;
    } catch (error) {
      if (error instanceof VoiceAuthorizationError
        || error instanceof VoiceGatewayTimeoutError
        || error instanceof VoiceGatewayUnavailableError) {
        throw error;
      }
      throw this.markUnavailable('Voice intelligence is unavailable because a verified session could not be created.');
    }
  }

  async submitTranscript(transcript: string): Promise<VoiceGatewayResponse> {
    this.assertVerified();
    const session = this.session ?? await this.createSession();
    let response: VoiceGatewayResponse;
    try {
      response = await request<VoiceGatewayResponse>(
        `/api/v1/voice/sessions/${session.session_id}/transcript`,
        { method: 'POST', body: JSON.stringify({ transcript }) },
      );
    } catch (error) {
      if (error instanceof VoiceGatewayTimeoutError) {
        throw this.markUnavailable(voiceFailureState('timeout').message);
      }
      if (error instanceof VoiceGatewayUnavailableError) {
        throw this.markUnavailable(voiceFailureState('unavailable').message);
      }
      if (error instanceof VoiceAuthorizationError) {
        throw this.markUnavailable(voiceFailureState('authorization').message);
      }
      if (error instanceof VoiceNetworkError) {
        throw this.markUnavailable(voiceFailureState('network').message);
      }
      throw this.markUnavailable(voiceFailureState('network').message);
    }
    if (response.demo || response.provider_provenance !== 'verified') {
      throw this.markUnavailable(
        'Voice intelligence is unavailable because the response provider is not verified.',
      );
    }
    return response;
  }

  async interrupt(): Promise<void> {
    if (!this.session || this.currentAvailability !== 'verified') return;
    await request(`/api/v1/voice/sessions/${this.session.session_id}/interrupt`, { method: 'POST' });
  }

  async cancel(): Promise<void> {
    if (!this.session || this.currentAvailability !== 'verified') return;
    await request(`/api/v1/voice/sessions/${this.session.session_id}/cancel`, { method: 'POST' });
  }

  async health(): Promise<VoiceHealth> {
    return request<VoiceHealth>('/api/v1/voice/health');
  }
}
