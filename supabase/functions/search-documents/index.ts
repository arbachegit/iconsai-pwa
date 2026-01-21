// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Extract keywords by removing Portuguese stopwords
function extractKeywords(query: string): string[] {
  const stopwords = ['quem', 'é', 'o', 'que', 'como', 'onde', 'qual', 'quando', 
                     'por', 'para', 'de', 'da', 'do', 'em', 'um', 'uma', 'os', 'as',
                     'fale', 'sobre', 'me', 'diga', 'explique', 'a', 'an', 'the', 'são'];
  
  return query
    .toLowerCase()
    .replace(/[?!.,;:]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.includes(word));
}

// Diversify results to ensure representation from multiple documents
function diversifyResults(results: any[], maxChunksPerDoc: number = 3, totalLimit: number = 20): any[] {
  if (!results || results.length === 0) return [];
  
  const docChunkCounts: Record<string, number> = {};
  const diversified: any[] = [];
  
  // Sort by similarity first to prioritize best matches
  const sorted = [...results].sort((a, b) => b.similarity - a.similarity);
  
  for (const chunk of sorted) {
    const docId = chunk.document_id;
    const currentCount = docChunkCounts[docId] || 0;
    
    // Only add if document hasn't reached its chunk limit
    if (currentCount < maxChunksPerDoc) {
      diversified.push(chunk);
      docChunkCounts[docId] = currentCount + 1;
      
      // Stop if we've reached total limit
      if (diversified.length >= totalLimit) break;
    }
  }
  
  console.log(`Diversification: ${results.length} -> ${diversified.length} chunks from ${Object.keys(docChunkCounts).length} unique documents`);
  return diversified;
}

