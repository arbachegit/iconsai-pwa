// ============================================
// VERSÃO: 1.0.0 | DEPLOY: 2026-01-08
// FUNÇÃO: Atualiza contexto do usuário após cada interação
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logger.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

interface UpdateContextRequest {
  deviceId: string;
  userName?: string;
  moduleId: string;
  userMessage: string;
  assistantResponse: string;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const logger = createLogger("update-user-context");

  try {
    const body = await req.json() as UpdateContextRequest;
    const { deviceId, userName, moduleId, userMessage, assistantResponse } = body;

    if (!deviceId || !moduleId || !userMessage) {
      return errorResponse("deviceId, moduleId e userMessage são obrigatórios", 400);
    }

    logger.info("Updating user context", { deviceId, moduleId });

    const supabase = getSupabaseAdmin();

    // Gerar resumo do tópico via IA (máximo 15 palavras)
    let topicSummary = userMessage.substring(0, 100);
    
    try {
      const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: "Resuma em NO MÁXIMO 15 palavras o tema principal da interação. Responda APENAS com o resumo, sem prefixos ou explicações.",
            },
            {
              role: "user",
              content: `Usuário: "${userMessage.substring(0, 300)}"\nResposta: "${assistantResponse.substring(0, 200)}"`,
            },
          ],
          max_tokens: 50,
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        const generatedSummary = summaryData.choices?.[0]?.message?.content?.trim();
        if (generatedSummary && generatedSummary.length > 5) {
          topicSummary = generatedSummary.substring(0, 200);
        }
      }
    } catch (summaryError) {
      logger.warn("Failed to generate topic summary, using fallback", { 
        error: summaryError instanceof Error ? summaryError.message : "Unknown" 
      });
    }

    // Verificar se existe registro para este device
    const { data: existing } = await supabase
      .from("pwa_user_context")
      .select("id, interaction_count")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (existing) {
      // Atualizar registro existente
      const { error: updateError } = await supabase
        .from("pwa_user_context")
        .update({
          user_name: userName || null,
          last_module: moduleId,
          last_topic_summary: topicSummary,
          last_user_message: userMessage.substring(0, 500),
          interaction_count: existing.interaction_count + 1,
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("device_id", deviceId);

      if (updateError) {
        logger.error("Error updating user context", { error: updateError.message });
        throw new Error("Erro ao atualizar contexto");
      }

      logger.info("User context updated", { 
        deviceId, 
        newCount: existing.interaction_count + 1,
        topicSummary: topicSummary.substring(0, 30),
      });
    } else {
      // Criar novo registro
      const { error: insertError } = await supabase
        .from("pwa_user_context")
        .insert({
          device_id: deviceId,
          user_name: userName || null,
          interaction_count: 1,
          last_module: moduleId,
          last_topic_summary: topicSummary,
          last_user_message: userMessage.substring(0, 500),
          last_interaction_at: new Date().toISOString(),
        });

      if (insertError) {
        logger.error("Error inserting user context", { error: insertError.message });
        throw new Error("Erro ao criar contexto");
      }

      logger.info("User context created", { deviceId, topicSummary: topicSummary.substring(0, 30) });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logger.error("Error in update-user-context", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
    return errorResponse(
      error instanceof Error ? error.message : "Erro ao atualizar contexto",
      500
    );
  }
});
