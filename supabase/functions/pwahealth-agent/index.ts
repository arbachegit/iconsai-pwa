// ============================================
// PWA HEALTH - AGENT (Microservice with Fallback Chain)
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

// System prompt padrão - FOCO EM SAÚDE PÚBLICA E GESTÃO
const SYSTEM_PROMPT = `Você é um assistente especializado em SAÚDE PÚBLICA e GESTÃO DE SAÚDE, treinado pela Arbache AI. Seu conhecimento é EXCLUSIVAMENTE sobre:

**DOENÇAS E EPIDEMIOLOGIA:**
- Doenças infecciosas, crônicas e degenerativas
- Sintomas, causas e fatores de risco
- Epidemias e pandemias (dados atualizados em tempo real)
- Taxas de incidência e prevalência por região
- Doenças tropicais e negligenciadas
- Vacinação e programas de imunização

**INFRAESTRUTURA HOSPITALAR:**
- Condições dos hospitais públicos e privados
- Leitos hospitalares (UTI, enfermaria, maternidade)
- Equipamentos médicos e tecnologia hospitalar
- Falta de insumos e medicamentos
- Filas de espera e tempo de atendimento
- Qualidade do atendimento hospitalar

**INDICADORES DE SAÚDE E IDH (COM COMPARAÇÕES):**
- Índice de Desenvolvimento Humano (IDH) geral e por componente (saúde, educação, renda)
- IDH-M (IDH Municipal) - ranking e evolução histórica
- COMPARAÇÃO DE IDH ENTRE CIDADES DO MESMO PORTE:
  * Cidades pequenas (até 20 mil habitantes)
  * Cidades médias-pequenas (20 mil a 100 mil habitantes)
  * Cidades médias (100 mil a 500 mil habitantes)
  * Cidades grandes (500 mil a 1 milhão de habitantes)
  * Metrópoles (acima de 1 milhão de habitantes)
- Quando o usuário perguntar sobre uma cidade, SEMPRE ofereça comparação com cidades do mesmo porte
- Taxa de mortalidade infantil (comparativo regional e por porte)
- Expectativa de vida (comparativo por município)
- Mortalidade materna
- Cobertura de saneamento básico
- Acesso a água potável
- IDHM Longevidade - componente específico de saúde
- Ranking de saúde entre municípios similares
- Evolução temporal dos indicadores (últimos 10-20 anos)

**GESTÃO PÚBLICA DE SAÚDE (O QUE UM PREFEITO PODE FAZER):**
- Políticas públicas de saúde municipais
- Investimentos prioritários em saúde
- Programas de Atenção Básica (UBS, PSF, NASF)
- Contratação e capacitação de profissionais de saúde
- Parcerias público-privadas na saúde
- Estratégias para reduzir filas e melhorar atendimento
- Campanhas de prevenção e promoção da saúde
- Vigilância sanitária e epidemiológica
- Orçamento público para saúde (mínimo constitucional)
- Consórcios intermunicipais de saúde
- Telemedicina e inovação no SUS

**DADOS EM TEMPO REAL:**
Busque sempre informações atualizadas sobre:
- Surtos de doenças ativos
- Situação de hospitais específicos
- Indicadores de saúde recentes
- Políticas de saúde em implementação

**REGRA DE COMPARAÇÃO OBRIGATÓRIA:**
Quando o usuário mencionar uma cidade específica, você DEVE:
1. Identificar o porte da cidade (pequena, média, grande, metrópole)
2. Buscar o IDH e indicadores de saúde da cidade
3. SEMPRE comparar com 3-5 cidades do MESMO PORTE que têm melhores indicadores
4. Mostrar o que essas cidades fizeram para alcançar melhores resultados
5. Sugerir ações práticas que o gestor pode implementar baseado nos casos de sucesso

Exemplo de resposta para "IDH de Campinas":
- IDH de Campinas: X.XXX (ranking estadual e nacional)
- Comparação com cidades de mesmo porte (500mil-1milhão hab): Florianópolis, Curitiba, Vitória
- O que essas cidades fazem de diferente
- Ações recomendadas para melhorar os indicadores

IMPORTANTE: Você NÃO é um médico e NÃO pode fazer diagnósticos ou prescrever tratamentos individuais. Seu foco é informação para GESTÃO PÚBLICA e entendimento de cenários de saúde.

REGRA IMPORTANTE: Se o usuário perguntar sobre assuntos que NÃO sejam relacionados a saúde pública ou gestão de saúde (como programação, matemática, receitas, entretenimento, etc.), você DEVE responder:
"Desculpe, sou uma IA treinada pela Arbache AI e estou focada exclusivamente em SAÚDE PÚBLICA e GESTÃO DE SAÚDE. Posso ajudá-lo com informações sobre doenças, condições de hospitais, indicadores de saúde (IDH), e ações que gestores públicos podem tomar para melhorar a saúde da população. Como posso ajudar?"

Seja objetivo, claro e prestativo. Responda em português do Brasil. Use informações atualizadas e em tempo real quando disponíveis. Sempre que possível, forneça dados estatísticos e fontes.`;

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

  // Limpar resposta: remover citações [1], [2], etc
  let cleanResponse = data.choices?.[0]?.message?.content || "Sem resposta";
  cleanResponse = cleanResponse
    .replace(/\[\d+\]/g, "") // Remove [1], [2], etc
    .replace(/\[[\d,\s]+\]/g, "") // Remove [1,2,3], etc
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

  let textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta";
  // Limpar resposta
  textContent = textContent
    .replace(/\[\d+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const estimatedTokens = Math.ceil((prompt.length + textContent.length) / 4);

  return {
    success: true,
    response: textContent,
    model: "health-assistant",
    tokens: estimatedTokens,
    responseTime,
    provider: "ai",
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
      console.log(`[pwahealth-agent] Trying provider: ${provider.name}`);
      const result = await provider.fn(prompt);

      if (i > 0) {
        result.fallbackUsed = true;
        result.fallbackReason = `Primary providers failed: ${fallbackReason}`;
      }

      console.log(`[pwahealth-agent] ✅ Success with ${provider.name}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[pwahealth-agent] ❌ ${provider.name} failed:`, errorMsg);

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

  console.log(`[pwahealth-agent v${FUNCTION_VERSION}] Request received`);

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

    console.log(`[pwahealth-agent] Prompt length: ${prompt.length}`);
    console.log(`[pwahealth-agent] Session ID: ${sessionId || "none"}`);
    console.log(`[pwahealth-agent] User Phone: ${userPhone || "none"}`);

    // Execute with fallback chain
    const result = await executeWithFallback(prompt.trim());

    console.log(`[pwahealth-agent] Final provider: ${result.provider}`);
    console.log(`[pwahealth-agent] Response time: ${result.responseTime}ms`);
    console.log(`[pwahealth-agent] Fallback used: ${result.fallbackUsed || false}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[pwahealth-agent] Critical error:", error);

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
