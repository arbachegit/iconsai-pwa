/**
 * Serviço para buscar cotações do Dólar PTAX via IPEADATA
 * 
 * Fonte: IPEADATA - Instituto de Pesquisa Econômica Aplicada
 * Série: GM366_ERC366 - Taxa de câmbio - R$ / US$ - comercial - compra - média
 * 
 * Documentação: http://www.ipeadata.gov.br/api/
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TIPOS
// ============================================================================

interface IPEADATAResponse {
  '@odata.context': string;
  value: IPEADATARecord[];
}

interface IPEADATARecord {
  SERCODIGO: string;
  VALDATA: string;      // ISO format: "2024-01-02T00:00:00-02:00"
  VALVALOR: number | null;
  NIVNOME: string;
  TERCODIGO: string;
}

export interface DolarPTAXRecord {
  date: string;         // YYYY-MM-DD
  value: number;
}

export interface DolarPTAXStats {
  min: number;
  max: number;
  avg: number;
  stdDev: number;
  count: number;
  firstDate: string;
  lastDate: string;
  variation: number;    // % variação primeiro -> último
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const IPEADATA_CONFIG = {
  baseUrl: 'http://www.ipeadata.gov.br/api/odata4',
  serieCode: 'GM366_ERC366',  // Taxa de câmbio R$/US$ comercial compra média
  indicatorCode: 'DOLAR',     // Código no sistema KnowYOU
};

// Cache do UUID do indicador
let cachedIndicatorUUID: string | null = null;

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Busca o UUID do indicador DOLAR no banco de dados
 */
async function getIndicatorUUID(): Promise<string> {
  if (cachedIndicatorUUID) {
    return cachedIndicatorUUID;
  }
  
  const { data, error } = await supabase
    .from('economic_indicators')
    .select('id')
    .eq('code', IPEADATA_CONFIG.indicatorCode)
    .single();
  
  if (error || !data) {
    throw new Error(`Indicador ${IPEADATA_CONFIG.indicatorCode} não encontrado: ${error?.message}`);
  }
  
  cachedIndicatorUUID = data.id;
  return data.id;
}

// ============================================================================
// FUNÇÕES DE FETCH
// ============================================================================

/**
 * Busca cotações do Dólar PTAX do IPEADATA
 * 
 * @param startDate - Data inicial (YYYY-MM-DD)
 * @param endDate - Data final (YYYY-MM-DD), default = hoje
 * @returns Array de registros com data e valor
 */
export async function fetchDolarPTAXFromIPEADATA(
  startDate: string,
  endDate?: string
): Promise<DolarPTAXRecord[]> {
  const end = endDate || new Date().toISOString().split('T')[0];
  
  // Construir URL com filtro OData
  const startISO = `${startDate}T00:00:00`;
  const endISO = `${end}T23:59:59`;
  
  const filterQuery = `$filter=VALDATA ge ${startISO} and VALDATA le ${endISO}`;
  const url = `${IPEADATA_CONFIG.baseUrl}/ValoresSerie(SERCODIGO='${IPEADATA_CONFIG.serieCode}')?${filterQuery}`;
  
  console.log(`[IPEADATA] Buscando Dólar PTAX: ${startDate} até ${end}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: IPEADATAResponse = await response.json();
    
    // Converter para formato padronizado
    const records: DolarPTAXRecord[] = data.value
      .filter(record => record.VALVALOR !== null)
      .map(record => ({
        date: record.VALDATA.split('T')[0],
        value: record.VALVALOR as number,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`[IPEADATA] Encontrados ${records.length} registros`);
    
    return records;
    
  } catch (error) {
    console.error('[IPEADATA] Erro ao buscar dados:', error);
    throw error;
  }
}

/**
 * Busca TODOS os dados disponíveis (sem filtro de data)
 * Útil para carga inicial completa
 */
export async function fetchAllDolarPTAXFromIPEADATA(): Promise<DolarPTAXRecord[]> {
  const url = `${IPEADATA_CONFIG.baseUrl}/ValoresSerie(SERCODIGO='${IPEADATA_CONFIG.serieCode}')`;
  
  console.log(`[IPEADATA] Buscando TODOS os dados do Dólar PTAX...`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: IPEADATAResponse = await response.json();
    
    const records: DolarPTAXRecord[] = data.value
      .filter(record => record.VALVALOR !== null)
      .map(record => ({
        date: record.VALDATA.split('T')[0],
        value: record.VALVALOR as number,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`[IPEADATA] Total: ${records.length} registros`);
    if (records.length > 0) {
      console.log(`[IPEADATA] Período: ${records[0].date} até ${records[records.length - 1].date}`);
    }
    
    return records;
    
  } catch (error) {
    console.error('[IPEADATA] Erro ao buscar dados:', error);
    throw error;
  }
}

// ============================================================================
// FUNÇÕES DE SINCRONIZAÇÃO COM SUPABASE
// ============================================================================

/**
 * Sincroniza dados do IPEADATA com a tabela indicator_values no Supabase
 * 
 * @param startDate - Data inicial para sincronização
 * @param endDate - Data final (opcional)
 * @returns Quantidade de registros inseridos/atualizados
 */
export async function syncDolarPTAXToSupabase(
  startDate: string = '2015-01-01',
  endDate?: string
): Promise<{ inserted: number; errors: number }> {
  const stats = { inserted: 0, errors: 0 };
  
  try {
    // 1. Buscar UUID do indicador
    const indicatorUUID = await getIndicatorUUID();
    
    // 2. Buscar dados do IPEADATA
    const records = await fetchDolarPTAXFromIPEADATA(startDate, endDate);
    
    if (records.length === 0) {
      console.log('[SYNC] Nenhum registro para sincronizar');
      return stats;
    }
    
    console.log(`[SYNC] Sincronizando ${records.length} registros...`);
    
    // 3. Preparar dados para upsert (apenas colunas existentes)
    const dataToUpsert = records.map(record => ({
      indicator_id: indicatorUUID,
      reference_date: record.date,
      value: record.value,
    }));
    
    // 4. Upsert em lotes de 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < dataToUpsert.length; i += BATCH_SIZE) {
      const batch = dataToUpsert.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('indicator_values')
        .upsert(batch, {
          onConflict: 'indicator_id,reference_date',
          ignoreDuplicates: false,
        });
      
      if (error) {
        console.error(`[SYNC] Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        stats.errors += batch.length;
      } else {
        stats.inserted += batch.length;
        console.log(`[SYNC] Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} registros`);
      }
    }
    
    console.log(`[SYNC] Concluído: ${stats.inserted} inseridos, ${stats.errors} erros`);
    
    return stats;
    
  } catch (error) {
    console.error('[SYNC] Erro na sincronização:', error);
    throw error;
  }
}

