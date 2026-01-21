/**
 * ============================================================
 * components/pwa/microphone/RecordingIndicator.tsx
 * ============================================================
 * Versao: 1.0.0 - 2026-01-08
 * PRD: Microfone_objeto.zip
 * Indicador visual de gravacao em andamento
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";

interface RecordingIndicatorProps {
  isRecording: boolean;
  duration: number;
  onCancel?: () => void;
  color?: string;
}

export const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({
  isRecording,
  duration,
  onCancel,
  color = "#EF4444",
}) => {
  // Formatar duracao em MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isRecording) return null;

  return (
    <motion.div
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="flex items-center gap-3 px-4 py-2 rounded-full shadow-lg" style={{ backgroundColor: color }}>
        {/* Icone pulsante */}
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
          <Mic className="w-5 h-5 text-white" />
        </motion.div>

        {/* Duracao */}
        <span className="text-white font-mono text-sm font-medium">{formatDuration(duration)}</span>

        {/* Indicador de gravacao */}
        <motion.div
          className="w-2 h-2 rounded-full bg-white"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />

        {/* Botao cancelar */}
        {onCancel && (
          <button onClick={onCancel} className="ml-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <Square className="w-3 h-3 text-white" />
          </button>
        )}
      </div>

      {/* Texto de instrucao */}
      <motion.p
        className="text-center text-xs text-gray-500 mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Solte para enviar ou arraste para cancelar
      </motion.p>
    </motion.div>
  );
};

export default RecordingIndicator;
