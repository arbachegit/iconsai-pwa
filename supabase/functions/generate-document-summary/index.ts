// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * Detects if a filename needs to be renamed (is unintelligible)
 */
function needsRenaming(filename: string): boolean {
  // Remove file extension before analysis
  const cleanTitle = filename.replace(/\.(pdf|docx?|txt|xlsx?|pptx?|csv|rtf|odt)$/i, '').trim();
  
  if (cleanTitle.length === 0) return true;
  
  // Calculate ratio of numeric characters
  const numericRatio = (cleanTitle.match(/\d/g) || []).length / cleanTitle.length;
  
  // Check for UUID pattern
  const hasUUID = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(cleanTitle);
  
  // Check for hash pattern (16+ hex chars)
  const hasHash = /^[a-f0-9]{16,}$/i.test(cleanTitle.replace(/[^a-z0-9]/gi, ''));
  
  // Count readable characters (letters and accented chars)
  const readableChars = cleanTitle.replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, '').trim();
  
  // Check for technical/generic filename patterns
  const technicalPattern = /^(doc|file|scan|img|pdf|download|document|arquivo|upload|temp|tmp|copy|copia)[-_]?[a-z0-9]+$/i.test(cleanTitle);
  
  // Check for patterns like "123_abc" or "abc-123-xyz"
  const mixedPattern = /^[a-z0-9]{1,3}[-_][a-z0-9]+[-_][a-z0-9]+$/i.test(cleanTitle);
  
  return (
    numericRatio > 0.5 || 
    hasUUID || 
    hasHash || 
    readableChars.length < 3 || 
    technicalPattern ||
    mixedPattern
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, text, filename } = await req.json();
    
    console.log(`Generating summary for document ${documentId}, filename: ${filename || 'unknown'}`);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    
    // Check if filename needs renaming
    const shouldGenerateTitle = filename ? needsRenaming(filename) : false;
    console.log(`Filename needs renaming: ${shouldGenerateTitle}`);
    
    // Build system prompt based on whether we need a title
    const systemPrompt = shouldGenerateTitle
      ? `Você é um especialista em análise de documentos. Analise o texto e retorne um JSON com:
1. Um resumo de 150-300 palavras
2. Uma avaliação de legibilidade (0.0 a 1.0)
3. Se o texto é coerente e utilizável (true/false)
4. Um título descritivo curto (máximo 80 caracteres) que descreva o conteúdo do documento

IMPORTANTE: Retorne APENAS um JSON válido, sem markdown, sem explicações.

Formato esperado:
{
  "summary": "Resumo do documento...",
  "readabilityScore": 0.85,
  "isReadable": true,
  "suggestedTitle": "Título descritivo do documento"
}`
      : `Você é um especialista em análise de documentos. Analise o texto e retorne um JSON com:
1. Um resumo de 150-300 palavras
2. Uma avaliação de legibilidade (0.0 a 1.0)
3. Se o texto é coerente e utilizável (true/false)

IMPORTANTE: Retorne APENAS um JSON válido, sem markdown, sem explicações.

Formato esperado:
{
  "summary": "Resumo do documento...",
  "readabilityScore": 0.85,
  "isReadable": true
}`;
    
    // Use Lovable AI to generate summary and assess readability
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Analise este documento:\n\n${text.substring(0, 5000)}`
          }
        ],
        temperature: 0.3,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let analysis;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse analysis JSON:", content);
      throw new Error("Failed to parse AI response");
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Build update object
    const updateData: Record<string, unknown> = {
      ai_summary: analysis.summary,
      readability_score: analysis.readabilityScore,
      is_readable: analysis.isReadable
    };
    
    // Add ai_title if generated and auto-apply to filename
    if (shouldGenerateTitle && analysis.suggestedTitle) {
      updateData.ai_title = analysis.suggestedTitle;
      updateData.filename = analysis.suggestedTitle; // Auto-aplicar ao filename
      updateData.original_title = filename; // Preservar o nome original
      updateData.title_was_renamed = true;
      updateData.title_source = 'ai';
      updateData.renamed_at = new Date().toISOString();
      updateData.rename_reason = 'approved_ai_suggestion';
      updateData.needs_title_review = false; // Já aplicado automaticamente
      console.log(`Generated and applied AI title: ${analysis.suggestedTitle}`);
    }
    
    // Update document with summary and readability
    await supabase
      .from("documents")
      .update(updateData)
      .eq("id", documentId);
    
    console.log(`Summary generated for document ${documentId}`);
    
    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error generating summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
