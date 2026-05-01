import { DEFAULT_POLICY } from './constants.js';

const HEALTH_SKIP_REASONS = Object.freeze({
  unconfigured: 'provider_unconfigured',
  disabled: 'provider_disabled',
  offline: 'provider_unhealthy',
  quota_exhausted: 'provider_quota_exhausted'
});

export function isProviderEligible(provider) {
  return provider?.configured === true && ['healthy', 'degraded'].includes(provider?.health?.state);
}

export function normalizeProviders(providers) {
  if (providers instanceof Map) return providers;
  return new Map(Object.entries(providers ?? {}));
}

export function createRoutingPolicy(policy = {}) {
  return { ...DEFAULT_POLICY, ...policy };
}

export async function snapshotProviderHealth(provider, signal) {
  if (!provider) return { state: 'unconfigured' };
  if (typeof provider.healthCheck === 'function') return await provider.healthCheck({ signal });
  return provider.health ?? { state: provider.configured ? 'healthy' : 'unconfigured' };
}

export async function selectProvider({ providers, request = {}, policy = {}, previousSelection, events, signal } = {}) {
  const providerMap = normalizeProviders(providers);
  const routingPolicy = createRoutingPolicy({ ...policy, ...(request.policy ?? {}) });
  const prefer = routingPolicy.prefer?.length ? routingPolicy.prefer : [routingPolicy.fallback].filter(Boolean);
  const orderedIds = [...new Set([...prefer, routingPolicy.fallback].filter(Boolean))];
  const skipped = [];

  events?.emit('voicepath.route.requested', {
    requestId: request.requestId,
    context: request.context,
    voice: request.voice,
    providerOrder: orderedIds,
    continuity: routingPolicy.continuity,
    maxFirstAudioMs: request.budget?.maxFirstAudioMs ?? routingPolicy.maxFirstAudioMs
  });

  if (previousSelection && routingPolicy.continuity === 'utterance' && routingPolicy.neverSwitchMidSentence) {
    const provider = providerMap.get(previousSelection.providerId);
    const health = await snapshotProviderHealth(provider, signal);
    const continuityCandidate = { ...provider, health };
    if (isProviderEligible(continuityCandidate)) {
      events?.emit('voicepath.provider.selected', {
        requestId: request.requestId,
        providerId: previousSelection.providerId,
        reason: 'continuity_locked',
        voice: previousSelection.voice ?? request.voice
      });
      return { providerId: previousSelection.providerId, provider, health, fallbackUsed: false, skipped, policy: routingPolicy };
    }
  }

  for (const providerId of orderedIds) {
    const provider = providerMap.get(providerId);
    const health = await snapshotProviderHealth(provider, signal);
    const candidate = { ...provider, health };
    const eligible = isProviderEligible(candidate);
    if (!eligible) {
      const reason = provider?.configured === false ? 'provider_unconfigured' : HEALTH_SKIP_REASONS[health?.state] ?? 'provider_unhealthy';
      skipped.push({ providerId, reason, health: health?.state ?? 'unknown' });
      events?.emit('voicepath.provider.skipped', { requestId: request.requestId, providerId, reason, health: health?.state ?? 'unknown' });
      continue;
    }

    const fallbackUsed = providerId !== orderedIds[0];
    events?.emit('voicepath.provider.selected', {
      requestId: request.requestId,
      providerId,
      fallbackUsed,
      health: health.state,
      qualityTier: provider.qualityTier,
      voice: request.voice
    });
    if (fallbackUsed) {
      events?.emit('voicepath.fallback.used', {
        requestId: request.requestId,
        fromProviderId: orderedIds[0],
        toProviderId: providerId,
        reason: skipped.at(-1)?.reason ?? 'manual_policy'
      });
    }
    return { providerId, provider, health, fallbackUsed, skipped, policy: routingPolicy };
  }

  const error = new Error('No eligible voice provider found');
  error.code = 'NO_ELIGIBLE_PROVIDER';
  error.skipped = skipped;
  throw error;
}

export function assertNoMidSentenceProviderSwitch(segments) {
  const bySentence = new Map();
  for (const segment of segments) {
    if (!segment.sentenceId || !segment.providerId) continue;
    const prior = bySentence.get(segment.sentenceId);
    if (prior && prior !== segment.providerId) {
      const error = new Error(`Provider switch inside sentence ${segment.sentenceId}: ${prior} -> ${segment.providerId}`);
      error.code = 'UNSAFE_PROVIDER_SWITCH';
      throw error;
    }
    bySentence.set(segment.sentenceId, segment.providerId);
  }
  return true;
}
