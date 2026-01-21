// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SECTION_PROMPTS: Record<string, string> = {
  'software': 'Ilustração futurista dos anos 1940-1980: primeiros computadores mainframe, programadores com cartões perfurados, linguagens de programação em monitores verdes, nascimento da era digital. Estilo tecnológico vintage. Ultra high resolution. Sem texto.',
  'internet': 'Visualização artística da conectividade global anos 1990-2000: rede de computadores interconectados, fibras ópticas brilhantes, globo terrestre com linhas de conexão, revolução digital. Ultra high resolution. Sem texto.',
  'tech-sem-proposito': 'Representação crítica do hype tecnológico: metaverso vazio e sombrio, NFTs flutuando sem propósito, realidade virtual abandonada, contraste entre promessa e realidade. Ultra high resolution. Sem texto.',
  'kubrick': 'O icônico olho vermelho do HAL 9000 do filme 2001: Uma Odisseia no Espaço, lente circular vermelha brilhante em fundo escuro, estilo cinematográfico de Stanley Kubrick. Ultra high resolution. Sem texto.',
  'watson': 'IBM Watson vencendo no Jeopardy 2011: computador azul IBM em palco de game show, luzes brilhantes, inteligência artificial cognitiva processando linguagem natural. Ultra high resolution. Sem texto.',
  'ia-nova-era': 'Era moderna da IA generativa 2022-presente: interface de chat com IA, assistentes virtuais conversacionais, ChatGPT, comunicação natural humano-máquina, democratização da inteligência artificial. Ultra high resolution. Sem texto.',
  'bom-prompt': 'Arte conceitual de comunicação efetiva: pessoa digitando prompt perfeito, palavras formando conexão com IA, clareza e especificidade visual, a arte de fazer boas perguntas. Ultra high resolution. Sem texto.',
  'knowyou': 'Representação visual do KnowYOU AI: assistente de saúde digital inteligente, interface conversacional moderna com elementos médicos e tecnológicos, tons de azul médico e roxo tecnológico, símbolo de cruz médica integrado com inteligência artificial, cuidado personalizado ao paciente. Ultra high resolution. Sem texto.',
  'digital-exclusion': 'Visualização artística da exclusão digital global: 5.74 bilhões de pessoas sem acesso à internet representadas como silhuetas em tons escuros, contraste entre mundo conectado iluminado e desconectado nas sombras, mapa mundial mostrando divisão digital, barreiras linguísticas e cognitivas representadas visualmente, esperança de inclusão através de pontes de luz tecnológica. Ultra high resolution. Sem texto.',
  
  // Tooltips
  'tooltip-software': 'Ícone visual representando o nascimento da computação: silhueta de mainframe vintage com cartões perfurados, tons de sépia e dourado, estilo minimalista retro. Ultra high resolution. Sem texto.',
  'tooltip-internet': 'Ícone visual da era da conectividade: rede global de nós interconectados, fibras ópticas em azul elétrico, globo digital minimalista. Ultra high resolution. Sem texto.',
  'tooltip-tech-sem-proposito': 'Ícone crítico do hype tech: símbolo de NFT e metaverso desbotado, realidade virtual vazia, tons escuros e cinzentos. Ultra high resolution. Sem texto.',
  'tooltip-kubrick': 'Ícone do olho HAL 9000: lente vermelha circular minimalista em fundo preto, estilo cinematográfico icônico. Ultra high resolution. Sem texto.',
  'tooltip-watson': 'Ícone do IBM Watson: representação minimalista do supercomputador azul IBM, símbolo de IA cognitiva. Ultra high resolution. Sem texto.',
  'tooltip-ia-nova-era': 'Ícone da IA generativa moderna: interface de chat minimalista, balão de diálogo com símbolo de IA, tons modernos em azul e roxo. Ultra high resolution. Sem texto.',
  'tooltip-bom-prompt': 'Ícone da arte do prompt: teclado estilizado com palavras fluindo para símbolo de IA, comunicação visual clara. Ultra high resolution. Sem texto.',
  'tooltip-knowyou': 'Ícone do KnowYOU AI: representação minimalista de assistente de saúde digital, cruz médica integrada com símbolo de IA, tons de verde e azul saúde. Ultra high resolution. Sem texto.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { section_id } = await req.json();

    if (!section_id) {
      console.error('Missing section_id');
      return new Response(
        JSON.stringify({ error: 'section_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = SECTION_PROMPTS[section_id];
    if (!prompt) {
      console.error('Invalid section_id:', section_id);
      return new Response(
        JSON.stringify({ error: 'section_id inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating image for section:', section_id);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos ao seu workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao gerar imagem' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('No image URL in response');
      return new Response(
        JSON.stringify({ error: 'Nenhuma imagem foi gerada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Image generated successfully for section:', section_id);

    // Convert Base64 to binary
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    console.log(`Binary size: ${binaryData.length} bytes`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.7.1');
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Upload to Storage as WebP
    const fileName = `${section_id}.webp`;
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('content-images')
      .upload(fileName, binaryData, {
        contentType: 'image/webp',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar imagem no Storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabaseClient
      .storage
      .from('content-images')
      .getPublicUrl(fileName);

    const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
    console.log('Image uploaded to Storage:', publicUrl);

    // Save URL to database
    const { error: dbError } = await supabaseClient
      .from('generated_images')
      .upsert({
        section_id,
        prompt_key: section_id,
        image_url: publicUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'section_id' });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return new Response(
      JSON.stringify({ imageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-section-image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
