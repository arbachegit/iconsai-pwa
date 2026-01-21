/**
 * ============================================================
 * PWA Voice Module - Voice Spectrum Component
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Componente de visualização de espectro de áudio.
 * Wrapper do SpectrumAnalyzer com configuração do módulo.
 * ============================================================
 */

import React from "react";
import { SpectrumAnalyzer, VisualizerState } from "@/components/pwa/voice/SpectrumAnalyzer";
import { SPECTRUM_CONFIG, VOICE_THEME } from "../config";
import type { ThemeConfig } from "@/core/types";

interface VoiceSpectrumProps {
  /** Estado do visualizador */
  state: VisualizerState;
  /** Dados de frequência (0-255) */
  frequencyData?: number[];
  /** Altura do componente */
  height?: number;
  /** Largura do componente */
  width?: number;
  /** Tema customizado */
  theme?: ThemeConfig;
  /** Classe CSS adicional */
  className?: string;
}

export const VoiceSpectrum: React.FC<VoiceSpectrumProps> = ({
  state,
  frequencyData,
  height = SPECTRUM_CONFIG.maxHeight,
  width = 280,
  theme = VOICE_THEME,
  className = "",
}) => {
  return (
    <SpectrumAnalyzer
      state={state}
      frequencyData={frequencyData}
      barCount={SPECTRUM_CONFIG.barCount}
      primaryColor={theme.primaryColor}
      secondaryColor={theme.secondaryColor || theme.primaryColor}
      height={height}
      width={width}
      className={className}
    />
  );
};

export default VoiceSpectrum;
