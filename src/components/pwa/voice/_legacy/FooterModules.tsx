import React from "react";
import { motion } from "framer-motion";
import { HelpCircle, Globe, Heart, Lightbulb } from "lucide-react";
// StatusIndicator também está na pasta _legacy
const StatusIndicator: React.FC<{ isActive: boolean; size?: string }> = ({ isActive }) => (
  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
);
import { ModuleId } from "@/stores/pwaVoiceStore";

interface FooterModulesProps {
  activeModule: ModuleId;
  onSelectModule: (module: Exclude<ModuleId, null>) => void;
  showIndicators?: boolean;
}

const modules = [
  { 
    id: "help" as const, 
    icon: HelpCircle, 
    color: "#3B82F6", 
    position: "left" 
  },
  { 
    id: "world" as const, 
    icon: Globe, 
    color: "#10B981", 
    position: "right" 
  },
  { 
    id: "health" as const, 
    icon: Heart, 
    color: "#F43F5E", 
    position: "right" 
  },
  { 
    id: "ideas" as const, 
    icon: Lightbulb, 
    color: "#F59E0B", 
    position: "right" 
  },
];

export const FooterModules: React.FC<FooterModulesProps> = ({
  activeModule,
  onSelectModule,
  showIndicators = true,
}) => {
  const leftModules = modules.filter((m) => m.position === "left");
  const rightModules = modules.filter((m) => m.position === "right");

  const renderButton = (module: typeof modules[0], index: number) => {
    const Icon = module.icon;
    const isActive = activeModule === module.id;

    return (
      <motion.button
        key={module.id}
        onClick={() => onSelectModule(module.id)}
        className="relative p-3 rounded-xl transition-colors"
        style={{
          background: isActive ? `${module.color}20` : "transparent",
          border: isActive ? `1px solid ${module.color}40` : "1px solid transparent",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {/* Indicador pulsante */}
        {showIndicators && !isActive && (
          <div className="absolute -top-1 -right-1">
            <StatusIndicator isActive size="sm" />
          </div>
        )}

        {/* Ícone com blink sutil */}
        <motion.div
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        >
          <Icon 
            className="w-6 h-6" 
            style={{ color: isActive ? module.color : "hsl(var(--muted-foreground))" }} 
          />
        </motion.div>
      </motion.button>
    );
  };

  return (
    <motion.div
      className="w-full px-4 py-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between max-w-sm mx-auto">
        {/* Módulo da esquerda (Ajuda) */}
        <div className="flex items-center gap-2">
          {leftModules.map((module, index) => renderButton(module, index))}
        </div>

        {/* Módulos da direita (Mundo, Saúde, Ideia) */}
        <div className="flex items-center gap-2">
          {rightModules.map((module, index) => renderButton(module, index + 1))}
        </div>
      </div>
    </motion.div>
  );
};

export default FooterModules;
