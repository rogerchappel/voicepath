# Events

voicepath emits deterministic events for UI and telemetry layers:

- route requested
- provider selected/skipped
- fallback used
- speech started/completed/interrupted
- chunk queued/played
- provider failed
- first-audio latency measured

Event payloads are sanitized before listeners receive them, so secret-shaped keys are redacted.
