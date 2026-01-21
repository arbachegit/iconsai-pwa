import React from "react";
import { motion } from "framer-motion";

interface CometBorderProps {
  isActive: boolean;
  speed?: number;
  color?: string;
  glowColor?: string;
  borderRadius?: string;
  borderWidth?: number;
  children: React.ReactNode;
  className?: string;
}

export const CometBorder: React.FC<CometBorderProps> = ({ 
  isActive, 
  speed = 2,
  color = "#00D4FF",
  glowColor = "rgba(0, 212, 255, 0.5)",
  borderRadius = "1rem",
  borderWidth = 2,
  children,
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* Container da borda animada */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius }}
      >
        {/* Gradiente cônico rotativo - efeito cometa */}
        <motion.div
          className="absolute"
          style={{
            inset: "-50%",
            background: `conic-gradient(
              from 0deg,
              transparent 0%,
              transparent 60%,
              ${glowColor} 75%,
              ${color} 80%,
              ${glowColor} 85%,
              transparent 100%
            )`,
          }}
          animate={isActive ? { 
            rotate: 360 
          } : { 
            rotate: 0,
            opacity: 0.3,
          }}
          transition={{
            duration: speed,
            repeat: isActive ? Infinity : 0,
            ease: "linear",
          }}
        />
        
        {/* Segunda camada para efeito de cauda */}
        {isActive && (
          <motion.div
            className="absolute"
            style={{
              inset: "-50%",
              background: `conic-gradient(
                from 180deg,
                transparent 0%,
                transparent 70%,
                ${glowColor} 85%,
                transparent 100%
              )`,
              filter: "blur(8px)",
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: speed * 1.2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </div>
      
      {/* Glow estático quando inativo */}
      {!isActive && (
        <div 
          className="absolute inset-0 opacity-30"
          style={{ 
            borderRadius,
            border: `${borderWidth}px solid ${color}`,
            boxShadow: `0 0 20px ${glowColor}`,
          }}
        />
      )}
      
      {/* Conteúdo interno com background sólido */}
      <div 
        className="relative bg-slate-900"
        style={{ 
          borderRadius,
          margin: `${borderWidth}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default CometBorder;
