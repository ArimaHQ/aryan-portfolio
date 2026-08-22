import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's strip-types runner resolves the source TypeScript module directly.
import { voiceFailureState } from '../utils/voice-error-contract.ts';

test('504 maps to an explicit timeout state without transcript content', () => {
  const state = voiceFailureState('timeout');
  assert.equal(state.availability, 'unavailable');
  assert.match(state.message, /provider timed out/);
  assert.doesNotMatch(state.message, /gateway did not respond/);
  assert.equal(state.responseText, null);
});

test('503 maps to provider unavailable without transcript content', () => {
  const state = voiceFailureState('unavailable');
  assert.match(state.message, /provider is currently unavailable/);
  assert.equal(state.responseText, null);
});

test('403 maps to authorization/onboarding state without transcript content', () => {
  const state = voiceFailureState('authorization');
  assert.match(state.message, /account is not authorised/);
  assert.equal(state.responseText, null);
});

test('network failure maps to connection unavailable', () => {
  const state = voiceFailureState('network');
  assert.match(state.message, /service could not be reached/);
  assert.equal(state.responseText, null);
});

test('unverified provenance remains fail-closed', () => {
  const state = voiceFailureState('provenance');
  assert.match(state.message, /response provider is not verified/);
  assert.equal(state.responseText, null);
});
