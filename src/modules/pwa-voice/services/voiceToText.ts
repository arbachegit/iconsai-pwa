/**
 * ============================================================
 * PWA Voice Module - Voice to Text Service
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Serviço de transcrição de voz para texto.
 * Utiliza a Edge Function voice-to-text do Supabase.
 * ============================================================
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Resposta do serviço de transcrição
 */
export interface VoiceToTextResponse {
  text: string;
  confidence?: number;
  duration?: number;
}

/**
 * Parâmetros para transcrição
 */
export interface VoiceToTextParams {
  /** Blob de áudio */
  audioBlob?: Blob;
  /** Áudio em base64 */
  audioBase64?: string;
  /** MIME type do áudio */
  mimeType: string;
  /** Idioma (default: pt-BR) */
  language?: string;
}

/**
 * Erro customizado de transcrição
 */
export class VoiceToTextError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "VoiceToTextError";
  }
}

/**
 * Converte Blob para Base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remover prefixo data:audio/...;base64,
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcreve áudio para texto
 * @throws {VoiceToTextError} em caso de erro
 */
export async function transcribeAudio(params: VoiceToTextParams): Promise<VoiceToTextResponse> {
  const { audioBlob, audioBase64, mimeType, language = "pt-BR" } = params;

  console.log("[VoiceToText] Iniciando transcrição...");

  try {
    // Obter base64 do áudio
    let base64Data = audioBase64;
    if (!base64Data && audioBlob) {
      base64Data = await blobToBase64(audioBlob);
    }

    if (!base64Data) {
      throw new VoiceToTextError(
        "Nenhum áudio fornecido",
        "NO_AUDIO"
      );
    }

    console.log("[VoiceToText] Chamando voice-to-text...");

    const { data, error } = await supabase.functions.invoke("voice-to-text", {
      body: {
        audio: base64Data,
        mimeType,
        language,
      },
    });

    if (error) {
      console.error("[VoiceToText] API Error:", error);
      throw new VoiceToTextError(
        error.message || "Erro ao transcrever áudio",
        "API_ERROR",
        error
      );
    }

    const text = data?.text;
    if (!text?.trim()) {
      throw new VoiceToTextError(
        "Não foi possível entender o áudio",
        "EMPTY_TRANSCRIPTION"
      );
    }

    console.log("[VoiceToText] ✅ Transcrição concluída:", text.substring(0, 50) + "...");

    return {
      text: text.trim(),
      confidence: data?.confidence,
      duration: data?.duration,
    };
  } catch (err) {
    if (err instanceof VoiceToTextError) {
      throw err;
    }

    console.error("[VoiceToText] Erro inesperado:", err);
    throw new VoiceToTextError(
      err instanceof Error ? err.message : "Erro desconhecido",
      "UNKNOWN_ERROR",
      err
    );
  }
}
