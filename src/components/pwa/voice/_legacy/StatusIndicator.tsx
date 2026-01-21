import React from "react";
import { motion } from "framer-motion";

interface StatusIndicatorProps {
  isActive?: boolean;
  color?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  isActive = true, 
  color = "#22C55E",
  size = "md" 
}) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Círculo principal */}
      <motion.div
        className={`${sizeMap[size]} rounded-full`}
        style={{ backgroundColor: color }}
        animate={isActive ? {
          scale: [1, 1.2, 1],
          opacity: [1, 0.8, 1],
        } : {
          scale: 1,
          opacity: 0.5,
        }}
        transition={{
          duration: 1.5,
          repeat: isActive ? Infinity : 0,
          ease: "easeInOut",
        }}
      />
      
      {/* Primeira onda (glow) */}
      {isActive && (
        <motion.div
          className={`absolute ${sizeMap[size]} rounded-full`}
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 2.5],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      )}
      
      {/* Segunda onda com delay */}
      {isActive && (
        <motion.div
          className={`absolute ${sizeMap[size]} rounded-full`}
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 2.5],
            opacity: [0.4, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.75,
          }}
        />
      )}
    </div>
  );
};

export default StatusIndicator;
