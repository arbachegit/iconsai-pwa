// ============================================
// VERSAO: 1.0.0 | DEPLOY: 2026-01-09
// FUNCAO: Classificar taxonomia + enriquecer fonética
// OTIMIZACAO: Processamento paralelo para velocidade
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ============================================
// CACHE EM MEMÓRIA (evita consultas repetidas)
// ============================================
let taxonomyCache: Map<string, TaxonomyNode[]> | null = null;
let taxonomyCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

interface TaxonomyNode {
  id: string;
  code: string;
  name: string;
  keywords: string[] | null;
  synonyms: string[] | null;
  parent_id: string | null;
}

interface ClassifyRequest {
  text: string;
  moduleType: string;       // world, health, ideas, help
  agentSlug?: string;
  messageId?: string;       // Para salvar entity_tags
  sessionId?: string;
  userRegion?: string;      // Para fonética regional
  skipSave?: boolean;       // Para testes
}

interface ClassifyResponse {
  enrichedText: string;
  taxonomyTags: Array<{
    code: string;
    name: string;
    confidence: number;
  }>;
  phoneticMap: Record<string, string>;
  processingTimeMs: number;
}

// Mapeamento de módulos PWA para prefixos de taxonomia
const MODULE_TO_TAXONOMY_PREFIX: Record<string, string> = {
  world: "economia",
  health: "saude",
  ideas: "ideias",
  help: "conhecimento",
};

