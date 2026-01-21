// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// ============================================================================
// INTERFACES
// ============================================================================

interface ChunkingConfig {
  baseChunkSize: number;      // Tamanho base em caracteres
  maxChunkSize: number;       // Máximo permitido
  minChunkSize: number;       // Mínimo para não descartar
  overlapPercentage: number;  // % de sobreposição entre chunks
  preserveSections: boolean;  // Manter seções intactas
  contentType: string;        // Tipo detectado do conteúdo
}

interface Chunk {
  index: number;
  content: string;
  wordCount: number;
  charCount: number;
  sectionId?: string;
}

interface ProcessingResult {
  documentId: string;
  totalChunks: number;
  totalWords: number;
  chunkingConfig: ChunkingConfig;
  processingTimeMs: number;
  batches: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Conta termos técnicos no texto para determinar se é documento técnico
 */
function countTechnicalTerms(text: string): number {
  const technicalPatterns = [
    /\b(API|SDK|HTTP|REST|JSON|XML|SQL|HTML|CSS|JavaScript|TypeScript)\b/gi,
    /\b(function|const|let|var|class|interface|type|enum|async|await)\b/gi,
    /\b(algorithm|framework|library|module|component|database|server)\b/gi,
    /\b(authentication|authorization|encryption|protocol|endpoint)\b/gi,
    /\b(implementation|integration|configuration|deployment|pipeline)\b/gi,
    /\b(IPCA|PIB|Selic|IBGE|SIDRA|PMC|PAC|UF|CNAE)\b/gi, // Termos econômicos BR
    /\b(inflação|deflação|taxa|índice|indicador|variação|acumulado)\b/gi,
  ];

  let count = 0;
  for (const pattern of technicalPatterns) {
    const matches = text.match(pattern);
    count += matches ? matches.length : 0;
  }
  return count;
}

/**
 * Determina a estratégia de chunking baseada no tipo de conteúdo
 */
function determineChunkingStrategy(text: string): ChunkingConfig {
  const hasCodeBlocks = /```[\s\S]*?```|<code>[\s\S]*?<\/code>|<pre>[\s\S]*?<\/pre>/.test(text);
  const hasTables = /<table|│|├|┌|┐|┘|└|\|[-+]+\||^\s*\|.*\|.*\|\s*$/m.test(text);
  const hasMarkdownHeaders = /^#{1,6}\s+/m.test(text);
  const technicalTerms = countTechnicalTerms(text);
  const isTechnical = technicalTerms > 50;
  const isVeryTechnical = technicalTerms > 150;

  // Documento com muito código
  if (hasCodeBlocks) {
    return {
      baseChunkSize: 1500,
      maxChunkSize: 3000,
      minChunkSize: 500,
      overlapPercentage: 20,
      preserveSections: true,
      contentType: 'code',
    };
  }

  // Documento com tabelas
  if (hasTables) {
    return {
      baseChunkSize: 800,
      maxChunkSize: 1500,
      minChunkSize: 300,
      overlapPercentage: 10,
      preserveSections: true,
      contentType: 'tables',
    };
  }

  // Documento muito técnico (APIs, documentação técnica)
  if (isVeryTechnical) {
    return {
      baseChunkSize: 1200,
      maxChunkSize: 2500,
      minChunkSize: 400,
      overlapPercentage: 25,
      preserveSections: true,
      contentType: 'highly_technical',
    };
  }

  // Documento moderadamente técnico
  if (isTechnical) {
    return {
      baseChunkSize: 1200,
      maxChunkSize: 2000,
      minChunkSize: 400,
      overlapPercentage: 20,
      preserveSections: hasMarkdownHeaders,
      contentType: 'technical',
    };
  }

  // Documento com estrutura markdown
  if (hasMarkdownHeaders) {
    return {
      baseChunkSize: 1000,
      maxChunkSize: 1800,
      minChunkSize: 250,
      overlapPercentage: 15,
      preserveSections: true,
      contentType: 'structured',
    };
  }

  // Texto comum (narrativo, artigos)
  return {
    baseChunkSize: 1000,
    maxChunkSize: 1800,
    minChunkSize: 200,
    overlapPercentage: 15,
    preserveSections: false,
    contentType: 'common',
  };
}

/**
 * Divide o texto em seções baseado em headers ou delimitadores
 */
function splitBySections(text: string): string[] {
  // Padrões de divisão de seção
  const sectionPatterns = [
    /(?=^#{1,6}\s+)/gm,           // Headers markdown
    /(?=^[A-Z][A-Z\s]{5,}$)/gm,   // TÍTULOS EM MAIÚSCULAS
    /(?=^\d+\.\s+[A-Z])/gm,       // 1. Seção numerada
  ];

  let sections: string[] = [text];

  for (const pattern of sectionPatterns) {
    const newSections: string[] = [];
    for (const section of sections) {
      const parts = section.split(pattern).filter(s => s.trim().length > 0);
      if (parts.length > 1) {
        newSections.push(...parts);
      } else {
        newSections.push(section);
      }
    }
    if (newSections.length > sections.length) {
      sections = newSections;
    }
  }

  return sections.filter(s => s.trim().length > 0);
}

/**
 * Executa o chunking do documento
 */
function chunkDocument(text: string, config: ChunkingConfig): Chunk[] {
  const chunks: Chunk[] = [];

  // Dividir por seções primeiro (se preserveSections)
  const sections = config.preserveSections ? splitBySections(text) : [text];

  console.log(`Chunking: ${sections.length} sections detected, preserveSections=${config.preserveSections}`);

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    
    // Dividir seção em parágrafos
    const paragraphs = section.split(/\n\n+/).filter(p => p.trim().length > 0);

    let currentChunk = '';
    let chunkIndex = chunks.length;

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      // Se adicionar o parágrafo não excede o máximo
      if (currentChunk.length + trimmedParagraph.length + 2 < config.maxChunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
      } else {
        // Salvar chunk atual se >= minChunkSize
        if (currentChunk.length >= config.minChunkSize) {
          chunks.push({
            index: chunkIndex++,
            content: currentChunk.trim(),
            wordCount: currentChunk.split(/\s+/).filter(w => w.length > 0).length,
            charCount: currentChunk.length,
            sectionId: `section_${sectionIndex}`,
          });
        }

        // Calcular overlap
        const overlapSize = Math.floor(currentChunk.length * config.overlapPercentage / 100);
        const overlap = overlapSize > 0 ? currentChunk.slice(-overlapSize) : '';

        // Iniciar novo chunk com overlap
        if (trimmedParagraph.length > config.maxChunkSize) {
          // Parágrafo muito grande - dividir em pedaços
          const subChunks = splitLargeParagraph(trimmedParagraph, config.baseChunkSize);
          for (const subChunk of subChunks) {
            chunks.push({
              index: chunkIndex++,
              content: subChunk.trim(),
              wordCount: subChunk.split(/\s+/).filter(w => w.length > 0).length,
              charCount: subChunk.length,
              sectionId: `section_${sectionIndex}`,
            });
          }
          currentChunk = '';
        } else {
          currentChunk = overlap + (overlap ? '\n\n' : '') + trimmedParagraph;
        }
      }
    }

    // Último chunk da seção
    if (currentChunk.length >= config.minChunkSize) {
      chunks.push({
        index: chunkIndex++,
        content: currentChunk.trim(),
        wordCount: currentChunk.split(/\s+/).filter(w => w.length > 0).length,
        charCount: currentChunk.length,
        sectionId: `section_${sectionIndex}`,
      });
    } else if (currentChunk.length > 0 && chunks.length > 0) {
      // Anexar ao chunk anterior se muito pequeno
      const lastChunk = chunks[chunks.length - 1];
      lastChunk.content += '\n\n' + currentChunk.trim();
      lastChunk.wordCount = lastChunk.content.split(/\s+/).filter(w => w.length > 0).length;
      lastChunk.charCount = lastChunk.content.length;
    }
  }

