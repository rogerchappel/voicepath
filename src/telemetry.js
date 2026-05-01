export function summarizeVoicePathEvents(events) {
  const list = Array.isArray(events) ? events : events?.history?.() ?? [];
  const firstAudio = list.find((event) => event.type === 'voicepath.latency.measured' && event.payload?.label?.startsWith('first-audio:'));
  const fallbacks = list.filter((event) => event.type === 'voicepath.fallback.used');
  const interruptions = list.filter((event) => event.type === 'voicepath.speech.interrupted');
  const failures = list.filter((event) => event.type === 'voicepath.provider.failed');
  const selected = [...list].reverse().find((event) => event.type === 'voicepath.provider.selected');
  return {
    providerId: selected?.payload?.providerId ?? null,
    firstAudioMs: firstAudio?.payload?.latencyMs ?? null,
    fallbackCount: fallbacks.length,
    fallbackReasons: fallbacks.map((event) => event.payload?.reason).filter(Boolean),
    interruptionCount: interruptions.length,
    failureCodes: failures.map((event) => event.payload?.code).filter(Boolean),
    eventCount: list.length
  };
}

export function createTelemetrySink({ onReport } = {}) {
  const events = [];
  return {
    push(event) {
      events.push(event);
      if (event.type === 'voicepath.speech.completed' || event.type === 'voicepath.speech.interrupted') {
        onReport?.(summarizeVoicePathEvents(events), [...events]);
      }
    },
    events() { return [...events]; },
    report() { return summarizeVoicePathEvents(events); }
  };
}

export function eventFixture(events) {
  return (Array.isArray(events) ? events : events?.history?.() ?? []).map((event) => ({
    type: event.type,
    payload: event.payload
  }));
}
