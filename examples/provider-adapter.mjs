import { createMockProvider, createVoicePath } from '../src/index.js';

function customProvider() {
  return createMockProvider({ id: 'studio', kind: 'cloud', qualityTier: 'premium', latencyMs: 12, voiceMap: { 'calm-operator': 'studio-calm-v1' } });
}

const voice = createVoicePath({ providers: { studio: customProvider() }, policy: { prefer: ['studio'], fallback: 'studio' } });
const result = await voice.speak({ text: 'Custom adapters only need health and synthesize.', voice: 'calm-operator', context: 'adapter-example' });
console.log({ providerId: result.providerId, voice: result.voice });
