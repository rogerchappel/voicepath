import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockProvider, createVoicePath } from '../src/index.js';

test('createVoicePath speaks with selected provider and emits latency/completion events', async () => {
  const played = [];
  const voice = createVoicePath({
    policy: { prefer: ['cloud', 'device'], fallback: 'device', maxFirstAudioMs: 100, prefetchSegments: 0 },
    providers: {
      cloud: createMockProvider({ id: 'cloud', latencyMs: 1 }),
      device: createMockProvider({ id: 'device', latencyMs: 1 })
    },
    playChunk: async (chunk, { segment }) => played.push(`${chunk.providerId}:${segment.id}`)
  });
  const result = await voice.speak({ requestId: 'r1', text: 'Hello there. This is stable.', voice: 'calm', context: 'test' });
  assert.equal(result.providerId, 'cloud');
  assert.deepEqual(played, ['cloud:seg-1', 'cloud:seg-2']);
  const eventTypes = voice.events.history().map((event) => event.type);
  assert.ok(eventTypes.includes('voicepath.latency.measured'));
  assert.ok(eventTypes.includes('voicepath.speech.completed'));
});

test('createVoicePath falls back to local provider when cloud is unhealthy', async () => {
  const voice = createVoicePath({
    policy: { prefer: ['cloud', 'device'], fallback: 'device' },
    providers: {
      cloud: createMockProvider({ id: 'cloud', health: { state: 'offline' } }),
      device: createMockProvider({ id: 'device', latencyMs: 1 })
    }
  });
  const result = await voice.speak({ requestId: 'r2', text: 'Fallback please.', voice: 'calm', context: 'test' });
  assert.equal(result.providerId, 'device');
  assert.ok(voice.events.history().some((event) => event.type === 'voicepath.fallback.used'));
});

test('interrupt cancels active queued audio and prevents stale resume', async () => {
  let resolvePlayback;
  const playbackStarted = new Promise((resolve) => { resolvePlayback = resolve; });
  const voice = createVoicePath({
    providers: { mock: createMockProvider({ id: 'mock', latencyMs: 1 }) },
    policy: { prefer: ['mock'], fallback: 'mock', prefetchSegments: 0 },
    playChunk: async () => {
      resolvePlayback();
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  });
  const speaking = voice.speak({ requestId: 'r3', text: 'Long enough. More audio.', voice: 'calm', context: 'test' }).catch((error) => error);
  await playbackStarted;
  const interrupted = voice.interrupt('user_barge_in');
  assert.equal(interrupted.interrupted, true);
  await speaking;
  assert.equal(voice.activeUtterance, null);
  assert.ok(voice.events.history().some((event) => event.type === 'voicepath.speech.interrupted'));
});
