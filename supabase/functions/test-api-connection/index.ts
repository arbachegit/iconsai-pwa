// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface TestResult {
  success: boolean;
  latencyMs: number;
  statusCode: number | null;
  statusText: string;
  contentType: string | null;
  preview: any[] | null;
  fullData: any[] | null; // Full data for storage (up to 500 records)
  error: string | null;
  timeout: boolean;
  syncMetadata: SyncMetadata | null;
}

interface SyncMetadata {
  extracted_count: number;
  period_start: string | null;
  period_end: string | null;
  fields_detected: string[];
  last_record_value: string | null;
  fetch_timestamp: string;
}

// Maximum records to store in last_raw_response (to avoid storage issues)
const MAX_RECORDS_FOR_STORAGE = 500;

// Invalid value indicators used by SIDRA/IBGE APIs
const SIDRA_INVALID_VALUES = ['...', '..', '-', 'X', 'null', '', null, undefined];

/**
 * INTELLIGENT SAMPLING: Prioritize valid records in the sample
 * 
 * Problem: SIDRA data is ordered by UF code (11=RO, 12=AC...).
 * States like Rondônia and Acre often have NO valid data for PMC indicators,
 * so taking the first 500 records gives a non-representative sample.
 * 
 * Solution: Sample valid records first, then fill with invalid ones to show proportions.
 */
function sampleForStorage(data: unknown[], maxRecords: number = MAX_RECORDS_FOR_STORAGE): unknown[] {
  if (!Array.isArray(data) || data.length === 0) return data || [];
  if (data.length <= maxRecords) return data;
  
  // Check if this looks like SIDRA flat format (has V field)
  const hasSidraFormat = data.length > 1 && data[1] && typeof data[1] === 'object' && 'V' in (data[1] as object);
  
  if (!hasSidraFormat) {
    // Not SIDRA format - just take first N records
    return data.slice(0, maxRecords);
  }
  
  // SIDRA format: first row is header, rest are data
  const header = data[0];
  const records = data.slice(1);
  
  // Separate valid and invalid records
  const validRecords: unknown[] = [];
  const invalidRecords: unknown[] = [];
  
  for (const row of records) {
    const r = row as { V?: string };
    const v = r.V;
    if (v && !SIDRA_INVALID_VALUES.includes(v)) {
      validRecords.push(row);
    } else {
      invalidRecords.push(row);
    }
  }
  
  console.log(`[INTELLIGENT-SAMPLING] Total: ${records.length}, Valid: ${validRecords.length}, Invalid: ${invalidRecords.length}`);
  
  // Build sample: prioritize valid records, then add some invalid to show distribution
  const sample: unknown[] = [];
  const targetSampleSize = maxRecords - 1; // -1 for header
  
  if (validRecords.length > 0) {
    if (validRecords.length <= targetSampleSize * 0.9) {
      // If valid records are less than 90% of sample, include all valid + some invalid
      sample.push(...validRecords);
      const remainingSlots = targetSampleSize - sample.length;
      if (remainingSlots > 0 && invalidRecords.length > 0) {
        // Sample invalid records evenly across the dataset
        const step = Math.max(1, Math.floor(invalidRecords.length / remainingSlots));
        for (let i = 0; i < invalidRecords.length && sample.length < targetSampleSize; i += step) {
          sample.push(invalidRecords[i]);
        }
      }
    } else {
      // Valid records > 90% of sample - sample them evenly for distribution
      const step = Math.max(1, Math.floor(validRecords.length / (targetSampleSize * 0.9)));
      for (let i = 0; i < validRecords.length && sample.length < targetSampleSize * 0.9; i += step) {
        sample.push(validRecords[i]);
      }
      // Add some invalid to show they exist
      const remainingSlots = targetSampleSize - sample.length;
      if (remainingSlots > 0 && invalidRecords.length > 0) {
        const invalidStep = Math.max(1, Math.floor(invalidRecords.length / remainingSlots));
        for (let i = 0; i < invalidRecords.length && sample.length < targetSampleSize; i += invalidStep) {
          sample.push(invalidRecords[i]);
        }
      }
    }
  } else {
    // No valid records - sample invalid records evenly
    const step = Math.max(1, Math.floor(invalidRecords.length / targetSampleSize));
    for (let i = 0; i < invalidRecords.length && sample.length < targetSampleSize; i += step) {
      sample.push(invalidRecords[i]);
    }
  }
  
  console.log(`[INTELLIGENT-SAMPLING] Sample size: ${sample.length + 1} (with header), valid in sample: ${sample.filter(r => {
    const row = r as { V?: string };
    return row.V && !SIDRA_INVALID_VALUES.includes(row.V);
  }).length}`);
  
  return [header, ...sample];
}

