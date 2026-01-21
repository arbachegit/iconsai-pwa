/**
 * ============================================================
 * types/pwa-history.ts - Tipos do Historico PWA
 * ============================================================
 * Versao: 1.0.0 - 2026-01-08
 * PRD: Histo_rico_objeto.zip
 * ============================================================
 */

// Tipos de modulo disponiveis
export type ModuleType = "world" | "health" | "ideas" | "help";

// Tipos de mensagem
export type MessageRole = "user" | "assistant" | "summary";

// Cores das mensagens
export const MESSAGE_COLORS: Record<MessageRole, string> = {
  user: "bg-white",
  assistant: "bg-emerald-100",
  summary: "bg-pink-100",
};

// Cores do texto
export const MESSAGE_TEXT_COLORS: Record<MessageRole, string> = {
  user: "text-gray-900",
  assistant: "text-gray-900",
  summary: "text-gray-900",
};

// Icones das mensagens
export const MESSAGE_ICONS: Record<MessageRole, string> = {
  user: "user",
  assistant: "bot",
  summary: "clipboard",
};

// Labels das mensagens
export const MESSAGE_LABELS: Record<MessageRole, string | null> = {
  user: null,
  assistant: null,
  summary: "RESUMO",
};

// Interface de uma mensagem do historico
export interface HistoryMessage {
  id: string;
  role: MessageRole;
  content: string;
  transcription?: string;
  audioUrl?: string;
  audioDuration?: number;
  timestamp: Date;
  sessionId?: string;
  city?: string;
}

// Interface de uma conversa/sessao
export interface Conversation {
  id: string;
  deviceId: string;
  moduleType: ModuleType;
  sessionId: string;
  startedAt: Date;
  endedAt?: Date;
  city?: string;
  messages: HistoryMessage[];
}

// Interface do resumo
export interface Summary {
  id: string;
  conversationId: string;
  deviceId: string;
  moduleType: ModuleType;
  sessionId: string;
  summaryText: string;
  summaryAudioUrl?: string;
  summaryAudioDuration?: number;
  keyTopics: string[];
  userInterests: string[];
  createdAt: Date;
}

// Props do componente MessageCard
export interface MessageCardProps {
  message: HistoryMessage;
  onShare: (message: HistoryMessage) => void;
  onTranscribe: (message: HistoryMessage) => void;
  onPlay: (message: HistoryMessage) => void;
  onDownload: (message: HistoryMessage) => void;
}

// Props do componente HistoryScreen
export interface HistoryScreenProps {
  moduleType: ModuleType;
  deviceId: string;
  onBack: () => void;
}

// Agrupamento por data
export interface MessagesByDate {
  [date: string]: HistoryMessage[];
}

// Estado do store de historico
export interface HistoryState {
  deviceId: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  messages: {
    world: HistoryMessage[];
    health: HistoryMessage[];
    ideas: HistoryMessage[];
    help: HistoryMessage[];
  };

  // Acoes
  initialize: (deviceId: string) => Promise<void>;
  loadMessages: (moduleType: ModuleType) => Promise<void>;
  addMessage: (moduleType: ModuleType, message: Omit<HistoryMessage, "id" | "timestamp">) => void;
  clearModule: (moduleType: ModuleType) => void;
  reset: () => void;
}

// Configuracao de cores por modulo
export const MODULE_COLORS: Record<ModuleType, { primary: string; bg: string }> = {
  world: { primary: "#10B981", bg: "bg-emerald-500" },
  health: { primary: "#F43F5E", bg: "bg-rose-500" },
  ideas: { primary: "#F59E0B", bg: "bg-amber-500" },
  help: { primary: "#3B82F6", bg: "bg-blue-500" },
};

// Nomes dos modulos
export const MODULE_NAMES: Record<ModuleType, string> = {
  world: "Mundo",
  health: "Saude",
  ideas: "Ideias",
  help: "Ajuda",
};
