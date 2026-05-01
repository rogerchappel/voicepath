export const VOICEPATH_ROUTING_SPEC_VERSION = '1.0.0';

export const PROVIDER_KINDS = Object.freeze(['device', 'system', 'cloud', 'mock']);

export const PROVIDER_HEALTH_STATES = Object.freeze([
  'healthy',
  'degraded',
  'quota_exhausted',
  'offline',
  'unconfigured',
  'disabled'
]);

export const ROUTING_EVENTS = Object.freeze([
  'voicepath.route.requested',
  'voicepath.provider.selected',
  'voicepath.provider.skipped',
  'voicepath.fallback.used',
  'voicepath.speech.started',
  'voicepath.speech.completed',
  'voicepath.speech.interrupted',
  'voicepath.provider.failed',
  'voicepath.latency.measured'
]);

export const FAILURE_CODES = Object.freeze([
  'NO_ELIGIBLE_PROVIDER',
  'PROVIDER_UNCONFIGURED',
  'PROVIDER_OFFLINE',
  'PROVIDER_QUOTA_EXHAUSTED',
  'FIRST_AUDIO_TIMEOUT',
  'VOICE_PROFILE_UNAVAILABLE',
  'INTERRUPTED',
  'PLAYBACK_FAILED'
]);

export const REQUIRED_ROUTING_REQUEST_FIELDS = Object.freeze([
  'requestId',
  'text',
  'voice',
  'context',
  'budget.maxFirstAudioMs',
  'policy.prefer',
  'policy.fallback',
  'policy.continuity'
]);

export function isProviderEligible(provider) {
  return provider?.configured === true && ['healthy', 'degraded'].includes(provider?.health?.state);
}
