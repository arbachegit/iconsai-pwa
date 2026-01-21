/**
 * Brasil Data Hub - React Hooks
 * 
 * Hooks para acessar dados públicos brasileiros de forma reativa
 */

import { useQuery } from '@tanstack/react-query';
import { brasilDataHub } from './client';
import type { 
    GeoRegiao, 
    GeoEstado, 
    GeoMunicipio,
    SaneamentoIndicadoresMunicipio 
} from './types';

// ============================================
// GEOGRAFIA HOOKS
// ============================================

/**
 * Hook para buscar todas as regiões do Brasil
 */
export function useRegioes() {
    return useQuery({
          queryKey: ['brasil-data-hub', 'regioes'],
          queryFn: async (): Promise<GeoRegiao[]> => {
                  const { data, error } = await brasilDataHub
                    .from('geo_regioes')
                    .select('*')
                    .order('nome');

            if (error) throw error;
                  return data || [];
          },
          staleTime: 1000 * 60 * 60, // 1 hora - dados geográficos mudam raramente
    });
}

/**
 * Hook para buscar todos os estados do Brasil
 */
export function useEstados(regiaoId?: string) {
    return useQuery({
          queryKey: ['brasil-data-hub', 'estados', regiaoId],
          queryFn: async (): Promise<GeoEstado[]> => {
                  let query = brasilDataHub
                    .from('geo_estados')
                    .select('*')
                    .order('nome');

            if (regiaoId) {
                      query = query.eq('regiao_id', regiaoId);
            }

            const { data, error } = await query;
                  if (error) throw error;
                  return data || [];
          },
          staleTime: 1000 * 60 * 60,
    });
}

/**
 * Hook para buscar municípios por estado
 */
export function useMunicipios(estadoId?: string) {
    return useQuery({
          queryKey: ['brasil-data-hub', 'municipios', estadoId],
          queryFn: async (): Promise<GeoMunicipio[]> => {
                  let query = brasilDataHub
                    .from('geo_municipios')
                    .select('*')
                    .order('nome');

            if (estadoId) {
                      query = query.eq('estado_id', estadoId);
            }

            const { data, error } = await query;
                  if (error) throw error;
                  return data || [];
          },
          enabled: !!estadoId, // Só executa se tiver estadoId
          staleTime: 1000 * 60 * 60,
    });
}

/**
 * Hook para buscar um município específico pelo código IBGE
 */
export function useMunicipioByCodigo(codigoIbge: string) {
    return useQuery({
          queryKey: ['brasil-data-hub', 'municipio', codigoIbge],
          queryFn: async (): Promise<GeoMunicipio | null> => {
                  const { data, error } = await brasilDataHub
                    .from('geo_municipios')
                    .select('*')
                    .eq('codigo_ibge', codigoIbge)
                    .single();

            if (error) throw error;
                  return data;
          },
          enabled: !!codigoIbge,
          staleTime: 1000 * 60 * 60,
    });
}

// ============================================
// SANEAMENTO HOOKS
// ============================================

/**
 * Hook para buscar indicadores de saneamento de um município
 */
export function useSaneamentoMunicipio(municipioId?: string) {
    return useQuery({
          queryKey: ['brasil-data-hub', 'saneamento', municipioId],
          queryFn: async (): Promise<SaneamentoIndicadoresMunicipio | null> => {
                  const { data, error } = await brasilDataHub
                    .from('saneamento_indicadores_municipio')
                    .select('*')
                    .eq('municipio_id', municipioId!)
                    .order('ano_referencia', { ascending: false })
                    .limit(1)
                    .single();

            if (error && error.code !== 'PGRST116') throw error;
                  return data;
          },
          enabled: !!municipioId,
          staleTime: 1000 * 60 * 30, // 30 minutos
    });
}

/**
 * Hook para buscar ranking de saneamento por estado
 */
export function useRankingSaneamentoEstado(estadoId: string, limit = 10) {
    return useQuery({
          queryKey: ['brasil-data-hub', 'saneamento-ranking', estadoId, limit],
          queryFn: async () => {
                  const { data: municipios, error: munError } = await brasilDataHub
                    .from('geo_municipios')
                    .select('id')
                    .eq('estado_id', estadoId);

            if (munError) throw munError;

            const municipioIds = municipios?.map(m => m.id) || [];

            const { data, error } = await brasilDataHub
                    .from('saneamento_indicadores_municipio')
                    .select(`
                              *,
                                        geo_municipios!inner(nome, codigo_ibge)
                                                `)
                    .in('municipio_id', municipioIds)
                    .order('indice_saneamento_basico', { ascending: false })
                    .limit(limit);

            if (error) throw error;
                  return data || [];
          },
          enabled: !!estadoId,
          staleTime: 1000 * 60 * 30,
    });
}

// ============================================
// BUSCA HOOKS
// ============================================

/**
 * Hook para buscar municípios por nome (autocomplete)
 */
export function useBuscaMunicipios(termo: string) {
    return useQuery({
          queryKey: ['brasil-data-hub', 'busca-municipios', termo],
          queryFn: async (): Promise<GeoMunicipio[]> => {
                  const /**
                     * Brasil Data Hub - React Hooks
                     * 
                     * Hooks para acessar dados públicos brasileiros de forma reativa
                     */

            import { useQuery } from '@tanstack/react-query';
            import { brasilDataHub } from './client';
            import type { 
                GeoRegiao, 
                GeoEstado, 
                GeoMunicipio,
                SaneamentoIndicadoresMunicipio 
            } from './types';

      // ============================================
      // GEOGRAFIA HOOKS
      // ============================================

      /**
             * Hook para buscar todas as regiões do Brasil
             */
      export function useRegioes() {
          return useQuery({
                queryKey: ['brasil-data-hub', 'regioes'],
                queryFn: async (): Promise<GeoRegiao[]> => {
                        const { data, error } = await brasilDataHub
                          .from('geo_regioes')
                      
