import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Hook que escuta mudanças no API Registry via Supabase Realtime
 * e invalida todos os caches dependentes automaticamente.
 * 
 * Implementa a REGRA 5 do Prompt Nuclear:
 * "Integração Orquestrada por Gestão de API"
 * 
 * Quando system_api_registry é alterado, propaga automaticamente
 * para todos os painéis de visualização.
 */
export function useApiRegistrySync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    logger.log('[API_REGISTRY_SYNC] Initializing realtime subscription...');

    // Criar canal de real-time para escutar mudanças
    const channel = supabase
      .channel('api-registry-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'system_api_registry'
        },
        (payload) => {
          logger.log('[API_REGISTRY_SYNC] Change detected:', payload.eventType, payload);

          // PROPAGAÇÃO AUTOMÁTICA: Invalida TODOS os caches dependentes
          // Isso força refetch em todos os painéis que consomem estes dados
          
          // Indicadores nacionais
          queryClient.invalidateQueries({ queryKey: ['indicators'] });
          queryClient.invalidateQueries({ queryKey: ['indicator-values'] });
          queryClient.invalidateQueries({ queryKey: ['economic-indicators'] });
          
          // Indicadores regionais
          queryClient.invalidateQueries({ queryKey: ['regional-indicators'] });
          queryClient.invalidateQueries({ queryKey: ['regional-indicator-values'] });
          
          // Charts e análises
          queryClient.invalidateQueries({ queryKey: ['charts'] });
          queryClient.invalidateQueries({ queryKey: ['chart-database'] });
          
          // Tables
          queryClient.invalidateQueries({ queryKey: ['tables'] });
          queryClient.invalidateQueries({ queryKey: ['table-database'] });
          
          // Data Analysis
          queryClient.invalidateQueries({ queryKey: ['analyses'] });
          queryClient.invalidateQueries({ queryKey: ['data-analysis'] });
          
          // API Registry itself
          queryClient.invalidateQueries({ queryKey: ['api-registry'] });
          queryClient.invalidateQueries({ queryKey: ['system-api-registry'] });
          
          logger.log('[API_REGISTRY_SYNC] All dependent caches invalidated');
        }
      )
      .subscribe((status) => {
        logger.log('[API_REGISTRY_SYNC] Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      logger.log('[API_REGISTRY_SYNC] Removing realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Hook simplificado para uso em componentes específicos
 * que precisam reagir a mudanças no API Registry
 */
export function useApiRegistryChangeListener(
  onChangeCallback: (payload: any) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel('api-registry-listener')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_api_registry'
        },
        onChangeCallback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChangeCallback]);
}
