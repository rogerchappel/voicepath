import test from 'node:test';
import assert from 'node:assert/strict';
import { VoicePathEvents, assertNoMidSentenceProviderSwitch, createMockProvider, selectProvider } from '../src/index.js';

test('selectProvider follows preference order for healthy providers', async () => {
  const events = new VoicePathEvents();
  const result = await selectProvider({
    providers: {
      elevenlabs: createMockProvider({ id: 'elevenlabs' }),
      device: createMockProvider({ id: 'device', qualityTier: 'local' })
    },
    request: { requestId: 'r1', policy: { prefer: ['elevenlabs', 'device'], fallback: 'device' } },
    events
  });
  assert.equal(result.providerId, 'elevenlabs');
});

test('selectProvider falls back when preferred provider is offline', async () => {
  const events = new VoicePathEvents();
  const result = await selectProvider({
    providers: {
      cloud: createMockProvider({ id: 'cloud', health: { state: 'offline' } }),
      device: createMockProvider({ id: 'device', qualityTier: 'local' })
    },
    request: { requestId: 'r2', policy: { prefer: ['cloud', 'device'], fallback: 'device' } },
    events
  });
  assert.equal(result.providerId, 'device');
  assert.equal(result.fallbackUsed, true);
  assert.ok(events.history().some((event) => event.type === 'voicepath.fallback.used'));
});

test('selectProvider skips quota-exhausted and unconfigured providers', async () => {
  const result = await selectProvider({
    providers: {
      cloud: createMockProvider({ id: 'cloud', health: { state: 'quota_exhausted' } }),
      openai: createMockProvider({ id: 'openai', configured: false, health: { state: 'unconfigured' } }),
      device: createMockProvider({ id: 'device' })
    },
    request: { requestId: 'r3', policy: { prefer: ['cloud', 'openai', 'device'], fallback: 'device' } }
  });
  assert.equal(result.providerId, 'device');
  assert.deepEqual(result.skipped.map((skip) => skip.reason), ['provider_quota_exhausted', 'provider_unconfigured']);
});

test('selectProvider preserves continuity when previous provider is still eligible', async () => {
  const result = await selectProvider({
    providers: {
      premium: createMockProvider({ id: 'premium' }),
      device: createMockProvider({ id: 'device' })
    },
    previousSelection: { providerId: 'device', voice: 'calm' },
    request: { requestId: 'r4', voice: 'calm', policy: { prefer: ['premium', 'device'], fallback: 'device', continuity: 'utterance', neverSwitchMidSentence: true } }
  });
  assert.equal(result.providerId, 'device');
});

test('selectProvider throws when no provider is eligible', async () => {
  await assert.rejects(
    selectProvider({
      providers: { cloud: createMockProvider({ id: 'cloud', health: { state: 'offline' } }) },
      request: { requestId: 'r5', policy: { prefer: ['cloud'], fallback: 'cloud' } }
    }),
    /No eligible voice provider/
  );
});

test('continuity invariant rejects provider switch inside one sentence', () => {
  assert.throws(() => assertNoMidSentenceProviderSwitch([
    { sentenceId: 's1', providerId: 'a' },
    { sentenceId: 's1', providerId: 'b' }
  ]), /Provider switch inside sentence/);
});
