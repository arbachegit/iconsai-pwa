/**
 * Brasil Data Hub - Main Export
 * 
 * Integração com dados públicos brasileiros via Supabase
 * 
 * @example
 * // Importar cliente
 * import { brasilDataHub } from '@/integrations/brasil-data-hub';
 * 
 * // Usar hooks
 * import { useEstados, useMunicipios } from '@/integrations/brasil-data-hub';
 * 
 * function MeuComponente() {
 *   const { data: estados } = useEstados();
 *   return <select>{estados?.map(e => <option key={e.id}>{e.nome}</option>)}</select>;
 * }
 */

// Cliente Supabase
export { brasilDataHub, BRASIL_DATA_HUB_CONFIG } from './client';

// Tipos
export type {
    GeoRegiao,
    GeoEstado,
    GeoMunicipio,
    SaneamentoIndicadoresMunicipio,
    SaneamentoAgua,
    SaneamentoEsgoto,
    BrasilDataHubDatabase,
} from './types';

// Hooks
export {
    useRegioes,
    useEstados,
    useMunicipios,
    useMunicipioByCodigo,
    useSaneamentoMunicipio,
    useRankingSaneamentoEstado,
    useBuscaMunicipios,
} from './hooks';