interface IBGEResult {
  id: string;
  variavel: string;
  resultados: Array<{
    series: Array<{
      localidade: { id: string; nome: string };
      serie: Record<string, string>;
    }>;
  }>;
}

// ========== V7.2: HTTP/2 RESILIENCE PROTOCOL ==========

// Log detailed HTTP/2 error diagnostics
function logHTTP2Error(error: Error, provider: string, url: string): void {
  const isHTTP2 = error.message?.includes('http2');
  const isStream = error.message?.includes('stream error');
  const isIPv6 = url.includes('[') || error.message?.includes('2600:') || error.message?.includes('IPv6');
  
  console.error(`[HTTP2-DIAGNOSTIC] ================================`);
  console.error(`[HTTP2-DIAGNOSTIC] Provider: ${provider}`);
  console.error(`[HTTP2-DIAGNOSTIC] URL: ${url.substring(0, 100)}...`);
  console.error(`[HTTP2-DIAGNOSTIC] Error Type: ${isHTTP2 ? 'HTTP/2 Protocol' : 'Other'}`);
  console.error(`[HTTP2-DIAGNOSTIC] Stream Error: ${isStream}`);
  console.error(`[HTTP2-DIAGNOSTIC] IPv6 Connection: ${isIPv6}`);
  console.error(`[HTTP2-DIAGNOSTIC] Full Message: ${error.message}`);
  console.error(`[HTTP2-DIAGNOSTIC] ================================`);
}

// Fetch with HTTP/2 resilience - retry with exponential backoff
async function fetchWithHTTP2Resilience(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  providerName: string = 'Unknown'
): Promise<Response> {
  const delays = [3000, 6000, 12000]; // 3s, 6s, 12s backoff
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[HTTP2-RESILIENCE] [${providerName}] Attempt ${attempt + 1}/${maxRetries}`);
      
      // Headers optimized for maximum HTTP/2 compatibility
      const resilientHeaders: Record<string, string> = {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate', // No brotli to avoid issues
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        ...(options.headers as Record<string, string> || {})
      };
      
      // Progressive timeout: 30s, 45s, 60s
      const timeout = 30000 + (attempt * 15000);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        headers: resilientHeaders,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`[HTTP2-RESILIENCE] [${providerName}] Success: HTTP ${response.status} (timeout was ${timeout}ms)`);
      return response;
      
    } catch (error) {
      const err = error as Error;
      const isHTTP2Error = err.message?.includes('http2 error') || 
                           err.message?.includes('stream error');
      
      console.error(`[HTTP2-RESILIENCE] [${providerName}] Attempt ${attempt + 1} failed:`);
      console.error(`[HTTP2-RESILIENCE] [${providerName}] Error: ${err.message}`);
      console.error(`[HTTP2-RESILIENCE] [${providerName}] Is HTTP/2 error: ${isHTTP2Error}`);
      
      // Log detailed HTTP/2 diagnostics
      logHTTP2Error(err, providerName, url);
      
      if (attempt < maxRetries - 1) {
        const delay = delays[attempt] || delays[delays.length - 1];
        console.log(`[HTTP2-RESILIENCE] [${providerName}] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`All ${maxRetries} attempts failed for ${providerName}`);
}

// ========== END V7.2 HTTP/2 RESILIENCE ==========

