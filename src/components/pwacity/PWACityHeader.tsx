/**
 * ============================================================
 * PWACityHeader.tsx - Header do PWA City
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-17
 *
 * Descrição: Header padronizado para o PWA City (microserviço).
 * Visual igual ao PWA principal, mas com cores cyan/blue.
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { MessageSquare, Menu, LogOut } from "lucide-react";

interface PWACityHeaderProps {
  /** Nome do usuário logado */
  userName?: string | null;
  /** Callback para abrir menu de configurações */
  onMenuClick?: () => void;
  /** Callback para logout */
  onLogout?: () => void;
}

export const PWACityHeader: React.FC<PWACityHeaderProps> = ({
  userName,
  onMenuClick,
  onLogout,
}) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-cyan-500/20"
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
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
        </div>

        {/* Nome */}
        <div className="flex flex-col items-start">
          <span className="text-base font-semibold text-cyan-400">
            PWA City
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

export default PWACityHeader;
