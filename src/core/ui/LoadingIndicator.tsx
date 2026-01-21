/**
 * ============================================================
 * Core LoadingIndicator - Indicador de carregamento genérico
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * REGRAS:
 * - NUNCA depende de módulos específicos
 * - Apenas recebe props e renderiza
 * - Zero lógica de negócio
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ThemeConfig } from "../types";

interface LoadingIndicatorProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  theme?: ThemeConfig;
  className?: string;
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#3B82F6",
  bgColor: "bg-transparent",
  borderColor: "border-transparent",
  textColor: "text-slate-400",
};

const SIZE_MAP = {
  sm: { icon: "w-4 h-4", text: "text-xs" },
  md: { icon: "w-5 h-5", text: "text-sm" },
  lg: { icon: "w-6 h-6", text: "text-base" },
};

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  text = "Carregando...",
  size = "md",
  theme = DEFAULT_THEME,
  className = "",
}) => {
  const sizes = SIZE_MAP[size];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex items-center justify-center gap-2 ${className}`}
    >
      <Loader2
        className={`${sizes.icon} animate-spin`}
        style={{ color: theme.primaryColor }}
      />
      {text && (
        <span className={`${sizes.text} ${theme.textColor}`}>{text}</span>
      )}
    </motion.div>
  );
};

export default LoadingIndicator;
