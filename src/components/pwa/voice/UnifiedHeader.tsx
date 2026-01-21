/**
 * ============================================================
 * UnifiedHeader.tsx - Header Unificado do PWA
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-04
 * 
 * Descrição: Header padronizado para todas as telas do PWA.
 * Contém: Botão voltar, Ícone/Nome do módulo, Botão histórico.
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  HelpCircle, 
  Globe, 
  Home, 
  Heart, 
  Lightbulb,
  History
} from "lucide-react";
import type { ModuleType } from "../types";

// Configuração visual de cada módulo
const MODULE_CONFIG: Record<ModuleType, {
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  home: {
    name: "KnowYOU",
    icon: Home,
    color: "#FFFFFF",
    bgColor: "bg-white/10",
  },
  help: {
    name: "Ajuda",
    icon: HelpCircle,
    color: "#3B82F6",
    bgColor: "bg-blue-500/20",
  },
  world: {
    name: "Mundo",
    icon: Globe,
    color: "#10B981",
    bgColor: "bg-emerald-500/20",
  },
  health: {
    name: "Saúde",
    icon: Heart,
    color: "#F43F5E",
    bgColor: "bg-rose-500/20",
  },
  ideas: {
    name: "Ideias",
    icon: Lightbulb,
    color: "#F59E0B",
    bgColor: "bg-amber-500/20",
  },
};

interface UnifiedHeaderProps {
  /** Tipo do módulo atual */
  moduleType: ModuleType;
  /** Callback quando clicar no botão voltar */
  onBack?: () => void;
  /** Callback quando clicar no botão histórico */
  onHistoryClick?: () => void;
  /** Se deve mostrar o botão voltar (false na Home) */
  showBackButton?: boolean;
  /** Se deve mostrar o botão histórico */
  showHistoryButton?: boolean;
  /** Quantidade de mensagens não lidas no histórico */
  unreadCount?: number;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  moduleType,
  onBack,
  onHistoryClick,
  showBackButton = true,
  showHistoryButton = true,
  unreadCount = 0,
}) => {
  const config = MODULE_CONFIG[moduleType];
  const IconComponent = config.icon;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between px-4 py-3 bg-pwa-dark-card/80 backdrop-blur-md border-b border-white/5"
    >
      {/* ESQUERDA: Botão Voltar */}
      <div className="w-12 flex justify-start">
        {showBackButton && onBack ? (
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
          <div className="w-10 h-10" /> // Placeholder para manter alinhamento
        )}
      </div>

      {/* CENTRO: Ícone + Nome do Módulo */}
      <motion.div 
        className="flex items-center gap-2"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Ícone com fundo colorido */}
        <div 
          className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}
        >
          <IconComponent 
            className="w-4 h-4" 
            style={{ color: config.color }}
          />
        </div>
        
        {/* Nome do módulo */}
        <span 
          className="text-lg font-semibold"
          style={{ color: config.color }}
        >
          {config.name}
        </span>
      </motion.div>

      {/* DIREITA: Botão Histórico */}
      <div className="w-12 flex justify-end">
        {showHistoryButton && onHistoryClick ? (
          <motion.button
            onClick={onHistoryClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Histórico"
          >
            <History className="w-5 h-5 text-white" />
            
            {/* Bolinha vermelha pulsando */}
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse-red" />
            
            {/* Badge de contagem (se houver) */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-white px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              </span>
            )}
          </motion.button>
        ) : (
          <div className="w-10 h-10" /> // Placeholder para manter alinhamento
        )}
      </div>
    </motion.header>
  );
};

export default UnifiedHeader;
