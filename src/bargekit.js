export function createBargeKitHooks(voicepath, { duckLevel = 0.25 } = {}) {
  return {
    onUserSpeechStart(metadata = {}) {
      const ducked = voicepath.duck?.(duckLevel, metadata.reason ?? 'bargekit_user_speech_start');
      const interrupted = metadata.interrupt === false ? { interrupted: false } : voicepath.interrupt?.(metadata.reason ?? 'bargekit_user_speech_start');
      return { ducked, interrupted };
    },
    onUserSpeechEnd(metadata = {}) {
      return voicepath.resume?.(metadata.reason ?? 'bargekit_user_speech_end');
    },
    interrupt(reason = 'bargekit_interrupt') {
      return voicepath.interrupt?.(reason);
    },
    duck(level = duckLevel, reason = 'bargekit_duck') {
      return voicepath.duck?.(level, reason);
    },
    resume(reason = 'bargekit_resume') {
      return voicepath.resume?.(reason);
    }
  };
}
