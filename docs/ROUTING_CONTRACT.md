# VoicePath Routing Contract

Status: Wave 1 canonical contract
Spec version: `1.0.0`

## Product North Star

VoicePath gives agent products one reliable speech-routing layer across local/device voices and cloud providers. The contract makes provider selection, fallback, latency budgets, and voice continuity explicit so an agent never randomly changes voice mid-utterance.

## Design Goals

- **Fast first audio:** route against a clear first-audio latency budget.
- **Graceful degradation:** recover from outage, quota, network, and health failures without surprising the user.
- **Continuity-first:** do not switch provider or voice inside an active utterance unless an interruption cancels it.
- **Provider-neutral:** adapters expose capabilities and health, not vendor-specific application logic.
- **Observable:** every routing choice emits a reason and structured events for UI/proof surfaces.
- **Safe by default:** no hidden network calls; cloud providers require explicit configuration.

## Core Terms

| Term | Meaning |
|---|---|
| Provider | A concrete speech backend such as device speech, macOS speech, OpenAI, ElevenLabs, or a mock provider. |
| Voice profile | Stable app-level voice identity requested by the caller, e.g. `calm-operator`. |
| Provider voice | Provider-specific voice identifier resolved from the profile. |
| Utterance | One uninterrupted speech request. Continuity is guaranteed for this unit. |
| Segment | Sentence or phrase chunk planned inside an utterance. Segments may be prefetched. |
| Route | Ordered provider candidate list plus the selected provider and reasons. |
| Budget | Latency/cost/quality constraints for a request context. |

## Routing Request

A routing request is the canonical input to the policy engine.

```json
{
  "requestId": "req_123",
  "text": "I found the PR and the tests passed.",
  "voice": "calm-operator",
  "context": "agent-status",
  "budget": {
    "maxFirstAudioMs": 450,
    "qualityTier": "balanced",
    "maxCostTier": "standard"
  },
  "policy": {
    "prefer": ["elevenlabs", "openai", "device"],
    "fallback": "device",
    "continuity": "utterance",
    "neverSwitchMidSentence": true,
    "localFirstWhenOffline": true
  }
}
```

Required fields:

- `requestId`
- `text`
- `voice`
- `context`
- `budget.maxFirstAudioMs`
- `policy.prefer`
- `policy.fallback`
- `policy.continuity`

## Provider Contract

Each provider adapter exposes static capabilities and dynamic health.

```json
{
  "id": "elevenlabs",
  "kind": "cloud",
  "supportsStreaming": true,
  "supportsInterruption": true,
  "supportedQualityTiers": ["premium", "balanced"],
  "estimatedFirstAudioMs": 320,
  "health": {
    "state": "healthy",
    "reason": "ok",
    "checkedAt": "2026-05-01T08:00:00Z"
  }
}
```

Allowed `kind` values:

- `device`
- `system`
- `cloud`
- `mock`

Allowed health states:

- `healthy`
- `degraded`
- `quota_exhausted`
- `offline`
- `unconfigured`
- `disabled`

Providers with `quota_exhausted`, `offline`, `unconfigured`, or `disabled` are ineligible unless a caller explicitly requests diagnostic mode.

## Candidate Eligibility Rules

A provider is eligible only when:

1. It is configured for the current runtime.
2. Its health state is `healthy` or `degraded`.
3. It can resolve the requested voice profile or an approved fallback voice.
4. Its estimated first audio can satisfy the budget, or every faster candidate is unavailable.
5. It satisfies privacy/locality constraints for the context.

The policy engine must return skipped candidates with machine-readable reasons.

## Selection Order

1. Start with `policy.prefer` order.
2. Remove ineligible providers and record skip reasons.
3. If offline or privacy requires local speech, prefer `device`/`system` providers.
4. Sort remaining candidates by:
   - budget fit
   - health state
   - quality tier fit
   - estimated first audio latency
   - caller preference order
5. Select the first candidate.
6. If no candidate remains, select `policy.fallback` only if it is eligible; otherwise fail with `NO_ELIGIBLE_PROVIDER`.

## Continuity Rules

- Default continuity is `utterance`.
- A selected provider and provider voice are locked for the active utterance.
- Segments inside an utterance may be prefetched but must use the locked provider and voice.
- A provider may change between utterances in the same response if policy permits.
- `neverSwitchMidSentence: true` means no switch inside a sentence boundary even when continuity is weaker than `utterance`.
- The only valid way to break continuity is an explicit interruption/cancellation followed by a new request.

## Fallback Rules

Fallback is allowed before first audio starts when:

- selected provider does not produce first audio before `maxFirstAudioMs`
- selected provider fails before playback begins
- provider health changes to ineligible before playback begins
- network becomes unavailable and local fallback is configured

Fallback after playback starts is not allowed inside the active utterance. Instead:

- continue with buffered audio if possible
- stop with a structured interruption/failure event
- start a new utterance using the fallback provider only if requested by caller policy

## Routing Decision

Every policy run returns a decision object.

```json
{
  "requestId": "req_123",
  "selectedProvider": "elevenlabs",
  "selectedVoice": "calm-operator-v2",
  "continuityScope": "utterance",
  "estimatedFirstAudioMs": 320,
  "reasons": ["preferred_provider", "within_latency_budget", "voice_profile_match"],
  "skipped": [
    { "provider": "openai", "reason": "lower_preference" },
    { "provider": "device", "reason": "fallback_reserved" }
  ]
}
```

## Events

VoicePath emits events for UI, logs, and proof surfaces.

| Event | Meaning |
|---|---|
| `voicepath.route.requested` | A routing decision was requested. |
| `voicepath.provider.selected` | Provider and voice were selected. |
| `voicepath.provider.skipped` | Candidate was skipped with a reason. |
| `voicepath.fallback.used` | Fallback provider was selected before first audio. |
| `voicepath.speech.started` | Playback began. |
| `voicepath.speech.completed` | Playback completed normally. |
| `voicepath.speech.interrupted` | Caller/user interrupted speech. |
| `voicepath.provider.failed` | Provider failed before or during playback. |
| `voicepath.latency.measured` | First audio or segment latency was measured. |

Event payloads should include `requestId`, `utteranceId`, `provider`, `voice`, and `reason` when applicable.

## Failure Codes

- `NO_ELIGIBLE_PROVIDER`
- `PROVIDER_UNCONFIGURED`
- `PROVIDER_OFFLINE`
- `PROVIDER_QUOTA_EXHAUSTED`
- `FIRST_AUDIO_TIMEOUT`
- `VOICE_PROFILE_UNAVAILABLE`
- `INTERRUPTED`
- `PLAYBACK_FAILED`

## Privacy and Safety Rules

- VoicePath must not call a cloud provider unless that provider is explicitly configured.
- Contexts may require local-only routing.
- Sensitive text should be routed only to providers allowed by caller policy.
- Provider adapters must not persist speech text unless explicitly configured by the host app.
- Logs/events should prefer summaries and IDs over raw full utterance text.

## Reducer Expectations

A consumer can derive:

- current speaking/listening state
- active provider and voice
- whether fallback was used
- first-audio latency
- interruption state
- terminal speech outcome
- provider health/skip reasons
