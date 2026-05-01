import { randomUUID } from 'node:crypto';

const SENTENCE_BOUNDARY = /([^.!?;:]+(?:[.!?;:]+|$))/g;

export function splitIntoSegments(text, { maxChars = 180 } = {}) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const sentences = [...normalized.matchAll(SENTENCE_BOUNDARY)].map((match) => match[0].trim()).filter(Boolean);
  const source = sentences.length ? sentences : [normalized];
  const segments = [];
  let sentenceIndex = 0;
  for (const sentence of source) {
    sentenceIndex += 1;
    if (sentence.length <= maxChars) {
      segments.push({ text: sentence, sentenceId: `s${sentenceIndex}` });
      continue;
    }
    const clauses = sentence.split(/(?<=,)\s+/g);
    let buffer = '';
    for (const clause of clauses) {
      if ((buffer + ' ' + clause).trim().length > maxChars && buffer) {
        segments.push({ text: buffer.trim(), sentenceId: `s${sentenceIndex}` });
        buffer = clause;
      } else {
        buffer = `${buffer} ${clause}`.trim();
      }
    }
    if (buffer) segments.push({ text: buffer.trim(), sentenceId: `s${sentenceIndex}` });
  }
  return segments.map((segment, index) => ({
    id: `seg-${index + 1}`,
    index,
    ...segment,
    safeBoundary: index === segments.length - 1 || segments[index + 1]?.sentenceId !== segment.sentenceId
  }));
}

export function planUtterance({ text, voice, requestId = randomUUID(), providerId, policy = {}, segmentOptions = {} }) {
  const segments = splitIntoSegments(text, segmentOptions).map((segment) => ({
    ...segment,
    requestId,
    voice,
    providerId,
    status: 'planned'
  }));
  return {
    id: requestId,
    text,
    voice,
    providerId,
    continuity: policy.continuity ?? 'utterance',
    neverSwitchMidSentence: policy.neverSwitchMidSentence !== false,
    prefetchSegments: Math.max(0, Number(policy.prefetchSegments ?? 1)),
    segments
  };
}

export class PlaybackQueue {
  #items = [];
  #interrupted = false;

  constructor({ events, playChunk = async () => {}, now = () => performance.now?.() ?? Date.now() } = {}) {
    this.events = events;
    this.playChunk = playChunk;
    this.now = now;
    this.ducked = false;
    this.current = null;
  }

  enqueue(segment, audio) {
    if (this.#interrupted) return false;
    const item = { segment, audio, queuedAt: this.now() };
    this.#items.push(item);
    this.events?.emit('voicepath.chunk.queued', {
      requestId: segment.requestId,
      segmentId: segment.id,
      segmentIndex: segment.index,
      providerId: segment.providerId
    });
    return true;
  }

  async drain({ signal } = {}) {
    const played = [];
    while (this.#items.length > 0) {
      if (this.#interrupted || signal?.aborted) break;
      const item = this.#items.shift();
      this.current = item;
      await this.playChunk(item.audio, { segment: item.segment, ducked: this.ducked, signal });
      played.push(item.segment.id);
      this.events?.emit('voicepath.chunk.played', {
        requestId: item.segment.requestId,
        segmentId: item.segment.id,
        segmentIndex: item.segment.index,
        providerId: item.segment.providerId
      });
    }
    this.current = null;
    return played;
  }

  interrupt(reason = 'user_barge_in') {
    this.#interrupted = true;
    const cancelled = this.#items.splice(0).map((item) => item.segment.id);
    this.events?.emit('voicepath.speech.interrupted', { reason, cancelledSegments: cancelled, currentSegment: this.current?.segment?.id });
    return { cancelledSegments: cancelled, currentSegment: this.current?.segment?.id ?? null };
  }

  duck(level = 0.35, reason = 'barge_in_detected') {
    this.ducked = true;
    this.events?.emit('voicepath.speech.ducked', { level, reason });
  }

  resume(reason = 'barge_in_cleared') {
    this.ducked = false;
    this.events?.emit('voicepath.speech.resumed', { reason });
  }

  get size() {
    return this.#items.length;
  }

  get interrupted() {
    return this.#interrupted;
  }
}
