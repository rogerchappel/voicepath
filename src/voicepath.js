import { randomUUID } from 'node:crypto';
import { VoicePathEvents, createLatencyReporter } from './events.js';
import { PlaybackQueue, planUtterance } from './planner.js';
import { assertNoMidSentenceProviderSwitch, createRoutingPolicy, normalizeProviders, selectProvider } from './policy.js';

export function createVoicePath({ policy = {}, providers = {}, events = new VoicePathEvents(), playChunk } = {}) {
  const providerMap = normalizeProviders(providers);
  const routingPolicy = createRoutingPolicy(policy);
  const latency = createLatencyReporter(events);
  let active = null;

  async function speak(request) {
    const requestId = request.requestId ?? randomUUID();
    const controller = new AbortController();
    const mergedPolicy = createRoutingPolicy({ ...routingPolicy, ...(request.policy ?? {}) });
    const budget = { maxFirstAudioMs: mergedPolicy.maxFirstAudioMs, ...(request.budget ?? {}) };
    const selection = await selectProvider({ providers: providerMap, request: { ...request, requestId, policy: mergedPolicy, budget }, policy: mergedPolicy, events, signal: controller.signal });
    const resolvedVoice = selection.provider.resolveVoice?.(request.voice) ?? request.voice;
    const utterance = planUtterance({ text: request.text, voice: resolvedVoice, requestId, providerId: selection.providerId, policy: mergedPolicy });
    assertNoMidSentenceProviderSwitch(utterance.segments);
    const queue = new PlaybackQueue({ events, playChunk: playChunk ?? defaultPlayChunk });
    active = { requestId, controller, queue, selection, utterance };

    events.emit('voicepath.speech.started', { requestId, providerId: selection.providerId, voice: resolvedVoice, segmentCount: utterance.segments.length });
    latency.markStart(`first-audio:${requestId}`, { requestId, providerId: selection.providerId });

    const firstAudioTimer = setTimeout(() => {
      events.emit('voicepath.provider.failed', { requestId, providerId: selection.providerId, code: 'FIRST_AUDIO_TIMEOUT' });
    }, budget.maxFirstAudioMs);

    try {
      let firstChunk = true;
      for (const segment of utterance.segments) {
        if (controller.signal.aborted) throw Object.assign(new Error('Interrupted'), { code: 'INTERRUPTED' });
        const stream = selection.provider.synthesize(segment, { signal: controller.signal, request, policy: mergedPolicy });
        for await (const chunk of stream) {
          if (firstChunk) {
            clearTimeout(firstAudioTimer);
            latency.markEnd(`first-audio:${requestId}`, { segmentId: segment.id });
            firstChunk = false;
          }
          queue.enqueue(segment, chunk);
          if (queue.size > mergedPolicy.prefetchSegments) await queue.drain({ signal: controller.signal });
        }
      }
      clearTimeout(firstAudioTimer);
      await queue.drain({ signal: controller.signal });
      events.emit('voicepath.speech.completed', { requestId, providerId: selection.providerId, segmentCount: utterance.segments.length });
      active = null;
      return { requestId, providerId: selection.providerId, voice: resolvedVoice, utterance, events: events.history() };
    } catch (error) {
      clearTimeout(firstAudioTimer);
      if (error.code === 'INTERRUPTED' || controller.signal.aborted) {
        queue.interrupt('interrupt');
      } else {
        events.emit('voicepath.provider.failed', { requestId, providerId: selection.providerId, code: error.code ?? 'PLAYBACK_FAILED', message: error.message });
      }
      active = null;
      throw error;
    }
  }

  function interrupt(reason = 'user_barge_in') {
    if (!active) return { interrupted: false, reason: 'no_active_utterance' };
    active.controller.abort(reason);
    const result = active.queue.interrupt(reason);
    return { interrupted: true, requestId: active.requestId, ...result };
  }

  function duck(level = 0.35, reason = 'barge_in_detected') {
    active?.queue.duck(level, reason);
    return { ducked: Boolean(active), requestId: active?.requestId ?? null };
  }

  function resume(reason = 'barge_in_cleared') {
    active?.queue.resume(reason);
    return { resumed: Boolean(active), requestId: active?.requestId ?? null };
  }

  return {
    speak,
    interrupt,
    duck,
    resume,
    events,
    providers: providerMap,
    policy: routingPolicy,
    get activeUtterance() { return active?.utterance ?? null; }
  };
}

async function defaultPlayChunk() {
  // Core does not play audio itself. UI/native layers subscribe to events and provide playback.
}
