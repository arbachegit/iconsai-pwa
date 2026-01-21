/**
 * ============================================================
 * Unified Module - Chat Router Service
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Serviço de comunicação com o chat-router (microserviço).
 * Utilizado pelos módulos help, world, health e ideas.
 * ============================================================
 */

import { supabase } from "@/integrations/supabase/client";
import type { UnifiedModuleType } from "../configs";

/**
 * Resposta do chat router
 */
export interface ChatRouterResponse {
  response: string;
  message?: string;
  text?: string;
  phoneticMap?: Record<string, string>;
  error?: string;
}

/**
 * Parâmetros para chamada ao chat router
 */
export interface ChatRouterParams {
  message: string;
  moduleType: UnifiedModuleType;
  deviceId?: string;
  sessionId?: string;
}

/**
 * Erro customizado do chat router
 */
export class ChatRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "ChatRouterError";
  }
}

/**
 * Envia mensagem para o chat-router
 * @throws {ChatRouterError} em caso de erro
 */
export async function sendToChatRouter(params: ChatRouterParams): Promise<ChatRouterResponse> {
  const { message, moduleType, deviceId, sessionId } = params;

  console.log(`[ChatRouter-${moduleType}] Enviando mensagem...`);

  try {
    const { data, error } = await supabase.functions.invoke("chat-router", {
      body: {
        message,
        pwaMode: true,
        chatType: moduleType,
        agentSlug: moduleType,
        deviceId,
        sessionId,
      },
    });

    if (error) {
      console.error(`[ChatRouter-${moduleType}] API Error:`, error);
      throw new ChatRouterError(
        error.message || "Erro ao processar resposta",
        "API_ERROR",
        error
      );
    }

    // Extrair resposta (pode vir em diferentes campos)
    const responseText = data?.response || data?.message || data?.text;

    if (!responseText) {
      console.error(`[ChatRouter-${moduleType}] Resposta inválida:`, data);
      throw new ChatRouterError(
        "Resposta vazia do chat router",
        "EMPTY_RESPONSE"
      );
    }

    console.log(`[ChatRouter-${moduleType}] ✅ Resposta recebida`);

    return {
      response: responseText,
      phoneticMap: data?.phoneticMap,
    };
  } catch (err) {
    if (err instanceof ChatRouterError) {
      throw err;
    }

    console.error(`[ChatRouter-${moduleType}] Erro inesperado:`, err);
    throw new ChatRouterError(
      err instanceof Error ? err.message : "Erro desconhecido",
      "UNKNOWN_ERROR",
      err
    );
  }
}
