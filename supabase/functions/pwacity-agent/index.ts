// ============================================
// PWA CITY - AGENT (Microservice with Fallback Chain)
// VERSAO: 1.0.0-PRODUCTION | DEPLOY: 2026-01-19
// STATUS: PRODUÇÃO - Perplexity → Gemini → OpenAI
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FUNCTION_VERSION = "1.0.0-PRODUCTION";

// API Keys (nomes conforme configurados no Supabase Secrets)
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY") || Deno.env.get("PERPLEXITY_API_KEY");
const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Endpoints
const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// System prompt padrão - RESTRITO A CIDADES
const SYSTEM_PROMPT = `Você é um assistente especializado em CIDADES, treinado pela Arbache AI. Seu conhecimento é EXCLUSIVAMENTE sobre:
- Informações sobre cidades (história, cultura, população, economia)
- Clima, temperatura e previsão do tempo nas cidades
- Turismo e pontos turísticos
- Serviços públicos municipais
- Transporte urbano
- Eventos e atividades culturais nas cidades
- Gastronomia e restaurantes locais
- Bairros e regiões
- Qualidade de vida urbana
- Notícias e acontecimentos locais

REGRA IMPORTANTE: Se o usuário perguntar sobre assuntos que NÃO sejam relacionados a cidades (como programação, matemática, receitas de comida, relacionamentos pessoais, etc.), você DEVE responder:
"Desculpe, sou uma IA treinada pela Arbache AI e estou focada exclusivamente em ajudar com informações sobre cidades. Posso ajudá-lo com perguntas sobre turismo, clima, serviços municipais, cultura urbana, ou qualquer outro tema relacionado a cidades. Como posso ajudar?"

Seja objetivo, claro e prestativo. Responda em português do Brasil. Use informações atualizadas e em tempo real quando disponíveis.`;

interface RequestBody {
  prompt: string;
  sessionId?: string | null;
  userPhone?: string | null;
  preferredProvider?: "perplexity" | "gemini" | "openai";
}

interface AIResponse {
  success: boolean;
  response: string;
  model: string;
  tokens: number | null;
  responseTime: number;
  provider: string;
  citations?: string[];
  fallbackUsed?: boolean;
  fallbackReason?: string;
}

// ============================================
// PROVIDER FUNCTIONS
// ============================================

async function callPerplexity(prompt: string): Promise<AIResponse> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const startTime = Date.now();

  const response = await fetch(PERPLEXITY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      return_citations: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  return {
    success: true,
    response: data.choices?.[0]?.message?.content || "Sem resposta",
    model: data.model || "sonar",
    tokens: data.usage?.total_tokens || null,
    responseTime,
    provider: "perplexity",
    citations: data.citations || [],
  };
}

async function callGemini(prompt: string): Promise<AIResponse> {
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }

  const startTime = Date.now();
  const url = `${GEMINI_ENDPOINT}?key=${GOOGLE_GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${SYSTEM_PROMPT}\n\nUsuário: ${prompt}` },
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
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta";
  const estimatedTokens = Math.ceil((prompt.length + textContent.length) / 4);

  return {
    success: true,
    response: textContent,
    model: "gemini-2.0-flash",
    tokens: estimatedTokens,
    responseTime,
    provider: "gemini",
  };
}

async function callOpenAI(prompt: string): Promise<AIResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const startTime = Date.now();

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  return {
    success: true,
    response: data.choices?.[0]?.message?.content || "Sem resposta",
    model: data.model || "gpt-4",
    tokens: data.usage?.total_tokens || null,
    responseTime,
    provider: "openai",
  };
}

// ============================================
// FALLBACK CHAIN
// ============================================

async function executeWithFallback(prompt: string): Promise<AIResponse> {
  const providers = [
    { name: "perplexity", fn: callPerplexity },
    { name: "gemini", fn: callGemini },
    { name: "openai", fn: callOpenAI },
  ];

  let lastError: Error | null = null;
  let fallbackUsed = false;
  let fallbackReason = "";

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];

    try {
      console.log(`[pwacity-agent] Trying provider: ${provider.name}`);
      const result = await provider.fn(prompt);

      if (i > 0) {
        result.fallbackUsed = true;
        result.fallbackReason = `Primary providers failed: ${fallbackReason}`;
      }

      console.log(`[pwacity-agent] ✅ Success with ${provider.name}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[pwacity-agent] ❌ ${provider.name} failed:`, errorMsg);

      lastError = error instanceof Error ? error : new Error(errorMsg);
      fallbackUsed = true;
      fallbackReason += `${provider.name}: ${errorMsg}; `;
    }
  }

  // Todos falharam
  throw lastError || new Error("All providers failed");
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[pwacity-agent v${FUNCTION_VERSION}] Request received`);

  try {
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
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[pwacity-agent] Prompt length: ${prompt.length}`);
    console.log(`[pwacity-agent] Session ID: ${sessionId || "none"}`);
    console.log(`[pwacity-agent] User Phone: ${userPhone || "none"}`);

    // Execute with fallback chain
    const result = await executeWithFallback(prompt.trim());

    console.log(`[pwacity-agent] Final provider: ${result.provider}`);
    console.log(`[pwacity-agent] Response time: ${result.responseTime}ms`);
    console.log(`[pwacity-agent] Fallback used: ${result.fallbackUsed || false}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[pwacity-agent] Critical error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro ao processar solicitação",
        provider: "none",
        fallbackUsed: true,
        fallbackReason: "All providers failed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
