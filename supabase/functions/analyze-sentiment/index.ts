// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { text } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI for sentiment analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um analisador de sentimento. Analise o texto fornecido e retorne APENAS um JSON válido neste formato exato:
{"sentiment": "positive" ou "negative" ou "neutral", "score": número entre 0 e 1}

Regras:
- positive: satisfação, gratidão, emoções positivas (score > 0.6)
- negative: insatisfação, frustração, reclamações (score < 0.4)
- neutral: informativo, sem emoção clara (score 0.4-0.6)
- Retorne APENAS o JSON, nada mais`
          },
          {
            role: 'user',
            content: `Analise o sentimento deste texto: "${text}"`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI Gateway error:', response.status, await response.text());
      return new Response(
        JSON.stringify({ error: 'Failed to analyze sentiment' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    let result;
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
    } catch (e) {
      console.error('Failed to parse sentiment response:', content);
      // Default to neutral if parsing fails
      result = { sentiment: 'neutral', score: 0.5 };
    }

    return new Response(
      JSON.stringify({
        sentiment_label: result.sentiment || 'neutral',
        sentiment_score: parseFloat(result.score || 0.5).toFixed(2)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-sentiment function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});