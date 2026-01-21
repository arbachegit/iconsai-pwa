/**
 * ============================================================
 * UnifiedFooter.tsx - Footer Unificado do PWA
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-04
 * 
 * Descrição: Footer padronizado com navegação entre módulos.
 * Contém 5 botões: Ajuda, Mundo, Home, Saúde, Ideias.
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { 
  HelpCircle, 
  Globe, 
  Home, 
  Heart, 
  Lightbulb 
} from "lucide-react";
import type { ModuleType } from "../types";

// Configuração dos botões do footer
interface FooterButton {
  id: ModuleType;
  icon: React.ElementType;
  label: string;
  color: string;
  activeColor: string;
  activeBg: string;
}

const FOOTER_BUTTONS: FooterButton[] = [
  {
    id: "help",
    icon: HelpCircle,
    label: "Ajuda",
    color: "#94A3B8", // slate-400
    activeColor: "#3B82F6", // blue-500
    activeBg: "bg-blue-500/20",
  },
  {
    id: "world",
    icon: Globe,
    label: "Mundo",
    color: "#94A3B8",
    activeColor: "#10B981", // emerald-500
    activeBg: "bg-emerald-500/20",
  },
  {
    id: "home",
    icon: Home,
    label: "Home",
    color: "#94A3B8",
    activeColor: "#FFFFFF",
    activeBg: "bg-white/20",
  },
  {
    id: "health",
    icon: Heart,
    label: "Saúde",
    color: "#94A3B8",
    activeColor: "#F43F5E", // rose-500
    activeBg: "bg-rose-500/20",
  },
  {
    id: "ideas",
    icon: Lightbulb,
    label: "Ideias",
    color: "#94A3B8",
    activeColor: "#F59E0B", // amber-500
    activeBg: "bg-amber-500/20",
  },
];

interface UnifiedFooterProps {
  /** Módulo atualmente ativo */
  activeModule: ModuleType;
  /** Callback quando clicar em um módulo */
  onModuleChange: (module: ModuleType) => void;
  /** Se o footer está desabilitado (durante gravação, por exemplo) */
  disabled?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

export const UnifiedFooter: React.FC<UnifiedFooterProps> = ({
  activeModule,
  onModuleChange,
  disabled = false,
  className = "",
}) => {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-pwa-dark-card/90 backdrop-blur-md border-t border-white/5 safe-area-bottom ${className}`}
    >
      {/* Container dos botões */}
      <nav className="flex items-center justify-around px-2 py-2">
        {FOOTER_BUTTONS.map((button) => {
          const isActive = activeModule === button.id;
          const IconComponent = button.icon;
          
          return (
            <motion.button
              key={button.id}
              onClick={() => !disabled && onModuleChange(button.id)}
              disabled={disabled}
              className={`
                relative flex flex-col items-center justify-center
                min-w-[56px] h-14 rounded-2xl
                transition-all duration-300
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${isActive ? button.activeBg : "hover:bg-white/5"}
              `}
              whileHover={!disabled ? { scale: 1.05 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
              aria-label={button.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Indicador ativo (linha superior) */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -top-1 w-6 h-1 rounded-full"
                  style={{ backgroundColor: button.activeColor }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              {/* Ícone */}
              <motion.div
                animate={{ 
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0 
                }}
                transition={{ duration: 0.2 }}
              >
                <IconComponent 
                  className="w-5 h-5"
                  style={{ color: isActive ? button.activeColor : button.color }}
                />
              </motion.div>
              
              {/* Label (só aparece quando ativo) */}
              <motion.span
                initial={false}
                animate={{ 
                  opacity: isActive ? 1 : 0,
                  height: isActive ? "auto" : 0,
                  marginTop: isActive ? 2 : 0
                }}
                className="text-[10px] font-medium overflow-hidden"
                style={{ color: button.activeColor }}
              >
                {button.label}
              </motion.span>
            </motion.button>
          );
        })}
      </nav>
      
      {/* Safe area para iOS */}
      <div className="h-safe-area-inset-bottom" />
    </motion.footer>
  );
};

export default UnifiedFooter;
