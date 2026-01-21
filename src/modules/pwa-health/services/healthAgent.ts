/**
 * ============================================================
 * PWA Health Module - Health Agent Service
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Serviço de comunicação com o pwahealth-agent (microserviço).
 * Fallback chain: Perplexity → Gemini → OpenAI
 * ============================================================
 */

import { supabase } from "@/integrations/supabase/client";
import { HEALTH_MODULE_CONFIG } from "../config";

/**
 * Resposta do health agent
 */
export interface HealthAgentResponse {
  response: string;
  provider: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
}

/**
 * Parâmetros para chamada ao agent
 */
export interface HealthAgentParams {
  prompt: string;
  sessionId?: string | null;
  userPhone?: string | null;
}

/**
 * Erro customizado do health agent
 */
export class HealthAgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "HealthAgentError";
  }
}

/**
 * Envia mensagem para o pwahealth-agent
 * @throws {HealthAgentError} em caso de erro
 */
export async function sendToHealthAgent(params: HealthAgentParams): Promise<HealthAgentResponse> {
  const { prompt, sessionId, userPhone } = params;

  console.log("[HealthAgent] Chamando pwahealth-agent...");

  try {
    const { data, error } = await supabase.functions.invoke(
      HEALTH_MODULE_CONFIG.endpoint!,
      {
        body: {
          prompt,
          sessionId,
          userPhone,
        },
      }
    );

    if (error) {
      console.error("[HealthAgent] API Error:", error);
      throw new HealthAgentError(
        error.message || "Erro ao processar resposta",
        "API_ERROR",
        error
      );
    }

    if (!data || !data.response) {
      console.error("[HealthAgent] Resposta inválida:", data);
      throw new HealthAgentError(
        "Resposta vazia da API",
        "EMPTY_RESPONSE"
      );
    }

    const response: HealthAgentResponse = {
      response: data.response,
      provider: data.provider || "agent",
      fallbackUsed: data.fallbackUsed,
      fallbackReason: data.fallbackReason,
    };

    console.log("[HealthAgent] ✅ Resposta recebida de:", response.provider);
    if (response.fallbackUsed) {
      console.log("[HealthAgent] Fallback utilizado:", response.fallbackReason);
    }

    return response;
  } catch (err) {
    if (err instanceof HealthAgentError) {
      throw err;
    }

    console.error("[HealthAgent] Erro inesperado:", err);
    throw new HealthAgentError(
      err instanceof Error ? err.message : "Erro desconhecido",
      "UNKNOWN_ERROR",
      err
    );
  }
}
