// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface ChatConfigUpdate {
  chatType: "study" | "health";
  matchThreshold?: number;
  matchCount?: number;
  scopeTopics?: string[];
  rejectionMessage?: string;
  systemPromptBase?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { chatType, ...updates } = await req.json() as ChatConfigUpdate;

    if (!chatType) {
      return new Response(
        JSON.stringify({ error: "chatType is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updating chat config for ${chatType}:`, updates);

    // Get current config
    const { data: currentConfig, error: fetchError } = await supabase
      .from("chat_config")
      .select("*")
      .eq("chat_type", chatType)
      .single();

    if (fetchError) {
      console.error("Error fetching current config:", fetchError);
      throw fetchError;
    }

    // Recalcular tags dos documentos
    const { data: tags } = await supabase
      .from("document_tags")
      .select(`
        tag_name,
        tag_type,
        confidence,
        documents!inner(target_chat, status)
      `)
      .eq("documents.target_chat", chatType)
      .eq("documents.status", "completed");

    // Agregar tags parent com confidence >= 0.7
    const parentTags = (tags || [])
      .filter((t: any) => t.tag_type === "parent" && t.confidence >= 0.7)
      .map((t: any) => t.tag_name);
    
    const uniqueTags = [...new Set(parentTags)];

    // Agregar dados completos das tags
    const tagStats = (tags || []).reduce((acc: any, tag: any) => {
      if (!acc[tag.tag_name]) {
        acc[tag.tag_name] = {
          tag_name: tag.tag_name,
          tag_type: tag.tag_type,
          confidences: [],
          count: 0
        };
      }
      acc[tag.tag_name].confidences.push(tag.confidence);
      acc[tag.tag_name].count++;
      return acc;
    }, {});

    const documentTagsData = Object.values(tagStats).map((stat: any) => ({
      tag_name: stat.tag_name,
      tag_type: stat.tag_type,
      avg_confidence: stat.confidences.reduce((a: number, b: number) => a + b, 0) / stat.confidences.length,
      count: stat.count
    })).sort((a: any, b: any) => b.count - a.count || b.avg_confidence - a.avg_confidence);

    // Update config
    const { error: updateError } = await supabase
      .from("chat_config")
      .update({
        ...(updates.matchThreshold !== undefined && { match_threshold: updates.matchThreshold }),
        ...(updates.matchCount !== undefined && { match_count: updates.matchCount }),
        ...(updates.scopeTopics !== undefined && { scope_topics: updates.scopeTopics }),
        ...(updates.rejectionMessage !== undefined && { rejection_message: updates.rejectionMessage }),
        ...(updates.systemPromptBase !== undefined && { system_prompt_base: updates.systemPromptBase }),
        scope_topics: uniqueTags,
        document_tags_data: documentTagsData,
        updated_at: new Date().toISOString(),
      })
      .eq("chat_type", chatType);

    if (updateError) {
      console.error("Error updating config:", updateError);
      throw updateError;
    }

    // Recalculate health issues
    const issues: any[] = [];

    // Check threshold
    const threshold = updates.matchThreshold ?? currentConfig.match_threshold;
    if (threshold > 0.3) {
      issues.push({
        type: "warning",
        message: `Threshold muito alto (${threshold}) pode causar rejeições falsas`,
      });
    }

    // Check match count
    const matchCount = updates.matchCount ?? currentConfig.match_count;
    if (matchCount < 3) {
      issues.push({
        type: "warning",
        message: `Match count baixo (${matchCount}) pode perder contexto`,
      });
    }

    // Check documents
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, is_readable")
      .eq("target_chat", chatType)
      .eq("status", "completed");

    if (docsError) {
      console.error("Error fetching documents:", docsError);
    } else {
      const totalDocs = documents?.length || 0;
      const unreadableDocs = documents?.filter((d) => !d.is_readable).length || 0;

      if (totalDocs === 0) {
        issues.push({
          type: "error",
          message: "Nenhum documento disponível para este chat",
        });
      } else if (totalDocs < 3) {
        issues.push({
          type: "warning",
          message: `Apenas ${totalDocs} documento(s) disponível(is)`,
        });
      }

      if (unreadableDocs > 0) {
        issues.push({
          type: "warning",
          message: `${unreadableDocs} documento(s) ilegível(is)`,
        });
      }
    }

    // Update health status
    const status = issues.some((i) => i.type === "error")
      ? "error"
      : issues.some((i) => i.type === "warning")
      ? "warning"
      : "ok";

    await supabase
      .from("chat_config")
      .update({ health_status: status, health_issues: issues })
      .eq("chat_type", chatType);

    console.log(`Chat config updated successfully for ${chatType}`);

    return new Response(
      JSON.stringify({
        success: true,
        chatType,
        healthStatus: status,
        issues,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in update-chat-config:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