  return chunks;
}

/**
 * Divide um parágrafo muito grande em pedaços menores
 */
function splitLargeParagraph(paragraph: string, targetSize: number): string[] {
  const chunks: string[] = [];
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length < targetSize) {
      current += (current ? ' ' : '') + sentence;
    } else {
      if (current) chunks.push(current);
      current = sentence;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

/**
 * Gera embedding usando OpenAI
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000), // Limitar para evitar erros
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Processa documento grande em lotes
 */
// deno-lint-ignore no-explicit-any
async function processLargeDocument(
  supabase: any,
  documentId: string,
  text: string,
  targetChat: string,
  openAIKey: string
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const BATCH_SIZE = 10; // chunks por lote (para evitar rate limit)

  // Determinar estratégia de chunking
  const config = determineChunkingStrategy(text);
  console.log(`Document ${documentId}: Using ${config.contentType} chunking strategy`);
  console.log(`Config: base=${config.baseChunkSize}, max=${config.maxChunkSize}, overlap=${config.overlapPercentage}%`);

  // Executar chunking
  const allChunks = chunkDocument(text, config);
  const totalChunks = allChunks.length;
  const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;

  console.log(`Document ${documentId}: ${totalChunks} chunks generated, ${totalWords} total words`);

  // Limpar chunks antigos do documento
  await supabase
    .from('document_chunks')
    .delete()
    .eq('document_id', documentId);

  let batches = 0;

  // Processar em lotes
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    batches++;

    console.log(`Document ${documentId}: Processing batch ${batches} (${batch.length} chunks)`);

    // Gerar embeddings em paralelo
    const embeddings = await Promise.all(
      batch.map(chunk => generateEmbedding(chunk.content, openAIKey))
    );

    // Inserir no banco
    const { error: insertError } = await supabase.from('document_chunks').insert(
      batch.map((chunk, idx) => ({
        document_id: documentId,
        chunk_index: chunk.index,
        content: chunk.content,
        word_count: chunk.wordCount,
        embedding: JSON.stringify(embeddings[idx]),
        metadata: {
          target_chat: targetChat,
          batch_index: batches - 1,
          section_id: chunk.sectionId,
          char_count: chunk.charCount,
          chunking_config: {
            type: config.contentType,
            base_size: config.baseChunkSize,
            max_size: config.maxChunkSize,
            overlap: config.overlapPercentage,
          },
        },
      }))
    );

    if (insertError) {
      console.error(`Error inserting batch ${batches}:`, insertError);
      throw insertError;
    }

    // Atualizar progresso
    const progress = Math.round((i + batch.length) / totalChunks * 100);
    await supabase
      .from('documents')
      .update({ processing_progress: progress })
      .eq('id', documentId);

    console.log(`Document ${documentId}: Progress ${progress}%`);

    // Pequena pausa entre batches para evitar rate limit
    if (i + BATCH_SIZE < allChunks.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  const processingTimeMs = Date.now() - startTime;

  return {
    documentId,
    totalChunks,
    totalWords,
    chunkingConfig: config,
    processingTimeMs,
    batches,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const { documentId, text, filename, targetChat } = await req.json();

    if (!documentId || !text) {
      return new Response(
        JSON.stringify({ error: "documentId and text are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`=== Processing document: ${filename || documentId} ===`);
    console.log(`Text length: ${text.length} characters`);

    // Atualizar status para processing
    await supabase
      .from('documents')
      .update({ 
        status: 'processing',
        processing_progress: 0,
        error_message: null,
      })
      .eq('id', documentId);

    // Processar documento
    const result = await processLargeDocument(
      supabase,
      documentId,
      text,
      targetChat || 'both',
      openAIKey
    );

    // Atualizar documento com resultado final
    await supabase
      .from('documents')
      .update({
        status: 'completed',
        processing_progress: 100,
        total_chunks: result.totalChunks,
        total_words: result.totalWords,
        is_readable: true,
      })
      .eq('id', documentId);

    // ========== ONBOARDING DE TAXONOMIA ==========
    let onboardingResult: { status: string; applied_count: number; pending_count: number; message: string } | null = null;
    
    try {
      console.log(`[process-document-v2] Starting taxonomy onboarding for ${documentId}`);
      
      const { data: onboardData, error: onboardError } = await supabase.rpc(
        'onboard_document_taxonomy',
        { p_document_id: documentId }
      );
      
      if (onboardError) {
        console.warn(`[process-document-v2] Onboarding warning:`, onboardError.message);
      } else if (onboardData && onboardData[0]) {
        const ob = onboardData[0] as { status: string; applied_count: number; pending_count: number; message: string };
        onboardingResult = ob;
        console.log(`[process-document-v2] Onboarding result: ${ob.status} - Applied: ${ob.applied_count}, Pending: ${ob.pending_count}`);
      }
    } catch (onboardException) {
      // Não falhar o processamento se onboarding falhar
      console.warn(`[process-document-v2] Onboarding exception (non-fatal):`, onboardException);
    }
    // ========== FIM ONBOARDING ==========

    console.log(`=== Document processed successfully ===`);
    console.log(`Total chunks: ${result.totalChunks}`);
    console.log(`Processing time: ${result.processingTimeMs}ms`);
    console.log(`Chunking type: ${result.chunkingConfig.contentType}`);

    return new Response(
      JSON.stringify({
        success: true,
        result,
        onboarding: onboardingResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("Error processing document:", errorMessage);
    console.error(errorStack);

    // Tentar atualizar status de erro no documento
    try {
      const { documentId } = await req.json().catch(() => ({}));
      if (documentId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from('documents')
          .update({ 
            status: 'error',
            error_message: errorMessage,
          })
          .eq('id', documentId);
      }
    } catch {
      // Ignore error update failures
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