// ============================================================================
// FUNÇÕES DE CONSULTA
// ============================================================================

/**
 * Busca cotações do Dólar PTAX do banco de dados local
 */
export async function getDolarPTAXFromDB(
  startDate: string,
  endDate: string
): Promise<DolarPTAXRecord[]> {
  const indicatorUUID = await getIndicatorUUID();
  
  const { data, error } = await supabase
    .from('indicator_values')
    .select('reference_date, value')
    .eq('indicator_id', indicatorUUID)
    .gte('reference_date', startDate)
    .lte('reference_date', endDate)
    .order('reference_date', { ascending: true });
  
  if (error) {
    console.error('[DB] Erro ao buscar dados:', error);
    throw error;
  }
  
  return (data || []).map(record => ({
    date: record.reference_date,
    value: Number(record.value),
  }));
}

/**
 * Calcula estatísticas do Dólar PTAX
 */
export function calculateDolarPTAXStats(records: DolarPTAXRecord[]): DolarPTAXStats | null {
  if (records.length === 0) return null;
  
  const values = records.map(r => r.value);
  const n = values.length;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / n;
  
  // Desvio padrão
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(avgSquaredDiff);
  
  // Variação percentual
  const firstValue = records[0].value;
  const lastValue = records[records.length - 1].value;
  const variation = ((lastValue - firstValue) / firstValue) * 100;
  
  return {
    min,
    max,
    avg,
    stdDev,
    count: n,
    firstDate: records[0].date,
    lastDate: records[records.length - 1].date,
    variation,
  };
}

// ============================================================================
// FUNÇÃO DE CONVENIÊNCIA - BUSCA INTELIGENTE
// ============================================================================

/**
 * Busca Dólar PTAX com fallback: primeiro tenta DB, se não tiver dados busca do IPEADATA
 */
export async function getDolarPTAX(
  startDate: string,
  endDate: string,
  forceRefresh: boolean = false
): Promise<DolarPTAXRecord[]> {
  // Se não forçar refresh, tentar buscar do DB primeiro
  if (!forceRefresh) {
    try {
      const dbRecords = await getDolarPTAXFromDB(startDate, endDate);
      
      if (dbRecords.length > 0) {
        console.log(`[DOLAR] Retornando ${dbRecords.length} registros do cache local`);
        return dbRecords;
      }
    } catch (error) {
      console.warn('[DOLAR] Erro ao buscar do DB, tentando IPEADATA:', error);
    }
  }
  
  // Buscar do IPEADATA
  console.log('[DOLAR] Buscando dados frescos do IPEADATA...');
  const records = await fetchDolarPTAXFromIPEADATA(startDate, endDate);
  
  // Salvar no DB em background (não bloqueia retorno)
  syncDolarPTAXToSupabase(startDate, endDate).catch(err => {
    console.error('[DOLAR] Erro ao sincronizar em background:', err);
  });
  
  return records;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { IPEADATA_CONFIG };
