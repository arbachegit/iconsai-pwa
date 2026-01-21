// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Keywords genéricas de saúde que SEMPRE são permitidas no chat health
// Independente das tags do RAG, estas palavras são intrinsecamente relacionadas à saúde
const healthGenericKeywords = [
  // Anatomia geral
  "anatomia", "corpo", "humano", "órgão", "órgãos", "sistema",
  "crânio", "cabeça", "cérebro", "encéfalo", "neurônio", "nervo", "nervos",
  "coração", "cardíaco", "cardiovascular", "vascular", "artéria", "veia", "sangue",
  "pulmão", "pulmões", "respiratório", "respiração", "brônquio",
  "fígado", "hepatico", "vesícula", "bile",
  "rim", "rins", "renal", "urinário", "bexiga",
  "estômago", "intestino", "digestivo", "digestão", "esôfago",
  "osso", "ossos", "esqueleto", "coluna", "vertebra", "articulação",
  "músculo", "músculos", "muscular", "tendão",
  "pele", "derme", "epiderme", "cutâneo",
  "olho", "olhos", "visão", "retina", "córnea",
  "ouvido", "audição", "auditivo", "tímpano",
  // Termos médicos gerais
  "saúde", "médico", "medicina", "hospital", "clínica", "consultório",
  "paciente", "tratamento", "terapia", "diagnóstico", "exame",
  "doença", "enfermidade", "patologia", "sintoma", "sintomas",
  "cirurgia", "procedimento", "operação", "cirúrgico",
  "enfermagem", "enfermeiro", "enfermeira",
  "farmácia", "medicamento", "remédio", "droga", "fármaco",
  "vacina", "imunização", "imunidade",
  "bem-estar", "nutrição", "dieta", "alimentação",
  "fisioterapia", "reabilitação",
  "saúde mental", "psicologia", "psiquiatria",
  "prevenção", "preventivo", "screening",
  // Especialidades
  "cardiologia", "neurologia", "ortopedia", "pediatria", "geriatria",
  "oncologia", "câncer", "tumor", "neoplasia",
  "ginecologia", "obstetrícia", "gestação", "gravidez",
  "urologia", "dermatologia", "oftalmologia", "otorrinolaringologia",
  // Exames e procedimentos
  "raio-x", "tomografia", "ressonância", "ultrassom", "ecografia",
  "biópsia", "endoscopia", "colonoscopia",
  "hemograma", "glicemia", "colesterol",
  // Hospital Moinhos de Vento específico
  "moinhos", "vento", "hospital moinhos"
];

