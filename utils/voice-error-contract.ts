export type VoiceFailureKind =
  | 'timeout'
  | 'unavailable'
  | 'authorization'
  | 'rate_limited'
  | 'network'
  | 'provenance';

export type VoiceFailureState = {
  availability: 'unavailable';
  message: string;
  responseText: null;
};

export function voiceFailureState(kind: VoiceFailureKind): VoiceFailureState {
  const messages: Record<VoiceFailureKind, string> = {
    timeout: 'Voice intelligence is unavailable because the verified provider timed out. Please try again.',
    unavailable: 'Voice intelligence is unavailable because the verified provider is currently unavailable.',
    authorization: 'Voice intelligence is unavailable because this account is not authorised for the voice session.',
    rate_limited: 'Voice requests are rate limited. Please try again shortly.',
    network: 'Voice intelligence is unavailable because the voice service could not be reached.',
    provenance: 'Voice intelligence is unavailable because the response provider is not verified.',
  };
  return { availability: 'unavailable', message: messages[kind], responseText: null };
}
