import { supabase } from "@/integrations/supabase/client";

interface SuggestionAuditData {
  sessionId: string;
  chatType: "health" | "study";
  userQuery: string;
  aiResponsePreview: string;
  suggestionsGenerated: string[];
  hasRagContext?: boolean;
  ragDocumentsUsed?: string[];
}

/**
 * Salva dados de auditoria de sugestões para análise de coerência contextual
 */
export async function saveSuggestionAudit(data: SuggestionAuditData): Promise<void> {
  try {
    const { error } = await supabase
      .from("suggestion_audit")
      .insert({
        session_id: data.sessionId,
        chat_type: data.chatType,
        user_query: data.userQuery,
        ai_response_preview: data.aiResponsePreview.substring(0, 500), // Limitar tamanho
        suggestions_generated: data.suggestionsGenerated,
        has_rag_context: data.hasRagContext ?? false,
        rag_documents_used: data.ragDocumentsUsed ?? [],
      });

    if (error) {
      console.error("[SUGGESTION_AUDIT] Erro ao salvar auditoria:", error);
    } else {
      console.log(`[SUGGESTION_AUDIT] Auditoria salva: ${data.chatType} | Query: "${data.userQuery.substring(0, 50)}..." | Sugestões: ${data.suggestionsGenerated.length}`);
    }
  } catch (err) {
    console.error("[SUGGESTION_AUDIT] Exceção ao salvar auditoria:", err);
  }
}

/**
 * Atualiza o score de coerência de uma auditoria existente
 */
export async function updateCoherenceScore(
  auditId: string, 
  coherenceScore: number, 
  validated: boolean,
  feedback?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("suggestion_audit")
      .update({
        coherence_score: coherenceScore,
        coherence_validated: validated,
        admin_feedback: feedback,
        validated_at: new Date().toISOString(),
      })
      .eq("id", auditId);

    if (error) {
      console.error("[SUGGESTION_AUDIT] Erro ao atualizar coerência:", error);
    }
  } catch (err) {
    console.error("[SUGGESTION_AUDIT] Exceção ao atualizar coerência:", err);
  }
}
