# Orchestration Handoff

## Summary

- Workspace: default
- Repository: voicepath
- Source: assistant-authored from PRD.md by Neo; designed as LLM-quality orchestration with explicit concurrency waves
- Total tasks: 10
- Dispatch now: voicepath-define-routing-contract
- Blocked tasks: voicepath-final-product-review

## Product North Star

Build a low-latency voice routing SDK that makes agent speech fast, stable, observable, and graceful under provider failure without ever randomly switching voice mid-sentence.

## Dispatch Prompt

Dispatch Wave 1 first. These tasks may run concurrently:
- voicepath-define-routing-contract

Wait for the whole wave to finish and pass verification before dispatching the next sequential wave. Inside a concurrent wave, assign separate agents to separate branches and merge only after each task meets its acceptance criteria.

## LLM Refinement Notes
- The policy engine is the product. Provider adapters are replaceable; continuity rules are the durable wedge.
- Model utterances as planned segments before playback so routing, fallback, and cancellation are deterministic.
- Demo must prove the magic: fast first audio, visible fallback reason, no mid-sentence voice switch.
- Privacy/default-safety matters: no hidden cloud calls and local/device mode must work without credentials.

## Concurrency Strategy

The best concurrency path is to protect the product contract first, then split work by stable interface boundaries. Do not dispatch renderer/provider/UI/demo work before the contracts they consume are stable. Once a wave is open, prefer parallel agents with narrow ownership and explicit handoff notes.

## Sequential Waves

### Wave 1: Routing contract and invariants

- Mode inside wave: sequential
- Dispatch: now
- Tasks: voicepath-define-routing-contract

### Wave 2: Core voice engine

- Mode inside wave: concurrent
- Dispatch: after_dependencies
- Tasks: voicepath-build-policy-engine, voicepath-utterance-planner-playback-queue, voicepath-provider-adapters

### Wave 3: Observability and interruption

- Mode inside wave: concurrent
- Dispatch: after_dependencies
- Tasks: voicepath-event-telemetry-api, voicepath-interruption-and-bargekit-hooks

### Wave 4: Proof demo and docs

- Mode inside wave: concurrent
- Dispatch: after_dependencies
- Tasks: voicepath-demo-latency-fallback, voicepath-docs-privacy-recipes

### Wave 5: Resilience and final voice UX review

- Mode inside wave: sequential
- Dispatch: after_human_decision
- Tasks: voicepath-resilience-test-matrix, voicepath-final-product-review

## Task Dependencies

### voicepath-define-routing-contract: Define voice routing contract and utterance lifecycle

- Phase: foundation
- Repo: voicepath
- Branch: agent/define-routing-contract
- Risk: medium
- Depends on: None
- Can run concurrently with: None
- Dispatchable now: Yes
- Blocked by: None

**Objective**

Specify provider interface, utterance/segment lifecycle, latency budget fields, continuity invariants, event stream, and package layout.

**Acceptance Criteria**

Architecture doc and types define speak, interrupt, provider health, segment planning, fallback reasons, and observable events.

### voicepath-build-policy-engine: Build policy engine for latency, quality, fallback, and continuity

- Phase: implementation
- Repo: voicepath
- Branch: agent/build-policy-engine
- Risk: medium
- Depends on: voicepath-define-routing-contract
- Can run concurrently with: voicepath-utterance-planner-playback-queue, voicepath-provider-adapters
- Dispatchable now: No
- Blocked by: None

**Objective**

Implement deterministic provider selection with health checks, disabled/quota states, local fallback, quality tiers, and never-switch-mid-sentence invariants.

**Acceptance Criteria**

Unit tests cover provider preference, failure, timeout, quota disabled, offline fallback, and continuity guarantees.

### voicepath-utterance-planner-playback-queue: Build utterance planner and streaming playback queue

- Phase: implementation
- Repo: voicepath
- Branch: agent/utterance-planner-playback-queue
- Risk: medium
- Depends on: voicepath-define-routing-contract
- Can run concurrently with: voicepath-build-policy-engine, voicepath-provider-adapters
- Dispatchable now: No
- Blocked by: None

**Objective**

Segment text into safe phrases, prefetch when allowed, queue chunks, preserve voice identity through an utterance, and expose interruption hooks.

**Acceptance Criteria**

Tests prove chunk ordering, cancellation, sentence boundaries, prefetch limits, and no unsafe provider swaps.

### voicepath-provider-adapters: Implement provider adapters and mocks

