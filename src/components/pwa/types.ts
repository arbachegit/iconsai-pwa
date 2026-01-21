/**
 * ============================================================
 * types.ts - Tipos Compartilhados do PWA
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-04
 * ============================================================
 */

import type { LucideIcon } from "lucide-react";

// Tipos de módulo disponíveis no PWA
export type ModuleType = "home" | "help" | "world" | "health" | "ideas";

// Configuração visual de um módulo
export interface ModuleConfig {
  id: ModuleType;
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description?: string;
}

// Estado do player de áudio
export type PlayerState = "idle" | "loading" | "playing" | "paused" | "recording";

// Mensagem de áudio no histórico
export interface AudioMessage {
  id: string;
  role: "user" | "assistant";
  audioUrl: string;
  title: string;
  duration: number;
  timestamp: Date;
  moduleType: ModuleType;
  transcription?: string;
  isTranscribing?: boolean;
}

// Configuração do usuário
export interface UserConfig {
  initials: string;
  name?: string;
  avatarUrl?: string;
}
