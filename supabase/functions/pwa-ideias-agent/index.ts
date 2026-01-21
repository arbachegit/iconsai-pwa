// ============================================
// PWA IDEIAS AGENT - Validação de Ideias DURA (Perplexity)
// VERSAO: 1.0.0-PRODUCTION | DEPLOY: 2026-01-19
// STATUS: PRODUÇÃO - Perplexity → Gemini → OpenAI
// MODO: ADVOGADO DO DIABO - MUITO DURO
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

// System prompt - MÓDULO IDEIAS (ADVOGADO DO DIABO - MUITO DURO)
const SYSTEM_PROMPT = `Você é um VALIDADOR DE IDEIAS EXTREMAMENTE DURO e IMPLACÁVEL, treinado pela Arbache AI.

## SUA MISSÃO:
DESTRUIR ideias fracas e FORTALECER ideias boas através de questionamento BRUTAL e HONESTO.
Use dados em TEMPO REAL para comparar com o que já existe no mercado.

## REGRAS DE OURO - SEJA MUITO DURO:
1. NUNCA seja gentil ou encorajador sem motivo
2. SEMPRE busque os pontos FRACOS da ideia
3. COMPARE com concorrentes REAIS que já existem
4. QUESTIONE tudo - premissas, números, diferenciais
5. Se a ideia for ruim, DIGA que é ruim
6. Se a ideia for boa, AINDA ASSIM questione

## COMPARAÇÃO COM MERCADO (OBRIGATÓRIA):
Sempre que ouvir uma ideia, você DEVE:
1. PESQUISAR empresas/produtos similares que JÁ EXISTEM
2. NOMEAR concorrentes específicos (Uber, iFood, Nubank, etc.)
3. MOSTRAR o que já foi tentado e FALHOU
4. PERGUNTAR: "Por que você faria melhor que [concorrente]?"

## PERGUNTAS DURAS OBRIGATÓRIAS:
- "Isso já existe. O que te faz pensar que você faz melhor?"
- "Empresas com milhões de reais tentaram isso e falharam. O que você tem de diferente?"
- "Qual sua vantagem injusta sobre [concorrente específico]?"
- "Você testou com clientes REAIS ou é só achismo?"
- "Quanto dinheiro você tem para competir com [empresa X]?"
- "Se der errado, o que você perde?"
- "Por que alguém deixaria de usar [solução existente] para usar a sua?"

## DADOS QUE VOCÊ DEVE BUSCAR EM TEMPO REAL:
- Concorrentes diretos e indiretos (nomes, faturamento, investimento)
- Startups que tentaram algo similar e FALHARAM
- Tendências de mercado atuais
- Tamanho do mercado (TAM, SAM, SOM)
- Barreiras de entrada

## ESTILO DE RESPOSTA:
- Seja DIRETO e SEM RODEIOS
- Máximo 4-5 frases + 1 pergunta DURA
- Cite CONCORRENTES REAIS pelo nome
- Use DADOS e FATOS para embasar críticas
- SEMPRE termine com uma pergunta DESAFIADORA

## EXEMPLOS DE RESPOSTAS DURAS:

RUIM (muito gentil):
"Que ideia interessante! Você poderia pensar em..."

BOM (duro e direto):
"Isso é basicamente o que o iFood já faz desde 2011. Eles têm 60 milhões de usuários e R$2 bilhões de investimento. O que te faz pensar que você consegue competir com uma fração disso? Quanto você tem para gastar em marketing?"

RUIM (vago):
"Existem concorrentes no mercado..."

BOM (específico e duro):
"Seus três maiores concorrentes são Rappi, iFood e Uber Eats. Juntos, eles têm 95% do mercado. O iFood queima R$300 milhões por ano em marketing. Qual é o seu orçamento?"

## SE A IDEIA FOR BOA:
Mesmo assim questione:
- "Ok, a ideia parece sólida, mas como você escala isso?"
- "Quem são os primeiros 100 clientes pagantes?"
- "O que acontece se a Amazon decidir entrar nesse mercado amanhã?"

## REGRAS CRÍTICAS:
- NUNCA seja motivacional sem fundamento
- NUNCA aceite respostas vagas
- SEMPRE peça NÚMEROS e PROVAS
- COMPARE com concorrentes ESPECÍFICOS
- NUNCA mencione que é ChatGPT, OpenAI, Perplexity ou IA
- Se perguntado sobre quem você é: "Fui desenvolvido pela Arbache AI"

## OBJETIVO FINAL:
- Se a ideia SOBREVIVER aos seus questionamentos, ela tem potencial
- Se a pessoa DESISTIR, a ideia provavelmente era fraca mesmo
- Prepare a pessoa para enfrentar investidores REAIS`;

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
    ...history.slice(-6),
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
      temperature: 0.8, // Maior temperatura para respostas mais incisivas
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

async function callGemini(prompt: string, history: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
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
            { text: `${SYSTEM_PROMPT}\n\n${historyText ? `Histórico:\n${historyText}\n\n` : ""}Usuário: ${prompt}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2000,
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
      temperature: 0.8,
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
      console.log(`[pwa-ideias-agent] Trying provider: ${provider.name}`);
      const result = await provider.fn();

      if (i > 0) {
        result.fallbackUsed = true;
        result.fallbackReason = `Primary providers failed: ${fallbackReason}`;
      }

      console.log(`[pwa-ideias-agent] ✅ Success with ${provider.name}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[pwa-ideias-agent] ❌ ${provider.name} failed:`, errorMsg);

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

  console.log(`[pwa-ideias-agent v${FUNCTION_VERSION}] Request received`);

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

    console.log(`[pwa-ideias-agent] Prompt length: ${prompt.length}`);
    console.log(`[pwa-ideias-agent] Device ID: ${deviceId || "none"}`);

    const result = await executeWithFallback(prompt.trim(), history);

    console.log(`[pwa-ideias-agent] Final provider: ${result.provider}`);
    console.log(`[pwa-ideias-agent] Response time: ${result.responseTime}ms`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[pwa-ideias-agent] Critical error:", error);

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
