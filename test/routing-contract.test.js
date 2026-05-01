import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FAILURE_CODES,
  PROVIDER_HEALTH_STATES,
  PROVIDER_KINDS,
  REQUIRED_ROUTING_REQUEST_FIELDS,
  ROUTING_EVENTS,
  isProviderEligible
} from '../src/index.js';

const contract = readFileSync(new URL('../docs/ROUTING_CONTRACT.md', import.meta.url), 'utf8');

test('contract documents routing request, provider, continuity, fallback, and events', () => {
  for (const section of ['Routing Request', 'Provider Contract', 'Continuity Rules', 'Fallback Rules', 'Events']) {
    assert.match(contract, new RegExp(`## ${section}`));
  }
});

test('routing constants include provider kinds and health states', () => {
  assert.deepEqual(PROVIDER_KINDS, ['device', 'system', 'cloud', 'mock']);
  assert.ok(PROVIDER_HEALTH_STATES.includes('quota_exhausted'));
  assert.ok(PROVIDER_HEALTH_STATES.includes('unconfigured'));
});

test('contract exposes required request fields', () => {
  assert.deepEqual(REQUIRED_ROUTING_REQUEST_FIELDS, [
    'requestId',
    'text',
    'voice',
    'context',
    'budget.maxFirstAudioMs',
    'policy.prefer',
    'policy.fallback',
    'policy.continuity'
  ]);
});

test('routing events cover selection, fallback, playback, failure, and latency', () => {
  for (const event of [
    'voicepath.provider.selected',
    'voicepath.fallback.used',
    'voicepath.speech.started',
    'voicepath.provider.failed',
    'voicepath.latency.measured'
  ]) {
    assert.ok(ROUTING_EVENTS.includes(event));
  }
});

test('failure codes include no provider, timeout, quota, interruption, and playback failure', () => {
  for (const code of ['NO_ELIGIBLE_PROVIDER', 'FIRST_AUDIO_TIMEOUT', 'PROVIDER_QUOTA_EXHAUSTED', 'INTERRUPTED', 'PLAYBACK_FAILED']) {
    assert.ok(FAILURE_CODES.includes(code));
  }
});

test('eligibility requires explicit configuration and healthy/degraded state', () => {
  assert.equal(isProviderEligible({ configured: true, health: { state: 'healthy' } }), true);
  assert.equal(isProviderEligible({ configured: true, health: { state: 'degraded' } }), true);
  assert.equal(isProviderEligible({ configured: true, health: { state: 'offline' } }), false);
  assert.equal(isProviderEligible({ configured: false, health: { state: 'healthy' } }), false);
});
