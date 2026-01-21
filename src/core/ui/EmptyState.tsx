/**
 * ============================================================
 * Core EmptyState - Estado vazio genérico reutilizável
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
import { LucideIcon } from "lucide-react";
import type { ThemeConfig } from "../types";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  theme?: ThemeConfig;
  className?: string;
  children?: React.ReactNode;
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#3B82F6",
  bgColor: "bg-transparent",
  borderColor: "border-slate-700/50",
  textColor: "text-white",
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  theme = DEFAULT_THEME,
  className = "",
  children,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center h-full gap-4 text-center px-4 ${className}`}
    >
      {Icon && (
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}10, ${theme.primaryColor}05)`,
            border: `1px solid ${theme.primaryColor}20`,
          }}
        >
          <Icon
            className="w-8 h-8"
            style={{ color: theme.primaryColor }}
          />
        </div>
      )}

      <div>
        <h3 className={`text-lg font-semibold ${theme.textColor} mb-2`}>
          {title}
        </h3>
        {description && (
          <p className="text-sm text-slate-400 max-w-xs">{description}</p>
        )}
      </div>

      {children}
    </motion.div>
  );
};

export default EmptyState;
