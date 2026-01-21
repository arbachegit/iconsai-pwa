/**
 * ============================================================
 * Unified Module - Health (Voice) Configuration
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * NOTA: Este é o módulo "health" dentro da interface de voz,
 * diferente do PWA Health (chat de texto).
 * ============================================================
 */

import { Heart } from "lucide-react";
import type { ModuleConfig, ThemeConfig } from "@/core/types";

export const HEALTH_VOICE_THEME: ThemeConfig = {
  primaryColor: "#F43F5E", // rose-500
  secondaryColor: "#FB7185", // rose-400
  bgColor: "bg-slate-950",
  borderColor: "border-rose-500/20",
  textColor: "text-white",
};

export const HEALTH_VOICE_CONFIG: ModuleConfig = {
  id: "health",
  name: "Saúde",
  icon: Heart,
  theme: HEALTH_VOICE_THEME,
  welcomeText: "Olá! Sou sua assistente de saúde. Como posso ajudar?",
  placeholder: "Pergunte sobre saúde...",
  endpoint: "chat-router",
};

export const HEALTH_VOICE_TEXTS = {
  welcomeKey: "healthWelcomeText",
  agentSlug: "health",
} as const;
