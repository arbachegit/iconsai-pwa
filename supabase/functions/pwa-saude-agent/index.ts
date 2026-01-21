// ============================================
// PWA SAÚDE AGENT - Orientação de Saúde (Perplexity)
// VERSAO: 2.0.0-PRODUCTION | DEPLOY: 2026-01-19
// STATUS: PRODUÇÃO - Perplexity → Gemini → OpenAI
// NOVO: Integração com localização e clínicas próximas
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const FUNCTION_VERSION = "2.0.0-PRODUCTION";

// API Keys
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY") || Deno.env.get("PERPLEXITY_API_KEY");
const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Endpoints
const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// System prompt BASE - MÓDULO SAÚDE (ORIENTAÇÃO E SINTOMAS)
const SYSTEM_PROMPT_BASE = `Você é um assistente de saúde PESSOAL, treinado pela Arbache AI.

## SUA FUNÇÃO PRINCIPAL:
Ajudar pessoas a entender seus sintomas e INDICAR ONDE BUSCAR AJUDA médica perto delas.

## ANÁLISE DE SINTOMAS:
- Escute os sintomas descritos
- Faça UMA pergunta por vez para entender:
  * Quando começou?
  * Onde exatamente sente?
  * Intensidade de 0 a 10?
- Sugira possíveis causas (sem diagnosticar definitivamente)

## INDICAÇÃO DE CLÍNICAS (MUITO IMPORTANTE):
- Quando o usuário descrever sintomas, INDIQUE onde buscar ajuda
- Se tiver informações de clínicas próximas, MENCIONE-AS com nome e distância
- Diferencie: sintomas leves → UBS/clínica; urgentes → UPA/hospital

## SINAIS DE ALERTA (indicar EMERGÊNCIA):
- Dor no peito ou falta de ar → "Vá IMEDIATAMENTE ao pronto-socorro mais próximo"
- Febre alta (> 39°C) por mais de 2 dias
- Sangramento intenso, confusão mental, desmaios
- Dor de cabeça muito forte e súbita

## ESTILO DE RESPOSTA:
- Seja EMPÁTICO e DIRETO
- Respostas CURTAS (3-4 frases)
- Linguagem NATURAL (será lida em voz alta)
- SEMPRE termine indicando onde buscar ajuda
- Faça UMA pergunta por vez

## REGRAS:
- NÃO prescreva medicamentos específicos
- PODE sugerir possíveis causas para os sintomas
- PODE e DEVE indicar clínicas/hospitais quando souber
- NUNCA mencione ChatGPT, OpenAI, Perplexity
- Se perguntado quem você é: "Fui desenvolvido pela Arbache AI"

## FRASES ÚTEIS:
- "Pelos sintomas que você descreve, pode ser... Recomendo procurar..."
- "Isso parece urgente. Vá ao pronto-socorro mais próximo"
- "Para esse tipo de sintoma, uma UBS pode te ajudar"
- "A clínica X está a Y km de você e pode te atender"`;

// Template para adicionar contexto de localização e clínicas
const LOCATION_CONTEXT_TEMPLATE = `

## LOCALIZAÇÃO DO USUÁRIO:
O usuário está em: {{CITY}}, {{STATE}}

## CLÍNICAS PRÓXIMAS (USE ESTAS INFORMAÇÕES!):
{{CLINICS_LIST}}

## INSTRUÇÕES OBRIGATÓRIAS:
- SEMPRE mencione pelo menos uma clínica próxima quando indicar buscar ajuda
- Fale o NOME da clínica e a DISTÂNCIA (ex: "O Hospital X está a 1.2 km de você")
- Para sintomas GRAVES → indique UPA ou hospital mais próximo
- Para sintomas LEVES → sugira UBS mais próxima
- NUNCA diga que não pode indicar clínicas - você TEM a lista acima!`;

// Interface para clínicas
interface NearbyClinic {
  name: string;
  address: string;
  distanceText: string;
  isPublic: boolean;
  isOpen?: boolean;
  openNow?: string;
}

// Função para construir o system prompt com contexto de localização
function buildSystemPrompt(
  location?: { city?: string; state?: string; latitude: number; longitude: number },
  clinics?: NearbyClinic[]
): string {
  let prompt = SYSTEM_PROMPT_BASE;

  if (location && clinics && clinics.length > 0) {
    // Formatar lista de clínicas
    const publicClinics = clinics.filter(c => c.isPublic);
    const privateClinics = clinics.filter(c => !c.isPublic);

    let clinicsList = "";

    if (publicClinics.length > 0) {
      clinicsList += "**PÚBLICAS (SUS):**\n";
      publicClinics.slice(0, 5).forEach((c, i) => {
        clinicsList += `${i + 1}. ${c.name} - ${c.distanceText} ${c.openNow ? `(${c.openNow})` : ""}\n`;
        clinicsList += `   Endereço: ${c.address}\n`;
      });
    }

    if (privateClinics.length > 0) {
      clinicsList += "\n**PARTICULARES:**\n";
      privateClinics.slice(0, 5).forEach((c, i) => {
        clinicsList += `${i + 1}. ${c.name} - ${c.distanceText} ${c.openNow ? `(${c.openNow})` : ""}\n`;
        clinicsList += `   Endereço: ${c.address}\n`;
      });
    }

    const locationContext = LOCATION_CONTEXT_TEMPLATE
      .replace("{{CITY}}", location.city || "Não identificada")
      .replace("{{STATE}}", location.state || "")
      .replace("{{LAT}}", location.latitude.toFixed(4))
      .replace("{{LNG}}", location.longitude.toFixed(4))
      .replace("{{CLINICS_LIST}}", clinicsList || "Nenhuma clínica encontrada próxima.");

    prompt += locationContext;
  }

  return prompt;
}

