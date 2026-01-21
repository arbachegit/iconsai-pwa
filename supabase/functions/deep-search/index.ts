// =============================================
// DEEP-SEARCH
// Busca conhecimento externo quando RAG local não encontra
// Usa OpenAI GPT-4o-mini com cache inteligente
// Auto-indexa novo conhecimento no banco
// =============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeepSearchRequest {
  query: string;
  context?: string;
  agentSlug?: string;
  autoIndex?: boolean;
  checkCacheFirst?: boolean;
}

interface SearchSource {
  url: string | null;
  name: string;
  type: "gov" | "academic" | "news" | "institutional" | "web" | "ai";
}

interface DeepSearchResponse {
  success: boolean;
  answer: string;
  source: SearchSource;
  fromCache: boolean;
  autoIndexed: boolean;
  confidence: number;
}

// Gerar tags automaticamente a partir do conteúdo
function generateAutoTags(query: string, answer: string): string[] {
  const text = `${query} ${answer}`.toLowerCase();
  
  // Palavras-chave econômicas brasileiras
  const economicKeywords = [
    "selic", "ipca", "pib", "inflação", "dólar", "câmbio", "juros",
    "desemprego", "renda", "varejo", "consumo", "exportação", "importação",
    "ibge", "bcb", "ipea", "copom", "cdi", "igpm", "inpc"
  ];
  
  // Palavras-chave de saúde
  const healthKeywords = [
    "saúde", "hospital", "leito", "internação", "sus", "datasus",
    "mortalidade", "epidemia", "vacina", "médico", "enfermeiro"
  ];
  
  // Palavras-chave gerais importantes
  const generalKeywords = [
    "brasil", "brasileiro", "federal", "estadual", "municipal",
    "governo", "ministério", "política", "economia", "social"
  ];
  
  const allKeywords = [...economicKeywords, ...healthKeywords, ...generalKeywords];
  
  const foundTags = allKeywords.filter(keyword => text.includes(keyword));
  
  // Extrair palavras significativas do query (substantivos)
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => 
      word.length > 4 && 
      !["qual", "como", "onde", "quando", "porque", "para", "sobre", "está", "seria", "pode"].includes(word)
    )
    .slice(0, 3);
  
  // Combinar e remover duplicatas
  const tags = [...new Set([...foundTags, ...queryWords])].slice(0, 8);
  
  return tags;
}

