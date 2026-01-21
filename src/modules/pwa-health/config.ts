/**
 * ============================================================
 * PWA Health Module - Configuração
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Configuração específica do módulo PWA Health.
 * Cores, textos, endpoints e constantes.
 * ============================================================
 */

import { HeartPulse } from "lucide-react";
import type { ModuleConfig, ThemeConfig } from "@/core/types";

/**
 * Tema do módulo PWA Health (cores verdes/emerald)
 */
export const HEALTH_THEME: ThemeConfig = {
  primaryColor: "#10B981", // emerald-500
  secondaryColor: "#22C55E", // green-500
  bgColor: "bg-slate-950",
  borderColor: "border-emerald-500/20",
  textColor: "text-white",
};

/**
 * Configuração completa do módulo
 */
export const HEALTH_MODULE_CONFIG: ModuleConfig = {
  id: "pwa-health",
  name: "PWA Health",
  icon: HeartPulse,
  theme: HEALTH_THEME,
  welcomeText: "Compare o IDH da sua cidade com municípios do mesmo porte. Consulte doenças, hospitais e ações para melhorar a saúde pública.",
  placeholder: "Pergunte sobre saúde...",
  endpoint: "pwahealth-agent",
};

/**
 * Textos e labels do módulo
 */
export const HEALTH_TEXTS = {
  title: "PWA Health",
  subtitle: "Gestão de Saúde",
  emptyStateTitle: "PWA Health - Gestão de Saúde",
  emptyStateDescription: "Compare o IDH da sua cidade com municípios do mesmo porte. Consulte doenças, hospitais e ações para melhorar a saúde pública.",
  loadingText: "Gerando resposta...",
  errorGeneric: "Erro ao processar sua mensagem. Tente novamente.",
  errorEmpty: "Resposta vazia da API",
  placeholder: "Pergunte sobre saúde...",
  logoutLabel: "Sair",
} as const;

/**
 * Configuração de fallback chain
 */
export const HEALTH_FALLBACK_CONFIG = {
  providers: ["perplexity", "gemini", "openai"],
  timeout: 30000, // 30 segundos
} as const;
