// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Mapeamento de palavras-chave para sugestão de taxonomia
const KEYWORD_TAXONOMY_HINTS: Record<string, string[]> = {
  // Economia
  'inflação': ['economia.indicadores.inflacao'],
  'ipca': ['economia.indicadores.inflacao.ipca'],
  'igpm': ['economia.indicadores.inflacao.igpm'],
  'selic': ['economia.indicadores.monetarios.selic'],
  'cdi': ['economia.indicadores.monetarios.cdi'],
  'juros': ['economia.indicadores.monetarios'],
  'pib': ['economia.indicadores.atividade'],
  'desemprego': ['economia.indicadores.emprego'],
  'emprego': ['economia.indicadores.emprego'],
  'câmbio': ['economia.mercados.cambio'],
  'dólar': ['economia.mercados.cambio'],
  'bolsa': ['economia.mercados.acoes'],
  'ibovespa': ['economia.mercados.acoes'],
  'varejo': ['economia.setores'],
  'indústria': ['economia.setores'],
  'serviços': ['economia.setores'],
  'agronegócio': ['economia.setores'],
  
  // Saúde
  'saúde': ['saude'],
  'medicina': ['saude'],
  'hospital': ['saude'],
  'tratamento': ['saude.procedimentos'],
  'prevenção': ['saude.prevencao'],
  'vacina': ['saude.prevencao'],
  'doença': ['saude'],
  'diagnóstico': ['saude.procedimentos'],
  
  // Conhecimento
  'knowyou': ['conhecimento.knowyou'],
  'knowrisk': ['conhecimento.knowrisk'],
  'acc': ['conhecimento.acc'],
  'tutorial': ['conhecimento'],
  'manual': ['conhecimento'],
  'documentação': ['conhecimento'],
  
  // Regional
  'brasil': ['economia.geografico'],
  'são paulo': ['economia.geografico'],
  'regional': ['economia.geografico'],
  'estado': ['economia.geografico'],
  'município': ['economia.geografico'],
  
  // Tecnologia
  'tecnologia': ['tecnologia'],
  'inovação': ['tecnologia.inovacao'],
  'automação': ['tecnologia.automacao'],
  'ia': ['tecnologia.ia'],
  'inteligência artificial': ['tecnologia.ia'],
  'machine learning': ['tecnologia.ia.ml'],
  'ia generativa': ['tecnologia.ia.generativa'],
  'dados': ['tecnologia.dados'],
  'analytics': ['tecnologia.dados'],
  
  // Documentos
  'relatório': ['documentos.relatorios'],
  'documento': ['documentos'],
  'apresentação': ['documentos.apresentacoes'],
  'planilha': ['documentos.planilhas'],
};

