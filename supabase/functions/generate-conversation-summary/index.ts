/**
 * ============================================================
 * generate-conversation-summary - Edge Function v1.0.0
 * ============================================================
 * Gera resumo de conversa ao sair de um módulo
 * Salva em pwa_conversation_summaries e atualiza pwa_user_context
 * ============================================================
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

async function generateSummary(messages: Message[]): Promise<string> {
  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!openAIApiKey) {
    // Fallback: gerar resumo simples sem IA
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length === 0) return "Nenhuma mensagem do usuário";
    
    // Pegar as primeiras palavras da última mensagem do usuário
    const lastUserMessage = userMessages[userMessages.length - 1].content;
    const words = lastUserMessage.split(" ").slice(0, 10).join(" ");
    return words.length < lastUserMessage.length ? `${words}...` : words;
  }

  try {
    const conversationText = messages
      .map(m => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um assistente que resume conversas. 
Gere um resumo MUITO CURTO (máximo 50 palavras) do tema principal discutido.
Foque no que o usuário perguntou ou no problema mencionado.
Responda em português brasileiro.
Não use aspas ou formatação especial.`
          },
          {
            role: "user",
            content: `Resuma esta conversa:\n\n${conversationText}`
          }
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Conversa sobre diversos temas";
  } catch (error) {
    console.error("[generate-summary] Erro ao gerar resumo com IA:", error);
    
    // Fallback
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length === 0) return "Conversa sem mensagens do usuário";
    
    const lastUserMessage = userMessages[userMessages.length - 1].content;
    const words = lastUserMessage.split(" ").slice(0, 10).join(" ");
    return words.length < lastUserMessage.length ? `${words}...` : words;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deviceId, moduleType, messages } = await req.json();

    if (!deviceId || !moduleType || !messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validModules = ["health", "ideas", "world", "help"];
    if (!validModules.includes(moduleType)) {
      return new Response(
        JSON.stringify({ error: "Invalid module type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-summary] Processing ${messages.length} messages for ${moduleType}`);

    const supabase = getSupabaseAdmin();

    // Gerar resumo
    const summary = await generateSummary(messages);
    console.log(`[generate-summary] Summary generated: ${summary.substring(0, 50)}...`);

    // Encontrar última mensagem de cada tipo
    const userMessages = messages.filter((m: Message) => m.role === "user");
    const assistantMessages = messages.filter((m: Message) => m.role === "assistant");
    
    const lastUserMessage = userMessages.length > 0 
      ? userMessages[userMessages.length - 1].content 
      : null;
    const lastAssistantMessage = assistantMessages.length > 0 
      ? assistantMessages[assistantMessages.length - 1].content 
      : null;

    // Upsert em pwa_conversation_summaries
    const { error: summaryError } = await supabase
      .from("pwa_conversation_summaries")
      .upsert(
        {
          device_id: deviceId,
          module_type: moduleType,
          summary,
          message_count: messages.length,
          last_user_message: lastUserMessage,
          last_assistant_message: lastAssistantMessage,
          updated_at: new Date().toISOString(),
        },
        { 
          onConflict: "device_id,module_type",
          ignoreDuplicates: false 
        }
      );

    if (summaryError) {
      console.error("[generate-summary] Error saving summary:", summaryError);
      
      // Tentar insert se upsert falhou (pode não ter constraint)
      const { error: insertError } = await supabase
        .from("pwa_conversation_summaries")
        .insert({
          device_id: deviceId,
          module_type: moduleType,
          summary,
          message_count: messages.length,
          last_user_message: lastUserMessage,
          last_assistant_message: lastAssistantMessage,
        });
      
      if (insertError) {
        console.error("[generate-summary] Insert also failed:", insertError);
      }
    }

    // Atualizar pwa_user_context com último módulo
    const { error: contextError } = await supabase
      .from("pwa_user_context")
      .upsert(
        {
          device_id: deviceId,
          last_module: moduleType,
          last_topic_summary: summary,
          last_user_message: lastUserMessage,
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "device_id" }
      );

    if (contextError) {
      console.warn("[generate-summary] Error updating context:", contextError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        messageCount: messages.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[generate-summary] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
