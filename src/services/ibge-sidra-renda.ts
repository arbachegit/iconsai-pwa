/**
 * Serviço para buscar dados de Renda Per Capita do IBGE SIDRA
 * 
 * Fonte: PNAD Contínua - Rendimento de todas as fontes
 * Período disponível: 2012-2023 (anual)
 * 
 * Inclui funções de fetch para preview/análise e sincronização com Supabase
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TIPOS
// ============================================================================

interface SIDRARecord {
  NC: string;           // Nível territorial (código)
  NN: string;           // Nível territorial (nome)
  MC: string;           // Município/Região código
  MN: string;           // Município/Região nome
  V: string;            // Valor
  D1C: string;          // Variável código
  D1N: string;          // Variável nome
  D2C: string;          // Ano código
  D2N: string;          // Ano
  D3C?: string;         // Classificação 1 código (classe)
  D3N?: string;         // Classificação 1 nome
  D4C?: string;         // Classificação 2 código
  D4N?: string;         // Classificação 2 nome
}

export interface RendaPerCapitaRecord {
  year: number;
  region: string;
  regionCode: string;
  territorialLevel: 'brasil' | 'regiao' | 'uf';
  incomeClass?: string;
  incomeClassCode?: string;
  value: number;
  indicator: 'rendimento_medio' | 'limite_classe' | 'gini' | 'massa_rendimento';
}

export interface RendaPerCapitaStats {
  year: number;
  region: string;
  mediaGeral: number;
  gini: number;
  classes: {
    classe: string;
    limiteInferior: number;
    limiteSuperior: number;
    rendimentoMedio: number;
    percentualPopulacao: number;
  }[];
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

// UUIDs dos indicadores no banco de dados
const INDICATOR_IDS = {
  RENDA_MEDIA: '33162f8c-3f2a-4306-a7ba-65b38f58cb99',
  RENDA_MEDIA_UF: '5311dc65-8786-4427-b450-3bb8f7504b41',
  GINI: 'e2f852c0-9b95-4d2e-8f81-7c7b93d2bfbd',
  GINI_UF: 'a52011cf-4046-4f07-aa06-79fc0fc88627',
};

const SIDRA_CONFIG = {
  baseUrl: 'https://apisidra.ibge.gov.br/values',
  
  // Tabelas principais
  tables: {
    rendimentoMedioClasses: '7531',    // Rendimento médio por classes de percentual
    limitesClasses: '7438',            // Limites superiores das classes
    gini: '7435',                      // Índice de Gini
    rendimentoMedioUF: '7533',         // Rendimento médio por UF
    massaRendimento: '7527',           // Massa de rendimento
  },
  
  // Níveis territoriais
  territorialLevels: {
    brasil: 'n1',      // N1 = Brasil
    regiao: 'n2',      // N2 = Grande Região
    uf: 'n3',          // N3 = Unidade da Federação
  },
  
  // Códigos das regiões
  regioes: {
    '1': 'Norte',
    '2': 'Nordeste',
    '3': 'Sudeste',
    '4': 'Sul',
    '5': 'Centro-Oeste',
  },
  
  // Classes de percentual (C1019)
  classesPercentual: {
    '49040': 'Total',
    '49041': 'Até P5 (5% mais pobres)',
    '49042': 'Mais de P5 até P10',
    '49043': 'Mais de P10 até P20',
    '49044': 'Mais de P20 até P30',
    '49045': 'Mais de P30 até P40',
    '49046': 'Mais de P40 até P50',
    '49047': 'Mais de P50 até P60',
    '49048': 'Mais de P60 até P70',
    '49049': 'Mais de P70 até P80',
    '49050': 'Mais de P80 até P90',
    '49051': 'Mais de P90 até P95',
    '49052': 'Mais de P95 até P99',
    '49053': 'Mais de P99 (1% mais rico)',
  } as Record<string, string>,
  
  // Variáveis
  variables: {
    rendimentoMedio: '10824',
    limiteClasse: '10763',
    gini: '10681',
    massaRendimento: '10825',
  },
};

// ============================================================================
// FUNÇÕES DE FETCH (para preview/análise local)
// ============================================================================

/**
 * Busca dados genéricos do SIDRA
 */
