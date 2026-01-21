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

// IPEADATA OData v4 response structure
interface IPEADATADataPoint {
  SERCODIGO: string;
  VALDATA: string;       // ISO date: "2024-01-01T00:00:00-03:00"
  VALVALOR: number;      // Numeric value
  NIVNOME?: string;      // Level name (optional)
  TERCODIGO?: string;    // Territory code (optional)
}

interface IPEADATAResponse {
  '@odata.context'?: string;
  '@odata.nextLink'?: string;
  value: IPEADATADataPoint[];
}

interface ApiConfig {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  status: string;
  fetch_start_date: string | null;
  fetch_end_date: string | null;
  redundant_api_url: string | null;
  redundant_aggregate_id: string | null;
  target_table: string | null;
}

interface SyncMetadata {
  extracted_count: number;
  period_start: string | null;
  period_end: string | null;
  fields_detected: string[];
  last_record_value: string | null;
  fetch_timestamp: string;
}

// ========== PAC (Pesquisa Anual de Comércio) UF CODE MAPPING ==========
// PAC Tabela 1407 uses classification codes (c12354) for UFs, not standard IBGE codes
// This maps PAC category codes to standard IBGE UF codes (11-53)
const PAC_UF_CODE_MAP: Record<string, number> = {
  '106775': 11,  // Rondônia
  '106776': 12,  // Acre
  '106777': 13,  // Amazonas
  '106778': 14,  // Roraima
  '106779': 15,  // Pará
  '106780': 16,  // Amapá
  '106781': 17,  // Tocantins
  '106782': 21,  // Maranhão
  '106783': 22,  // Piauí
  '106784': 23,  // Ceará
  '106785': 24,  // Rio Grande do Norte
  '106786': 25,  // Paraíba
  '106787': 26,  // Pernambuco
  '106788': 27,  // Alagoas
  '106789': 28,  // Sergipe
  '106790': 29,  // Bahia
  '106791': 31,  // Minas Gerais
  '106792': 32,  // Espírito Santo
  '106793': 33,  // Rio de Janeiro
  '106794': 35,  // São Paulo
  '106795': 41,  // Paraná
  '106796': 42,  // Santa Catarina
  '106797': 43,  // Rio Grande do Sul
  '106798': 50,  // Mato Grosso do Sul
  '106799': 51,  // Mato Grosso
  '106800': 52,  // Goiás
  '106801': 53,  // Distrito Federal
};

// Detect if URL is PAC Table 1407
function isPACTable1407(url: string): boolean {
  return url.includes('/t/1407/') || url.includes('t/1407');
}

// BCB-specific headers to avoid 406 errors
const BCB_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Encoding': 'identity',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// ========== V7.4: HTTP/1.1 FORCED CLIENT - ERRADICAÇÃO HTTP/2 PROTOCOL ERRORS ==========

// Lazy-initialized HTTP/1.1-only client to bypass HTTP/2 negotiation issues with IMF/WorldBank
let http1OnlyClient: Deno.HttpClient | null = null;

function getHttp1OnlyClient(): Deno.HttpClient {
  if (!http1OnlyClient) {
    console.log('[HTTP-CLIENT] 🔧 Creating HTTP/1.1-only client (HTTP/2 DISABLED)');
    http1OnlyClient = Deno.createHttpClient({
      http1: true,   // Enable HTTP/1.1
      http2: false,  // ⚠️ CRITICAL: DISABLE HTTP/2 to prevent stream errors
      poolMaxIdlePerHost: 5,
      poolIdleTimeout: 30000
    });
    console.log('[HTTP-CLIENT] ✅ HTTP/1.1-only client created successfully');
  }
  return http1OnlyClient;
}

// ========== V7.4: HTTP/2 ULTRA-RESILIENCE PROTOCOL ==========

// Header strategies for bypassing HTTP/2 negotiation issues
const HEADER_STRATEGIES = {
  standard: {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  },
  minimal: {
    'Accept': 'application/json',
    'User-Agent': 'KnowYOU-DataCollector/1.0'
  },
  compatible: {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0',
    'Connection': 'close' // Forces HTTP/1.1 behavior
  },
  legacy: {
    'Accept': '*/*'
  }
};

type HeaderStrategy = keyof typeof HEADER_STRATEGIES;

// Enhanced HTTP/2 diagnostic logging V2
function logHTTP2DiagnosticV2(error: Error, provider: string, url: string, attempt: number, strategy: string): void {
  const isHTTP2 = error.message?.includes('http2');
  const isStream = error.message?.includes('stream error');
  const isRefused = error.message?.includes('refused') || error.message?.includes('ECONNREFUSED');
  const isIPv6 = url.includes('[') || error.message?.includes('2600:') || error.message?.includes('IPv6');
  const isTimeout = error.message?.includes('abort') || error.message?.includes('timeout') || error.message?.includes('Timeout');
  const isReset = error.message?.includes('ECONNRESET') || error.message?.includes('reset');
  
  console.error(`[HTTP2-DIAGNOSTIC-V2] ════════════════════════════════════════`);
  console.error(`[HTTP2-DIAGNOSTIC-V2] Provider: ${provider}`);
  console.error(`[HTTP2-DIAGNOSTIC-V2] Attempt: ${attempt}`);
  console.error(`[HTTP2-DIAGNOSTIC-V2] Header Strategy: ${strategy}`);
  console.error(`[HTTP2-DIAGNOSTIC-V2] URL: ${url.substring(0, 100)}...`);
  console.error(`[HTTP2-DIAGNOSTIC-V2] ─────────────────────────────────────────`);
  console.error(`[HTTP2-DIAGNOSTIC-V2] Error Classification:`);
  console.error(`[HTTP2-DIAGNOSTIC-V2]   ├─ HTTP/2 Protocol Error: ${isHTTP2}`);
  console.error(`[HTTP2-DIAGNOSTIC-V2]   ├─ Stream Error: ${isStream}`);
  console.error(`[HTTP2-DIAGNOSTIC-V2]   ├─ Connection Refused: ${isRefused}`);
  console.error(`[HTTP2-DIAGNOSTIC-V2]   ├─ Connection Reset: ${isReset}`);
  console.error(`[HTTP2-DIAGNOSTIC-V2]   ├─ IPv6 Connection: ${isIPv6}`);
  console.error(`[HTTP2-DIAGNOSTIC-V2]   └─ Timeout: ${isTimeout}`);
  console.error(`[HTTP2-DIAGNOSTIC-V2] ─────────────────────────────────────────`);
  console.error(`[HTTP2-DIAGNOSTIC-V2] Full Message: ${error.message}`);
  console.error(`[HTTP2-DIAGNOSTIC-V2] ════════════════════════════════════════`);
}

// Legacy diagnostic function for backward compatibility
function logHTTP2Error(error: Error, provider: string, url: string): void {
  logHTTP2DiagnosticV2(error, provider, url, 0, 'unknown');
}

