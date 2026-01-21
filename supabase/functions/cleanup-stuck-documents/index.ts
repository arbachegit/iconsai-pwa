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
    console.log("🔍 Checking for stuck documents...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar documentos com status='processing' há mais de 2 minutos
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: stuckDocs, error } = await supabase
      .from("documents")
      .select("id, filename, updated_at")
      .eq("status", "processing")
      .lt("updated_at", twoMinutesAgo);
    
    if (error) {
      console.error("Error querying stuck documents:", error);
      throw error;
    }
    
    if (!stuckDocs || stuckDocs.length === 0) {
      console.log("✅ No stuck documents found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No stuck documents found",
          count: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`⚠️ Found ${stuckDocs.length} stuck document(s), resetting to pending...`);
    
    const resetResults = [];
    
    for (const doc of stuckDocs) {
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          status: "pending",
          error_message: "Processo travado, reclassificado como pendente para reprocessamento"
        })
        .eq("id", doc.id);
      
      if (updateError) {
        console.error(`Failed to reset document ${doc.filename}:`, updateError);
        resetResults.push({
          document_id: doc.id,
          filename: doc.filename,
          success: false,
          error: updateError.message
        });
      } else {
        console.log(`✅ Document ${doc.filename} reset to pending`);
        resetResults.push({
          document_id: doc.id,
          filename: doc.filename,
          success: true
        });
      }
    }
    
    const successCount = resetResults.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reset ${successCount}/${stuckDocs.length} stuck documents`,
        count: successCount,
        results: resetResults
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in cleanup-stuck-documents:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});