// Format date as DD/MM/YYYY for BCB API
function formatDateBCB(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Convert BCB date DD/MM/YYYY to ISO YYYY-MM-DD
function bcbDateToISO(bcbDate: string): string {
  const [day, month, year] = bcbDate.split('/');
  return `${year}-${month}-${day}`;
}

// Generate ANNUAL chunks for IBGE API (avoids HTTP 500 errors from server overload)
function generateIBGEYearChunks(startDate: string, endDate: string): Array<{ start: string; end: string; periodFormat: string }> {
  const chunks: Array<{ start: string; end: string; periodFormat: string }> = [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let chunkStart = new Date(start.getFullYear(), 0, 1);
  
  while (chunkStart <= end) {
    // ANNUAL chunks (1 year each) to prevent HTTP 500 from IBGE server overload
    const chunkEnd = new Date(chunkStart.getFullYear(), 11, 31);
    const actualEnd = chunkEnd > end ? end : chunkEnd;
    
    const startYYYYMM = `${chunkStart.getFullYear()}${String(chunkStart.getMonth() + 1).padStart(2, '0')}`;
    const endYYYYMM = `${actualEnd.getFullYear()}${String(actualEnd.getMonth() + 1).padStart(2, '0')}`;
    
    chunks.push({
      start: chunkStart.toISOString().split('T')[0],
      end: actualEnd.toISOString().split('T')[0],
      periodFormat: `${startYYYYMM}-${endYYYYMM}`
    });
    
    chunkStart = new Date(chunkStart.getFullYear() + 1, 0, 1);
  }
  
  console.log(`[TEST-API] Generated ${chunks.length} IBGE ANNUAL chunks from ${startDate} to ${endDate}`);
  return chunks;
}

// Fetch IBGE data with ANNUAL chunking to avoid HTTP 500 from server overload
async function fetchIBGEWithChunking(
  baseUrl: string,
  startDate: string,
  endDate: string,
  headers: Record<string, string>
): Promise<{ success: boolean; data: any[]; error: string | null; latencyMs: number; statusCode: number | null }> {
  const chunks = generateIBGEYearChunks(startDate, endDate);
  const allData: any[] = [];
  let totalLatency = 0;
  let lastStatusCode: number | null = null;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkUrl = baseUrl.replace('{PERIOD}', chunk.periodFormat);
    
    console.log(`[TEST-API] IBGE chunk ${i + 1}/${chunks.length}: ${chunk.periodFormat}`);
    
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout per chunk (increased for resilience)
      
      const response = await fetch(chunkUrl, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      totalLatency += performance.now() - startTime;
      lastStatusCode = response.status;
      
      if (!response.ok) {
        console.error(`[TEST-API] IBGE chunk ${i + 1} failed: HTTP ${response.status}`);
        // Continue with other chunks even if one fails
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay between chunks
          continue;
        }
        if (allData.length === 0) {
          return { success: false, data: [], error: `HTTP ${response.status}`, latencyMs: totalLatency, statusCode: lastStatusCode };
        }
        break;
      }
      
      const text = await response.text();
      const data = JSON.parse(text) as IBGEResult[];
      
      if (Array.isArray(data) && data.length > 0) {
        // Merge series data from chunks
        if (allData.length === 0) {
          allData.push(...data);
        } else {
          // Merge series data into existing structure
          for (const item of data) {
            const existing = allData.find(d => d.id === item.id);
            if (existing && existing.resultados?.[0]?.series?.[0]?.serie) {
              const newSeries = item.resultados?.[0]?.series?.[0]?.serie || {};
              Object.assign(existing.resultados[0].series[0].serie, newSeries);
            }
          }
        }
      }
      
      console.log(`[TEST-API] IBGE chunk ${i + 1} success: ${data?.[0]?.resultados?.[0]?.series?.[0]?.serie ? Object.keys(data[0].resultados[0].series[0].serie).length : 0} periods`);
      
      // Delay between chunks to avoid rate limiting (1.5s for resilience)
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
    } catch (error) {
      console.error(`[TEST-API] IBGE chunk ${i + 1} error:`, error);
      totalLatency += performance.now() - startTime;
      
      if (allData.length === 0 && i === chunks.length - 1) {
        return { success: false, data: [], error: String(error), latencyMs: totalLatency, statusCode: lastStatusCode };
      }
    }
  }
  
  return { 
    success: allData.length > 0, 
    data: allData, 
    error: null, 
    latencyMs: Math.round(totalLatency),
    statusCode: lastStatusCode
  };
}

