# Provider Adapters

An adapter is intentionally small:

- `id`, `kind`, `qualityTier`, and `configured` metadata
- `healthCheck()` returning `healthy`, `degraded`, `offline`, `quota_exhausted`, `unconfigured`, or `disabled`
- `synthesize(segment, options)` yielding audio chunks
- optional `resolveVoice(voice)` for provider-specific voice names

Adapters should not read secrets from disk, persist audio, or make surprise network calls. The host application chooses credentials and routing policy.
