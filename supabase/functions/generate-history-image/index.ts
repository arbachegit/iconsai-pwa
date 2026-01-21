// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { eraId, forceRegenerate } = await req.json();
    
    // Initialize Supabase client for caching
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    if (!eraId) {
      throw new Error("Era ID é obrigatório");
    }
    
    // Check cache first (unless forced regeneration)
    const cacheKey = `history-${eraId}`;
    
    if (!forceRegenerate) {
      const { data: cached } = await supabaseClient
        .from('generated_images')
        .select('image_url')
        .eq('section_id', cacheKey)
        .maybeSingle();
      
      if (cached?.image_url) {
        console.log(`Cache hit para era: ${eraId}`);
        return new Response(
          JSON.stringify({ imageUrl: cached.image_url, fromCache: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não está configurada");
    }

    console.log(`Iniciando geração de imagem para: ${eraId}`);

    const eraPrompts: Record<string, string> = {
      talos: "Estátua colossal de bronze de Talos, autômato mitológico grego protetor de Creta, pose heroica com engrenagens visíveis no peito, estilo art déco dourado e sépia, iluminação dramática, fundo mediterrâneo antigo, webp sem texto",
      'telegraphy-cards': "Fotografia histórica documental realista: à esquerda, telégrafo elétrico original de Samuel Morse (1837) em mesa de madeira com operador de época em traje vitoriano enviando código Morse, aparelho de bronze e mogno com manipulador telegráfico, bateria voltaica e fios de cobre visíveis; à direita, máquina tabuladora Hollerith original (1890) processando cartões perfurados do censo americano, cartões de papel com padrão de furos retangulares empilhados, engrenagens mecânicas expostas, ambiente de escritório governamental do século XIX, estilo fotográfico documental preto e branco de arquivo histórico, grão de foto antiga, iluminação natural difusa de janela, webp sem texto",
      'turing-machine': "Diagrama conceitual da Máquina de Turing de 1936, fita infinita com símbolos binários 0 e 1, cabeça de leitura e escrita mecânica, estilo blueprint técnico vintage em tons azuis e pretos, linhas precisas de engenharia, webp sem texto",
      enigma: "Máquina Enigma alemã sobre mesa de madeira em Bletchley Park, rotores e fiação visíveis, ambiente de sala de operações secreta anos 1940, estilo fotográfico documental preto e branco com tons sépia, iluminação de lâmpada de época, webp sem texto",
      'turing-test': "Alan Turing observando tela de terminal vintage anos 1950, sala de computação com máquinas de tubo de vácuo ao fundo, conceito do Jogo da Imitação, estilo retrofuturista com tons azuis e verdes, atmosfera científica, webp sem texto",
      arpanet: "Primeiro computador IMP da ARPANET na UCLA em 1969, mainframe com luzes indicadoras piscando, cabos de rede conectados, pesquisadores de jaleco branco ao fundo, estilo documental fotográfico anos 60, tons de verde e cinza, webp sem texto",
      tcpip: "Diagrama de rede TCP/IP mostrando pacotes de dados fluindo entre múltiplos nós interconectados, estilo blueprint tecnológico com gradientes azuis e verdes, linhas de conexão dinâmicas, visualização de protocolo de camadas, webp sem texto",
      www: "Tim Berners-Lee no CERN em 1989 frente ao computador NeXT, primeira página web visível no monitor CRT, laboratório científico com equipamentos dos anos 80, estilo documental de época, tons neutros e azuis, webp sem texto",
      social: "Interfaces vintage de Facebook e Orkut em 2004 exibidas em monitores CRT, telas com perfis sociais e ícones de comunidades, estilo nostálgico digital dos anos 2000, predominância de tons azuis e brancos, atmosfera de início da Web 2.0, webp sem texto",
      watson: "IBM Watson no palco do programa Jeopardy! em 2011, painéis luminosos azuis do supercomputador, avatares digitais de competidores humanos ao lado, telão com perguntas do quiz, iluminação dramática de estúdio de TV, tons azuis tecnológicos, webp sem texto",
      openai: "Conceito visual abstrato da fundação OpenAI em 2015, redes neurais artificiais fluindo em padrões orgânicos, gradientes vibrantes de cyan e roxo neon, partículas de dados luminosas, estilo futurista minimalista e científico, webp sem texto",
      gpt3: "Interface do GPT-3 Playground em 2020, terminal de código com texto gerado por IA em tempo real, partículas representando linguagem natural flutuante, gradientes tecnológicos verdes e azuis, estilo moderno de desenvolvimento tech, webp sem texto",
      chatgpt: "Interface moderna e limpa do ChatGPT em 2022, bolhas de mensagens elegantes em conversação, representação de diálogo humano-IA fluido, gradientes suaves de cyan e roxo, design minimalista contemporâneo de aplicativo, webp sem texto",
      current: "Colagem futurista 2024 com símbolos visuais de Gemini, GPT-4, Claude e Veo Sora, redes neurais complexas entrelaçadas, hologramas de inteligência artificial, gradientes vibrantes multi-coloridos estilo cyberpunk, partículas de dados luminosas, webp sem texto"
    };

    const normalizedEraId = String(eraId).trim();
    const prompt = eraPrompts[normalizedEraId] ?? `Ilustração da era histórica ${normalizedEraId} na evolução da IA e da Internet, estilo futurista minimalista, webp sem texto`;

    console.log(`Usando prompt para era: ${normalizedEraId}`);

    console.log(`Gerando imagem para era: ${eraId}`);

    console.log(`Chamando Lovable AI Gateway com modelo: google/gemini-3-pro-image-preview`);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API Lovable AI:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Falha ao gerar imagem: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Response data structure:", JSON.stringify({
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      hasImages: !!data.choices?.[0]?.message?.images,
      imagesLength: data.choices?.[0]?.message?.images?.length,
      firstImageType: data.choices?.[0]?.message?.images?.[0]?.type,
    }));
    
    // Try multiple possible response structures
    let base64Image;
    
    // Structure 1: choices[0].message.images[0].image_url.url
    if (data.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
      base64Image = data.choices[0].message.images[0].image_url.url;
      console.log("Found image at: choices[0].message.images[0].image_url.url");
    }
    // Structure 2: choices[0].message.content (might be base64)
    else if (data.choices?.[0]?.message?.content) {
      base64Image = data.choices[0].message.content;
      console.log("Found image at: choices[0].message.content");
    }
    // Structure 3: Direct image field
    else if (data.image) {
      base64Image = data.image;
      console.log("Found image at: data.image");
    }

    if (!base64Image) {
      console.error("Full response data:", JSON.stringify(data, null, 2));
      throw new Error("Nenhuma imagem gerada na resposta. Estrutura de resposta não reconhecida.");
    }
    
    console.log("Base64 image length:", base64Image.length);
    
    // Convert Base64 to binary
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    console.log("Binary data size:", binaryData.length, "bytes");
    
    // Upload to Storage as WebP
    const fileName = `${cacheKey}.webp`;
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('timeline-images')
      .upload(fileName, binaryData, {
        contentType: 'image/webp',
        upsert: true
      });
    
    if (uploadError) {
      console.error("Erro ao fazer upload para Storage:", uploadError);
      throw new Error(`Falha ao salvar imagem no Storage: ${uploadError.message}`);
    }
    
    console.log("Upload bem-sucedido:", uploadData);
    
    // Get public URL
    const { data: publicUrlData } = supabaseClient
      .storage
      .from('timeline-images')
      .getPublicUrl(fileName);
    
    const publicUrl = publicUrlData.publicUrl;
    console.log("URL pública gerada:", publicUrl);
    
    // Save URL to cache (not Base64)
    await supabaseClient
      .from('generated_images')
      .upsert({
        section_id: cacheKey,
        prompt_key: eraId,
        image_url: publicUrl,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'section_id'
      });
    
    console.log(`Imagem WebP salva no Storage e cacheada para era: ${eraId}`);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl, fromCache: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro ao gerar imagem histórica:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
