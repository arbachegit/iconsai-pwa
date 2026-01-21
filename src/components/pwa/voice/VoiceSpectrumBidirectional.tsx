/**
 * ============================================================
 * VoiceSpectrumBidirectional.tsx - Spectrum Bidirecional para HOME
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-17
 *
 * Descrição: Visualizador de espectro BIDIRECIONAL usado exclusivamente
 * na tela HOME. Barras amplificam para CIMA e BAIXO a partir de uma
 * linha horizontal central.
 *
 * Diferença do SpectrumAnalyzer:
 * - Barras são espelhadas (crescem simetricamente do centro)
 * - Linha horizontal central sempre visível
 * - Largura fixa = 160px (mesma do HomePlayButton)
 * - Altura menor (80px total: 40px cima + 40px baixo)
 * ============================================================
 */

import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";

export type VisualizerState = "idle" | "loading" | "playing" | "paused" | "recording";

interface VoiceSpectrumBidirectionalProps {
  /** Estado atual do visualizador */
  state: VisualizerState;
  /** Número de barras no espectro */
  barCount?: number;
  /** Cor primária das barras (hex) */
  primaryColor?: string;
  /** Cor secundária para gradiente */
  secondaryColor?: string;
  /** Dados reais de frequência (0-255 por barra) */
  frequencyData?: number[];
  /** Classe CSS adicional */
  className?: string;
}

export const VoiceSpectrumBidirectional: React.FC<VoiceSpectrumBidirectionalProps> = ({
  state = "idle",
  barCount = 24,
  primaryColor = "#00D4FF", // Ciano
  secondaryColor = "#8B5CF6", // Roxo
  frequencyData,
  className = "",
}) => {
  // Dimensões fixas para HOME
  const width = 160; // Mesma largura do HomePlayButton
  const halfHeight = 40; // 40px para cima + 40px para baixo = 80px total
  const totalHeight = halfHeight * 2;

  // Estado das alturas das barras (0-1, será aplicado bidirecional)
  const [barHeights, setBarHeights] = useState<number[]>(
    Array(barCount).fill(0.05)
  );

  const animationRef = useRef<number | null>(null);

  // Configuração das barras
  const barWidth = Math.max(2, (width / barCount) - 2);

  // Gerar alturas para estado idle (barras baixas ondulando suavemente)
  const generateIdleHeights = (time: number) => {
    return Array(barCount).fill(0).map((_, i) => {
      const wave = Math.sin(time / 1000 + i * 0.3) * 0.08;
      return 0.03 + Math.abs(wave);
    });
  };

  // Gerar alturas para loading (onda viajante)
  const generateLoadingHeights = (time: number) => {
    return Array(barCount).fill(0).map((_, i) => {
      const wave = Math.sin(time / 200 - i * 0.5);
      return 0.15 + (wave + 1) * 0.25;
    });
  };

  // Gerar alturas suaves para playing (interpola com valor anterior)
  const generateSmoothPlayingHeights = (prevHeights: number[]) => {
    return prevHeights.map((prev) => {
      const target = 0.1 + Math.random() * 0.7;
      // Interpolar 25% em direção ao target (movimento suave)
      return prev + (target - prev) * 0.25;
    });
  };

  // Gerar alturas suaves para recording
  const generateSmoothRecordingHeights = (prevHeights: number[], elapsed: number) => {
    const pulse = Math.sin(elapsed / 500) * 0.2 + 0.8;
    return prevHeights.map((prev) => {
      const target = 0.2 + Math.random() * 0.6 * pulse;
      return prev + (target - prev) * 0.25;
    });
  };

  // Animação baseada no estado
  useEffect(() => {
    let startTime = Date.now();
    let lastUpdate = 0;
    let isRunning = true;
    const UPDATE_INTERVAL = 80; // ~12fps para animação suave

    const animate = () => {
      if (!isRunning) return;

      const now = Date.now();
      const elapsed = now - startTime;

      // Throttle: limitar taxa de atualização
      if (now - lastUpdate < UPDATE_INTERVAL) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastUpdate = now;

      switch (state) {
        case "idle":
          setBarHeights(generateIdleHeights(elapsed));
          break;

        case "loading":
          setBarHeights(generateLoadingHeights(elapsed));
          break;

        case "playing":
          // PRIORIDADE: Usar frequencyData externo se disponível
          if (frequencyData && frequencyData.length > 0) {
            const step = Math.max(1, Math.floor(frequencyData.length / barCount));
            const heights = Array(barCount).fill(0).map((_, i) => {
              const value = frequencyData[Math.min(i * step, frequencyData.length - 1)] / 255;
              return Math.max(0.05, value);
            });
            setBarHeights(heights);
          } else {
            // FALLBACK: Simulação suave de reprodução
            setBarHeights(prev => generateSmoothPlayingHeights(prev));
          }
          break;

        case "paused":
          // Manter última altura mas reduzir gradualmente
          setBarHeights(prev => prev.map(h => Math.max(0.03, h * 0.98)));
          break;

        case "recording":
          // PRIORIDADE: Usar frequencyData externo se disponível
          if (frequencyData && frequencyData.length > 0) {
            const step = Math.max(1, Math.floor(frequencyData.length / barCount));
            const heights = Array(barCount).fill(0).map((_, i) => {
              const value = frequencyData[Math.min(i * step, frequencyData.length - 1)] / 255;
              return Math.max(0.08, value);
            });
            setBarHeights(heights);
          } else {
            // FALLBACK: Pulso suave para gravação
            setBarHeights(prev => generateSmoothRecordingHeights(prev, elapsed));
          }
          break;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isRunning = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state, barCount, frequencyData]);

  // Velocidade de transição baseada no estado
  const transitionDuration = useMemo(() => {
    switch (state) {
      case "idle": return 0.8;
      case "loading": return 0.3;
      case "playing": return 0.25;
      case "recording": return 0.15;
      case "paused": return 0.5;
      default: return 0.3;
    }
  }, [state]);

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ height: totalHeight, width }}
      role="img"
      aria-label="Visualizador de áudio bidirecional"
    >
      {/* Linha horizontal central */}
      <div
        className="absolute left-0 right-0 h-[1px] opacity-30"
        style={{
          top: '50%',
          background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)`,
        }}
      />

      {/* Container das barras */}
      <div className="flex items-center justify-center gap-[2px]" style={{ height: totalHeight }}>
        {barHeights.map((heightPercent, index) => {
          // Altura em pixels (metade para cima, metade para baixo)
          const barHeightPx = heightPercent * halfHeight;

          return (
            <div
              key={index}
              className="relative flex flex-col items-center justify-center"
              style={{ width: barWidth, height: totalHeight }}
            >
              {/* Barra superior (cresce para cima) */}
              <motion.div
                className="rounded-full"
                style={{
                  width: barWidth,
                  background: `linear-gradient(to top, ${primaryColor}, ${secondaryColor})`,
                  transformOrigin: 'bottom',
                }}
                animate={{
                  height: barHeightPx,
                }}
                transition={{
                  duration: transitionDuration,
                  ease: "easeOut",
                }}
              />

              {/* Barra inferior (cresce para baixo - espelhada) */}
              <motion.div
                className="rounded-full"
                style={{
                  width: barWidth,
                  background: `linear-gradient(to bottom, ${primaryColor}, ${secondaryColor})`,
                  transformOrigin: 'top',
                }}
                animate={{
                  height: barHeightPx,
                }}
                transition={{
                  duration: transitionDuration,
                  ease: "easeOut",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VoiceSpectrumBidirectional;
