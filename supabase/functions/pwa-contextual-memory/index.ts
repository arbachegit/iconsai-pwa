// VERSAO: 1.0.0 | DEPLOY: 2026-01-08
// Memória Contextual por Módulo

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

interface ContextualMemory {
  moduleType: string;
  lastTopic: string;
  lastUserMessage: string;
  lastAssistantMessage: string;
  lastInteractionAt: string;
  interactionCount: number;
}

function extractTopicFromMessage(message: string): string {
  if (!message) return "o assunto anterior";
  
  const cleaned = message
    .toLowerCase()
    .replace(/[.,!?;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  const stopWords = ["eu", "meu", "minha", "tenho", "estou", "com", "uma", "um", "de", "que", "para", "por", "como", "você", "pode", "quero", "preciso", "ajuda"];
  const words = cleaned.split(" ").filter(w => w.length > 2 && !stopWords.includes(w));
  
  if (words.length === 0) return "o assunto anterior";
  
  const topicWords = words.slice(0, 5).join(" ");
  if (topicWords.length < 5) return "o assunto anterior";
  
  return topicWords;
}

function generateContextualGreeting(
  userName: string | null,
  moduleType: string,
  memory: ContextualMemory | null,
  isFirstEver: boolean
): { greeting: string; hasContext: boolean; moduleType: string; isFirstInteraction: boolean } {
  const name = userName || "";
  const namePrefix = name ? `${name}, ` : "";
  
  if (isFirstEver || !memory) {
    const firstGreetings: Record<string, string> = {
      health: `${namePrefix}olá! Sou sua assistente de saúde. Posso te ajudar a entender sintomas e orientar sobre quando procurar um médico. Como posso ajudar?`,
      ideas: `${namePrefix}bem-vindo ao módulo de ideias! Sou seu consultor usando a técnica do Advogado do Diabo. Vou te ajudar a fortalecer suas ideias através de questionamentos duros. O que você está planejando?`,
      world: `${namePrefix}olá! Sou seu analista de economia. Posso te atualizar sobre indicadores, mercado e notícias econômicas do Brasil e do mundo. O que gostaria de saber?`,
      help: `${namePrefix}oi! Posso te explicar como usar cada módulo do KnowYOU. O que você precisa de ajuda?`,
    };
    
    return {
      greeting: firstGreetings[moduleType] || `${namePrefix}olá! Como posso ajudar?`,
      hasContext: false,
      moduleType,
      isFirstInteraction: true,
    };
  }
  
  const lastInteraction = new Date(memory.lastInteractionAt);
  const now = new Date();
  const hoursSince = (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60);
  const topic = memory.lastTopic || extractTopicFromMessage(memory.lastUserMessage);
  
  // SAÚDE - Perguntar sobre melhora
  if (moduleType === "health") {
    if (hoursSince < 24) {
      return {
        greeting: `${namePrefix}que bom te ver de novo. Na última vez você mencionou ${topic}. Como está se sentindo agora? Houve alguma melhora?`,
        hasContext: true, moduleType, isFirstInteraction: false,
      };
    } else if (hoursSince < 72) {
      return {
        greeting: `${namePrefix}olá novamente. Faz uns dias que conversamos sobre ${topic}. Como você está? Os sintomas melhoraram?`,
        hasContext: true, moduleType, isFirstInteraction: false,
      };
    } else {
      return {
        greeting: `${namePrefix}que bom te ver! Da última vez falamos sobre ${topic}. Espero que esteja melhor. Como posso ajudar hoje?`,
        hasContext: true, moduleType, isFirstInteraction: false,
      };
    }
  }
  
  // IDEIAS - Perguntar sobre progresso
  if (moduleType === "ideas") {
    if (hoursSince < 24) {
      return {
        greeting: `${namePrefix}de volta tão cedo! Você estava trabalhando em ${topic}. Conseguiu avançar desde a última vez? Me conta o que aconteceu.`,
        hasContext: true, moduleType, isFirstInteraction: false,
      };
    } else if (hoursSince < 168) {
      return {
        greeting: `${namePrefix}boa! Lembro que você estava desenvolvendo ${topic}. Conseguiu implementar alguma coisa? Encontrou alguma solução?`,
        hasContext: true, moduleType, isFirstInteraction: false,
      };
    } else {
      return {
        greeting: `${namePrefix}há quanto tempo! Da última vez estávamos discutindo ${topic}. Como foi? Conseguiu tirar do papel?`,
        hasContext: true, moduleType, isFirstInteraction: false,
      };
    }
  }
  
  // MUNDO - Oferecer atualização
  if (moduleType === "world") {
    if (hoursSince < 24) {
      return {
        greeting: `${namePrefix}olá! Você perguntou sobre ${topic} recentemente. Quer que eu te atualize sobre novidades ou tem outra dúvida?`,
        hasContext: true, moduleType, isFirstInteraction: false,
      };
    } else {
      return {
        greeting: `${namePrefix}de volta! Da última vez você se interessou por ${topic}. O cenário econômico muda rápido. Quer uma atualização ou outro assunto?`,
        hasContext: true, moduleType, isFirstInteraction: false,
      };
    }
  }
  
  // AJUDA
  if (moduleType === "help") {
    return {
      greeting: `${namePrefix}oi! Precisa de ajuda com algo específico do app?`,
      hasContext: false, moduleType, isFirstInteraction: false,
    };
  }
  
  return {
    greeting: `${namePrefix}olá! Como posso ajudar?`,
    hasContext: false, moduleType, isFirstInteraction: false,
  };
}

async function getModuleMemory(supabase: any, deviceId: string, moduleType: string): Promise<ContextualMemory | null> {
  try {
    const { data: session } = await supabase
      .from("pwa_sessions")
      .select("id, user_name")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (!session) return null;
    
    const { data: lastUserMsg } = await supabase
      .from("pwa_messages")
      .select("content, created_at")
      .eq("session_id", session.id)
      .eq("agent_slug", moduleType)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    const { data: lastAssistantMsg } = await supabase
      .from("pwa_messages")
      .select("content, created_at")
      .eq("session_id", session.id)
      .eq("agent_slug", moduleType)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    const { count } = await supabase
      .from("pwa_messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.id)
      .eq("agent_slug", moduleType)
      .eq("role", "user");
    
    if (!lastUserMsg) return null;
    
    return {
      moduleType,
      lastTopic: extractTopicFromMessage(lastUserMsg.content),
      lastUserMessage: lastUserMsg.content,
      lastAssistantMessage: lastAssistantMsg?.content || "",
      lastInteractionAt: lastUserMsg.created_at,
      interactionCount: count || 0,
    };
  } catch (err) {
    return null;
  }
}

// Removed isFirstEverInteraction - now we use memory === null to determine first module interaction
// This ensures each module is treated independently

async function getUserName(supabase: any, deviceId: string): Promise<string | null> {
  try {
    const { data: session } = await supabase
      .from("pwa_sessions")
      .select("user_name")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    return session?.user_name || null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    const { deviceId, moduleType, action } = await req.json();
    
    if (!deviceId || !moduleType) {
      return new Response(
        JSON.stringify({ error: "deviceId e moduleType são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    if (action === "getGreeting" || !action) {
      const [memory, userName] = await Promise.all([
        getModuleMemory(supabase, deviceId, moduleType),
        getUserName(supabase, deviceId),
      ]);
      
      // isFirst is now determined by module-specific memory (not global)
      const isFirst = !memory;
      const greeting = generateContextualGreeting(userName, moduleType, memory, isFirst);
      
      return new Response(
        JSON.stringify(greeting),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (action === "getMemory") {
      const memory = await getModuleMemory(supabase, deviceId, moduleType);
      return new Response(
        JSON.stringify({ memory }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (action === "getHistory") {
      const { data: session } = await supabase
        .from("pwa_sessions")
        .select("id")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (!session) {
        return new Response(
          JSON.stringify({ messages: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { data: messages } = await supabase
        .from("pwa_messages")
        .select("role, content, created_at")
        .eq("session_id", session.id)
        .eq("agent_slug", moduleType)
        .order("created_at", { ascending: false })
        .limit(20);
      
      return new Response(
        JSON.stringify({ messages: (messages || []).reverse() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "Ação não reconhecida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
