/**
 * Brasil Data Hub - Supabase Client
 * 
 * Cliente para acessar dados públicos brasileiros:
 * - Geografia (IBGE): Regiões, Estados, Municípios
 * - Saneamento (SNIS): Indicadores de água, esgoto, resíduos
 * - Saúde (DATASUS): Estabelecimentos de saúde
 * - Educação (INEP): Escolas e indicadores educacionais
 */

import { createClient } from '@supabase/supabase-js';
import type { BrasilDataHubDatabase } from './types';

// Brasil Data Hub Supabase credentials
const BRASIL_DATA_HUB_URL = import.meta.env.VITE_BRASIL_DATA_HUB_URL || 'https://mnfjkegtynjtgesfphge.supabase.co';
const BRASIL_DATA_HUB_ANON_KEY = import.meta.env.VITE_BRASIL_DATA_HUB_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZmprZWd0eW5qdGdlc2ZwaGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NTIyODIsImV4cCI6MjA4NDIyODI4Mn0.vvv-UGwfkx1aNXLQl3n0KlhfXh13FYZTlL_kQy20-R0';

/**
 * Cliente Supabase para o Brasil Data Hub
 * Uso: import { brasilDataHub } from '@/integrations/brasil-data-hub/client';
 */
export const brasilDataHub = createClient<BrasilDataHubDatabase>(
    BRASIL_DATA_HUB_URL,
    BRASIL_DATA_HUB_ANON_KEY
  );

// Export URL for debugging
export const BRASIL_DATA_HUB_CONFIG = {
    url: BRASIL_DATA_HUB_URL,
    projectId: 'mnfjkegtynjtgesfphge'
};
