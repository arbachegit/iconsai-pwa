/**
 * ============================================================
 * VoiceSpectrum.tsx - v1.0.0
 * ============================================================
 * Animação de spectrum de voz com cores dos módulos
 * - Coreografia dinâmica
 * - Cores: Ajuda (azul), Mundo (verde), Saúde (rosa), Ideias (amarelo)
 * - Transições suaves entre cores
 * ============================================================
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceSpectrumProps {
  isActive?: boolean;
  message?: string;
}

// Cores dos módulos
const MODULE_COLORS = {
  ajuda: "#3B82F6",    // Azul
  mundo: "#10B981",    // Verde
  saude: "#EC4899",    // Rosa
  ideias: "#F59E0B",   // Amarelo/Laranja
  primary: "#818CF8",  // Roxo (cor primária)
};

const colorSequence = [
  MODULE_COLORS.primary,
  MODULE_COLORS.ajuda,
  MODULE_COLORS.mundo,
  MODULE_COLORS.saude,
  MODULE_COLORS.ideias,
];

export const VoiceSpectrum: React.FC<VoiceSpectrumProps> = ({
  isActive = true,
  message = "Verificando acesso..."
}) => {
  const [colorIndex, setColorIndex] = useState(0);
  const [bars] = useState(() => Array.from({ length: 32 }, (_, i) => i));

  // Rotacionar cores
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % colorSequence.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive]);

  const currentColor = colorSequence[colorIndex];
  const nextColor = colorSequence[(colorIndex + 1) % colorSequence.length];

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      {/* Logo */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-12"
        style={{ color: currentColor }}
      >
        KnowYOU
      </motion.h1>

      {/* Spectrum Container */}
      <div className="relative w-64 h-32 flex items-end justify-center gap-[3px]">
        {bars.map((_, index) => {
          // Calcular altura baseada na posição (forma de onda)
          const centerDistance = Math.abs(index - bars.length / 2);
          const baseHeight = Math.max(0.2, 1 - centerDistance / (bars.length / 2));

          return (
            <motion.div
              key={index}
              className="w-[6px] rounded-full origin-bottom"
              style={{
                background: `linear-gradient(to top, ${currentColor}, ${nextColor})`,
              }}
              animate={{
                height: isActive ? [
                  `${baseHeight * 20}%`,
                  `${baseHeight * 100}%`,
                  `${baseHeight * 40}%`,
                  `${baseHeight * 80}%`,
                  `${baseHeight * 20}%`,
                ] : '10%',
                opacity: isActive ? [0.5, 1, 0.7, 1, 0.5] : 0.3,
              }}
              transition={{
                duration: 0.8 + Math.random() * 0.5,
                repeat: Infinity,
                delay: index * 0.02,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      {/* Circular Glow Effect */}
      <motion.div
        className="absolute w-48 h-48 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: currentColor }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-12 text-muted-foreground text-sm"
        >
          {message}
        </motion.p>
      </AnimatePresence>

      {/* Animated dots */}
      <div className="flex gap-1 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: currentColor }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Color indicator pills */}
      <div className="absolute bottom-8 flex gap-2">
        {colorSequence.map((color, i) => (
          <motion.div
            key={color}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
            animate={{
              scale: i === colorIndex ? 1.5 : 1,
              opacity: i === colorIndex ? 1 : 0.3,
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
};

export default VoiceSpectrum;
