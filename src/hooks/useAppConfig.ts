/**
 * Hook para carregar configurações do banco de dados (app_config)
 * Substitui hardcodes por valores configuráveis
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AppConfigRow {
  key: string;
  value: string | number | boolean | object;
  description: string | null;
  category: string | null;
  updated_at: string | null;
}

export interface AppConfigMap {
  [key: string]: string | number | boolean | object;
}

/**
 * Hook para carregar configurações do app_config
 * @param category - Filtrar por categoria (opcional)
 * @returns Query com as configurações como mapa key -> value
 */
export function useAppConfig(category?: string) {
  return useQuery({
    queryKey: ['app-config', category],
    queryFn: async (): Promise<AppConfigMap> => {
      let query = supabase.from('app_config').select('*');
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useAppConfig] Error loading config:', error);
        throw error;
      }
      
      // Transformar array em mapa
      const configMap: AppConfigMap = {};
      (data as AppConfigRow[] || []).forEach(item => {
        let parsedValue = item.value;
        
        // Tentar parsear JSON se for string
        if (typeof item.value === 'string') {
          try {
            parsedValue = JSON.parse(item.value);
          } catch {
            // Manter como string se não for JSON válido
            parsedValue = item.value;
          }
        }
        
        configMap[item.key] = parsedValue;
      });
      
      return configMap;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
  });
}

/**
 * Hook para carregar um valor específico de configuração
 * @param key - Chave da configuração
 * @param defaultValue - Valor padrão se não encontrar
 */
export function useAppConfigValue<T>(key: string, defaultValue: T) {
  const { data: allConfig, isLoading, error } = useAppConfig();
  
  const value = allConfig?.[key];
  
  return {
    value: value !== undefined ? (value as T) : defaultValue,
    isLoading,
    error,
  };
}

/**
 * Hook para carregar configurações de voz
 */
export function useVoiceConfig() {
  const { data, isLoading } = useAppConfig('voice');
  
  return {
    silenceThreshold: (data?.['voice.silence_threshold'] as number) ?? 15,
    vadCheckInterval: (data?.['voice.vad_check_interval'] as number) ?? 100,
    initialWaitMs: (data?.['voice.initial_wait_ms'] as number) ?? 10000,
    silenceWaitMs: (data?.['voice.silence_wait_ms'] as number) ?? 5000,
    countdownSeconds: (data?.['voice.countdown_seconds'] as number) ?? 5,
    isLoading,
  };
}

/**
 * Hook para carregar configurações de memória
 */
export function useMemoryConfig() {
  const { data, isLoading } = useAppConfig('system');
  
  return {
    warningThreshold: (data?.['memory.warning_threshold'] as number) ?? 0.70,
    criticalThreshold: (data?.['memory.critical_threshold'] as number) ?? 0.85,
    isLoading,
  };
}

/**
 * Hook para carregar configurações de analytics
 */
export function useAnalyticsConfig() {
  const { data, isLoading } = useAppConfig('analytics');
  
  return {
    maxRecordsPerState: (data?.['analytics.max_records_per_state'] as number) ?? 12,
    maxHistoryItems: (data?.['analytics.max_history_items'] as number) ?? 5,
    isLoading,
  };
}

/**
 * Função para obter todas as configurações de uma vez (para uso em edge functions ou componentes)
 */
export async function fetchAppConfig(category?: string): Promise<AppConfigMap> {
  let query = supabase.from('app_config').select('*');
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[fetchAppConfig] Error:', error);
    return {};
  }
  
  const configMap: AppConfigMap = {};
  (data as AppConfigRow[] || []).forEach(item => {
    let parsedValue = item.value;
    if (typeof item.value === 'string') {
      try {
        parsedValue = JSON.parse(item.value);
      } catch {
        parsedValue = item.value;
      }
    }
    configMap[item.key] = parsedValue;
  });
  
  return configMap;
}
