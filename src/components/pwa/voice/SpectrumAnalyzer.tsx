/**
 * ============================================================
 * SpectrumAnalyzer.tsx - Visualizador de Espectro de Áudio
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-04
 * 
 * Descrição: Componente visual que simula um analisador de espectro
 * de áudio com barras animadas. Reage ao estado do player.
 * ============================================================
 */

import React, { useEffect, useState, useRef, useMemo } from "react";
import { getAudioContext } from "@/utils/safari-audio";
import { motion } from "framer-motion";

// Estados possíveis do visualizador
export type VisualizerState = "idle" | "loading" | "playing" | "paused" | "recording";

interface SpectrumAnalyzerProps {
  /** Estado atual do visualizador */
  state: VisualizerState;
  /** Número de barras no espectro */
  barCount?: number;
  /** Cor primária das barras (hex) */
  primaryColor?: string;
  /** Cor secundária para gradiente */
  secondaryColor?: string;
  /** Altura máxima do componente */
  height?: number;
  /** Largura do componente */
  width?: number;
  /** Dados reais de frequência (0-255 por barra) */
  frequencyData?: number[];
  /** Se deve usar dados reais de áudio (Web Audio API) - DEPRECATED, use frequencyData */
  useRealAudio?: boolean;
  /** Referência ao elemento de áudio para análise real - DEPRECATED */
  audioRef?: React.RefObject<HTMLAudioElement>;
  /** Classe CSS adicional */
  className?: string;
}

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({
  state = "idle",
  barCount = 32,
  primaryColor = "#3B82F6",
  secondaryColor = "#8B5CF6",
  height = 120,
  width = 280,
  frequencyData,
  useRealAudio = false,
  audioRef,
  className = "",
}) => {
  // Estado das alturas das barras
  const [barHeights, setBarHeights] = useState<number[]>(
    Array(barCount).fill(0.1)
  );
  
  // Refs para Web Audio API
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Configuração das barras
  const barWidth = Math.max(2, (width / barCount) - 2);
  const gap = 2;

  // Gerar alturas para estado idle (barras baixas ondulando suavemente)
  const generateIdleHeights = (time: number) => {
    return Array(barCount).fill(0).map((_, i) => {
      const wave = Math.sin(time / 1000 + i * 0.3) * 0.1;
      return 0.05 + Math.abs(wave);
    });
  };

  // Gerar alturas para loading (onda viajante)
  const generateLoadingHeights = (time: number) => {
    return Array(barCount).fill(0).map((_, i) => {
      const wave = Math.sin(time / 200 - i * 0.5);
      return 0.2 + (wave + 1) * 0.3;
    });
  };

  // Gerar alturas suaves para playing (interpola com valor anterior)
  const generateSmoothPlayingHeights = (prevHeights: number[]) => {
    return prevHeights.map((prev) => {
      const target = 0.15 + Math.random() * 0.7;
      // Interpolar 25% em direção ao target (movimento suave)
      return prev + (target - prev) * 0.25;
    });
  };

  // Gerar alturas suaves para recording
  const generateSmoothRecordingHeights = (prevHeights: number[], elapsed: number) => {
    const pulse = Math.sin(elapsed / 500) * 0.2 + 0.8;
    return prevHeights.map((prev) => {
      const target = 0.3 + Math.random() * 0.5 * pulse;
      return prev + (target - prev) * 0.25;
    });
  };

  // Animação baseada no estado com throttling para suavidade
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
          // PRIORIDADE 1: Usar frequencyData externo se disponível
          if (frequencyData && frequencyData.length > 0) {
            const step = Math.max(1, Math.floor(frequencyData.length / barCount));
            const heights = Array(barCount).fill(0).map((_, i) => {
              const value = frequencyData[Math.min(i * step, frequencyData.length - 1)] / 255;
              return Math.max(0.05, value);
            });
            setBarHeights(heights);
          } else if (useRealAudio && analyzerRef.current) {
            // PRIORIDADE 2: Usar Web Audio API local (deprecated)
            const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
            analyzerRef.current.getByteFrequencyData(dataArray);
            
            const step = Math.floor(dataArray.length / barCount);
            const heights = Array(barCount).fill(0).map((_, i) => {
              const value = dataArray[i * step] / 255;
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
          setBarHeights(prev => prev.map(h => Math.max(0.05, h * 0.98)));
          break;
        
        case "recording":
          // PRIORIDADE 1: Usar frequencyData externo se disponível
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

    // Configurar Web Audio API se necessário
    if (useRealAudio && audioRef?.current && state === "playing") {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = getAudioContext();
        }
        
        if (!analyzerRef.current) {
          analyzerRef.current = audioContextRef.current.createAnalyser();
          analyzerRef.current.fftSize = 64;
          
          const source = audioContextRef.current.createMediaElementSource(audioRef.current);
          source.connect(analyzerRef.current);
          analyzerRef.current.connect(audioContextRef.current.destination);
        }
      } catch (error) {
        console.warn("Web Audio API não disponível:", error);
      }
    }

    animate();

    return () => {
      isRunning = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state, barCount, useRealAudio, audioRef, frequencyData]);

  // Velocidade de transição baseada no estado (MAIS LENTO para suavidade)
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
      className={`flex items-end justify-center gap-[2px] ${className}`}
      style={{ height, width }}
      role="img"
      aria-label="Visualizador de áudio"
    >
      {barHeights.map((heightPercent, index) => (
        <motion.div
          key={index}
          className="rounded-full"
          style={{
            width: barWidth,
            background: `linear-gradient(to top, ${primaryColor}, ${secondaryColor})`,
          }}
          animate={{
            height: heightPercent * height,
          }}
          transition={{
            duration: transitionDuration,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

export default SpectrumAnalyzer;
