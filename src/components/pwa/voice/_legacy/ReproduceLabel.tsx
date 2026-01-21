/**
 * ============================================================
 * ReproduceLabel.tsx - Label "Reproduzir" com ícone
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-04
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";

interface ReproduceLabelProps {
  /** Se está reproduzindo (muda o texto) */
  isPlaying?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

export const ReproduceLabel: React.FC<ReproduceLabelProps> = ({
  isPlaying = false,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-2 text-slate-400 ${className}`}>
      {/* Ícone de som com animação quando playing */}
      <motion.div
        animate={isPlaying ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={isPlaying ? { duration: 0.8, repeat: Infinity } : {}}
      >
        <Volume2 size={16} />
      </motion.div>
      
      {/* Texto */}
      <span className="text-sm font-medium">
        {isPlaying ? "Reproduzindo..." : "Reproduzir"}
      </span>
    </div>
  );
};

export default ReproduceLabel;
