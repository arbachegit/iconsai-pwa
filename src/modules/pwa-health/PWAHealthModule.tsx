/**
 * ============================================================
 * PWA Health Module - Ponto de entrada único
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Módulo de saúde utilizando os primitivos core.
 * Totalmente isolado - não importa de outros módulos.
 * ============================================================
 */

import React, { useCallback, useEffect } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

// Core primitives
import {
  ChatContainer,
  Header,
  MessageList,
  InputArea,
  EmptyState,
  useMessages,
} from "@/core";

// Module-specific
import { HEALTH_MODULE_CONFIG, HEALTH_THEME, HEALTH_TEXTS } from "./config";
import { sendToHealthAgent, HealthAgentError } from "./services/healthAgent";

interface PWAHealthModuleProps {
  /** Nome do usuário logado */
  userName?: string | null;
  /** ID da sessão */
  sessionId?: string | null;
  /** Telefone do usuário */
  userPhone?: string | null;
  /** Callback para logout */
  onLogout?: () => void;
}

export const PWAHealthModule: React.FC<PWAHealthModuleProps> = ({
  userName,
  sessionId,
  userPhone,
  onLogout,
}) => {
  const {
    messages,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
  } = useMessages();

  const [isLoading, setIsLoading] = React.useState(false);

  // Debug: Log quando componente monta/desmonta
  useEffect(() => {
    console.log("[PWAHealthModule] 🟢 Componente MONTADO");
    return () => {
      console.log("[PWAHealthModule] 🔴 Componente DESMONTADO");
    };
  }, []);

  /**
   * Handler para envio de mensagem
   */
  const handleSendMessage = useCallback(
    async (content: string) => {
      console.log("[PWAHealthModule] === INÍCIO handleSendMessage ===");
      console.log("[PWAHealthModule] Content:", content);

      // Adicionar mensagem do usuário
      addUserMessage(content);
      setIsLoading(true);

      try {
        // Chamar o health agent
        const response = await sendToHealthAgent({
          prompt: content,
          sessionId,
          userPhone,
        });

        // Adicionar resposta do assistente
        addAssistantMessage(response.response, {
          apiProvider: response.provider,
        });
      } catch (error) {
        console.error("[PWAHealthModule] ❌ Erro:", error);

        const errorMessage =
          error instanceof HealthAgentError
            ? error.message
            : HEALTH_TEXTS.errorGeneric;

        addErrorMessage(errorMessage);
        toast.error("Erro ao enviar mensagem");
      } finally {
        console.log("[PWAHealthModule] === FIM handleSendMessage ===");
        setIsLoading(false);
      }
    },
    [sessionId, userPhone, addUserMessage, addAssistantMessage, addErrorMessage]
  );

  // Converter mensagens para o formato esperado pelo MessageList
  const formattedMessages = messages.map((msg) => ({
    ...msg,
    metadata: msg.metadata,
  }));

  return (
    <ChatContainer
      theme={HEALTH_THEME}
      header={
        <Header
          title={HEALTH_TEXTS.title}
          subtitle={userName}
          icon={HEALTH_MODULE_CONFIG.icon}
          theme={HEALTH_THEME}
          onAction={onLogout}
          actionIcon={onLogout ? LogOut : undefined}
          actionLabel={HEALTH_TEXTS.logoutLabel}
        />
      }
      body={
        <MessageList
          messages={formattedMessages}
          isLoading={isLoading}
          loadingText={HEALTH_TEXTS.loadingText}
          theme={HEALTH_THEME}
          emptyState={
            <EmptyState
              icon={HEALTH_MODULE_CONFIG.icon}
              title={HEALTH_TEXTS.emptyStateTitle}
              description={HEALTH_TEXTS.emptyStateDescription}
              theme={HEALTH_THEME}
            />
          }
        />
      }
      footer={
        <InputArea
          onSubmit={handleSendMessage}
          isLoading={isLoading}
          placeholder={HEALTH_TEXTS.placeholder}
          theme={HEALTH_THEME}
        />
      }
    />
  );
};

export default PWAHealthModule;
