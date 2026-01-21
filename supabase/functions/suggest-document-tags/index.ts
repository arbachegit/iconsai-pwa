// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface TaxonomyNode {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  level: number;
  description: string | null;
  keywords: string[];
}

interface LearnedPattern {
  pattern_type: string;
  keyword: string;
  taxonomy_code: string;
  strength: number;
  occurrences: number;
}

// Helper function to extract keywords from text (same logic as SQL function)
function extractKeywordsFromText(text: string, limit: number = 20): string[] {
  const stopwords = new Set([
    'a', 'o', 'e', 'de', 'da', 'do', 'em', 'para', 'com', 'por', 'que', 'uma', 'um',
    'os', 'as', 'no', 'na', 'ao', 'ou', 'se', 'é', 'são', 'foi', 'ser', 'ter', 'como',
    'mais', 'sua', 'seu', 'the', 'and', 'of', 'to', 'in', 'is', 'for', 'on', 'with',
    'that', 'by', 'this', 'from', 'at', 'an', 'não', 'dos', 'das', 'nos', 'nas'
  ]);
  
  // Normalize text: remove special chars, lowercase
  const normalized = text.toLowerCase().replace(/[^a-zA-ZÀ-ÿ\s]/g, ' ');
  const words = normalized.split(/\s+/);
  
  // Filter: unique, not stopword, min 3 chars
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const word of words) {
    if (word.length >= 3 && !stopwords.has(word) && !seen.has(word)) {
      seen.add(word);
      result.push(word);
      if (result.length >= limit) break;
    }
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, text, chatType, saveSuggestions = true } = await req.json();
    
    console.log(`[suggest-document-tags] Document ${documentId}, chat: ${chatType || 'unknown'}, saveSuggestions: ${saveSuggestions}`);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. Fetch global taxonomy tree
    const { data: taxonomyNodes, error: taxonomyError } = await supabase
      .from("global_taxonomy")
      .select("id, code, name, parent_id, level, description, keywords")
      .eq("status", "approved")
      .order("level")
      .order("name");
    
    if (taxonomyError) {
      console.error("[suggest-document-tags] Error fetching taxonomy:", taxonomyError);
      throw new Error("Failed to fetch taxonomy");
    }
    
    console.log(`[suggest-document-tags] Loaded ${taxonomyNodes?.length || 0} taxonomy nodes`);
    
    // Build taxonomy tree representation for AI
    const buildTaxonomyTree = (nodes: TaxonomyNode[]): string => {
      const rootNodes = nodes.filter(n => !n.parent_id);
      const childMap = new Map<string, TaxonomyNode[]>();
      
      nodes.forEach(node => {
        if (node.parent_id) {
          const children = childMap.get(node.parent_id) || [];
          children.push(node);
          childMap.set(node.parent_id, children);
        }
      });
      
      const renderNode = (node: TaxonomyNode, indent: string = ""): string => {
        let result = `${indent}- ${node.code}: "${node.name}"`;
        if (node.keywords?.length > 0) {
          result += ` [keywords: ${node.keywords.join(', ')}]`;
        }
        result += "\n";
        
        const children = childMap.get(node.id) || [];
        children.forEach(child => {
          result += renderNode(child, indent + "  ");
        });
        
        return result;
      };
      
      return rootNodes.map(n => renderNode(n)).join("");
    };
    
    const taxonomyTree = buildTaxonomyTree(taxonomyNodes || []);
    
    // 2. Extract keywords from document text for pattern matching
    const documentKeywords = extractKeywordsFromText(text, 30);
    console.log(`[suggest-document-tags] Extracted ${documentKeywords.length} keywords from document`);
    
    // 3. Fetch learned patterns (correlations and restrictions) for these keywords
    let learnedCorrelations: LearnedPattern[] = [];
    let learnedRestrictions: LearnedPattern[] = [];
    
    if (documentKeywords.length > 0) {
      const { data: patterns, error: patternsError } = await supabase
        .rpc('get_learned_patterns', { p_keywords: documentKeywords });
      
      if (!patternsError && patterns) {
        learnedCorrelations = patterns.filter((p: LearnedPattern) => p.pattern_type === 'correlation');
        learnedRestrictions = patterns.filter((p: LearnedPattern) => p.pattern_type === 'restriction');
        console.log(`[suggest-document-tags] Found ${learnedCorrelations.length} correlations, ${learnedRestrictions.length} restrictions`);
      } else if (patternsError) {
        console.log(`[suggest-document-tags] Error fetching patterns (non-critical):`, patternsError);
      }
    }
    
    // 4. Fetch existing ML feedback to learn from corrections (legacy support)
    const { data: feedbackData } = await supabase
      .from("ml_tag_feedback")
      .select("original_code, corrected_code, feedback_type")
      .order("created_at", { ascending: false })
      .limit(100);
    
    // Build correction rules from feedback
    const correctionRules = feedbackData
      ?.filter(f => f.feedback_type === 'corrected' && f.original_code && f.corrected_code)
      .map(f => `- "${f.original_code}" → "${f.corrected_code}"`)
      .join('\n') || '';
    
    const rejectedCodes = feedbackData
      ?.filter(f => f.feedback_type === 'rejected' && f.original_code)
      .map(f => f.original_code) || [];
    
    console.log(`[suggest-document-tags] Loaded ${feedbackData?.length || 0} feedback entries, ${rejectedCodes.length} rejected codes`);
    
    // 5. Build contextual guidance based on chatType
    let contextualGuidance = '';
    
    if (chatType === 'economia') {
      contextualGuidance = `
🎯 CONTEXTO: Documento de ECONOMIA/FINANÇAS.
PRIORIZE códigos em: economia.*, tecnologia.dados
EVITE códigos muito genéricos se existirem específicos.`;
    } else if (chatType === 'health') {
      contextualGuidance = `
🎯 CONTEXTO: Documento de SAÚDE.
PRIORIZE códigos em: saude.*, conhecimento.ciencias
EVITE códigos não relacionados a saúde.`;
    } else if (chatType === 'study') {
      contextualGuidance = `
🎯 CONTEXTO: Documento de ESTUDO/EDUCAÇÃO.
PRIORIZE códigos em: conhecimento.*, tecnologia.*, ideias.*
EVITE códigos muito específicos de outros domínios.`;
    }
    
    // 6. Build learned patterns section for the prompt
    let learnedPatternsSection = '';
    
    if (learnedCorrelations.length > 0 || learnedRestrictions.length > 0) {
      learnedPatternsSection = `\n## 🧠 PADRÕES APRENDIDOS (OBRIGATÓRIO RESPEITAR):\n`;
      
      if (learnedCorrelations.length > 0) {
        learnedPatternsSection += `\n### ✅ CORRELAÇÕES POSITIVAS (PRIORIZAR estes códigos):\n`;
        
        // Group by taxonomy_code and show strongest correlations
        const correlationMap = new Map<string, { keywords: string[], strength: number }>();
        for (const c of learnedCorrelations) {
          const existing = correlationMap.get(c.taxonomy_code);
          if (!existing || c.strength > existing.strength) {
            correlationMap.set(c.taxonomy_code, {
              keywords: existing ? [...existing.keywords, c.keyword] : [c.keyword],
              strength: Math.max(existing?.strength || 0, c.strength)
            });
          } else {
            existing.keywords.push(c.keyword);
          }
        }
        
        for (const [code, data] of correlationMap) {
          const keywordsPreview = data.keywords.slice(0, 3).join(', ');
          learnedPatternsSection += `- Quando texto contém [${keywordsPreview}...], USAR: ${code} (força: ${(data.strength * 100).toFixed(0)}%)\n`;
        }
      }
      
      if (learnedRestrictions.length > 0) {
        learnedPatternsSection += `\n### ❌ RESTRIÇÕES NEGATIVAS (NÃO USAR estes códigos):\n`;
        
        // Group by taxonomy_code
        const restrictionMap = new Map<string, { keywords: string[], strength: number }>();
        for (const r of learnedRestrictions) {
          const existing = restrictionMap.get(r.taxonomy_code);
          if (!existing || r.strength > existing.strength) {
            restrictionMap.set(r.taxonomy_code, {
              keywords: existing ? [...existing.keywords, r.keyword] : [r.keyword],
              strength: Math.max(existing?.strength || 0, r.strength)
            });
          } else {
            existing.keywords.push(r.keyword);
          }
        }
        
        for (const [code, data] of restrictionMap) {
          const keywordsPreview = data.keywords.slice(0, 3).join(', ');
          learnedPatternsSection += `- Quando texto contém [${keywordsPreview}...], NUNCA USAR: ${code} (força: ${(data.strength * 100).toFixed(0)}%)\n`;
        }
      }
    }
    
    // 7. Build AI prompt
    const systemPrompt = `Você é um especialista em classificação de documentos usando uma taxonomia hierárquica pré-definida.

## TAXONOMIA DISPONÍVEL (USE APENAS ESTES CÓDIGOS):
${taxonomyTree}

${contextualGuidance}
${learnedPatternsSection}

## REGRAS DE APRENDIZADO LEGADAS (NÃO VIOLAR):
${correctionRules ? `Correções aprendidas (use sempre a versão corrigida):
${correctionRules}` : '(Nenhuma correção registrada)'}

${rejectedCodes.length > 0 ? `
Códigos rejeitados (NÃO USE):
${rejectedCodes.map(c => `- ${c}`).join('\n')}` : ''}

## INSTRUÇÕES:
1. Analise o texto do documento
2. Selecione 2-5 códigos de taxonomia que MELHOR representam o conteúdo
3. Use APENAS códigos que existem na taxonomia acima
4. Atribua confidence de 0.5 a 1.0 baseado na relevância
5. Priorize códigos mais específicos (níveis mais baixos) quando aplicável
6. RESPEITE os padrões aprendidos: boost para correlações, evite restrições

## FORMATO DE RESPOSTA (APENAS JSON, SEM MARKDOWN):
{
  "suggestions": [
    {"code": "economia.indicadores", "confidence": 0.95},
    {"code": "tecnologia.dados", "confidence": 0.80}
  ],
  "reasoning": "Breve explicação da classificação"
}`;
    
    // 8. Call AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Classifique este documento:\n\n${text.substring(0, 4000)}` }
        ],
        temperature: 0.2,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 9. Parse response
    let result;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleanContent);
    } catch (e) {
      console.error("[suggest-document-tags] Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }
    
    console.log(`[suggest-document-tags] AI suggested ${result.suggestions?.length || 0} taxonomy codes`);
    
    // 10. Validate and enrich suggestions with taxonomy data + apply learned patterns
    const validSuggestions: Array<{
      code: string;
      confidence: number;
      taxonomy_id: string;
      taxonomy_name: string;
      boosted_by_correlation: boolean;
    }> = [];
    
    const taxonomyMap = new Map(taxonomyNodes?.map(n => [n.code, n]) || []);
    
    // Build a map of restrictions for quick lookup
    const restrictedCodes = new Set(learnedRestrictions.map(r => r.taxonomy_code));
    
    // Build a map of correlations for confidence boost
    const correlationBoosts = new Map<string, number>();
    for (const c of learnedCorrelations) {
      const current = correlationBoosts.get(c.taxonomy_code) || 0;
      correlationBoosts.set(c.taxonomy_code, Math.max(current, c.strength * 0.1)); // Max +10% boost
    }
    
    for (const suggestion of result.suggestions || []) {
      const taxonomy = taxonomyMap.get(suggestion.code);
      if (!taxonomy) {
        console.log(`[suggest-document-tags] Ignoring invalid code: ${suggestion.code}`);
        continue;
      }
      
      // Skip if there's a strong restriction
      if (restrictedCodes.has(suggestion.code)) {
        console.log(`[suggest-document-tags] Skipping restricted code: ${suggestion.code}`);
        continue;
      }
      
      // Apply correlation boost
      const boost = correlationBoosts.get(suggestion.code) || 0;
      const adjustedConfidence = Math.min(1, Math.max(0.5, suggestion.confidence + boost));
      
      validSuggestions.push({
        code: suggestion.code,
        confidence: adjustedConfidence,
        taxonomy_id: taxonomy.id,
        taxonomy_name: taxonomy.name,
        boosted_by_correlation: boost > 0,
      });
    }
    
    console.log(`[suggest-document-tags] ${validSuggestions.length} valid suggestions after validation and pattern filtering`);
    
    // 11. Save to ml_tag_suggestions if requested
    if (saveSuggestions && validSuggestions.length > 0) {
      const suggestionsToInsert = validSuggestions.map(s => ({
        document_id: documentId,
        taxonomy_id: s.taxonomy_id,
        suggested_code: s.code,
        confidence: s.confidence,
        source: s.boosted_by_correlation ? 'ai_suggestion_boosted' : 'ai_suggestion',
        status: 'pending',
      }));
      
      const { error: insertError } = await supabase
        .from("ml_tag_suggestions")
        .insert(suggestionsToInsert);
      
      if (insertError) {
        console.error("[suggest-document-tags] Error saving suggestions:", insertError);
        // Don't throw - still return the suggestions
      } else {
        console.log(`[suggest-document-tags] Saved ${suggestionsToInsert.length} suggestions to ml_tag_suggestions`);
      }
    }
    
    // 12. Also create entity_tags directly for high-confidence suggestions (auto-approve)
    const highConfidenceSuggestions = validSuggestions.filter(s => s.confidence >= 0.9);
    
    if (highConfidenceSuggestions.length > 0) {
      const entityTagsToInsert = highConfidenceSuggestions.map(s => ({
        entity_id: documentId,
        entity_type: 'document',
        taxonomy_id: s.taxonomy_id,
        source: 'ai_auto',
        confidence: s.confidence,
        is_primary: false,
      }));
      
      const { error: entityError } = await supabase
        .from("entity_tags")
        .upsert(entityTagsToInsert, { 
          onConflict: 'entity_id,entity_type,taxonomy_id',
          ignoreDuplicates: true 
        });
      
      if (entityError) {
        console.log("[suggest-document-tags] Error auto-creating entity_tags:", entityError);
      } else {
        console.log(`[suggest-document-tags] Auto-created ${highConfidenceSuggestions.length} entity_tags (confidence >= 0.9)`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        suggestions: validSuggestions,
        reasoning: result.reasoning,
        autoApproved: highConfidenceSuggestions.length,
        pendingReview: validSuggestions.length - highConfidenceSuggestions.length,
        patternsUsed: {
          correlations: learnedCorrelations.length,
          restrictions: learnedRestrictions.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("[suggest-document-tags] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
