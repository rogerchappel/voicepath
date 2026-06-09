# voicepath

Low-latency voice routing for agent apps. voicepath picks the best eligible TTS provider, falls back gracefully, emits useful telemetry, and preserves voice continuity so an agent does not randomly switch voices mid-sentence.

## Install

```sh
npm install @voicepath/core
```

This repository exposes `@voicepath/core`: a local-first SDK and CLI for provider routing, latency budgets, fallback, telemetry, voice continuity, and typed SDK consumers.

## Quickstart

```js
import {
  createDeviceSpeechProvider,
  createElevenLabsProvider,
  createOpenAiVoiceProvider,
  createVoicePath
} from '@voicepath/core';

const voice = createVoicePath({
  policy: {
    maxFirstAudioMs: 450,
    prefer: ['elevenlabs', 'openai', 'device'],
    fallback: 'device',
    continuity: 'utterance',
    neverSwitchMidSentence: true
  },
  providers: {
    elevenlabs: createElevenLabsProvider({ apiKey: process.env.ELEVENLABS_API_KEY }),
    openai: createOpenAiVoiceProvider({ apiKey: process.env.OPENAI_API_KEY }),
    device: createDeviceSpeechProvider()
  }
});

voice.events.subscribe((event) => console.log(event.type, event.payload));

await voice.speak({
  text: 'I found the PR and the tests passed.',
  voice: 'calm-operator',
  context: 'agent-status'
});
```

## Demo

Works without cloud credentials:

```sh
npm run demo -- "This should start quickly and never switch voices mid-sentence."
VOICEPATH_DEMO_CLOUD=offline npm run demo -- "Show fallback."
VOICEPATH_DEMO_CLOUD=healthy npm run demo -- "Show preferred cloud."
```

See [docs/DEMO.md](docs/DEMO.md).

## Personality

voicepath is the calm stage manager for agent voice: quick to start, honest when it falls back, and stubborn about not changing the actor mid-line.

## Why voicepath is different

- Deterministic policy engine for latency, quality, quota, health, and fallback.
- Utterance planner locks provider/voice identity across planned segments.
- Playback queue supports chunk ordering, cancellation, ducking, and BargeKit-style interruption.
- Observable events report provider selection, fallback reasons, first-audio latency, interruptions, failures, and completion.
- Cloud providers are explicit opt-in; no hidden network calls.

## Recipes and privacy

- [Safety model](SAFETY.md)
- [Privacy model](docs/PRIVACY.md)
- [Examples](examples/)
- [Routing recipes](docs/RECIPES.md)
- [Routing contract](docs/ROUTING_CONTRACT.md)

## Verify

```sh
npm run check
npm test
npm run build
npm run smoke
bash scripts/validate.sh
```

`scripts/validate.sh` runs repository checks and skips optional `agent-qc` when unavailable.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md). Do not put provider credentials into telemetry payloads.

## License

MIT

## Development

Run the same checks locally before opening a PR:

- `npm run check` - node scripts/check.mjs
- `npm run build` - node scripts/build.mjs
- `npm test` - node --test
- `npm run smoke` - node scripts/smoke.mjs
- `npm run validate` - bash scripts/validate.sh
- `npm run package:smoke` - npm pack --dry-run
- `npm run release:check` - npm run check && npm test && npm run build && npm run smoke && npm run package:smoke
