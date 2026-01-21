// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const ANALYSIS_PROMPT = `# Role (Papel)
Você é um Especialista em Lógica Semântica e Engenharia de Prompt. Sua função é analisar perguntas feitas por humanos e classificá-las rigorosamente entre "Determinísticas" e "Não-Determinísticas".

# Definições

1. **PERGUNTA DETERMINÍSTICA:**
   - Busca um fato objetivo, um dado quantitativo, um valor booleano (True/False) ou uma seleção de lista fechada.
   - Não há ambiguidade. Diferentes observadores chegariam à mesma resposta exata.
   - Tipos: binary (Sim/Não), data_retrieval (valor específico), quantitative (número exato), selective (opções fechadas), definition (significado técnico)
   - Exemplos: "Qual a data de hoje?", "O valor é maior que 10?", "O servidor retornou erro 404 ou 500?".

2. **PERGUNTA NÃO-DETERMINÍSTICA:**
   - Busca uma opinião, um sentimento, uma estimativa vaga ou depende de contexto não fornecido.
   - Contém adjetivos subjetivos (bom, ruim, rápido, estranho, interessante).
   - Exemplos: "Como você está?", "O site está lento?", "O que você acha disso?".

# Tarefa
Para cada input do usuário, você deve executar os seguintes passos:

1. **Classificação:** Rotule como "deterministic" ou "non-deterministic".
2. **Análise:** Explique brevemente o porquê da classificação.
3. **Refatoração (Apenas se for Não-Determinística):** Reescreva a pergunta do usuário transformando-a em uma versão determinística.
4. **Tipo (Apenas se for Determinística):** Classifique como: binary, data_retrieval, quantitative, selective, ou definition.

# Exemplos de Treinamento

Input: "O código está rodando bem?"
Output:
- classification: "non-deterministic"
- analysis: "O termo 'bem' é subjetivo. Pode significar sem erros, rápido ou eficiente."
- refactored_version: "O código executou sem retornar exceções nos logs de erro?"
- question_type: null

Input: "Quantas linhas tem o arquivo main.py?"
Output:
- classification: "deterministic"
- analysis: "Solicita uma contagem exata e verificável de um objeto específico."
- refactored_version: null
- question_type: "quantitative"

Input: "A interface está bonita?"
Output:
- classification: "non-deterministic"
- analysis: "Beleza é subjetiva. Não é mensurável metricamente sem critérios definidos."
- refactored_version: "A interface segue a paleta de cores hexadecimal definida no Design System?"
- question_type: null

Input: "O servidor está online?"
Output:
- classification: "deterministic"
- analysis: "Pergunta binária com resposta verificável (Sim/Não)."
- refactored_version: null
- question_type: "binary"

# IMPORTANTE
Responda APENAS em formato JSON válido, sem markdown, sem código:
{
  "classification": "deterministic" | "non-deterministic",
  "analysis": "string explicativa",
  "refactored_version": "string ou null",
  "question_type": "binary" | "data_retrieval" | "quantitative" | "selective" | "definition" | null
}

# Input Atual
Analise a seguinte frase do usuário:`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, sessionId, chatType } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];

    // Filter only user messages
    const userMessages = messages.filter((m: any) => m.role === "user" && m.content?.trim());

    for (const message of userMessages) {
      const userContent = message.content.trim();
      
      // Skip very short messages or commands
      if (userContent.length < 5 || userContent.startsWith("/")) {
        continue;
      }

      console.log(`Analyzing message: "${userContent.substring(0, 50)}..."`);

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: ANALYSIS_PROMPT },
              { role: "user", content: `"${userContent}"` }
            ],
            max_tokens: 500,
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          console.error(`AI API error: ${response.status}`);
          continue;
        }

        const aiData = await response.json();
        const aiContent = aiData.choices?.[0]?.message?.content?.trim();

        if (!aiContent) {
          console.error("Empty AI response");
          continue;
        }

        // Parse JSON response
        let analysis;
        try {
          // Remove potential markdown code blocks
          const cleanContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          analysis = JSON.parse(cleanContent);
        } catch (parseError) {
          console.error("Failed to parse AI response:", aiContent);
          continue;
        }

        // Insert into database
        const { data: insertedData, error: insertError } = await supabase
          .from("deterministic_analysis")
          .insert({
            conversation_id: conversationId || null,
            session_id: sessionId || "unknown",
            chat_type: chatType || "unknown",
            original_message: userContent,
            classification: analysis.classification || "non-deterministic",
            analysis_reason: analysis.analysis || null,
            refactored_version: analysis.refactored_version || null,
            question_type: analysis.question_type || null,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          results.push(insertedData);
        }

      } catch (msgError) {
        console.error("Error processing message:", msgError);
      }
    }

    console.log(`Analyzed ${results.length} messages`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analyzed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-deterministic error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
