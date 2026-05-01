import test from 'node:test';
import assert from 'node:assert/strict';
import { VoicePathEvents, createBargeKitHooks, createMockProvider, createTelemetrySink, createVoicePath, eventFixture, summarizeVoicePathEvents } from '../src/index.js';

test('event payload sanitizer redacts secret-shaped fields', () => {
  const events = new VoicePathEvents();
  events.emit('voicepath.provider.selected', { providerId: 'x', apiKey: 'secret', nested: { token: 'secret2' } });
  assert.equal(events.history()[0].payload.apiKey, '[redacted]');
  assert.equal(events.history()[0].payload.nested.token, '[redacted]');
});

test('telemetry sink reports latency, fallback, failures, and event count', () => {
  let report;
  const sink = createTelemetrySink({ onReport: (next) => { report = next; } });
  sink.push({ type: 'voicepath.provider.selected', payload: { providerId: 'device' } });
  sink.push({ type: 'voicepath.fallback.used', payload: { reason: 'provider_unhealthy' } });
  sink.push({ type: 'voicepath.latency.measured', payload: { label: 'first-audio:r1', latencyMs: 12 } });
  sink.push({ type: 'voicepath.speech.completed', payload: {} });
  assert.equal(report.providerId, 'device');
  assert.equal(report.firstAudioMs, 12);
  assert.deepEqual(report.fallbackReasons, ['provider_unhealthy']);
  assert.equal(sink.report().eventCount, 4);
});

test('eventFixture creates stable snapshot shape without event ids', () => {
  const events = new VoicePathEvents();
  events.emit('voicepath.speech.completed', { requestId: 'r' });
  assert.deepEqual(eventFixture(events), [{ type: 'voicepath.speech.completed', payload: { requestId: 'r' } }]);
});

test('BargeKit hooks duck and interrupt active speech without stale resume', async () => {
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
  const hooks = createBargeKitHooks(voice);
  const speaking = voice.speak({ requestId: 'barge', text: 'First. Second.', voice: 'calm', context: 'bargekit' }).catch((error) => error);
  await playbackStarted;
  const result = hooks.onUserSpeechStart({ reason: 'synthetic_barge' });
  assert.equal(result.interrupted.interrupted, true);
  await speaking;
  const resume = hooks.onUserSpeechEnd();
  assert.equal(resume.resumed, false);
  const summary = summarizeVoicePathEvents(voice.events);
  assert.equal(summary.interruptionCount >= 1, true);
});
