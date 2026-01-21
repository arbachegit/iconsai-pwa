/**
 * ============================================================
 * Modules - Exportação centralizada dos módulos
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Ponto de entrada para todos os módulos da aplicação.
 * Cada módulo é independente e isolado.
 * ============================================================
 */

// PWA Health Module (Chat de texto para saúde)
export { PWAHealthModule, HEALTH_MODULE_CONFIG, HEALTH_THEME, HEALTH_TEXTS } from "./pwa-health";
export type { HealthAgentResponse, HealthAgentParams } from "./pwa-health";

// PWA Voice Module (Componentes de voz)
export {
  VOICE_MODULE_CONFIG,
  VOICE_THEME,
  VOICE_TEXTS,
  SPECTRUM_CONFIG,
  AUDIO_RECORDING_CONFIG,
  TTS_CONFIG,
  VoiceSpectrum,
  MicrophoneButton,
  VoicePlayButton,
  transcribeAudio,
  synthesizeSpeech,
  revokeAudioUrl,
  VoiceToTextError,
  TextToSpeechError,
} from "./pwa-voice";
export type {
  VoiceToTextResponse,
  VoiceToTextParams,
  TextToSpeechResponse,
  TextToSpeechParams,
} from "./pwa-voice";

// Unified Module (help/world/health/ideas com interface de voz)
export {
  UnifiedModule,
  type UnifiedModuleType,
  MODULE_CONFIGS,
  MODULE_TEXTS,
  getModuleConfig,
  getModuleTexts,
  HELP_CONFIG,
  HELP_THEME,
  HELP_TEXTS,
  WORLD_CONFIG,
  WORLD_THEME,
  WORLD_TEXTS,
  HEALTH_VOICE_CONFIG,
  HEALTH_VOICE_THEME,
  HEALTH_VOICE_TEXTS,
  IDEAS_CONFIG,
  IDEAS_THEME,
  IDEAS_TEXTS,
  sendToChatRouter,
  ChatRouterError,
  getContextualGreeting,
} from "./unified-module";
export type {
  ChatRouterResponse,
  ChatRouterParams,
  ContextualGreetingResponse,
  ContextualGreetingParams,
} from "./unified-module";
