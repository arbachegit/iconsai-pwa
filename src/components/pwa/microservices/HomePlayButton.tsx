/**
 * ===========================================================================
 * HomePlayButton.tsx - Botão de Play Exclusivo da HOME
 * ===========================================================================
 * Versão: 1.0.0
 * Data: 2026-01-16
 *
 * Descrição: Botão de play/pause exclusivo para a tela HOME do PWA.
 * Design baseado no VoicePlayerBox.tsx do knowyou-nexus.
 * Inclui efeito de luminosidade girando, anel externo escuro,
 * glow quando animando, pulso quando waiting e ondas (ripple).
 *
 * DIFERENTE do PlayButton.tsx usado nos módulos.
 * ===========================================================================
 */

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Loader2, RotateCcw } from "lucide-react";

// Estados possíveis do botão
export type HomePlayerState = "idle" | "loading" | "playing" | "waiting" | "processing" | "listening";

interface HomePlayButtonProps {
  state: HomePlayerState;
  onPlay?: () => void;
  onPause?: () => void;
  audioProgress?: number;
  canReplay?: boolean;
  disabled?: boolean;
}

export const HomePlayButton: React.FC<HomePlayButtonProps> = ({
  state,
  onPlay,
  onPause,
  audioProgress = 0,
  canReplay = false,
  disabled = false,
}) => {
  // Calcula duração da rotação baseado no estado
  const rotationDuration = useMemo(() => {
    switch (state) {
      case "loading":
      case "processing":
        return 1.5;
      case "playing":
        return 3;
      case "waiting":
        return 4;
      case "listening":
        return 2;
      default:
        return 6;
    }
  }, [state]);

  // Estados derivados
  const isAnimating = state === "loading" || state === "processing" || state === "playing" || state === "listening";
  const isWaiting = state === "waiting" || state === "idle";

  // Handler de clique
  const handleClick = () => {
    if (disabled) return;

    if (state === "playing" && onPause) {
      onPause();
    } else if ((state === "idle" || state === "waiting" || canReplay) && onPlay) {
      onPlay();
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-6">
      {/* Container principal do botão (w-40 h-40 = 160px) */}
      <div className="relative w-40 h-40">

        {/* 1. ROTATING CONIC GRADIENT - Efeito de luminosidade girando */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, hsl(191, 100%, 50%) 60deg, hsl(191, 100%, 50%, 0.5) 120deg, transparent 180deg, transparent 360deg)`,
            opacity: isAnimating ? 1 : 0.3,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: rotationDuration, repeat: Infinity, ease: "linear" }}
        />

        {/* 2. GLOW EFFECT - Brilho quando animando */}
        <AnimatePresence>
          {isAnimating && (
            <motion.div
              className="absolute inset-0 rounded-full blur-md"
              style={{ background: `conic-gradient(from 0deg, transparent 0deg, hsl(191, 100%, 50%, 0.6) 40deg, transparent 100deg)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 0.3 }, rotate: { duration: rotationDuration * 0.8, repeat: Infinity, ease: "linear" } }}
            />
          )}
        </AnimatePresence>

        {/* 3. PULSE EFFECT - Pulsa quando waiting */}
        {isWaiting && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(191, 100%, 50%, 0.2) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* 4. INNER CONTAINER - Anel escuro com borda ciano */}
        <div
          className="absolute inset-2 rounded-full flex items-center justify-center overflow-hidden"
          style={{ background: "hsl(225, 54%, 8%)", border: "1px solid hsl(191, 100%, 50%, 0.2)" }}
        >
          {/* 5. RIPPLE EFFECT - Ondas expandindo quando waiting e não pode replay */}
          <AnimatePresence>
            {isWaiting && !canReplay && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full border"
                    style={{
                      width: `${40 + i * 20}%`,
                      height: `${40 + i * 20}%`,
                      borderColor: "hsl(191, 100%, 50%, 0.2)",
                    }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [0.8, 1.2, 0.8], opacity: [0, 0.3, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* 6. MAIN BUTTON - Botão ciano central */}
          <motion.button
            className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: canReplay
                ? "linear-gradient(135deg, hsl(271, 76%, 53%) 0%, hsl(271, 76%, 43%) 100%)"
                : "linear-gradient(135deg, hsl(191, 100%, 50%) 0%, hsl(191, 100%, 40%) 100%)",
              boxShadow: canReplay
                ? "0 0 30px hsl(271, 76%, 53%, 0.4)"
                : "0 0 30px hsl(191, 100%, 50%, 0.4)",
            }}
            onClick={handleClick}
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            disabled={disabled}
          >
            {/* Ícones animados */}
            <AnimatePresence mode="wait">
              {state === "loading" || state === "processing" ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(225, 71%, 8%)" }} />
                </motion.div>
              ) : state === "playing" ? (
                <motion.div
                  key="pause"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Pause className="w-8 h-8" style={{ color: "hsl(225, 71%, 8%)" }} />
                </motion.div>
              ) : canReplay ? (
                <motion.div
                  key="replay"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <RotateCcw className="w-8 h-8" style={{ color: "hsl(225, 71%, 8%)" }} />
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Play className="w-8 h-8 ml-1" style={{ color: "hsl(225, 71%, 8%)" }} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* 7. PROGRESS ARC - Arco de progresso (opcional, para mostrar progresso do áudio) */}
        {audioProgress > 0 && audioProgress < 100 && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Círculo de fundo (track) */}
            <circle
              cx="80"
              cy="80"
              r="72"
              fill="none"
              stroke="hsl(191, 100%, 50%, 0.3)"
              strokeWidth="2"
            />
            {/* Círculo de progresso */}
            <circle
              cx="80"
              cy="80"
              r="72"
              fill="none"
              stroke="hsl(191, 100%, 50%)"
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 72}`}
              strokeDashoffset={`${2 * Math.PI * 72 * (1 - audioProgress / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
        )}
      </div>
    </div>
  );
};

export default HomePlayButton;
