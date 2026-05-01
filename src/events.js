import { randomUUID } from 'node:crypto';

const SECRET_KEY_PATTERN = /(api[-_]?key|authorization|token|secret|password|credential)s?/i;

export function sanitizeEventPayload(value) {
  if (Array.isArray(value)) return value.map(sanitizeEventPayload);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? '[redacted]' : sanitizeEventPayload(inner)
      ])
    );
  }
  return value;
}

export class VoicePathEvents {
  #listeners = new Set();
  #history = [];

  constructor({ clock = () => Date.now(), maxHistory = 500 } = {}) {
    this.clock = clock;
    this.maxHistory = maxHistory;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  emit(type, payload = {}) {
    const event = Object.freeze({
      id: randomUUID(),
      type,
      at: new Date(this.clock()).toISOString(),
      payload: sanitizeEventPayload(payload)
    });
    this.#history.push(event);
    if (this.#history.length > this.maxHistory) this.#history.shift();
    for (const listener of this.#listeners) listener(event);
    return event;
  }

  history() {
    return [...this.#history];
  }
}

export function createLatencyReporter(events, { now = () => performance.now?.() ?? Date.now() } = {}) {
  const started = new Map();
  return {
    markStart(label, metadata = {}) {
      started.set(label, { time: now(), metadata });
    },
    markEnd(label, metadata = {}) {
      const start = started.get(label);
      if (!start) return null;
      started.delete(label);
      const latencyMs = Math.max(0, Math.round(now() - start.time));
      events.emit('voicepath.latency.measured', { label, latencyMs, ...start.metadata, ...metadata });
      return latencyMs;
    }
  };
}
