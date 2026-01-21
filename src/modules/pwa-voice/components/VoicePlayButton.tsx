/**
 * ============================================================
 * PWA Voice Module - Voice Play Button Component
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Componente de botão de play/pause.
 * Wrapper do PlayButton com configuração do módulo.
 * ============================================================
 */

import React from "react";
import { PlayButton, PlayButtonState } from "@/components/pwa/voice/PlayButton";
import { VOICE_THEME } from "../config";
import type { ThemeConfig } from "@/core/types";

interface VoicePlayButtonProps {
  /** Estado do botão */
  state: PlayButtonState;
  /** Callback ao clicar */
  onClick: () => void;
  /** Progresso (0-100) */
  progress?: number;
  /** Tamanho */
  size?: "sm" | "md" | "lg" | "xl";
  /** Tema customizado */
  theme?: ThemeConfig;
  /** Se está desabilitado */
  disabled?: boolean;
  /** Label abaixo do botão */
  label?: string;
  /** Classe CSS adicional */
  className?: string;
}

export const VoicePlayButton: React.FC<VoicePlayButtonProps> = ({
  state,
  onClick,
  progress = 0,
  size = "lg",
  theme = VOICE_THEME,
  disabled = false,
  label,
  className = "",
}) => {
  return (
    <PlayButton
      state={state}
      onClick={onClick}
      progress={progress}
      size={size}
      primaryColor={theme.primaryColor}
      disabled={disabled}
      label={label}
      className={className}
    />
  );
};

export default VoicePlayButton;
