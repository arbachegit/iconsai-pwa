/**
 * ============================================================
 * Core Types - Tipos compartilhados entre todos os módulos
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * REGRAS:
 * - NUNCA depende de módulos específicos
 * - Apenas tipos genéricos reutilizáveis
 * - Zero lógica de negócio
 * ============================================================
 */

import { LucideIcon } from "lucide-react";

/**
 * Role do remetente de uma mensagem
 */
export type MessageRole = "user" | "assistant" | "error" | "loading" | "system";

/**
 * Mensagem genérica do chat
 */
export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: Date;
  metadata?: MessageMetadata;
}

/**
 * Metadados opcionais da mensagem
 */
export interface MessageMetadata {
  apiProvider?: string;
  model?: string;
  audioUrl?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Configuração de tema para componentes
 */
export interface ThemeConfig {
  primaryColor: string;
  secondaryColor?: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

/**
 * Configuração de módulo (cores, textos, endpoints)
 */
export interface ModuleConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  theme: ThemeConfig;
  welcomeText?: string;
  placeholder?: string;
  endpoint?: string;
}

/**
 * Props base para componentes de Header
 */
export interface HeaderProps {
  title: string;
  subtitle?: string | null;
  icon?: LucideIcon;
  theme?: ThemeConfig;
  onBack?: () => void;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  actionLabel?: string;
  className?: string;
}

/**
 * Props base para componentes de Input
 */
export interface InputAreaProps {
  onSubmit: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  theme?: ThemeConfig;
  maxLength?: number;
  className?: string;
}

/**
 * Props base para lista de mensagens
 */
export interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  loadingText?: string;
  emptyState?: React.ReactNode;
  theme?: ThemeConfig;
  className?: string;
  onMessageAction?: (message: Message, action: string) => void;
}

/**
 * Props base para container de chat
 */
export interface ChatContainerProps {
  header?: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  theme?: ThemeConfig;
}

/**
 * Estado do microfone/gravação
 */
export type VoiceState = "idle" | "listening" | "processing" | "playing" | "error";

/**
 * Resultado de captura de voz
 */
export interface VoiceCaptureResult {
  audioBlob: Blob;
  audioBase64: string;
  duration: number;
  mimeType: string;
}

/**
 * Props para componentes de voz
 */
export interface VoiceButtonProps {
  state: VoiceState;
  onStartCapture: () => void;
  onStopCapture: () => void;
  disabled?: boolean;
  theme?: ThemeConfig;
  className?: string;
}

/**
 * Configuração de visualizador de espectro
 */
export interface SpectrumConfig {
  barCount?: number;
  barGap?: number;
  minHeight?: number;
  maxHeight?: number;
  primaryColor?: string;
  secondaryColor?: string;
}
