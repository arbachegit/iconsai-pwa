/**
 * ============================================================
 * PWA Voice Module - Microphone Button Component
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Componente de botão de microfone.
 * Wrapper do ToggleMicrophoneButton com configuração do módulo.
 * ============================================================
 */

import React from "react";
import { ToggleMicrophoneButton } from "@/components/pwa/voice/ToggleMicrophoneButton";
import { VOICE_THEME, AUDIO_RECORDING_CONFIG } from "../config";
import type { ThemeConfig } from "@/core/types";

interface MicrophoneButtonProps {
  /** Callback quando áudio é capturado */
  onAudioCapture: (blob: Blob) => void;
  /** Se está desabilitado */
  disabled?: boolean;
  /** Se está reproduzindo áudio */
  isPlaying?: boolean;
  /** Se está processando */
  isProcessing?: boolean;
  /** Tema customizado */
  theme?: ThemeConfig;
  /** Callback para dados de frequência */
  onFrequencyData?: (data: number[]) => void;
  /** Callback quando estado de gravação muda */
  onRecordingChange?: (isRecording: boolean) => void;
  /** Duração máxima em segundos */
  maxDuration?: number;
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  onAudioCapture,
  disabled = false,
  isPlaying = false,
  isProcessing = false,
  theme = VOICE_THEME,
  onFrequencyData,
  onRecordingChange,
  maxDuration = AUDIO_RECORDING_CONFIG.maxDuration,
}) => {
  return (
    <ToggleMicrophoneButton
      onAudioCapture={onAudioCapture}
      disabled={disabled}
      isPlaying={isPlaying}
      isProcessing={isProcessing}
      primaryColor={theme.primaryColor}
      onFrequencyData={onFrequencyData}
      onRecordingChange={onRecordingChange}
      maxDurationSeconds={maxDuration}
    />
  );
};

export default MicrophoneButton;
