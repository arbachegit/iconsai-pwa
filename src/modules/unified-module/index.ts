/**
 * ============================================================
 * Unified Module - Exportações
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 * ============================================================
 */

// Main component
export { UnifiedModule } from "./UnifiedModule";

// Configs
export {
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
} from "./configs";

// Services
export {
  sendToChatRouter,
  ChatRouterError,
} from "./services/chatRouter";
export type {
  ChatRouterResponse,
  ChatRouterParams,
} from "./services/chatRouter";

export {
  getContextualGreeting,
} from "./services/contextualMemory";
export type {
  ContextualGreetingResponse,
  ContextualGreetingParams,
} from "./services/contextualMemory";
