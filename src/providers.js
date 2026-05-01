const encoder = new TextEncoder();

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('Aborted'), { code: 'INTERRUPTED' }));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('Aborted'), { code: 'INTERRUPTED' }));
    }, { once: true });
  });
}

export function createMockProvider({
  id = 'mock',
  kind = 'mock',
  qualityTier = 'standard',
  latencyMs = 25,
  chunkLatencyMs = 0,
  configured = true,
  health = { state: 'healthy' },
  failAtSegment,
  failAfterChunks,
  partial = false,
  voiceMap = {}
} = {}) {
  let chunksProduced = 0;
  return {
    id,
    kind,
    qualityTier,
    configured,
    get health() { return health; },
    setHealth(nextHealth) { health = typeof nextHealth === 'string' ? { state: nextHealth } : nextHealth; },
    async healthCheck() { return health; },
    resolveVoice(voice) { return voiceMap[voice] ?? voice; },
    async *synthesize(segment, { signal } = {}) {
      if (health.state === 'quota_exhausted') throw Object.assign(new Error('Quota exhausted'), { code: 'PROVIDER_QUOTA_EXHAUSTED' });
      if (health.state === 'offline') throw Object.assign(new Error('Provider offline'), { code: 'PROVIDER_OFFLINE' });
      if (failAtSegment === segment.index || failAtSegment === segment.id) throw Object.assign(new Error('Synthetic provider failure'), { code: 'STREAM_FAILED' });
      await sleep(segment.index === 0 ? latencyMs : chunkLatencyMs, signal);
      const payload = encoder.encode(`[${id}:${segment.voice}] ${segment.text}`);
      chunksProduced += 1;
      yield { type: 'audio', providerId: id, segmentId: segment.id, bytes: payload, text: segment.text, partial };
      if (failAfterChunks && chunksProduced >= failAfterChunks) throw Object.assign(new Error('Partial stream failed'), { code: 'STREAM_FAILED' });
    }
  };
}

export function createDeviceSpeechProvider({ id = 'device', voice = 'default-device', available = true } = {}) {
  return createMockProvider({
    id,
    kind: 'device',
    qualityTier: 'local',
    latencyMs: 10,
    configured: available,
    health: { state: available ? 'healthy' : 'unconfigured' },
    voiceMap: { default: voice }
  });
}

export function createSystemSpeechProvider({ id = 'system', available = process.platform === 'darwin' } = {}) {
  return createMockProvider({
    id,
    kind: 'system',
    qualityTier: 'local',
    latencyMs: 18,
    configured: available,
    health: { state: available ? 'healthy' : 'unconfigured' }
  });
}

export function createOpenAiVoiceProvider({ apiKey, model = 'gpt-4o-mini-tts', voice = 'alloy', fetchImpl = globalThis.fetch } = {}) {
  return createHttpTtsProvider({
    id: 'openai',
    kind: 'cloud',
    qualityTier: 'premium',
    configured: Boolean(apiKey),
    unconfiguredReason: 'OPENAI_API_KEY not provided',
    synthesizeRequest(segment) {
      return {
        url: 'https://api.openai.com/v1/audio/speech',
        init: {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, voice, input: segment.text, format: 'mp3' })
        }
      };
    },
    fetchImpl
  });
}

export function createElevenLabsProvider({ apiKey, voiceId = 'default', modelId = 'eleven_multilingual_v2', fetchImpl = globalThis.fetch } = {}) {
  return createHttpTtsProvider({
    id: 'elevenlabs',
    kind: 'cloud',
    qualityTier: 'premium',
    configured: Boolean(apiKey),
    unconfiguredReason: 'ELEVENLABS_API_KEY not provided',
    synthesizeRequest(segment) {
      return {
        url: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`,
        init: {
          method: 'POST',
          headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text: segment.text, model_id: modelId })
        }
      };
    },
    fetchImpl
  });
}

function createHttpTtsProvider({ id, kind, qualityTier, configured, unconfiguredReason, synthesizeRequest, fetchImpl }) {
  return {
    id,
    kind,
    qualityTier,
    configured,
    health: { state: configured ? 'healthy' : 'unconfigured', reason: configured ? undefined : unconfiguredReason },
    async healthCheck() {
      return this.health;
    },
    async *synthesize(segment, { signal } = {}) {
      if (!configured) throw Object.assign(new Error(unconfiguredReason), { code: 'PROVIDER_UNCONFIGURED' });
      if (typeof fetchImpl !== 'function') throw Object.assign(new Error('fetch unavailable'), { code: 'PROVIDER_OFFLINE' });
      const { url, init } = synthesizeRequest(segment);
      const response = await fetchImpl(url, { ...init, signal });
      if (!response.ok) {
        const code = response.status === 429 ? 'PROVIDER_QUOTA_EXHAUSTED' : 'STREAM_FAILED';
        throw Object.assign(new Error(`${id} TTS failed with ${response.status}`), { code });
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      yield { type: 'audio', providerId: id, segmentId: segment.id, bytes, text: segment.text };
    }
  };
}
