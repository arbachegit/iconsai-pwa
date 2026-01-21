// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface QueryRequest {
  action: 'list' | 'data' | 'regional' | 'compare' | 'search';
  indicatorCode?: string;
  indicatorName?: string;
  indicatorCodes?: string[];
  ufSigla?: string;
  ufCode?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  searchTerm?: string;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: QueryRequest = await req.json();
    const { action, indicatorCode, indicatorName, indicatorCodes, ufSigla, ufCode, startDate, endDate, limit = 100, searchTerm } = body;

    console.log(`[query-indicators] Action: ${action}, Code: ${indicatorCode}, Codes: ${indicatorCodes?.join(',')}, UF: ${ufSigla || ufCode}`);

    // Map UF siglas to codes
    const ufSiglaToCode: Record<string, number> = {
      'AC': 12, 'AL': 27, 'AP': 16, 'AM': 13, 'BA': 29, 'CE': 23, 'DF': 53,
      'ES': 32, 'GO': 52, 'MA': 21, 'MT': 51, 'MS': 50, 'MG': 31, 'PA': 15,
      'PB': 25, 'PR': 41, 'PE': 26, 'PI': 22, 'RJ': 33, 'RN': 24, 'RS': 43,
      'RO': 11, 'RR': 14, 'SC': 42, 'SP': 35, 'SE': 28, 'TO': 17
    };

    const ufCodeToName: Record<number, string> = {
      11: 'Rondônia', 12: 'Acre', 13: 'Amazonas', 14: 'Roraima', 15: 'Pará',
      16: 'Amapá', 17: 'Tocantins', 21: 'Maranhão', 22: 'Piauí', 23: 'Ceará',
      24: 'Rio Grande do Norte', 25: 'Paraíba', 26: 'Pernambuco', 27: 'Alagoas',
      28: 'Sergipe', 29: 'Bahia', 31: 'Minas Gerais', 32: 'Espírito Santo',
      33: 'Rio de Janeiro', 35: 'São Paulo', 41: 'Paraná', 42: 'Santa Catarina',
      43: 'Rio Grande do Sul', 50: 'Mato Grosso do Sul', 51: 'Mato Grosso',
      52: 'Goiás', 53: 'Distrito Federal'
    };

    switch (action) {
      case 'list': {
        // List all available indicators with metadata
        const { data: indicators, error } = await supabase
          .from('economic_indicators')
          .select('id, code, name, category, frequency, unit, is_regional')
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;

        // Group by category
        const grouped: Record<string, any[]> = {};
        indicators?.forEach(ind => {
          const cat = ind.category || 'outros';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(ind);
        });

        return new Response(JSON.stringify({ 
          success: true, 
          indicators,
          grouped,
          total: indicators?.length || 0
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case 'search': {
        // Search indicators by name or code
        if (!searchTerm) {
          return new Response(JSON.stringify({ error: 'searchTerm required' }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: indicators, error } = await supabase
          .from('economic_indicators')
          .select('id, code, name, category, frequency, unit, is_regional')
          .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
          .limit(20);

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true, 
          indicators,
          total: indicators?.length || 0
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case 'data': {
        // Get data for a specific indicator (national level)
        if (!indicatorCode && !indicatorName) {
          return new Response(JSON.stringify({ error: 'indicatorCode or indicatorName required' }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // First, find the indicator
        let indicatorQuery = supabase
          .from('economic_indicators')
          .select('id, code, name, category, frequency, unit, is_regional');
        
        if (indicatorCode) {
          indicatorQuery = indicatorQuery.eq('code', indicatorCode);
        } else if (indicatorName) {
          indicatorQuery = indicatorQuery.ilike('name', `%${indicatorName}%`);
        }

        const { data: indicator, error: indError } = await indicatorQuery.single();
        if (indError || !indicator) {
          // Try fuzzy search
          const { data: fuzzyIndicators } = await supabase
            .from('economic_indicators')
            .select('id, code, name, category, frequency, unit, is_regional')
            .or(`name.ilike.%${indicatorCode || indicatorName}%,code.ilike.%${indicatorCode || indicatorName}%`)
            .limit(1)
            .single();
          
          if (!fuzzyIndicators) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: `Indicador não encontrado: ${indicatorCode || indicatorName}` 
            }), {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          // Use fuzzy match
          Object.assign(indicator || {}, fuzzyIndicators);
        }

        // Build values query
        let valuesQuery = supabase
          .from('indicator_values')
          .select('reference_date, value')
          .eq('indicator_id', indicator!.id)
          .order('reference_date', { ascending: false })
          .limit(limit);

        if (startDate) valuesQuery = valuesQuery.gte('reference_date', startDate);
        if (endDate) valuesQuery = valuesQuery.lte('reference_date', endDate);

        const { data: values, error: valError } = await valuesQuery;
        if (valError) throw valError;

        // Calculate basic statistics
        const numericValues = values?.map(v => v.value).filter(v => v != null) || [];
        const stats = numericValues.length > 0 ? {
          count: numericValues.length,
          mean: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          latest: values?.[0]?.value,
          latestDate: values?.[0]?.reference_date,
          oldest: values?.[values.length - 1]?.value,
          oldestDate: values?.[values.length - 1]?.reference_date,
        } : null;

        return new Response(JSON.stringify({ 
          success: true, 
          indicator,
          values: values?.reverse(), // Chronological order
          statistics: stats
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case 'regional': {
        // Get regional data for a specific indicator and UF
        if (!indicatorCode && !indicatorName) {
          return new Response(JSON.stringify({ error: 'indicatorCode or indicatorName required' }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Find the indicator
        let indicatorQuery = supabase
          .from('economic_indicators')
          .select('id, code, name, category, frequency, unit, is_regional');
        
        if (indicatorCode) {
          indicatorQuery = indicatorQuery.eq('code', indicatorCode);
        } else {
          indicatorQuery = indicatorQuery.ilike('name', `%${indicatorName}%`);
        }

        const { data: indicator, error: indError } = await indicatorQuery.single();
        if (indError || !indicator) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Indicador regional não encontrado: ${indicatorCode || indicatorName}` 
          }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Determine UF code
        let targetUfCode = ufCode;
        if (ufSigla && !targetUfCode) {
          targetUfCode = ufSiglaToCode[ufSigla.toUpperCase()];
        }

        // Build regional values query
        let valuesQuery = supabase
          .from('indicator_regional_values')
          .select('reference_date, value, uf_code')
          .eq('indicator_id', indicator.id)
          .order('reference_date', { ascending: false });

        if (targetUfCode) {
          valuesQuery = valuesQuery.eq('uf_code', targetUfCode);
        }
        
        valuesQuery = valuesQuery.limit(limit);

        if (startDate) valuesQuery = valuesQuery.gte('reference_date', startDate);
        if (endDate) valuesQuery = valuesQuery.lte('reference_date', endDate);

        const { data: values, error: valError } = await valuesQuery;
        if (valError) throw valError;

        // Add UF names to values
        const enrichedValues = values?.map(v => ({
          ...v,
          uf_name: ufCodeToName[v.uf_code] || `UF ${v.uf_code}`,
          uf_sigla: Object.entries(ufSiglaToCode).find(([_, code]) => code === v.uf_code)?.[0] || ''
        }));

        // If specific UF requested, calculate statistics
        let stats = null;
        if (targetUfCode && values && values.length > 0) {
          const numericValues = values.map(v => v.value).filter(v => v != null);
          stats = {
            uf_code: targetUfCode,
            uf_name: ufCodeToName[targetUfCode],
            uf_sigla: ufSigla?.toUpperCase() || Object.entries(ufSiglaToCode).find(([_, code]) => code === targetUfCode)?.[0],
            count: numericValues.length,
            mean: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            latest: values[0]?.value,
            latestDate: values[0]?.reference_date,
          };
        }

        return new Response(JSON.stringify({ 
          success: true, 
          indicator,
          values: enrichedValues?.reverse(),
          statistics: stats,
          requestedUF: targetUfCode ? { code: targetUfCode, sigla: ufSigla, name: ufCodeToName[targetUfCode] } : null
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case 'compare': {
        // Compare multiple indicators
        if (!indicatorCodes || indicatorCodes.length === 0) {
          return new Response(JSON.stringify({ error: 'indicatorCodes array required' }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const results: any[] = [];

        for (const code of indicatorCodes.slice(0, 5)) { // Max 5 indicators
          // Find indicator
          const { data: indicator } = await supabase
            .from('economic_indicators')
            .select('id, code, name, category, frequency, unit, is_regional')
            .or(`code.eq.${code},name.ilike.%${code}%`)
            .limit(1)
            .single();

          if (!indicator) {
            results.push({ code, error: 'not_found' });
            continue;
          }

          // Get values
          let valuesQuery = supabase
            .from('indicator_values')
            .select('reference_date, value')
            .eq('indicator_id', indicator.id)
            .order('reference_date', { ascending: false })
            .limit(limit);

          if (startDate) valuesQuery = valuesQuery.gte('reference_date', startDate);
          if (endDate) valuesQuery = valuesQuery.lte('reference_date', endDate);

          const { data: values } = await valuesQuery;

          const numericValues = values?.map(v => v.value).filter(v => v != null) || [];
          const stats = numericValues.length > 0 ? {
            count: numericValues.length,
            mean: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            latest: values?.[0]?.value,
            latestDate: values?.[0]?.reference_date,
          } : null;

          results.push({
            indicator,
            values: values?.reverse(),
            statistics: stats
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          comparisons: results,
          total: results.length
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    console.error("[query-indicators] Error:", e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