// Analyze API response and extract metadata
function analyzeApiResponse(data: unknown, provider: string): SyncMetadata {
  const metadata: SyncMetadata = {
    extracted_count: 0,
    period_start: null,
    period_end: null,
    fields_detected: [],
    last_record_value: null,
    fetch_timestamp: new Date().toISOString()
  };

  if (!data) return metadata;

  // Handle array responses (BCB format)
  if (Array.isArray(data) && data.length > 0) {
    metadata.extracted_count = data.length;
    metadata.fields_detected = Object.keys(data[0]);

    // BCB format: {data: "DD/MM/YYYY", valor: "X.XX"}
    if (provider === 'BCB' && data[0].data && data[0].valor) {
      const dates = data.map(d => d.data).sort((a, b) => {
        const dateA = new Date(bcbDateToISO(a));
        const dateB = new Date(bcbDateToISO(b));
        return dateA.getTime() - dateB.getTime();
      });
      
      metadata.period_start = bcbDateToISO(dates[0]);
      metadata.period_end = bcbDateToISO(dates[dates.length - 1]);
      metadata.last_record_value = data[data.length - 1].valor;
    }
    
    // SIDRA format: flat array with DxC fields - used by demographic indicators
    // First row is header, data rows may have V field with values like ".." for unavailable
    // CRITICAL: Extract period from ALL rows BEFORE filtering for valid values
    if (provider === 'IBGE' && data[0].D3C !== undefined) {
      // Skip first row (header row with field descriptions)
      const allRows = data.slice(1);
      
      // Find the period field dynamically - look for DxC field containing year-like values (4-6 digits)
      // Priority: D3C (most common), D4C, D5C for complex tables with more dimensions
      const findPeriodField = (rows: any[]): string | null => {
        const candidates = ['D3C', 'D4C', 'D5C'];
        for (const field of candidates) {
          if (rows[0]?.[field]) {
            const value = String(rows[0][field]);
            // Check if it looks like a year (4 digits) or year-month (6 digits)
            if (/^\d{4,6}$/.test(value)) {
              return field;
            }
          }
        }
        return null;
      };
      
      const periodField = findPeriodField(allRows);
      console.log(`[TEST-API] SIDRA detected period field: ${periodField} from ${allRows.length} rows`);
      
      // Extract periods from ALL rows (not just valid V values) to ensure period detection
      if (periodField && allRows.length > 0) {
        const allPeriods = [...new Set(allRows.map((row: any) => row[periodField]))]
          .filter(p => p && /^\d{4,6}$/.test(String(p)))
          .sort() as string[];
        
        const formatPeriod = (p: string) => {
          if (p.length === 4) return `${p}-01-01`; // Annual: YYYY
          if (p.length === 6) return `${p.substring(0, 4)}-${p.substring(4, 6)}-01`; // Monthly: YYYYMM
          return `${p}-01-01`;
        };
        
        if (allPeriods.length > 0) {
          metadata.period_start = formatPeriod(allPeriods[0]);
          metadata.period_end = formatPeriod(allPeriods[allPeriods.length - 1]);
          console.log(`[TEST-API] SIDRA period extracted: ${metadata.period_start} to ${metadata.period_end}`);
        }
      }
      
      // Now filter for valid values to get count and last value
      const validRows = allRows.filter((row: any) => row.V && row.V !== '..' && row.V !== '-');
      metadata.extracted_count = allRows.length; // Report total rows, not just valid
      
      if (validRows.length > 0) {
        metadata.last_record_value = String(validRows[validRows.length - 1].V);
      }
      
      console.log(`[TEST-API] SIDRA parsed: ${allRows.length} total rows, ${validRows.length} with valid values, period ${metadata.period_start} to ${metadata.period_end}`);
    }
    
    // IBGE nested format detection (aggregated results)
    else if (provider === 'IBGE' && data[0].resultados) {
      const resultados = data[0].resultados;
      if (resultados.length > 0 && resultados[0].series?.length > 0) {
        const serie = resultados[0].series[0].serie || {};
        const periods = Object.keys(serie).filter(k => serie[k] && serie[k] !== '-');
        
        metadata.extracted_count = periods.length;
        metadata.fields_detected = ['D2C', 'V', 'variavel', 'unidade'];
        
        if (periods.length > 0) {
          periods.sort();
          const formatPeriod = (p: string) => {
            if (p.length === 6) return `${p.substring(0, 4)}-${p.substring(4, 6)}-01`;
            return `${p}-01-01`;
          };
          metadata.period_start = formatPeriod(periods[0]);
          metadata.period_end = formatPeriod(periods[periods.length - 1]);
          metadata.last_record_value = serie[periods[periods.length - 1]];
        }
      }
    }
    
    // WorldBank format: [metadata, dataArray] where dataArray contains {date: "YYYY", value: number|null}
    if (provider === 'WorldBank' && data.length >= 2) {
      const dataArray = data[1];
      if (Array.isArray(dataArray) && dataArray.length > 0) {
        const validItems = dataArray.filter((item: any) => item.value !== null && item.value !== undefined);
        metadata.extracted_count = validItems.length;
        metadata.fields_detected = Object.keys(dataArray[0]);
        
        if (validItems.length > 0) {
          // Sort by date (YYYY format)
          const dates = validItems.map((item: any) => item.date).sort();
          metadata.period_start = `${dates[0]}-01-01`;
          metadata.period_end = `${dates[dates.length - 1]}-01-01`;
          metadata.last_record_value = String(validItems[validItems.length - 1].value);
          
          console.log(`[TEST-API] WorldBank parsed: ${validItems.length} records, period ${dates[0]} to ${dates[dates.length - 1]}`);
        }
      }
    }
  }
  
  // IPEADATA OData format: { value: [{SERCODIGO, VALDATA, VALVALOR, ...}] }
  if (!Array.isArray(data) && typeof data === 'object') {
    const odataResponse = data as { value?: any[] };
    if (odataResponse.value && Array.isArray(odataResponse.value) && odataResponse.value.length > 0) {
      const dataArray = odataResponse.value;
      
      // Filter valid items with VALDATA and VALVALOR
      const validItems = dataArray.filter((item: any) => 
        item.VALDATA && item.VALVALOR !== null && item.VALVALOR !== undefined
      );
      
      metadata.extracted_count = validItems.length;
      metadata.fields_detected = Object.keys(dataArray[0]);
      
      if (validItems.length > 0) {
        // Sort by VALDATA (ISO format: "2024-01-01T00:00:00-03:00")
        const sortedItems = [...validItems].sort((a: any, b: any) => 
          a.VALDATA.localeCompare(b.VALDATA)
        );
        
        // Extract date (first 10 chars of ISO string)
        metadata.period_start = sortedItems[0].VALDATA.substring(0, 10);
        metadata.period_end = sortedItems[sortedItems.length - 1].VALDATA.substring(0, 10);
        metadata.last_record_value = String(sortedItems[sortedItems.length - 1].VALVALOR);
        
        console.log(`[TEST-API] IPEADATA parsed: ${validItems.length} records, period ${metadata.period_start} to ${metadata.period_end}`);
      }
    }
  }
  
  // Handle IBGE nested structure (alternative check)
  else if (!Array.isArray(data) && typeof data === 'object') {
    const ibgeData = data as any[];
    if (Array.isArray(ibgeData) && ibgeData.length > 0 && ibgeData[0].resultados) {
      const resultados = ibgeData[0].resultados;
      if (resultados.length > 0 && resultados[0].series?.length > 0) {
        const serie = resultados[0].series[0].serie || {};
        const periods = Object.keys(serie).filter(k => serie[k] && serie[k] !== '-');
        
        metadata.extracted_count = periods.length;
        metadata.fields_detected = ['D2C', 'V', 'variavel', 'unidade'];
        
        if (periods.length > 0) {
          periods.sort();
          const formatPeriod = (p: string) => {
            if (p.length === 6) return `${p.substring(0, 4)}-${p.substring(4, 6)}-01`;
            return `${p}-01-01`;
          };
          metadata.period_start = formatPeriod(periods[0]);
          metadata.period_end = formatPeriod(periods[periods.length - 1]);
          metadata.last_record_value = serie[periods[periods.length - 1]];
        }
      }
    }
  }

  // For other array types, just extract count and fields
  if (Array.isArray(data) && data.length > 0 && !metadata.period_start) {
    metadata.extracted_count = data.length;
    if (typeof data[0] === 'object' && data[0] !== null) {
      metadata.fields_detected = Object.keys(data[0]);
    }
  }

  return metadata;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiId, baseUrl } = await req.json();

    if (!apiId || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'apiId and baseUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TEST-API] Testing connection to: ${baseUrl}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API provider info INCLUDING configured dates and name for audit
    const { data: apiInfo } = await supabase
      .from('system_api_registry')
      .select('name, provider, target_table, fetch_start_date, fetch_end_date')
      .eq('id', apiId)
      .single();

    const apiName = apiInfo?.name || 'Unknown API';
    const provider = apiInfo?.provider || 'Unknown';
    const targetTable = apiInfo?.target_table || 'indicator_values';
    
    console.log(`[TEST-API] ====== AUDIT: DATE CONFIGURATION ======`);
    console.log(`[TEST-API] Provider: ${provider}`);
    console.log(`[TEST-API] Configured fetch_start_date: ${apiInfo?.fetch_start_date}`);
    console.log(`[TEST-API] Configured fetch_end_date: ${apiInfo?.fetch_end_date}`);

    // Prepare test result
    const result: TestResult = {
      success: false,
      latencyMs: 0,
      statusCode: null,
      statusText: '',
      contentType: null,
      preview: null,
      fullData: null,
      error: null,
      timeout: false,
      syncMetadata: null,
    };

    // Dynamic headers based on provider
    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'identity',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // Detect provider from URL
    const isBCB = baseUrl.includes('api.bcb.gov.br');
    const isIBGE = baseUrl.includes('servicodados.ibge.gov.br');
    const hasPerioPlaceholder = baseUrl.includes('{PERIOD}');

    // IBGE API with {PERIOD} placeholder - use chunking
    if (isIBGE && hasPerioPlaceholder) {
      console.log(`[TEST-API] IBGE API with {PERIOD} placeholder detected - using chunking strategy`);
      
      const startDate = apiInfo?.fetch_start_date || '2012-01-01';
      const endDate = apiInfo?.fetch_end_date || new Date().toISOString().split('T')[0];
      
      console.log(`[TEST-API] Fetching IBGE data from ${startDate} to ${endDate} with ANNUAL chunks`);
      
      const startTime = performance.now();
      const ibgeResult = await fetchIBGEWithChunking(baseUrl, startDate, endDate, requestHeaders);
      
      result.latencyMs = ibgeResult.latencyMs;
      result.statusCode = ibgeResult.statusCode;
      result.statusText = ibgeResult.success ? 'OK (chunked)' : 'Error';
      result.contentType = 'application/json';
      
      if (ibgeResult.success && ibgeResult.data.length > 0) {
        result.success = true;
        result.syncMetadata = analyzeApiResponse(ibgeResult.data, 'IBGE');
        result.preview = ibgeResult.data.slice(0, 2);
        // Store full data with INTELLIGENT SAMPLING (prioritize valid records)
        result.fullData = Array.isArray(ibgeResult.data) 
          ? sampleForStorage(ibgeResult.data, MAX_RECORDS_FOR_STORAGE) as any[]
          : ibgeResult.data;
        console.log(`[TEST-API] IBGE chunked fetch success - ${result.syncMetadata?.extracted_count} periods extracted, storing ${result.fullData?.length || 0} records`);
      } else {
        result.error = ibgeResult.error || 'No data returned from IBGE API';
        console.log(`[TEST-API] IBGE chunked fetch failed: ${result.error}`);
      }
    }
    // BCB API handling
    else if (isBCB) {
      // Use configured dates from database, or fallback to 1-year window
      const hasConfiguredDates = apiInfo?.fetch_start_date && apiInfo?.fetch_end_date;
      
      let startDate: Date;
      let endDate: Date;
      
      if (hasConfiguredDates) {
        startDate = new Date(apiInfo.fetch_start_date);
        endDate = new Date(apiInfo.fetch_end_date);
        console.log(`[TEST-API] BCB API - Using CONFIGURED dates: ${apiInfo.fetch_start_date} to ${apiInfo.fetch_end_date}`);
      } else {
        // Fallback to 1-year window for testing
        endDate = new Date();
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        console.log(`[TEST-API] BCB API - No configured dates, using 1-year fallback window`);
      }
      
      // Remove any existing date parameters
      const cleanUrl = baseUrl.split('&dataInicial')[0].split('?dataInicial')[0];
      const hasParams = cleanUrl.includes('?');
      const separator = hasParams ? '&' : '?';
      
      const testUrl = `${cleanUrl}${separator}dataInicial=${formatDateBCB(startDate)}&dataFinal=${formatDateBCB(endDate)}`;
      
      console.log(`[TEST-API] BCB Test URL: ${testUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout (increased for resilience)
      const startTime = performance.now();

      try {
        const response = await fetch(testUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: requestHeaders,
        });

        clearTimeout(timeoutId);
        result.latencyMs = Math.round(performance.now() - startTime);
        result.statusCode = response.status;
        result.statusText = response.statusText;
        result.contentType = response.headers.get('Content-Type');

        if (response.ok) {
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            result.syncMetadata = analyzeApiResponse(data, provider);
            result.preview = Array.isArray(data) ? data.slice(0, 2) : [data];
            // Store full data with INTELLIGENT SAMPLING (prioritize valid records)
            result.fullData = Array.isArray(data) 
              ? sampleForStorage(data, MAX_RECORDS_FOR_STORAGE) as any[]
              : [data];
            result.success = true;
          } catch (parseError) {
            result.error = 'Response is not valid JSON';
            result.preview = [{ raw: text.substring(0, 200) }];
          }
        } else {
          result.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        result.latencyMs = Math.round(performance.now() - startTime);
        const err = fetchError as Error;
        if (err.name === 'AbortError') {
          result.timeout = true;
          result.error = 'Connection timeout (45s exceeded)';
        } else {
          result.error = err.message || 'Network error';
        }
      }
    }
    // Generic API / IBGE without placeholder - standard request
    else {
      // ========== V7.2: DETECT INTERNATIONAL API FOR HTTP/2 RESILIENCE ==========
      const isInternationalAPI = ['IMF', 'WorldBank', 'YahooFinance'].includes(provider);
      
      if (isInternationalAPI) {
        console.log(`[TEST-API] 🌍 International API detected: ${provider} - using HTTP/2 resilience protocol`);
        
        const startTime = performance.now();
        
        try {
          const response = await fetchWithHTTP2Resilience(baseUrl, { method: 'GET' }, 3, provider);
          
          result.latencyMs = Math.round(performance.now() - startTime);
          result.statusCode = response.status;
          result.statusText = response.statusText;
          result.contentType = response.headers.get('Content-Type');

          console.log(`[TEST-API] Response: ${response.status} ${response.statusText} (${result.latencyMs}ms)`);

          if (response.ok) {
            const text = await response.text();
            try {
              const data = JSON.parse(text);
              result.syncMetadata = analyzeApiResponse(data, provider);
              
              if (Array.isArray(data)) {
                result.preview = data.slice(0, 2);
                result.fullData = sampleForStorage(data, MAX_RECORDS_FOR_STORAGE) as any[];
              } else if (typeof data === 'object' && data !== null) {
                const keys = Object.keys(data);
                if (keys.length > 0 && Array.isArray(data[keys[0]])) {
                  result.preview = data[keys[0]].slice(0, 2);
                  result.fullData = data[keys[0]].slice(0, MAX_RECORDS_FOR_STORAGE);
                } else {
                  result.preview = [data];
                  result.fullData = [data];
                }
              } else {
                result.preview = [{ value: data }];
                result.fullData = [{ value: data }];
              }
              
              result.success = true;
              console.log(`[TEST-API] ✅ International API JSON parsed successfully, preview items: ${result.preview?.length}, storing ${result.fullData?.length || 0} records`);
            } catch (parseError) {
              result.error = 'Response is not valid JSON';
              result.preview = [{ raw: text.substring(0, 200) + (text.length > 200 ? '...' : '') }];
              console.log(`[TEST-API] Response is not JSON: ${parseError}`);
            }
          } else {
            result.error = `HTTP ${response.status}: ${response.statusText}`;
            console.log(`[TEST-API] HTTP error: ${result.error}`);
          }
        } catch (fetchError: unknown) {
          result.latencyMs = Math.round(performance.now() - startTime);
          const err = fetchError as Error;
          
          // Log detailed HTTP/2 diagnostics
          logHTTP2Error(err, provider, baseUrl);
          
          if (err.name === 'AbortError') {
            result.timeout = true;
            result.error = 'Connection timeout (HTTP/2 resilience exceeded)';
            console.log(`[TEST-API] ❌ Timeout after ${result.latencyMs}ms`);
          } else {
            result.error = `HTTP/2 Protocol Error: ${err.message}`;
            console.log(`[TEST-API] ❌ HTTP/2 Fetch error: ${err.message}`);
          }
        }
      } else {
        // Standard API request (non-international)
        console.log(`[TEST-API] Standard API request (no chunking)`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout (increased for resilience)
        const startTime = performance.now();

        try {
          const response = await fetch(baseUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: requestHeaders,
          });

          clearTimeout(timeoutId);
          result.latencyMs = Math.round(performance.now() - startTime);
          result.statusCode = response.status;
          result.statusText = response.statusText;
          result.contentType = response.headers.get('Content-Type');

          console.log(`[TEST-API] Response: ${response.status} ${response.statusText} (${result.latencyMs}ms)`);

          if (response.ok) {
            const text = await response.text();
            try {
              const data = JSON.parse(text);
              result.syncMetadata = analyzeApiResponse(data, provider);
              
              if (Array.isArray(data)) {
                result.preview = data.slice(0, 2);
                result.fullData = sampleForStorage(data, MAX_RECORDS_FOR_STORAGE) as any[];
              } else if (typeof data === 'object' && data !== null) {
                const keys = Object.keys(data);
                if (keys.length > 0 && Array.isArray(data[keys[0]])) {
                  result.preview = data[keys[0]].slice(0, 2);
                  result.fullData = sampleForStorage(data[keys[0]], MAX_RECORDS_FOR_STORAGE) as any[];
                } else {
                  result.preview = [data];
                  result.fullData = [data];
                }
              } else {
                result.preview = [{ value: data }];
                result.fullData = [{ value: data }];
              }
              
              result.success = true;
              console.log(`[TEST-API] JSON parsed successfully, preview items: ${result.preview?.length}, storing ${result.fullData?.length || 0} records`);
            } catch (parseError) {
              result.error = 'Response is not valid JSON';
              result.preview = [{ raw: text.substring(0, 200) + (text.length > 200 ? '...' : '') }];
              console.log(`[TEST-API] Response is not JSON: ${parseError}`);
            }
          } else {
            result.error = `HTTP ${response.status}: ${response.statusText}`;
            console.log(`[TEST-API] HTTP error: ${result.error}`);
          }
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId);
          result.latencyMs = Math.round(performance.now() - startTime);

          const err = fetchError as Error;
          if (err.name === 'AbortError') {
            result.timeout = true;
            result.error = 'Connection timeout (45s exceeded)';
            console.log(`[TEST-API] Timeout after ${result.latencyMs}ms`);
          } else {
            result.error = err.message || 'Network error';
            console.log(`[TEST-API] Fetch error: ${err.message}`);
          }
        }
      }
    }

    // Update database with test results including new telemetry columns AND discovered period
    const newStatus = result.success ? 'active' : 'error';
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      last_checked_at: new Date().toISOString(),
      last_latency_ms: result.latencyMs,
      last_http_status: result.statusCode,
    };

    // Include raw JSON response if available (for JSON Observability tab)
    // Use fullData (up to 500 records) instead of preview (2 records) for better observability
    if (result.fullData && result.fullData.length > 0) {
      updatePayload.last_raw_response = result.fullData;
      console.log(`[TEST-API] [RAW_RESPONSE] Persisting last_raw_response with ${result.fullData.length} records (max ${MAX_RECORDS_FOR_STORAGE})`);
    } else if (result.preview && result.preview.length > 0) {
      // Fallback to preview if fullData not available
      updatePayload.last_raw_response = result.preview;
      console.log(`[TEST-API] [RAW_RESPONSE] Persisting last_raw_response with ${result.preview.length} preview items (fallback)`);
    }

    // Include sync metadata if available
    if (result.syncMetadata) {
      updatePayload.last_sync_metadata = result.syncMetadata;
      
      // Persist discovered period (governance feature)
      if (result.syncMetadata.period_start) {
        updatePayload.discovered_period_start = result.syncMetadata.period_start;
        console.log(`[TEST-API] [GOVERNANCE] Persisting discovered_period_start: ${result.syncMetadata.period_start}`);
      }
      if (result.syncMetadata.period_end) {
        updatePayload.discovered_period_end = result.syncMetadata.period_end;
        console.log(`[TEST-API] [GOVERNANCE] Persisting discovered_period_end: ${result.syncMetadata.period_end}`);
      }
      if (result.syncMetadata.period_start || result.syncMetadata.period_end) {
        updatePayload.period_discovery_date = new Date().toISOString();
      }
    }

    const { error: updateError } = await supabase
      .from('system_api_registry')
      .update(updatePayload)
      .eq('id', apiId);

    if (updateError) {
      console.error(`[TEST-API] Database update error:`, updateError);
    } else {
      console.log(`[TEST-API] Updated API status to: ${newStatus}, with telemetry data`);
    }

    // ====== AUTO-ADJUSTMENT: Update fetch_start_date if API history is limited ======
    if (result.success && result.syncMetadata?.period_start && apiInfo?.fetch_start_date) {
      const configuredStart = new Date(apiInfo.fetch_start_date);
      const actualStart = new Date(result.syncMetadata.period_start);
      const diffDays = (actualStart.getTime() - configuredStart.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays > 365) {
        console.log(`[TEST-API] ⚠️ AUTO-ADJUSTMENT: API history limited. Configured: ${apiInfo.fetch_start_date}, Actual: ${result.syncMetadata.period_start}`);
        console.log(`[TEST-API] ⚠️ Difference: ${Math.round(diffDays)} days. Updating fetch_start_date to match actual API availability.`);
        
        const { error: adjustError } = await supabase
          .from('system_api_registry')
          .update({ 
            fetch_start_date: result.syncMetadata.period_start
          })
          .eq('id', apiId);
        
        if (adjustError) {
          console.error(`[TEST-API] ❌ Auto-adjustment failed:`, adjustError);
        } else {
          console.log(`[TEST-API] ✅ Auto-adjusted fetch_start_date to ${result.syncMetadata.period_start}`);
        }
      }
    }

    // ====== AUDIT LOGGING: Record test result ======
    const eventType = result.success ? 'CONNECTION_TEST_SUCCESS' : 'CONNECTION_TEST_FAILED';
    const severity = result.success ? 'SUCCESS' : 'ERROR';
    const recordCount = result.syncMetadata?.extracted_count || 0;
    const description = result.success 
      ? `Teste de conexão bem-sucedido para "${apiName}". ${recordCount} registros retornados em ${result.latencyMs}ms.`
      : `Falha no teste de conexão para "${apiName}": ${result.error || 'Erro desconhecido'}`;

    try {
      await supabase.rpc('log_api_event', {
        p_api_id: apiId,
        p_api_name: apiName,
        p_event_type: eventType,
        p_event_category: 'CONNECTION',
        p_severity: severity,
        p_action_description: description,
        p_request_payload: { url: baseUrl, provider },
        p_response_payload: result.success ? {
          status: result.statusCode,
          recordCount,
          sampleFields: result.syncMetadata?.fields_detected || []
        } : null,
        p_error_message: result.error || null,
        p_records_affected: recordCount,
        p_execution_time_ms: result.latencyMs,
        p_http_status: result.statusCode
      });
      console.log(`[TEST-API] Audit log recorded: ${eventType}`);
    } catch (auditError) {
      console.error('[TEST-API] Failed to record audit log:', auditError);
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[TEST-API] Unexpected error:', err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message || 'Internal server error',
        latencyMs: 0,
        statusCode: null,
        statusText: '',
        contentType: null,
        preview: null,
        timeout: false,
        syncMetadata: null,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
