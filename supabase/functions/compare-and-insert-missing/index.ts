// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface BCBDataPoint {
  data: string;
  valor: string;
}

interface IBGEResult {
  id: string;
  variavel: string;
  unidade: string;
  resultados: Array<{
    classificacoes: unknown[];
    series: Array<{
      localidade: { id: string; nivel: { id: string; nome: string }; nome: string };
      serie: Record<string, string>;
    }>;
  }>;
}

// Helper to fetch ALL records with pagination (bypassing 1000 row limit)
async function fetchAllExistingDates(
  supabase: any,
  indicatorId: string
): Promise<Set<string>> {
  const PAGE_SIZE = 1000;
  const allDates: string[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('indicator_values')
      .select('reference_date')
      .eq('indicator_id', indicatorId)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allDates.push(...data.map((r: { reference_date: string }) => r.reference_date));
      offset += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  console.log(`[COMPARE-INSERT] Fetched ${allDates.length} existing records (paginated)`);
  return new Set(allDates);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { indicatorId } = await req.json();

    if (!indicatorId) {
      return new Response(
        JSON.stringify({ error: 'indicatorId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[COMPARE-INSERT] Starting comparison for indicator: ${indicatorId}`);

    // 1. Get indicator with API config
    const { data: indicator, error: indicatorError } = await supabase
      .from('economic_indicators')
      .select(`id, name, code, unit, api_id, system_api_registry!inner (id, name, provider, last_raw_response, last_response_at)`)
      .eq('id', indicatorId)
      .single();

    if (indicatorError || !indicator) {
      console.error('[COMPARE-INSERT] Indicator not found:', indicatorError);
      return new Response(
        JSON.stringify({ error: 'Indicator not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiConfig = Array.isArray(indicator.system_api_registry) 
      ? indicator.system_api_registry[0] 
      : indicator.system_api_registry;

    if (!apiConfig?.last_raw_response) {
      return new Response(
        JSON.stringify({ error: 'No raw JSON data available for this indicator', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawJson = apiConfig.last_raw_response;
    const provider = apiConfig.provider;

    console.log(`[COMPARE-INSERT] Provider: ${provider}`);
    console.log(`[COMPARE-INSERT] Last response at: ${apiConfig.last_response_at}`);

    // 2. Parse JSON and extract date-value pairs
    const parsedValues: Array<{ reference_date: string; value: number }> = [];

    if (provider === 'BCB') {
      const bcbData = rawJson as BCBDataPoint[];
      for (const item of bcbData) {
        if (item.data && item.valor) {
          const [day, month, year] = item.data.split('/');
          const refDate = `${year}-${month}-${day}`;
          const value = parseFloat(item.valor.replace(',', '.'));
          if (!isNaN(value)) {
            parsedValues.push({ reference_date: refDate, value });
          }
        }
      }
    } else if (provider === 'IBGE') {
      const ibgeData = rawJson as IBGEResult[];
      if (ibgeData.length > 0 && ibgeData[0].resultados) {
        for (const resultado of ibgeData[0].resultados) {
          for (const serie of resultado.series || []) {
            const serieData = serie.serie || {};
            for (const [period, value] of Object.entries(serieData)) {
              if (!value || value === '-' || value === '...') continue;
              
              let refDate: string;
              if (period.length === 6) {
                refDate = `${period.substring(0, 4)}-${period.substring(4, 6)}-01`;
              } else if (period.length === 4) {
                refDate = `${period}-01-01`;
              } else {
                refDate = `${period}-01-01`;
              }
              
              const numValue = parseFloat(value.replace(',', '.'));
              if (!isNaN(numValue)) {
                parsedValues.push({ reference_date: refDate, value: numValue });
              }
            }
          }
        }
      }
    }

    console.log(`[COMPARE-INSERT] Parsed ${parsedValues.length} values from JSON`);

    if (parsedValues.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          jsonRecords: 0, 
          existingRecords: 0, 
          insertedRecords: 0,
          message: 'No data in JSON to compare'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get ALL existing records from indicator_values (with pagination)
    const existingDates = await fetchAllExistingDates(supabase, indicatorId);
    console.log(`[COMPARE-INSERT] Existing records in DB: ${existingDates.size}`);

    // 4. Find missing records (in JSON but not in DB)
    const missingValues = parsedValues.filter(v => !existingDates.has(v.reference_date));
    console.log(`[COMPARE-INSERT] Missing records to insert: ${missingValues.length}`);

    if (missingValues.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          jsonRecords: parsedValues.length, 
          existingRecords: existingDates.size, 
          insertedRecords: 0,
          message: 'All JSON records already exist in database'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. UPSERT missing records in batches (handles duplicates gracefully)
    const valuesToInsert = missingValues.map(v => ({
      indicator_id: indicatorId,
      reference_date: v.reference_date,
      value: v.value
    }));

    // Process in batches of 500 to avoid timeout
    const BATCH_SIZE = 500;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (let i = 0; i < valuesToInsert.length; i += BATCH_SIZE) {
      const batch = valuesToInsert.slice(i, i + BATCH_SIZE);
      
      // Use upsert with onConflict to skip duplicates gracefully
      const { error: upsertError, count } = await supabase
        .from('indicator_values')
        .upsert(batch, { 
          onConflict: 'indicator_id,reference_date',
          ignoreDuplicates: true,  // Skip existing records instead of updating
          count: 'exact'
        });

      if (upsertError) {
        console.error(`[COMPARE-INSERT] Batch ${Math.floor(i/BATCH_SIZE) + 1} error:`, upsertError);
        // Continue with next batch instead of failing completely
        totalSkipped += batch.length;
      } else {
        totalInserted += count ?? batch.length;
        console.log(`[COMPARE-INSERT] Batch ${Math.floor(i/BATCH_SIZE) + 1}: inserted ${count ?? batch.length} records`);
      }
    }

    console.log(`[COMPARE-INSERT] ✅ Total inserted: ${totalInserted}, skipped: ${totalSkipped}`);

    // 6. Log the operation
    await supabase.from('user_activity_logs').insert({
      user_email: 'system@knowyou.app',
      action_category: 'MANDATORY_INSERT',
      action: `Inserted ${totalInserted} missing records for ${indicator.name}`,
      details: { 
        indicatorId,
        indicatorName: indicator.name,
        jsonRecords: parsedValues.length,
        existingRecords: existingDates.size,
        insertedRecords: totalInserted,
        skippedRecords: totalSkipped
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        jsonRecords: parsedValues.length, 
        existingRecords: existingDates.size, 
        insertedRecords: totalInserted,
        skippedRecords: totalSkipped,
        message: `Inserted ${totalInserted} missing records${totalSkipped > 0 ? `, skipped ${totalSkipped}` : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[COMPARE-INSERT] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
