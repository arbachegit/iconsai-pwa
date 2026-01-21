import React from "react";
import { motion } from "framer-motion";

interface WaveformVisualizerProps {
  isActive: boolean;
  barCount?: number;
  color?: string;
  height?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive,
  barCount = 32,
  color = "#00D4FF",
  height = 40,
}) => {
  return (
    <div 
      className="flex items-end justify-center gap-[2px]"
      style={{ height }}
    >
      {[...Array(barCount)].map((_, i) => {
        // Criar padrão de ondas mais natural
        const baseDelay = Math.sin(i / barCount * Math.PI) * 0.3;
        const randomFactor = 0.5 + Math.random() * 0.5;
        
        return (
          <motion.div
            key={i}
            className="rounded-full"
            style={{ 
              width: 3,
              backgroundColor: color,
            }}
            animate={isActive ? {
              height: [
                4,
                height * randomFactor,
                4,
              ],
              opacity: [0.5, 1, 0.5],
            } : {
              height: 4,
              opacity: 0.3,
            }}
            transition={{
              duration: 0.5 + Math.random() * 0.3,
              repeat: isActive ? Infinity : 0,
              delay: baseDelay,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
};

export default WaveformVisualizer;
