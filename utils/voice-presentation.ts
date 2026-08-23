type VoiceMessageState = {
  captions?: boolean;
  error: string | null;
  partialTranscript: string;
  response: string;
};

export const voiceMessageForDisplay = ({
  error,
  partialTranscript,
  response,
}: VoiceMessageState): string => error || partialTranscript || response || '';
