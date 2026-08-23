import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import type { VoiceHealth } from '../types/voice';
import { voiceFailureState } from '../utils/voice-error-contract.ts';
import { isVoiceAiReady, VoiceApiClient, VoiceProviderUnavailableError } from '../utils/voice-api.ts';

const session = {
  session_id: 'session-1',
  user_id: 'user-1',
  correlation_id: 'correlation-1',
  state: 'idle',
  language: 'en',
  locale: 'en-GB',
  timezone: 'UTC',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const response = (status: number, payload: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => payload,
}) as Response;

const health: VoiceHealth = {
  status: 'healthy',
  enabled: true,
  provider_neutral: true,
  session_store: 'database',
  orchestration_available: true,
  checked_at: '2026-01-01T00:00:00Z',
  provider_provenance: 'verified',
};

it('keeps Voice AI ready when market provenance is unavailable', () => {
  assert.equal(isVoiceAiReady({
    ...health,
    market_provenance: 'unavailable',
  }), true);
});

const voiceResponse = {
  session_id: 'session-1',
  correlation_id: 'correlation-1',
  state: 'completed',
  response_text: 'Acknowledged.',
  visual_response_text: 'Acknowledged.',
  events: [],
  demo: false,
  provider_provenance: 'verified',
};

const clientWithResponses = (responses: Response[]) => {
  if (typeof window === 'undefined') {
    (globalThis as typeof globalThis & { window: Pick<Window, 'setTimeout' | 'clearTimeout'> }).window = {
      setTimeout,
      clearTimeout,
    };
  }
  let calls = 0;
  const fetchMock = async () => responses[calls++];
  const client = new VoiceApiClient('https://example.test', fetchMock, () => 'test-token');
  return { client, calls: () => calls };
};

describe('voice API contract', () => {
it('504 maps to an explicit timeout state without transcript content', () => {
  const state = voiceFailureState('timeout');
  assert.equal(state.availability, 'unavailable');
  assert.match(state.message, /provider timed out/);
  assert.doesNotMatch(state.message, /gateway did not respond/);
  assert.equal(state.responseText, null);
});

it('503 maps to provider unavailable without transcript content', () => {
  const state = voiceFailureState('unavailable');
  assert.match(state.message, /provider is currently unavailable/);
  assert.equal(state.responseText, null);
});

it('403 maps to authorization/onboarding state without transcript content', () => {
  const state = voiceFailureState('authorization');
  assert.match(state.message, /account is not authorised/);
  assert.equal(state.responseText, null);
});

it('network failure maps to connection unavailable', () => {
  const state = voiceFailureState('network');
  assert.match(state.message, /service could not be reached/);
  assert.equal(state.responseText, null);
});

it('unverified provenance remains fail-closed', () => {
  const state = voiceFailureState('provenance');
  assert.match(state.message, /response provider is not verified/);
  assert.equal(state.responseText, null);
});

it('504 resets only the session so the next transcript can create a new session', async () => {
  const { client, calls } = clientWithResponses([
    response(200, health), response(201, session), response(504, {}),
    response(201, { ...session, session_id: 'session-2' }), response(200, voiceResponse),
  ]);
  await client.initialize();
  await assert.rejects(() => client.submitTranscript('first'), (error: unknown) => (
    error instanceof VoiceProviderUnavailableError && error.transient && error.failureKind === 'timeout'
  ));
  assert.equal(client.availability, 'verified');
  await client.submitTranscript('second');
  assert.equal(calls(), 5);
});

it('503 and 429 remain distinct transient retry states', async () => {
  for (const [status, kind] of [[503, 'unavailable'], [429, 'rate_limited']] as const) {
    const { client } = clientWithResponses([
      response(200, health), response(201, session), response(status, {}),
    ]);
    await client.initialize();
    await assert.rejects(() => client.submitTranscript('retry me'), (error: unknown) => (
      error instanceof VoiceProviderUnavailableError && error.transient && error.failureKind === kind
    ));
    assert.equal(client.availability, 'verified');
  }
});

it('403 remains a permanent blocking state', async () => {
  const { client, calls } = clientWithResponses([
    response(200, health), response(201, session), response(403, {}),
  ]);
  await client.initialize();
  await assert.rejects(() => client.submitTranscript('blocked'), VoiceProviderUnavailableError);
  assert.equal(client.availability, 'unavailable');
  await assert.rejects(() => client.submitTranscript('still blocked'), VoiceProviderUnavailableError);
  assert.equal(calls(), 3);
});
});
