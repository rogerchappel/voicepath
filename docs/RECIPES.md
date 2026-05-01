# Routing Recipes

## Offline-first desktop

```js
const voice = createVoicePath({
  policy: { prefer: ['system', 'device'], fallback: 'device', maxFirstAudioMs: 150 },
  providers: { system: createSystemSpeechProvider(), device: createDeviceSpeechProvider() }
});
```

## Premium voice with local fallback

```js
const voice = createVoicePath({
  policy: {
    prefer: ['elevenlabs', 'openai', 'device'],
    fallback: 'device',
    maxFirstAudioMs: 450,
    continuity: 'utterance',
    neverSwitchMidSentence: true
  },
  providers: {
    elevenlabs: createElevenLabsProvider({ apiKey: process.env.ELEVENLABS_API_KEY, voiceId: '...' }),
    openai: createOpenAiVoiceProvider({ apiKey: process.env.OPENAI_API_KEY }),
    device: createDeviceSpeechProvider()
  }
});
```

## Browser/mobile-style local fallback

```js
const voice = createVoicePath({
  policy: { prefer: ['device'], fallback: 'device', localFirstWhenOffline: true },
  providers: { device: createDeviceSpeechProvider() }
});
```

## BargeKit interruption hooks

```js
const hooks = createBargeKitHooks(voice);
bargekit.on('speech-start', () => hooks.onUserSpeechStart({ reason: 'user_started_speaking' }));
bargekit.on('speech-end', () => hooks.onUserSpeechEnd());
```

## AgentPulse / ToolTrace telemetry

```js
const sink = createTelemetrySink({
  onReport(report) {
    agentPulse.record('voicepath', report);
  }
});
voice.events.subscribe((event) => sink.push(event));
```

## Simulate degradation locally

```sh
VOICEPATH_DEMO_CLOUD=offline npm run demo -- "Cloud is down but this should keep speaking."
VOICEPATH_DEMO_CLOUD=quota npm run demo -- "Quota exhaustion should route to device."
VOICEPATH_DEMO_CLOUD=healthy npm run demo -- "Healthy cloud should win preference order."
```
