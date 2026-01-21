import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface MicrophoneButtonProps {
  isListening: boolean;
  isProcessing?: boolean;
  disabled?: boolean;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { button: "w-12 h-12", icon: "w-5 h-5" },
  md: { button: "w-14 h-14", icon: "w-6 h-6" },
  lg: { button: "w-16 h-16", icon: "w-8 h-8" },
};

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  isListening,
  isProcessing = false,
  disabled = false,
  onClick,
  size = "lg",
}) => {
  return (
    <div className="relative">
      {/* Ondas de áudio quando listening */}
      <AnimatePresence>
        {isListening && (
          <>
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-cyan-400"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.5 + i * 0.3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Botão principal */}
      <motion.button
        onClick={onClick}
        disabled={disabled || isProcessing}
        className={`
          ${sizeMap[size].button}
          rounded-full
          flex items-center justify-center
          transition-colors
          ${isListening 
            ? "bg-red-500 shadow-lg shadow-red-500/40" 
            : "bg-cyan-500 shadow-lg shadow-cyan-500/30"
          }
          ${disabled || isProcessing ? "opacity-50 cursor-not-allowed" : "active:scale-95"}
        `}
        whileHover={!disabled && !isProcessing ? { scale: 1.05 } : {}}
        whileTap={!disabled && !isProcessing ? { scale: 0.95 } : {}}
        animate={isListening ? {
          scale: [1, 1.05, 1],
        } : {}}
        transition={{
          duration: 0.5,
          repeat: isListening ? Infinity : 0,
        }}
      >
        {isProcessing ? (
          <Loader2 className={`${sizeMap[size].icon} text-white animate-spin`} />
        ) : isListening ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Mic className={`${sizeMap[size].icon} text-white`} />
          </motion.div>
        ) : (
          <Mic className={`${sizeMap[size].icon} text-white`} />
        )}
      </motion.button>

      {/* Label de status */}
      <motion.p
        className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-slate-400 whitespace-nowrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {isProcessing ? "Processando..." : isListening ? "Ouvindo..." : "Toque para falar"}
      </motion.p>
    </div>
  );
};

export default MicrophoneButton;
