// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { prompt } = await req.json();

    // Validação básica de entrada
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (prompt.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Prompt muito longo (máximo 1000 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Guardrail: apenas imagens relacionadas a IA / KnowRISK / ACC / tecnologia
    const studyKeywords = [
      // Português
      "ia", "inteligência artificial", "knowrisk", "knowyou", "acc",
      "arquitetura cognitiva", "arquitetura comportamental", "chatbot",
      "modelo de linguagem", "rag", "fluxo rag", "pipeline rag",
      "dados", "algoritmo", "rede neural", "machine learning",
      // English
      "ai", "artificial intelligence", "language model", "large language model",
      "llm", "rag flow", "rag pipeline", "neural network", "machine learning",
      "data pipeline", "vector database"
    ];

    const promptLower = prompt.toLowerCase();
    const containsStudyKeyword = studyKeywords.some((keyword) => promptLower.includes(keyword));

    if (!containsStudyKeyword) {
      console.log("❌ Prompt rejeitado (fora do escopo IA/KnowRISK):", prompt);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "guardrail_violation",
          rejected_term: prompt.trim(),
          scope: "study"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Prompt aprovado (study):", prompt);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const enhancedPrompt = `Crie uma imagem conceitual, futurista e educativa sobre IA/KnowRISK para o seguinte tema: ${prompt}. A imagem deve ser clara, didática e alinhada ao contexto de tecnologia e ACC (Arquitetura Cognitiva e Comportamental), sem texto escrito na imagem.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de uso excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const errorText = await response.text();
      console.error("Erro no AI gateway (study):", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar imagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("Formato de resposta inesperado (study):", data);
      return new Response(
        JSON.stringify({ error: "Erro ao processar imagem gerada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Erro ao gerar imagem (study):", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido ao gerar imagem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