// ============================================
// CLASSIFICAÇÃO RÁPIDA POR KEYWORDS
// ============================================
function classifyByKeywords(
  text: string,
  moduleType: string,
  taxonomy: TaxonomyNode[]
): Array<{ code: string; name: string; confidence: number }> {
  const normalizedText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const results: Array<{ code: string; name: string; confidence: number; matches: number }> = [];

  // Mapear módulo para prefixo de taxonomia
  const taxonomyPrefix = MODULE_TO_TAXONOMY_PREFIX[moduleType] || moduleType;
  
  // Filtrar taxonomia pelo módulo
  const relevantNodes = taxonomy.filter(t => t.code.startsWith(taxonomyPrefix));

  for (const node of relevantNodes) {
    let matchCount = 0;
    const keywords = node.keywords || [];
    const synonyms = node.synonyms || [];
    const totalKeywords = keywords.length + synonyms.length;
    
    if (totalKeywords === 0) continue;

    // Verificar keywords
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    // Verificar sinônimos
    for (const synonym of synonyms) {
      if (normalizedText.includes(synonym.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(matchCount / Math.max(totalKeywords, 1), 1);
      results.push({
        code: node.code,
        name: node.name,
        confidence,
        matches: matchCount
      });
    }
  }

  // Ordenar por confiança e retornar top 3
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map(({ code, name, confidence }) => ({ code, name, confidence }));
}

// ============================================
// CARREGAR CACHE DE TAXONOMIA
// ============================================
async function loadTaxonomyCache(supabase: any): Promise<TaxonomyNode[]> {
  const now = Date.now();
  
  // Usar cache se válido
  if (taxonomyCache && (now - taxonomyCacheTime) < CACHE_TTL) {
    const allNodes: TaxonomyNode[] = [];
    taxonomyCache.forEach((nodes) => allNodes.push(...nodes));
    return allNodes;
  }

  // Recarregar do banco
  const { data, error } = await supabase
    .from("global_taxonomy")
    .select("id, code, name, keywords, synonyms, parent_id")
    .eq("status", "approved");

  if (error || !data) {
    console.error("[Taxonomy Cache] Error:", error);
    return [];
  }

  // Atualizar cache por prefixo
  taxonomyCache = new Map();
  for (const node of data) {
    const prefix = node.code.split(".")[0];
    if (!taxonomyCache.has(prefix)) {
      taxonomyCache.set(prefix, []);
    }
    taxonomyCache.get(prefix)!.push(node);
  }
  taxonomyCacheTime = now;

  console.log(`[Taxonomy Cache] Loaded ${data.length} nodes`);
  return data;
}

// ============================================
// BUSCAR FONÉTICAS DO MÓDULO (paralelo)
// ============================================
async function getModulePhonetics(
  supabase: any,
  moduleType: string,
  taxonomyCodes: string[],
  userRegion?: string
): Promise<Record<string, string>> {
  const phoneticMap: Record<string, string> = {};

  // Promise.all para paralelizar consultas
  const [lexiconResult, regionalResult, taxonomyResult] = await Promise.all([
    // 1. Léxico geral do módulo
    supabase
      .from("lexicon_terms")
      .select("term, pronunciation_phonetic")
      .eq("is_approved", true)
      .not("pronunciation_phonetic", "is", null)
      .limit(200),

    // 2. Fonética regional (se userRegion)
    userRegion
      ? supabase
          .from("regional_tone_rules")
          .select("preferred_terms")
          .eq("region_code", userRegion)
          .eq("is_active", true)
          .single()
      : Promise.resolve({ data: null }),

    // 3. Fonética específica da taxonomia detectada
    taxonomyCodes.length > 0
      ? supabase
          .from("taxonomy_phonetics")
          .select("term, phonetic")
          .in("taxonomy_code", taxonomyCodes)
          .eq("is_active", true)
          .order("priority", { ascending: false })
      : Promise.resolve({ data: [] })
  ]);

  // Aplicar léxico (prioridade baixa)
  if (lexiconResult.data) {
    for (const term of lexiconResult.data) {
      if (term.pronunciation_phonetic) {
        phoneticMap[term.term] = term.pronunciation_phonetic;
      }
    }
  }

  // Aplicar regional (prioridade média)
  if (regionalResult.data?.preferred_terms) {
    Object.assign(phoneticMap, regionalResult.data.preferred_terms);
  }

  // Aplicar taxonomia específica (prioridade alta)
  if (taxonomyResult.data) {
    for (const item of taxonomyResult.data) {
      phoneticMap[item.term] = item.phonetic;
    }
  }

  return phoneticMap;
}

// ============================================
// SALVAR ENTITY_TAGS (async, não bloqueia)
// ============================================
async function saveEntityTags(
  supabase: any,
  messageId: string,
  taxonomyTags: Array<{ code: string; confidence: number }>
): Promise<void> {
  if (!messageId || taxonomyTags.length === 0) return;

  try {
    // Buscar IDs das taxonomias
    const codes = taxonomyTags.map(t => t.code);
    const { data: taxonomies } = await supabase
      .from("global_taxonomy")
      .select("id, code")
      .in("code", codes);

    if (!taxonomies || taxonomies.length === 0) return;

    // Preparar inserts
    const inserts = taxonomies.map((tax: any) => {
      const tag = taxonomyTags.find(t => t.code === tax.code);
      return {
        entity_id: messageId,
        entity_type: "message",
        taxonomy_id: tax.id,
        confidence: tag?.confidence || 0.5,
        source: "auto-classify"
      };
    });

    // Insert em batch
    await supabase.from("entity_tags").insert(inserts);
    console.log(`[Entity Tags] Saved ${inserts.length} tags for message ${messageId}`);
  } catch (err) {
    console.error("[Entity Tags] Save error:", err);
  }
}

// ============================================
// ENRIQUECER TEXTO COM MARCADORES PROSÓDICOS
// ============================================
function enrichTextForSpeech(
  text: string,
  _taxonomyTags: Array<{ code: string; name: string }>
): string {
  let enriched = text;

  // Adicionar pausas naturais após pontuação
  enriched = enriched.replace(/\. /g, "... ");
  enriched = enriched.replace(/\? /g, "? ... ");
  enriched = enriched.replace(/! /g, "! ... ");

  // Adicionar ênfase em números/percentuais (ElevenLabs interpreta)
  enriched = enriched.replace(/(\d+[,.]?\d*%)/g, " $1 ");
  enriched = enriched.replace(/(R\$\s*[\d.,]+)/g, " $1 ");

  return enriched.trim();
}

// ============================================
// HANDLER PRINCIPAL
// ============================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: ClassifyRequest = await req.json();
    const { 
      text, 
      moduleType, 
      messageId, 
      userRegion,
      skipSave = false 
    } = body;

    if (!text || !moduleType) {
      return new Response(
        JSON.stringify({ error: "text e moduleType são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========== PROCESSAMENTO PARALELO ==========
    // 1. Carregar cache de taxonomia (pode ser instantâneo se em cache)
    const taxonomy = await loadTaxonomyCache(supabase);
    
    // 2. Classificar
    const taxonomyTags = classifyByKeywords(text, moduleType, taxonomy);
    const taxonomyCodes = taxonomyTags.map(t => t.code);

    // 3. Buscar fonéticas em paralelo com enrichment
    const [phoneticMap] = await Promise.all([
      getModulePhonetics(supabase, moduleType, taxonomyCodes, userRegion),
      // Salvar tags em background (não bloqueia resposta)
      !skipSave && messageId 
        ? saveEntityTags(supabase, messageId, taxonomyTags)
        : Promise.resolve()
    ]);

    // 4. Enriquecer texto para fala mais natural
    const enrichedText = enrichTextForSpeech(text, taxonomyTags);

    const processingTimeMs = Date.now() - startTime;
    console.log(`[Classify] ${moduleType} | ${taxonomyTags.length} tags | ${Object.keys(phoneticMap).length} phonetics | ${processingTimeMs}ms`);

    const response: ClassifyResponse = {
      enrichedText,
      taxonomyTags,
      phoneticMap,
      processingTimeMs
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[Classify] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        // Fallback: retorna dados mínimos para não quebrar o fluxo
        enrichedText: "",
        taxonomyTags: [],
        phoneticMap: {},
        processingTimeMs: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
