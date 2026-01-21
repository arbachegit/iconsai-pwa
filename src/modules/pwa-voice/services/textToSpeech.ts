/**
 * ============================================================
 * PWA Voice Module - Text to Speech Service
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Serviço de síntese de voz (TTS).
 * Utiliza a Edge Function text-to-speech do Supabase.
 * ============================================================
 */

import { supabase } from "@/integrations/supabase/client";
import { TTS_CONFIG } from "../config";

/**
 * Resposta do serviço de TTS
 */
export interface TextToSpeechResponse {
  audioUrl: string;
  audioBlob?: Blob;
  duration?: number;
}

/**
 * Parâmetros para síntese de voz
 */
export interface TextToSpeechParams {
  /** Texto a ser sintetizado */
  text: string;
  /** Voz a utilizar */
  voice?: string;
  /** Velocidade (0.5 a 2.0) */
  rate?: number;
  /** Volume (0 a 1) */
  volume?: number;
  /** Mapa de substituições fonéticas */
  phoneticMapOverride?: Record<string, string>;
}

/**
 * Erro customizado de TTS
 */
export class TextToSpeechError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "TextToSpeechError";
  }
}

/**
 * Sintetiza texto em áudio
 * @throws {TextToSpeechError} em caso de erro
 */
export async function synthesizeSpeech(params: TextToSpeechParams): Promise<TextToSpeechResponse> {
  const {
    text,
    voice = TTS_CONFIG.defaultVoice,
    rate = TTS_CONFIG.defaultRate,
    volume = TTS_CONFIG.defaultVolume,
    phoneticMapOverride,
  } = params;

  console.log("[TextToSpeech] Iniciando síntese...");

  if (!text?.trim()) {
    throw new TextToSpeechError(
      "Nenhum texto fornecido",
      "NO_TEXT"
    );
  }

  try {
    const { data, error } = await supabase.functions.invoke("text-to-speech", {
      body: {
        text: text.trim(),
        voice,
        rate,
        volume,
        phoneticMapOverride,
      },
    });

    if (error) {
      console.error("[TextToSpeech] API Error:", error);
      throw new TextToSpeechError(
        error.message || "Erro ao sintetizar voz",
        "API_ERROR",
        error
      );
    }

    if (!data?.audioUrl && !data?.audio) {
      throw new TextToSpeechError(
        "Nenhum áudio gerado",
        "EMPTY_AUDIO"
      );
    }

    console.log("[TextToSpeech] ✅ Síntese concluída");

    // Se recebemos base64, converter para URL
    let audioUrl = data.audioUrl;
    let audioBlob: Blob | undefined;

    if (data.audio && !audioUrl) {
      // Converter base64 para blob e URL
      const binaryString = atob(data.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audioBlob = new Blob([bytes], { type: "audio/mp3" });
      audioUrl = URL.createObjectURL(audioBlob);
    }

    return {
      audioUrl,
      audioBlob,
      duration: data.duration,
    };
  } catch (err) {
    if (err instanceof TextToSpeechError) {
      throw err;
    }

    console.error("[TextToSpeech] Erro inesperado:", err);
    throw new TextToSpeechError(
      err instanceof Error ? err.message : "Erro desconhecido",
      "UNKNOWN_ERROR",
      err
    );
  }
}

/**
 * Revoga URL de áudio criada com createObjectURL
 */
export function revokeAudioUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