// Gerar slug primário
function generateSlug(query: string, tags: string[]): string {
  if (tags.length > 0) {
    return tags.slice(0, 3).join("-");
  }
  
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .slice(0, 3)
    .join("-");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("=== DEEP-SEARCH START ===");

  // Cache do embedding para reutilização no auto-index
  let cachedEmbedding: number[] | null = null;

  try {
    // Parse request
    const {
      query,
      context,
      agentSlug,
      autoIndex = true,
      checkCacheFirst = true
    }: DeepSearchRequest = await req.json();

    if (!query || query.trim().length < 3) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Query deve ter pelo menos 3 caracteres"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔍 Query: "${query}"`);
    console.log(`📝 Context: ${context ? "Sim" : "Não"}`);
    console.log(`🤖 Agent: ${agentSlug || "default"}`);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      console.error("❌ OPENAI_API_KEY não configurada");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Serviço de busca não configurado"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // STEP 1: Verificar cache local primeiro
    // =============================================
    if (checkCacheFirst) {
      console.log("📚 Verificando cache local...");
      
      try {
        // Gerar embedding do query
        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: query
          })
        });

        if (!embeddingResponse.ok) {
          console.warn("⚠️ Erro ao gerar embedding para cache check");
        } else {
          const embeddingData = await embeddingResponse.json();
          const queryEmbedding = embeddingData.data?.[0]?.embedding;

          // Guardar embedding para reutilização no auto-index
          if (queryEmbedding) {
            cachedEmbedding = queryEmbedding;
          }

          if (queryEmbedding) {
            // Buscar conhecimento similar no cache
            const { data: cachedKnowledge, error: cacheError } = await supabase.rpc("search_deep_knowledge", {
              query_embedding: queryEmbedding,
              match_threshold: 0.75,
              match_count: 1
            });

            if (cacheError) {
              console.warn("⚠️ Erro ao buscar cache:", cacheError.message);
            } else if (cachedKnowledge && cachedKnowledge.length > 0) {
              const cached = cachedKnowledge[0];
              console.log(`✅ Cache hit! Similarity: ${cached.similarity.toFixed(3)}`);
              
              // Incrementar uso
              await supabase.rpc("increment_knowledge_usage", {
                knowledge_id: cached.id
              });

              return new Response(
                JSON.stringify({
                  success: true,
                  answer: cached.answer,
                  source: {
                    url: cached.source_url || null,
                    name: cached.source_name || "Cache KnowYOU",
                    type: cached.source_type || "ai"
                  },
                  fromCache: true,
                  autoIndexed: false,
                  confidence: cached.confidence || 0.8
                } as DeepSearchResponse),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
      } catch (cacheError) {
        console.warn("⚠️ Erro ao verificar cache:", cacheError);
      }
    }

    console.log("🌐 Cache miss - buscando com OpenAI...");

    // =============================================
    // STEP 2: Buscar com OpenAI
    // =============================================
    let answer = "";
    const source: SearchSource = { url: null, name: "OpenAI", type: "ai" };
    const confidence = 0.75;

    try {
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um especialista em economia e dados brasileiros, atuando como consultor estratégico.

REGRAS DE RESPOSTA:
- Responda em português brasileiro, de forma clara e objetiva
- Priorize informações de fontes oficiais: IBGE, BCB, IPEA, ministérios
- Cite números, datas e fontes quando possível
- Se não tiver certeza absoluta, indique claramente
- Resposta máxima: 3 parágrafos concisos
- Foque em informações acionáveis e práticas

ÁREAS DE EXPERTISE:
- Indicadores econômicos (IPCA, Selic, PIB, câmbio)
- Dados de saúde pública (DATASUS, SUS)
- Estatísticas regionais brasileiras
- Análise de mercado e tendências

${context ? `CONTEXTO ADICIONAL: ${context}` : ""}`
            },
            { role: "user", content: query }
          ],
          max_tokens: 600,
          temperature: 0.3
        })
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("❌ OpenAI error:", openaiResponse.status, errorText);
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      const openaiData = await openaiResponse.json();
      answer = openaiData.choices?.[0]?.message?.content || "";
      
      console.log(`✅ OpenAI respondeu (${answer.length} chars)`);
    } catch (openaiError) {
      console.error("❌ Erro OpenAI:", openaiError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Não foi possível processar sua pergunta. Tente novamente."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // STEP 3: Verificar se temos resposta válida
    // =============================================
    if (!answer || answer.length < 20) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Não foi possível encontrar uma resposta adequada. Tente reformular sua pergunta."
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // STEP 4: Auto-indexar conhecimento
    // =============================================
    let autoIndexed = false;

    if (autoIndex && answer.length > 100) {
      console.log("📥 Auto-indexando conhecimento...");
      
      try {
        // Reutilizar embedding cacheado ou gerar novo
        let embedding = cachedEmbedding;

        if (!embedding) {
          console.log("⚠️ Gerando novo embedding (cache miss)...");
          const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
              model: "text-embedding-3-small",
              input: query
            })
          });

          if (embeddingResponse.ok) {
            const embeddingData = await embeddingResponse.json();
            embedding = embeddingData.data?.[0]?.embedding;
          }
        } else {
          console.log("✅ Reutilizando embedding cacheado");
        }

        if (embedding) {
          // Gerar tags e slug
          const autoTags = generateAutoTags(query, answer);
          const primarySlug = generateSlug(query, autoTags);

          // Usar RPC que trata duplicatas automaticamente
          const { data: insertedId, error: insertError } = await supabase.rpc(
            "upsert_deep_knowledge",
            {
              p_query: query,
              p_answer: answer,
              p_source_url: source.url,
              p_source_name: source.name,
              p_source_type: source.type,
              p_embedding: embedding,
              p_auto_tags: autoTags,
              p_primary_slug: primarySlug,
              p_confidence: confidence
            }
          );

          if (!insertError) {
            autoIndexed = true;
            console.log(`✅ Conhecimento indexado via RPC: id=${insertedId}, tags=[${autoTags.join(", ")}]`);
          } else {
            console.warn("⚠️ Erro ao indexar via RPC:", insertError.message);
          }
        }
      } catch (indexError) {
        console.error("❌ Erro ao auto-indexar:", indexError);
      }
    }

    // =============================================
    // STEP 5: Retornar resposta
    // =============================================
    console.log("=== DEEP-SEARCH END ===");

    const response: DeepSearchResponse = {
      success: true,
      answer,
      source,
      fromCache: false,
      autoIndexed,
      confidence
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro interno do servidor"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
