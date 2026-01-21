/**
 * ============================================================
 * Unified Module - Main Component
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Módulo unificado que renderiza help/world/health/ideas
 * baseado na configuração. Interface de voz.
 * ============================================================
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, History } from "lucide-react";

// Core primitives (we'll use components from pwa-voice for visualization)
import { VoiceSpectrum, MicrophoneButton, VoicePlayButton } from "@/modules/pwa-voice";
import { transcribeAudio } from "@/modules/pwa-voice/services/voiceToText";

// Stores and hooks
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";

// Module-specific
import {
  type UnifiedModuleType,
  getModuleConfig,
  getModuleTexts,
} from "./configs";
import { sendToChatRouter, ChatRouterError } from "./services/chatRouter";
import { getContextualGreeting } from "./services/contextualMemory";

interface UnifiedModuleProps {
  /** Tipo do módulo */
  moduleType: UnifiedModuleType;
  /** Callback ao voltar */
  onBack: () => void;
  /** Callback ao clicar em histórico */
  onHistoryClick: () => void;
}

export const UnifiedModule: React.FC<UnifiedModuleProps> = ({
  moduleType,
  onBack,
  onHistoryClick,
}) => {
  const moduleConfig = getModuleConfig(moduleType);
  const moduleTexts = getModuleTexts(moduleType);
  const IconComponent = moduleConfig.icon;
  const theme = moduleConfig.theme;

  // Hooks
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  const { config: pwaConfig } = useConfigPWA();
  const { userName, deviceFingerprint } = usePWAVoiceStore();

  // Refs
  const hasSpokenWelcome = useRef(false);
  const hasFetchedGreeting = useRef(false);
  const animationRef = useRef<number | null>(null);

  // State
  const [contextualGreeting, setContextualGreeting] = useState<string | null>(null);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  // Buscar saudação contextual
  useEffect(() => {
    if (!deviceFingerprint || hasFetchedGreeting.current) return;
    hasFetchedGreeting.current = true;

    const fetchGreeting = async () => {
      const result = await getContextualGreeting({
        deviceId: deviceFingerprint,
        moduleType,
      });

      if (result) {
        setContextualGreeting(result.greeting);
        setIsFirstInteraction(result.isFirstInteraction);
      }
    };

    fetchGreeting();
  }, [deviceFingerprint, moduleType]);

  // Autoplay da saudação
  useEffect(() => {
    if (hasSpokenWelcome.current) return;
    hasSpokenWelcome.current = true;

    const getGreetingText = (): string => {
      if (contextualGreeting) {
        return contextualGreeting;
      }

      const configRecord = pwaConfig as unknown as Record<string, string>;
      const welcomeText = configRecord[moduleTexts.welcomeKey] || moduleConfig.welcomeText || "";
      return welcomeText.replace("[name]", userName || "");
    };

    const timer = setTimeout(() => {
      const greeting = getGreetingText();
      console.log(`[UnifiedModule-${moduleType}] Autoplay:`, greeting.substring(0, 50) + "...");

      speak(greeting, moduleType).catch((err) => {
        console.warn("Autoplay bloqueado:", err);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [speak, moduleType, pwaConfig, moduleConfig, moduleTexts, userName, contextualGreeting]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      useAudioManager.getState().stopAllAndCleanup();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Capturar frequências do áudio
  useEffect(() => {
    const isAudioPlaying = audioManager.isPlaying;

    if (!isAudioPlaying) {
      setFrequencyData([]);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const updateFrequency = () => {
      const data = audioManager.getFrequencyData();
      if (data.length > 0) {
        setFrequencyData(data);
      }
      animationRef.current = requestAnimationFrame(updateFrequency);
    };

    updateFrequency();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [audioManager.isPlaying]);

  // Handler de captura de áudio
  const handleAudioCapture = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      if (!audioBlob || audioBlob.size < 1000) {
        throw new Error("AUDIO_TOO_SHORT");
      }

      // Transcrever áudio
      const transcription = await transcribeAudio({
        audioBlob,
        mimeType: audioBlob.type || "audio/webm",
      });

      const userText = transcription.text;
      if (!userText?.trim()) {
        throw new Error("STT_EMPTY");
      }

      // Enviar para chat router
      const chatResponse = await sendToChatRouter({
        message: userText,
        moduleType,
        deviceId: deviceFingerprint || undefined,
      });

      const aiResponse = chatResponse.response;
      if (!aiResponse) {
        throw new Error("CHAT_EMPTY");
      }

      // Falar resposta
      await speak(aiResponse, moduleType, {
        phoneticMapOverride: chatResponse.phoneticMap,
      });
    } catch (error: unknown) {
      console.error(`[UnifiedModule-${moduleType}] ERRO:`, error);

      let errorMessage = "Desculpe, ocorreu um erro. Tente novamente.";
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes("AUDIO_TOO_SHORT")) {
        errorMessage = "A gravação foi muito curta. Fale um pouco mais.";
      } else if (errorMsg.includes("STT_EMPTY")) {
        errorMessage = "Não entendi o que você disse. Pode repetir?";
      } else if (error instanceof ChatRouterError) {
        errorMessage = "O serviço está temporariamente indisponível.";
      }

      await speak(errorMessage, moduleType);
    } finally {
      setIsProcessing(false);
    }
  }, [moduleType, deviceFingerprint, speak]);

  // Handler de play/pause
  const handlePlayClick = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      let greeting: string;
      if (contextualGreeting) {
        greeting = contextualGreeting;
      } else {
        const configRecord = pwaConfig as unknown as Record<string, string>;
        const welcomeText = configRecord[moduleTexts.welcomeKey] || moduleConfig.welcomeText || "";
        greeting = welcomeText.replace("[name]", userName || "");
      }
      speak(greeting, moduleType);
    }
  }, [isPlaying, stop, speak, contextualGreeting, pwaConfig, moduleTexts, moduleConfig, userName, moduleType]);

  // Handler de voltar
  const handleBack = useCallback(() => {
    useAudioManager.getState().stopAllAndCleanup();
    onBack();
  }, [onBack]);

  // Estados derivados
  const visualizerState = isRecording
    ? "recording"
    : isProcessing || isLoading
      ? "loading"
      : isPlaying
        ? "playing"
        : "idle";

  const buttonState = isProcessing || isLoading
    ? "loading"
    : isPlaying
      ? "playing"
      : "idle";

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 pt-12">
        <motion.button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>

        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${theme.primaryColor}20` }}
            animate={{
              boxShadow: isPlaying
                ? [
                    `0 0 0 0 ${theme.primaryColor}00`,
                    `0 0 20px 5px ${theme.primaryColor}66`,
                    `0 0 0 0 ${theme.primaryColor}00`,
                  ]
                : "none",
            }}
            transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
          >
            <IconComponent className="w-5 h-5" style={{ color: theme.primaryColor }} />
          </motion.div>
          <span className="text-lg font-semibold text-white">{moduleConfig.name}</span>
        </div>

        <motion.button
          onClick={onHistoryClick}
          className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
          whileTap={{ scale: 0.95 }}
        >
          <History className="w-5 h-5 text-white" />
          <motion.span
            className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.button>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <VoiceSpectrum
          state={visualizerState}
          frequencyData={frequencyData}
          theme={theme}
          height={120}
          width={280}
        />

        <VoicePlayButton
          state={buttonState}
          onClick={handlePlayClick}
          progress={progress}
          size="lg"
          theme={theme}
        />

        <MicrophoneButton
          onAudioCapture={handleAudioCapture}
          disabled={isLoading}
          isPlaying={isPlaying}
          isProcessing={isProcessing}
          theme={theme}
          onFrequencyData={setFrequencyData}
          onRecordingChange={setIsRecording}
          maxDuration={60}
        />
      </div>
    </div>
  );
};

export default UnifiedModule;
