/**
 * ============================================================
 * PWAHealthHeader.tsx - Header do PWA Health
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-19
 *
 * Descrição: Header padronizado para o PWA Health (microserviço).
 * Visual igual ao PWA City, mas com cores verdes (saúde).
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { HeartPulse, LogOut } from "lucide-react";

interface PWAHealthHeaderProps {
  /** Nome do usuário logado */
  userName?: string | null;
  /** Callback para abrir menu de configurações */
  onMenuClick?: () => void;
  /** Callback para logout */
  onLogout?: () => void;
}

export const PWAHealthHeader: React.FC<PWAHealthHeaderProps> = ({
  userName,
  onMenuClick,
  onLogout,
}) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-emerald-500/20"
      style={{ paddingTop: '3rem' }} // Espaço para o notch
    >
      {/* ESQUERDA: Espaço vazio para manter centralização */}
      <div className="w-12" />

      {/* CENTRO: Logo + Nome */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Ícone com fundo colorido */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center">
          <HeartPulse className="w-4 h-4 text-emerald-400" />
        </div>

        {/* Nome */}
        <div className="flex flex-col items-start">
          <span className="text-base font-semibold text-emerald-400">
            PWA Health
          </span>
          {userName && (
            <span className="text-xs text-slate-400">
              {userName}
            </span>
          )}
        </div>
      </motion.div>

      {/* DIREITA: Logout */}
      <div className="w-12 flex justify-end">
        {onLogout && (
          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4 text-red-400" />
          </motion.button>
        )}
      </div>
    </motion.header>
  );
};

export default PWAHealthHeader;
