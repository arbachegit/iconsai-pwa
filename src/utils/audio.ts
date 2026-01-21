/**
 * ============================================================
 * utils/audio.ts
 * ============================================================
 * Versao: 1.0.0 - 2026-01-08
 * PRD: Microfone_objeto.zip
 * Utilitarios para manipulacao de audio
 * ============================================================
 */

/**
 * Converte um Blob para Base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remover o prefixo "data:audio/webm;base64,"
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Obtem a duracao de um audio em segundos
 */
export function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error("Erro ao carregar audio"));
    };
  });
}

/**
 * Valida um blob de audio
 */
export interface AudioValidation {
  valid: boolean;
  reason?: string;
}

export function validateAudioBlob(
  blob: Blob,
  minSizeKB: number = 1,
  minDuration: number = 0.5,
  actualDuration?: number,
): AudioValidation {
  // Verificar tamanho minimo
  const sizeKB = blob.size / 1024;
  if (sizeKB < minSizeKB) {
    return {
      valid: false,
      reason: `Audio muito pequeno (${sizeKB.toFixed(2)}KB < ${minSizeKB}KB)`,
    };
  }

  // Verificar duracao se fornecida
  if (actualDuration !== undefined && actualDuration < minDuration) {
    return {
      valid: false,
      reason: `Audio muito curto (${actualDuration.toFixed(2)}s < ${minDuration}s)`,
    };
  }

  return { valid: true };
}

/**
 * Cria um AudioContext configurado
 */
export function createAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("[audio] AudioContext nao suportado");
      return null;
    }
    return new AudioContextClass();
  } catch (error) {
    console.error("[audio] Erro ao criar AudioContext:", error);
    return null;
  }
}

/**
 * Converte ArrayBuffer para Base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converte Base64 para ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converte Base64 para Blob de audio
 */
export function base64ToAudioBlob(base64: string, mimeType: string = "audio/mpeg"): Blob {
  const buffer = base64ToArrayBuffer(base64);
  return new Blob([buffer], { type: mimeType });
}

/**
 * Formata duracao em segundos para string MM:SS
 */
export function formatAudioDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Verifica se o navegador suporta gravacao de audio
 */
export function isAudioRecordingSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

/**
 * Obtem os codecs de audio suportados
 */
export function getSupportedAudioCodecs(): string[] {
  const codecs = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4", "audio/mpeg"];

  return codecs.filter((codec) => {
    try {
      return MediaRecorder.isTypeSupported(codec);
    } catch {
      return false;
    }
  });
}
