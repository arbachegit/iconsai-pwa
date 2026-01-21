// ============================================
// PWA CITY - OPENAI INTEGRATION
// VERSAO: 2.0.0-PRODUCTION | DEPLOY: 2026-01-17
// STATUS: ✅ PRODUÇÃO - Conectado à API OpenAI
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FUNCTION_VERSION = "2.0.0-PRODUCTION";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

interface RequestBody {
  prompt: string;
  sessionId?: string | null;
  userPhone?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[pwacity-openai v${FUNCTION_VERSION}] Request received`);

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { prompt, sessionId, userPhone } = body;

    // Validate input
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Prompt é obrigatório",
        }),
        {
          status: 200, // Always return 200 to avoid frontend errors
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[pwacity-openai] Prompt length: ${prompt.length}`);
    console.log(`[pwacity-openai] Session ID: ${sessionId || "none"}`);
    console.log(`[pwacity-openai] User Phone: ${userPhone || "none"}`);

    // Validar API Key
    if (!OPENAI_API_KEY) {
      console.error("[pwacity-openai] OPENAI_API_KEY not found in environment");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuração da API OpenAI não encontrada. Configure OPENAI_API_KEY nas variáveis de ambiente.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================
    // INTEGRAÇÃO COM OPENAI API
    // ============================================
    const startTime = Date.now();

    try {
      console.log("[pwacity-openai] Calling OpenAI API...");

      const openaiResponse = await fetch(OPENAI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "Você é um assistente inteligente do PWA City, focado em ajudar usuários com informações gerais, recomendações e suporte. Seja objetivo, claro e prestativo. Responda em português do Brasil.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("[pwacity-openai] OpenAI API error:", errorText);
        throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
      }

      const openaiData = await openaiResponse.json();
      const responseTime = Date.now() - startTime;

      console.log("[pwacity-openai] ✅ OpenAI response received");
      console.log(`[pwacity-openai] Response time: ${responseTime}ms`);
      console.log(`[pwacity-openai] Tokens used: ${openaiData.usage?.total_tokens || "unknown"}`);

      // Extrair resposta
      const assistantMessage = openaiData.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

      const responseData = {
        success: true,
        response: assistantMessage,
        model: openaiData.model || "gpt-4",
        tokens: openaiData.usage?.total_tokens || null,
        responseTime,
        provider: "openai",
        mock: false,
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (apiError) {
      console.error("[pwacity-openai] Error calling OpenAI:", apiError);

      return new Response(
        JSON.stringify({
          success: false,
          error: apiError instanceof Error ? apiError.message : "Erro ao processar sua solicitação com OpenAI",
          mock: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("[pwacity-openai] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        mock: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
