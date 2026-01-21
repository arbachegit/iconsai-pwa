/**
 * ============================================================
 * Unified Module - Help Configuration
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 * ============================================================
 */

import { HelpCircle } from "lucide-react";
import type { ModuleConfig, ThemeConfig } from "@/core/types";

export const HELP_THEME: ThemeConfig = {
  primaryColor: "#3B82F6", // blue-500
  secondaryColor: "#60A5FA", // blue-400
  bgColor: "bg-slate-950",
  borderColor: "border-blue-500/20",
  textColor: "text-white",
};

export const HELP_CONFIG: ModuleConfig = {
  id: "help",
  name: "Ajuda",
  icon: HelpCircle,
  theme: HELP_THEME,
  welcomeText: "Olá! Posso te explicar como usar cada módulo do KnowYOU. O que você precisa de ajuda?",
  placeholder: "Pergunte como usar...",
  endpoint: "chat-router",
};

export const HELP_TEXTS = {
  welcomeKey: "helpWelcomeText",
  agentSlug: "help",
} as const;
