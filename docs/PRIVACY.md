# Privacy Model

voicepath is explicit opt-in by design.

## Defaults

- No hidden network calls. Core playback and mock/device providers work without credentials.
- Cloud adapters are unconfigured until the caller passes an API key.
- Event payloads redact secret-shaped keys such as `apiKey`, `authorization`, `token`, and `password`.
- The core SDK does not persist audio, text, provider responses, or telemetry. Consumers choose where events go.

## Provider Boundaries

- `createDeviceSpeechProvider()` and `createSystemSpeechProvider()` are local/device-style adapters.
- `createOpenAiVoiceProvider({ apiKey })` and `createElevenLabsProvider({ apiKey })` make provider calls only when selected and explicitly configured.
- Provider health states can mark cloud providers as `offline`, `quota_exhausted`, `disabled`, or `unconfigured` before routing.

## Safe Defaults

Use local fallback in production UI so agents can continue speaking when cloud providers are slow or unavailable:

```js
createVoicePath({
  policy: {
    prefer: ['elevenlabs', 'openai', 'device'],
    fallback: 'device',
    maxFirstAudioMs: 450,
    continuity: 'utterance',
    neverSwitchMidSentence: true
  },
  providers
});
```

## What to Avoid

- Do not put raw API keys into event metadata.
- Do not enable cloud providers silently on behalf of users.
- Do not switch providers inside an active sentence; let voicepath plan the utterance boundary.
