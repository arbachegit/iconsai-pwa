/**
 * ============================================================
 * ResultArea.tsx - Área de exibição de mensagens do PWA City
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-17
 *
 * Descrição: Área scrollável que exibe o histórico de conversas.
 * ============================================================
 */

import React, { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { ChatMessage, MessageRole } from "./ChatMessage";
import { MessageSquare } from "lucide-react";

export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: Date;
  apiProvider?: string;
}

interface ResultAreaProps {
  /** Lista de mensagens do chat */
  messages: Message[];
  /** Se está carregando uma resposta */
  isLoading?: boolean;
}

export const ResultArea: React.FC<ResultAreaProps> = ({
  messages,
  isLoading = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o final quando novas mensagens chegarem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.03) 0%, transparent 50%)
        `,
      }}
    >
      {/* Estado vazio */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Bem-vindo ao PWA City
            </h3>
            <p className="text-sm text-slate-400 max-w-xs">
              Converse com nossa IA. Digite uma mensagem abaixo para começar.
            </p>
          </div>
        </div>
      )}

      {/* Lista de mensagens */}
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            content={message.content}
            role={message.role}
            timestamp={message.timestamp}
            apiProvider={message.apiProvider}
          />
        ))}
      </AnimatePresence>

      {/* Indicador de carregamento */}
      {isLoading && (
        <ChatMessage
          content="Gerando resposta..."
          role="loading"
          timestamp={new Date()}
        />
      )}
    </div>
  );
};

export default ResultArea;