interface RequestBody {
  prompt: string;
  sessionId?: string | null;
  userPhone?: string | null;
  deviceId?: string | null;
  history?: Array<{ role: string; content: string }>;
  // Dados de localização
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
    country?: string;
  };
  // Clínicas pré-carregadas (opcional)
  nearbyClinics?: NearbyClinic[];
}

interface AIResponse {
  success: boolean;
  response: string;
  model: string;
  tokens: number | null;
  responseTime: number;
  provider: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
}

// ============================================
// PROVIDER FUNCTIONS
// ============================================

async function callPerplexity(prompt: string, history: Array<{ role: string; content: string }> = [], systemPrompt: string): Promise<AIResponse> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const startTime = Date.now();

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6), // Mais histórico para contexto de sintomas
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
      temperature: 0.5, // Menor temperatura para respostas mais consistentes em saúde
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

  // Limpar resposta: remover citações [1], [2], etc e menções a "perplexity"
  let cleanResponse = data.choices?.[0]?.message?.content || "Sem resposta";
  cleanResponse = cleanResponse
    .replace(/\[\d+\]/g, "") // Remove [1], [2], etc
    .replace(/\[[\d,\s]+\]/g, "") // Remove [1,2,3], etc
    .replace(/perplexity/gi, "") // Remove "perplexity"
    .replace(/\s{2,}/g, " ") // Remove espaços duplos
    .trim();

  return {
    success: true,
    response: cleanResponse,
    model: "health-assistant",
    tokens: data.usage?.total_tokens || null,
    responseTime,
    provider: "ai",
  };
}

async function callGemini(prompt: string, history: Array<{ role: string; content: string }> = [], systemPrompt: string): Promise<AIResponse> {
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }

  const startTime = Date.now();
  const url = `${GEMINI_ENDPOINT}?key=${GOOGLE_GEMINI_API_KEY}`;

  const historyText = history.slice(-6).map(m => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`).join("\n");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\n${historyText ? `Histórico:\n${historyText}\n\n` : ""}Usuário: ${prompt}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.5,
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

  let textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta";
  // Limpar resposta
  textContent = textContent
    .replace(/\[\d+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    success: true,
    response: textContent,
    model: "health-assistant",
    tokens: Math.ceil((prompt.length + textContent.length) / 4),
    responseTime,
    provider: "ai",
  };
}

async function callOpenAI(prompt: string, history: Array<{ role: string; content: string }> = [], systemPrompt: string): Promise<AIResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const startTime = Date.now();

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6),
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
      temperature: 0.5,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  let textContent = data.choices?.[0]?.message?.content || "Sem resposta";
  // Limpar resposta
  textContent = textContent
    .replace(/\[\d+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    success: true,
    response: textContent,
    model: "health-assistant",
    tokens: data.usage?.total_tokens || null,
    responseTime,
    provider: "ai",
  };
}

// ============================================
// FALLBACK CHAIN
// ============================================

async function executeWithFallback(
  prompt: string,
  history: Array<{ role: string; content: string }> = [],
  systemPrompt: string = SYSTEM_PROMPT_BASE
): Promise<AIResponse> {
  const providers = [
    { name: "perplexity", fn: () => callPerplexity(prompt, history, systemPrompt) },
    { name: "gemini", fn: () => callGemini(prompt, history, systemPrompt) },
    { name: "openai", fn: () => callOpenAI(prompt, history, systemPrompt) },
  ];

  let lastError: Error | null = null;
  let fallbackReason = "";

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];

    try {
      console.log(`[pwa-saude-agent] Trying provider: ${provider.name}`);
      const result = await provider.fn();

      if (i > 0) {
        result.fallbackUsed = true;
        result.fallbackReason = `Primary providers failed: ${fallbackReason}`;
      }

      console.log(`[pwa-saude-agent] ✅ Success with ${provider.name}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[pwa-saude-agent] ❌ ${provider.name} failed:`, errorMsg);

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

  console.log(`[pwa-saude-agent v${FUNCTION_VERSION}] Request received`);

  try {
    const body: RequestBody = await req.json();
    const { prompt, sessionId, deviceId, history = [], location, nearbyClinics } = body;

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

    console.log(`[pwa-saude-agent] Prompt length: ${prompt.length}`);
    console.log(`[pwa-saude-agent] Device ID: ${deviceId || "none"}`);
    console.log(`[pwa-saude-agent] Location: ${location ? `${location.city || 'unknown'}, ${location.state || ''}` : 'not provided'}`);
    console.log(`[pwa-saude-agent] Clinics provided: ${nearbyClinics?.length || 0}`);

    // Build system prompt with location context if available
    const systemPrompt = buildSystemPrompt(location, nearbyClinics);

    const result = await executeWithFallback(prompt.trim(), history, systemPrompt);

    console.log(`[pwa-saude-agent] Final provider: ${result.provider}`);
    console.log(`[pwa-saude-agent] Response time: ${result.responseTime}ms`);

    // Include location context in response
    const responseWithContext = {
      ...result,
      locationUsed: !!location,
      clinicsAvailable: nearbyClinics?.length || 0,
    };

    return new Response(JSON.stringify(responseWithContext), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[pwa-saude-agent] Critical error:", error);

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