async function fetchSIDRA(url: string): Promise<SIDRARecord[]> {
  console.log(`[SIDRA] Fetching: ${url}`);
  
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
    
    const data = await response.json();
    
    // SIDRA retorna array onde o primeiro item é o header
    if (Array.isArray(data) && data.length > 1) {
      return data.slice(1) as SIDRARecord[];
    }
    
    return [];
  } catch (error) {
    console.error('[SIDRA] Erro:', error);
    throw error;
  }
}

/**
 * Busca rendimento médio por classes de percentual
 * Tabela 7531
 */
export async function fetchRendimentoMedioClasses(
  anos: string = '2015,2016,2017,2018,2019,2020,2021,2022,2023',
  nivelTerritorial: 'brasil' | 'regiao' | 'uf' = 'brasil'
): Promise<RendaPerCapitaRecord[]> {
  const nivel = SIDRA_CONFIG.territorialLevels[nivelTerritorial];
  const tabela = SIDRA_CONFIG.tables.rendimentoMedioClasses;
  const variavel = SIDRA_CONFIG.variables.rendimentoMedio;
  
  const url = `${SIDRA_CONFIG.baseUrl}/t/${tabela}/${nivel}/all/v/${variavel}/p/${anos}/c1019/all`;
  
  const data = await fetchSIDRA(url);
  
  return data
    .filter(record => record.V && record.V !== '-' && record.V !== '...')
    .map(record => ({
      year: parseInt(record.D2N || record.D2C),
      region: record.MN || 'Brasil',
      regionCode: record.MC || '1',
      territorialLevel: nivelTerritorial,
      incomeClass: record.D3N || SIDRA_CONFIG.classesPercentual[record.D3C || ''],
      incomeClassCode: record.D3C,
      value: parseFloat(record.V.replace(',', '.')),
      indicator: 'rendimento_medio' as const,
    }));
}

/**
 * Busca limites das classes (valores de corte em R$)
 * Tabela 7438
 */
export async function fetchLimitesClasses(
  anos: string = '2015,2016,2017,2018,2019,2020,2021,2022,2023',
  nivelTerritorial: 'brasil' | 'regiao' | 'uf' = 'brasil'
): Promise<RendaPerCapitaRecord[]> {
  const nivel = SIDRA_CONFIG.territorialLevels[nivelTerritorial];
  const tabela = SIDRA_CONFIG.tables.limitesClasses;
  const variavel = SIDRA_CONFIG.variables.limiteClasse;
  
  const url = `${SIDRA_CONFIG.baseUrl}/t/${tabela}/${nivel}/all/v/${variavel}/p/${anos}/c1019/all`;
  
  const data = await fetchSIDRA(url);
  
  return data
    .filter(record => record.V && record.V !== '-' && record.V !== '...')
    .map(record => ({
      year: parseInt(record.D2N || record.D2C),
      region: record.MN || 'Brasil',
      regionCode: record.MC || '1',
      territorialLevel: nivelTerritorial,
      incomeClass: record.D3N || SIDRA_CONFIG.classesPercentual[record.D3C || ''],
      incomeClassCode: record.D3C,
      value: parseFloat(record.V.replace(',', '.')),
      indicator: 'limite_classe' as const,
    }));
}

/**
 * Busca índice de Gini
 * Tabela 7435
 */
export async function fetchGini(
  anos: string = '2015,2016,2017,2018,2019,2020,2021,2022,2023',
  nivelTerritorial: 'brasil' | 'regiao' | 'uf' = 'brasil'
): Promise<RendaPerCapitaRecord[]> {
  const nivel = SIDRA_CONFIG.territorialLevels[nivelTerritorial];
  const tabela = SIDRA_CONFIG.tables.gini;
  const variavel = SIDRA_CONFIG.variables.gini;
  
  const url = `${SIDRA_CONFIG.baseUrl}/t/${tabela}/${nivel}/all/v/${variavel}/p/${anos}`;
  
  const data = await fetchSIDRA(url);
  
  return data
    .filter(record => record.V && record.V !== '-' && record.V !== '...')
    .map(record => ({
      year: parseInt(record.D2N || record.D2C),
      region: record.MN || 'Brasil',
      regionCode: record.MC || '1',
      territorialLevel: nivelTerritorial,
      value: parseFloat(record.V.replace(',', '.')),
      indicator: 'gini' as const,
    }));
}

