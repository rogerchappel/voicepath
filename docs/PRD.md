# voicepath

Status: ready
Decision: build now

## Scorecard

Total: 90/100
Band: build now
Last scored: 2026-05-01
Scored by: Neo

| Criterion | Points | Notes |
|---|---:|---|
| Problem pain | 20/20 | Agent voice UX breaks when providers are slow, credits run out, network degrades, or voices switch mid-sentence. |
| Demand signal | 18/20 | Strong internal pain from CrewCmd/OpenClaw voice behaviour plus external momentum around low-latency voice agents. |
| V1 buildability | 16/20 | A robust abstraction is feasible; truly excellent latency and fallback policy requires careful engineering. |
| Differentiation | 14/15 | Provider routing plus continuity rules, latency budgets, local fallback, and no mid-utterance voice switching is a sharp wedge. |
| Agentic workflow leverage | 15/15 | Voice becomes a reusable capability for CrewCmd, OpenClaw, mobile, desktop, and web agent apps. |
| Distribution potential | 7/10 | Demoable with side-by-side latency, provider fallback, and “never switches voice mid-sentence” positioning. |

## Pitch

A low-latency voice exchange SDK for agents that routes across local voices, OpenAI, ElevenLabs, and other TTS/STT providers without awkward mid-sentence switches.

## Why It Matters

Voice is becoming the natural interface for agent teams, but the current experience is brittle. Apps often hard-code one provider, block on slow network calls, burn credits unexpectedly, or fall back to terrible default voices at the wrong time.

Roger has already felt this in CrewCmd: sometimes it uses Apple voices, sometimes ElevenLabs, sometimes OpenAI, and the experience can change halfway through a response. `voicepath` turns that mess into an explicit routing and continuity layer.

## Qualification

### Pub Test

“Give your agent a reliable voice: low-latency streaming TTS/STT with provider fallback, local fallback, voice continuity, and clear latency budgets.”

### Competitors / Adjacent Tools

- Provider SDKs: OpenAI, ElevenLabs, Cartesia, PlayHT, Azure, Google, Apple speech APIs — strong engines, but each app still has to solve routing, fallback, cost, latency, and continuity.
- Voice agent stacks like LiveKit Agents and OpenAI Realtime-style flows — validate low-latency voice demand, but are broader real-time agent frameworks rather than a portable voice-routing layer.
- `GetStream/Vision-Agents`, `Lex-au/Vocalis`, and `herimor/voxtream` appeared in GitHub search for low-latency voice/agent tooling on 2026-05-01, validating category heat but not solving cross-provider app integration for agent UIs.

### Star / Demand Signal

External demand is clear from the explosion of voice agent demos, provider SDKs, and low-latency speech repos. Internal demand is immediate because CrewCmd/OpenClaw need consistent voice behaviour across desktop/web/mobile contexts.

### Real Problem

Voice UX is degraded by:

- slow cloud TTS response
- provider credit exhaustion
- network instability
- mid-sentence provider/voice switching
- no quality ladder between “premium cloud voice” and “terrible system default”
- missing policy for when local voices should win over cloud voices
- unclear interruption/barge-in handling

### V1 Buildability

V1 can be a TypeScript library with provider adapters, a routing policy engine, and a streaming playback manager. It does not need to build a full assistant. It should make one job excellent: turn agent text/events into stable, low-latency speech with predictable fallback.

## V1 Scope

- Package: `@voicepath/core` for routing, budgets, utterance planning, and provider interfaces.
- Provider adapters:
  - browser/device speech synthesis
  - macOS/system voice adapter where available
  - OpenAI TTS/realtime-compatible adapter
  - ElevenLabs adapter
  - mock adapter for tests
- Policy engine:
  - latency budget per context
  - quality tier preference
  - provider health checks
  - credit/quota disabled states
  - offline/local-first fallback
  - “never switch provider mid-utterance” rule
- Streaming playback manager:
  - chunk queue
  - cancellation/interruption
  - sentence/phrase segmentation
  - prefetch next segment when safe
  - stable voice identity across a response
- Event API for UI layers like AgentGlow/CrewCmd:
  - speaking started/stopped
  - provider selected
  - fallback used
  - latency measured
  - interruption happened
- Demo app:
  - compare local vs cloud latency
  - simulate network degradation
  - show provider selection and fallback decisions

## Out of Scope

- Full conversational agent framework.
- Long-term memory or persona modelling.
- Secret management beyond accepting explicit provider config.
- Hidden provider calls.
- Circumventing provider quotas or rate limits.
- Voice cloning or impersonation defaults.
- Publishing audio externally.

## CLI/API Sketch

```ts
import { createVoicePath } from '@voicepath/core';

const voice = createVoicePath({
  policy: {
    maxFirstAudioMs: 450,
    prefer: ['elevenlabs', 'openai', 'device'],
    fallback: 'device',
    continuity: 'utterance',
    neverSwitchMidSentence: true,
  },
  providers: {
    elevenlabs: elevenLabsProvider({ apiKey: process.env.ELEVENLABS_API_KEY }),
    openai: openAiVoiceProvider({ apiKey: process.env.OPENAI_API_KEY }),
    device: deviceSpeechProvider(),
  },
});

await voice.speak({
  text: 'I found the PR and the tests passed.',
  voice: 'calm-operator',
  context: 'agent-status',
});
```

```bash
voicepath demo --text "This should start quickly and never switch voices mid-sentence."
voicepath doctor
voicepath latency --providers device,openai,elevenlabs
```

## Verification

- Unit tests for provider routing and fallback policy.
- Tests proving no provider switch mid-sentence/utterance unless explicitly interrupted.
- Mock providers for latency, failure, quota-exhausted, offline, and partial-stream scenarios.
- Browser/device demo works without cloud credentials.
- README documents privacy, provider config, latency tradeoffs, and safe defaults.
- No hidden network calls; cloud providers require explicit config.
- Latency report emitted for demo runs.

## Agent Prompt

Build `voicepath` as a TypeScript low-latency voice routing SDK for agent apps. Focus on provider abstraction, fallback policy, streaming playback, and voice continuity. Do not build a full assistant. The killer feature is that agent speech starts fast, degrades gracefully, and never randomly switches voice halfway through a sentence.
