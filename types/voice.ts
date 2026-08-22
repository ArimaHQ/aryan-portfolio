import type { ExperienceEvent } from './experience';

export type VoiceState =
  | 'idle'
  | 'requesting_microphone'
  | 'listening'
  | 'speech_detected'
  | 'processing'
  | 'thinking'
  | 'tool_execution'
  | 'awaiting_approval'
  | 'speaking'
  | 'interrupted'
  | 'completed'
  | 'warning'
  | 'error'
  | 'cancelled';

export type VoiceStatus =
  | 'voice_ready'
  | 'requesting_microphone'
  | 'microphone_blocked'
  | 'recognition_unavailable'
  | 'browser_unsupported'
  | 'keyboard_mode'
  | 'retrying'
  | 'listening_restored'
  | 'speech_playback_interrupted'
  | 'authentication_required'
  | 'provider_unverified'
  | 'idle';

/**
 * `verified` is intentionally available only when the backend has confirmed
 * that a non-mock provider produced the response. The UI must never infer
 * this from an API URL, a successful request, or a `demo: false` response.
 */
export type VoiceProviderProvenance = 'verified' | 'mock' | 'unverified';

export type VoiceAvailability = 'checking' | 'verified' | 'unavailable';

export type VoiceEventType =
  | 'session_started'
  | 'microphone_ready'
  | 'listening_started'
  | 'transcript_partial'
  | 'transcript_final'
  | 'thinking_started'
  | 'tool_started'
  | 'tool_completed'
  | 'approval_required'
  | 'response_chunk'
  | 'navigation_requested'
  | 'panel_requested'
  | 'speaking_started'
  | 'speaking_stopped'
  | 'session_completed'
  | 'session_failed';

export type VoiceNavigationAction = {
  path: string;
  label: string;
  focus?: string | null;
};

export type VoicePanelAction = {
  panel: string;
  focus?: string | null;
};

export type VoiceApprovalAction = {
  approval_id?: string | null;
  title: string;
  reason: string;
  policy: string;
};

export type VoiceEvent = {
  event: VoiceEventType;
  sequence: number;
  timestamp: string;
  data: Record<string, unknown>;
};

export type VoiceSession = {
  session_id: string;
  user_id: string;
  conversation_id?: string | null;
  run_id?: string | null;
  correlation_id: string;
  state: VoiceState;
  language: string;
  locale: string;
  timezone: string;
  transcript?: string | null;
  response_text?: string | null;
  created_at: string;
  updated_at: string;
};

export type VoiceGatewayResponse = {
  session_id: string;
  correlation_id: string;
  state: VoiceState;
  transcript?: string | null;
  response_text: string;
  visual_response_text: string;
  navigation_action?: VoiceNavigationAction | null;
  panel_action?: VoicePanelAction | null;
  approval_request?: VoiceApprovalAction | null;
  events: VoiceEvent[];
  experience_events?: ExperienceEvent[];
  demo: boolean;
  provider_provenance?: VoiceProviderProvenance;
};

export type VoiceHealth = {
  status: string;
  enabled: boolean;
  provider_neutral: boolean;
  session_store: string;
  orchestration_available: boolean;
  checked_at: string;
  provider_provenance?: VoiceProviderProvenance;
};

export type VoiceMode = 'live' | 'unavailable';
