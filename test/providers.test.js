import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceSpeechProvider, createElevenLabsProvider, createMockProvider, createOpenAiVoiceProvider, createSystemSpeechProvider } from '../src/index.js';

test('mock provider simulates latency and audio chunks', async () => {
  const provider = createMockProvider({ id: 'mock', latencyMs: 1 });
  const chunks = [];
  for await (const chunk of provider.synthesize({ id: 's1', index: 0, voice: 'calm', text: 'hello' })) chunks.push(chunk);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].providerId, 'mock');
  assert.ok(chunks[0].bytes instanceof Uint8Array);
});

test('mock provider simulates quota and stream failures', async () => {
  const quota = createMockProvider({ id: 'quota', health: { state: 'quota_exhausted' } });
  await assert.rejects(async () => {
    for await (const _ of quota.synthesize({ id: 's1', index: 0, voice: 'v', text: 'x' })) {}
  }, /Quota exhausted/);

  const failing = createMockProvider({ id: 'fail', failAtSegment: 1 });
  await assert.rejects(async () => {
    for await (const _ of failing.synthesize({ id: 's2', index: 1, voice: 'v', text: 'x' })) {}
  }, /Synthetic provider failure/);
});

test('device and system providers are explicit local adapters', async () => {
  const device = createDeviceSpeechProvider();
  const system = createSystemSpeechProvider({ available: false });
  assert.equal(device.kind, 'device');
  assert.equal(device.configured, true);
  assert.equal(system.kind, 'system');
  assert.equal(system.configured, false);
});

test('cloud providers require caller-supplied credentials and redact nothing internally', () => {
  const openai = createOpenAiVoiceProvider({});
  const eleven = createElevenLabsProvider({});
  assert.equal(openai.configured, false);
  assert.equal(eleven.configured, false);
  assert.equal(openai.health.state, 'unconfigured');
  assert.equal(eleven.health.state, 'unconfigured');
});
