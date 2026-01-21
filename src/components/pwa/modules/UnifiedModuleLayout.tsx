/**
 * ============================================================
 * UnifiedModuleLayout.tsx - v4.0.0 - 2026-01-08
 * ============================================================
 *
 * CORREÇÃO CRÍTICA v4.0.0:
 * - Usa `pwa-contextual-memory` (correto) em vez de `generate-contextual-greeting`
 * - Remove skipWelcome - cada módulo é INDEPENDENTE
 * - Busca memória por módulo específico (agent_slug)
 * - Primeira interação: boas-vindas do módulo
 * - Segunda+ interação: saudação contextual com nome + tema anterior
 *
 * ============================================================
 */

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Globe, Heart, Lightbulb, ArrowLeft, History } from "lucide-react";
import { SpectrumAnalyzer } from "../voice/SpectrumAnalyzer";
import { PlayButton } from "../voice/PlayButton";
import { ToggleMicrophoneButton } from "../voice/ToggleMicrophoneButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";

export type ModuleType = "help" | "world" | "health" | "ideas";

const MODULE_CONFIG: Record<
  ModuleType,
  {
    name: string;
    icon: typeof HelpCircle;
    color: string;
    bgColor: string;
    welcomeKey: string;
    defaultWelcome: string;
  }
> = {
  help: {
    name: "Ajuda",
    icon: HelpCircle,
    color: "#3B82F6",
    bgColor: "bg-blue-500/20",
    welcomeKey: "helpWelcomeText",
    defaultWelcome: "Olá! Posso te explicar como usar cada módulo do KnowYOU. O que você precisa de ajuda?",
  },
  world: {
    name: "Mundo",
    icon: Globe,
    color: "#10B981",
    bgColor: "bg-emerald-500/20",
    welcomeKey: "worldWelcomeText",
    defaultWelcome: "Olá! Sou seu analista de economia. O que gostaria de saber?",
  },
  health: {
    name: "Saúde",
    icon: Heart,
    color: "#F43F5E",
    bgColor: "bg-rose-500/20",
    welcomeKey: "healthWelcomeText",
    defaultWelcome: "Olá! Sou sua assistente de saúde. Como posso ajudar?",
  },
  ideas: {
    name: "Ideias",
    icon: Lightbulb,
    color: "#F59E0B",
    bgColor: "bg-amber-500/20",
    welcomeKey: "ideasWelcomeText",
    defaultWelcome: "Olá! Sou seu consultor de ideias. O que você está planejando?",
  },
};

interface UnifiedModuleLayoutProps {
  moduleType: ModuleType;
  onBack: () => void;
  onHistoryClick: () => void;
}

