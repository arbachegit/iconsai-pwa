// VERSAO: 1.0.0 | DEPLOY: 2026-01-09
// Orquestra geração de conteúdo com GPT-4o-mini

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrchestratorRequest {
  query: string;
  moduleType: string;
  deviceId: string;
  context?: string[];
}

// Palavras-chave que indicam necessidade de dados em tempo real
const REALTIME_KEYWORDS = [
  "hoje", "atual", "agora", "cotação", "preço",
  "dólar", "euro", "ibovespa", "selic", "ipca",
  "tempo", "previsão", "notícia", "última hora",
  "ontem", "semana", "mês", "ano"
];

// System prompts especializados por módulo
const SYSTEM_PROMPTS: Record<string, string> = {
  world: `Você é um especialista sênior em economia e finanças, com profundo conhecimento do mercado brasileiro e internacional.

Sua expertise inclui:
- Análise macroeconômica (PIB, inflação, juros, câmbio)
- Mercado de capitais e investimentos
- Indicadores econômicos brasileiros (IPCA, Selic, IBGE)
- Cenários econômicos e projeções

Responda de forma clara e objetiva em português brasileiro.
Use dados e exemplos quando relevante.
Mantenha respostas concisas mas informativas.`,

  health: `Você é um especialista em saúde e bem-estar, com conhecimento abrangente sobre medicina, nutrição e qualidade de vida.

Sua expertise inclui:
- Informações gerais de saúde
- Orientações sobre bem-estar
- Interpretação de sintomas (de forma geral)
- Hábitos saudáveis

IMPORTANTE: Sempre recomende que o usuário consulte um médico ou profissional de saúde para diagnósticos e tratamentos.
Nunca faça diagnósticos definitivos.
Responda em português brasileiro de forma empática e acolhedora.`,

  ideas: `Você é um especialista em inovação e empreendedorismo, com vasta experiência em startups, tecnologia e modelos de negócio.

Sua expertise inclui:
- Metodologias ágeis e lean startup
- Análise de mercado e tendências
- Estratégias de crescimento
- Transformação digital
- Pitch e captação de investimentos

Seja inspirador mas realista. Ofereça insights acionáveis.
Use a técnica do "advogado do diabo" para fortalecer ideias.
Responda em português brasileiro.`,

  help: `Você é o assistente de ajuda do aplicativo KnowYOU.

Sua função é:
- Explicar funcionalidades do app
- Ajudar com navegação e uso
- Resolver dúvidas sobre os módulos (Mundo, Saúde, Ideias)
- Orientar sobre configurações

O app KnowYOU tem 4 módulos principais:
1. MUNDO - Informações sobre economia, finanças e atualidades
2. SAÚDE - Orientações de saúde e bem-estar
3. IDEIAS - Consultoria para inovação e empreendedorismo
4. AJUDA - Suporte e orientações sobre o app

Seja amigável, claro e objetivo.
Responda em português brasileiro.`
};

function needsRealtimeData(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return REALTIME_KEYWORDS.some(keyword => lowerQuery.includes(keyword));
}

async function generateContent(
  query: string, 
  moduleType: string, 
  context?: string[]
): Promise<{
  content: string;
  sources: string[];
  confidence: number;
}> {
  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!openAIApiKey) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  const systemPrompt = SYSTEM_PROMPTS[moduleType] || SYSTEM_PROMPTS.help;
  const needsRealtime = needsRealtimeData(query);
  
  // Construir mensagens
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt }
  ];
  
  // Adicionar contexto se fornecido
  if (context && context.length > 0) {
    messages.push({
      role: "system",
      content: `Contexto anterior da conversa:\n${context.join("\n")}`
    });
  }
  
  // Adicionar aviso sobre dados em tempo real
  if (needsRealtime) {
    messages.push({
      role: "system",
      content: "NOTA: O usuário está perguntando sobre dados em tempo real. Indique claramente que seus dados têm uma data de corte e recomende verificar fontes atualizadas."
    });
  }
  
  // Adicionar query do usuário
  messages.push({ role: "user", content: query });

  console.log(`[content-orchestrator] Calling OpenAI with ${messages.length} messages`);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAIApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[content-orchestrator] OpenAI error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";
  
  // Determinar confidence baseado no módulo e necessidade de dados em tempo real
  let confidence = 0.85;
  if (needsRealtime) {
    confidence = 0.65; // Menor confidence para dados que precisam de atualização
  }
  if (moduleType === "health") {
    confidence = Math.min(confidence, 0.70); // Health sempre tem disclaimer
  }
  
  // Definir sources
  const sources: string[] = ["OpenAI GPT-4o-mini"];
  if (needsRealtime) {
    sources.push("Dados podem não estar atualizados");
  }
  
  return { content, sources, confidence };
}

serve(async (req: Request) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Validate POST method
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  try {
    const body: OrchestratorRequest = await req.json();
    
    // Validate required fields
    if (!body.query || !body.moduleType || !body.deviceId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Campos obrigatórios: query, moduleType, deviceId" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate moduleType
    const validModules = ["world", "health", "ideas", "help"];
    if (!validModules.includes(body.moduleType)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "moduleType deve ser: world, health, ideas ou help" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[content-orchestrator] Query: "${body.query.substring(0, 50)}..." | Module: ${body.moduleType} | Device: ${body.deviceId}`);
    
    // Generate content
    const result = await generateContent(body.query, body.moduleType, body.context);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`[content-orchestrator] Generated ${result.content.length} chars in ${processingTime}ms | Confidence: ${result.confidence}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        content: result.content,
        sources: result.sources,
        confidence: result.confidence,
        processingTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error("[content-orchestrator] Erro:", error.message || error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro interno do servidor",
        processingTime
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
