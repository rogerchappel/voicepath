# Task Queue: voicepath

Source: assistant-authored from PRD.md by Neo; designed as LLM-quality orchestration with explicit concurrency waves
Format: assistant-authored orchestration derived from docs/PRD.md

## Product North Star

Build a low-latency voice routing SDK that makes agent speech fast, stable, observable, and graceful under provider failure without ever randomly switching voice mid-sentence.

## Tasks

### voicepath-define-routing-contract: Define voice routing contract and utterance lifecycle

- Repo: `voicepath`
- Phase: `foundation`
- Risk: `medium`
- Branch: `agent/define-routing-contract`
- Depends on: None

**Objective**

Specify provider interface, utterance/segment lifecycle, latency budget fields, continuity invariants, event stream, and package layout.

**Acceptance Criteria**

Architecture doc and types define speak, interrupt, provider health, segment planning, fallback reasons, and observable events.

### voicepath-build-policy-engine: Build policy engine for latency, quality, fallback, and continuity

- Repo: `voicepath`
- Phase: `implementation`
- Risk: `medium`
- Branch: `agent/build-policy-engine`
- Depends on: `voicepath-define-routing-contract`

**Objective**

Implement deterministic provider selection with health checks, disabled/quota states, local fallback, quality tiers, and never-switch-mid-sentence invariants.

**Acceptance Criteria**

Unit tests cover provider preference, failure, timeout, quota disabled, offline fallback, and continuity guarantees.

### voicepath-utterance-planner-playback-queue: Build utterance planner and streaming playback queue

- Repo: `voicepath`
- Phase: `implementation`
- Risk: `medium`
- Branch: `agent/utterance-planner-playback-queue`
- Depends on: `voicepath-define-routing-contract`

**Objective**

Segment text into safe phrases, prefetch when allowed, queue chunks, preserve voice identity through an utterance, and expose interruption hooks.

**Acceptance Criteria**

Tests prove chunk ordering, cancellation, sentence boundaries, prefetch limits, and no unsafe provider swaps.

### voicepath-provider-adapters: Implement provider adapters and mocks

- Repo: `voicepath`
- Phase: `implementation`
- Risk: `medium`
- Branch: `agent/provider-adapters`
- Depends on: `voicepath-define-routing-contract`

**Objective**

Add device/browser speech, OpenAI, ElevenLabs, macOS/system where practical, plus rich mock providers for latency/failure tests.

**Acceptance Criteria**

Adapters are explicit opt-in, credentials are passed by caller, mock suite can simulate latency, quota exhaustion, stream failure, and partial audio.

### voicepath-event-telemetry-api: Build observable event and latency reporting API

- Repo: `voicepath`
- Phase: `implementation`
- Risk: `low`
- Branch: `agent/event-telemetry-api`
- Depends on: `voicepath-build-policy-engine`, `voicepath-utterance-planner-playback-queue`

**Objective**

Emit speaking, provider selected, fallback used, first-audio latency, chunk latency, interruption, and completion events for AgentPulse/ToolTrace/AgentGlow.

**Acceptance Criteria**

Consumers can subscribe; event fixtures drive snapshots; no event leaks secrets.

### voicepath-interruption-and-bargekit-hooks: Wire cancellation and BargeKit integration hooks

- Repo: `voicepath`
- Phase: `integration`
- Risk: `medium`
- Branch: `agent/interruption-and-bargekit-hooks`
- Depends on: `voicepath-utterance-planner-playback-queue`, `voicepath-event-telemetry-api`

**Objective**

Expose interrupt/duck/resume semantics so BargeKit can stop or lower output immediately when the user speaks.

**Acceptance Criteria**

Synthetic tests verify barge-in cancels queued segments, emits interruption, and does not resume stale audio.

### voicepath-demo-latency-fallback: Build latency and fallback demo

- Repo: `voicepath`
- Phase: `demo`
- Risk: `medium`
- Branch: `agent/demo-latency-fallback`
- Depends on: `voicepath-provider-adapters`, `voicepath-event-telemetry-api`

**Objective**

Create a demo/CLI showing local vs cloud, simulated degradation, fallback reasons, first-audio timing, and continuity across a multi-sentence response.

**Acceptance Criteria**

Demo works without cloud credentials via mocks/device; with credentials it can compare providers; screenshots make the value obvious.

### voicepath-docs-privacy-recipes: Write docs, privacy model, and routing recipes

- Repo: `voicepath`
- Phase: `documentation`
- Risk: `low`
- Branch: `agent/docs-privacy-recipes`
- Depends on: `voicepath-demo-latency-fallback`, `voicepath-interruption-and-bargekit-hooks`

**Objective**

Document quickstart, provider setup, safe defaults, no hidden network calls, latency tradeoffs, fallback recipes, and integration with AgentPulse/BargeKit.

**Acceptance Criteria**

README and docs explain the continuity wedge and give copy-paste configs for desktop, browser, mobile-style, and offline-first setups.

### voicepath-resilience-test-matrix: Build resilience test matrix and quality gates

- Repo: `voicepath`
- Phase: `verification`
- Risk: `medium`
- Branch: `agent/resilience-test-matrix`
- Depends on: `voicepath-docs-privacy-recipes`

**Objective**

Add tests and fixtures for provider failures, slow starts, partial streams, quota states, cancellation, local fallback, and latency reports.

**Acceptance Criteria**

CI runs core tests; matrix verifies all critical failure modes; final report documents what is mocked vs real-provider manual.

### voicepath-final-product-review: Final voice UX review and release readiness

- Repo: `voicepath`
- Phase: `final_validation`
- Risk: `high`
- Branch: `agent/final-product-review`
- Depends on: `voicepath-resilience-test-matrix`

**Objective**

Run a full product review against the promise: starts fast, degrades gracefully, never switches voice mid-sentence, and tells the UI what happened.

**Acceptance Criteria**

Human/product signoff before public release because voice UX failure is very noticeable.
