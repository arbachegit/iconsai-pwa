/**
 * ============================================================
 * PWA Health Module - Exportações
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 * ============================================================
 */

export { PWAHealthModule } from "./PWAHealthModule";
export { HEALTH_MODULE_CONFIG, HEALTH_THEME, HEALTH_TEXTS } from "./config";
export { sendToHealthAgent, HealthAgentError } from "./services/healthAgent";
export type { HealthAgentResponse, HealthAgentParams } from "./services/healthAgent";
