import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackQueue, VoicePathEvents, planUtterance, splitIntoSegments } from '../src/index.js';

test('splitIntoSegments keeps sentence boundaries and stable order', () => {
  const segments = splitIntoSegments('First sentence. Second sentence! Third clause, with detail, and more detail.', { maxChars: 35 });
  assert.deepEqual(segments.map((segment) => segment.index), [0, 1, 2, 3]);
  assert.equal(segments[0].sentenceId, 's1');
  assert.equal(segments[1].sentenceId, 's2');
  assert.equal(segments.at(-1).safeBoundary, true);
});

test('planUtterance assigns one provider and voice across all segments', () => {
  const utterance = planUtterance({ text: 'One. Two.', voice: 'calm', requestId: 'u1', providerId: 'device' });
  assert.equal(utterance.segments.length, 2);
  assert.ok(utterance.segments.every((segment) => segment.providerId === 'device'));
  assert.ok(utterance.segments.every((segment) => segment.voice === 'calm'));
});

test('PlaybackQueue drains chunks in queued order', async () => {
  const played = [];
  const queue = new PlaybackQueue({ playChunk: async (_audio, { segment }) => played.push(segment.id) });
  queue.enqueue({ requestId: 'r', id: 'a', index: 0, providerId: 'mock' }, { bytes: new Uint8Array() });
  queue.enqueue({ requestId: 'r', id: 'b', index: 1, providerId: 'mock' }, { bytes: new Uint8Array() });
  const drained = await queue.drain();
  assert.deepEqual(played, ['a', 'b']);
  assert.deepEqual(drained, ['a', 'b']);
});

test('PlaybackQueue interrupt cancels queued segments and emits event', () => {
  const events = new VoicePathEvents();
  const queue = new PlaybackQueue({ events });
  queue.enqueue({ requestId: 'r', id: 'a', index: 0, providerId: 'mock' }, {});
  queue.enqueue({ requestId: 'r', id: 'b', index: 1, providerId: 'mock' }, {});
  const result = queue.interrupt('barge_in');
  assert.deepEqual(result.cancelledSegments, ['a', 'b']);
  assert.equal(queue.size, 0);
  assert.ok(events.history().some((event) => event.type === 'voicepath.speech.interrupted'));
});

test('PlaybackQueue duck and resume emit bargekit-compatible hooks', () => {
  const events = new VoicePathEvents();
  const queue = new PlaybackQueue({ events });
  queue.duck(0.25, 'user_started_speaking');
  queue.resume('user_stopped_speaking');
  assert.deepEqual(events.history().map((event) => event.type), ['voicepath.speech.ducked', 'voicepath.speech.resumed']);
});
