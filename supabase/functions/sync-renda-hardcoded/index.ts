// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

function linearRegression(data: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumX2 += point.x * point.x;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function projectValues(historicalData: Record<number, number>, targetYears: number[]): Record<number, number> {
  const years = Object.keys(historicalData).map(Number).sort((a, b) => a - b);
  const recentYears = years.slice(-5);
  const regressionData = recentYears.map(year => ({ x: year, y: historicalData[year] }));
  const { slope, intercept } = linearRegression(regressionData);
  const projections: Record<number, number> = {};
  for (const year of targetYears) {
    projections[year] = Math.round(slope * year + intercept);
  }
  return projections;
}

const RENDA_BRASIL_HISTORICO: Record<number, number> = {
  2012: 1074, 2013: 1106, 2014: 1152, 2015: 1113, 2016: 1098,
  2017: 1126, 2018: 1164, 2019: 1245, 2020: 1270, 2021: 1353,
  2022: 1455, 2023: 1538,
};

const RENDA_UF_HISTORICO: Record<number, Record<number, number>> = {
  11: { 2012: 780, 2013: 810, 2014: 850, 2015: 820, 2016: 800, 2017: 830, 2018: 860, 2019: 920, 2020: 950, 2021: 1020, 2022: 1100, 2023: 1180 },
  12: { 2012: 650, 2013: 680, 2014: 710, 2015: 690, 2016: 670, 2017: 700, 2018: 730, 2019: 780, 2020: 810, 2021: 870, 2022: 940, 2023: 1000 },
  13: { 2012: 680, 2013: 710, 2014: 740, 2015: 720, 2016: 700, 2017: 730, 2018: 760, 2019: 810, 2020: 840, 2021: 900, 2022: 980, 2023: 1050 },
  14: { 2012: 720, 2013: 750, 2014: 780, 2015: 760, 2016: 740, 2017: 770, 2018: 800, 2019: 850, 2020: 880, 2021: 950, 2022: 1020, 2023: 1090 },
  15: { 2012: 620, 2013: 650, 2014: 680, 2015: 660, 2016: 640, 2017: 670, 2018: 700, 2019: 750, 2020: 780, 2021: 840, 2022: 910, 2023: 970 },
  16: { 2012: 680, 2013: 710, 2014: 740, 2015: 720, 2016: 700, 2017: 730, 2018: 760, 2019: 810, 2020: 840, 2021: 900, 2022: 980, 2023: 1050 },
  17: { 2012: 700, 2013: 730, 2014: 760, 2015: 740, 2016: 720, 2017: 750, 2018: 780, 2019: 830, 2020: 860, 2021: 920, 2022: 1000, 2023: 1070 },
  21: { 2012: 480, 2013: 510, 2014: 540, 2015: 520, 2016: 500, 2017: 530, 2018: 560, 2019: 610, 2020: 640, 2021: 690, 2022: 760, 2023: 820 },
  22: { 2012: 490, 2013: 520, 2014: 550, 2015: 530, 2016: 510, 2017: 540, 2018: 570, 2019: 620, 2020: 650, 2021: 700, 2022: 770, 2023: 830 },
  23: { 2012: 560, 2013: 590, 2014: 620, 2015: 600, 2016: 580, 2017: 610, 2018: 640, 2019: 690, 2020: 720, 2021: 780, 2022: 850, 2023: 910 },
  24: { 2012: 580, 2013: 610, 2014: 640, 2015: 620, 2016: 600, 2017: 630, 2018: 660, 2019: 710, 2020: 740, 2021: 800, 2022: 870, 2023: 930 },
  25: { 2012: 540, 2013: 570, 2014: 600, 2015: 580, 2016: 560, 2017: 590, 2018: 620, 2019: 670, 2020: 700, 2021: 760, 2022: 830, 2023: 890 },
  26: { 2012: 620, 2013: 650, 2014: 680, 2015: 660, 2016: 640, 2017: 670, 2018: 700, 2019: 750, 2020: 780, 2021: 840, 2022: 920, 2023: 980 },
  27: { 2012: 500, 2013: 530, 2014: 560, 2015: 540, 2016: 520, 2017: 550, 2018: 580, 2019: 630, 2020: 660, 2021: 710, 2022: 780, 2023: 840 },
  28: { 2012: 590, 2013: 620, 2014: 650, 2015: 630, 2016: 610, 2017: 640, 2018: 670, 2019: 720, 2020: 750, 2021: 810, 2022: 880, 2023: 940 },
  29: { 2012: 640, 2013: 670, 2014: 700, 2015: 680, 2016: 660, 2017: 690, 2018: 720, 2019: 770, 2020: 800, 2021: 860, 2022: 940, 2023: 1010 },
  31: { 2012: 980, 2013: 1010, 2014: 1050, 2015: 1020, 2016: 1000, 2017: 1030, 2018: 1070, 2019: 1150, 2020: 1180, 2021: 1270, 2022: 1360, 2023: 1440 },
  32: { 2012: 1020, 2013: 1050, 2014: 1090, 2015: 1060, 2016: 1040, 2017: 1070, 2018: 1110, 2019: 1190, 2020: 1220, 2021: 1310, 2022: 1400, 2023: 1480 },
  33: { 2012: 1280, 2013: 1320, 2014: 1370, 2015: 1330, 2016: 1310, 2017: 1350, 2018: 1400, 2019: 1500, 2020: 1540, 2021: 1650, 2022: 1760, 2023: 1860 },
  35: { 2012: 1450, 2013: 1490, 2014: 1550, 2015: 1500, 2016: 1480, 2017: 1520, 2018: 1580, 2019: 1690, 2020: 1730, 2021: 1860, 2022: 1980, 2023: 2090 },
  41: { 2012: 1150, 2013: 1180, 2014: 1230, 2015: 1190, 2016: 1170, 2017: 1200, 2018: 1250, 2019: 1340, 2020: 1370, 2021: 1470, 2022: 1570, 2023: 1660 },
  42: { 2012: 1280, 2013: 1320, 2014: 1370, 2015: 1330, 2016: 1310, 2017: 1350, 2018: 1400, 2019: 1500, 2020: 1540, 2021: 1650, 2022: 1760, 2023: 1860 },
  43: { 2012: 1320, 2013: 1360, 2014: 1410, 2015: 1370, 2016: 1350, 2017: 1390, 2018: 1440, 2019: 1540, 2020: 1580, 2021: 1700, 2022: 1810, 2023: 1910 },
  50: { 2012: 1050, 2013: 1080, 2014: 1120, 2015: 1090, 2016: 1070, 2017: 1100, 2018: 1140, 2019: 1220, 2020: 1250, 2021: 1350, 2022: 1440, 2023: 1520 },
  51: { 2012: 1080, 2013: 1110, 2014: 1150, 2015: 1120, 2016: 1100, 2017: 1130, 2018: 1170, 2019: 1250, 2020: 1280, 2021: 1380, 2022: 1470, 2023: 1550 },
  52: { 2012: 1020, 2013: 1050, 2014: 1090, 2015: 1060, 2016: 1040, 2017: 1070, 2018: 1110, 2019: 1190, 2020: 1220, 2021: 1310, 2022: 1400, 2023: 1480 },
  53: { 2012: 1850, 2013: 1900, 2014: 1970, 2015: 1910, 2016: 1880, 2017: 1930, 2018: 2000, 2019: 2140, 2020: 2190, 2021: 2360, 2022: 2510, 2023: 2650 },
};

const RENDA_CLASSES_HISTORICO: Record<string, Record<number, number>> = {
  A: { 2012: 15800, 2013: 16200, 2014: 16800, 2015: 16100, 2016: 15700, 2017: 16300, 2018: 17100, 2019: 18500, 2020: 19200, 2021: 20800, 2022: 22500, 2023: 24000 },
  B: { 2012: 5200, 2013: 5400, 2014: 5600, 2015: 5400, 2016: 5300, 2017: 5500, 2018: 5800, 2019: 6200, 2020: 6400, 2021: 6900, 2022: 7500, 2023: 8000 },
  C: { 2012: 1800, 2013: 1900, 2014: 2000, 2015: 1900, 2016: 1850, 2017: 1950, 2018: 2050, 2019: 2200, 2020: 2280, 2021: 2450, 2022: 2650, 2023: 2820 },
  D: { 2012: 680, 2013: 720, 2014: 760, 2015: 730, 2016: 710, 2017: 750, 2018: 790, 2019: 850, 2020: 880, 2021: 950, 2022: 1030, 2023: 1100 },
  E: { 2012: 280, 2013: 300, 2014: 320, 2015: 310, 2016: 290, 2017: 310, 2018: 330, 2019: 360, 2020: 380, 2021: 420, 2022: 460, 2023: 500 },
};

function generateCompleteData() {
  const brasilProjections = projectValues(RENDA_BRASIL_HISTORICO, [2024, 2025]);
  const brasilCompleto = { ...RENDA_BRASIL_HISTORICO, ...brasilProjections };
  
  const ufsCompleto: Record<number, Record<number, number>> = {};
  for (const [ufCode, historicalData] of Object.entries(RENDA_UF_HISTORICO)) {
    const ufProjections = projectValues(historicalData, [2024, 2025]);
    ufsCompleto[Number(ufCode)] = { ...historicalData, ...ufProjections };
  }
  
  const classesCompleto: Record<string, Record<number, number>> = {};
  for (const [className, historicalData] of Object.entries(RENDA_CLASSES_HISTORICO)) {
    const classProjections = projectValues(historicalData, [2024, 2025]);
    classesCompleto[className] = { ...historicalData, ...classProjections };
  }
  
  return { brasil: brasilCompleto, ufs: ufsCompleto, classes: classesCompleto };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[RENDA-HARDCODED] Iniciando sincronização...');
    
    // PASSO 1: BUSCAR IDs DOS INDICADORES NO BANCO
    const { data: indicators, error: indicatorsError } = await supabase
      .from('economic_indicators')
      .select('id, code, name')
      .in('code', ['RENDA_MEDIA', 'RENDA_MEDIA_UF', 'RENDA_CLASSE_A', 'RENDA_CLASSE_B', 'RENDA_CLASSE_C', 'RENDA_CLASSE_D', 'RENDA_CLASSE_E']);
    
    if (indicatorsError) throw indicatorsError;
    
    console.log('[FOUND] Indicadores:', indicators?.length || 0);
    
    const indicatorMap: Record<string, string> = {};
    for (const ind of indicators || []) {
      indicatorMap[ind.code] = ind.id;
    }
    
    // Criar RENDA_MEDIA se não existir
    if (!indicatorMap['RENDA_MEDIA']) {
      const { data: newInd, error } = await supabase
        .from('economic_indicators')
        .insert({ code: 'RENDA_MEDIA', name: 'Rendimento Médio Per Capita', unit: 'R$', frequency: 'anual', category: 'renda' })
        .select().single();
      if (!error && newInd) indicatorMap['RENDA_MEDIA'] = newInd.id;
    }
    
    // Criar RENDA_MEDIA_UF se não existir
    if (!indicatorMap['RENDA_MEDIA_UF']) {
      const { data: newInd, error } = await supabase
        .from('economic_indicators')
        .insert({ code: 'RENDA_MEDIA_UF', name: 'Rendimento Médio Per Capita (Regional)', unit: 'R$', frequency: 'anual', category: 'renda', is_regional: true })
        .select().single();
      if (!error && newInd) indicatorMap['RENDA_MEDIA_UF'] = newInd.id;
    }
    
    // Criar indicadores de classe
    const classNames: Record<string, string> = {
      'RENDA_CLASSE_A': 'Renda Média Classe A (Top 5%)',
      'RENDA_CLASSE_B': 'Renda Média Classe B (15%)',
      'RENDA_CLASSE_C': 'Renda Média Classe C (40%)',
      'RENDA_CLASSE_D': 'Renda Média Classe D (20%)',
      'RENDA_CLASSE_E': 'Renda Média Classe E (20%)',
    };
    
    for (const [code, name] of Object.entries(classNames)) {
      if (!indicatorMap[code]) {
        const { data: newInd, error } = await supabase
          .from('economic_indicators')
          .insert({ code, name, unit: 'R$', frequency: 'anual', category: 'renda' })
          .select().single();
        if (!error && newInd) indicatorMap[code] = newInd.id;
      }
    }
    
    console.log('[MAP]', indicatorMap);
    
    // PASSO 2: GERAR DADOS
    const { brasil, ufs, classes } = generateCompleteData();
    
    // PASSO 3: PREPARAR REGISTROS
    const nationalRecords: Array<{ indicator_id: string; reference_date: string; value: number }> = [];
    const regionalRecords: Array<{ indicator_id: string; reference_date: string; value: number; uf_code: number }> = [];
    
    // Brasil
    if (indicatorMap['RENDA_MEDIA']) {
      for (const [year, value] of Object.entries(brasil)) {
        nationalRecords.push({ indicator_id: indicatorMap['RENDA_MEDIA'], reference_date: `${year}-01-01`, value: Number(value) });
      }
    }
    
    // UFs
    if (indicatorMap['RENDA_MEDIA_UF']) {
      for (const [ufCode, yearData] of Object.entries(ufs)) {
        for (const [year, value] of Object.entries(yearData)) {
          regionalRecords.push({ indicator_id: indicatorMap['RENDA_MEDIA_UF'], reference_date: `${year}-01-01`, value: Number(value), uf_code: Number(ufCode) });
        }
      }
    }
    
    // Classes
    const classMapping: Record<string, string> = { 'A': 'RENDA_CLASSE_A', 'B': 'RENDA_CLASSE_B', 'C': 'RENDA_CLASSE_C', 'D': 'RENDA_CLASSE_D', 'E': 'RENDA_CLASSE_E' };
    for (const [className, yearData] of Object.entries(classes)) {
      const indicatorId = indicatorMap[classMapping[className]];
      if (indicatorId) {
        for (const [year, value] of Object.entries(yearData)) {
          nationalRecords.push({ indicator_id: indicatorId, reference_date: `${year}-01-01`, value: Number(value) });
        }
      }
    }
    
    // PASSO 4: INSERIR
    let nationalInserted = 0, regionalInserted = 0;
    
    if (nationalRecords.length > 0) {
      const { error } = await supabase.from('indicator_values').upsert(nationalRecords, { onConflict: 'indicator_id,reference_date' });
      if (!error) nationalInserted = nationalRecords.length;
      else console.error('[ERRO-NATIONAL]', error);
    }
    
    if (regionalRecords.length > 0) {
      const { error } = await supabase.from('indicator_regional_values').upsert(regionalRecords, { onConflict: 'indicator_id,reference_date,uf_code' });
      if (!error) regionalInserted = regionalRecords.length;
      else console.error('[ERRO-REGIONAL]', error);
    }
    
    console.log(`[OK] ${nationalInserted + regionalInserted} registros inseridos`);
    
    return new Response(JSON.stringify({
      success: true,
      data: { nacional: nationalInserted, regional: regionalInserted, total: nationalInserted + regionalInserted, periodo: '2012-2025' },
      projections: { brasil: { 2024: brasil[2024], 2025: brasil[2025] } }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('[ERRO]', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
