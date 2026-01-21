/**
 * ============================================================
 * HealthModuleContainer.tsx - Container INDEPENDENTE para Saúde
 * ============================================================
 * Versão: 8.1.0 - 2026-01-19
 * NEW: Modal de consentimento de localização
 * ============================================================
 * CHANGELOG v8.1.0:
 * - Modal perguntando se usuário quer ajuda para encontrar clínicas
 * - Botões "Sim, permitir" e "Não, obrigado"
 * - Só solicita permissão de localização após consentimento
 * - Indicador de localização no header quando ativa
 * ============================================================
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, ArrowLeft, History, MapPin } from "lucide-react";
import { SpectrumAnalyzer } from "../voice/SpectrumAnalyzer";
import { PlayButton } from "../voice/PlayButton";
import { ToggleMicrophoneButton } from "../voice/ToggleMicrophoneButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";
import { classifyAndEnrich } from "@/hooks/useClassifyAndEnrich";
import { useSaveMessage } from "@/hooks/useSaveMessage";
import { useUserLocation, UserLocation } from "@/hooks/useUserLocation";

interface NearbyClinic {
  name: string;
  address: string;
  distanceText: string;
  isPublic: boolean;
  openNow?: string;
}

const MODULE_CONFIG = {
  name: "Saúde",
  icon: Heart,
  color: "#F43F5E",
  bgColor: "bg-rose-500/20",
  moduleType: "health" as const,
};

interface HealthModuleContainerProps {
  onBack: () => void;
  onHistoryClick: () => void;
  deviceId: string;
}

export const HealthModuleContainer: React.FC<HealthModuleContainerProps> = ({ onBack, onHistoryClick, deviceId }) => {
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  const { addMessage } = useHistoryStore();
  const { config: pwaConfig, isLoading: isConfigLoading } = useConfigPWA();
  const { userName } = usePWAVoiceStore();
  const { saveConversationTurn } = useSaveMessage();

  // Localização do usuário
  const { location, requestLocation, permissionStatus, isLoading: isLocationLoading } = useUserLocation();

  const [hasPlayedAutoplay, setHasPlayedAutoplay] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  // Clínicas próximas
  const [nearbyClinics, setNearbyClinics] = useState<NearbyClinic[]>([]);

  // Modal de consentimento de localização
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasAskedLocation, setHasAskedLocation] = useState(false);
  const [userDeclinedLocation, setUserDeclinedLocation] = useState(false);

  const animationRef = useRef<number | null>(null);

  // ============================================================
  // BUSCAR LOCALIZAÇÃO E CLÍNICAS PRÓXIMAS
  // ============================================================
  const fetchNearbyClinics = useCallback(async (userLocation: UserLocation) => {
    try {
      console.log("[HealthContainer v8] 📍 Buscando clínicas próximas...");

      const { data, error } = await supabase.functions.invoke("search-nearby-clinics", {
        body: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius: 5000, // 5km
          type: "all",
          maxResults: 10,
        },
      });

      if (error) {
        console.warn("[HealthContainer v8] ⚠️ Erro ao buscar clínicas:", error);
        return;
      }

      if (data?.clinics) {
        setNearbyClinics(data.clinics);
        console.log(`[HealthContainer v8] ✅ ${data.clinics.length} clínicas encontradas`);
      }
    } catch (err) {
      console.warn("[HealthContainer v8] ⚠️ Erro ao buscar clínicas:", err);
    }
  }, []);

  // Verificar se deve mostrar modal de localização
  useEffect(() => {
    if (hasAskedLocation || userDeclinedLocation) return;

    // Se já temos localização em cache, usar direto
    if (location) {
      console.log("[HealthContainer v8] 📍 Usando localização em cache");
      setHasAskedLocation(true);
      fetchNearbyClinics(location);
      return;
    }

    // Se permissão já foi dada anteriormente, solicitar direto
    if (permissionStatus === "granted") {
      console.log("[HealthContainer v8] 📍 Permissão já concedida, solicitando...");
      setHasAskedLocation(true);
      requestLocation().then((loc) => {
        if (loc) fetchNearbyClinics(loc);
      });
      return;
    }

    // Se permissão foi negada, não perguntar novamente
    if (permissionStatus === "denied") {
      console.log("[HealthContainer v8] 📍 Permissão negada anteriormente");
      setHasAskedLocation(true);
      return;
    }

    // Mostrar modal para perguntar ao usuário
    const timer = setTimeout(() => {
      if (!hasAskedLocation && permissionStatus !== "granted") {
        setShowLocationModal(true);
      }
    }, 1500); // Espera 1.5s após o autoplay começar

    return () => clearTimeout(timer);
  }, [hasAskedLocation, userDeclinedLocation, location, permissionStatus, requestLocation, fetchNearbyClinics]);

  // Handler quando usuário aceita compartilhar localização
  const handleAcceptLocation = useCallback(async () => {
    setShowLocationModal(false);
    setHasAskedLocation(true);

    console.log("[HealthContainer v8] 📍 Usuário aceitou compartilhar localização");
    const newLocation = await requestLocation();
    if (newLocation) {
      await fetchNearbyClinics(newLocation);
    }
  }, [requestLocation, fetchNearbyClinics]);

  // Handler quando usuário recusa compartilhar localização
  const handleDeclineLocation = useCallback(() => {
    setShowLocationModal(false);
    setHasAskedLocation(true);
    setUserDeclinedLocation(true);
    console.log("[HealthContainer v8] 📍 Usuário recusou compartilhar localização");
  }, []);

  // ============================================================
  // ETAPA 1: TEXTO DE BOAS-VINDAS DIRETO DO CONFIG
  // v7.0.0: Sem chamada externa, usa SEMPRE useConfigPWA
  // ============================================================
  const getWelcomeText = useCallback((): string => {
    let text = pwaConfig.healthWelcomeText ||
      "Olá! Sou sua assistente de saúde do KnowYOU. Vou te ajudar a entender melhor seus sintomas. Toque no microfone para começar.";

    if (userName) {
      text = text.replace("[name]", userName);
    } else {
      text = text.replace("[name]", "").replace(/\s+/g, " ").trim();
    }

    return text;
  }, [pwaConfig.healthWelcomeText, userName]);

  const isGreetingReady = !isConfigLoading;

  // ============================================================
  // ETAPA 2: Autoplay (v7.0.0 - simplificado)
  // ============================================================
  useEffect(() => {
    if (!isGreetingReady || hasPlayedAutoplay) return;

    const welcomeText = getWelcomeText();
    if (!welcomeText) return;

    console.log("[HealthContainer v7] 🚀 Executando autoplay com texto do config...");
    setHasPlayedAutoplay(true);

    const executeAutoplay = async () => {
      try {
        const enrichment = await classifyAndEnrich(welcomeText, MODULE_CONFIG.moduleType);
        await speak(enrichment.enrichedText || welcomeText, MODULE_CONFIG.moduleType, {
          phoneticMapOverride: enrichment.phoneticMap,
        });
      } catch (err) {
        console.warn("[HealthContainer v7] ⚠️ Autoplay bloqueado:", err);
      }
    };

    executeAutoplay();
  }, [isGreetingReady, hasPlayedAutoplay, getWelcomeText, speak]);

  // Captura de frequência
  useEffect(() => {
    if (!audioManager.isPlaying) {
      setFrequencyData([]);
      return;
    }

    const updateFrequency = () => {
      const data = useAudioManager.getState().getFrequencyData();
      if (data.length > 0) setFrequencyData(data);
      animationRef.current = requestAnimationFrame(updateFrequency);
    };

    updateFrequency();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioManager.isPlaying]);

  // Cleanup
  useEffect(() => {
    return () => {
      useAudioManager.getState().stopAllAndCleanup();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // ============================================================
  // SALVAR RESUMO AO SAIR
  // ============================================================
  const handleBack = useCallback(async () => {
    useAudioManager.getState().stopAllAndCleanup();

    if (messages.length >= 2) {
      try {
        console.log("[HealthContainer] Salvando resumo...");
        await supabase.functions.invoke("generate-conversation-summary", {
          body: {
            deviceId,
            moduleType: MODULE_CONFIG.moduleType,
            messages: messages.slice(-6),
          },
        });
      } catch (err) {
        console.warn("[HealthContainer] Erro ao salvar resumo:", err);
      }
    }

    onBack();
  }, [messages, deviceId, onBack]);

  // Handler de áudio
  const handleAudioCapture = async (audioBlob: Blob) => {
    setIsProcessing(true);
    console.log("[HealthContainer] 🎤 Processando áudio...");
    console.log("[HealthContainer] Blob size:", audioBlob?.size, "type:", audioBlob?.type);

    try {
      if (!audioBlob || audioBlob.size < 1000) {
        console.error("[HealthContainer] ❌ Áudio muito curto:", audioBlob?.size);
        throw new Error("AUDIO_TOO_SHORT");
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
      console.log("[HealthContainer] Base64 length:", base64.length);

      let mimeType = audioBlob.type || "audio/webm";
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        mimeType = "audio/mp4";
      }
      console.log("[HealthContainer] MimeType:", mimeType);

      console.log("[HealthContainer] 📡 Chamando voice-to-text...");
      const { data: sttData, error: sttError } = await supabase.functions.invoke("voice-to-text", {
        body: { audio: base64, mimeType },
      });
      console.log("[HealthContainer] STT Response:", { data: sttData, error: sttError });

      if (sttError) throw new Error(`STT_ERROR: ${sttError.message}`);

      const userText = sttData?.text;
      if (!userText?.trim()) throw new Error("STT_EMPTY");

      setMessages((prev) => [...prev, { role: "user", content: userText }]);

      addMessage(MODULE_CONFIG.moduleType, {
        role: "user",
        title: userText,
        audioUrl: "",
        duration: 0,
        transcription: userText,
      });

      // Chamar pwa-saude-agent (Perplexity com orientação de saúde + localização)
      console.log("[HealthContainer] 📡 Chamando pwa-saude-agent...");
      const { data: chatData, error: chatError } = await supabase.functions.invoke("pwa-saude-agent", {
        body: {
          prompt: userText,
          deviceId,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          // Dados de localização para contexto de clínicas
          location: location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            city: location.city,
            state: location.state,
            country: location.country,
          } : undefined,
          // Clínicas próximas pré-carregadas
          nearbyClinics: nearbyClinics.length > 0 ? nearbyClinics : undefined,
        },
      });

      console.log("[HealthContainer] Chat Response:", { data: chatData, error: chatError });

      if (chatError) {
        console.error("[HealthContainer] ❌ CHAT_ERROR:", chatError);
        throw new Error(`CHAT_ERROR: ${chatError.message}`);
      }

      // Verificar success: false da API
      if (chatData?.success === false) {
        console.error("[HealthContainer] ❌ API retornou success: false:", chatData?.error);
        throw new Error(`CHAT_ERROR: ${chatData?.error || "Erro desconhecido da API"}`);
      }

      const aiResponse = chatData?.response || chatData?.message || chatData?.text;
      if (!aiResponse) {
        console.error("[HealthContainer] ❌ CHAT_EMPTY - chatData:", chatData);
        throw new Error("CHAT_EMPTY");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);

      addMessage(MODULE_CONFIG.moduleType, {
        role: "assistant",
        title: aiResponse,
        audioUrl: "",
        duration: 0,
        transcription: aiResponse,
      });

      // Classificar e enriquecer para TTS contextual
      const enrichment = await classifyAndEnrich(aiResponse, MODULE_CONFIG.moduleType);

      await speak(enrichment.enrichedText || aiResponse, MODULE_CONFIG.moduleType, {
        phoneticMapOverride: enrichment.phoneticMap
      });

      // ✅ SALVAR NO BANCO DE DADOS
      saveConversationTurn(deviceId, MODULE_CONFIG.moduleType, userText, aiResponse).then((result) => {
        console.log("[HealthContainer] 💾 Mensagens salvas:", result);
      });
    } catch (error: any) {
      console.error("[HealthContainer] ❌ ERRO COMPLETO:", error);
      console.error("[HealthContainer] ❌ Error type:", typeof error);
      console.error("[HealthContainer] ❌ Error name:", error?.name);
      console.error("[HealthContainer] ❌ Error message:", error?.message);
      console.error("[HealthContainer] ❌ Error stack:", error?.stack);
      console.error("[HealthContainer] ❌ Error JSON:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

      let errorMessage = "Desculpe, ocorreu um erro. Tente novamente.";
      const errMsg = error?.message || String(error) || "";

      if (errMsg.includes("AUDIO_TOO_SHORT") || errMsg.includes("muito curto")) {
        errorMessage = "A gravação foi muito curta. Fale um pouco mais.";
      } else if (errMsg.includes("STT_EMPTY") || errMsg.includes("não entend")) {
        errorMessage = "Não entendi o que você disse. Pode repetir?";
      } else if (errMsg.includes("STT_ERROR") || errMsg.includes("transcrição")) {
        errorMessage = "Erro na transcrição. Tente novamente.";
      } else if (errMsg.includes("CHAT_ERROR") || errMsg.includes("provider")) {
        errorMessage = "Serviço temporariamente indisponível. Tente em alguns segundos.";
      } else if (errMsg.includes("CHAT_EMPTY")) {
        errorMessage = "Não recebi uma resposta. Tente novamente.";
      } else if (errMsg.includes("NetworkError") || errMsg.includes("fetch")) {
        errorMessage = "Erro de conexão. Verifique sua internet.";
      } else if (errMsg.includes("All providers failed")) {
        errorMessage = "Serviço temporariamente indisponível. Tente novamente em alguns segundos.";
      }

      console.log("[HealthContainer] 📣 Mensagem de erro para usuário:", errorMessage);
      console.log("[HealthContainer] 📣 Erro original:", errMsg);

      try {
        await speak(errorMessage, MODULE_CONFIG.moduleType);
      } catch (speakError) {
        console.error("[HealthContainer] ❌ Erro ao falar mensagem de erro:", speakError);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayClick = useCallback(async () => {
    if (isPlaying) {
      stop();
    } else {
      const welcomeText = getWelcomeText();
      if (welcomeText) {
        try {
          const enrichment = await classifyAndEnrich(welcomeText, MODULE_CONFIG.moduleType);
          await speak(enrichment.enrichedText || welcomeText, MODULE_CONFIG.moduleType, {
            phoneticMapOverride: enrichment.phoneticMap,
          });
        } catch (err) {
          console.warn("[HealthContainer v7] ⚠️ Erro ao reproduzir:", err);
        }
      }
    }
  }, [isPlaying, getWelcomeText, speak, stop]);

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
      {/* Modal de Consentimento de Localização */}
      {showLocationModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">Encontrar clínicas próximas?</h3>
            </div>

            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              Posso te ajudar a encontrar <strong className="text-white">hospitais, UBS e clínicas</strong> perto de você.
              Para isso, preciso saber sua localização.
            </p>

            <div className="flex gap-3">
              <motion.button
                onClick={handleDeclineLocation}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white/70 text-sm font-medium"
                whileTap={{ scale: 0.97 }}
              >
                Não, obrigado
              </motion.button>
              <motion.button
                onClick={handleAcceptLocation}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-500 text-white text-sm font-medium"
                whileTap={{ scale: 0.97 }}
              >
                Sim, permitir
              </motion.button>
            </div>

            <p className="text-white/40 text-xs text-center mt-4">
              Sua localização é usada apenas para buscar clínicas e não é armazenada.
            </p>
          </motion.div>
        </motion.div>
      )}

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
            className={`w-10 h-10 rounded-full ${MODULE_CONFIG.bgColor} flex items-center justify-center`}
            animate={{
              boxShadow: isPlaying
                ? [
                    `0 0 0 0 ${MODULE_CONFIG.color}00`,
                    `0 0 20px 5px ${MODULE_CONFIG.color}66`,
                    `0 0 0 0 ${MODULE_CONFIG.color}00`,
                  ]
                : "none",
            }}
            transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
          >
            <Heart className="w-5 h-5" style={{ color: MODULE_CONFIG.color }} />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-white">{MODULE_CONFIG.name}</span>
            {location && (
              <span className="text-xs text-white/60 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {location.city || "Localização ativa"}
              </span>
            )}
          </div>
        </div>

        <motion.button
          onClick={onHistoryClick}
          className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
          whileTap={{ scale: 0.95 }}
        >
          <History className="w-5 h-5 text-white" />
        </motion.button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <SpectrumAnalyzer
          state={visualizerState}
          frequencyData={frequencyData}
          primaryColor={MODULE_CONFIG.color}
          secondaryColor={MODULE_CONFIG.color}
          height={120}
          width={280}
        />

        <PlayButton
          state={buttonState}
          onClick={handlePlayClick}
          progress={progress}
          size="lg"
          primaryColor={MODULE_CONFIG.color}
        />

        <ToggleMicrophoneButton
          onAudioCapture={handleAudioCapture}
          disabled={isLoading}
          isPlaying={isPlaying}
          isProcessing={isProcessing}
          primaryColor={MODULE_CONFIG.color}
          onFrequencyData={setFrequencyData}
          onRecordingChange={setIsRecording}
          maxDurationSeconds={60}
        />
      </div>
    </div>
  );
};

export default HealthModuleContainer;
