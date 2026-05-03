# Routing Fixtures

Fixtures make routing behavior reproducible without cloud credentials.

```json
{
  "request": { "text": "Hello", "voice": "calm-operator", "context": "demo" },
  "policy": { "prefer": ["cloud", "device"], "fallback": "device" },
  "providers": {
    "cloud": { "latencyMs": 50, "health": { "state": "offline" } },
    "device": { "adapter": "device", "voice": "local-calm" }
  }
}
```

Use fixtures for bug reports, CI smoke tests, demos, and latency regressions.
