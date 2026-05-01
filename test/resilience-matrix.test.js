import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockProvider, createVoicePath, summarizeVoicePathEvents } from '../src/index.js';

const matrix = [
  {
    name: 'slow cloud is observable via first-audio timeout event',
    providers: { cloud: createMockProvider({ id: 'cloud', latencyMs: 30 }) },
    policy: { prefer: ['cloud'], fallback: 'cloud', maxFirstAudioMs: 1, prefetchSegments: 0 },
    expectProvider: 'cloud',
    expectFailureCode: 'FIRST_AUDIO_TIMEOUT'
  },
  {
    name: 'quota-exhausted cloud falls back to device',
    providers: { cloud: createMockProvider({ id: 'cloud', health: { state: 'quota_exhausted' } }), device: createMockProvider({ id: 'device', latencyMs: 1 }) },
    policy: { prefer: ['cloud', 'device'], fallback: 'device', prefetchSegments: 0 },
    expectProvider: 'device',
    expectFallback: 'provider_quota_exhausted'
  },
  {
    name: 'offline cloud falls back to local device',
    providers: { cloud: createMockProvider({ id: 'cloud', health: { state: 'offline' } }), device: createMockProvider({ id: 'device', latencyMs: 1 }) },
    policy: { prefer: ['cloud', 'device'], fallback: 'device', prefetchSegments: 0 },
    expectProvider: 'device',
    expectFallback: 'provider_unhealthy'
  }
];

for (const scenario of matrix) {
  test(scenario.name, async () => {
    const voice = createVoicePath({ providers: scenario.providers, policy: scenario.policy });
    const result = await voice.speak({ requestId: scenario.name, text: 'One sentence. Another sentence.', voice: 'calm', context: 'matrix' });
    const summary = summarizeVoicePathEvents(voice.events);
    assert.equal(result.providerId, scenario.expectProvider);
    if (scenario.expectFallback) assert.ok(summary.fallbackReasons.includes(scenario.expectFallback));
    if (scenario.expectFailureCode) assert.ok(summary.failureCodes.includes(scenario.expectFailureCode));
    assert.ok(result.utterance.segments.every((segment) => segment.providerId === result.providerId));
  });
}

test('partial stream failure emits provider failure and does not complete stale audio', async () => {
  const voice = createVoicePath({
    providers: { cloud: createMockProvider({ id: 'cloud', failAfterChunks: 1, latencyMs: 1 }) },
    policy: { prefer: ['cloud'], fallback: 'cloud', prefetchSegments: 0 }
  });
  await assert.rejects(
    voice.speak({ requestId: 'partial', text: 'First. Second.', voice: 'calm', context: 'matrix' }),
    /Partial stream failed/
  );
  const summary = summarizeVoicePathEvents(voice.events);
  assert.ok(summary.failureCodes.includes('STREAM_FAILED'));
  assert.equal(voice.events.history().some((event) => event.type === 'voicepath.speech.completed'), false);
});

test('manual interruption records interruption rather than completion', async () => {
  let resolvePlayback;
  const playbackStarted = new Promise((resolve) => { resolvePlayback = resolve; });
  const voice = createVoicePath({
    providers: { device: createMockProvider({ id: 'device', latencyMs: 1 }) },
    policy: { prefer: ['device'], fallback: 'device', prefetchSegments: 0 },
    playChunk: async () => { resolvePlayback(); await new Promise((resolve) => setTimeout(resolve, 20)); }
  });
  const speaking = voice.speak({ requestId: 'interrupt-matrix', text: 'First. Second.', voice: 'calm', context: 'matrix' }).catch((error) => error);
  await playbackStarted;
  voice.interrupt('matrix_interrupt');
  await speaking;
  const summary = summarizeVoicePathEvents(voice.events);
  assert.equal(summary.interruptionCount >= 1, true);
});
