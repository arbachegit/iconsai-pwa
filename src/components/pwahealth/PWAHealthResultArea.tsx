/**
 * ============================================================
 * PWAHealthResultArea.tsx - Área de exibição de mensagens do PWA Health
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-19
 *
 * Descrição: Área scrollável que exibe o histórico de conversas.
 * Igual ao PWA City mas com cores verdes e texto de saúde.
 * ============================================================
 */

import React, { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { ChatMessage, MessageRole } from "../pwacity/ChatMessage";
import { HeartPulse } from "lucide-react";

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

export const PWAHealthResultArea: React.FC<ResultAreaProps> = ({
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
      className="h-full overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 80% 50%, rgba(34, 197, 94, 0.03) 0%, transparent 50%)
        `,
      }}
    >
      {/* Estado vazio */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 flex items-center justify-center">
            <HeartPulse className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              PWA Health - Gestão de Saúde
            </h3>
            <p className="text-sm text-slate-400 max-w-xs">
              Compare o IDH da sua cidade com municípios do mesmo porte. Consulte doenças, hospitais e ações para melhorar a saúde pública.
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

export default PWAHealthResultArea;
