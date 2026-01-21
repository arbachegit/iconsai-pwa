/**
 * ============================================================
 * HomeContainer.tsx - Container PAI para HOME
 * ============================================================
 * Versão: 8.0.0 - 2026-01-16
 *
 * FIX PROBLEMAS 1 E 2:
 * - Usa SEMPRE config.welcomeText do useConfigPWA (não chama generate-contextual-greeting)
 * - Autoplay simplificado: toca assim que config estiver pronto
 * - Sem chamadas externas desnecessárias
 * ============================================================
 * CHANGELOG v8.0.0:
 * - NEW: HomePlayButton exclusivo com design do knowyou-nexus
 * - NEW: Efeito de luminosidade girando (conic-gradient)
 * - NEW: Anel externo escuro com borda ciano
 * - NEW: Glow quando animando, pulse quando waiting
 * CHANGELOG v7.1.0:
 * - FIX: Autoplay usando useRef para evitar re-execução
 * - FIX: Removido speak do array de dependências do useEffect
 * CHANGELOG v7.0.0:
 * - Removida chamada a generate-contextual-greeting
 * - Texto de boas-vindas vem DIRETO do useConfigPWA
 * - Autoplay mais rápido e confiável
 * ============================================================
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { VoiceSpectrumBidirectional } from "../voice/VoiceSpectrumBidirectional";
import { HomePlayButton } from "../microservices/HomePlayButton";
import { ModuleSelector } from "../voice/ModuleSelector";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { usePWAVoiceStore, ModuleId } from "@/stores/pwaVoiceStore";
import { classifyAndEnrich } from "@/hooks/useClassifyAndEnrich";

// Cor padrão da Home (pode ser configurável no futuro)
const HOME_CONFIG = {
  name: "Home",
  color: "#00D4FF", // Ciano - cor primária do KnowYOU
  secondaryColor: "#8B5CF6", // Roxo - cor secundária
};

interface HomeContainerProps {
  onModuleSelect: (moduleId: Exclude<ModuleId, null>) => void;
  deviceId: string;
}

export const HomeContainer: React.FC<HomeContainerProps> = ({ onModuleSelect, deviceId }) => {
  // ============================================================
  // HOOKS CENTRALIZADOS (mesma arquitetura dos módulos)
  // ============================================================
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  const { config, isLoading: isConfigLoading } = useConfigPWA();
  const { userName } = usePWAVoiceStore();

  // Estados locais
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  // Refs
  const animationRef = useRef<number | null>(null);
  const hasPlayedAutoplayRef = useRef(false); // v7.1.0: Ref para evitar re-execução
  const speakRef = useRef(speak); // Ref para speak para usar no useEffect

  // Manter speakRef atualizado
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  // ============================================================
  // ETAPA 1: TEXTO DE BOAS-VINDAS DIRETO DO CONFIG
  // v7.0.0: Sem chamada externa, usa SEMPRE useConfigPWA
  // ============================================================
  const getWelcomeText = useCallback((): string => {
    // Pegar texto do config (definido no banco pwa_config)
    let text = config.welcomeText ||
      "Olá! Eu sou o KnowYOU, seu assistente de voz desenvolvido pela Arbache AI. Escolha um módulo abaixo para começar.";

    // Substituir [name] pelo nome do usuário se disponível
    if (userName) {
      text = text.replace("[name]", userName);
    } else {
      // Remover placeholder se não houver nome
      text = text.replace("[name]", "").replace(/\s+/g, " ").trim();
    }

    return text;
  }, [config.welcomeText, userName]);

  // Flag para saber se o texto está pronto
  const isGreetingReady = !isConfigLoading;

  // ============================================================
  // ETAPA 2: AUTOPLAY (v7.1.0 - usando ref para evitar re-execução)
  // ============================================================
  useEffect(() => {
    // v7.1.0: Usar ref para garantir execução única
    if (!isGreetingReady || hasPlayedAutoplayRef.current) return;

    const welcomeText = getWelcomeText();
    if (!welcomeText) return;

    // Marcar como executado ANTES de iniciar (previne race conditions)
    hasPlayedAutoplayRef.current = true;
    console.log("[HOME v7.1] 🚀 Executando autoplay com texto do config...");

    // Classificar e enriquecer para TTS contextual
    const executeAutoplay = async () => {
      try {
        const enrichment = await classifyAndEnrich(welcomeText, "home");
        // v7.1.0: Usar speakRef.current em vez de speak direto
        await speakRef.current(enrichment.enrichedText || welcomeText, "home", {
          phoneticMapOverride: enrichment.phoneticMap,
        });
      } catch (err) {
        console.warn("[HOME v7.1] ⚠️ Autoplay bloqueado ou erro:", err);
        // O useTextToSpeech já salva em pendingPlay se for NotAllowedError
        // SafariAudioUnlock vai fazer retry quando usuário interagir
      }
    };

    executeAutoplay();
  }, [isGreetingReady, getWelcomeText]); // v7.1.0: Removido speak das dependências

  // ============================================================
  // CAPTURA DE FREQUÊNCIAS DO AUDIO MANAGER
  // ============================================================
  useEffect(() => {
    if (!audioManager.isPlaying) {
      setFrequencyData([]);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const updateFrequency = () => {
      const data = useAudioManager.getState().getFrequencyData();
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

  // ============================================================
  // CLEANUP AO DESMONTAR
  // ============================================================
  useEffect(() => {
    return () => {
      useAudioManager.getState().stopAllAndCleanup();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handlePlayClick = useCallback(async () => {
    if (isPlaying) {
      stop();
    } else {
      const welcomeText = getWelcomeText();
      if (welcomeText) {
        try {
          const enrichment = await classifyAndEnrich(welcomeText, "home");
          await speak(enrichment.enrichedText || welcomeText, "home", {
            phoneticMapOverride: enrichment.phoneticMap,
          });
        } catch (err) {
          console.warn("[HOME v7] ⚠️ Erro ao reproduzir:", err);
        }
      }
    }
  }, [isPlaying, getWelcomeText, speak, stop]);

  const handleModuleClick = useCallback(
    (moduleId: Exclude<ModuleId, null>) => {
      // Parar áudio antes de navegar
      stop();
      useAudioManager.getState().stopAllAndCleanup();
      onModuleSelect(moduleId);
    },
    [stop, onModuleSelect],
  );

  // ============================================================
  // ESTADOS DO VISUALIZADOR
  // ============================================================
  const visualizerState = isLoading ? "loading" : isPlaying ? "playing" : "idle";

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col overflow-hidden"
    >
      {/* HEADER - Altura fixa */}
      <motion.div
        className="flex-shrink-0 pt-12 pb-2 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="text-center overflow-hidden">
          <h1 className="text-2xl font-bold whitespace-nowrap">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              KnowYOU
            </span>
          </h1>
        </div>
      </motion.div>

      {/* PLAYER AREA - Área flexível mas contida */}
      <motion.div
        className="flex-shrink-0 flex flex-col items-center justify-center px-6 gap-4 py-4"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* HOME PLAY BUTTON - Design exclusivo com anel externo */}
        <HomePlayButton
          state={visualizerState === "loading" ? "loading" : visualizerState === "playing" ? "playing" : "idle"}
          onPlay={handlePlayClick}
          onPause={handlePlayClick}
          audioProgress={progress}
          disabled={false}
        />

        {/* VOICE SPECTRUM BIDIRECIONAL - Exclusivo da HOME */}
        <VoiceSpectrumBidirectional
          state={visualizerState}
          frequencyData={frequencyData}
          primaryColor={HOME_CONFIG.color}
          secondaryColor={HOME_CONFIG.secondaryColor}
        />
      </motion.div>

      {/* MODULE SELECTOR - Altura fixa, sempre visível */}
      <motion.div
        className="flex-shrink-0 px-4 pb-4 overflow-visible"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <ModuleSelector
          onSelect={handleModuleClick}
          isPlaying={isPlaying}
          disabled={isPlaying || isLoading}
        />
      </motion.div>

      {/* FOOTER - Altura fixa */}
      <motion.div
        className="flex-shrink-0 py-2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <p className="text-[10px] text-muted-foreground/60">KnowYOU © 2025</p>
      </motion.div>

      {/* INDICADOR DE CARREGAMENTO INICIAL */}
      {!isGreetingReady && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default HomeContainer;
