export type ProviderKind = 'device' | 'system' | 'cloud' | 'mock';
export type ProviderHealthState = 'healthy' | 'degraded' | 'quota_exhausted' | 'offline' | 'unconfigured' | 'disabled';
export type QualityTier = 'local' | 'standard' | 'premium';
export type ContinuityMode = 'utterance' | 'sentence' | 'none';

export interface RoutingPolicy {
  maxFirstAudioMs?: number;
  prefer?: string[];
  fallback?: string;
  continuity?: ContinuityMode;
  neverSwitchMidSentence?: boolean;
  localFirstWhenOffline?: boolean;
  prefetchSegments?: number;
  minQualityTier?: QualityTier;
}

export interface ProviderHealth {
  state: ProviderHealthState;
  reason?: string;
}

export interface PlannedSegment {
  id: string;
  index: number;
  requestId: string;
  sentenceId: string;
  text: string;
  voice: string;
  providerId: string;
  safeBoundary: boolean;
  status: 'planned';
}

export interface UtterancePlan {
  id: string;
  text: string;
  voice: string;
  providerId: string;
  continuity: ContinuityMode;
  neverSwitchMidSentence: boolean;
  prefetchSegments: number;
  segments: PlannedSegment[];
}

export interface AudioChunk {
  type: 'audio';
  providerId: string;
  segmentId: string;
  bytes: Uint8Array;
  text: string;
  partial?: boolean;
}

export interface VoiceProvider {
  id: string;
  kind: ProviderKind;
  qualityTier: QualityTier;
  configured: boolean;
  health: ProviderHealth;
  healthCheck?: (options?: { signal?: AbortSignal }) => Promise<ProviderHealth> | ProviderHealth;
  resolveVoice?: (voice: string) => string;
  synthesize: (segment: PlannedSegment, options?: { signal?: AbortSignal; request?: SpeakRequest; policy?: RoutingPolicy }) => AsyncIterable<AudioChunk>;
}

export interface SpeakRequest {
  requestId?: string;
  text: string;
  voice: string;
  context?: string;
  policy?: RoutingPolicy;
  budget?: { maxFirstAudioMs?: number };
}

export interface VoicePathEvent<TPayload = Record<string, unknown>> {
  id: string;
  type: string;
  at: string;
  payload: TPayload;
}

export class VoicePathEvents {
  constructor(options?: { clock?: () => number; maxHistory?: number });
  subscribe(listener: (event: VoicePathEvent) => void): () => void;
  emit(type: string, payload?: Record<string, unknown>): VoicePathEvent;
  history(): VoicePathEvent[];
}

export interface SpeakResult {
  requestId: string;
  providerId: string;
  voice: string;
  utterance: UtterancePlan;
  events: VoicePathEvent[];
}

export interface VoicePath {
  speak(request: SpeakRequest): Promise<SpeakResult>;
  interrupt(reason?: string): { interrupted: boolean; requestId?: string; reason?: string; cancelledSegments?: string[]; currentSegment?: string | null };
  duck(level?: number, reason?: string): { ducked: boolean; requestId: string | null };
  resume(reason?: string): { resumed: boolean; requestId: string | null };
  events: VoicePathEvents;
  providers: Map<string, VoiceProvider>;
  policy: Required<RoutingPolicy>;
  readonly activeUtterance: UtterancePlan | null;
}

export function createVoicePath(options?: {
  policy?: RoutingPolicy;
  providers?: Record<string, VoiceProvider> | Map<string, VoiceProvider>;
  events?: VoicePathEvents;
  playChunk?: (chunk: AudioChunk, options: { segment: PlannedSegment; ducked: boolean; signal?: AbortSignal }) => Promise<void> | void;
}): VoicePath;

export function createMockProvider(options?: Partial<VoiceProvider> & {
  latencyMs?: number;
  chunkLatencyMs?: number;
  failAtSegment?: string | number;
  failAfterChunks?: number;
  partial?: boolean;
  voiceMap?: Record<string, string>;
}): VoiceProvider & { setHealth(nextHealth: ProviderHealth | ProviderHealthState): void };
export function createDeviceSpeechProvider(options?: { id?: string; voice?: string; available?: boolean }): VoiceProvider;
export function createSystemSpeechProvider(options?: { id?: string; available?: boolean }): VoiceProvider;
export function createOpenAiVoiceProvider(options?: { apiKey?: string; model?: string; voice?: string; fetchImpl?: typeof fetch }): VoiceProvider;
export function createElevenLabsProvider(options?: { apiKey?: string; voiceId?: string; modelId?: string; fetchImpl?: typeof fetch }): VoiceProvider;

export function splitIntoSegments(text: string, options?: { maxChars?: number }): PlannedSegment[];
export function planUtterance(options: { text: string; voice: string; requestId?: string; providerId: string; policy?: RoutingPolicy; segmentOptions?: { maxChars?: number } }): UtterancePlan;
export function createRoutingPolicy(policy?: RoutingPolicy): Required<RoutingPolicy>;
export function selectProvider(options: {
  providers: Record<string, VoiceProvider> | Map<string, VoiceProvider>;
  request?: Partial<SpeakRequest> & { requestId?: string };
  policy?: RoutingPolicy;
  previousSelection?: { providerId: string; voice?: string };
  events?: VoicePathEvents;
  signal?: AbortSignal;
}): Promise<{ providerId: string; provider: VoiceProvider; health: ProviderHealth; fallbackUsed: boolean; skipped: Array<Record<string, unknown>>; policy: Required<RoutingPolicy> }>;
export function isProviderEligible(provider: Pick<VoiceProvider, 'configured' | 'health'>): boolean;
export function assertNoMidSentenceProviderSwitch(segments: Array<{ sentenceId?: string; providerId?: string }>): true;
export function summarizeVoicePathEvents(events: VoicePathEvents | VoicePathEvent[]): {
  providerId: string | null;
  firstAudioMs: number | null;
  fallbackCount: number;
  fallbackReasons: string[];
  interruptionCount: number;
  failureCodes: string[];
  eventCount: number;
};
export function createTelemetrySink(options?: { onReport?: (report: ReturnType<typeof summarizeVoicePathEvents>, events: VoicePathEvent[]) => void }): {
  push(event: VoicePathEvent): void;
  events(): VoicePathEvent[];
  report(): ReturnType<typeof summarizeVoicePathEvents>;
};
export function eventFixture(events: VoicePathEvents | VoicePathEvent[]): Array<{ type: string; payload: Record<string, unknown> }>;
