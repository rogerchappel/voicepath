#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createDeviceSpeechProvider, createElevenLabsProvider, createMockProvider, createOpenAiVoiceProvider, createSystemSpeechProvider, createVoicePath, summarizeVoicePathEvents } from './index.js';
import packageJson from '../package.json' with { type: 'json' };

function parseArgs(argv) {
  const [command = 'demo', ...rest] = argv;
  const flags = { _: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const [rawKey, rawValue] = arg.slice(2).split('=');
      const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      flags[key] = rawValue ?? (rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true);
    } else flags._.push(arg);
  }
  return { command, flags };
}

function loadFixture(path) {
  if (!path) return {};
  return JSON.parse(readFileSync(path, 'utf8'));
}

function providerFromSpec(id, spec = {}) {
  if (spec.adapter === 'device') return createDeviceSpeechProvider({ id, available: spec.available !== false, voice: spec.voice });
  if (spec.adapter === 'system') return createSystemSpeechProvider({ id, available: spec.available !== false });
  if (spec.adapter === 'openai') return createOpenAiVoiceProvider({ apiKey: process.env.OPENAI_API_KEY });
  if (spec.adapter === 'elevenlabs') return createElevenLabsProvider({ apiKey: process.env.ELEVENLABS_API_KEY });
  return createMockProvider({
    id,
    kind: spec.kind ?? 'mock',
    qualityTier: spec.qualityTier ?? 'standard',
    latencyMs: Number(spec.latencyMs ?? 10),
    configured: spec.configured !== false,
    health: spec.health ?? { state: 'healthy' },
    failAtSegment: spec.failAtSegment,
    failAfterChunks: spec.failAfterChunks,
    voiceMap: spec.voiceMap ?? {}
  });
}

function providersFromFixture(fixture = {}) {
  const specs = fixture.providers ?? {
    cloud: { latencyMs: 20, qualityTier: 'premium', health: { state: process.env.VOICEPATH_DEMO_CLOUD === 'offline' ? 'offline' : 'healthy' } },
    device: { adapter: 'device', voice: 'local-calm' }
  };
  return Object.fromEntries(Object.entries(specs).map(([id, spec]) => [id, providerFromSpec(id, spec)]));
}

async function runSpeak(flags) {
  const fixture = loadFixture(flags.fixture);
  const inlineText = flags._.join(' ').trim();
  const text = flags.text ?? (inlineText || fixture.request?.text) ?? 'Voicepath is ready.';
  const policy = { prefer: ['cloud', 'device'], fallback: 'device', prefetchSegments: 0, ...(fixture.policy ?? {}) };
  const played = [];
  const voice = createVoicePath({
    policy,
    providers: providersFromFixture(fixture),
    playChunk: async (chunk, { segment }) => played.push({ providerId: chunk.providerId, segmentId: segment.id, text: chunk.text })
  });
  const result = await voice.speak({ text, voice: flags.voice ?? fixture.request?.voice ?? 'calm-operator', context: flags.context ?? fixture.request?.context ?? 'cli' });
  const summary = summarizeVoicePathEvents(voice.events);
  const report = { ok: true, command: 'speak', providerId: result.providerId, voice: result.voice, played, summary };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

async function runDoctor() {
  const checks = { node: process.versions.node, localDeviceFallback: true, openaiConfigured: Boolean(process.env.OPENAI_API_KEY), elevenlabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY), hiddenNetworkCalls: false };
  console.log(JSON.stringify({ ok: true, command: 'doctor', checks }, null, 2));
}

async function runLatency(flags) {
  const fixture = loadFixture(flags.fixture);
  const providers = providersFromFixture(fixture);
  const rows = [];
  for (const [id, provider] of Object.entries(providers)) {
    const started = performance.now();
    try {
      for await (const _chunk of provider.synthesize({ id: 'latency', index: 0, voice: 'calm', text: 'Latency probe.' })) break;
      rows.push({ providerId: id, ok: true, firstAudioMs: Math.round(performance.now() - started) });
    } catch (error) {
      rows.push({ providerId: id, ok: false, code: error.code ?? 'ERROR', message: error.message });
    }
  }
  console.log(JSON.stringify({ ok: true, command: 'latency', providers: rows }, null, 2));
}

function printHelp() {
  console.log(`voicepath ${packageJson.version}

Usage:
  voicepath doctor
  voicepath latency [--fixture file]
  voicepath speak [--fixture file] [--text text] [--voice id] [text...]
  voicepath demo [--fixture file] [text...]

All commands are local-first. Cloud providers require explicit credentials in the caller environment.`);
}

async function main(argv = process.argv.slice(2)) {
  const { command, flags } = parseArgs(argv);
  if (command === '--help' || command === '-h' || flags.help || flags.h) return printHelp();
  if (command === '--version' || command === '-v' || flags.version) return console.log(packageJson.version);
  if (command === 'doctor') return runDoctor(flags);
  if (command === 'latency') return runLatency(flags);
  if (command === 'speak' || command === 'demo') return runSpeak(flags);
  printHelp();
  process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.stack || error.message); process.exit(1); });
export { main, parseArgs };
