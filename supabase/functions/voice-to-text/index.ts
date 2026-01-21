// ============================================
// VERSAO: 2.3.0 | DEPLOY: 2026-01-08
// CORREÇÃO: Tratamento específico para audio_too_short
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// ============================================
// HELPER: Detectar mimeType pelo magic number
// ============================================
function detectMimeTypeByMagicNumber(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  
  // Converter primeiros bytes para hex
  const header = Array.from(bytes.slice(0, 12))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  console.log('[VOICE-TO-TEXT] Magic number (hex):', header);
  
  // WebM: 1A 45 DF A3
  if (header.startsWith('1a45dfa3')) {
    return 'audio/webm';
  }
  
  // MP4/M4A: ftyp em offset 4-7
  if (header.slice(8, 16) === '66747970') {
    return 'audio/mp4';
  }
  
  // WAV: RIFF....WAVE
  if (header.startsWith('52494646')) {
    return 'audio/wav';
  }
  
  // MP3: FF FB, FF F3, FF F2 ou ID3
  if (header.startsWith('fffb') || header.startsWith('fff3') || 
      header.startsWith('fff2') || header.startsWith('494433')) {
    return 'audio/mpeg';
  }
  
  // OGG: OggS
  if (header.startsWith('4f676753')) {
    return 'audio/ogg';
  }
  
  // FLAC: fLaC
  if (header.startsWith('664c6143')) {
    return 'audio/flac';
  }
  
  return null;
}