export const UnifiedModuleLayout: React.FC<UnifiedModuleLayoutProps> = ({ moduleType, onBack, onHistoryClick }) => {
  const config = MODULE_CONFIG[moduleType];
  const IconComponent = config.icon;

  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  // v5.1.0: NÃO desestruturar funções - causa loop infinito
  const { config: pwaConfig } = useConfigPWA();
  const { userName, deviceFingerprint } = usePWAVoiceStore();

  const hasSpokenWelcome = useRef(false);
  const hasFetchedGreeting = useRef(false);
  const animationRef = useRef<number | null>(null);

  const [contextualGreeting, setContextualGreeting] = useState<string | null>(null);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  // ============================================================
  // BUSCAR SAUDAÇÃO CONTEXTUAL ESPECÍFICA DO MÓDULO
  // Usa pwa-contextual-memory que consulta pwa_messages por agent_slug
  // ============================================================
  useEffect(() => {
    if (!deviceFingerprint || hasFetchedGreeting.current) return;
    hasFetchedGreeting.current = true;

    const fetchContextualGreeting = async () => {
      try {
        console.log(`[Module-${moduleType}] Buscando saudação contextual via pwa-contextual-memory...`);

        // CORREÇÃO: Usar pwa-contextual-memory (correto) em vez de generate-contextual-greeting
        const { data, error } = await supabase.functions.invoke("pwa-contextual-memory", {
          body: {
            deviceId: deviceFingerprint,
            moduleType: moduleType,
            action: "getGreeting",
          },
        });

        if (error) {
          console.warn(`[Module-${moduleType}] Erro ao buscar contexto:`, error);
          return;
        }

        if (data?.greeting) {
          console.log(`[Module-${moduleType}] Saudação contextual recebida:`, {
            hasContext: data.hasContext,
            isFirstInteraction: data.isFirstInteraction,
            greeting: data.greeting.substring(0, 50) + "...",
          });
          setContextualGreeting(data.greeting);
          setIsFirstInteraction(data.isFirstInteraction);
        }
      } catch (err) {
        console.warn(`[Module-${moduleType}] Exceção ao buscar contexto:`, err);
      }
    };

    fetchContextualGreeting();
  }, [deviceFingerprint, moduleType]);

  // ============================================================
  // AUTOPLAY - Cada módulo é INDEPENDENTE
  // SEMPRE toca saudação (contextual ou padrão)
  // ============================================================
  useEffect(() => {
    if (hasSpokenWelcome.current) return;
    hasSpokenWelcome.current = true;

    // CORREÇÃO: Removido skipWelcome - cada módulo é INDEPENDENTE
    // Não depende mais do que aconteceu na HOME

    const getGreetingText = (): string => {
      // Se temos saudação contextual, usar ela
      if (contextualGreeting) {
        return contextualGreeting;
      }

      // Fallback: usar configuração do pwa_config
      const configRecord = pwaConfig as unknown as Record<string, string>;
      const welcomeText = configRecord[config.welcomeKey] || config.defaultWelcome;
      return welcomeText.replace("[name]", userName || "");
    };

    // Delay para garantir que a busca de contexto terminou
    const timer = setTimeout(() => {
      const greeting = getGreetingText();
      console.log(
        `[Module-${moduleType}] Autoplay (isFirst: ${isFirstInteraction}):`,
        greeting.substring(0, 50) + "...",
      );

      speak(greeting, moduleType).catch((err) => {
        console.warn("Autoplay bloqueado:", err);
      });
    }, 1000); // 1 segundo para dar tempo da busca de contexto

    return () => {
      clearTimeout(timer);
    };
  }, [speak, moduleType, pwaConfig, config, userName, contextualGreeting, isFirstInteraction]);

  // v5.1.0: Cleanup ao desmontar - deps: [] (array vazio)
  useEffect(() => {
    return () => {
      useAudioManager.getState().stopAllAndCleanup();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // v5.1.0: Capturar frequências - deps: [audioManager.isPlaying] (primitivo estável)
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

  // Handler para captura de áudio
  const handleAudioCapture = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      if (!audioBlob || audioBlob.size < 1000) {
        throw new Error("AUDIO_TOO_SHORT: Gravação muito curta");
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));

      let mimeType = audioBlob.type;
      if (!mimeType || mimeType === "") {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        mimeType = isIOS || isSafari ? "audio/mp4" : "audio/webm";
      }

      const { data: sttData, error: sttError } = await supabase.functions.invoke("voice-to-text", {
        body: { audio: base64, mimeType },
      });

      if (sttError) {
        throw new Error(`STT_ERROR: ${sttError.message}`);
      }

      const userText = sttData?.text;
      if (!userText?.trim()) {
        throw new Error("STT_EMPTY: Não entendi o áudio");
      }

      const { data: chatData, error: chatError } = await supabase.functions.invoke("chat-router", {
        body: {
          message: userText,
          pwaMode: true,
          chatType: moduleType,
          agentSlug: moduleType,
          deviceId: deviceFingerprint || undefined,
        },
      });

      if (chatError) {
        throw new Error(`CHAT_ERROR: ${chatError.message}`);
      }

      const aiResponse = chatData?.response || chatData?.message || chatData?.text;
      if (!aiResponse) {
        throw new Error("CHAT_EMPTY: Resposta vazia");
      }

      // NOVO v2.6.0: Usar phoneticMap retornado pelo chat-router
      const phoneticMap = chatData?.phoneticMap || {};

      await speak(aiResponse, moduleType, { phoneticMapOverride: phoneticMap });
    } catch (error: any) {
      console.error(`[Module-${moduleType}] ERRO:`, error);

      let errorMessage = "Desculpe, ocorreu um erro. Tente novamente.";

      if (error.message?.includes("AUDIO_TOO_SHORT")) {
        errorMessage = "A gravação foi muito curta. Fale um pouco mais.";
      } else if (error.message?.includes("STT_ERROR")) {
        errorMessage = "Não consegui processar o áudio.";
      } else if (error.message?.includes("STT_EMPTY")) {
        errorMessage = "Não entendi o que você disse. Pode repetir?";
      } else if (error.message?.includes("CHAT_ERROR")) {
        errorMessage = "O serviço está temporariamente indisponível.";
      }

      await speak(errorMessage, moduleType);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayClick = () => {
    if (isPlaying) {
      stop();
    } else {
      let greeting: string;
      if (contextualGreeting) {
        greeting = contextualGreeting;
      } else {
        const configRecord = pwaConfig as unknown as Record<string, string>;
        const welcomeText = configRecord[config.welcomeKey] || config.defaultWelcome;
        greeting = welcomeText.replace("[name]", userName || "");
      }

      speak(greeting, moduleType);
    }
  };

  // v5.1.0: handleBack usa getState() diretamente
  const handleBack = () => {
    useAudioManager.getState().stopAllAndCleanup();
    onBack();
  };

  const visualizerState = isRecording
    ? "recording"
    : isProcessing
      ? "loading"
      : isLoading
        ? "loading"
        : isPlaying
          ? "playing"
          : "idle";
  const buttonState = isProcessing ? "loading" : isLoading ? "loading" : isPlaying ? "playing" : "idle";

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
            className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}
            animate={{
              boxShadow: isPlaying
                ? [`0 0 0 0 ${config.color}00`, `0 0 20px 5px ${config.color}66`, `0 0 0 0 ${config.color}00`]
                : "none",
            }}
            transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
          >
            <IconComponent className="w-5 h-5" style={{ color: config.color }} />
          </motion.div>
          <span className="text-lg font-semibold text-white">{config.name}</span>
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
        <SpectrumAnalyzer
          state={visualizerState}
          frequencyData={frequencyData}
          primaryColor={config.color}
          secondaryColor={config.color}
          height={120}
          width={280}
        />

        <PlayButton
          state={buttonState}
          onClick={handlePlayClick}
          progress={progress}
          size="lg"
          primaryColor={config.color}
        />

        <ToggleMicrophoneButton
          onAudioCapture={handleAudioCapture}
          disabled={isLoading}
          isPlaying={isPlaying}
          isProcessing={isProcessing}
          primaryColor={config.color}
          onFrequencyData={setFrequencyData}
          onRecordingChange={setIsRecording}
          maxDurationSeconds={60}
        />
      </div>
    </div>
  );
};

export default UnifiedModuleLayout;
