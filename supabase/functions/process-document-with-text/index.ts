// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { documentId, text, filename, targetChat } = await req.json();
    
    console.log(`Processing document ${documentId}: ${filename}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Validate text
    if (!text || text.length < 100) {
      await supabase
        .from("documents")
        .update({ 
          status: "failed", 
          error_message: "Texto muito curto (mínimo 100 caracteres)",
          is_readable: false 
        })
        .eq("id", documentId);
      
      return new Response(
        JSON.stringify({ error: "Texto muito curto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate character ratio
    const validChars = text.match(/[a-zA-Z0-9\s]/g)?.length || 0;
    const ratio = validChars / text.length;
    
    if (ratio < 0.8) {
      await supabase
        .from("documents")
        .update({ 
          status: "failed", 
          error_message: "Proporção de caracteres inválida (< 80%)",
          is_readable: false 
        })
        .eq("id", documentId);
      
      return new Response(
        JSON.stringify({ error: "Texto contém muitos caracteres inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Update document status to processing
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);
    
    // Chunking with overlap
    const chunkSize = 750; // words
    const overlapSize = 175; // words (150-200)
    const words = text.split(/\s+/);
    const chunks: { content: string; index: number; wordCount: number }[] = [];
    
    for (let i = 0; i < words.length; i += (chunkSize - overlapSize)) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkContent = chunkWords.join(" ");
      
      chunks.push({
        content: chunkContent,
        index: chunks.length,
        wordCount: chunkWords.length
      });
      
      if (i + chunkSize >= words.length) break;
    }
    
    console.log(`Created ${chunks.length} chunks`);
    
    // Generate embeddings for each chunk
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    
    for (const chunk of chunks) {
      console.log(`Generating embedding for chunk ${chunk.index}`);
      
      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAIKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: chunk.content,
        }),
      });
      
      if (!embeddingResponse.ok) {
        console.error(`Failed to generate embedding for chunk ${chunk.index}`);
        continue;
      }
      
      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data[0].embedding;
      
      // Save chunk to database
      await supabase.from("document_chunks").insert({
        document_id: documentId,
        chunk_index: chunk.index,
        content: chunk.content,
        word_count: chunk.wordCount,
        embedding: embedding,
        metadata: { target_chat: targetChat }
      });
    }
    
    // Update document with completion status
    await supabase
      .from("documents")
      .update({ 
        status: "completed",
        total_chunks: chunks.length,
        total_words: words.length
      })
      .eq("id", documentId);
    
    console.log(`Document ${documentId} processed successfully`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks: chunks.length,
        documentId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error processing document:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});