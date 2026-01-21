/**
 * ============================================================
 * components/pwa/microphone/index.ts
 * ============================================================
 * Versao: 1.0.0 - 2026-01-08
 * PRD: Microfone_objeto.zip
 * ============================================================
 */

export { RecordingIndicator } from "./RecordingIndicator";

// Re-export hooks relacionados
export { useAudioRecorder } from "@/hooks/useAudioRecorder";
export { useMicrophonePermission } from "@/hooks/useMicrophonePermission";

// Re-export utils
export { blobToBase64, getAudioDuration, validateAudioBlob, createAudioContext } from "@/utils/audio";