/**
 * Busca TODOS os dados de renda per capita para preview
 */
export async function fetchAllRendaPerCapita(
  startYear: number = 2015,
  endYear: number = 2023,
  nivelTerritorial: 'brasil' | 'regiao' | 'uf' = 'brasil'
): Promise<{
  rendimentoMedio: RendaPerCapitaRecord[];
  limitesClasses: RendaPerCapitaRecord[];
  gini: RendaPerCapitaRecord[];
}> {
  const anos = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  ).join(',');
  
  console.log(`[SIDRA] Buscando dados de ${startYear} a ${endYear} para ${nivelTerritorial}...`);
  
  const [rendimentoMedio, limitesClasses, gini] = await Promise.all([
    fetchRendimentoMedioClasses(anos, nivelTerritorial),
    fetchLimitesClasses(anos, nivelTerritorial),
    fetchGini(anos, nivelTerritorial),
  ]);
  
  console.log(`[SIDRA] Encontrados: ${rendimentoMedio.length} rendimentos, ${limitesClasses.length} limites, ${gini.length} gini`);
  
  return { rendimentoMedio, limitesClasses, gini };
}

// ============================================================================
// FUNÇÕES DE ANÁLISE
// ============================================================================

/**
 * Calcula estatísticas consolidadas por ano e região
 */
export function calcularEstatisticasRenda(
  rendimentoMedio: RendaPerCapitaRecord[],
  limitesClasses: RendaPerCapitaRecord[],
  gini: RendaPerCapitaRecord[]
): Map<string, RendaPerCapitaStats> {
  const stats = new Map<string, RendaPerCapitaStats>();
  
  // Agrupar por ano + região
  const grupos = new Map<string, {
    rendimentos: RendaPerCapitaRecord[];
    limites: RendaPerCapitaRecord[];
    giniValue?: number;
  }>();
  
  // Processar rendimentos
  rendimentoMedio.forEach(r => {
    const key = `${r.year}_${r.regionCode}`;
    if (!grupos.has(key)) {
      grupos.set(key, { rendimentos: [], limites: [] });
    }
    grupos.get(key)!.rendimentos.push(r);
  });
  
  // Processar limites
  limitesClasses.forEach(r => {
    const key = `${r.year}_${r.regionCode}`;
    if (!grupos.has(key)) {
      grupos.set(key, { rendimentos: [], limites: [] });
    }
    grupos.get(key)!.limites.push(r);
  });
  
  // Processar Gini
  gini.forEach(r => {
    const key = `${r.year}_${r.regionCode}`;
    if (grupos.has(key)) {
      grupos.get(key)!.giniValue = r.value;
    }
  });
  
  // Calcular estatísticas para cada grupo
  grupos.forEach((grupo, key) => {
    const [yearStr] = key.split('_');
    const year = parseInt(yearStr);
    const region = grupo.rendimentos[0]?.region || 'Brasil';
    
    // Encontrar média geral (classe Total)
    const totalClass = grupo.rendimentos.find(r => r.incomeClassCode === '49040');
    const mediaGeral = totalClass?.value || 0;
    
    // Montar classes
    const classes = grupo.rendimentos
      .filter(r => r.incomeClassCode !== '49040')
      .map(r => {
        const limite = grupo.limites.find(l => l.incomeClassCode === r.incomeClassCode);
        return {
          classe: r.incomeClass || '',
          limiteInferior: 0,
          limiteSuperior: limite?.value || 0,
          rendimentoMedio: r.value,
          percentualPopulacao: getPercentualClasse(r.incomeClassCode || ''),
        };
      })
      .sort((a, b) => a.limiteSuperior - b.limiteSuperior);
    
    stats.set(key, {
      year,
      region,
      mediaGeral,
      gini: grupo.giniValue || 0,
      classes,
    });
  });
  
  return stats;
}

/**
 * Retorna o percentual da população para cada classe
 */
