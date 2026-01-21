/**
 * ============================================================
 * Unified Module - Configurations Index
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 * ============================================================
 */

import type { ModuleConfig } from "@/core/types";
import { HELP_CONFIG, HELP_THEME, HELP_TEXTS } from "./help.config";
import { WORLD_CONFIG, WORLD_THEME, WORLD_TEXTS } from "./world.config";
import { HEALTH_VOICE_CONFIG, HEALTH_VOICE_THEME, HEALTH_VOICE_TEXTS } from "./health.config";
import { IDEAS_CONFIG, IDEAS_THEME, IDEAS_TEXTS } from "./ideas.config";

export type UnifiedModuleType = "help" | "world" | "health" | "ideas";

/**
 * Mapa de configurações por tipo de módulo
 */
export const MODULE_CONFIGS: Record<UnifiedModuleType, ModuleConfig> = {
  help: HELP_CONFIG,
  world: WORLD_CONFIG,
  health: HEALTH_VOICE_CONFIG,
  ideas: IDEAS_CONFIG,
};

/**
 * Mapa de textos adicionais por tipo de módulo
 */
export const MODULE_TEXTS: Record<UnifiedModuleType, { welcomeKey: string; agentSlug: string }> = {
  help: HELP_TEXTS,
  world: WORLD_TEXTS,
  health: HEALTH_VOICE_TEXTS,
  ideas: IDEAS_TEXTS,
};

/**
 * Obtém configuração completa do módulo
 */
export function getModuleConfig(moduleType: UnifiedModuleType): ModuleConfig {
  return MODULE_CONFIGS[moduleType];
}

/**
 * Obtém textos do módulo
 */
export function getModuleTexts(moduleType: UnifiedModuleType): { welcomeKey: string; agentSlug: string } {
  return MODULE_TEXTS[moduleType];
}

// Re-export individual configs
export { HELP_CONFIG, HELP_THEME, HELP_TEXTS };
export { WORLD_CONFIG, WORLD_THEME, WORLD_TEXTS };
export { HEALTH_VOICE_CONFIG, HEALTH_VOICE_THEME, HEALTH_VOICE_TEXTS };
export { IDEAS_CONFIG, IDEAS_THEME, IDEAS_TEXTS };
