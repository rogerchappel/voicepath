# CLI

`voicepath` ships a credential-free smoke CLI for local demos and CI.

```sh
voicepath doctor
voicepath speak --fixture tests/fixtures/local-fallback.json
voicepath latency --fixture tests/fixtures/cloud-healthy.json
```

Fixtures describe request text, policy, and mock provider state. They are intentionally JSON so bug reports can include reproducible routing cases without real provider credentials.
