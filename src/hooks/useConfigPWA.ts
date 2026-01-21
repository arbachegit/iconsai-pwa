import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PWAConfig {
  // Configurações gerais
  welcomeText: string;
  ttsVoice: string;
  micTimeoutSeconds: number;
  enableCountdown: boolean;
  splashDurationMs: number;

  // Textos de apresentação de cada módulo
  helpWelcomeText: string;
  worldWelcomeText: string;
  healthWelcomeText: string;
  ideasWelcomeText: string;

  // Controles de voz ElevenLabs
  voiceStability: number;      // 0.0 - 1.0
  voiceSimilarity: number;     // 0.0 - 1.0
  voiceStyle: number;          // 0.0 - 1.0
  voiceSpeed: number;          // 0.5 - 2.0
  voiceSpeakerBoost: boolean;
}

const DEFAULT_CONFIG: PWAConfig = {
  // Texto principal - home (com branding Arbache AI)
  welcomeText: `Olá! Eu sou o KnowYOU, seu assistente de voz desenvolvido pela Arbache AI. Pode tocar no play quantas vezes quiser para ouvir novamente. 

Você tem quatro botões abaixo: Ajuda ensina como usar o aplicativo. Mundo responde perguntas sobre qualquer assunto. Saúde faz triagem dos seus sintomas. E Ideias ajuda a desenvolver e validar suas ideias de negócio.

Quando estiver dentro de um módulo, toque no ícone de histórico para ver suas conversas anteriores. Escolha um botão para começar!`,

  ttsVoice: "fernando",
  micTimeoutSeconds: 10,
  enableCountdown: true,
  splashDurationMs: 3000,

  // Textos de boas-vindas de cada módulo (com branding Arbache AI)
  helpWelcomeText:
    "Bem-vindo ao módulo de Ajuda! Sou parte do KnowYOU, desenvolvido pela Arbache AI. Aqui você aprende a usar todas as funcionalidades do aplicativo. Siga os passos e toque em ouvir explicação para entender cada função.",

  worldWelcomeText:
    "Olá! Eu sou seu assistente de conhecimento geral do KnowYOU, desenvolvido pela Arbache AI. Pode me perguntar sobre qualquer assunto: ciência, história, tecnologia, cultura, ou curiosidades. Toque no microfone e faça sua pergunta!",

  healthWelcomeText:
    "Olá! Sou sua assistente de saúde do KnowYOU, desenvolvido pela Arbache AI. Vou te ajudar a entender melhor seus sintomas usando o protocolo OLDCARTS. Lembre-se: não substituo uma consulta médica. Toque no microfone para começar.",

  ideasWelcomeText:
    "Olá! Sou seu consultor de ideias do KnowYOU, desenvolvido pela Arbache AI. Vou usar a técnica do Advogado do Diabo para fortalecer suas ideias. Vou fazer perguntas desafiadoras para fortalecer seu projeto. Toque no microfone e me conte sua ideia!",

  // Controles de voz ElevenLabs
  voiceStability: 0.50,
  voiceSimilarity: 1.00,
  voiceStyle: 0.00,
  voiceSpeed: 1.15,
  voiceSpeakerBoost: true,
};

const CONFIG_KEY_MAP: Record<keyof PWAConfig, string> = {
  welcomeText: "welcome_text",
  ttsVoice: "tts_voice",
  micTimeoutSeconds: "mic_timeout_seconds",
  enableCountdown: "enable_countdown",
  splashDurationMs: "splash_duration_ms",
  // Textos dos módulos
  helpWelcomeText: "help_welcome_text",
  worldWelcomeText: "world_welcome_text",
  healthWelcomeText: "health_welcome_text",
  ideasWelcomeText: "ideas_welcome_text",
  // Voz ElevenLabs
  voiceStability: "voice_stability",
  voiceSimilarity: "voice_similarity",
  voiceStyle: "voice_style",
  voiceSpeed: "voice_speed",
  voiceSpeakerBoost: "voice_speaker_boost",
};

interface UseConfigPWAReturn {
  config: PWAConfig;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  updateConfig: (key: keyof PWAConfig, value: string | number | boolean) => void;
  saveConfig: () => Promise<boolean>;
  resetToDefaults: () => void;
  refetch: () => Promise<void>;
}

export function useConfigPWA(): UseConfigPWAReturn {
  const [config, setConfig] = useState<PWAConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("pwa_config")
        .select("config_key, config_value, config_type");

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const newConfig = { ...DEFAULT_CONFIG };

        data.forEach((row) => {
          const key = Object.entries(CONFIG_KEY_MAP).find(([, dbKey]) => dbKey === row.config_key)?.[0] as
            | keyof PWAConfig
            | undefined;

          if (key && row.config_value !== null) {
            if (row.config_type === "number") {
              (newConfig as Record<string, unknown>)[key] = parseInt(row.config_value, 10);
            } else if (row.config_type === "boolean") {
              (newConfig as Record<string, unknown>)[key] = row.config_value === "true";
            } else {
              (newConfig as Record<string, unknown>)[key] = row.config_value;
            }
          }
        });

        setConfig(newConfig);
      }
    } catch (err) {
      console.error("Erro ao carregar config PWA:", err);
      setError("Erro ao carregar configurações");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback((key: keyof PWAConfig, value: string | number | boolean) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const saveConfig = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      const updates = Object.entries(config).map(([key, value]) => {
        const dbKey = CONFIG_KEY_MAP[key as keyof PWAConfig];
        const configType = typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string";
        return {
          config_key: dbKey,
          config_value: String(value),
          config_type: configType,
        };
      });

      // Usar UPSERT para criar ou atualizar
      for (const update of updates) {
        const { error: upsertError } = await supabase.from("pwa_config").upsert(
          {
            config_key: update.config_key,
            config_value: update.config_value,
            config_type: update.config_type,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "config_key" },
        );

        if (upsertError) throw upsertError;
      }

      toast.success("Configurações salvas com sucesso!");
      return true;
    } catch (err) {
      console.error("Erro ao salvar config PWA:", err);
      setError("Erro ao salvar configurações");
      toast.error("Erro ao salvar configurações");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    toast.info("Configurações restauradas para o padrão (salve para aplicar)");
  }, []);

  return {
    config,
    isLoading,
    isSaving,
    error,
    updateConfig,
    saveConfig,
    resetToDefaults,
    refetch: fetchConfig,
  };
}

export default useConfigPWA;
