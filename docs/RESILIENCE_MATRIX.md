# Resilience Test Matrix

Automated coverage lives in `test/resilience-matrix.test.js` plus the core policy/planner/provider tests.

| Scenario | Automated | Real provider/manual | Expected behaviour |
|---|---:|---:|---|
| Preferred provider healthy | yes | optional | Preferred provider selected. |
| Preferred provider offline | yes | optional | Local fallback selected and fallback reason emitted. |
| Provider quota exhausted | yes | optional | Quota provider skipped, fallback selected. |
| Provider unconfigured | yes | yes | No cloud call; adapter reports `unconfigured`. |
| Slow first audio | yes | optional | `FIRST_AUDIO_TIMEOUT` event emitted while playback may continue. |
| Partial stream failure | yes | optional | Failure event emitted; stale completion is not emitted. |
| Manual interruption | yes | yes | Queue cancels pending segments and emits interruption. |
| Barge-in duck/interrupt | yes | integration | BargeKit hooks duck, interrupt, and avoid stale resume. |
| No mid-sentence provider switch | yes | yes | Planned segments keep one provider per sentence/utterance. |
| Event secret redaction | yes | yes | Secret-shaped fields are redacted from telemetry payloads. |

## Quality gates

Run before merge or direct main push:

```sh
npm test
bash scripts/validate.sh
npm run demo -- "Fallback should be visible and stable."
```

## Mocked vs real-provider status

Mocked today:

- provider health states
- quota exhaustion
- slow starts
- partial stream failures
- local/device playback shape
- barge-in events

Real provider manual checks still needed before a public release:

- OpenAI audio output correctness with real credentials
- ElevenLabs streaming behaviour with real credentials
- Browser/device speech integration in an actual browser UI
- Native macOS voice playback latency when a native adapter is added
