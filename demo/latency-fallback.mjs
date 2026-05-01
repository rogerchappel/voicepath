#!/usr/bin/env node
import { createDeviceSpeechProvider, createMockProvider, createTelemetrySink, createVoicePath, summarizeVoicePathEvents } from '../src/index.js';

const text = process.argv.slice(2).join(' ') || 'This starts on the fastest healthy voice. When the cloud is down, voicepath falls back without switching mid-sentence.';
const cloudMode = process.env.VOICEPATH_DEMO_CLOUD ?? 'offline';
const cloudHealth = cloudMode === 'healthy' ? { state: 'healthy' } : cloudMode === 'quota' ? { state: 'quota_exhausted' } : { state: 'offline' };
const eventLines = [];

const voice = createVoicePath({
  policy: {
    maxFirstAudioMs: 120,
    prefer: ['premium-cloud', 'device'],
    fallback: 'device',
    continuity: 'utterance',
    neverSwitchMidSentence: true,
    prefetchSegments: 1
  },
  providers: {
    'premium-cloud': createMockProvider({ id: 'premium-cloud', kind: 'cloud', qualityTier: 'premium', latencyMs: 80, health: cloudHealth }),
    device: createDeviceSpeechProvider({ id: 'device' })
  },
  playChunk: async (chunk, { segment }) => {
    console.log(`▶ ${chunk.providerId} ${segment.id}: ${segment.text}`);
  }
});

const sink = createTelemetrySink({ onReport: (report) => eventLines.push(`summary=${JSON.stringify(report)}`) });
voice.events.subscribe((event) => {
  sink.push(event);
  if (['voicepath.provider.selected', 'voicepath.fallback.used', 'voicepath.latency.measured', 'voicepath.speech.completed'].includes(event.type)) {
    console.log(`${event.type} ${JSON.stringify(event.payload)}`);
  }
});

try {
  const result = await voice.speak({ requestId: 'demo', text, voice: 'calm-operator', context: 'demo' });
  console.log('\nResult');
  console.log(JSON.stringify({ providerId: result.providerId, segments: result.utterance.segments.length, telemetry: summarizeVoicePathEvents(voice.events) }, null, 2));
  if (eventLines.length) console.log(eventLines.join('\n'));
} catch (error) {
  console.error(`Demo failed: ${error.code ?? 'ERROR'} ${error.message}`);
  process.exitCode = 1;
}
