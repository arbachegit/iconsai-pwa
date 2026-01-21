// ============================================
// VERSÃO: 1.0.0 | DEPLOY: 2026-01-08
// FUNÇÃO: Geração de saudação contextual com memória persistente
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logger.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

interface UserContext {
  id: string;
  device_id: string;
  user_name: string | null;
  interaction_count: number;
  last_module: string | null;
  last_topic_summary: string | null;
  last_user_message: string | null;
  last_interaction_at: string | null;
}

interface GreetingRequest {
  deviceId: string;
  moduleId?: string;
  userName?: string;
}

interface GreetingResponse {
  greeting: string;
  isFirstInteraction: boolean;
  lastModule: string | null;
  lastTopicSummary: string | null;
  interactionCount: number;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const logger = createLogger("generate-contextual-greeting");

  try {
    const { deviceId, moduleId, userName } = (await req.json()) as GreetingRequest;

    if (!deviceId) {
      return errorResponse("deviceId é obrigatório", 400);
    }

    logger.info("Generating contextual greeting", { deviceId, moduleId, userName });

    const supabase = getSupabaseAdmin();

    // Buscar contexto do usuário
    const { data: userContext, error: fetchError } = await supabase
      .from("pwa_user_context")
      .select("*")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (fetchError) {
      logger.error("Error fetching user context", { error: fetchError.message });
      throw new Error("Erro ao buscar contexto do usuário");
    }

    // Se não existe contexto, é primeira interação - usar welcome_text do pwa_config
    if (!userContext || userContext.interaction_count === 0) {
      // Buscar welcome_text completo do pwa_config
      const { data: configData } = await supabase
        .from("pwa_config")
        .select("config_value")
        .eq("config_key", "welcome_text")
        .single();
      
      let neutralGreeting = configData?.config_value || 
        "Olá, eu sou o KnowYOU, seu assistente de voz. Escolha um dos módulos abaixo para começarmos.";
      
      // Substituir [name] pelo nome do usuário se existir
      const displayName = userName || userContext?.user_name;
      if (displayName) {
        neutralGreeting = neutralGreeting.replace("[name]", displayName);
      } else {
        // Remover placeholder [name] se não tiver nome
        neutralGreeting = neutralGreeting.replace("[name]! ", "").replace("[name]", "");
      }

      logger.info("First interaction, returning full welcome text", { deviceId });

      return new Response(
        JSON.stringify({
          greeting: neutralGreeting,
          isFirstInteraction: true,
          lastModule: null,
          lastTopicSummary: null,
          interactionCount: 0,
        } as GreetingResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Usuário retornando - gerar saudação contextual via IA
    const context = userContext as UserContext;
    const displayName = userName || context.user_name || "você";
    const lastModule = context.last_module;
    const lastTopic = context.last_topic_summary;

    // Construir prompt baseado no módulo anterior
    let prompt = "";
    
    if (lastModule === "ideas") {
      prompt = `Gere uma saudação empática e natural para ${displayName}. 
Na última conversa, ele estava planejando ou discutindo: "${lastTopic || 'uma ideia de negócio'}".
Pergunte de forma direta e natural se conseguiu avançar, concluir ou encontrar uma solução para aquilo que estava planejando.
REGRAS:
- Máximo 2 frases curtas
- Não use linguagem de resumo automático ou robótica
- Soe como um amigo que lembra da conversa anterior
- Seja genuíno e interessado
- Não mencione que você é IA ou assistente`;
    } else if (lastModule === "health") {
      prompt = `Gere uma saudação empática para ${displayName}.
Na última conversa, ele relatou sintomas ou questões de saúde relacionados a: "${lastTopic || 'questões de saúde'}".
Pergunte com cuidado e empatia se houve melhora nos sintomas relatados.
REGRAS:
- Máximo 2 frases curtas
- Seja genuíno e empático, não robótico
- Demonstre preocupação real
- Não dê conselhos médicos
- Não mencione que você é IA ou assistente`;
    } else if (lastModule === "world") {
      prompt = `Gere uma saudação de retorno para ${displayName}.
Na última conversa, vocês discutiram sobre: "${lastTopic || 'economia e notícias'}".
Mencione brevemente o tema e pergunte se quer continuar ou tem outra dúvida.
REGRAS:
- Máximo 2 frases curtas
- Soe natural, como continuidade de conversa
- Não seja formal demais
- Não mencione que você é IA ou assistente`;
    } else if (lastModule === "help") {
      prompt = `Gere uma saudação de retorno para ${displayName}.
Na última conversa, você ajudou com: "${lastTopic || 'uma dúvida sobre o sistema'}".
Pergunte se a dúvida foi resolvida ou se precisa de mais ajuda.
REGRAS:
- Máximo 2 frases curtas
- Seja prestativo e amigável
- Não mencione que você é IA ou assistente`;
    } else {
      // Módulo desconhecido ou genérico
      prompt = `Gere uma saudação de retorno amigável para ${displayName}.
Na última conversa, vocês conversaram sobre: "${lastTopic || 'diversos assuntos'}".
Faça uma referência breve e natural ao assunto anterior.
REGRAS:
- Máximo 2 frases curtas
- Soe natural e amigável
- Não mencione que você é IA ou assistente`;
    }

    // Chamar IA para gerar saudação
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um assistente amigável que gera saudações naturais e empáticas em português brasileiro. Responda APENAS com a saudação, sem explicações ou prefixos.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 150,
      }),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      logger.error("AI Gateway error", { status: aiResponse.status, body: errorBody });
      
      // Fallback: saudação genérica com nome
      const fallbackGreeting = `Olá, ${displayName}! Que bom te ver de volta. Como posso ajudar hoje?`;
      
      return new Response(
        JSON.stringify({
          greeting: fallbackGreeting,
          isFirstInteraction: false,
          lastModule,
          lastTopicSummary: lastTopic,
          interactionCount: context.interaction_count,
        } as GreetingResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedGreeting = aiData.choices?.[0]?.message?.content?.trim() || 
      `Olá, ${displayName}! Que bom te ver de volta.`;

    logger.info("Generated contextual greeting", { 
      deviceId, 
      greeting: generatedGreeting.substring(0, 50),
      lastModule,
    });

    return new Response(
      JSON.stringify({
        greeting: generatedGreeting,
        isFirstInteraction: false,
        lastModule,
        lastTopicSummary: lastTopic,
        interactionCount: context.interaction_count,
      } as GreetingResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logger.error("Error in generate-contextual-greeting", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
    return errorResponse(
      error instanceof Error ? error.message : "Erro ao gerar saudação",
      500
    );
  }
});
