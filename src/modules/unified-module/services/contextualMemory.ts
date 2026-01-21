/**
 * ============================================================
 * Unified Module - Contextual Memory Service
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Serviço de memória contextual para saudações personalizadas.
 * Utiliza a Edge Function pwa-contextual-memory.
 * ============================================================
 */

import { supabase } from "@/integrations/supabase/client";
import type { UnifiedModuleType } from "../configs";

/**
 * Resposta da memória contextual
 */
export interface ContextualGreetingResponse {
  greeting: string;
  hasContext: boolean;
  isFirstInteraction: boolean;
}

/**
 * Parâmetros para buscar saudação
 */
export interface ContextualGreetingParams {
  deviceId: string;
  moduleType: UnifiedModuleType;
}

/**
 * Busca saudação contextual do módulo
 */
export async function getContextualGreeting(
  params: ContextualGreetingParams
): Promise<ContextualGreetingResponse | null> {
  const { deviceId, moduleType } = params;

  console.log(`[ContextualMemory-${moduleType}] Buscando saudação contextual...`);

  try {
    const { data, error } = await supabase.functions.invoke("pwa-contextual-memory", {
      body: {
        deviceId,
        moduleType,
        action: "getGreeting",
      },
    });

    if (error) {
      console.warn(`[ContextualMemory-${moduleType}] Erro ao buscar contexto:`, error);
      return null;
    }

    if (data?.greeting) {
      console.log(`[ContextualMemory-${moduleType}] Saudação recebida:`, {
        hasContext: data.hasContext,
        isFirstInteraction: data.isFirstInteraction,
      });

      return {
        greeting: data.greeting,
        hasContext: data.hasContext ?? false,
        isFirstInteraction: data.isFirstInteraction ?? true,
      };
    }

    return null;
  } catch (err) {
    console.warn(`[ContextualMemory-${moduleType}] Exceção ao buscar contexto:`, err);
    return null;
  }
}
