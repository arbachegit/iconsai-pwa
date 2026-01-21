/**
 * ============================================================
 * Core Header - Header genérico reutilizável
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * REGRAS:
 * - NUNCA depende de módulos específicos
 * - Apenas recebe props e emite callbacks
 * - Zero lógica de negócio
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { HeaderProps, ThemeConfig } from "../types";

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#3B82F6",
  bgColor: "bg-slate-900/80",
  borderColor: "border-slate-700/50",
  textColor: "text-white",
};

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  theme = DEFAULT_THEME,
  onBack,
  onAction,
  actionIcon: ActionIcon,
  actionLabel,
  className = "",
}) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex-shrink-0 flex items-center justify-between px-4 py-3 ${theme.bgColor} backdrop-blur-md border-b ${theme.borderColor} ${className}`}
      style={{ paddingTop: "3rem" }}
    >
      {/* ESQUERDA: Botão Voltar ou espaço */}
      <div className="w-12 flex justify-start">
        {onBack ? (
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </motion.button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* CENTRO: Ícone + Título */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${theme.primaryColor}20, ${theme.primaryColor}10)`,
              border: `1px solid ${theme.primaryColor}30`,
            }}
          >
            <Icon
              className="w-4 h-4"
              style={{ color: theme.primaryColor }}
            />
          </div>
        )}

        <div className="flex flex-col items-start">
          <span
            className="text-base font-semibold"
            style={{ color: theme.primaryColor }}
          >
            {title}
          </span>
          {subtitle && (
            <span className="text-xs text-slate-400">{subtitle}</span>
          )}
        </div>
      </motion.div>

      {/* DIREITA: Ação ou espaço */}
      <div className="w-12 flex justify-end">
        {onAction && ActionIcon && (
          <motion.button
            onClick={onAction}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label={actionLabel || "Ação"}
          >
            <ActionIcon className="w-4 h-4 text-white" />
          </motion.button>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
