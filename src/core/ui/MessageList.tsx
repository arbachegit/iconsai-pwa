/**
 * ============================================================
 * Core MessageList - Lista de mensagens genérica reutilizável
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * REGRAS:
 * - NUNCA depende de módulos específicos
 * - Apenas recebe props e emite callbacks
 * - Zero lógica de negócio
 * ============================================================
 */

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sparkles, AlertCircle, Loader2, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Message, MessageListProps, ThemeConfig } from "../types";

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#3B82F6",
  bgColor: "bg-slate-950",
  borderColor: "border-slate-700/50",
  textColor: "text-white",
};

/**
 * Componente interno para renderizar uma mensagem individual
 */
const MessageItem: React.FC<{
  message: Message;
  theme: ThemeConfig;
  onAction?: (message: Message, action: string) => void;
}> = ({ message, theme, onAction }) => {
  const { content, role, timestamp, metadata } = message;
  const isUser = role === "user";
  const isError = role === "error";
  const isLoading = role === "loading";
  const isSystem = role === "system";

  const roleConfig = {
    user: {
      bgColor: `${theme.primaryColor}10`,
      borderColor: `${theme.primaryColor}20`,
      textColor: "text-white",
      icon: User,
      iconColor: theme.primaryColor,
      iconBg: `${theme.primaryColor}20`,
    },
    assistant: {
      bgColor: "rgba(51, 65, 85, 0.5)",
      borderColor: "rgba(71, 85, 105, 0.5)",
      textColor: "text-slate-200",
      icon: Sparkles,
      iconColor: "#A855F7",
      iconBg: "rgba(168, 85, 247, 0.2)",
    },
    error: {
      bgColor: "rgba(239, 68, 68, 0.1)",
      borderColor: "rgba(239, 68, 68, 0.2)",
      textColor: "text-red-300",
      icon: AlertCircle,
      iconColor: "#F87171",
      iconBg: "rgba(239, 68, 68, 0.2)",
    },
    loading: {
      bgColor: "rgba(51, 65, 85, 0.5)",
      borderColor: "rgba(71, 85, 105, 0.5)",
      textColor: "text-slate-400",
      icon: Loader2,
      iconColor: theme.primaryColor,
      iconBg: `${theme.primaryColor}20`,
    },
    system: {
      bgColor: "rgba(59, 130, 246, 0.1)",
      borderColor: "rgba(59, 130, 246, 0.2)",
      textColor: "text-blue-300",
      icon: Info,
      iconColor: "#60A5FA",
      iconBg: "rgba(59, 130, 246, 0.2)",
    },
  };

  const settings = roleConfig[role] || roleConfig.assistant;
  const IconComponent = settings.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 p-4 rounded-xl border ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
      style={{
        backgroundColor: settings.bgColor,
        borderColor: settings.borderColor,
      }}
    >
      {/* Ícone do remetente */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: settings.iconBg }}
      >
        <IconComponent
          className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
          style={{ color: settings.iconColor }}
        />
      </div>

      {/* Conteúdo da mensagem */}
      <div className="flex-1 flex flex-col gap-1">
        <div className={`text-sm ${settings.textColor} break-words`}>
          {isLoading ? (
            <span className="italic">Gerando resposta...</span>
          ) : role === "assistant" || role === "system" ? (
            <ReactMarkdown
              className="prose prose-sm prose-invert max-w-none"
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-2">{children}</ol>
                ),
                code: ({ children }) => (
                  <code
                    className="px-1 py-0.5 rounded"
                    style={{
                      backgroundColor: "rgba(15, 23, 42, 0.5)",
                      color: theme.primaryColor,
                    }}
                  >
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

        {/* Metadados */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {timestamp && (
            <span>
              {timestamp.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {metadata?.apiProvider && !isUser && (
            <>
              <span>•</span>
              <span className="capitalize">{metadata.apiProvider}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading = false,
  loadingText = "Gerando resposta...",
  emptyState,
  theme = DEFAULT_THEME,
  className = "",
  onMessageAction,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className={`h-full overflow-y-auto px-4 py-4 space-y-4 scroll-smooth ${className}`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 50%, ${theme.primaryColor}05 0%, transparent 50%),
          radial-gradient(circle at 80% 50%, ${theme.primaryColor}05 0%, transparent 50%)
        `,
      }}
    >
      {/* Estado vazio */}
      {messages.length === 0 && !isLoading && emptyState}

      {/* Lista de mensagens */}
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            theme={theme}
            onAction={onMessageAction}
          />
        ))}
      </AnimatePresence>

      {/* Indicador de carregamento */}
      {isLoading && (
        <MessageItem
          message={{
            id: "loading",
            content: loadingText,
            role: "loading",
            timestamp: new Date(),
          }}
          theme={theme}
        />
      )}
    </div>
  );
};

export default MessageList;