function getPercentualClasse(codigo: string): number {
  const percentuais: Record<string, number> = {
    '49041': 5,   // Até P5
    '49042': 5,   // P5 até P10
    '49043': 10,  // P10 até P20
    '49044': 10,  // P20 até P30
    '49045': 10,  // P30 até P40
    '49046': 10,  // P40 até P50
    '49047': 10,  // P50 até P60
    '49048': 10,  // P60 até P70
    '49049': 10,  // P70 até P80
    '49050': 10,  // P80 até P90
    '49051': 5,   // P90 até P95
    '49052': 4,   // P95 até P99
    '49053': 1,   // Acima de P99
  };
  return percentuais[codigo] || 0;
}

/**
 * Mapeia classes do IBGE para classes sociais tradicionais (A, B, C, D, E)
 */
export function mapearClassesSociais(stats: RendaPerCapitaStats): {
  classeE: { percentual: number; rendaMedio: number; limiteMax: number };
  classeD: { percentual: number; rendaMedio: number; limiteMax: number };
  classeC: { percentual: number; rendaMedio: number; limiteMax: number };
  classeB: { percentual: number; rendaMedio: number; limiteMax: number };
  classeA: { percentual: number; rendaMedio: number; limiteMax: number };
} {
  const classesOrdenadas = stats.classes.sort((a, b) => a.limiteSuperior - b.limiteSuperior);
  
  const agregar = (indices: number[]) => {
    const filtered = indices.map(i => classesOrdenadas[i]).filter(Boolean);
    return {
      percentual: filtered.reduce((sum, c) => sum + c.percentualPopulacao, 0),
      rendaMedio: filtered.length > 0 
        ? filtered.reduce((sum, c) => sum + c.rendimentoMedio * c.percentualPopulacao, 0) / 
          filtered.reduce((sum, c) => sum + c.percentualPopulacao, 0)
        : 0,
      limiteMax: filtered.length > 0 ? filtered[filtered.length - 1].limiteSuperior : 0,
    };
  };
  
  return {
    classeE: agregar([0, 1, 2]),           // Até P20
    classeD: agregar([3, 4]),              // P20-P40
    classeC: agregar([5, 6, 7, 8]),        // P40-P80
    classeB: agregar([9, 10]),             // P80-P95
    classeA: agregar([11, 12]),            // P95+
  };
}

// ============================================================================
// SINCRONIZAÇÃO COM SUPABASE
// ============================================================================

/**
 * Busca dados completos de renda per capita para Brasil e UFs
 */
export async function fetchRendaPerCapitaCompleta(
  startYear: number = 2015,
  endYear: number = 2023
): Promise<{
  brasil: { rendimentoMedio: RendaPerCapitaRecord[]; gini: RendaPerCapitaRecord[] };
  ufs: { rendimentoMedio: RendaPerCapitaRecord[]; gini: RendaPerCapitaRecord[] };
}> {
  const anos = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  ).join(',');
  
  console.log(`[SIDRA-RENDA] Buscando dados completos de ${startYear} a ${endYear}...`);
  
  const [rendimentoBrasil, giniBrasil, rendimentoUF, giniUF] = await Promise.all([
    fetchRendimentoMedioClasses(anos, 'brasil'),
    fetchGini(anos, 'brasil'),
    fetchRendimentoMedioClasses(anos, 'uf'),
    fetchGini(anos, 'uf'),
  ]);
  
  console.log(`[SIDRA-RENDA] Brasil: ${rendimentoBrasil.length} rendimentos, ${giniBrasil.length} gini`);
  console.log(`[SIDRA-RENDA] UFs: ${rendimentoUF.length} rendimentos, ${giniUF.length} gini`);
  
  return {
    brasil: { rendimentoMedio: rendimentoBrasil, gini: giniBrasil },
    ufs: { rendimentoMedio: rendimentoUF, gini: giniUF },
  };
}

/**
 * Sincroniza dados de renda per capita com o Supabase
 * - Rendimento médio Brasil → indicator_values (RENDA_MEDIA)
 * - Gini Brasil → indicator_values (GINI)
 * - Rendimento médio UF → indicator_regional_values (RENDA_MEDIA_UF)
 * - Gini UF → indicator_regional_values (GINI_UF)
 */
