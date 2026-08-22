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
export const VOICE_CLIENT_TIMEOUT_MS = 40_000;

export const initialVoiceMode: VoiceMode = 'unavailable';

export type VoiceTransientFailureKind = 'timeout' | 'unavailable' | 'rate_limited' | 'network';

export type VoiceApiErrorKind =
  | 'authentication'
  | 'authorization'
  | 'busy'
  | 'client'
  | 'server'
  | 'network'
  | 'configuration';

export class VoiceApiError extends Error {
  constructor(
    message: string,
    public readonly kind: VoiceApiErrorKind,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'VoiceApiError';
  }
}

export class VoiceProviderUnavailableError extends Error {
  constructor(
    message = 'Voice intelligence is unavailable until a verified provider is configured.',
    public readonly transient = false,
    public readonly failureKind?: VoiceTransientFailureKind,
  ) {
    super(message);
    this.name = 'VoiceProviderUnavailableError';
  }
}

class VoiceGatewayTimeoutError extends Error {}
class VoiceGatewayUnavailableError extends Error {}
class VoiceRateLimitedError extends Error {}
class VoiceAuthorizationError extends Error {}
class VoiceNetworkError extends Error {}

const id = () => globalThis.crypto?.randomUUID?.() ?? `voice-${Date.now()}`;