interface AnalysisResult {
  summary: {
    totalDocuments: number;
    totalTags: number;
    uniqueTags: number;
    taxonomyNodes: number;
    mappedTags: number;
    unmappedTags: number;
    coveragePercent: number;
  };
  existingTaxonomy: Array<{
    code: string;
    name: string;
    level: number;
    documentCount: number;
  }>;
  unmappedTags: Array<{
    tagName: string;
    tagType: string;
    documentCount: number;
    suggestedTaxonomy: string[];
    sampleDocuments: string[];
  }>;
  suggestedNewTaxonomies: Array<{
    code: string;
    name: string;
    parentCode: string;
    reason: string;
    basedOnTags: string[];
  }>;
  documentsByTargetChat: Record<string, number>;
  tagDistribution: {
    parentTags: number;
    childTags: number;
    orphanTags: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[analyze-taxonomy-gap] Starting analysis...");

    // 1. Buscar todos os documentos
    const { data: documents, error: docError } = await supabase
      .from("documents")
      .select("id, filename, target_chat, ai_summary, is_readable")
      .order("created_at", { ascending: false });

    if (docError) throw docError;

    // 2. Buscar todas as tags de documentos
    const { data: documentTags, error: tagsError } = await supabase
      .from("document_tags")
      .select("document_id, tag_name, tag_type, parent_tag_id, confidence");

    if (tagsError) throw tagsError;

    // 3. Buscar taxonomia global existente
    const { data: taxonomy, error: taxError } = await supabase
      .from("global_taxonomy")
      .select("id, code, name, level, parent_id")
      .order("code");

    if (taxError) throw taxError;

    // 4. Buscar entity_tags existentes
    const { data: entityTags } = await supabase
      .from("entity_tags")
      .select("entity_id, taxonomy_id");

    // Criar mapa de taxonomia
    const taxonomyMap = new Map<string, any>();
    const taxonomyCodes = new Set<string>();
    taxonomy?.forEach(t => {
      taxonomyMap.set(t.code.toLowerCase(), t);
      taxonomyCodes.add(t.code.toLowerCase());
    });

    // 5. Agrupar tags únicas
    const tagStats = new Map<string, {
      count: number;
      type: string;
      documents: Set<string>;
      filenames: string[];
    }>();

    const docFilenameMap = new Map<string, string>();
    documents?.forEach(d => docFilenameMap.set(d.id, d.filename));

    documentTags?.forEach(dt => {
      const tagKey = dt.tag_name.toLowerCase().trim();
      if (!tagStats.has(tagKey)) {
        tagStats.set(tagKey, {
          count: 0,
          type: dt.tag_type || 'unknown',
          documents: new Set(),
          filenames: []
        });
      }
      const stat = tagStats.get(tagKey)!;
      stat.count++;
      stat.documents.add(dt.document_id);
      const filename = docFilenameMap.get(dt.document_id);
      if (filename && !stat.filenames.includes(filename)) {
        stat.filenames.push(filename);
      }
    });

    // 6. Identificar tags não mapeadas
    const unmappedTags: AnalysisResult['unmappedTags'] = [];
    const mappedTagsCount = { count: 0 };

    tagStats.forEach((stat, tagName) => {
      let isMapped = false;
      let suggestedTaxonomy: string[] = [];

      // Verificar mapeamento direto
      if (taxonomyCodes.has(tagName)) {
        isMapped = true;
      }

      // Verificar se é parte de algum código
      taxonomyCodes.forEach(code => {
        const codeParts = code.split('.');
        const lastPart = codeParts[codeParts.length - 1];
        if (code.includes(tagName) || tagName.includes(lastPart)) {
          suggestedTaxonomy.push(code);
        }
      });

      // Verificar hints de palavras-chave
      Object.entries(KEYWORD_TAXONOMY_HINTS).forEach(([keyword, taxonomies]) => {
        if (tagName.includes(keyword.toLowerCase())) {
          suggestedTaxonomy.push(...taxonomies);
        }
      });

      suggestedTaxonomy = [...new Set(suggestedTaxonomy)];

      if (suggestedTaxonomy.length > 0) {
        isMapped = true;
      }

      if (isMapped) {
        mappedTagsCount.count++;
      } else {
        unmappedTags.push({
          tagName,
          tagType: stat.type,
          documentCount: stat.documents.size,
          suggestedTaxonomy,
          sampleDocuments: stat.filenames.slice(0, 3)
        });
      }
    });

    unmappedTags.sort((a, b) => b.documentCount - a.documentCount);

    // 7. Sugerir novas taxonomias
    const suggestedNewTaxonomies: AnalysisResult['suggestedNewTaxonomies'] = [];
    const tagGroups = new Map<string, string[]>();

    unmappedTags.forEach(ut => {
      const parts = ut.tagName.split(/[\s_-]/);
      if (parts.length > 1) {
        const prefix = parts[0];
        if (!tagGroups.has(prefix)) {
          tagGroups.set(prefix, []);
        }
        tagGroups.get(prefix)!.push(ut.tagName);
      }
    });

    tagGroups.forEach((tags, prefix) => {
      if (tags.length >= 2) {
        let parentCode = '_pendente';
        if (prefix.match(/^(inflac|preco|custo)/i)) parentCode = 'economia.indicadores';
        else if (prefix.match(/^(taxa|juro|selic)/i)) parentCode = 'economia.indicadores.monetarios';
        else if (prefix.match(/^(emprego|trabalho|ocupac)/i)) parentCode = 'economia.indicadores.emprego';
        else if (prefix.match(/^(saude|medic|hospital)/i)) parentCode = 'saude';
        else if (prefix.match(/^(know|sistema|acc)/i)) parentCode = 'conhecimento';
        else if (prefix.match(/^(tech|tecnol|ia|ai|ml)/i)) parentCode = 'tecnologia';
        else if (prefix.match(/^(relat|doc|plan)/i)) parentCode = 'documentos';

        suggestedNewTaxonomies.push({
          code: `${parentCode}.${prefix.toLowerCase()}`,
          name: prefix.charAt(0).toUpperCase() + prefix.slice(1),
          parentCode,
          reason: `${tags.length} tags relacionadas encontradas`,
          basedOnTags: tags.slice(0, 5)
        });
      }
    });

    // 8. Contagem por target_chat
    const documentsByTargetChat: Record<string, number> = {};
    documents?.forEach(d => {
      const chat = d.target_chat || 'sem_chat';
      documentsByTargetChat[chat] = (documentsByTargetChat[chat] || 0) + 1;
    });

    // 9. Distribuição de tipos de tags
    let parentCount = 0, childCount = 0, orphanCount = 0;
    documentTags?.forEach(dt => {
      if (dt.tag_type === 'parent') parentCount++;
      else if (dt.tag_type === 'child') childCount++;
      else orphanCount++;
    });

    // 10. Contar documentos por taxonomia
    const taxonomyWithCounts = taxonomy?.map(t => {
      let docCount = 0;
      const codeParts = t.code.split('.');
      const lastPart = codeParts[codeParts.length - 1]?.toLowerCase();
      
      tagStats.forEach((stat, tagName) => {
        if (lastPart && (tagName.includes(lastPart) || t.code.toLowerCase().includes(tagName))) {
          docCount += stat.documents.size;
        }
      });
      return { code: t.code, name: t.name, level: t.level, documentCount: docCount };
    }) || [];

    const result: AnalysisResult = {
      summary: {
        totalDocuments: documents?.length || 0,
        totalTags: documentTags?.length || 0,
        uniqueTags: tagStats.size,
        taxonomyNodes: taxonomy?.length || 0,
        mappedTags: mappedTagsCount.count,
        unmappedTags: unmappedTags.length,
        coveragePercent: tagStats.size > 0 
          ? Math.round((mappedTagsCount.count / tagStats.size) * 100) 
          : 0
      },
      existingTaxonomy: taxonomyWithCounts,
      unmappedTags: unmappedTags.slice(0, 50),
      suggestedNewTaxonomies,
      documentsByTargetChat,
      tagDistribution: { parentTags: parentCount, childTags: childCount, orphanTags: orphanCount }
    };

    console.log("[analyze-taxonomy-gap] Analysis complete:", result.summary);

    return new Response(
      JSON.stringify({ success: true, analysis: result, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[analyze-taxonomy-gap] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
