// ============================================
// PWA MUNDO AGENT - Dados Gerais do Mundo (Perplexity)
// VERSAO: 1.0.0-PRODUCTION | DEPLOY: 2026-01-19
// STATUS: PRODUÇÃO - Perplexity → Gemini → OpenAI
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FUNCTION_VERSION = "1.0.0-PRODUCTION";

// API Keys
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY") || Deno.env.get("PERPLEXITY_API_KEY");
const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Endpoints
const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// System prompt - MÓDULO MUNDO (DADOS GERAIS DO MUNDO)
const SYSTEM_PROMPT = `Você é um assistente especializado em DADOS GERAIS DO MUNDO, treinado pela Arbache AI.

## SUA FUNÇÃO:
Você fornece informações atualizadas e em TEMPO REAL sobre:

**NOTÍCIAS E ACONTECIMENTOS:**
- Notícias do Brasil e do mundo (últimas 24-48 horas)
- Política nacional e internacional
- Economia global e mercados financeiros
- Eventos importantes e tendências

**DADOS ESTATÍSTICOS:**
- População de países e cidades
- PIB e indicadores econômicos
- Rankings mundiais (IDH, qualidade de vida, etc.)
- Dados demográficos atualizados

**CULTURA E SOCIEDADE:**
- Eventos culturais e esportivos
- Tendências sociais e tecnológicas
- Informações sobre países, cidades e regiões
- Curiosidades e fatos interessantes

**TECNOLOGIA E CIÊNCIA:**
- Avanços tecnológicos recentes
- Descobertas científicas
- Inovações e startups
- Tendências tech

## ESTILO DE RESPOSTA:
- Respostas CURTAS e OBJETIVAS (máximo 4-5 frases)
- Linguagem NATURAL e conversacional (será lida em voz alta)
- Cite FONTES e DATAS quando disponíveis
- Use dados ATUALIZADOS em tempo real
- Seja INFORMATIVO e EQUILIBRADO

## REGRAS:
- NUNCA mencione que é ChatGPT, OpenAI, Perplexity ou qualquer outra IA
- Se perguntado sobre quem você é: "Fui desenvolvido pela Arbache AI"
- Responda em português brasileiro
- Priorize informações verificáveis e fontes confiáveis

REGRA IMPORTANTE: Se o usuário perguntar sobre assuntos muito específicos de outros módulos (sintomas de doenças, validação de ideias de negócio), sugira gentilmente usar os módulos especializados.`;

interface RequestBody {
  prompt: string;
  sessionId?: string | null;
  userPhone?: string | null;
  deviceId?: string | null;
  history?: Array<{ role: string; content: string }>;
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

async function callPerplexity(prompt: string, history: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const startTime = Date.now();

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-4),
    { role: "user", content: prompt },
  ];

  const response = await fetch(PERPLEXITY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages,
      temperature: 0.7,
      max_tokens: 1500,
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

async function callGemini(prompt: string, history: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }

  const startTime = Date.now();
  const url = `${GEMINI_ENDPOINT}?key=${GOOGLE_GEMINI_API_KEY}`;

  const historyText = history.slice(-4).map(m => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`).join("\n");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${SYSTEM_PROMPT}\n\n${historyText ? `Histórico:\n${historyText}\n\n` : ""}Usuário: ${prompt}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1500,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta";

  return {
    success: true,
    response: textContent,
    model: "gemini-2.0-flash",
    tokens: Math.ceil((prompt.length + textContent.length) / 4),
    responseTime,
    provider: "gemini",
  };
}

async function callOpenAI(prompt: string, history: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const startTime = Date.now();

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-4),
    { role: "user", content: prompt },
  ];

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 1500,
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
    model: data.model || "gpt-4o-mini",
    tokens: data.usage?.total_tokens || null,
    responseTime,
    provider: "openai",
  };
}

// ============================================
// FALLBACK CHAIN
// ============================================

async function executeWithFallback(prompt: string, history: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
  const providers = [
    { name: "perplexity", fn: () => callPerplexity(prompt, history) },
    { name: "gemini", fn: () => callGemini(prompt, history) },
    { name: "openai", fn: () => callOpenAI(prompt, history) },
  ];

  let lastError: Error | null = null;
  let fallbackReason = "";

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];

    try {
      console.log(`[pwa-mundo-agent] Trying provider: ${provider.name}`);
      const result = await provider.fn();

      if (i > 0) {
        result.fallbackUsed = true;
        result.fallbackReason = `Primary providers failed: ${fallbackReason}`;
      }

      console.log(`[pwa-mundo-agent] ✅ Success with ${provider.name}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[pwa-mundo-agent] ❌ ${provider.name} failed:`, errorMsg);

      lastError = error instanceof Error ? error : new Error(errorMsg);
      fallbackReason += `${provider.name}: ${errorMsg}; `;
    }
  }

  throw lastError || new Error("All providers failed");
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[pwa-mundo-agent v${FUNCTION_VERSION}] Request received`);

  try {
    const body: RequestBody = await req.json();
    const { prompt, sessionId, deviceId, history = [] } = body;

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

    console.log(`[pwa-mundo-agent] Prompt length: ${prompt.length}`);
    console.log(`[pwa-mundo-agent] Device ID: ${deviceId || "none"}`);

    const result = await executeWithFallback(prompt.trim(), history);

    console.log(`[pwa-mundo-agent] Final provider: ${result.provider}`);
    console.log(`[pwa-mundo-agent] Response time: ${result.responseTime}ms`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[pwa-mundo-agent] Critical error:", error);

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