- Phase: implementation
- Repo: voicepath
- Branch: agent/provider-adapters
- Risk: medium
- Depends on: voicepath-define-routing-contract
- Can run concurrently with: voicepath-build-policy-engine, voicepath-utterance-planner-playback-queue
- Dispatchable now: No
- Blocked by: None

**Objective**

Add device/browser speech, OpenAI, ElevenLabs, macOS/system where practical, plus rich mock providers for latency/failure tests.

**Acceptance Criteria**

Adapters are explicit opt-in, credentials are passed by caller, mock suite can simulate latency, quota exhaustion, stream failure, and partial audio.

### voicepath-event-telemetry-api: Build observable event and latency reporting API

- Phase: implementation
- Repo: voicepath
- Branch: agent/event-telemetry-api
- Risk: low
- Depends on: voicepath-build-policy-engine, voicepath-utterance-planner-playback-queue
- Can run concurrently with: voicepath-interruption-and-bargekit-hooks
- Dispatchable now: No
- Blocked by: None

**Objective**

Emit speaking, provider selected, fallback used, first-audio latency, chunk latency, interruption, and completion events for AgentPulse/ToolTrace/AgentGlow.

**Acceptance Criteria**

Consumers can subscribe; event fixtures drive snapshots; no event leaks secrets.

### voicepath-interruption-and-bargekit-hooks: Wire cancellation and BargeKit integration hooks

- Phase: integration
- Repo: voicepath
- Branch: agent/interruption-and-bargekit-hooks
- Risk: medium
- Depends on: voicepath-utterance-planner-playback-queue, voicepath-event-telemetry-api
- Can run concurrently with: voicepath-event-telemetry-api
- Dispatchable now: No
- Blocked by: None

**Objective**

Expose interrupt/duck/resume semantics so BargeKit can stop or lower output immediately when the user speaks.

**Acceptance Criteria**

Synthetic tests verify barge-in cancels queued segments, emits interruption, and does not resume stale audio.

### voicepath-demo-latency-fallback: Build latency and fallback demo

- Phase: demo
- Repo: voicepath
- Branch: agent/demo-latency-fallback
- Risk: medium
- Depends on: voicepath-provider-adapters, voicepath-event-telemetry-api
- Can run concurrently with: voicepath-docs-privacy-recipes
- Dispatchable now: No
- Blocked by: None

**Objective**

Create a demo/CLI showing local vs cloud, simulated degradation, fallback reasons, first-audio timing, and continuity across a multi-sentence response.

**Acceptance Criteria**

Demo works without cloud credentials via mocks/device; with credentials it can compare providers; screenshots make the value obvious.

### voicepath-docs-privacy-recipes: Write docs, privacy model, and routing recipes

- Phase: documentation
- Repo: voicepath
- Branch: agent/docs-privacy-recipes
- Risk: low
- Depends on: voicepath-demo-latency-fallback, voicepath-interruption-and-bargekit-hooks
- Can run concurrently with: voicepath-demo-latency-fallback
- Dispatchable now: No
- Blocked by: None

**Objective**

Document quickstart, provider setup, safe defaults, no hidden network calls, latency tradeoffs, fallback recipes, and integration with AgentPulse/BargeKit.

**Acceptance Criteria**

README and docs explain the continuity wedge and give copy-paste configs for desktop, browser, mobile-style, and offline-first setups.

### voicepath-resilience-test-matrix: Build resilience test matrix and quality gates

- Phase: verification
- Repo: voicepath
- Branch: agent/resilience-test-matrix
- Risk: medium
- Depends on: voicepath-docs-privacy-recipes
- Can run concurrently with: voicepath-final-product-review
- Dispatchable now: No
- Blocked by: None

**Objective**

Add tests and fixtures for provider failures, slow starts, partial streams, quota states, cancellation, local fallback, and latency reports.

**Acceptance Criteria**

CI runs core tests; matrix verifies all critical failure modes; final report documents what is mocked vs real-provider manual.

### voicepath-final-product-review: Final voice UX review and release readiness

- Phase: final_validation
- Repo: voicepath
- Branch: agent/final-product-review
- Risk: high
- Depends on: voicepath-resilience-test-matrix
- Can run concurrently with: voicepath-resilience-test-matrix
- Dispatchable now: No
- Blocked by: approve high-risk scope before dispatch

**Objective**

Run a full product review against the promise: starts fast, degrades gracefully, never switches voice mid-sentence, and tells the UI what happened.

**Acceptance Criteria**

Human/product signoff before public release because voice UX failure is very noticeable.