async function request<T>(
  path: string,
  init: RequestInit = {},
  apiUrl = API_URL,
  fetchImpl: typeof fetch = fetch,
  accessTokenProvider: typeof getAccessToken = getAccessToken,
): Promise<T> {
  if (!apiUrl) throw new VoiceApiError('Arima API URL is not configured.', 'configuration');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), VOICE_CLIENT_TIMEOUT_MS);
  try {
    const performRequest = () => {
      const token = accessTokenProvider();
      return fetchImpl(`${apiUrl}${path}`, {
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
        if (response.status === 401) throw new VoiceApiError('Voice authentication is required.', 'authentication', 401);
        if (response.status === 403) throw new VoiceAuthorizationError('Voice authorization was denied.');
        if (response.status === 409) throw new VoiceApiError('Arima is still processing the previous voice request.', 'busy', 409);
        if (response.status === 504) throw new VoiceGatewayTimeoutError('The verified voice provider timed out. Please try again.');
        if (response.status === 503) throw new VoiceGatewayUnavailableError('The verified voice provider is currently unavailable.');
        if (response.status === 429) throw new VoiceRateLimitedError('Voice requests are rate limited. Please try again shortly.');
        throw new Error(`Voice API returned ${response.status}`);
      }
      return await response.json() as T;
    } catch (error) {
      if (error instanceof VoiceAuthorizationError
        || error instanceof VoiceGatewayTimeoutError
        || error instanceof VoiceGatewayUnavailableError
        || error instanceof VoiceRateLimitedError
        || error instanceof VoiceNetworkError
        || error instanceof VoiceApiError) {
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
  constructor(
    private readonly apiUrl = API_URL,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly accessTokenProvider = getAccessToken,
  ) {}

  private session: VoiceSession | null = null;
  private sessionRequest: Promise<VoiceSession> | null = null;
  private sessionGeneration = 0;
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

  invalidateSession(): void {
    this.sessionGeneration += 1;
    this.session = null;
    this.sessionRequest = null;
  }

  private markUnavailable(message: string): VoiceProviderUnavailableError {
    this.session = null;
    this.currentMode = 'unavailable';
    this.currentAvailability = 'unavailable';
    this.currentUnavailableMessage = message;
    return new VoiceProviderUnavailableError(message);
  }

  private transientFailure(
    kind: VoiceTransientFailureKind,
    message: string,
  ): VoiceProviderUnavailableError {
    this.session = null;
    return new VoiceProviderUnavailableError(message, true, kind);
  }

  async initialize(): Promise<VoiceAvailability> {
    if (!VOICE_ENABLED) {
      this.markUnavailable('Voice intelligence is disabled by configuration.');
      return this.currentAvailability;
    }
    if (!this.apiUrl) {
      this.markUnavailable('Voice intelligence is unavailable because the Arima API is not configured.');
      return this.currentAvailability;
    }

    this.currentAvailability = 'checking';
    try {
      const health = await request<VoiceHealth>('/api/v1/voice/health', {}, this.apiUrl, this.fetchImpl, this.accessTokenProvider);
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
    } catch (error) {
      const message = error instanceof VoiceGatewayTimeoutError
          ? voiceFailureState('timeout').message
          : error instanceof VoiceRateLimitedError
          ? voiceFailureState('rate_limited').message
          : error instanceof VoiceGatewayUnavailableError || error instanceof VoiceNetworkError
            ? voiceFailureState('unavailable').message
            : 'Voice intelligence is unavailable while provider provenance cannot be verified.';
      this.currentAvailability = 'unavailable';
      this.currentUnavailableMessage = message;
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
    if (this.session) return this.session;
    if (this.sessionRequest) return this.sessionRequest;
    const generation = this.sessionGeneration;
    const pending = (async () => {
      try {
        const session = await request<VoiceSession>('/api/v1/voice/sessions', {
        method: 'POST',
        body: JSON.stringify({
          language: 'en',
          locale: navigator.language || 'en-GB',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }),
        }, this.apiUrl, this.fetchImpl, this.accessTokenProvider);
        if (generation !== this.sessionGeneration) {
          throw new VoiceApiError('The Arima voice session is no longer active.', 'authentication');
        }
        this.session = session;
        return session;
      } catch (error) {
      if (error instanceof VoiceAuthorizationError) {
        throw this.markUnavailable(voiceFailureState('authorization').message);
      }
      if (error instanceof VoiceApiError) throw error;
      if (error instanceof VoiceGatewayTimeoutError) {
        throw this.transientFailure('timeout', voiceFailureState('timeout').message);
      }
      if (error instanceof VoiceGatewayUnavailableError) {
        throw this.transientFailure('unavailable', voiceFailureState('unavailable').message);
      }
      if (error instanceof VoiceRateLimitedError) {
        throw this.transientFailure('rate_limited', voiceFailureState('rate_limited').message);
      }
      if (error instanceof VoiceNetworkError) {
        throw this.transientFailure('network', voiceFailureState('network').message);
      }
      throw this.markUnavailable('Voice intelligence is unavailable because a verified session could not be created.');
      }
    })();
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
    this.assertVerified();
    const session = this.session ?? await this.createSession();
    let response: VoiceGatewayResponse;
    try {
      response = await request<VoiceGatewayResponse>(
        `/api/v1/voice/sessions/${session.session_id}/transcript`,
        { method: 'POST', body: JSON.stringify({ transcript }) }, this.apiUrl, this.fetchImpl, this.accessTokenProvider,
      );
    } catch (error) {
      if (error instanceof VoiceGatewayTimeoutError) {
        throw this.transientFailure('timeout', voiceFailureState('timeout').message);
      }
      if (error instanceof VoiceGatewayUnavailableError) {
        throw this.transientFailure('unavailable', voiceFailureState('unavailable').message);
      }
      if (error instanceof VoiceRateLimitedError) {
        throw this.transientFailure('rate_limited', voiceFailureState('rate_limited').message);
      }
      if (error instanceof VoiceApiError && error.kind === 'authentication') {
        throw this.markUnavailable('Your session has expired. Sign in again to continue with Arima.');
      }
      if (error instanceof VoiceApiError && error.kind === 'authorization') {
        throw this.markUnavailable(voiceFailureState('authorization').message);
      }
      if (error instanceof VoiceApiError) throw error;
      if (error instanceof VoiceAuthorizationError) {
        throw this.markUnavailable(voiceFailureState('authorization').message);
      }
      if (error instanceof VoiceNetworkError) {
        throw this.transientFailure('network', voiceFailureState('network').message);
      }
      throw this.transientFailure('network', voiceFailureState('network').message);
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
