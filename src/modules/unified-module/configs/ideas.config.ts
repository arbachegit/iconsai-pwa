/**
 * ============================================================
 * Unified Module - Ideas Configuration
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 * ============================================================
 */

import { Lightbulb } from "lucide-react";
import type { ModuleConfig, ThemeConfig } from "@/core/types";

export const IDEAS_THEME: ThemeConfig = {
  primaryColor: "#F59E0B", // amber-500
  secondaryColor: "#FBBF24", // amber-400
  bgColor: "bg-slate-950",
  borderColor: "border-amber-500/20",
  textColor: "text-white",
};

export const IDEAS_CONFIG: ModuleConfig = {
  id: "ideas",
  name: "Ideias",
  icon: Lightbulb,
  theme: IDEAS_THEME,
  welcomeText: "Olá! Sou seu consultor de ideias. O que você está planejando?",
  placeholder: "Compartilhe suas ideias...",
  endpoint: "chat-router",
};

export const IDEAS_TEXTS = {
  welcomeKey: "ideasWelcomeText",
  agentSlug: "ideas",
} as const;
