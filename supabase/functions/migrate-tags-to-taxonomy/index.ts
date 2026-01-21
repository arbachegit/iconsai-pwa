// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Mapeamento explícito de tags conhecidas para códigos da taxonomia global
const TAG_MAPPING: Record<string, string> = {
  // Economia
  'economia': 'economia',
  'financas': 'economia',
  'financeiro': 'economia',
  'economico': 'economia',
  'economic': 'economia',
  
  // Indicadores
  'indicadores': 'economia.indicadores',
  'indicador': 'economia.indicadores',
  'indicators': 'economia.indicadores',
  
  // Inflação
  'inflacao': 'economia.indicadores.inflacao',
  'ipca': 'economia.indicadores.inflacao',
  'igpm': 'economia.indicadores.inflacao',
  'precos': 'economia.indicadores.inflacao',
  
  // Juros/Monetários
  'juros': 'economia.indicadores.monetarios',
  'selic': 'economia.indicadores.monetarios',
  'cdi': 'economia.indicadores.monetarios',
  'taxa': 'economia.indicadores.monetarios',
  
  // PIB/Atividade
  'pib': 'economia.indicadores.atividade',
  'gdp': 'economia.indicadores.atividade',
  'atividade': 'economia.indicadores.atividade',
  'producao': 'economia.indicadores.atividade',
  
  // Emprego
  'emprego': 'economia.indicadores.emprego',
  'desemprego': 'economia.indicadores.emprego',
  'trabalho': 'economia.indicadores.emprego',
  'ocupacao': 'economia.indicadores.emprego',
  
  // Renda
  'renda': 'economia.indicadores.atividade',
  'salario': 'economia.indicadores.atividade',
  'rendimento': 'economia.indicadores.atividade',
  
  // Saúde
  'saude': 'saude',
  'health': 'saude',
  'medicina': 'saude',
  'medico': 'saude',
  'hospital': 'saude',
  
  // Varejo
  'varejo': 'economia.setores.varejo',
  'comercio': 'economia.setores.varejo',
  'retail': 'economia.setores.varejo',
  'vendas': 'economia.setores.varejo',
  'pmc': 'economia.setores.varejo',
  
  // Câmbio
  'cambio': 'economia.indicadores.cambio',
  'dolar': 'economia.indicadores.cambio',
  'euro': 'economia.indicadores.cambio',
  'moeda': 'economia.indicadores.cambio',
  
  // Regional
  'regional': 'regional',
  'regiao': 'regional',
  'estado': 'regional',
  'uf': 'regional',
  'municipio': 'regional',
  
  // Documentos/Relatórios
  'relatorio': 'documentos.relatorios',
  'report': 'documentos.relatorios',
  'analise': 'documentos.analises',
  'estudo': 'documentos.estudos',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[migrate-tags-to-taxonomy] Starting migration...");

    const results = {
      documentsProcessed: 0,
      tagsCreated: 0,
      tagsMapped: 0,
      tagsPending: 0,
      agentProfilesCreated: 0,
      errors: [] as string[],
      details: {
        documentTagsMigrated: [] as { documentId: string; tagName: string; taxonomyCode: string }[],
        agentProfilesMigrated: [] as { agentId: string; agentName: string; taxonomyCode: string; accessType: string }[],
        unmappedTags: [] as string[],
      }
    };

    // Cache de taxonomias para evitar queries repetidas
    const taxonomyCache: Record<string, string | null> = {};

    // Função para buscar taxonomia por código ou sinônimo
    async function findTaxonomyId(tagName: string): Promise<string | null> {
      const normalizedTag = tagName.toLowerCase().trim();
      
      // Verificar cache
      if (taxonomyCache[normalizedTag] !== undefined) {
        return taxonomyCache[normalizedTag];
      }

      // Verificar mapeamento explícito primeiro
      const mappedCode = TAG_MAPPING[normalizedTag];
      
      if (mappedCode) {
        const { data: taxonomy } = await supabase
          .from('global_taxonomy')
          .select('id')
          .eq('code', mappedCode)
          .maybeSingle();
        
        if (taxonomy) {
          taxonomyCache[normalizedTag] = taxonomy.id;
          return taxonomy.id;
        }
      }

      // Buscar por código exato
      const { data: byCode } = await supabase
        .from('global_taxonomy')
        .select('id')
        .ilike('code', `%${normalizedTag}%`)
        .limit(1)
        .maybeSingle();

      if (byCode) {
        taxonomyCache[normalizedTag] = byCode.id;
        return byCode.id;
      }

      // Buscar por nome
      const { data: byName } = await supabase
        .from('global_taxonomy')
        .select('id')
        .ilike('name', `%${normalizedTag}%`)
        .limit(1)
        .maybeSingle();

      if (byName) {
        taxonomyCache[normalizedTag] = byName.id;
        return byName.id;
      }

      // Buscar por sinônimos (array contains)
      const { data: bySynonym } = await supabase
        .from('global_taxonomy')
        .select('id, synonyms')
        .not('synonyms', 'is', null);

      if (bySynonym) {
        for (const tax of bySynonym) {
          const synonyms = (tax.synonyms as string[]) || [];
          if (synonyms.some(s => s.toLowerCase() === normalizedTag)) {
            taxonomyCache[normalizedTag] = tax.id;
            return tax.id;
          }
        }
      }

      // Não encontrou - guardar null no cache
      taxonomyCache[normalizedTag] = null;
      return null;
    }

    // Buscar taxonomia pendente
    const { data: pendingTax } = await supabase
      .from('global_taxonomy')
      .select('id')
      .eq('code', '_pendente.classificacao')
      .maybeSingle();

    const pendingTaxonomyId = pendingTax?.id;

    // 1. MIGRAR DOCUMENT_TAGS EXISTENTES
    console.log("[migrate-tags-to-taxonomy] Step 1: Migrating document_tags...");
    
    const { data: oldTags, error: oldTagsError } = await supabase
      .from('document_tags')
      .select('*');

    if (oldTagsError) {
      console.error("[migrate-tags-to-taxonomy] Error fetching document_tags:", oldTagsError);
      results.errors.push(`Erro ao buscar document_tags: ${oldTagsError.message}`);
    }

    for (const oldTag of oldTags || []) {
      const taxonomyId = await findTaxonomyId(oldTag.tag_name);

      if (taxonomyId) {
        // Criar entity_tag
        const { error: insertError } = await supabase.from('entity_tags').upsert({
          entity_type: 'document',
          entity_id: oldTag.document_id,
          taxonomy_id: taxonomyId,
          confidence: oldTag.confidence || 1.0,
          source: oldTag.source || 'manual',
          is_primary: oldTag.tag_type === 'parent',
        }, { 
          onConflict: 'entity_type,entity_id,taxonomy_id',
          ignoreDuplicates: true 
        });

        if (insertError) {
          console.error(`[migrate-tags-to-taxonomy] Error inserting entity_tag:`, insertError);
          results.errors.push(`Erro ao criar entity_tag para ${oldTag.tag_name}: ${insertError.message}`);
        } else {
          results.tagsCreated++;
          results.tagsMapped++;
          
          // Buscar código da taxonomia para o log
          const { data: taxData } = await supabase
            .from('global_taxonomy')
            .select('code')
            .eq('id', taxonomyId)
            .single();
          
          results.details.documentTagsMigrated.push({
            documentId: oldTag.document_id,
            tagName: oldTag.tag_name,
            taxonomyCode: taxData?.code || 'unknown',
          });
        }
      } else if (pendingTaxonomyId) {
        // Tag não mapeada - colocar como pendente
        const { error: insertError } = await supabase.from('entity_tags').upsert({
          entity_type: 'document',
          entity_id: oldTag.document_id,
          taxonomy_id: pendingTaxonomyId,
          source: 'ai_suggested',
          confidence: 0.5,
        }, { 
          onConflict: 'entity_type,entity_id,taxonomy_id',
          ignoreDuplicates: true 
        });

        if (!insertError) {
          results.tagsCreated++;
          results.tagsPending++;
        }
        
        if (!results.details.unmappedTags.includes(oldTag.tag_name)) {
          results.details.unmappedTags.push(oldTag.tag_name);
        }
        results.errors.push(`Tag não mapeada: ${oldTag.tag_name}`);
      }
    }

    // 2. MIGRAR ALLOWED_TAGS E FORBIDDEN_TAGS DOS AGENTES
    console.log("[migrate-tags-to-taxonomy] Step 2: Migrating agent tags...");
    
    const { data: agents, error: agentsError } = await supabase
      .from('chat_agents')
      .select('id, name, allowed_tags, forbidden_tags');

    if (agentsError) {
      console.error("[migrate-tags-to-taxonomy] Error fetching agents:", agentsError);
      results.errors.push(`Erro ao buscar agentes: ${agentsError.message}`);
    }

    for (const agent of agents || []) {
      // Mapear allowed_tags para profiles (include)
      for (const tag of agent.allowed_tags || []) {
        const taxonomyId = await findTaxonomyId(tag);

        if (taxonomyId) {
          const { error: insertError } = await supabase.from('agent_tag_profiles').upsert({
            agent_id: agent.id,
            taxonomy_id: taxonomyId,
            access_type: 'include',
            include_children: true,
            weight: 1.0,
          }, { 
            onConflict: 'agent_id,taxonomy_id',
            ignoreDuplicates: true 
          });

          if (!insertError) {
            results.agentProfilesCreated++;
            
            const { data: taxData } = await supabase
              .from('global_taxonomy')
              .select('code')
              .eq('id', taxonomyId)
              .single();
            
            results.details.agentProfilesMigrated.push({
              agentId: agent.id,
              agentName: agent.name,
              taxonomyCode: taxData?.code || 'unknown',
              accessType: 'include',
            });
          }
        } else {
          results.errors.push(`Tag de agente não mapeada (${agent.name}): ${tag}`);
        }
      }

      // Mapear forbidden_tags para profiles (exclude)
      for (const tag of agent.forbidden_tags || []) {
        const taxonomyId = await findTaxonomyId(tag);

        if (taxonomyId) {
          const { error: insertError } = await supabase.from('agent_tag_profiles').upsert({
            agent_id: agent.id,
            taxonomy_id: taxonomyId,
            access_type: 'exclude',
            include_children: true,
            weight: 1.0,
          }, { 
            onConflict: 'agent_id,taxonomy_id',
            ignoreDuplicates: true 
          });

          if (!insertError) {
            results.agentProfilesCreated++;
            
            const { data: taxData } = await supabase
              .from('global_taxonomy')
              .select('code')
              .eq('id', taxonomyId)
              .single();
            
            results.details.agentProfilesMigrated.push({
              agentId: agent.id,
              agentName: agent.name,
              taxonomyCode: taxData?.code || 'unknown',
              accessType: 'exclude',
            });
          }
        } else {
          results.errors.push(`Tag proibida de agente não mapeada (${agent.name}): ${tag}`);
        }
      }
    }

    // 3. IDENTIFICAR DOCUMENTOS SEM TAGS
    console.log("[migrate-tags-to-taxonomy] Step 3: Finding untagged documents...");
    
    // Buscar todos os documentos
    const { data: allDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('status', 'completed');

    // Buscar documentos que já têm entity_tags
    const { data: taggedDocs } = await supabase
      .from('entity_tags')
      .select('entity_id')
      .eq('entity_type', 'document');

    const taggedDocIds = new Set((taggedDocs || []).map(d => d.entity_id));
    const untaggedDocs = (allDocs || []).filter(d => !taggedDocIds.has(d.id));

    console.log(`[migrate-tags-to-taxonomy] Found ${untaggedDocs.length} untagged documents`);

    if (pendingTaxonomyId) {
      for (const doc of untaggedDocs) {
        const { error: insertError } = await supabase.from('entity_tags').insert({
          entity_type: 'document',
          entity_id: doc.id,
          taxonomy_id: pendingTaxonomyId,
          source: 'ai_suggested',
          confidence: 0.3,
        });

        if (!insertError) {
          results.documentsProcessed++;
          results.tagsPending++;
        }
      }
    }

    console.log("[migrate-tags-to-taxonomy] Migration completed!", results);

    return new Response(JSON.stringify({
      success: true,
      message: "Migração concluída com sucesso",
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[migrate-tags-to-taxonomy] Fatal error:", errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
      stack: errorStack,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
