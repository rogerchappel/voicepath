# Latency and Fallback Demo

Run:

```sh
npm run demo -- "This starts quickly and never switches voice mid-sentence."
```

The demo uses a mock premium cloud provider plus a local device provider. It works without credentials and prints:

- provider selection
- fallback reason
- first-audio latency
- played segment order
- final telemetry summary

## Modes

```sh
VOICEPATH_DEMO_CLOUD=healthy npm run demo
VOICEPATH_DEMO_CLOUD=offline npm run demo
VOICEPATH_DEMO_CLOUD=quota npm run demo
```

## Expected shape

When cloud is offline, output should include a fallback event and then play every segment with `device`:

```text
voicepath.fallback.used {"fromProviderId":"premium-cloud","toProviderId":"device","reason":"provider_unhealthy"}
▶ device seg-1: This starts on the fastest healthy voice.
▶ device seg-2: When the cloud is down, voicepath falls back without switching mid-sentence.
```

This is the product wedge: the UI can tell the user what happened, speech starts on the best eligible provider, and a sentence never changes voice halfway through.