// Ultra-resilient fetch for international APIs with 4 retry strategies
async function fetchWithHTTP2UltraResilience(
  url: string,
  providerName: string = 'Unknown',
  fallbackUrl: string | null = null
): Promise<{ response: Response | null; usedFallback: boolean; provider: string }> {
  
  // 4 attempts with progressive backoff and different header strategies
  const attempts: Array<{ delay: number; timeout: number; strategy: HeaderStrategy }> = [
    { delay: 5000, timeout: 45000, strategy: 'standard' },
    { delay: 10000, timeout: 60000, strategy: 'minimal' },
    { delay: 20000, timeout: 90000, strategy: 'compatible' },
    { delay: 30000, timeout: 120000, strategy: 'legacy' }
  ];
  
  console.log(`[HTTP2-ULTRA] ═══════════════════════════════════════════════════`);
  console.log(`[HTTP2-ULTRA] 🌍 Starting ULTRA-RESILIENT fetch for: ${providerName}`);
  console.log(`[HTTP2-ULTRA] 🔒 Protocol: HTTP/1.1 FORCED (HTTP/2 DISABLED)`);
  console.log(`[HTTP2-ULTRA] Primary URL: ${url.substring(0, 80)}...`);
  console.log(`[HTTP2-ULTRA] Fallback URL: ${fallbackUrl ? 'Available' : 'None'}`);
  console.log(`[HTTP2-ULTRA] ═══════════════════════════════════════════════════`);
  
  // Get HTTP/1.1-only client to bypass HTTP/2 protocol errors
  const httpClient = getHttp1OnlyClient();
  
  // Try primary URL with all 4 strategies
  for (let i = 0; i < attempts.length; i++) {
    const { delay, timeout, strategy } = attempts[i];
    const attemptNum = i + 1;
    
    try {
      console.log(`[HTTP2-ULTRA] [${providerName}] Attempt ${attemptNum}/4 - Strategy: ${strategy} - Timeout: ${timeout}ms - HTTP/1.1`);
      
      const headers = HEADER_STRATEGIES[strategy];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // @ts-ignore - Deno.HttpClient is valid in Deno runtime
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        client: httpClient  // ← FORCE HTTP/1.1 via custom client
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`[HTTP2-ULTRA] ✅ [${providerName}] SUCCESS on attempt ${attemptNum} with strategy '${strategy}'`);
        console.log(`[HTTP2-ULTRA] ✅ HTTP Status: ${response.status}`);
        return { response, usedFallback: false, provider: providerName };
      }
      
      console.warn(`[HTTP2-ULTRA] ⚠️ [${providerName}] HTTP ${response.status} on attempt ${attemptNum}`);
      
    } catch (error) {
      const err = error as Error;
      console.error(`[HTTP2-ULTRA] ❌ [${providerName}] Attempt ${attemptNum} FAILED: ${err.message}`);
      logHTTP2DiagnosticV2(err, providerName, url, attemptNum, strategy);
      
      if (i < attempts.length - 1) {
        console.log(`[HTTP2-ULTRA] [${providerName}] Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[HTTP2-ULTRA] ❌ [${providerName}] ALL 4 ATTEMPTS FAILED on primary URL`);
  
  // STRATEGIC FALLBACK: Try fallback URL if available
  if (fallbackUrl) {
    console.log(`[HTTP2-ULTRA] 🔄 [${providerName}] Attempting FALLBACK to WorldBank...`);
    console.log(`[HTTP2-ULTRA] Fallback URL: ${fallbackUrl.substring(0, 80)}...`);
    
    // Use same 4-attempt strategy for fallback
    for (let i = 0; i < attempts.length; i++) {
      const { delay, timeout, strategy } = attempts[i];
      const attemptNum = i + 1;
      
      try {
        console.log(`[HTTP2-ULTRA] [WorldBank-Fallback] Attempt ${attemptNum}/4 - Strategy: ${strategy} - HTTP/1.1`);
        
        const headers = HEADER_STRATEGIES[strategy];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        // @ts-ignore - Deno.HttpClient is valid in Deno runtime
        const response = await fetch(fallbackUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
          client: httpClient  // ← FORCE HTTP/1.1 via custom client
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`[HTTP2-ULTRA] ✅ [WorldBank-Fallback] SUCCESS on attempt ${attemptNum}`);
          return { response, usedFallback: true, provider: 'WorldBank' };
        }
        
      } catch (error) {
        const err = error as Error;
        console.error(`[HTTP2-ULTRA] ❌ [WorldBank-Fallback] Attempt ${attemptNum} FAILED: ${err.message}`);
        logHTTP2DiagnosticV2(err, 'WorldBank-Fallback', fallbackUrl, attemptNum, strategy);
        
        if (i < attempts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`[HTTP2-ULTRA] ❌ FALLBACK ALSO FAILED after 4 attempts`);
  }
  
  console.error(`[HTTP2-ULTRA] ═══════════════════════════════════════════════════`);
  console.error(`[HTTP2-ULTRA] 💀 TOTAL FAILURE: All attempts exhausted for ${providerName}`);
  console.error(`[HTTP2-ULTRA] ═══════════════════════════════════════════════════`);
  
  return { response: null, usedFallback: false, provider: providerName };
}

// Standard fetch with HTTP/2 resilience (for backward compatibility)
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
      
      const resilientHeaders: Record<string, string> = {
        ...HEADER_STRATEGIES.standard,
        ...(options.headers as Record<string, string> || {})
      };
      
      const timeout = 30000 + (attempt * 15000);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        headers: resilientHeaders,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`[HTTP2-RESILIENCE] [${providerName}] Success: HTTP ${response.status}`);
      return response;
      
    } catch (error) {
      const err = error as Error;
      console.error(`[HTTP2-RESILIENCE] [${providerName}] Attempt ${attempt + 1} failed: ${err.message}`);
      logHTTP2Error(err, providerName, url);
      
      if (attempt < maxRetries - 1) {
        const delay = delays[attempt] || delays[delays.length - 1];
        console.log(`[HTTP2-RESILIENCE] [${providerName}] Waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`All ${maxRetries} attempts failed for ${providerName}`);
}

// Fetch international API with ultra-resilience and strategic fallback
interface InternationalFetchResult {
  success: boolean;
  data: unknown;
  error: string | null;
  provider: string;
  usedFallback: boolean;
  httpStatus: number | null;
}

async function fetchInternationalAPI(
  primaryUrl: string,
  primaryProvider: string,
  fallbackUrl: string | null,
  indicatorName: string
): Promise<InternationalFetchResult> {
  console.log(`[INTERNATIONAL-API] 🌍 Fetching ${indicatorName} from ${primaryProvider}`);
  
  // Use ultra-resilient fetch with fallback support
  const result = await fetchWithHTTP2UltraResilience(primaryUrl, primaryProvider, fallbackUrl);
  
  if (result.response) {
    try {
      const data = await result.response.json();
      console.log(`[INTERNATIONAL-API] ✅ Success via ${result.provider} (fallback: ${result.usedFallback})`);
      return { 
        success: true, 
        data, 
        error: null, 
        provider: result.provider, 
        usedFallback: result.usedFallback,
        httpStatus: result.response.status
      };
    } catch (parseError) {
      console.error(`[INTERNATIONAL-API] ❌ JSON parse error: ${parseError}`);
      return { 
        success: false, 
        data: null, 
        error: 'JSON parse error', 
        provider: result.provider, 
        usedFallback: result.usedFallback,
        httpStatus: result.response.status
      };
    }
  }
  
  return { 
    success: false, 
    data: null, 
    error: `All attempts failed for ${primaryProvider}`, 
    provider: primaryProvider, 
    usedFallback: false,
    httpStatus: null
  };
}

// ========== END V7.3 HTTP/2 ULTRA-RESILIENCE ==========

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

// Generate 10-year chunks from configured date range
function generateTenYearChunks(startDate: Date, endDate: Date): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  const currentStart = new Date(startDate);
  
  while (currentStart < endDate) {
    const chunkEnd = new Date(currentStart);
    chunkEnd.setFullYear(chunkEnd.getFullYear() + 10);
    chunkEnd.setDate(chunkEnd.getDate() - 1); // Last day of 10-year period
    
    const effectiveEnd = chunkEnd > endDate ? endDate : chunkEnd;
    
    chunks.push({
      start: formatDateBCB(currentStart),
      end: formatDateBCB(effectiveEnd)
    });
    
    // Move to next chunk
    currentStart.setFullYear(currentStart.getFullYear() + 10);
  }
  
  return chunks;
}

// Fetch BCB data with chunking to respect 10-year limit - NOW USING CONFIGURED DATES
// Enhanced with retry logic and detailed error tracking
async function fetchBCBWithChunking(
  baseUrl: string, 
  fetchStartDate: string | null, 
  fetchEndDate: string | null,
  indicatorName: string = 'Unknown'
): Promise<BCBDataPoint[]> {
  const allData: BCBDataPoint[] = [];
  const MAX_RETRIES = 3;
  
  // Remove any existing date parameters from URL
  const cleanUrl = baseUrl.split('&dataInicial')[0].split('?dataInicial')[0];
  const hasParams = cleanUrl.includes('?');
  
  // Use configured dates or fallback to defaults
  const startDate = fetchStartDate ? new Date(fetchStartDate) : new Date('2010-01-01');
  const endDate = fetchEndDate ? new Date(fetchEndDate) : new Date();
  
  console.log(`[FETCH-ECONOMIC] ====== AUDIT: ${indicatorName} ======`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Base URL: ${cleanUrl}`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Configured fetch_start_date: ${fetchStartDate}`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Configured fetch_end_date: ${fetchEndDate}`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Effective start: ${startDate.toISOString().substring(0, 10)}`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Effective end: ${endDate.toISOString().substring(0, 10)}`);
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] INVALID DATES! Start: ${fetchStartDate}, End: ${fetchEndDate}`);
    return [];
  }
  
  if (startDate >= endDate) {
    console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] START DATE >= END DATE! No data to fetch.`);
    return [];
  }
  
  // Generate dynamic chunks based on configured dates
  const chunks = generateTenYearChunks(startDate, endDate);
  
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] BCB chunking: ${chunks.length} chunks to fetch`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Chunks:`, JSON.stringify(chunks));
  
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const separator = hasParams ? '&' : '?';
    const chunkUrl = `${cleanUrl}${separator}dataInicial=${chunk.start}&dataFinal=${chunk.end}`;
    
    console.log(`[FETCH-ECONOMIC] [${indicatorName}] Chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.start} to ${chunk.end}`);
    
    let lastError: Error | null = null;
    
    // Retry loop for each chunk
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[FETCH-ECONOMIC] [${indicatorName}] Attempt ${attempt}/${MAX_RETRIES} - Fetching: ${chunkUrl}`);
        
        const response = await fetch(chunkUrl, { headers: BCB_HEADERS });
        
        console.log(`[FETCH-ECONOMIC] [${indicatorName}] HTTP Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read response body');
          console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] HTTP ERROR ${response.status}: ${errorText.substring(0, 200)}`);
          
          if (response.status === 406) {
            console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] 406 Not Acceptable - BCB API rejecting request. Check date range or series code.`);
          }
          
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          
          if (attempt < MAX_RETRIES) {
            const delay = 5000 * attempt; // 5s, 10s, 15s exponential backoff for BCB resilience
            console.log(`[FETCH-ECONOMIC] [${indicatorName}] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          break;
        }
        
        const responseText = await response.text();
        
        // Validate JSON response
        let data: BCBDataPoint[];
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] JSON PARSE ERROR:`, parseError);
          console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] Response preview: ${responseText.substring(0, 500)}`);
          lastError = new Error('Invalid JSON response from BCB');
          break;
        }
        
        // Validate data structure
        if (!Array.isArray(data)) {
          console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] UNEXPECTED FORMAT: Response is not an array`);
          console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] Response type: ${typeof data}`);
          lastError = new Error('BCB response is not an array');
          break;
        }
        
        // Validate data points have expected fields
        if (data.length > 0) {
          const sample = data[0];
          if (!('data' in sample) || !('valor' in sample)) {
            console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] UNEXPECTED FIELDS: Expected {data, valor}, got ${JSON.stringify(Object.keys(sample))}`);
          }
        }
        
        allData.push(...data);
        console.log(`[FETCH-ECONOMIC] ✅ [${indicatorName}] Chunk ${chunkIndex + 1} success: ${data.length} records (Total: ${allData.length})`);
        lastError = null;
        break; // Success, exit retry loop
        
      } catch (err) {
        console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] FETCH EXCEPTION on attempt ${attempt}:`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (attempt < MAX_RETRIES) {
          const delay = 5000 * attempt; // 5s, 10s, 15s exponential backoff
          console.log(`[FETCH-ECONOMIC] [${indicatorName}] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (lastError) {
      console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] CHUNK ${chunkIndex + 1} FAILED after ${MAX_RETRIES} attempts: ${lastError.message}`);
    }
    
    // Small delay between chunks to be polite to the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] ====== TOTAL RECORDS: ${allData.length} ======`);
  
  if (allData.length === 0) {
    console.warn(`[FETCH-ECONOMIC] ⚠️ [${indicatorName}] WARNING: ZERO DATA POINTS FETCHED!`);
    console.warn(`[FETCH-ECONOMIC] ⚠️ [${indicatorName}] Check: 1) Series code in URL, 2) Date range validity, 3) API availability`);
  }
  
  return allData;
}

// Generate sync metadata from fetched data
function generateSyncMetadata(data: BCBDataPoint[], provider: string): SyncMetadata {
  const metadata: SyncMetadata = {
    extracted_count: 0,
    period_start: null,
    period_end: null,
    fields_detected: [],
    last_record_value: null,
    fetch_timestamp: new Date().toISOString()
  };

  if (!data || data.length === 0) return metadata;

  metadata.extracted_count = data.length;
  
  if (provider === 'BCB' && data[0].data && data[0].valor) {
    metadata.fields_detected = ['data', 'valor'];
    
    // Sort dates to find range
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(bcbDateToISO(a.data));
      const dateB = new Date(bcbDateToISO(b.data));
      return dateA.getTime() - dateB.getTime();
    });
    
    metadata.period_start = bcbDateToISO(sortedData[0].data);
    metadata.period_end = bcbDateToISO(sortedData[sortedData.length - 1].data);
    metadata.last_record_value = sortedData[sortedData.length - 1].valor;
  }

  return metadata;
}

// Generate sync metadata for IBGE data
function generateIBGESyncMetadata(ibgeData: IBGEResult[]): SyncMetadata {
  const metadata: SyncMetadata = {
    extracted_count: 0,
    period_start: null,
    period_end: null,
    fields_detected: ['D2C', 'V', 'variavel', 'unidade'],
    last_record_value: null,
    fetch_timestamp: new Date().toISOString()
  };

  if (!ibgeData || ibgeData.length === 0 || !ibgeData[0].resultados) return metadata;

  const allPeriods: string[] = [];
  let totalCount = 0;
  let lastValue: string | null = null;

  for (const resultado of ibgeData[0].resultados) {
    for (const serie of resultado.series || []) {
      const serieData = serie.serie || {};
      for (const [period, value] of Object.entries(serieData)) {
        if (value && value !== '-' && value !== '...' && value !== '..') {
          allPeriods.push(period);
          totalCount++;
          lastValue = value;
        }
      }
    }
  }

  metadata.extracted_count = totalCount;
  
  if (allPeriods.length > 0) {
    allPeriods.sort();
    const formatPeriod = (p: string) => {
      if (p.length === 6) return `${p.substring(0, 4)}-${p.substring(4, 6)}-01`;
      return `${p}-01-01`;
    };
    metadata.period_start = formatPeriod(allPeriods[0]);
    metadata.period_end = formatPeriod(allPeriods[allPeriods.length - 1]);
    metadata.last_record_value = lastValue;
  }

  return metadata;
}

// Generate sync metadata for IPEADATA
function generateIPEADATASyncMetadata(ipedataResponse: IPEADATAResponse | unknown): SyncMetadata {
  const metadata: SyncMetadata = {
    extracted_count: 0,
    period_start: null,
    period_end: null,
    fields_detected: ['VALDATA', 'VALVALOR', 'SERCODIGO'],
    last_record_value: null,
    fetch_timestamp: new Date().toISOString()
  };

  // Handle OData response with 'value' array
  const response = ipedataResponse as { value?: IPEADATADataPoint[] };
  if (!response?.value || !Array.isArray(response.value)) return metadata;

  const dataArray = response.value;
  if (dataArray.length === 0) return metadata;

  metadata.extracted_count = dataArray.length;

  // Sort by date and extract period range
  const sortedByDate = [...dataArray]
    .filter(item => item.VALDATA && item.VALVALOR !== null && item.VALVALOR !== undefined)
    .sort((a, b) => a.VALDATA.localeCompare(b.VALDATA));

  if (sortedByDate.length > 0) {
    // IPEADATA dates are ISO format: "2024-01-01T00:00:00-03:00"
    metadata.period_start = sortedByDate[0].VALDATA.substring(0, 10);
    metadata.period_end = sortedByDate[sortedByDate.length - 1].VALDATA.substring(0, 10);
    metadata.last_record_value = String(sortedByDate[sortedByDate.length - 1].VALVALOR);
  }

  return metadata;
}

