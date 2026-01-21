/**
 * ============================================================
 * PWAHealthContainer.tsx - Container principal do PWA Health
 * ============================================================
 * Versão: 2.0.0
 * Data: 2026-01-19
 *
 * Descrição: Container raiz do PWA Health que gerencia o estado
 * do chat e integração com pwahealth-agent (microserviço).
 * Fallback chain: Perplexity → Gemini → OpenAI
 * Interface de texto igual ao PWA City.
 * ============================================================
 */

import React, { useState, useCallback, useEffect } from "react";
import { PWAHealthHeader } from "./PWAHealthHeader";
import { PWAHealthResultArea, Message } from "./PWAHealthResultArea";
import { PromptArea } from "./PWAHealthPromptArea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Generate UUID using browser's crypto API
const generateUUID = () => crypto.randomUUID();

interface PWAHealthContainerProps {
  /** Nome do usuário logado */
  userName?: string | null;
  /** ID da sessão */
  sessionId?: string | null;
  /** Telefone do usuário */
  userPhone?: string | null;
  /** Callback para logout */
  onLogout?: () => void;
}

export const PWAHealthContainer: React.FC<PWAHealthContainerProps> = ({
  userName,
  sessionId,
  userPhone,
  onLogout,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debug: Log quando componente monta/desmonta
  useEffect(() => {
    console.log("[PWA Health] 🟢 Componente MONTADO");
    return () => {
      console.log("[PWA Health] 🔴 Componente DESMONTADO");
    };
  }, []);

  /**
   * Enviar mensagem para o pwahealth-agent (microserviço com fallback)
   * Fallback chain: Perplexity → Gemini → OpenAI
   */
  const handleSendMessage = useCallback(
    async (content: string) => {
      console.log("[PWA Health] === INÍCIO handleSendMessage ===");
      console.log("[PWA Health] Content:", content);

      // Adicionar mensagem do usuário
      const userMessage: Message = {
        id: generateUUID(),
        content,
        role: "user",
        timestamp: new Date(),
      };

      console.log("[PWA Health] Adicionando mensagem do usuário");
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        console.log("[PWA Health] Chamando pwahealth-agent...");

        // Chamar Edge Function pwahealth-agent (com fallback automático)
        const { data: apiResponse, error: apiError } = await supabase.functions.invoke(
          "pwahealth-agent",
          {
            body: {
              prompt: content,
              sessionId,
              userPhone,
            },
          }
        );

        console.log("[PWA Health] Resposta da API:", { apiResponse, apiError });

        if (apiError) {
          console.error("[PWA Health] API Error:", apiError);
          throw new Error(apiError.message || "Erro ao processar resposta");
        }

        if (!apiResponse || !apiResponse.response) {
          console.error("[PWA Health] Resposta inválida:", apiResponse);
          throw new Error("Resposta vazia da API");
        }

        const apiProvider = apiResponse.provider || "agent";

        console.log("[PWA Health] ✅ Resposta recebida de:", apiProvider);
        if (apiResponse.fallbackUsed) {
          console.log("[PWA Health] Fallback utilizado:", apiResponse.fallbackReason);
        }

        // Adicionar resposta da IA
        const assistantMessage: Message = {
          id: generateUUID(),
          content: apiResponse.response,
          role: "assistant",
          timestamp: new Date(),
          apiProvider,
        };

        console.log("[PWA Health] Adicionando resposta do assistente");
        setMessages((prev) => [...prev, assistantMessage]);

      } catch (error) {
        console.error("[PWA Health] ❌ Erro ao enviar mensagem:", error);

        const errorMessage: Message = {
          id: generateUUID(),
          content: error instanceof Error ? error.message : "Erro ao processar sua mensagem. Tente novamente.",
          role: "error",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
        toast.error("Erro ao enviar mensagem");
      } finally {
        console.log("[PWA Health] === FIM handleSendMessage ===");
        setIsLoading(false);
      }
    },
    [sessionId, userPhone]
  );

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <PWAHealthHeader
        userName={userName}
        onLogout={onLogout}
      />

      {/* Área de mensagens - flex-1 com scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <PWAHealthResultArea messages={messages} isLoading={isLoading} />
      </div>

      {/* Área de input - fixa no fundo */}
      <PromptArea
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder="Pergunte sobre saúde..."
      />
    </div>
  );
};

export default PWAHealthContainer;
