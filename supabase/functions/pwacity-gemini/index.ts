// ============================================
// PWA CITY - GEMINI INTEGRATION
// VERSAO: 2.1.0-PRODUCTION | DEPLOY: 2026-01-17
// STATUS: ✅ PRODUÇÃO - Conectado à API Google Gemini
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FUNCTION_VERSION = "2.1.0-PRODUCTION";
const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-flash"; // Atualizado: gemini-pro descontinuado
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

  console.log(`[pwacity-gemini v${FUNCTION_VERSION}] Request received`);

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

    console.log(`[pwacity-gemini] Prompt length: ${prompt.length}`);
    console.log(`[pwacity-gemini] Session ID: ${sessionId || "none"}`);
    console.log(`[pwacity-gemini] User Phone: ${userPhone || "none"}`);

    // Validar API Key
    if (!GEMINI_API_KEY) {
      console.error("[pwacity-gemini] GOOGLE_GEMINI_API_KEY not found in environment");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuração da API Gemini não encontrada. Configure GOOGLE_GEMINI_API_KEY nas variáveis de ambiente.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================
    // INTEGRAÇÃO COM GOOGLE GEMINI API
    // ============================================
    const startTime = Date.now();

    try {
      console.log("[pwacity-gemini] Calling Google Gemini API...");

      const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Você é um assistente inteligente do PWA City, focado em ajudar usuários com informações gerais, recomendações e suporte. Seja objetivo, claro e prestativo. Responda em português do Brasil.\n\nUsuário pergunta: ${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("[pwacity-gemini] Gemini API error:", errorText);
        throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      const responseTime = Date.now() - startTime;

      console.log("[pwacity-gemini] ✅ Gemini response received");
      console.log(`[pwacity-gemini] Response time: ${responseTime}ms`);

      // Extrair resposta
      const candidates = geminiData.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("No candidates in Gemini response");
      }

      const assistantMessage =
        candidates[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";

      // Gemini não retorna token count diretamente na resposta
      // Estimativa baseada no tamanho do texto (aproximado)
      const estimatedTokens = Math.ceil((prompt.length + assistantMessage.length) / 4);

      const responseData = {
        success: true,
        response: assistantMessage,
        model: GEMINI_MODEL,
        tokens: estimatedTokens,
        responseTime,
        provider: "gemini",
        mock: false,
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (apiError) {
      console.error("[pwacity-gemini] Error calling Gemini:", apiError);

      return new Response(
        JSON.stringify({
          success: false,
          error: apiError instanceof Error ? apiError.message : "Erro ao processar sua solicitação com Gemini",
          mock: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("[pwacity-gemini] Error:", error);

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
