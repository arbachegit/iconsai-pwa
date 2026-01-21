/**
 * ============================================================
 * PlayButton.tsx - Botão de Play Centralizado
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-04
 *
 * Descrição: Botão de play/pause com múltiplos estados visuais.
 * Inclui animações de loading e indicador de progresso.
 * ============================================================
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Loader2 } from "lucide-react";

// Estados possíveis do botão
export type PlayButtonState = "idle" | "loading" | "playing" | "paused";

interface PlayButtonProps {
  /** Estado atual do botão */
  state: PlayButtonState;
  /** Callback quando clicar no botão */
  onClick: () => void;
  /** Progresso da reprodução (0-100) */
  progress?: number;
  /** Tamanho do botão */
  size?: "sm" | "md" | "lg" | "xl";
  /** Cor primária */
  primaryColor?: string;
  /** Se o botão está desabilitado */
  disabled?: boolean;
  /** Texto abaixo do botão (ex: "Reproduzir") */
  label?: string;
  /** Classe CSS adicional */
  className?: string;
}

// Configuração de tamanhos
const SIZE_CONFIG = {
  sm: { button: 48, icon: 20, ring: 56, label: "text-xs" },
  md: { button: 64, icon: 28, ring: 76, label: "text-sm" },
  lg: { button: 80, icon: 36, ring: 96, label: "text-base" },
  xl: { button: 96, icon: 44, ring: 112, label: "text-lg" },
};

// Função auxiliar para ajustar cor (escurecer/clarear)
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const PlayButton: React.FC<PlayButtonProps> = ({
  state = "idle",
  onClick,
  progress = 0,
  size = "lg",
  primaryColor = "#3B82F6",
  disabled = false,
  label,
  className = "",
}) => {
  const config = SIZE_CONFIG[size];

  // Calcular o stroke-dasharray para o progresso circular
  const circumference = 2 * Math.PI * ((config.ring - 4) / 2);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Determinar qual ícone mostrar
  const renderIcon = () => {
    switch (state) {
      case "loading":
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 size={config.icon} className="text-white" />
          </motion.div>
        );

      case "playing":
        return (
          <Pause size={config.icon} className="text-white" fill="white" />
        );

      case "paused":
      case "idle":
      default:
        return (
          <Play size={config.icon} className="text-white ml-1" fill="white" />
        );
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Container do botão com anel de progresso */}
      <div className="relative" style={{ width: config.ring, height: config.ring }}>
        {/* Anel de progresso (SVG) */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={config.ring}
          height={config.ring}
        >
          {/* Anel de fundo */}
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={(config.ring - 4) / 2}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={3}
          />

          {/* Anel de progresso */}
          <motion.circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={(config.ring - 4) / 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </svg>

        {/* Botão principal */}
        <motion.button
          onClick={onClick}
          disabled={disabled || state === "loading"}
          className="absolute inset-0 m-auto flex items-center justify-center rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            width: config.button,
            height: config.button,
            background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -30)})`,
          }}
          whileHover={!disabled ? { scale: 1.05 } : {}}
          whileTap={!disabled ? { scale: 0.95 } : {}}
          aria-label={state === "playing" ? "Pausar" : "Reproduzir"}
        >
          {/* Efeito de brilho interno */}
          <div
            className="absolute inset-0 rounded-full opacity-30"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)",
            }}
          />

          {/* Ícone */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {renderIcon()}
            </motion.div>
          </AnimatePresence>

          {/* Ondas de pulsação quando playing */}
          {state === "playing" && (
            <>
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${primaryColor}` }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${primaryColor}` }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              />
            </>
          )}
        </motion.button>
      </div>

      {/* Label abaixo do botão */}
      {label && (
        <span className={`text-slate-400 ${config.label}`}>
          {label}
        </span>
      )}
    </div>
  );
};

export default PlayButton;