export async function syncRendaPerCapitaToSupabase(
  startYear: number = 2015,
  endYear: number = 2023
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  
  try {
    // Buscar todos os dados
    const data = await fetchRendaPerCapitaCompleta(startYear, endYear);
    
    // Filtrar apenas classe "Total" (49040) para rendimento médio
    const rendimentoBrasilTotal = data.brasil.rendimentoMedio.filter(r => r.incomeClassCode === '49040');
    const rendimentoUFTotal = data.ufs.rendimentoMedio.filter(r => r.incomeClassCode === '49040');
    
    console.log(`[SIDRA-RENDA] Rendimento médio Brasil (Total): ${rendimentoBrasilTotal.length} registros`);
    console.log(`[SIDRA-RENDA] Rendimento médio UF (Total): ${rendimentoUFTotal.length} registros`);
    console.log(`[SIDRA-RENDA] Gini Brasil: ${data.brasil.gini.length} registros`);
    console.log(`[SIDRA-RENDA] Gini UF: ${data.ufs.gini.length} registros`);
    
    // 1. Preparar dados nacionais para indicator_values
    const nationalValues: { indicator_id: string; reference_date: string; value: number }[] = [];
    
    // Rendimento médio Brasil
    rendimentoBrasilTotal.forEach(r => {
      nationalValues.push({
        indicator_id: INDICATOR_IDS.RENDA_MEDIA,
        reference_date: `${r.year}-01-01`,
        value: r.value,
      });
    });
    
    // Gini Brasil
    data.brasil.gini.forEach(r => {
      nationalValues.push({
        indicator_id: INDICATOR_IDS.GINI,
        reference_date: `${r.year}-01-01`,
        value: r.value,
      });
    });
    
    console.log(`[SIDRA-RENDA] Total nacional para upsert: ${nationalValues.length} registros`);
    
    // 2. Preparar dados regionais para indicator_regional_values
    const regionalValues: { indicator_id: string; uf_code: number; reference_date: string; value: number }[] = [];
    
    // Rendimento médio UF
    rendimentoUFTotal.forEach(r => {
      const ufCode = parseInt(r.regionCode);
      if (ufCode >= 11 && ufCode <= 53) {
        regionalValues.push({
          indicator_id: INDICATOR_IDS.RENDA_MEDIA_UF,
          uf_code: ufCode,
          reference_date: `${r.year}-01-01`,
          value: r.value,
        });
      }
    });
    
    // Gini UF
    data.ufs.gini.forEach(r => {
      const ufCode = parseInt(r.regionCode);
      if (ufCode >= 11 && ufCode <= 53) {
        regionalValues.push({
          indicator_id: INDICATOR_IDS.GINI_UF,
          uf_code: ufCode,
          reference_date: `${r.year}-01-01`,
          value: r.value,
        });
      }
    });
    
    console.log(`[SIDRA-RENDA] Total regional para upsert: ${regionalValues.length} registros`);
    
    // 3. Upsert dados nacionais em lotes de 500
    const BATCH_SIZE = 500;
    
    for (let i = 0; i < nationalValues.length; i += BATCH_SIZE) {
      const batch = nationalValues.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('indicator_values')
        .upsert(batch, { onConflict: 'indicator_id,reference_date' });
      
      if (error) {
        console.error(`[SIDRA-RENDA] Erro upsert nacional batch ${i}:`, error);
        errors.push(`Nacional batch ${i}: ${error.message}`);
      } else {
        inserted += batch.length;
        console.log(`[SIDRA-RENDA] Upsert nacional batch ${i}: ${batch.length} registros`);
      }
    }
    
    // 4. Upsert dados regionais em lotes de 500
    for (let i = 0; i < regionalValues.length; i += BATCH_SIZE) {
      const batch = regionalValues.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('indicator_regional_values')
        .upsert(batch, { onConflict: 'indicator_id,uf_code,reference_date' });
      
      if (error) {
        console.error(`[SIDRA-RENDA] Erro upsert regional batch ${i}:`, error);
        errors.push(`Regional batch ${i}: ${error.message}`);
      } else {
        inserted += batch.length;
        console.log(`[SIDRA-RENDA] Upsert regional batch ${i}: ${batch.length} registros`);
      }
    }
    
    console.log(`[SIDRA-RENDA] Sincronização completa: ${inserted} registros inseridos, ${errors.length} erros`);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SIDRA-RENDA] Erro na sincronização:', errorMsg);
    errors.push(errorMsg);
  }
  
  return { inserted, errors };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { SIDRA_CONFIG, INDICATOR_IDS };
