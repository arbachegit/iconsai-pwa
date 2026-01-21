/**
 * ============================================================
 * PWA Voice Module - Configuração
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Configuração específica do módulo PWA Voice.
 * Cores, textos, endpoints e constantes.
 * ============================================================
 */

import { Mic, Volume2 } from "lucide-react";
import type { ModuleConfig, ThemeConfig, SpectrumConfig } from "@/core/types";

/**
 * Tema padrão do módulo PWA Voice (cores azuis)
 */
export const VOICE_THEME: ThemeConfig = {
  primaryColor: "#3B82F6", // blue-500
  secondaryColor: "#8B5CF6", // violet-500
  bgColor: "bg-slate-950",
  borderColor: "border-blue-500/20",
  textColor: "text-white",
};

/**
 * Configuração completa do módulo Voice
 */
export const VOICE_MODULE_CONFIG: ModuleConfig = {
  id: "pwa-voice",
  name: "PWA Voice",
  icon: Mic,
  theme: VOICE_THEME,
  welcomeText: "Olá! Estou pronta para ajudar. Como posso auxiliar você hoje?",
  placeholder: "Toque para falar...",
  endpoint: "voice-to-text",
};

/**
 * Configuração do visualizador de espectro
 */
export const SPECTRUM_CONFIG: SpectrumConfig = {
  barCount: 32,
  barGap: 2,
  minHeight: 4,
  maxHeight: 120,
  primaryColor: VOICE_THEME.primaryColor,
  secondaryColor: VOICE_THEME.secondaryColor,
};

/**
 * Textos e labels do módulo
 */
export const VOICE_TEXTS = {
  title: "Assistente de Voz",
  tapToSpeak: "Toque para falar",
  listening: "Ouvindo...",
  processing: "Processando...",
  playing: "Reproduzindo...",
  idle: "Pronto",
  error: "Erro ao processar áudio",
  permissionDenied: "Permissão de microfone negada",
  noMicFound: "Microfone não encontrado",
  recordingTooShort: "Gravação muito curta",
  retryLabel: "Tentar novamente",
} as const;

/**
 * Configuração de gravação de áudio
 */
export const AUDIO_RECORDING_CONFIG = {
  /** Duração mínima em segundos */
  minDuration: 0.5,
  /** Duração máxima em segundos */
  maxDuration: 60,
  /** Intervalo de coleta de chunks (ms) */
  timesliceMs: 500,
  /** Intervalo para iOS/Safari (ms) */
  timesliceIosMs: 1000,
  /** Taxa de bits */
  audioBitsPerSecond: 128000,
} as const;

/**
 * Configuração de TTS
 */
export const TTS_CONFIG = {
  /** Voz padrão */
  defaultVoice: "fernando",
  /** Velocidade padrão */
  defaultRate: 1.0,
  /** Volume padrão */
  defaultVolume: 1.0,
} as const;
