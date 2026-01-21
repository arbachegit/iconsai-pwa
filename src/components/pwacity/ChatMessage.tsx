/**
 * ============================================================
 * ChatMessage.tsx - Componente de mensagem do chat PWA City
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-17
 *
 * Descrição: Exibe mensagens do usuário e da IA no chat.
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { User, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export type MessageRole = "user" | "assistant" | "error" | "loading";

interface ChatMessageProps {
  /** Conteúdo da mensagem */
  content: string;
  /** Papel do remetente */
  role: MessageRole;
  /** Timestamp da mensagem */
  timestamp?: Date;
  /** Provider da API (openai, gemini) */
  apiProvider?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  content,
  role,
  timestamp,
  apiProvider,
}) => {
  const isUser = role === "user";
  const isError = role === "error";
  const isLoading = role === "loading";

  // Configuração visual por role
  const config = {
    user: {
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
      textColor: "text-white",
      icon: User,
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/20",
    },
    assistant: {
      bgColor: "bg-slate-800/50",
      borderColor: "border-slate-700/50",
      textColor: "text-slate-200",
      icon: Sparkles,
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/20",
    },
    error: {
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      textColor: "text-red-300",
      icon: AlertCircle,
      iconColor: "text-red-400",
      iconBg: "bg-red-500/20",
    },
    loading: {
      bgColor: "bg-slate-800/50",
      borderColor: "border-slate-700/50",
      textColor: "text-slate-400",
      icon: Loader2,
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/20",
    },
  };

  const settings = config[role];
  const IconComponent = settings.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 p-4 rounded-xl border ${settings.bgColor} ${settings.borderColor} ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Ícone do remetente */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg ${settings.iconBg} flex items-center justify-center`}
      >
        <IconComponent
          className={`w-4 h-4 ${settings.iconColor} ${isLoading ? "animate-spin" : ""}`}
        />
      </div>

      {/* Conteúdo da mensagem */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Texto da mensagem */}
        <div className={`text-sm ${settings.textColor} break-words`}>
          {isLoading ? (
            <span className="italic">Gerando resposta...</span>
          ) : role === "assistant" ? (
            <ReactMarkdown
              className="prose prose-sm prose-invert max-w-none"
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                code: ({ children }) => (
                  <code className="bg-slate-900/50 px-1 py-0.5 rounded text-cyan-400">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-slate-900/50 p-2 rounded-lg overflow-x-auto mb-2">
                    {children}
                  </pre>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            content
          )}
        </div>

        {/* Metadados (timestamp, provider) */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {timestamp && (
            <span>
              {timestamp.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {apiProvider && !isUser && (
            <>
              <span>•</span>
              <span className="capitalize">{apiProvider}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;
