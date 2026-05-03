import { createDeviceSpeechProvider, createMockProvider, createVoicePath, summarizeVoicePathEvents } from '../src/index.js';

const voice = createVoicePath({
  policy: { prefer: ['cloud', 'device'], fallback: 'device', prefetchSegments: 0 },
  providers: {
    cloud: createMockProvider({ id: 'cloud', health: { state: 'offline' } }),
    device: createDeviceSpeechProvider({ voice: 'local-calm' })
  },
  playChunk: async (chunk) => console.log('play', chunk.providerId, chunk.text)
});

await voice.speak({ text: 'Cloud is unavailable, but the agent keeps a steady local voice.', voice: 'calm-operator', context: 'example' });
console.log(summarizeVoicePathEvents(voice.events));
