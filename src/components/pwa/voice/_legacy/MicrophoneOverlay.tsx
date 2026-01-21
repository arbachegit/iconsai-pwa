/**
 * ============================================================
 * MicrophoneOverlay.tsx - Overlay de Microfone
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-04
 * 
 * Descrição: Gerencia a exibição do SlidingMicrophone como
 * overlay, empurrando o conteúdo para cima.
 * ============================================================
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidingMicrophone } from "./SlidingMicrophone";

interface MicrophoneOverlayProps {
  /** Se o overlay está ativo */
  isOpen: boolean;
  /** Callback para fechar */
  onClose: () => void;
  /** Callback quando áudio é capturado */
  onAudioCapture: (audioBlob: Blob) => void;
  /** Callback quando transcrição está pronta */
  onTranscription?: (text: string) => void;
  /** Duração máxima */
  maxDuration?: number;
  /** Cor do microfone */
  micColor?: string;
  /** Conteúdo que será empurrado para cima */
  children: React.ReactNode;
}

export const MicrophoneOverlay: React.FC<MicrophoneOverlayProps> = ({
  isOpen,
  onClose,
  onAudioCapture,
  onTranscription,
  maxDuration = 60,
  micColor = "#EF4444",
  children,
}) => {
  const [isRecording, setIsRecording] = useState(false);

  // Altura do painel do microfone
  const microphonePanelHeight = 280;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Conteúdo principal que será empurrado */}
      <motion.div
        animate={{
          y: isOpen ? -microphonePanelHeight / 2 : 0,
          scale: isOpen ? 0.95 : 1,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full h-full"
      >
        {children}
      </motion.div>

      {/* Backdrop escuro */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Microfone deslizante */}
      <SlidingMicrophone
        isVisible={isOpen}
        onClose={onClose}
        onAudioCapture={onAudioCapture}
        onTranscription={onTranscription}
        onRecordingStart={() => setIsRecording(true)}
        onRecordingStop={() => setIsRecording(false)}
        maxDuration={maxDuration}
        primaryColor={micColor}
      />
    </div>
  );
};

export default MicrophoneOverlay;
