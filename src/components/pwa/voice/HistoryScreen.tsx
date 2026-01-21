/**
 * ============================================================
 * HistoryScreen.tsx - Tela de Histórico de Conversas v2.0
 * ============================================================
 * Com loading states, refresh e sincronização do banco
 * ============================================================
 */

import React, { useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trash2, MessageSquare, RefreshCw, Loader2 } from "lucide-react";
import { AudioMessageCard } from "./AudioMessageCard";
import { useHistoryStore } from "@/stores/historyStore";
import type { ModuleType, AudioMessage } from "@/components/pwa/types";

// Configuração de cores por módulo
const MODULE_COLORS: Record<ModuleType, string> = {
  home: "hsl(var(--foreground))",
  help: "hsl(217, 91%, 60%)",
  world: "hsl(160, 84%, 39%)",
  health: "hsl(350, 89%, 60%)",
  ideas: "hsl(38, 92%, 50%)",
};

const MODULE_NAMES: Record<ModuleType, string> = {
  home: "Home",
  help: "Ajuda",
  world: "Mundo",
  health: "Saúde",
  ideas: "Ideias",
};

interface HistoryScreenProps {
  onBack: () => void;
  filterModule?: ModuleType;
  deviceId?: string;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onBack,
  filterModule,
  deviceId,
}) => {
  const { 
    getAllMessages, 
    getMessages, 
    clearHistory, 
    updateTranscription,
    userInitials,
    isLoading,
    isInitialized,
    initialize,
    refreshHistory,
  } = useHistoryStore();

  // Inicializar store com deviceId se fornecido
  useEffect(() => {
    if (deviceId && !isInitialized) {
      initialize(deviceId);
    }
  }, [deviceId, isInitialized, initialize]);

  // Obter mensagens (todas ou filtradas)
  const messages = useMemo(() => {
    if (filterModule) {
      return getMessages(filterModule);
    }
    return getAllMessages();
  }, [filterModule, getAllMessages, getMessages, isInitialized]);

  // Agrupar mensagens por data
  const groupedMessages = useMemo(() => {
    const groups: Record<string, AudioMessage[]> = {};
    
    messages.forEach((msg) => {
      const date = new Date(msg.timestamp).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(msg);
    });
    
    return groups;
  }, [messages]);

  // Handler para limpar histórico
  const handleClearHistory = () => {
    if (confirm("Tem certeza que deseja limpar o histórico?")) {
      clearHistory(filterModule);
    }
  };

  // Handler para refresh
  const handleRefresh = async () => {
    await refreshHistory();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute inset-0 bg-background z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        {/* Botão Voltar */}
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        {/* Título */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">
            Histórico
          </h1>
          {filterModule && (
            <span
              className="px-2 py-0.5 text-xs rounded-full font-medium"
              style={{
                backgroundColor: `${MODULE_COLORS[filterModule]}20`,
                color: MODULE_COLORS[filterModule],
              }}
            >
              {MODULE_NAMES[filterModule]}
            </span>
          )}
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-2">
          {/* Botão Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Botão Limpar */}
          <button
            onClick={handleClearHistory}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-destructive"
            disabled={messages.length === 0 || isLoading}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      <AnimatePresence mode="wait">
        {isLoading && !isInitialized ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center"
          >
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto px-4 py-4"
          >
            {/* Lista de mensagens */}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">
                  Nenhuma conversa ainda
                </p>
                <p className="text-sm text-muted-foreground">
                  Suas mensagens de voz aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date}>
                    {/* Data */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground capitalize">
                        {date}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Mensagens do dia */}
                    <div className="space-y-4">
                      {msgs.map((message) => (
                        <AudioMessageCard
                          key={message.id}
                          message={message}
                          userInitials={userInitials}
                          onTranscriptionUpdate={updateTranscription}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default HistoryScreen;