// Fetch IPEADATA with OData filter support
async function fetchIPEADATA(
  baseUrl: string,
  fetchStartDate: string | null,
  fetchEndDate: string | null,
  indicatorName: string = 'Unknown'
): Promise<IPEADATADataPoint[]> {
  console.log(`[FETCH-ECONOMIC] ====== IPEADATA FETCH: ${indicatorName} ======`);
  console.log(`[FETCH-ECONOMIC] [IPEADATA] Base URL: ${baseUrl}`);
  console.log(`[FETCH-ECONOMIC] [IPEADATA] Configured fetch_start_date: ${fetchStartDate}`);
  console.log(`[FETCH-ECONOMIC] [IPEADATA] Configured fetch_end_date: ${fetchEndDate}`);

  // Build URL with OData filter if date is configured
  let fetchUrl = baseUrl;
  
  if (fetchStartDate) {
    // OData filter syntax: $filter=VALDATA ge YYYY-MM-DD
    const separator = baseUrl.includes('?') ? '&' : '?';
    fetchUrl = `${baseUrl}${separator}$filter=VALDATA ge ${fetchStartDate}`;
    console.log(`[FETCH-ECONOMIC] [IPEADATA] Applied OData filter: VALDATA ge ${fetchStartDate}`);
  }

  console.log(`[FETCH-ECONOMIC] [IPEADATA] Final URL: ${fetchUrl.substring(0, 200)}...`);

  const MAX_RETRIES = 3;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[FETCH-ECONOMIC] [IPEADATA] Attempt ${attempt}/${MAX_RETRIES}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; KnowYOU-DataCollector/1.0)'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`[FETCH-ECONOMIC] [IPEADATA] HTTP Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read response');
        console.error(`[FETCH-ECONOMIC] ❌ [IPEADATA] HTTP ERROR ${response.status}: ${errorText.substring(0, 200)}`);
        
        if (attempt < MAX_RETRIES) {
          const delay = 3000 * attempt;
          console.log(`[FETCH-ECONOMIC] [IPEADATA] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return [];
      }
      
      const jsonData = await response.json() as IPEADATAResponse;
      
      // OData response has 'value' array containing the data
      if (jsonData.value && Array.isArray(jsonData.value)) {
        console.log(`[FETCH-ECONOMIC] ✅ [IPEADATA] SUCCESS: ${jsonData.value.length} records fetched`);
        
        // Handle pagination if @odata.nextLink exists
        let allData = [...jsonData.value];
        let nextLink = jsonData['@odata.nextLink'];
        let pageCount = 1;
        
        while (nextLink && pageCount < 50) { // Safety limit: max 50 pages
          pageCount++;
          console.log(`[FETCH-ECONOMIC] [IPEADATA] Fetching page ${pageCount}...`);
          
          try {
            const nextResponse = await fetch(nextLink, {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
            });
            
            if (!nextResponse.ok) break;
            
            const nextData = await nextResponse.json() as IPEADATAResponse;
            if (nextData.value && Array.isArray(nextData.value)) {
              allData = [...allData, ...nextData.value];
              nextLink = nextData['@odata.nextLink'];
            } else {
              break;
            }
          } catch (pageError) {
            console.error(`[FETCH-ECONOMIC] [IPEADATA] Pagination error on page ${pageCount}:`, pageError);
            break;
          }
        }
        
        console.log(`[FETCH-ECONOMIC] [IPEADATA] Total records after pagination: ${allData.length}`);
        
        // ========== POST-FETCH DATE FILTER (IPEADATA OData filter often ignored) ==========
        // IPEADATA API frequently ignores $filter parameter and returns entire series from 1985
        // Apply client-side filter to ensure only data >= fetchStartDate is returned
        if (fetchStartDate) {
          const beforeFilter = allData.length;
          allData = allData.filter(item => {
            if (!item.VALDATA) return false;
            // VALDATA format: "2024-01-01T00:00:00-03:00"
            const itemDate = item.VALDATA.substring(0, 10);
            return itemDate >= fetchStartDate;
          });
          console.log(`[FETCH-ECONOMIC] [IPEADATA] Post-fetch date filter: ${beforeFilter} → ${allData.length} records (removed ${beforeFilter - allData.length} records before ${fetchStartDate})`);
        }
        
        return allData;
      } else {
        console.warn(`[FETCH-ECONOMIC] ⚠️ [IPEADATA] Unexpected response format - no 'value' array`);
        return [];
      }
      
    } catch (err) {
      console.error(`[FETCH-ECONOMIC] ❌ [IPEADATA] FETCH EXCEPTION on attempt ${attempt}:`, err);
      
      if (attempt < MAX_RETRIES) {
        const delay = 3000 * attempt;
        console.log(`[FETCH-ECONOMIC] [IPEADATA] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[FETCH-ECONOMIC] ❌ [IPEADATA] ALL ${MAX_RETRIES} ATTEMPTS FAILED for ${indicatorName}`);
  return [];
}

// Generate sync metadata for WorldBank data
function generateWorldBankSyncMetadata(worldBankData: unknown): SyncMetadata {
  const metadata: SyncMetadata = {
    extracted_count: 0,
    period_start: null,
    period_end: null,
    fields_detected: ['date', 'value', 'indicator', 'country'],
    last_record_value: null,
    fetch_timestamp: new Date().toISOString()
  };

  if (!Array.isArray(worldBankData) || worldBankData.length < 2) return metadata;

  const dataArray = worldBankData[1];
  if (!Array.isArray(dataArray) || dataArray.length === 0) return metadata;

  // Filter valid entries and sort by date
  const validEntries = dataArray
    .filter((item: { date?: string; value?: number | string | null }) => 
      item.value !== null && item.value !== undefined && item.date)
    .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));

  if (validEntries.length === 0) return metadata;

  metadata.extracted_count = validEntries.length;
  metadata.period_start = `${validEntries[0].date}-01-01`;
  metadata.period_end = `${validEntries[validEntries.length - 1].date}-01-01`;
  metadata.last_record_value = String(validEntries[validEntries.length - 1].value);

  return metadata;
}

// Generate ANNUAL chunks for IBGE API (YYYYMM format) to prevent HTTP 500 errors
function generateIBGEYearChunks(startDate: Date, endDate: Date): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  let currentYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;
  
  while (currentYear <= endYear) {
    // ANNUAL chunks (1 year each) to prevent HTTP 500 from IBGE server overload
    const chunkEndYear = Math.min(currentYear, endYear);
    
    // Format: YYYYMM
    const chunkStart = `${currentYear}01`;
    const chunkEnd = chunkEndYear === endYear 
      ? `${chunkEndYear}${String(endMonth).padStart(2, '0')}` 
      : `${chunkEndYear}12`;
    
    chunks.push({ start: chunkStart, end: chunkEnd });
    currentYear = currentYear + 1;
  }
  
  return chunks;
}

// ========== NUCLEAR FIX V8.0: SIDRA FLAT DETECTION & DIRECT FETCH ==========

// Interface for SIDRA Flat row structure
interface SidraFlatRow {
  NC?: string;   // Nível code
  NN?: string;   // Nível nome
  MC?: string;   // Município/UF code
  MN?: string;   // Município/UF nome
  V?: string;    // Valor
  D1C?: string;  // Dimensão 1 code (often UF code for regional)
  D1N?: string;  // Dimensão 1 nome
  D2C?: string;  // Dimensão 2 code (often variable code)
  D2N?: string;  // Dimensão 2 nome
  D3C?: string;  // Dimensão 3 code (often period)
  D3N?: string;  // Dimensão 3 nome
  D4C?: string;  // Dimensão 4 code
  D4N?: string;  // Dimensão 4 nome
  [key: string]: string | undefined;
}

// Type for IBGE response - can be either format
type IBGEResponseData = IBGEResult[] | SidraFlatRow[];

// Detect if URL is SIDRA Flat API (apisidra.ibge.gov.br)
function isSidraFlatURL(url: string): boolean {
  return url.includes('apisidra.ibge.gov.br');
}

// Fetch SIDRA Flat directly (NO CHUNKING - returns all data at once)
async function fetchSidraFlatDirect(
  baseUrl: string,
  indicatorName: string = 'Unknown'
): Promise<SidraFlatRow[]> {
  const MAX_RETRIES = 3;
  
  console.log(`[FETCH-ECONOMIC] ====== SIDRA FLAT DIRECT FETCH: ${indicatorName} ======`);
  console.log(`[FETCH-ECONOMIC] [SIDRA-FLAT] URL: ${baseUrl.substring(0, 150)}...`);
  console.log(`[FETCH-ECONOMIC] [SIDRA-FLAT] ⚡ Using DIRECT FETCH (no chunking) - SIDRA Flat APIs return all data at once`);
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[FETCH-ECONOMIC] [SIDRA-FLAT] Attempt ${attempt}/${MAX_RETRIES}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for large responses
      
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; KnowYOU-DataCollector/1.0)'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`[FETCH-ECONOMIC] [SIDRA-FLAT] HTTP Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read response');
        console.error(`[FETCH-ECONOMIC] ❌ [SIDRA-FLAT] HTTP ERROR ${response.status}: ${errorText.substring(0, 200)}`);
        
        if (attempt < MAX_RETRIES) {
          const delay = 3000 * attempt;
          console.log(`[FETCH-ECONOMIC] [SIDRA-FLAT] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return [];
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error(`[FETCH-ECONOMIC] ❌ [SIDRA-FLAT] Response is not an array! Type: ${typeof data}`);
        return [];
      }
      
      // SIDRA Flat: first row is header, rest is data
      const totalRows = data.length;
      const dataRows = totalRows > 1 ? totalRows - 1 : 0;
      
      console.log(`[FETCH-ECONOMIC] ✅ [SIDRA-FLAT] SUCCESS: ${totalRows} total rows (${dataRows} data rows, 1 header)`);
      
      // Log sample data for debugging
      if (data.length >= 2) {
        console.log(`[FETCH-ECONOMIC] [SIDRA-FLAT] Header row keys: ${Object.keys(data[0] || {}).join(', ')}`);
        console.log(`[FETCH-ECONOMIC] [SIDRA-FLAT] First data row: D1C=${data[1]?.D1C}, D2C=${data[1]?.D2C}, D3C=${data[1]?.D3C}, V=${data[1]?.V}`);
      }
      
      return data as SidraFlatRow[];
      
    } catch (err) {
      console.error(`[FETCH-ECONOMIC] ❌ [SIDRA-FLAT] FETCH EXCEPTION on attempt ${attempt}:`, err);
      
      if (attempt < MAX_RETRIES) {
        const delay = 3000 * attempt;
        console.log(`[FETCH-ECONOMIC] [SIDRA-FLAT] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[FETCH-ECONOMIC] ❌ [SIDRA-FLAT] ALL ${MAX_RETRIES} ATTEMPTS FAILED for ${indicatorName}`);
  return [];
}

// Generate sync metadata from SIDRA Flat response
function generateSidraFlatSyncMetadata(data: SidraFlatRow[]): SyncMetadata {
  const metadata: SyncMetadata = {
    extracted_count: 0,
    period_start: null,
    period_end: null,
    fields_detected: ['D1C', 'D2C', 'D3C', 'V'],
    last_record_value: null,
    fetch_timestamp: new Date().toISOString()
  };

  if (!data || data.length < 2) return metadata; // Need header + at least 1 data row

  // Skip header row
  const dataRows = data.slice(1);
  metadata.extracted_count = dataRows.length;

  // Extract periods dynamically (check D3C, D4C, D5C)
  const periods: string[] = [];
  let lastValue: string | null = null;
  
  // Find period field
  const periodFields = ['D3C', 'D4C', 'D5C'];
  let periodField: string | null = null;
  
  for (const field of periodFields) {
    const testValue = dataRows[0]?.[field];
    if (testValue && /^\d{4,6}$/.test(testValue)) {
      periodField = field;
      break;
    }
  }

  if (periodField) {
    for (const row of dataRows) {
      const period = row[periodField];
      const value = row.V;
      
      if (period && /^\d{4,6}$/.test(period) && value && value !== '..' && value !== '-' && value !== '...') {
        periods.push(period);
        lastValue = value;
      }
    }
  }

  if (periods.length > 0) {
    periods.sort();
    const formatPeriod = (p: string) => {
      if (p.length === 6) return `${p.substring(0, 4)}-${p.substring(4, 6)}-01`;
      return `${p}-01-01`;
    };
    metadata.period_start = formatPeriod(periods[0]);
    metadata.period_end = formatPeriod(periods[periods.length - 1]);
    metadata.last_record_value = lastValue;
  }

  console.log(`[FETCH-ECONOMIC] [SIDRA-FLAT] Sync metadata: ${metadata.extracted_count} records, period ${metadata.period_start} to ${metadata.period_end}`);
  
  return metadata;
}

// Fetch IBGE data with chunking to avoid HTTP 500 from server overload
// NUCLEAR FIX: Detects SIDRA Flat URLs and uses direct fetch instead of chunking
async function fetchIBGEWithChunking(
  baseUrl: string, 
  fetchStartDate: string | null, 
  fetchEndDate: string | null,
  indicatorName: string = 'Unknown'
): Promise<IBGEResponseData> {
  
  // ========== NUCLEAR FIX: SIDRA FLAT DETECTION ==========
  // SIDRA Flat APIs (apisidra.ibge.gov.br) return ALL data in a single response
  // Chunking CORRUPTS the data because it assumes IBGEResult[] structure
  // Solution: Detect SIDRA Flat URLs and use DIRECT FETCH without chunking
  
  if (isSidraFlatURL(baseUrl)) {
    console.log(`[FETCH-ECONOMIC] ═══════════════════════════════════════════════════`);
    console.log(`[FETCH-ECONOMIC] 🎯 NUCLEAR FIX: Detected SIDRA FLAT URL`);
    console.log(`[FETCH-ECONOMIC] 🎯 Using DIRECT FETCH (no chunking) to preserve data integrity`);
    console.log(`[FETCH-ECONOMIC] ═══════════════════════════════════════════════════`);
    
    const sidraFlatData = await fetchSidraFlatDirect(baseUrl, indicatorName);
    
    // Return as-is - the calling code will detect SIDRA Flat format during parsing
    return sidraFlatData as unknown as IBGEResult[];
  }
  
  // ========== STANDARD IBGE JSON PROCESSING (servicodados.ibge.gov.br) ==========
  const allData: IBGEResult[] = [];
  const MAX_RETRIES = 3;
  
  // Use configured dates or fallback to defaults
  const startDate = fetchStartDate ? new Date(fetchStartDate) : new Date('2012-01-01');
  const endDate = fetchEndDate ? new Date(fetchEndDate) : new Date();
  
  console.log(`[FETCH-ECONOMIC] ====== IBGE CHUNKING AUDIT: ${indicatorName} ======`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Base URL: ${baseUrl}`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Configured fetch_start_date: ${fetchStartDate}`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Configured fetch_end_date: ${fetchEndDate}`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Effective start: ${startDate.toISOString().substring(0, 10)}`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Effective end: ${endDate.toISOString().substring(0, 10)}`);
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error(`[FETCH-ECONOMIC] ❌ [IBGE] INVALID DATES! Start: ${fetchStartDate}, End: ${fetchEndDate}`);
    return [];
  }
  
  if (startDate >= endDate) {
    console.error(`[FETCH-ECONOMIC] ❌ [IBGE] START DATE >= END DATE! No data to fetch.`);
    return [];
  }
  
  // Generate 3-year chunks
  const chunks = generateIBGEYearChunks(startDate, endDate);
  
  console.log(`[FETCH-ECONOMIC] [IBGE] ${indicatorName} - chunking into ${chunks.length} ANNUAL periods`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Chunks:`, JSON.stringify(chunks));
  
  // ========== UNIFIED URL PERIOD DETECTION ==========
  // Priority 1: Check for {PERIOD} placeholder (dynamic URL)
  const hasPlaceholder = baseUrl.includes('{PERIOD}');
  
  // Priority 2: Check for negative period (e.g., -120 = last 120 periods) - NO CHUNKING NEEDED
  const negativePeriodMatch = baseUrl.match(/\/periodos\/(-\d+)\//);
  
  // Priority 3: Check for fixed period format YYYYMM-YYYYMM
  const fixedPeriodRegex = /\/periodos\/(\d{6})-(\d{6})\//;
  const fixedPeriodMatch = baseUrl.match(fixedPeriodRegex);
  
  console.log(`[FETCH-ECONOMIC] [IBGE] URL Analysis:`);
  console.log(`[FETCH-ECONOMIC] [IBGE]   - Has {PERIOD} placeholder: ${hasPlaceholder}`);
  console.log(`[FETCH-ECONOMIC] [IBGE]   - Has negative period: ${negativePeriodMatch ? negativePeriodMatch[1] : 'NO'}`);
  console.log(`[FETCH-ECONOMIC] [IBGE]   - Has fixed period: ${fixedPeriodMatch ? `${fixedPeriodMatch[1]}-${fixedPeriodMatch[2]}` : 'NO'}`);
  
  // ========== V7.3 FIX: USE NEGATIVE PERIOD DIRECTLY (NO CONVERSION) ==========
  // Negative periods like -40 work universally for ALL IBGE aggregates (monthly, quarterly, annual)
  // Converting to YYYYMM-YYYYMM format breaks quarterly aggregates like PIB
  if (negativePeriodMatch) {
    const negativePeriod = negativePeriodMatch[1];
    console.log(`[FETCH-ECONOMIC] [IBGE] ✅ NEGATIVE PERIOD DETECTED: ${negativePeriod}`);
    console.log(`[FETCH-ECONOMIC] [IBGE] ✅ V7.3: Using negative period DIRECTLY (no conversion)`);
    console.log(`[FETCH-ECONOMIC] [IBGE] ✅ This format works for ALL periodicities (monthly, quarterly, annual)`);
    
    // SINGLE FETCH with original negative period URL
    try {
      console.log(`[FETCH-ECONOMIC] [IBGE] 📤 Fetching: ${baseUrl.substring(0, 150)}...`);
      const response = await fetch(baseUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; KnowYOU-Bot/1.0)'
        }
      });
      
      console.log(`[FETCH-ECONOMIC] [IBGE] HTTP Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[FETCH-ECONOMIC] [IBGE] ✅ Single fetch SUCCESS with negative period`);
        return data as IBGEResult[];
      } else {
        const errorText = await response.text();
        console.error(`[FETCH-ECONOMIC] ❌ [IBGE] HTTP ERROR ${response.status}: ${errorText}`);
      }
    } catch (e) {
      console.error(`[FETCH-ECONOMIC] ❌ [IBGE] Fetch with negative period failed:`, e);
    }
    return [];
  }
  
  // ========== For non-negative period URLs: proceed with chunking ==========
  let effectiveUrl = baseUrl;
  let effectiveHasPlaceholder = hasPlaceholder;
  let effectiveFixedPeriodMatch = fixedPeriodMatch;
  
  // ========== VALIDATE URL CAN BE CHUNKED ==========
  if (!effectiveHasPlaceholder && !effectiveFixedPeriodMatch) {
    console.error(`[FETCH-ECONOMIC] ❌ [IBGE] Cannot chunk URL - no {PERIOD} placeholder or fixed period found`);
    console.error(`[FETCH-ECONOMIC] ❌ [IBGE] URL: ${effectiveUrl}`);
    // Fallback: try single request
    try {
      const response = await fetch(effectiveUrl);
      if (response.ok) {
        const data = await response.json();
        return data as IBGEResult[];
      }
    } catch (e) {
      console.error(`[FETCH-ECONOMIC] ❌ [IBGE] Fallback fetch failed:`, e);
    }
    return [];
  }
  
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const periodFormat = `${chunk.start}-${chunk.end}`;
    
    // Build chunk URL based on detected pattern (using effective values from V7.1)
    let chunkUrl: string;
    if (effectiveHasPlaceholder) {
      // Replace {PERIOD} placeholder with actual period
      chunkUrl = effectiveUrl.replace('{PERIOD}', periodFormat);
    } else {
      // Replace fixed period with chunk period
      chunkUrl = effectiveUrl.replace(fixedPeriodRegex, `/periodos/${periodFormat}/`);
    }
    
    console.log(`[FETCH-ECONOMIC] [IBGE] 📤 Chunk URL: ${chunkUrl.substring(0, 180)}...`);
    
    console.log(`[FETCH-ECONOMIC] [IBGE] Chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.start} to ${chunk.end}`);
    
    let lastError: Error | null = null;
    
    // Retry loop for each chunk
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[FETCH-ECONOMIC] [IBGE] Attempt ${attempt}/${MAX_RETRIES} - Fetching: ${chunkUrl.substring(0, 150)}...`);
        
        const response = await fetch(chunkUrl);
        
        console.log(`[FETCH-ECONOMIC] [IBGE] HTTP Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read response body');
          console.error(`[FETCH-ECONOMIC] ❌ [IBGE] HTTP ERROR ${response.status}: ${errorText.substring(0, 200)}`);
          
          if (response.status === 500) {
            console.error(`[FETCH-ECONOMIC] ❌ [IBGE] 500 Internal Server Error - IBGE server overloaded. Reducing chunk size may help.`);
          }
          
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          
          if (attempt < MAX_RETRIES) {
            const delay = 3000 * attempt; // 3s, 6s, 9s exponential backoff for IBGE resilience
            console.log(`[FETCH-ECONOMIC] [IBGE] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          break;
        }
        
        const data = await response.json() as IBGEResult[];
        
        if (Array.isArray(data) && data.length > 0) {
          allData.push(...data);
          
          // Count records in this chunk
          let chunkRecords = 0;
          if (data[0]?.resultados) {
            for (const resultado of data[0].resultados) {
              for (const serie of resultado.series || []) {
                const serieData = serie.serie || {};
                chunkRecords += Object.keys(serieData).length;
              }
            }
          }
          
          console.log(`[FETCH-ECONOMIC] ✅ [IBGE] Chunk ${chunkIndex + 1} success: ${chunkRecords} records`);
        } else {
          console.log(`[FETCH-ECONOMIC] ⚠️ [IBGE] Chunk ${chunkIndex + 1} returned empty data`);
        }
        
        lastError = null;
        break; // Success, exit retry loop
        
      } catch (err) {
        console.error(`[FETCH-ECONOMIC] ❌ [IBGE] FETCH EXCEPTION on attempt ${attempt}:`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (attempt < MAX_RETRIES) {
          const delay = 3000 * attempt; // 3s, 6s, 9s exponential backoff
          console.log(`[FETCH-ECONOMIC] [IBGE] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (lastError) {
      console.error(`[FETCH-ECONOMIC] ❌ [IBGE] CHUNK ${chunkIndex + 1} FAILED after ${MAX_RETRIES} attempts: ${lastError.message}`);
    }
    
    // Longer delay between chunks for IBGE (1.5s) for resilience and to avoid rate limiting
    if (chunkIndex < chunks.length - 1) {
      console.log(`[FETCH-ECONOMIC] [IBGE] Waiting 1500ms before next chunk...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.log(`[FETCH-ECONOMIC] [IBGE] ${indicatorName} ====== TOTAL CHUNKS FETCHED: ${allData.length} ======`);
  
  if (allData.length === 0) {
    console.warn(`[FETCH-ECONOMIC] ⚠️ [IBGE] WARNING: ZERO DATA CHUNKS FETCHED!`);
    console.warn(`[FETCH-ECONOMIC] ⚠️ [IBGE] Check: 1) URL format, 2) Date range validity, 3) IBGE API availability`);
  }
  
  // Merge results - IBGE returns array with single element containing nested resultados
  // We need to merge all chunks into a single coherent structure
  if (allData.length === 0) return [];
  if (allData.length === 1) return allData;
  
  // Merge multiple IBGE responses into one
  const mergedResult: IBGEResult = {
    id: allData[0].id,
    variavel: allData[0].variavel,
    unidade: allData[0].unidade,
    resultados: []
  };
  
  // Merge all series data
  const mergedSerieData: Record<string, string> = {};
  
  for (const ibgeResult of allData) {
    if (!ibgeResult.resultados) continue;
    for (const resultado of ibgeResult.resultados) {
      for (const serie of resultado.series || []) {
        const serieData = serie.serie || {};
        for (const [period, value] of Object.entries(serieData)) {
          if (value && value !== '-' && value !== '...' && value !== '..') {
            mergedSerieData[period] = value;
          }
        }
      }
    }
  }
  
  // Reconstruct merged result
  if (allData[0].resultados && allData[0].resultados[0]) {
    const templateResultado = allData[0].resultados[0];
    mergedResult.resultados = [{
      classificacoes: templateResultado.classificacoes,
      series: [{
        localidade: templateResultado.series[0]?.localidade || { id: '', nivel: { id: '', nome: '' }, nome: '' },
        serie: mergedSerieData
      }]
    }];
  }
  
  console.log(`[FETCH-ECONOMIC] [IBGE] Merged ${Object.keys(mergedSerieData).length} total periods from ${allData.length} chunks`);
  
  return [mergedResult];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const requestBody = await req.json().catch(() => ({}));
    const { indicatorId, fetchAll, forceRefresh, autoMode } = requestBody;

    console.log('[FETCH-ECONOMIC] ====== REQUEST RECEIVED ======');
    console.log('[FETCH-ECONOMIC] Raw request body:', JSON.stringify(requestBody));
    console.log('[FETCH-ECONOMIC] Parsed parameters:', { indicatorId, fetchAll, forceRefresh, autoMode });
    console.log('[FETCH-ECONOMIC] forceRefresh type:', typeof forceRefresh);
    console.log('[FETCH-ECONOMIC] forceRefresh === true:', forceRefresh === true);

    // Get indicators to fetch
    let indicatorsQuery = supabase
      .from('economic_indicators')
      .select(`id, name, code, unit, api_id, is_regional, system_api_registry!inner (id, name, provider, base_url, status, fetch_start_date, fetch_end_date, redundant_api_url, redundant_aggregate_id, target_table)`)
      .eq('system_api_registry.status', 'active');

    if (!fetchAll && indicatorId) {
      indicatorsQuery = indicatorsQuery.eq('id', indicatorId);
    }

    const { data: indicators, error: indicatorsError } = await indicatorsQuery;

    if (indicatorsError) throw indicatorsError;

    if (!indicators || indicators.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No indicators to fetch', recordsInserted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ====== FORCE REFRESH: Zero-Base Sync with VERIFICATION ======
    let zeroBaseExecuted = false;
    let totalDeleted = 0;
    
    if (forceRefresh === true) {
      console.log('[FETCH-ECONOMIC] ☢️☢️☢️ FORCE REFRESH MODE: Nuclear Zero-Base Sync ☢️☢️☢️');
      console.log('[FETCH-ECONOMIC] forceRefresh is TRUE - executing Zero-Base cleanup');
      console.log('[FETCH-ECONOMIC] Phase 1: Counting records BEFORE deletion...');
      
      zeroBaseExecuted = true;
      
      for (const indicator of indicators) {
        // Step 1: Count records BEFORE delete
        const { count: beforeCount, error: countError } = await supabase
          .from('indicator_values')
          .select('*', { count: 'exact', head: true })
          .eq('indicator_id', indicator.id);
        
        if (countError) {
          console.error(`[FETCH-ECONOMIC] ❌ Count failed for ${indicator.name}:`, countError);
          continue;
        }
        
        console.log(`[FETCH-ECONOMIC] ☢️ ${indicator.name}: ${beforeCount ?? 0} records BEFORE delete`);
        
        // Step 2: Execute DELETE with count confirmation
        console.log(`[FETCH-ECONOMIC] ☢️ Executing DELETE for: ${indicator.name} (${indicator.id})`);
        
        const { error: deleteError, count: deletedCount } = await supabase
          .from('indicator_values')
          .delete({ count: 'exact' })
          .eq('indicator_id', indicator.id);
        
        if (deleteError) {
          console.error(`[FETCH-ECONOMIC] ❌ DELETE FAILED for ${indicator.name}:`, deleteError);
          console.error(`[FETCH-ECONOMIC] Error code: ${deleteError.code}`);
          console.error(`[FETCH-ECONOMIC] Error message: ${deleteError.message}`);
          throw new Error(`Zero-Base DELETE failed for ${indicator.name}: ${deleteError.message}`);
        }
        
        totalDeleted += deletedCount ?? 0;
        console.log(`[FETCH-ECONOMIC] ✅ DELETED ${deletedCount ?? 'confirmed'} records for ${indicator.name} (Running total: ${totalDeleted})`);
        
        // Step 3: VERIFY table is truly empty
        const { count: afterCount, error: verifyError } = await supabase
          .from('indicator_values')
          .select('*', { count: 'exact', head: true })
          .eq('indicator_id', indicator.id);
        
        if (verifyError) {
          console.error(`[FETCH-ECONOMIC] ❌ Verification failed for ${indicator.name}:`, verifyError);
          throw new Error(`Zero-Base verification failed for ${indicator.name}`);
        }
        
        if (afterCount && afterCount > 0) {
          console.error(`[FETCH-ECONOMIC] ❌ CRITICAL: ${afterCount} records STILL EXIST after DELETE!`);
          throw new Error(`Zero-Base incomplete: ${afterCount} records remain for ${indicator.name}`);
        }
        
        console.log(`[FETCH-ECONOMIC] ✅ VERIFIED: ${indicator.name} table is EMPTY (0 records)`);
      }
      
      console.log(`[FETCH-ECONOMIC] ☢️☢️☢️ Zero-Base cleanup COMPLETE. Total deleted: ${totalDeleted}. All tables verified EMPTY. ☢️☢️☢️`);
      console.log('[FETCH-ECONOMIC] Proceeding with fresh data insertion...');
    } else {
      console.log('[FETCH-ECONOMIC] forceRefresh is NOT true - skipping Zero-Base cleanup');
      console.log('[FETCH-ECONOMIC] forceRefresh value:', forceRefresh);
    }

    let totalRecordsInserted = 0;
    let newRecordsCount = 0;
    const results: Array<{ indicator: string; records: number; status: string; newRecords: number }> = [];

    for (const indicator of indicators) {
      try {
        const apiConfigRaw = indicator.system_api_registry;
        if (!apiConfigRaw) continue;
        
        // Handle both array and object cases from Supabase
        const apiConfig: ApiConfig = Array.isArray(apiConfigRaw) ? apiConfigRaw[0] : apiConfigRaw;
        if (!apiConfig) continue;

        console.log(`[FETCH-ECONOMIC] Fetching ${indicator.name} from ${apiConfig.provider}...`);
        console.log(`[FETCH-ECONOMIC] Base URL: ${apiConfig.base_url}`);

        let data: unknown;
        let syncMetadata: SyncMetadata | null = null;
        let httpStatus: number | null = null;
        let rawResponse: unknown = null; // Store raw JSON for observability
        
        // ====== AUTO MODE: Calculate dynamic start date ======
        let effectiveStartDate = apiConfig.fetch_start_date;
        
        if (autoMode && !forceRefresh) {
          console.log(`[FETCH-ECONOMIC] [AUTO MODE] Calculating dynamic start date for ${indicator.name}`);
          
          const { data: lastRecord, error: lastRecordError } = await supabase
            .from('indicator_values')
            .select('reference_date')
            .eq('indicator_id', indicator.id)
            .order('reference_date', { ascending: false })
            .limit(1)
            .single();
          
          if (lastRecord && !lastRecordError) {
            const lastDate = new Date(lastRecord.reference_date);
            lastDate.setDate(lastDate.getDate() + 1);
            effectiveStartDate = lastDate.toISOString().substring(0, 10);
            console.log(`[FETCH-ECONOMIC] [AUTO MODE] Last record: ${lastRecord.reference_date}, starting from: ${effectiveStartDate}`);
          } else {
            console.log(`[FETCH-ECONOMIC] [AUTO MODE] No existing records, using configured start: ${effectiveStartDate}`);
          }
          
          // Update last_auto_fetch timestamp
          await supabase.from('system_api_registry').update({
            last_auto_fetch: new Date().toISOString()
          }).eq('id', apiConfig.id);
        }

        // Use chunking strategy for BCB to avoid 10-year limit (406 error)
        // NOW PASSING CONFIGURED DATES FROM DATABASE
        if (apiConfig.provider === 'BCB') {
          console.log(`[FETCH-ECONOMIC] 🔄 Starting BCB fetch for: ${indicator.name}`);
          console.log(`[FETCH-ECONOMIC] Using dates for ${indicator.name}: ${effectiveStartDate} to ${apiConfig.fetch_end_date}`);
          let bcbData = await fetchBCBWithChunking(apiConfig.base_url, effectiveStartDate, apiConfig.fetch_end_date, indicator.name);
          
          // CONTINGENCY: If Linha 1 returns zero data and redundant URL exists
          if (bcbData.length === 0 && apiConfig.redundant_api_url) {
            console.log(`[FETCH-ECONOMIC] ⚠️ [CONTINGENCY] Linha 1 retornou 0 dados, tentando Linha 2 (redundância)...`);
            console.log(`[FETCH-ECONOMIC] [CONTINGENCY] URL Redundante: ${apiConfig.redundant_api_url}`);
            bcbData = await fetchBCBWithChunking(apiConfig.redundant_api_url, effectiveStartDate, apiConfig.fetch_end_date, `${indicator.name} (Linha 2)`);
            if (bcbData.length > 0) {
              console.log(`[FETCH-ECONOMIC] ✅ [CONTINGENCY] Linha 2 sucesso: ${bcbData.length} registros`);
            }
          }
          
          data = bcbData;
          rawResponse = bcbData; // Store for observability
          syncMetadata = generateSyncMetadata(bcbData, 'BCB');
          httpStatus = bcbData.length > 0 ? 200 : null;
          console.log(`[FETCH-ECONOMIC] 📊 BCB fetch complete for ${indicator.name}: ${bcbData.length} data points`);
        } else if (apiConfig.provider === 'IBGE') {
          // IBGE: Use chunking to avoid HTTP 500 from server overload
          // NUCLEAR FIX: fetchIBGEWithChunking now detects SIDRA Flat URLs and returns raw data
          console.log(`[FETCH-ECONOMIC] 🔄 Starting IBGE fetch for: ${indicator.name}`);
          console.log(`[FETCH-ECONOMIC] Using dates for ${indicator.name}: ${effectiveStartDate} to ${apiConfig.fetch_end_date}`);
          console.log(`[FETCH-ECONOMIC] URL Type: ${isSidraFlatURL(apiConfig.base_url) ? 'SIDRA FLAT (apisidra)' : 'SIDRA JSON (servicodados)'}`);
          
          let ibgeData = await fetchIBGEWithChunking(apiConfig.base_url, effectiveStartDate, apiConfig.fetch_end_date, indicator.name);
          
          // CONTINGENCY: If Linha 1 returns zero data and redundant URL exists
          if (ibgeData.length === 0 && apiConfig.redundant_api_url) {
            console.log(`[FETCH-ECONOMIC] ⚠️ [CONTINGENCY] Linha 1 IBGE retornou 0 dados, tentando Linha 2 (redundância)...`);
            console.log(`[FETCH-ECONOMIC] [CONTINGENCY] URL Redundante: ${apiConfig.redundant_api_url}`);
            ibgeData = await fetchIBGEWithChunking(apiConfig.redundant_api_url, effectiveStartDate, apiConfig.fetch_end_date, `${indicator.name} (Linha 2)`);
            if (ibgeData.length > 0) {
              console.log(`[FETCH-ECONOMIC] ✅ [CONTINGENCY] Linha 2 IBGE sucesso: ${ibgeData.length} rows/chunks`);
            }
          }
          
          data = ibgeData;
          rawResponse = ibgeData; // Store for observability
          
          // NUCLEAR FIX: Generate appropriate sync metadata based on data format
          // SIDRA Flat: array with D2C, D3C, V fields (first row is header)
          // SIDRA JSON: array with resultados/series structure
          const isSidraFlatData = Array.isArray(ibgeData) && ibgeData.length > 1 && 
            (ibgeData as any[])[1]?.D2C !== undefined && (ibgeData as any[])[1]?.V !== undefined;
          
          if (isSidraFlatData) {
            console.log(`[FETCH-ECONOMIC] [IBGE] Generating SIDRA FLAT sync metadata`);
            syncMetadata = generateSidraFlatSyncMetadata(ibgeData as unknown as SidraFlatRow[]);
          } else {
            console.log(`[FETCH-ECONOMIC] [IBGE] Generating SIDRA JSON sync metadata`);
            syncMetadata = generateIBGESyncMetadata(ibgeData as IBGEResult[]);
          }
          
          httpStatus = ibgeData.length > 0 ? 200 : null;
          console.log(`[FETCH-ECONOMIC] 📊 IBGE fetch complete for ${indicator.name}: ${ibgeData.length} rows/chunks, metadata: ${syncMetadata.extracted_count} records`);
        } else if (apiConfig.provider === 'IPEADATA') {
          // IPEADATA: OData v4 API with filter support
          console.log(`[FETCH-ECONOMIC] 🔄 Starting IPEADATA fetch for: ${indicator.name}`);
          console.log(`[FETCH-ECONOMIC] Using dates for ${indicator.name}: ${effectiveStartDate} to ${apiConfig.fetch_end_date}`);
          
          let ipeadataData = await fetchIPEADATA(apiConfig.base_url, effectiveStartDate, apiConfig.fetch_end_date, indicator.name);
          
          // CONTINGENCY: If primary returns zero data and redundant URL exists
          if (ipeadataData.length === 0 && apiConfig.redundant_api_url) {
            console.log(`[FETCH-ECONOMIC] ⚠️ [CONTINGENCY] IPEADATA Linha 1 retornou 0 dados, tentando Linha 2 (redundância)...`);
            console.log(`[FETCH-ECONOMIC] [CONTINGENCY] URL Redundante: ${apiConfig.redundant_api_url}`);
            ipeadataData = await fetchIPEADATA(apiConfig.redundant_api_url, effectiveStartDate, apiConfig.fetch_end_date, `${indicator.name} (Linha 2)`);
            if (ipeadataData.length > 0) {
              console.log(`[FETCH-ECONOMIC] ✅ [CONTINGENCY] Linha 2 IPEADATA sucesso: ${ipeadataData.length} registros`);
            }
          }
          
          data = { value: ipeadataData };
          // Sort by date descending and get most recent 50 records for observability
          const sortedForDisplay = [...ipeadataData].sort((a, b) => 
            b.VALDATA.localeCompare(a.VALDATA)
          );
          rawResponse = { value: sortedForDisplay.slice(0, 50) };
          syncMetadata = generateIPEADATASyncMetadata({ value: ipeadataData });
          httpStatus = ipeadataData.length > 0 ? 200 : null;
          console.log(`[FETCH-ECONOMIC] 📊 IPEADATA fetch complete for ${indicator.name}: ${ipeadataData.length} data points`);
        } else if (apiConfig.provider === 'IMF' || apiConfig.provider === 'WorldBank' || apiConfig.provider === 'YahooFinance') {
          // INTERNATIONAL APIS: Use ultra-resilience protocol with fallback
          console.log(`[FETCH-ECONOMIC] 🌍 Starting INTERNATIONAL fetch for: ${indicator.name}`);
          console.log(`[FETCH-ECONOMIC] Provider: ${apiConfig.provider}`);
          console.log(`[FETCH-ECONOMIC] Fallback URL: ${apiConfig.redundant_api_url ? 'Available' : 'None'}`);
          
          const intlResult = await fetchInternationalAPI(
            apiConfig.base_url,
            apiConfig.provider,
            apiConfig.redundant_api_url,
            indicator.name
          );
          
          if (!intlResult.success) {
            console.error(`[FETCH-ECONOMIC] ❌ International API failed for ${indicator.name}: ${intlResult.error}`);
            
            // Update API registry with error status
            await supabase.from('system_api_registry').update({
              status: 'error',
              last_checked_at: new Date().toISOString(),
              last_http_status: intlResult.httpStatus,
              last_sync_metadata: {
                extracted_count: 0,
                period_start: null,
                period_end: null,
                fields_detected: [],
                last_record_value: null,
                fetch_timestamp: new Date().toISOString(),
                error: intlResult.error
              }
            }).eq('id', apiConfig.id);
            
            results.push({ indicator: indicator.name, records: 0, status: 'error', newRecords: 0 });
            continue;
          }
          
          httpStatus = intlResult.httpStatus || 200;
          data = intlResult.data;
          rawResponse = intlResult.data;
          
          console.log(`[FETCH-ECONOMIC] ✅ International fetch success for ${indicator.name} via ${intlResult.provider}`);
          if (intlResult.usedFallback) {
            console.log(`[FETCH-ECONOMIC] ⚠️ Used FALLBACK provider: ${intlResult.provider}`);
          }
        } else {
          // Other generic providers: standard fetch with basic resilience
          console.log(`[FETCH-ECONOMIC] 🔄 Starting generic fetch for: ${indicator.name} (${apiConfig.provider})`);
          
          try {
            const response = await fetchWithHTTP2Resilience(apiConfig.base_url, { method: 'GET' }, 3, apiConfig.provider);
            httpStatus = response.status;
            
            if (!response.ok) {
              console.error(`[FETCH-ECONOMIC] API error for ${indicator.name}: ${response.status}`);
              
              await supabase.from('system_api_registry').update({
                status: 'error',
                last_checked_at: new Date().toISOString(),
                last_http_status: response.status,
                last_sync_metadata: {
                  extracted_count: 0,
                  period_start: null,
                  period_end: null,
                  fields_detected: [],
                  last_record_value: null,
                  fetch_timestamp: new Date().toISOString(),
                  error: `HTTP ${response.status}`
                }
              }).eq('id', apiConfig.id);
              
              results.push({ indicator: indicator.name, records: 0, status: 'error', newRecords: 0 });
              continue;
            }
            data = await response.json();
          } catch (fetchError) {
            const err = fetchError as Error;
            console.error(`[FETCH-ECONOMIC] ❌ Fetch failed for ${indicator.name}: ${err.message}`);
            
            await supabase.from('system_api_registry').update({
              status: 'error',
              last_checked_at: new Date().toISOString(),
              last_sync_metadata: {
                extracted_count: 0,
                error: err.message,
                fetch_timestamp: new Date().toISOString()
              }
            }).eq('id', apiConfig.id);
            
            results.push({ indicator: indicator.name, records: 0, status: 'error', newRecords: 0 });
            continue;
          }
        }

        let valuesToInsert: Array<{ indicator_id: string; reference_date: string; value: number }> = [];

        if (apiConfig.provider === 'BCB') {
          // BCB returns array of {data: "DD/MM/YYYY", valor: "X.XX"}
          const bcbData = data as BCBDataPoint[];
          console.log(`[FETCH-ECONOMIC] BCB data points received: ${bcbData.length}`);
          
          // Future date validation - reject dates after today
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          
          valuesToInsert = bcbData.map((item) => {
            const [day, month, year] = item.data.split('/');
            const refDate = `${year}-${month}-${day}`;
            const refDateObj = new Date(refDate);
            
            // Reject future dates
            if (refDateObj > today) {
              console.warn(`[FETCH-ECONOMIC] [BCB] Rejecting future date: ${refDate}`);
              return null;
            }
            
            return {
              indicator_id: indicator.id,
              reference_date: refDate,
              value: parseFloat(item.valor.replace(',', '.')),
            };
          }).filter((v): v is { indicator_id: string; reference_date: string; value: number } => v !== null && !isNaN(v.value));
          
        } else if (apiConfig.provider === 'IBGE') {
          // IBGE SIDRA returns two formats:
          // 1) SIDRA JSON: nested structure with resultados/series (servicodados.ibge.gov.br)
          // 2) SIDRA Flat: flat array with D2C/D3C/V fields (apisidra.ibge.gov.br)
          console.log(`[FETCH-ECONOMIC] IBGE response received, parsing...`);
          
          // Check if this is a regional indicator (has UF data)
          const isRegionalIndicator = (indicator as any).is_regional === true || 
            apiConfig.target_table === 'indicator_regional_values';
          
          // Array for regional values (by UF)
          const regionalValuesToInsert: Array<{ indicator_id: string; uf_code: number; reference_date: string; value: number }> = [];
          
          // ======= DETECT SIDRA FLAT FORMAT =======
          // SIDRA Flat: Array with D2C (UF code), D3C (period), V (value) fields
          // CRITICAL FIX: First row is HEADER (contains field descriptions like "Mês", "Unidade Territorial")
          // Data rows START FROM INDEX 1, not 0 - so we must check data[1] for detection
          const isSidraFlat = Array.isArray(data) && data.length > 1 && 
            data[1]?.D2C !== undefined && data[1]?.V !== undefined;
          
          console.log(`[FETCH-ECONOMIC] [IBGE] SIDRA FLAT detection check:`);
          console.log(`[FETCH-ECONOMIC] [IBGE]   - Is array: ${Array.isArray(data)}`);
          console.log(`[FETCH-ECONOMIC] [IBGE]   - Length: ${Array.isArray(data) ? (data as any[]).length : 'N/A'}`);
          if (Array.isArray(data) && (data as any[]).length > 1) {
            console.log(`[FETCH-ECONOMIC] [IBGE]   - data[0] keys: ${Object.keys(data[0] || {}).join(', ')}`);
            console.log(`[FETCH-ECONOMIC] [IBGE]   - data[1] keys: ${Object.keys(data[1] || {}).join(', ')}`);
            console.log(`[FETCH-ECONOMIC] [IBGE]   - data[1].D2C: ${(data as any[])[1]?.D2C}`);
            console.log(`[FETCH-ECONOMIC] [IBGE]   - data[1].V: ${(data as any[])[1]?.V}`);
          }
          console.log(`[FETCH-ECONOMIC] [IBGE]   - isSidraFlat result: ${isSidraFlat}`);
          
          if (isSidraFlat) {
            console.log(`[FETCH-ECONOMIC] [IBGE] Detected SIDRA FLAT format (apisidra.ibge.gov.br)`);
            const sidraData = data as Array<Record<string, string>>;
            
            // Skip first row (header with field descriptions)
            const dataRows = sidraData.slice(1);
            console.log(`[FETCH-ECONOMIC] [IBGE] SIDRA Flat: ${dataRows.length} data rows`);
            
            // Detect period field dynamically (D3C most common, then D4C, D5C)
            const findPeriodField = (rows: any[]): string | null => {
              const candidates = ['D3C', 'D4C', 'D5C'];
              for (const field of candidates) {
                if (rows[0]?.[field]) {
                  const value = String(rows[0][field]);
                  if (/^\d{4,6}$/.test(value)) return field;
                }
              }
              return null;
            };
            
            const periodField = findPeriodField(dataRows);
            console.log(`[FETCH-ECONOMIC] [IBGE] SIDRA Flat period field detected: ${periodField}`);
            
            // ========== PAC TABLE 1407 DETECTION ==========
            // PAC uses different field structure:
            // - D3C contains UF category codes (106775-106801) which map to IBGE UF codes (11-53)
            // - D4C contains year (2007, 2008, etc.)
            const isPAC = isPACTable1407(apiConfig.base_url);
            console.log(`[FETCH-ECONOMIC] [IBGE] PAC Table 1407 detected: ${isPAC}`);
            
            // Check if D1C contains standard UF codes (2-digit state codes 11-53)
            // Or if D3C contains PAC category codes (106775-106801)
            const hasStandardUFData = dataRows.some(row => {
              const d1c = row.D1C;
              if (!d1c) return false;
              const code = parseInt(d1c);
              return !isNaN(code) && code >= 11 && code <= 53;
            });
            
            // PAC Table 1407 with c12354/all: UF category codes can be in D3C, D4C, or D5C
            // depending on URL structure. Search all fields for PAC codes 106775-106801
            const findPACUFField = (rows: any[]): string | null => {
              const candidates = ['D3C', 'D4C', 'D5C', 'D2C'];
              for (const field of candidates) {
                const hasValidPACCode = rows.some(row => {
                  const value = row[field];
                  return value && PAC_UF_CODE_MAP[value] !== undefined;
                });
                if (hasValidPACCode) return field;
              }
              return null;
            };
            
            const pacUfField = isPAC ? findPACUFField(dataRows) : null;
            const hasPACUFData = !!pacUfField;
            
            const hasUFData = hasStandardUFData || hasPACUFData;
            
            console.log(`[FETCH-ECONOMIC] [IBGE] SIDRA Flat has standard UF data (D1C): ${hasStandardUFData}`);
            console.log(`[FETCH-ECONOMIC] [IBGE] SIDRA Flat has PAC UF data: ${hasPACUFData}, field: ${pacUfField}`);
            console.log(`[FETCH-ECONOMIC] [IBGE] Is regional indicator: ${isRegionalIndicator}`);
            
            // ========== COMPREHENSIVE DEBUGGING FOR SIDRA FLAT PARSING ==========
            console.log(`[FETCH-ECONOMIC] [DEBUG] ========== SIDRA FLAT PARSING START ==========`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Total data rows to parse: ${dataRows.length}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Period field: ${periodField}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Has UF data: ${hasUFData}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Is regional indicator: ${isRegionalIndicator}`);
            
            // Log first 3 raw rows for inspection
            console.log(`[FETCH-ECONOMIC] [DEBUG] First 3 raw rows:`);
            for (let i = 0; i < Math.min(3, dataRows.length); i++) {
              console.log(`[FETCH-ECONOMIC] [DEBUG]   Row ${i}: ${JSON.stringify(dataRows[i])}`);
            }
            
            // Debug counters
            let debugCounters = {
              totalRows: dataRows.length,
              filteredByEmptyValue: 0,
              filteredByInvalidValue: 0,
              filteredByNaN: 0,
              filteredByNoPeriod: 0,
              filteredByInvalidPeriod: 0,
              filteredByNoUfCode: 0,
              filteredByInvalidUfCode: 0,
              addedToRegional: 0,
              addedToNational: 0,
              skippedOther: 0,
            };
            
            // Sample filtered values for debugging
            let sampleFilteredValues: string[] = [];
            let sampleFilteredPeriods: string[] = [];
            let sampleFilteredUfCodes: string[] = [];
            
            for (const row of dataRows) {
              const valueStr = row.V;
              
              // Check 1: Empty value
              if (!valueStr) {
                debugCounters.filteredByEmptyValue++;
                continue;
              }
              
              // Check 2: Invalid value markers
              if (valueStr === '..' || valueStr === '-' || valueStr === '...' || valueStr === 'X') {
                debugCounters.filteredByInvalidValue++;
                if (sampleFilteredValues.length < 5) {
                  sampleFilteredValues.push(valueStr);
                }
                continue;
              }
              
              // Check 3: NaN after parsing
              const numValue = parseFloat(valueStr.replace(',', '.'));
              if (isNaN(numValue)) {
                debugCounters.filteredByNaN++;
                if (sampleFilteredValues.length < 5) {
                  sampleFilteredValues.push(`NaN from: "${valueStr}"`);
                }
                continue;
              }
              
              // Check 4: Period extraction
              const periodCode = periodField ? row[periodField] : null;
              if (!periodCode) {
                debugCounters.filteredByNoPeriod++;
                if (sampleFilteredPeriods.length < 5) {
                  sampleFilteredPeriods.push(`No period in field ${periodField}`);
                }
                continue;
              }
              
              // Check 5: Period format validation
              if (!/^\d{4,6}$/.test(periodCode)) {
                debugCounters.filteredByInvalidPeriod++;
                if (sampleFilteredPeriods.length < 5) {
                  sampleFilteredPeriods.push(`Invalid: "${periodCode}"`);
                }
                continue;
              }
              
              // Format period to ISO date
              let refDate: string;
              if (periodCode.length === 4) {
                refDate = `${periodCode}-01-01`; // Annual: YYYY
              } else if (periodCode.length === 6) {
                // Check if this is quarterly data (YYYYQQ where QQ is 01-04)
                const year = periodCode.substring(0, 4);
                const suffix = periodCode.substring(4, 6);
                
                // Quarterly indicators: suffix 01-04 represents Q1-Q4
                // Map to first month of each quarter
                const quarterToMonth: Record<string, string> = {
                  '01': '01', // Q1 → January
                  '02': '04', // Q2 → April
                  '03': '07', // Q3 → July
                  '04': '10'  // Q4 → October
                };
                
                if (quarterToMonth[suffix] && (indicator as any)?.frequency === 'quarterly') {
                  // This is quarterly data (PNAD trimestral, etc.)
                  refDate = `${year}-${quarterToMonth[suffix]}-01`;
                  console.log(`[FETCH-ECONOMIC] [SIDRA-FLAT] Quarterly mapping: ${periodCode} → ${refDate}`);
                } else {
                  // Standard monthly: YYYYMM
                  refDate = `${year}-${suffix}-01`;
                }
              } else if (periodCode.length === 1 || periodCode.length === 2) {
                // Quarterly: Single digit 1-4 represents quarters (PNAD trimestral)
                // This requires the year from another field - skip if year unknown
                debugCounters.filteredByInvalidPeriod++;
                continue;
              } else {
                refDate = `${periodCode}-01-01`;
              }
              
              // Validate: Reject future dates
              const today = new Date();
              const refDateObj = new Date(refDate);
              if (refDateObj > today) {
                debugCounters.filteredByInvalidPeriod++;
                if (sampleFilteredPeriods.length < 5) {
                  sampleFilteredPeriods.push(`Future date rejected: ${refDate}`);
                }
                continue;
              }
              
              // Extract UF code - handle both standard (D1C) and PAC (dynamic field→mapping) formats
              let ufCode: number | null = null;
              
              if (isPAC && hasPACUFData && pacUfField) {
                // PAC Table 1407: UF is in dynamically detected field as category code, needs mapping
                const pacCategoryCode = row[pacUfField];
                if (pacCategoryCode && PAC_UF_CODE_MAP[pacCategoryCode]) {
                  ufCode = PAC_UF_CODE_MAP[pacCategoryCode];
                }
              } else {
                // Standard SIDRA: UF is in D1C as IBGE code
                const ufCodeStr = row.D1C;
                ufCode = ufCodeStr ? parseInt(ufCodeStr) : null;
              }
              
              // Check 6 & 7: UF code validation for regional indicators
              if (hasUFData && isRegionalIndicator) {
                if (!ufCode) {
                  debugCounters.filteredByNoUfCode++;
                  if (sampleFilteredUfCodes.length < 5) {
                    const srcField = isPAC ? (pacUfField || 'D3C') : 'D1C';
                    const srcValue = isPAC ? row[srcField] : row.D1C;
                    sampleFilteredUfCodes.push(`No UF code, ${srcField}="${srcValue}"`);
                  }
                  continue;
                }
                if (ufCode < 11 || ufCode > 53) {
                  debugCounters.filteredByInvalidUfCode++;
                  if (sampleFilteredUfCodes.length < 5) {
                    sampleFilteredUfCodes.push(`Invalid UF: ${ufCode}`);
                  }
                  continue;
                }
                
                // SUCCESS: Add to regional
                regionalValuesToInsert.push({
                  indicator_id: indicator.id,
                  uf_code: ufCode,
                  reference_date: refDate,
                  value: numValue,
                });
                debugCounters.addedToRegional++;
              } else if (!hasUFData || !isRegionalIndicator) {
                // SUCCESS: Add to national
                valuesToInsert.push({
                  indicator_id: indicator.id,
                  reference_date: refDate,
                  value: numValue,
                });
                debugCounters.addedToNational++;
              } else {
                debugCounters.skippedOther++;
              }
            }
            
            // ========== COMPREHENSIVE DEBUG OUTPUT ==========
            console.log(`[FETCH-ECONOMIC] [DEBUG] ========== PARSING RESULTS ==========`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Total rows processed: ${debugCounters.totalRows}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Filtered by empty value: ${debugCounters.filteredByEmptyValue}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Filtered by invalid value (.., -, ..., X): ${debugCounters.filteredByInvalidValue}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Filtered by NaN: ${debugCounters.filteredByNaN}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Filtered by no period: ${debugCounters.filteredByNoPeriod}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Filtered by invalid period format: ${debugCounters.filteredByInvalidPeriod}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Filtered by no UF code: ${debugCounters.filteredByNoUfCode}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Filtered by invalid UF code: ${debugCounters.filteredByInvalidUfCode}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Added to regional: ${debugCounters.addedToRegional}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Added to national: ${debugCounters.addedToNational}`);
            console.log(`[FETCH-ECONOMIC] [DEBUG] Skipped (other): ${debugCounters.skippedOther}`);
            
            if (sampleFilteredValues.length > 0) {
              console.log(`[FETCH-ECONOMIC] [DEBUG] Sample filtered values: ${sampleFilteredValues.join(', ')}`);
            }
            if (sampleFilteredPeriods.length > 0) {
              console.log(`[FETCH-ECONOMIC] [DEBUG] Sample filtered periods: ${sampleFilteredPeriods.join(', ')}`);
            }
            if (sampleFilteredUfCodes.length > 0) {
              console.log(`[FETCH-ECONOMIC] [DEBUG] Sample filtered UF codes: ${sampleFilteredUfCodes.join(', ')}`);
            }
            
            // Alert if zero records were parsed but rows existed
            if (debugCounters.totalRows > 0 && debugCounters.addedToRegional === 0 && debugCounters.addedToNational === 0) {
              console.log(`[FETCH-ECONOMIC] [DEBUG] ⚠️ CRITICAL: ${debugCounters.totalRows} rows processed but 0 records added!`);
              console.log(`[FETCH-ECONOMIC] [DEBUG] ⚠️ Check the filter breakdown above to identify the issue.`);
              
              // AUTO-DETECT UNAVAILABLE SOURCE: If 100% of values were filtered by invalid value, mark API as unavailable
              const invalidValueRatio = debugCounters.filteredByInvalidValue / debugCounters.totalRows;
              if (invalidValueRatio >= 0.95) {
                console.log(`[FETCH-ECONOMIC] [AUTO-DETECT] 🚫 Marking API as SOURCE UNAVAILABLE (${(invalidValueRatio * 100).toFixed(1)}% invalid values)`);
                await supabase.from('system_api_registry').update({
                  source_data_status: 'unavailable',
                  source_data_message: `API retorna ${debugCounters.filteredByInvalidValue}/${debugCounters.totalRows} valores inválidos (.., ..., -, X). IBGE não disponibiliza dados numéricos para esta configuração.`
                }).eq('id', apiConfig.id);
              }
            }
            
            console.log(`[FETCH-ECONOMIC] [DEBUG] ========== SIDRA FLAT PARSING END ==========`);
            console.log(`[FETCH-ECONOMIC] [IBGE] SIDRA Flat parsed: ${valuesToInsert.length} national, ${regionalValuesToInsert.length} regional`);
          } else {
            // ======= SIDRA JSON FORMAT (servicodados.ibge.gov.br) =======
            const ibgeData = data as IBGEResult[];
            
            if (ibgeData.length > 0 && ibgeData[0].resultados) {
              const resultados = ibgeData[0].resultados;
              
              // Handle multiple series (e.g., when there are classification filters or UF data)
              for (const resultado of resultados) {
                const series = resultado.series;
                if (series && series.length > 0) {
                  for (const serie of series) {
                    const serieData = serie.serie || {};
                    const localidade = serie.localidade;
                    
                    // Check if this is UF-level data (nivel.id === "N3" or localidade.id is a 2-digit UF code)
                    const isUFData = localidade && (
                      localidade.nivel?.id === 'N3' || 
                      (localidade.id && localidade.id.length === 2 && !isNaN(parseInt(localidade.id)))
                    );
                    const ufCode = isUFData ? parseInt(localidade.id) : null;
                    
                    console.log(`[FETCH-ECONOMIC] [IBGE] Processing serie - localidade: ${localidade?.nome || 'N/A'}, isUF: ${isUFData}, ufCode: ${ufCode}`);
                    
                    for (const [period, value] of Object.entries(serieData)) {
                      if (!value || value === '-' || value === '...' || value === '..') continue;
                      
                      let refDate: string;
                      // IBGE period formats: YYYYMM (monthly), YYYY (annual), YYYYQN (quarterly)
                      if (period.length === 6) {
                        // Monthly: YYYYMM -> YYYY-MM-01
                        refDate = `${period.substring(0, 4)}-${period.substring(4, 6)}-01`;
                      } else if (period.length === 4) {
                        // Annual: YYYY -> YYYY-01-01
                        refDate = `${period}-01-01`;
                      } else if (period.length === 5 && period.includes('Q')) {
                        // Quarterly: YYYYQN -> approximate to quarter start
                        const year = period.substring(0, 4);
                        const quarter = parseInt(period.substring(5));
                        const month = ((quarter - 1) * 3 + 1).toString().padStart(2, '0');
                        refDate = `${year}-${month}-01`;
                      } else {
                        refDate = `${period}-01-01`;
                      }
                      
                      // Validate: Reject future dates
                      const today = new Date();
                      const refDateObj = new Date(refDate);
                      if (refDateObj > today) {
                        console.log(`[FETCH-ECONOMIC] [IBGE] Skipping future date: ${refDate}`);
                        continue;
                      }
                      
                      const numValue = parseFloat(value.replace(',', '.'));
                      if (!isNaN(numValue)) {
                        if (isRegionalIndicator && ufCode && ufCode >= 11 && ufCode <= 53) {
                          // Regional data: insert into indicator_regional_values
                          regionalValuesToInsert.push({
                            indicator_id: indicator.id,
                            uf_code: ufCode,
                            reference_date: refDate,
                            value: numValue,
                          });
                        } else {
                          // National data: insert into indicator_values
                          valuesToInsert.push({
                            indicator_id: indicator.id,
                            reference_date: refDate,
                            value: numValue,
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          
          console.log(`[FETCH-ECONOMIC] IBGE parsed: ${valuesToInsert.length} national values, ${regionalValuesToInsert.length} regional values`);
          
          // Insert regional values if any
          if (regionalValuesToInsert.length > 0) {
            console.log(`[FETCH-ECONOMIC] ========== REGIONAL INSERT START ==========`);
            console.log(`[FETCH-ECONOMIC] 📍 Indicator: ${indicator.name} (${indicator.id})`);
            console.log(`[FETCH-ECONOMIC] 📍 Target table: indicator_regional_values`);
            console.log(`[FETCH-ECONOMIC] 📍 Records to insert: ${regionalValuesToInsert.length}`);
            
            // Log sample records for debugging
            const sampleRecords = regionalValuesToInsert.slice(0, 3);
            console.log(`[FETCH-ECONOMIC] 📍 Sample records (first 3):`, JSON.stringify(sampleRecords, null, 2));
            
            // Check for unique UF codes in the data
            const uniqueUFs = [...new Set(regionalValuesToInsert.map(r => r.uf_code))];
            console.log(`[FETCH-ECONOMIC] 📍 Unique UF codes: ${uniqueUFs.length} (${uniqueUFs.slice(0, 10).join(', ')}${uniqueUFs.length > 10 ? '...' : ''})`);
            
            // Check for unique dates
            const uniqueDates = [...new Set(regionalValuesToInsert.map(r => r.reference_date))].sort();
            console.log(`[FETCH-ECONOMIC] 📍 Date range: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]} (${uniqueDates.length} unique dates)`);
            
            // Verify all UF codes are valid (11-53)
            const invalidUFs = regionalValuesToInsert.filter(r => r.uf_code < 11 || r.uf_code > 53);
            if (invalidUFs.length > 0) {
              console.error(`[FETCH-ECONOMIC] ⚠️ WARNING: ${invalidUFs.length} records have invalid UF codes!`);
              console.error(`[FETCH-ECONOMIC] ⚠️ Invalid UF sample:`, invalidUFs.slice(0, 3));
            }
            
            // Batch insert to avoid timeout
            const BATCH_SIZE = 500;
            let totalInserted = 0;
            let insertErrors: string[] = [];
            
            for (let batchIdx = 0; batchIdx < regionalValuesToInsert.length; batchIdx += BATCH_SIZE) {
              const batch = regionalValuesToInsert.slice(batchIdx, batchIdx + BATCH_SIZE);
              console.log(`[FETCH-ECONOMIC] 📍 Inserting batch ${Math.floor(batchIdx/BATCH_SIZE) + 1}: ${batch.length} records`);
              
              const { data: insertedData, error: regionalInsertError, count: regionalCount } = await supabase
                .from('indicator_regional_values')
                .upsert(batch, { 
                  onConflict: 'indicator_id,uf_code,reference_date', 
                  ignoreDuplicates: false,
                  count: 'exact'
                })
                .select('id');
              
              if (regionalInsertError) {
                console.error(`[FETCH-ECONOMIC] ❌ REGIONAL INSERT ERROR (batch ${Math.floor(batchIdx/BATCH_SIZE) + 1}):`);
                console.error(`[FETCH-ECONOMIC] ❌ Error message: ${regionalInsertError.message}`);
                console.error(`[FETCH-ECONOMIC] ❌ Error code: ${regionalInsertError.code}`);
                console.error(`[FETCH-ECONOMIC] ❌ Error details:`, regionalInsertError.details);
                console.error(`[FETCH-ECONOMIC] ❌ Error hint: ${regionalInsertError.hint}`);
                insertErrors.push(regionalInsertError.message);
                
                // Try to identify which record is causing the issue
                if (regionalInsertError.message.includes('foreign key') || regionalInsertError.message.includes('violates')) {
                  console.error(`[FETCH-ECONOMIC] ❌ FK Violation detected. Checking UF codes...`);
                  // Query valid UF codes from brazilian_ufs
                  const { data: validUFs } = await supabase
                    .from('brazilian_ufs')
                    .select('uf_code');
                  const validUFSet = new Set(validUFs?.map(u => u.uf_code) || []);
                  const problemRecords = batch.filter(r => !validUFSet.has(r.uf_code));
                  if (problemRecords.length > 0) {
                    console.error(`[FETCH-ECONOMIC] ❌ Records with invalid UF codes:`, problemRecords.slice(0, 5));
                  }
                }
              } else {
                const count = insertedData?.length ?? regionalCount ?? batch.length;
                totalInserted += count;
                console.log(`[FETCH-ECONOMIC] ✅ Batch ${Math.floor(batchIdx/BATCH_SIZE) + 1} SUCCESS: ${count} records`);
              }
            }
            
            console.log(`[FETCH-ECONOMIC] ========== REGIONAL INSERT COMPLETE ==========`);
            console.log(`[FETCH-ECONOMIC] 📍 Total records inserted: ${totalInserted}/${regionalValuesToInsert.length}`);
            if (insertErrors.length > 0) {
              console.error(`[FETCH-ECONOMIC] ❌ Total insert errors: ${insertErrors.length}`);
            }
            
            totalRecordsInserted += totalInserted;
            
            // Verify insert by counting records
            const { count: verifyCount } = await supabase
              .from('indicator_regional_values')
              .select('*', { count: 'exact', head: true })
              .eq('indicator_id', indicator.id);
            console.log(`[FETCH-ECONOMIC] 📍 VERIFICATION: Records in DB for this indicator: ${verifyCount}`);
            
            // Skip national insert if we only have regional data
            if (valuesToInsert.length === 0) {
              const finalInsertedCount = totalInserted > 0 ? totalInserted : 0;
              
              results.push({ 
                indicator: indicator.name, 
                records: finalInsertedCount, 
                status: insertErrors.length > 0 ? 'partial' : 'success',
                newRecords: finalInsertedCount
              });
              
              // Update API registry with detailed metadata - mark as available if data inserted
              // CRITICAL: Include last_raw_response for regional indicators (previously missing)
              const rawResponseForRegional = Array.isArray(rawResponse) 
                ? rawResponse.slice(0, 500) 
                : rawResponse;
              
              await supabase.from('system_api_registry').update({
                status: insertErrors.length > 0 ? 'error' : 'active',
                last_checked_at: new Date().toISOString(),
                last_http_status: httpStatus,
                last_response_at: new Date().toISOString(),
                last_raw_response: rawResponseForRegional,
                source_data_status: totalInserted > 0 ? 'available' : 'unavailable',
                source_data_message: totalInserted > 0 
                  ? `${totalInserted} registros regionais inseridos com sucesso`
                  : 'Nenhum dado válido encontrado na resposta da API',
                last_sync_metadata: {
                  extracted_count: regionalValuesToInsert.length,
                  inserted_count: totalInserted,
                  period_start: uniqueDates[0],
                  period_end: uniqueDates[uniqueDates.length - 1],
                  fields_detected: ['indicator_id', 'uf_code', 'reference_date', 'value'],
                  unique_ufs: uniqueUFs.length,
                  unique_dates: uniqueDates.length,
                  last_record_value: String(regionalValuesToInsert[regionalValuesToInsert.length - 1]?.value),
                  fetch_timestamp: new Date().toISOString(),
                  type: 'regional',
                  errors: insertErrors.length > 0 ? insertErrors : undefined,
                  verified_count: verifyCount
                }
              }).eq('id', apiConfig.id);
              
              console.log(`[FETCH-ECONOMIC] 📍 API registry updated for ${indicator.name}`);
              continue;
            }
          }
        } else if (apiConfig.provider === 'WorldBank') {
          // ====== WORLDBANK PARSER ======
          // WorldBank returns [metadata, dataArray]
          // Each item: {date: "YYYY", value: number|null, ...}
          console.log(`[FETCH-ECONOMIC] WorldBank response received, parsing...`);
          
          if (Array.isArray(data) && data.length >= 2) {
            const dataArray = data[1];
            
            if (Array.isArray(dataArray)) {
              console.log(`[FETCH-ECONOMIC] WorldBank data array has ${dataArray.length} items`);
              
              for (const item of dataArray) {
                if (item.value === null || item.value === undefined) continue;
                
                // WorldBank date is just "YYYY" for annual data
                const refDate = `${item.date}-01-01`;
                const numValue = typeof item.value === 'number' ? item.value : parseFloat(item.value);
                
                if (!isNaN(numValue)) {
                  valuesToInsert.push({
                    indicator_id: indicator.id,
                    reference_date: refDate,
                    value: numValue,
                  });
                }
              }
            }
          } else {
            console.warn(`[FETCH-ECONOMIC] WorldBank unexpected format:`, typeof data);
          }
          
          console.log(`[FETCH-ECONOMIC] WorldBank parsed values: ${valuesToInsert.length}`);
          
          // Generate sync metadata for WorldBank
          syncMetadata = generateWorldBankSyncMetadata(data);
          console.log(`[FETCH-ECONOMIC] WorldBank syncMetadata generated: extracted_count=${syncMetadata.extracted_count}, period=${syncMetadata.period_start} to ${syncMetadata.period_end}`);
        } else if (apiConfig.provider === 'IPEADATA') {
          // ====== IPEADATA PARSER ======
          // IPEADATA OData returns { value: [{SERCODIGO, VALDATA, VALVALOR, ...}] }
          console.log(`[FETCH-ECONOMIC] IPEADATA response received, parsing...`);
          
          const ipeadataResponse = data as { value?: IPEADATADataPoint[] };
          
          if (ipeadataResponse?.value && Array.isArray(ipeadataResponse.value)) {
            console.log(`[FETCH-ECONOMIC] IPEADATA data array has ${ipeadataResponse.value.length} items`);
            
            for (const item of ipeadataResponse.value) {
              if (item.VALVALOR === null || item.VALVALOR === undefined) continue;
              if (!item.VALDATA) continue;
              
              // IPEADATA date is ISO format: "2024-01-01T00:00:00-03:00"
              const refDate = item.VALDATA.substring(0, 10);
              const numValue = typeof item.VALVALOR === 'number' ? item.VALVALOR : parseFloat(String(item.VALVALOR));
              
              if (!isNaN(numValue)) {
                valuesToInsert.push({
                  indicator_id: indicator.id,
                  reference_date: refDate,
                  value: numValue,
                });
              }
            }
          } else {
            console.warn(`[FETCH-ECONOMIC] IPEADATA unexpected format:`, typeof data);
          }
          
          console.log(`[FETCH-ECONOMIC] IPEADATA parsed values: ${valuesToInsert.length}`);
        }

        // ====== ZERO VALUES WARNING ======
        if (valuesToInsert.length === 0) {
          console.warn(`[FETCH-ECONOMIC] ⚠️ ZERO VALUES WARNING: ${indicator.name}`);
          console.warn(`[FETCH-ECONOMIC] Provider: ${apiConfig.provider}`);
          console.warn(`[FETCH-ECONOMIC] Configured dates: ${apiConfig.fetch_start_date} to ${apiConfig.fetch_end_date}`);
          console.warn(`[FETCH-ECONOMIC] Base URL: ${apiConfig.base_url}`);
          console.warn(`[FETCH-ECONOMIC] Check if ${apiConfig.provider} API has data for this period`);
          console.warn(`[FETCH-ECONOMIC] Possible causes: 1) Wrong date format 2) API limit 3) No data in period`);
          results.push({ indicator: indicator.name, records: 0, status: 'no_data', newRecords: 0 });
          continue;
        }

        // Check for existing records to detect NEW data
        const { data: existingRecords } = await supabase
          .from('indicator_values')
          .select('reference_date')
          .eq('indicator_id', indicator.id);

        const existingDates = new Set((existingRecords || []).map(r => r.reference_date));
        const newValues = valuesToInsert.filter(v => !existingDates.has(v.reference_date));

        console.log(`[FETCH-ECONOMIC] ${indicator.name}: ${valuesToInsert.length} total, ${newValues.length} NEW records`);

        // Execute upsert with detailed audit logging
        console.log(`[FETCH-ECONOMIC] ====== UPSERT AUDIT START: ${indicator.name} ======`);
        console.log(`[FETCH-ECONOMIC] Attempting upsert of ${valuesToInsert.length} records`);
        console.log(`[FETCH-ECONOMIC] Date range: ${valuesToInsert[0]?.reference_date} to ${valuesToInsert[valuesToInsert.length - 1]?.reference_date}`);
        
        const { error: insertError, count: upsertCount } = await supabase
          .from('indicator_values')
          .upsert(valuesToInsert, { 
            onConflict: 'indicator_id,reference_date', 
            ignoreDuplicates: false,
            count: 'exact'
          });

        if (insertError) {
          console.error(`[FETCH-ECONOMIC] ❌ UPSERT FAILED for ${indicator.name}:`, insertError);
          console.error(`[FETCH-ECONOMIC] Error code: ${insertError.code}`);
          console.error(`[FETCH-ECONOMIC] Error message: ${insertError.message}`);
          console.error(`[FETCH-ECONOMIC] Error details: ${insertError.details}`);
          results.push({ indicator: indicator.name, records: 0, status: 'error', newRecords: 0 });
        } else {
          console.log(`[FETCH-ECONOMIC] ✅ UPSERT SUCCESS: ${upsertCount ?? valuesToInsert.length} records persisted for ${indicator.name}`);
          console.log(`[FETCH-ECONOMIC] ====== UPSERT AUDIT END ======`);
          totalRecordsInserted += valuesToInsert.length;
          newRecordsCount += newValues.length;
          results.push({ 
            indicator: indicator.name, 
            records: valuesToInsert.length, 
            status: 'success',
            newRecords: newValues.length
          });

          // ====== GOVERNANCE: Validate Start Date ======
          if (valuesToInsert.length > 0) {
            const sortedValues = [...valuesToInsert].sort((a, b) => 
              a.reference_date.localeCompare(b.reference_date)
            );
            
            const firstInsertedDate = sortedValues[0].reference_date;
            const configuredStart = apiConfig.fetch_start_date;
            
            console.log(`[FETCH-ECONOMIC] [GOVERNANCE] First inserted date: ${firstInsertedDate}`);
            console.log(`[FETCH-ECONOMIC] [GOVERNANCE] Configured start: ${configuredStart}`);
            
            if (configuredStart) {
              const insertedDate = new Date(firstInsertedDate);
              const configuredDate = new Date(configuredStart);
              const diffDays = Math.abs((insertedDate.getTime() - configuredDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (diffDays > 30) {
                console.warn(`[FETCH-ECONOMIC] ⚠️ [GOVERNANCE] DATA GAP DETECTED!`);
                console.warn(`[FETCH-ECONOMIC] Expected start: ${configuredStart}`);
                console.warn(`[FETCH-ECONOMIC] Actual start: ${firstInsertedDate}`);
                console.warn(`[FETCH-ECONOMIC] Gap: ${Math.round(diffDays)} days`);
                
                // Log governance alert
                await supabase.from('user_activity_logs').insert({
                  user_email: 'system@knowyou.app',
                  action_category: 'GOVERNANCE_ALERT',
                  action: `Data gap detected for ${indicator.name}`,
                  details: { 
                    indicator: indicator.name,
                    configuredStart,
                    actualStart: firstInsertedDate,
                    gapDays: Math.round(diffDays),
                    severity: diffDays > 365 ? 'critical' : 'warning'
                  }
                });
              } else {
                console.log(`[FETCH-ECONOMIC] ✅ [GOVERNANCE] Date validation PASSED (${Math.round(diffDays)} days within 30-day tolerance)`);
              }
              
              // ====== AUTO-ADJUSTMENT: Update fetch_start_date if API history is limited ======
              if (diffDays > 365 && insertedDate > configuredDate) {
                console.log(`[FETCH-ECONOMIC] ⚠️ AUTO-ADJUSTMENT: API history limited. Configured: ${configuredStart}, Actual: ${firstInsertedDate}`);
                console.log(`[FETCH-ECONOMIC] ⚠️ Difference: ${Math.round(diffDays)} days. Updating fetch_start_date to match actual API availability.`);
                
                const { error: adjustError } = await supabase
                  .from('system_api_registry')
                  .update({ 
                    fetch_start_date: firstInsertedDate
                  })
                  .eq('id', apiConfig.id);
                
                if (adjustError) {
                  console.error(`[FETCH-ECONOMIC] ❌ Auto-adjustment failed:`, adjustError);
                } else {
                  console.log(`[FETCH-ECONOMIC] ✅ Auto-adjusted fetch_start_date to ${firstInsertedDate}`);
                }
              }
            }
          }

          // Update API registry with success telemetry AND discovered period
          const registryUpdate: Record<string, unknown> = {
            status: 'active',
            last_checked_at: new Date().toISOString(),
            last_http_status: httpStatus,
            last_sync_metadata: syncMetadata,
            last_raw_response: rawResponse, // Store raw JSON for observability
            last_response_at: new Date().toISOString()
          };

          // Persist discovered period (governance feature)
          if (syncMetadata?.period_start) {
            registryUpdate.discovered_period_start = syncMetadata.period_start;
            console.log(`[FETCH-ECONOMIC] [GOVERNANCE] Persisting discovered_period_start: ${syncMetadata.period_start}`);
          }
          if (syncMetadata?.period_end) {
            registryUpdate.discovered_period_end = syncMetadata.period_end;
            console.log(`[FETCH-ECONOMIC] [GOVERNANCE] Persisting discovered_period_end: ${syncMetadata.period_end}`);
          }
          if (syncMetadata?.period_start || syncMetadata?.period_end) {
            registryUpdate.period_discovery_date = new Date().toISOString();
          }

          await supabase.from('system_api_registry').update(registryUpdate).eq('id', apiConfig.id);

          // If NEW records were inserted, dispatch notification
          if (newValues.length > 0) {
            const latestValue = valuesToInsert[valuesToInsert.length - 1];
            console.log(`[FETCH-ECONOMIC] NEW data detected for ${indicator.name}: ${newValues.length} records`);
            
            // Dispatch notification for new economic data
            try {
              await supabase.functions.invoke('send-email', {
                body: {
                  eventType: 'new_economic_data',
                  to: null, // Will use admin settings
                  subject: `Novo indicador disponível: ${indicator.name}`,
                  body: `Novo indicador disponível: ${indicator.name} referente a ${latestValue.reference_date}. Valor: ${latestValue.value}${indicator.unit ? ` ${indicator.unit}` : ''}.`
                }
              });
              console.log(`[FETCH-ECONOMIC] Notification dispatched for ${indicator.name}`);
            } catch (notifyError) {
              console.error('[FETCH-ECONOMIC] Notification error:', notifyError);
            }
          }
        }
      } catch (err) {
        console.error(`[FETCH-ECONOMIC] Error processing ${indicator.name}:`, err);
        results.push({ indicator: indicator.name, records: 0, status: 'error', newRecords: 0 });
        
        // Log sync failure
        try {
          await supabase.rpc('log_api_event', {
            p_api_id: indicator.api_id,
            p_api_name: indicator.name,
            p_event_type: 'SYNC_FAILED',
            p_event_category: 'SYNC',
            p_severity: 'ERROR',
            p_action_description: `Falha na sincronização de "${indicator.name}": ${String(err)}`,
            p_error_message: String(err),
            p_records_affected: 0
          });
        } catch (logErr) {
          console.error('[FETCH-ECONOMIC] Audit log error:', logErr);
        }
      }
    }

    // Audit log
    await supabase.from('user_activity_logs').insert({
      user_email: 'system@knowyou.app',
      action_category: 'ECONOMIC_DATA_FETCH',
      action: `Fetched economic data | Total: ${totalRecordsInserted} | New: ${newRecordsCount}`,
      details: { results, totalRecordsInserted, newRecordsCount }
    });

    console.log(`[FETCH-ECONOMIC] Complete. Total: ${totalRecordsInserted}, New: ${newRecordsCount}`);

    // ====== API AUDIT LOGGING: Record sync completion for each processed API ======
    // Log success for APIs that had data inserted
    for (const result of results) {
      if (result.status === 'success' && result.records > 0) {
        const apiEntry = indicators.find(i => i.name === result.indicator);
        if (apiEntry) {
          try {
            await supabase.rpc('log_api_event', {
              p_api_id: apiEntry.api_id,
              p_api_name: result.indicator,
              p_event_type: result.newRecords > 0 ? 'DATA_INSERTED' : 'SYNC_SUCCESS',
              p_event_category: result.newRecords > 0 ? 'DATA' : 'SYNC',
              p_severity: 'SUCCESS',
              p_action_description: result.newRecords > 0 
                ? `${result.newRecords} novos registros inseridos para "${result.indicator}"`
                : `Sincronização concluída para "${result.indicator}": ${result.records} registros (sem novos dados)`,
              p_records_affected: result.newRecords || result.records
            });
          } catch (logErr) {
            console.error('[FETCH-ECONOMIC] Audit log error:', logErr);
          }
        }
      }
    }

    const responsePayload = { 
      success: true, 
      recordsInserted: totalRecordsInserted, 
      newRecordsCount, 
      results,
      zeroBaseExecuted,
      totalDeleted
    };
    
    console.log('[FETCH-ECONOMIC] ====== FINAL RESPONSE ======');
    console.log('[FETCH-ECONOMIC] Response payload:', JSON.stringify(responsePayload));
    
    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FETCH-ECONOMIC] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
