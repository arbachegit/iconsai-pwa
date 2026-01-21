// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Technical fields to exclude from variable selection
const EXCLUDED_FIELDS = [
  'id', 'pk', 'fk', 'uuid', 'created_at', 'updated_at', 'deleted_at',
  '@odata.context', '@odata.nextLink', 'metadata', '__metadata',
  'etag', '_etag', 'timestamp', '_timestamp', 'sys_', 'system_',
  'internal_', '_internal', 'ref_', '_ref', 'key_', '_key'
];

// Detect data type from value
function detectDataType(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'float';
  }
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    // Check for date patterns
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return 'date';
    if (/^\d{6}$/.test(value)) return 'period'; // YYYYMM format
    // Check for numeric string
    if (/^-?\d+(\.\d+)?$/.test(value)) return 'numeric_string';
    return 'string';
  }
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'unknown';
}

// Check if field should be excluded
function shouldExcludeField(fieldName: string): boolean {
  const lowerName = fieldName.toLowerCase();
  return EXCLUDED_FIELDS.some(excluded => 
    lowerName === excluded.toLowerCase() ||
    lowerName.startsWith(excluded.toLowerCase()) ||
    lowerName.endsWith(excluded.toLowerCase())
  );
}

// Extract variables from JSON response
function extractVariables(data: unknown): Array<{
  name: string;
  suggestedType: string;
  sampleValue: unknown;
  isExcluded: boolean;
}> {
  const variables: Array<{
    name: string;
    suggestedType: string;
    sampleValue: unknown;
    isExcluded: boolean;
  }> = [];

  // Handle array response (most common for APIs)
  let sampleRecord: Record<string, unknown> | null = null;
  
  // IPEADATA OData format: { value: [...] }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (obj.value && Array.isArray(obj.value) && obj.value.length > 0) {
      sampleRecord = obj.value[0] as Record<string, unknown>;
    }
  }
  
  if (!sampleRecord && Array.isArray(data) && data.length > 0) {
    sampleRecord = data[0] as Record<string, unknown>;
  } else if (data && typeof data === 'object') {
    // Check for nested arrays (IBGE style)
    const obj = data as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0) {
        sampleRecord = (obj[key] as unknown[])[0] as Record<string, unknown>;
        break;
      }
    }
    // If no nested array, use object directly
    if (!sampleRecord) {
      sampleRecord = obj;
    }
  }

  if (sampleRecord && typeof sampleRecord === 'object') {
    for (const [key, value] of Object.entries(sampleRecord)) {
      variables.push({
        name: key,
        suggestedType: detectDataType(value),
        sampleValue: value,
        isExcluded: shouldExcludeField(key)
      });
    }
  }

  return variables;
}

// Detect period range from data
function detectPeriodRange(data: unknown): { start: string | null; end: string | null } {
  const dates: Date[] = [];
  
  const extractDates = (obj: unknown) => {
    if (!obj) return;
    
    // IPEADATA OData format: { value: [...] }
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const record = obj as Record<string, unknown>;
      if (record.value && Array.isArray(record.value)) {
        for (const item of record.value) {
          extractDates(item);
        }
        return;
      }
    }
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        extractDates(item);
      }
      return;
    }
    
    if (typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      for (const [key, value] of Object.entries(record)) {
        const lowerKey = key.toLowerCase();
        
        // Check date-like fields
        if (lowerKey.includes('data') || lowerKey.includes('date') || 
            lowerKey.includes('periodo') || lowerKey.includes('period')) {
        if (typeof value === 'string') {
            // Try parsing YYYYMM format
            if (/^\d{6}$/.test(value)) {
              const year = parseInt(value.substring(0, 4));
              const month = parseInt(value.substring(4, 6)) - 1;
              dates.push(new Date(year, month, 1));
            }
            // Try parsing YYYY-MM-DD format (standard ISO)
            else if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
              dates.push(new Date(value));
            }
            // Try parsing IPEADATA format: "2024-01-01T00:00:00-03:00"
            else if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
              dates.push(new Date(value.substring(0, 10)));
            }
            // Try parsing DD/MM/YYYY format
            else if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) {
              const [day, month, year] = value.split('/');
              dates.push(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
            }
          }
        }
        
        // Recurse into nested objects
        if (typeof value === 'object') {
          extractDates(value);
        }
      }
    }
  };
  
  extractDates(data);
  
  if (dates.length === 0) {
    return { start: null, end: null };
  }
  
  const validDates = dates.filter(d => !isNaN(d.getTime()));
  if (validDates.length === 0) {
    return { start: null, end: null };
  }
  
  validDates.sort((a, b) => a.getTime() - b.getTime());
  
  return {
    start: validDates[0].toISOString().split('T')[0],
    end: validDates[validDates.length - 1].toISOString().split('T')[0]
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stagingId, baseUrl } = await req.json();
    
    if (!baseUrl) {
      throw new Error('URL base é obrigatória');
    }

    console.log(`[TEST-STAGING] Testing API: ${baseUrl}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Make the API call
    const startTime = Date.now();
    let response: Response;
    let data: unknown;
    let httpStatus: number;
    let errorMessage: string | null = null;
    let isFunctional = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Encoding': 'identity',
          'User-Agent': 'KnowYOU-Admin/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeout);
      httpStatus = response.status;
      isFunctional = response.ok;

      if (response.ok) {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text.substring(0, 1000) };
          errorMessage = 'Resposta não é JSON válido';
        }
      } else {
        errorMessage = `HTTP ${httpStatus}: ${response.statusText}`;
      }
    } catch (fetchError) {
      httpStatus = 0;
      errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro de conexão';
      data = null;
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[TEST-STAGING] Response: HTTP ${httpStatus}, Latency: ${latencyMs}ms`);

    // Extract variables and period
    const allVariables = data ? extractVariables(data) : [];
    const periodRange = data ? detectPeriodRange(data) : { start: null, end: null };
    
    // Filter out excluded variables for initial selection
    const selectableVariables = allVariables.filter(v => !v.isExcluded);

    console.log(`[TEST-STAGING] Found ${allVariables.length} variables, ${selectableVariables.length} selectable`);
    console.log(`[TEST-STAGING] Period: ${periodRange.start} to ${periodRange.end}`);

    // Update staging record if stagingId provided
    if (stagingId) {
      const updatePayload: Record<string, unknown> = {
        status: isFunctional ? 'tested' : 'error',
        is_functional: isFunctional,
        http_status: httpStatus,
        error_message: errorMessage,
        all_variables: allVariables,
        discovered_period_start: periodRange.start,
        discovered_period_end: periodRange.end,
        test_timestamp: new Date().toISOString(),
        last_raw_response: Array.isArray(data) ? data.slice(0, 10) : data
      };

      const { error: updateError } = await supabase
        .from('api_test_staging')
        .update(updatePayload)
        .eq('id', stagingId);

      if (updateError) {
        console.error('[TEST-STAGING] Error updating staging record:', updateError);
      }
    }

    return new Response(JSON.stringify({
      success: isFunctional,
      httpStatus,
      latencyMs,
      errorMessage,
      allVariables,
      selectableVariables,
      periodRange,
      recordCount: Array.isArray(data) ? data.length : (data ? 1 : 0)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[TEST-STAGING] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