// Keywords genéricas para o chat study (IA, KnowRISK, ACC)
const studyGenericKeywords = [
  "ia", "inteligência artificial", "machine learning", "aprendizado de máquina",
  "knowrisk", "knowyou", "acc", "arquitetura cognitiva", "comportamental",
  "turing", "chatgpt", "gpt", "llm", "modelo de linguagem",
  "rede neural", "deep learning", "algoritmo", "automação",
  "cognição", "cognitivo", "comportamento", "metodologia"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, chatType = "health" } = await req.json();
    
    // Validação de entrada
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt inválido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (prompt.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Prompt muito longo (máximo 1000 caracteres)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Buscar scope_topics e tags do banco de dados
    const { data: configData, error: configError } = await supabaseClient
      .from("chat_config")
      .select("scope_topics, document_tags_data")
      .eq("chat_type", chatType)
      .single();

    if (configError) {
      console.error("Erro ao buscar configuração:", configError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar escopo permitido" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Construir lista de keywords permitidas
    const allowedKeywords: string[] = [];
    
    // 1. PRIMEIRO: Adicionar keywords genéricas baseadas no tipo de chat
    // Estas são SEMPRE permitidas, independente das tags RAG
    if (chatType === "health") {
      allowedKeywords.push(...healthGenericKeywords);
      console.log(`✅ Adicionadas ${healthGenericKeywords.length} keywords genéricas de saúde`);
    } else if (chatType === "study") {
      allowedKeywords.push(...studyGenericKeywords);
      console.log(`✅ Adicionadas ${studyGenericKeywords.length} keywords genéricas de estudo`);
    }
    
    // 2. DEPOIS: Adicionar scope_topics (tags parent com alta confiança) do RAG
    if (configData?.scope_topics && Array.isArray(configData.scope_topics)) {
      allowedKeywords.push(...configData.scope_topics.map((t: string) => t.toLowerCase()));
    }
    
    // 3. POR ÚLTIMO: Adicionar todas as tags (parent e child) do document_tags_data
    if (configData?.document_tags_data && Array.isArray(configData.document_tags_data)) {
      configData.document_tags_data.forEach((tag: { tag_name: string }) => {
        if (tag.tag_name) {
          allowedKeywords.push(tag.tag_name.toLowerCase());
        }
      });
    }

    // Se não houver keywords configuradas (improvável com as genéricas), rejeitar
    if (allowedKeywords.length === 0) {
      console.log("❌ Nenhum escopo configurado para o chat:", chatType);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "scope_not_configured",
          message: "Nenhum escopo de conteúdo configurado. Adicione documentos ao RAG primeiro."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar se o prompt contém alguma keyword permitida
    const promptLower = prompt.toLowerCase();
    const containsAllowedKeyword = allowedKeywords.some(keyword => 
      promptLower.includes(keyword)
    );

    // Log detalhado para debug
    const matchedKeywords = allowedKeywords.filter(keyword => promptLower.includes(keyword));
    
    if (!containsAllowedKeyword) {
      console.log(`❌ Prompt rejeitado (fora do escopo ${chatType}):`, prompt);
      console.log("Keywords permitidas (amostra):", allowedKeywords.slice(0, 30), "...");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "guardrail_violation",
          rejected_term: prompt.trim(),
          scope: chatType,
          message: `Conteúdo fora do escopo permitido para ${chatType === "health" ? "saúde" : "estudo"}.`
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Prompt aprovado (${chatType}):`, prompt);
    console.log(`   Keywords correspondentes: [${matchedKeywords.join(", ")}]`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log("Gerando imagem com prompt:", prompt);

    // Criar prompt contextualizado baseado no tipo de chat
    const contextPrefix = chatType === "health" 
      ? "Crie uma imagem educativa, profissional e cientificamente precisa sobre saúde para o seguinte tema:"
      : "Crie uma imagem educativa e profissional sobre tecnologia e IA para o seguinte tema:";
    
    const enhancedPrompt = `${contextPrefix} ${prompt}. A imagem deve ser clara, didática e apropriada para profissionais.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: enhancedPrompt,
          }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Limite de uso excedido. Tente novamente em alguns instantes." 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Créditos insuficientes. Adicione créditos ao workspace." 
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("Erro no AI gateway:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar imagem" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("Resposta da API:", JSON.stringify(data).substring(0, 200));

    // Extrair a imagem base64 da resposta
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("Formato de resposta inesperado:", data);
      return new Response(
        JSON.stringify({ error: "Erro ao processar imagem gerada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Convert Base64 to binary
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    console.log(`Binary size: ${binaryData.length} bytes`);

    // Generate unique filename based on timestamp
    const fileName = `chat-image-${Date.now()}.webp`;
    
    // Upload to Storage as WebP
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('content-images')
      .upload(fileName, binaryData, {
        contentType: 'image/webp',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Fallback to Base64 if storage fails
      return new Response(
        JSON.stringify({ imageUrl }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabaseClient
      .storage
      .from('content-images')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;
    console.log('Image uploaded to Storage:', publicUrl);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Erro ao gerar imagem:", e);
    return new Response(
      JSON.stringify({ 
        error: e instanceof Error ? e.message : "Erro desconhecido ao gerar imagem" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
