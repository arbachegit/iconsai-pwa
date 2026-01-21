// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { textSample } = await req.json();
    
    if (!textSample || textSample.length < 20) {
      return new Response(
        JSON.stringify({ error: 'Text sample too short', title: '' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured', title: '' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Analise o trecho inicial de um documento e sugira um título curto, claro e descritivo em português brasileiro.

REGRAS:
- Máximo 60 caracteres
- Seja objetivo e informativo
- Não use aspas no título
- Não inclua prefixos como "Título:" ou "Documento:"
- Retorne APENAS o título, sem explicações

Trecho do documento:
${textSample.slice(0, 1500)}`;

    console.log('Generating title for document with', textSample.length, 'chars');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { 
            role: "system", 
            content: "Você é um especialista em gerar títulos concisos e descritivos para documentos. Retorne apenas o título, sem explicações ou formatação adicional." 
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', title: '' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required', title: '' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI generation failed', title: '' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Clean up the title
    title = title
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/^título:\s*/i, '') // Remove "Título:" prefix
      .replace(/^documento:\s*/i, '') // Remove "Documento:" prefix
      .trim()
      .slice(0, 60);
    
    console.log('Generated title:', title);

    return new Response(
      JSON.stringify({ title, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generate-document-title:', error);
    return new Response(
      JSON.stringify({ error: errorMessage, title: '' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