// ============================================
// HELPER: Validar e normalizar mimeType
// ============================================
function validateAndNormalizeMimeType(
  providedMimeType: string | undefined,
  bytes: Uint8Array
): { mimeType: string; extension: string } {
  
  // Formatos suportados pelo Whisper: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
  const VALID_TYPES: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/ogg': 'ogg',
    'audio/opus': 'ogg',
    'audio/flac': 'flac',
  };
  
  // 1. Detectar pelo magic number primeiro (mais confiável)
  const detectedMime = detectMimeTypeByMagicNumber(bytes);
  if (detectedMime && VALID_TYPES[detectedMime]) {
    console.log('[VOICE-TO-TEXT] mimeType detectado por magic number:', detectedMime);
    return { mimeType: detectedMime, extension: VALID_TYPES[detectedMime] };
  }
  
  // 2. Tentar usar o mimeType fornecido
  if (providedMimeType) {
    // Remover codecs (ex: audio/webm;codecs=opus -> audio/webm)
    const baseMime = providedMimeType.split(';')[0].trim().toLowerCase();
    
    if (VALID_TYPES[baseMime]) {
      console.log('[VOICE-TO-TEXT] Usando mimeType fornecido:', baseMime);
      return { mimeType: baseMime, extension: VALID_TYPES[baseMime] };
    }
  }
  
  // 3. Fallback para webm (mais comum em browsers modernos)
  console.log('[VOICE-TO-TEXT] ⚠️ Usando fallback: audio/webm');
  return { mimeType: 'audio/webm', extension: 'webm' };
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const { audio, mimeType: providedMimeType } = body;
    
    console.log('[VOICE-TO-TEXT] ========== NOVA REQUISIÇÃO ==========');
    console.log('[VOICE-TO-TEXT] mimeType recebido:', providedMimeType || '(vazio)');
    
    if (!audio) {
      console.error('[VOICE-TO-TEXT] ❌ Áudio não fornecido');
      return new Response(
        JSON.stringify({ error: 'Áudio não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('[VOICE-TO-TEXT] ❌ OPENAI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Serviço de transcrição não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strip data URL prefix if present
    let base64Data = audio;
    let dataUrlMimeType: string | undefined;
    
    if (audio.includes(',')) {
      const parts = audio.split(',');
      base64Data = parts[1] || '';
      
      // Extrair mime type do data URL como fallback
      const mimeMatch = parts[0].match(/data:([^;]+)/);
      if (mimeMatch) {
        dataUrlMimeType = mimeMatch[1];
        console.log('[VOICE-TO-TEXT] mimeType do data URL:', dataUrlMimeType);
      }
    }
    
    // Validar base64
    if (!base64Data || base64Data.length < 100) {
      console.error('[VOICE-TO-TEXT] ❌ Base64 muito curto:', base64Data?.length);
      return new Response(
        JSON.stringify({ error: 'Áudio muito curto. Grave por mais tempo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[VOICE-TO-TEXT] Base64 length:', base64Data.length);

    // Decode base64
    let bytes: Uint8Array;
    try {
      const binaryString = atob(base64Data);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    } catch (decodeError) {
      console.error('[VOICE-TO-TEXT] ❌ Erro ao decodificar base64:', decodeError);
      return new Response(
        JSON.stringify({ error: 'Formato de áudio inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[VOICE-TO-TEXT] Bytes decodificados:', bytes.length);
    
    if (bytes.length < 1000) {
      console.error('[VOICE-TO-TEXT] ❌ Arquivo muito pequeno:', bytes.length);
      return new Response(
        JSON.stringify({ error: 'Áudio muito curto. Grave por mais tempo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Determinar mimeType e extensão de forma robusta
    const { mimeType, extension } = validateAndNormalizeMimeType(
      providedMimeType || dataUrlMimeType,
      bytes
    );
    
    console.log('[VOICE-TO-TEXT] Configuração final:', { mimeType, extension, bytesKB: (bytes.length / 1024).toFixed(2) });
    
    // Preparar FormData para OpenAI
    const formData = new FormData();
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
    formData.append('file', blob, `audio.${extension}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    // Adicionar prompt para melhorar precisão em português
    formData.append('prompt', 'Transcrição em português brasileiro.');

    console.log('[VOICE-TO-TEXT] Enviando para OpenAI Whisper...');
    console.log('[VOICE-TO-TEXT] Arquivo:', `audio.${extension}`, 'Tipo:', mimeType);

    // Enviar para OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Tentar extrair detalhes estruturados do erro da OpenAI (quando vier em JSON)
      let openAiErrorCode: string | undefined;
      let openAiErrorMessage: string | undefined;
      try {
        const parsed = JSON.parse(errorText);
        openAiErrorCode = parsed?.error?.code;
        openAiErrorMessage = parsed?.error?.message;
      } catch {
        // ignore (nem todo erro vem como JSON)
      }

      console.error('[VOICE-TO-TEXT] ❌ Erro OpenAI:', response.status, errorText);

      // Tratar erros específicos
      if (response.status === 400) {
        // 400 "audio_too_short" não melhora com fallback de mimeType.
        if (
          openAiErrorCode === 'audio_too_short' ||
          (openAiErrorMessage && openAiErrorMessage.toLowerCase().includes('too short'))
        ) {
          return new Response(
            JSON.stringify({ error: 'Áudio muito curto. Grave por mais tempo.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Lista de formatos de fallback para tentar
        const fallbackFormats = [
          { mime: 'audio/ogg', ext: 'ogg' },
          { mime: 'audio/mp4', ext: 'm4a' },
          { mime: 'audio/mpeg', ext: 'mp3' },
        ];

        for (const format of fallbackFormats) {
          if (format.mime === mimeType) continue; // Pular o formato atual

          console.log(`[VOICE-TO-TEXT] Tentando fallback para ${format.ext}...`);

          const fallbackFormData = new FormData();
          const fallbackBlob = new Blob([bytes.buffer as ArrayBuffer], { type: format.mime });
          fallbackFormData.append('file', fallbackBlob, `audio.${format.ext}`);
          fallbackFormData.append('model', 'whisper-1');
          fallbackFormData.append('language', 'pt');
          fallbackFormData.append('prompt', 'Transcrição em português brasileiro.');

          const fallbackResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            body: fallbackFormData,
          });

          if (fallbackResponse.ok) {
            const fallbackResult = await fallbackResponse.json();
            console.log(`[VOICE-TO-TEXT] ✅ Fallback para ${format.ext} bem-sucedido!`);
            return new Response(
              JSON.stringify({ text: fallbackResult.text }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            // CORREÇÃO: Verificar se fallback também retorna audio_too_short
            const fallbackErrorText = await fallbackResponse.text();
            console.log(`[VOICE-TO-TEXT] Fallback ${format.ext} falhou:`, fallbackResponse.status, fallbackErrorText);
            
            if (fallbackErrorText.includes('audio_too_short') || fallbackErrorText.includes('too short')) {
              return new Response(
                JSON.stringify({ error: 'Áudio muito curto. Grave por mais tempo.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }

        return new Response(
          JSON.stringify({ error: 'Formato de áudio não suportado. Tente gravar novamente.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Erro de autenticação no serviço de transcrição' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Muitas requisições. Aguarde um momento.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Erro na transcrição: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    
    if (!result.text || result.text.trim() === '') {
      console.warn('[VOICE-TO-TEXT] ⚠️ Transcrição vazia');
      return new Response(
        JSON.stringify({ error: 'Não foi possível entender o áudio. Fale mais claramente.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[VOICE-TO-TEXT] ✅ Transcrição bem-sucedida:', result.text.substring(0, 50) + '...');

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[VOICE-TO-TEXT] ❌ Exceção:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno no servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
