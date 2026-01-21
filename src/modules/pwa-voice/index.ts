/**
 * ============================================================
 * PWA Voice Module - Exportações
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 * ============================================================
 */

// Config
export {
  VOICE_MODULE_CONFIG,
  VOICE_THEME,
  VOICE_TEXTS,
  SPECTRUM_CONFIG,
  AUDIO_RECORDING_CONFIG,
  TTS_CONFIG,
} from "./config";

// Services
export {
  transcribeAudio,
  VoiceToTextError,
} from "./services/voiceToText";
export type {
  VoiceToTextResponse,
  VoiceToTextParams,
} from "./services/voiceToText";

export {
  synthesizeSpeech,
  revokeAudioUrl,
  TextToSpeechError,
} from "./services/textToSpeech";
export type {
  TextToSpeechResponse,
  TextToSpeechParams,
} from "./services/textToSpeech";

// Components
export {
  VoiceSpectrum,
  MicrophoneButton,
  VoicePlayButton,
} from "./components";
