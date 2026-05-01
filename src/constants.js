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

export const QUALITY_TIERS = Object.freeze(['local', 'standard', 'premium']);

export const ROUTING_EVENTS = Object.freeze([
  'voicepath.route.requested',
  'voicepath.provider.selected',
  'voicepath.provider.skipped',
  'voicepath.fallback.used',
  'voicepath.speech.started',
  'voicepath.chunk.queued',
  'voicepath.chunk.played',
  'voicepath.speech.completed',
  'voicepath.speech.interrupted',
  'voicepath.speech.ducked',
  'voicepath.speech.resumed',
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
  'PLAYBACK_FAILED',
  'STREAM_FAILED'
]);

export const FALLBACK_REASONS = Object.freeze([
  'provider_unconfigured',
  'provider_disabled',
  'provider_unhealthy',
  'provider_quota_exhausted',
  'first_audio_timeout',
  'stream_failed',
  'offline_local_first',
  'manual_policy'
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

export const DEFAULT_POLICY = Object.freeze({
  maxFirstAudioMs: 450,
  prefer: ['device'],
  fallback: 'device',
  continuity: 'utterance',
  neverSwitchMidSentence: true,
  localFirstWhenOffline: true,
  prefetchSegments: 1,
  minQualityTier: 'local'
});