// Extract potential filename from query
function extractFilename(query: string): string | null {
  // Match patterns like "wipo 2017.pdf", "documento.pdf", etc.
  const patterns = [
    /["']([^"']+\.pdf)["']/i,  // "filename.pdf" or 'filename.pdf'
    /:\s*["']?([^"'\s]+\.pdf)["']?/i,  // : filename.pdf
    /documento[s]?\s+["']?([^"'\s]+\.pdf)["']?/i,  // documento filename.pdf
    /arquivo[s]?\s+["']?([^"'\s]+\.pdf)["']?/i,  // arquivo filename.pdf
    /tem\s+(?:o\s+)?["']?([^"'\s]+\.pdf)["']?/i,  // tem filename.pdf
    /([a-zA-Z0-9_\-\s]+\.pdf)/i  // Generic: any word.pdf pattern
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

// Apply tag filters to search results (legacy)
async function applyTagFilters(
  supabase: any, 
  results: any[], 
  allowedTags: string[], 
  forbiddenTags: string[]
): Promise<any[]> {
  if (!results || results.length === 0) return results;
  if (allowedTags.length === 0 && forbiddenTags.length === 0) return results;
  
  // Fetch tags for documents in results
  const docIds = [...new Set(results.map((r: any) => r.document_id))];
  
  const { data: docTagsData } = await supabase
    .from("document_tags")
    .select("document_id, tag_name")
    .in("document_id", docIds);
  
  // Create map of tags by document
  const tagsByDoc: Record<string, string[]> = {};
  docTagsData?.forEach((dt: any) => {
    if (!tagsByDoc[dt.document_id]) tagsByDoc[dt.document_id] = [];
    tagsByDoc[dt.document_id].push(dt.tag_name.toLowerCase());
  });
  
  // Filter results
  const filteredResults = results.filter((r: any) => {
    const docTags = tagsByDoc[r.document_id] || [];
    
    // If allowedTags defined, document must have at least one allowed tag
    if (allowedTags.length > 0) {
      const hasAllowedTag = allowedTags.some((t: string) => 
        docTags.includes(t.toLowerCase())
      );
      if (!hasAllowedTag) return false;
    }
    
    // If forbiddenTags defined, document cannot have any forbidden tag
    if (forbiddenTags.length > 0) {
      const hasForbiddenTag = forbiddenTags.some((t: string) => 
        docTags.includes(t.toLowerCase())
      );
      if (hasForbiddenTag) return false;
    }
    
    return true;
  });
  
  console.log(`Tag filtering: ${results.length} -> ${filteredResults.length} results`);
  return filteredResults;
}

// Search using global taxonomy system (new)
async function searchByTaxonomy(
  supabase: any,
  queryEmbedding: number[],
  taxonomyCodes: string[],
  excludeCodes: string[] = [],
  matchThreshold: number = 0.15,
  matchCount: number = 10
): Promise<any[]> {
  console.log(`[searchByTaxonomy] Searching with codes: ${taxonomyCodes.join(', ')}`);
  
  const { data, error } = await supabase.rpc('search_by_taxonomy', {
    query_embedding: queryEmbedding,
    tag_codes: taxonomyCodes,
    exclude_tag_codes: excludeCodes.length > 0 ? excludeCodes : null,
    match_threshold: matchThreshold,
    match_count: matchCount
  });

  if (error) {
    console.error('[searchByTaxonomy] Error:', error);
    return [];
  }

  console.log(`[searchByTaxonomy] Found ${data?.length || 0} results`);
  return data || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { 
      query, 
      targetChat, 
      matchThreshold = 0.15, 
      matchCount = 5, 
      sessionId, 
      useHybridSearch = false,
      allowedTags = [],
      forbiddenTags = [],
      taxonomyCodes = [],         // Array of global taxonomy codes to include
      excludeTaxonomyCodes = []   // Array of global taxonomy codes to exclude
    } = await req.json();
    
    console.log(`Searching documents for query: "${query}" (target: ${targetChat})`);
    
    // Log filters if provided
    if (allowedTags.length > 0 || forbiddenTags.length > 0) {
      console.log(`Tag filters: allowed=[${allowedTags.join(',')}], forbidden=[${forbiddenTags.join(',')}]`);
    }
    if (taxonomyCodes.length > 0 || excludeTaxonomyCodes.length > 0) {
      console.log(`Taxonomy codes: include=[${taxonomyCodes.join(',')}], exclude=[${excludeTaxonomyCodes.join(',')}]`);
    }
    
    // Check if query contains a filename - if so, do filename search first
    const potentialFilename = extractFilename(query);
    let filenameResults: any[] = [];
    
    if (potentialFilename) {
      console.log(`Detected potential filename in query: "${potentialFilename}"`);
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Search documents by filename
      const { data: matchingDocs } = await supabase
        .from("documents")
        .select("id, filename")
        .eq("status", "completed")
        .eq("is_readable", true)
        .or(`and(is_inserted.eq.true,or(inserted_in_chat.eq.${targetChat},inserted_in_chat.eq.both)),and(is_inserted.eq.false,or(target_chat.eq.${targetChat},target_chat.eq.both))`)
        .ilike("filename", `%${potentialFilename.replace('.pdf', '').replace(/\s+/g, '%')}%`);
      
      if (matchingDocs && matchingDocs.length > 0) {
        console.log(`Found ${matchingDocs.length} documents matching filename pattern`);
        
        // Get chunks from matching documents
        const docIds = matchingDocs.map(d => d.id);
        const { data: chunks } = await supabase
          .from("document_chunks")
          .select("id, document_id, content, metadata, word_count")
          .in("document_id", docIds)
          .order("chunk_index")
          .limit(matchCount);
        
        if (chunks && chunks.length > 0) {
          // Map chunks to search result format
          const docMap = new Map(matchingDocs.map(d => [d.id, d.filename]));
          filenameResults = chunks.map(chunk => ({
            chunk_id: chunk.id,
            document_id: chunk.document_id,
            content: chunk.content,
            similarity: 0.95, // High score for exact filename match
            metadata: chunk.metadata,
            document_filename: docMap.get(chunk.document_id),
            search_type: 'filename'
          }));
          console.log(`Filename search: ${filenameResults.length} chunks from matching documents`);
        }
      }
    }
    
    // Generate embedding for the query
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });
    
    if (!embeddingResponse.ok) {
      throw new Error("Failed to generate query embedding");
    }
    
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Search for similar chunks
    let results;
    let error;
    let searchType = 'vector';
    
    // PRIORITY 1: If taxonomyCodes provided, use taxonomy-based search
    if (taxonomyCodes && taxonomyCodes.length > 0) {
      console.log(`Using taxonomy search with codes: ${taxonomyCodes.join(', ')}`);
      searchType = 'taxonomy';
      
      const taxonomyResults = await searchByTaxonomy(
        supabase,
        queryEmbedding,
        taxonomyCodes,
        excludeTaxonomyCodes.length > 0 ? excludeTaxonomyCodes : forbiddenTags, // Use excludeTaxonomyCodes or fallback to forbiddenTags
        matchThreshold,
        matchCount * 2 // Fetch more for diversification
      );

      if (taxonomyResults.length > 0) {
        // Format results to expected standard
        const formattedResults = taxonomyResults.map((r: any) => ({
          chunk_id: r.chunk_id,
          document_id: r.document_id,
          content: r.content,
          similarity: r.similarity,
          document_filename: r.document_filename,
          tags: r.tags,
          search_type: 'taxonomy'
        }));

        // Diversify and limit results
        results = diversifyResults(formattedResults, 3, matchCount);
        console.log(`Taxonomy search: ${results.length} diversified results`);
        
        // Calculate latency and log analytics
        const latencyMs = Date.now() - startTime;
        const topScore = results.length > 0 ? results[0].similarity : null;
        
        console.log(`RAG Taxonomy Search completed: ${results.length} results, top score: ${topScore?.toFixed(3) || 'N/A'}, latency: ${latencyMs}ms`);
        
        // Log analytics asynchronously
        supabase.from("rag_analytics").insert({
          query: query,
          target_chat: targetChat || null,
          latency_ms: latencyMs,
          success_status: results.length > 0,
          results_count: results.length,
          top_similarity_score: topScore,
          match_threshold: matchThreshold,
          session_id: sessionId || null,
          metadata: {
            match_count_requested: matchCount,
            search_type: 'taxonomy',
            taxonomy_codes: taxonomyCodes
          }
        }).then(
          () => console.log("Analytics logged (taxonomy)"),
          (err: Error) => console.error("Analytics logging failed:", err)
        );
        
        return new Response(
          JSON.stringify({
            success: true,
            results: results,
            count: results.length,
            search_type: 'taxonomy',
            taxonomy_codes: taxonomyCodes,
            analytics: {
              latency_ms: latencyMs,
              top_score: topScore
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log('Taxonomy search returned no results, falling back to legacy search');
      searchType = 'taxonomy_fallback';
    }
    
    // PRIORITY 2: Hybrid or vector search (legacy)
    if (useHybridSearch) {
      // Hybrid Search: Combine vector similarity + tag matching
      console.log("Using hybrid search (vector + tags)");
      
      // 1. Get vector search results
      const vectorResults = await supabase.rpc("search_documents", {
        query_embedding: queryEmbedding,
        target_chat_filter: targetChat,
        match_threshold: matchThreshold,
        match_count: matchCount * 3 // Get more results for diversification
      });
      
      if (vectorResults.error) {
        console.error("Vector search error:", vectorResults.error);
        throw vectorResults.error;
      }
      
      // 2. Extract document IDs from vector results
      const docIds = [...new Set(vectorResults.data?.map((r: any) => r.document_id) || [])];
      
      // 3. Fetch tags for these documents
      const { data: docTags } = await supabase
        .from("document_tags")
        .select("document_id, tag_name, confidence")
        .in("document_id", docIds);
      
      // 4. Simple keyword matching for tag scoring
      const queryWords = query.toLowerCase().split(/\s+/);
      const tagScores: Record<string, number> = {};
      
      docTags?.forEach((tag: any) => {
        const tagWords = tag.tag_name.toLowerCase().split(/\s+/);
        const matchCount = queryWords.filter((qw: string) => 
          tagWords.some((tw: string) => tw.includes(qw) || qw.includes(tw))
        ).length;
        
        if (matchCount > 0) {
          const score = (matchCount / queryWords.length) * (tag.confidence || 0.5);
          tagScores[tag.document_id] = (tagScores[tag.document_id] || 0) + score;
        }
      });
      
      // 5. Combine scores: α × vector_similarity + β × tag_score
      const alpha = 0.7; // Weight for vector similarity
      const beta = 0.3;  // Weight for tag matching
      
      const scoredResults = vectorResults.data?.map((r: any) => {
        const vectorScore = r.similarity;
        const tagScore = tagScores[r.document_id] || 0;
        const hybridScore = (alpha * vectorScore) + (beta * tagScore);
        
        return {
          ...r,
          similarity: hybridScore,
          vector_score: vectorScore,
          tag_score: tagScore
        };
      }).sort((a: any, b: any) => b.similarity - a.similarity);
      
      // Apply diversification to ensure multiple documents are represented
      results = diversifyResults(scoredResults || [], 3, matchCount);
      
      // Apply tag filters if provided (for hybrid search)
      if (results && results.length > 0 && (allowedTags.length > 0 || forbiddenTags.length > 0)) {
        results = await applyTagFilters(supabase, results, allowedTags, forbiddenTags);
      }

      console.log(`Hybrid search: ${results?.length || 0} results (combined vector + tags)`);
    } else {
      // Standard vector search - fetch MORE results for diversification
      console.log(`Attempting vector search with threshold ${matchThreshold}`);
      const searchResults = await supabase.rpc("search_documents", {
        query_embedding: queryEmbedding,
        target_chat_filter: targetChat,
        match_threshold: matchThreshold,
        match_count: matchCount * 3 // Fetch 3x more for diversification pool
      });
      
      results = searchResults.data;
      error = searchResults.error;
      
      if (error) {
        console.error("Vector search error:", error);
        throw error;
      }
      
      // Apply diversification to ensure multiple documents are represented
      results = diversifyResults(results || [], 3, matchCount);
      
      // Apply tag filters if provided (for vector search)
      if (results && results.length > 0 && (allowedTags.length > 0 || forbiddenTags.length > 0)) {
        results = await applyTagFilters(supabase, results, allowedTags, forbiddenTags);
      }
      
      console.log(`Vector search: ${results?.length || 0} diversified chunks`);
      
      // FALLBACK: If vector search returns 0 results, try keyword-based search
      if (!results || results.length === 0) {
        console.log("Vector search returned 0 results, falling back to keyword search...");
        searchType = 'keyword';
        
        // Extract keywords from query
        const keywords = extractKeywords(query);
        console.log(`Extracted keywords: [${keywords.join(', ')}]`);
        
        if (keywords.length > 0) {
          const keywordResults = await supabase.rpc("search_documents_keywords", {
            keywords: keywords,
            target_chat_filter: targetChat,
            match_count: matchCount
          });
          
          if (keywordResults.error) {
            console.error("Keyword search error:", keywordResults.error);
          } else {
            results = keywordResults.data?.map((r: any) => ({
              ...r,
              search_type: 'keyword'
            })) || [];
            console.log(`Keyword search: ${results.length} matching chunks`);
          }
        }
      }
    }
    
    // Merge filename results with vector/hybrid results
    if (filenameResults.length > 0) {
      console.log(`Merging ${filenameResults.length} filename results with ${results?.length || 0} vector results`);
      
      // Create a set of chunk IDs already in filename results
      const filenameChunkIds = new Set(filenameResults.map(r => r.chunk_id));
      
      // Add vector results that aren't duplicates
      const vectorResultsFiltered = (results || []).filter((r: any) => !filenameChunkIds.has(r.chunk_id));
      
      // Combine: filename results first (higher priority), then vector results
      results = [...filenameResults, ...vectorResultsFiltered].slice(0, matchCount);
      searchType = 'filename+vector';
      
      console.log(`Combined results: ${results.length} chunks`);
    }
    
    // Calcular latência e top score
    const latencyMs = Date.now() - startTime;
    const topScore = results && results.length > 0 ? results[0].similarity : null;
    
    console.log(`RAG Search completed: ${results?.length || 0} results, top score: ${topScore?.toFixed(3) || 'N/A'}, latency: ${latencyMs}ms`);
    
    // Logar analytics de forma assíncrona (não bloqueia resposta)
    supabase.from("rag_analytics").insert({
      query: query,
      target_chat: targetChat || null,
      latency_ms: latencyMs,
      success_status: !error && (results?.length > 0),
      results_count: results?.length || 0,
      top_similarity_score: topScore,
      match_threshold: matchThreshold,
      session_id: sessionId || null,
      metadata: {
        match_count_requested: matchCount
      }
    }).then(
      () => console.log("Analytics logged"),
      (err: Error) => console.error("Analytics logging failed:", err)
    );
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        results: results || [],
        count: results?.length || 0,
        search_type: searchType,
        analytics: {
          latency_ms: latencyMs,
          top_score: topScore
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error searching documents:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});