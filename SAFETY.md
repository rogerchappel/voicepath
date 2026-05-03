# Safety and Privacy

voicepath is local-first by default. It never calls cloud speech providers unless the application explicitly configures a provider with credentials and places that provider in policy.

## Safe defaults

- Local/device fallback is preferred when cloud providers are unavailable.
- Provider credentials are accepted from the host application; voicepath does not manage or persist secrets.
- Event payloads redact secret-shaped fields such as API keys, tokens, passwords, and authorization headers.
- The core package does not upload generated audio, transcripts, or telemetry.
- Voice cloning and impersonation are outside the default scope.

## Operator checklist

1. Make cloud providers opt-in in your UI.
2. Show when fallback occurred and which provider is speaking.
3. Avoid sending private text to remote TTS unless the user has chosen that provider.
4. Keep interruption/barge-in controls visible in voice-first experiences.
5. Do not use voicepath to bypass provider quotas, rate limits, or consent requirements.
