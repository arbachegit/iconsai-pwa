/**
 * ============================================================
 * UnifiedSplashScreen.tsx - Splash Screen Unificado para PWAs
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-17
 *
 * Descrição: Componente de splash screen reutilizável para todos os PWAs.
 * Design baseado no HOME do PWA (gradiente roxo).
 *
 * Usado por:
 * - PWA Principal (KnowYOU)
 * - PWA City (Chat IA)
 * - PWA Health (Saúde)
 * ============================================================
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UnifiedSplashScreenProps {
  /** Nome do aplicativo */
  appName: string;
  /** Ícone/Logo do app (React element) */
  icon: React.ReactNode;
  /** Cor primária do gradiente (hex) */
  primaryColor?: string;
  /** Cor secundária do gradiente (hex) */
  secondaryColor?: string;
  /** Duração do splash em ms (default 2000) */
  duration?: number;
  /** Callback quando splash completar */
  onComplete?: () => void;
  /** Mostrar ou não (controlled) */
  show?: boolean;
}

export const UnifiedSplashScreen: React.FC<UnifiedSplashScreenProps> = ({
  appName,
  icon,
  primaryColor = "#7C3AED", // Roxo (padrão PWA)
  secondaryColor = "#9333EA", // Roxo claro
  duration = 2500,
  onComplete,
  show = true,
}) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (!show) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        // Aguardar animação de fade-out antes de chamar callback
        setTimeout(onComplete, 300);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [show, duration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          }}
        >
          {/* Logo/Ícone com animação */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-6"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl"
            >
              <div className="text-5xl">{icon}</div>
            </motion.div>
          </motion.div>

          {/* Nome do app */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl font-bold text-white mb-8 tracking-tight"
          >
            {appName}
          </motion.h1>

          {/* Spinner de loading */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="relative"
          >
            {/* Spinner externo */}
            <motion.div
              className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            {/* Spinner interno (contra-rotação) */}
            <motion.div
              className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-b-white/40"
              animate={{ rotate: -360 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </motion.div>

          {/* Texto de loading (opcional) */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              delay: 0.6,
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="mt-6 text-white/70 text-sm"
          >
            Carregando...
          </motion.p>

          {/* Copyright footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute bottom-8 text-white/50 text-xs"
          >
            © 2025 KnowYOU • Arbache AI
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UnifiedSplashScreen;
