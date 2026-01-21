/**
 * ============================================================
 * Unified Module - World Configuration
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 * ============================================================
 */

import { Globe } from "lucide-react";
import type { ModuleConfig, ThemeConfig } from "@/core/types";

export const WORLD_THEME: ThemeConfig = {
  primaryColor: "#10B981", // emerald-500
  secondaryColor: "#34D399", // emerald-400
  bgColor: "bg-slate-950",
  borderColor: "border-emerald-500/20",
  textColor: "text-white",
};

export const WORLD_CONFIG: ModuleConfig = {
  id: "world",
  name: "Mundo",
  icon: Globe,
  theme: WORLD_THEME,
  welcomeText: "Olá! Sou seu analista de economia. O que gostaria de saber?",
  placeholder: "Pergunte sobre economia...",
  endpoint: "chat-router",
};

export const WORLD_TEXTS = {
  welcomeKey: "worldWelcomeText",
  agentSlug: "world",
} as const;
