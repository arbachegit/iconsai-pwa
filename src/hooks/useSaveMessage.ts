/**
 * ============================================================
 * useSaveMessage.ts - Hook para salvar mensagens no banco
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-15
 *
 * Garante que todas as mensagens do PWA Voz sejam persistidas
 * no banco de dados (pwa_conversation_messages)
 * ============================================================
 */

import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SaveMessageOptions {
  deviceId: string;
  moduleType: string;
  role: "user" | "assistant";
  content: string;
  transcription?: string;
  audioUrl?: string;
  audioDuration?: number;
  city?: string;
}

interface SaveMessageResult {
  success: boolean;
  messageId?: string;
  sessionId?: string;
  error?: string;
}

/**
 * Hook para salvar mensagens no banco de dados
 * Mantém a sessão de conversa para agrupar mensagens
 */
export function useSaveMessage() {
  // Armazena a sessão ativa por módulo
  const sessionIdRef = useRef<Record<string, string>>({});
  const isSavingRef = useRef(false);

  /**
   * Salva uma mensagem no banco de dados
   */
  const saveMessage = useCallback(async (options: SaveMessageOptions): Promise<SaveMessageResult> => {
    const { deviceId, moduleType, role, content, transcription, audioUrl, audioDuration, city } = options;

    // Evita salvamentos duplicados
    if (isSavingRef.current) {
      console.warn("[useSaveMessage] ⚠️ Salvamento já em andamento, ignorando...");
      return { success: false, error: "Salvamento em andamento" };
    }

    if (!deviceId || !moduleType || !content) {
      console.error("[useSaveMessage] ❌ Campos obrigatórios faltando");
      return { success: false, error: "Campos obrigatórios faltando" };
    }

    isSavingRef.current = true;

    try {
      console.log(`[useSaveMessage] 💾 Salvando mensagem ${role} no módulo ${moduleType}...`);

      const { data, error } = await supabase.functions.invoke("pwa-save-message", {
        body: {
          deviceId,
          moduleType,
          sessionId: sessionIdRef.current[moduleType] || undefined,
          role,
          content,
          transcription,
          audioUrl,
          audioDuration,
          city,
        },
      });

      if (error) {
        console.error("[useSaveMessage] ❌ Erro ao salvar:", error);
        return { success: false, error: error.message };
      }

      // Armazena a sessão para próximas mensagens
      if (data?.sessionId) {
        sessionIdRef.current[moduleType] = data.sessionId;
      }

      console.log(`[useSaveMessage] ✅ Mensagem salva: ${data?.messageId}`);

      return {
        success: true,
        messageId: data?.messageId,
        sessionId: data?.sessionId,
      };
    } catch (err) {
      console.error("[useSaveMessage] ❌ Exceção ao salvar:", err);
      return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido" };
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  /**
   * Salva múltiplas mensagens (user + assistant) de uma vez
   */
  const saveConversationTurn = useCallback(async (
    deviceId: string,
    moduleType: string,
    userMessage: string,
    assistantMessage: string,
    city?: string
  ): Promise<{ userSaved: boolean; assistantSaved: boolean }> => {
    // Salvar mensagem do usuário
    const userResult = await saveMessage({
      deviceId,
      moduleType,
      role: "user",
      content: userMessage,
      city,
    });

    // Salvar mensagem do assistente
    const assistantResult = await saveMessage({
      deviceId,
      moduleType,
      role: "assistant",
      content: assistantMessage,
      city,
    });

    return {
      userSaved: userResult.success,
      assistantSaved: assistantResult.success,
    };
  }, [saveMessage]);

  /**
   * Limpa a sessão de um módulo (para nova conversa)
   */
  const clearSession = useCallback((moduleType: string) => {
    delete sessionIdRef.current[moduleType];
    console.log(`[useSaveMessage] 🗑️ Sessão do módulo ${moduleType} limpa`);
  }, []);

  /**
   * Obtém o ID da sessão atual de um módulo
   */
  const getSessionId = useCallback((moduleType: string): string | undefined => {
    return sessionIdRef.current[moduleType];
  }, []);

  return {
    saveMessage,
    saveConversationTurn,
    clearSession,
    getSessionId,
  };
}

export default useSaveMessage;
