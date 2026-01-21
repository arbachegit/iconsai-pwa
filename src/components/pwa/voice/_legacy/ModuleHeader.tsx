import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, HelpCircle, Globe, Heart, Lightbulb, LucideIcon } from "lucide-react";

type ModuleId = "help" | "world" | "health" | "ideas";

interface ModuleConfig {
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

const moduleConfigs: Record<ModuleId, ModuleConfig> = {
  help: {
    name: "Ajuda",
    icon: HelpCircle,
    color: "#3B82F6",
    description: "Guia de uso do assistente",
  },
  world: {
    name: "Mundo",
    icon: Globe,
    color: "#10B981",
    description: "Pergunte sobre qualquer assunto",
  },
  health: {
    name: "Saúde",
    icon: Heart,
    color: "#F43F5E",
    description: "Triagem inteligente de sintomas",
  },
  ideas: {
    name: "Ideias",
    icon: Lightbulb,
    color: "#F59E0B",
    description: "Valide e refine suas ideias",
  },
};

interface ModuleHeaderProps {
  moduleId: ModuleId;
  onBack: () => void;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({ 
  moduleId, 
  onBack 
}) => {
  const config = moduleConfigs[moduleId];
  const Icon = config.icon;

  return (
    <motion.header
      className="flex items-center gap-4 p-4 border-b border-white/10"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Botão voltar */}
      <motion.button
        onClick={onBack}
        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </motion.button>

      {/* Ícone do módulo */}
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className="w-5 h-5" color={config.color} />
      </div>

      {/* Título e descrição */}
      <div className="flex-1">
        <h1 className="text-lg font-bold text-white">{config.name}</h1>
        <p className="text-xs text-slate-400">{config.description}</p>
      </div>
    </motion.header>
  );
};

export default ModuleHeader;
