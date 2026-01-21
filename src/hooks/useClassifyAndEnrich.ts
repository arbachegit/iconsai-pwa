import { supabase } from "@/integrations/supabase/client";

interface ClassifyResult {
  enrichedText: string;
  phoneticMap: Record<string, string>;
  taxonomyTags: Array<{ 
    code: string; 
    name: string; 
    confidence: number 
  }>;
  processingTimeMs: number;
}

/**
 * Classifica texto por taxonomia e busca fonéticas específicas do contexto.
 * Retorna texto enriquecido para TTS + mapa fonético otimizado.
 * 
 * @param text - Texto a ser classificado
 * @param moduleType - Tipo do módulo PWA (world, health, ideas, help)
 * @param messageId - ID da mensagem para salvar entity_tags (opcional)
 * @param userRegion - Região do usuário para fonética regional (opcional)
 */
export async function classifyAndEnrich(
  text: string,
  moduleType: string,
  messageId?: string,
  userRegion?: string
): Promise<ClassifyResult> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "classify-and-enrich", 
      {
        body: { text, moduleType, messageId, userRegion }
      }
    );

    if (error) throw error;
    
    return data as ClassifyResult;
  } catch (error) {
    console.warn("[ClassifyAndEnrich] Fallback ao texto original:", error);
    return {
      enrichedText: text,
      phoneticMap: {},
      taxonomyTags: [],
      processingTimeMs: 0
    };
  }
}
