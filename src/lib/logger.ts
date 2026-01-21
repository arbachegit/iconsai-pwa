/**
 * Conditional logger that only logs in development mode
 * Prevents console pollution in production while keeping error logging
 * Includes performance, cache, and memory monitoring methods
 */
const isDev = import.meta.env.DEV;

/**
 * Format bytes to human readable format
 */
function formatBytesInternal(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Get basic memory info for logging
 */
function getMemoryInfo(): string | null {
  if (typeof performance === 'undefined' || !('memory' in performance)) {
    return null;
  }
  try {
    const memory = (performance as unknown as { memory: {
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
    } }).memory;
    const pct = ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1);
    return `${formatBytesInternal(memory.usedJSHeapSize)} / ${formatBytesInternal(memory.jsHeapSizeLimit)} (${pct}%)`;
  } catch {
    return null;
  }
}

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  table: (data: unknown) => {
    if (isDev) console.table(data);
  },
  
  /**
   * Log performance metrics with optional memory info
   */
  perf: (action: string, metadata?: Record<string, unknown>) => {
    if (isDev) {
      const memoryInfo = getMemoryInfo();
      const logData: Record<string, unknown> = { ...metadata };
      if (memoryInfo) {
        logData.memory = memoryInfo;
      }
      console.log(`%c[PERF] ${action}`, 'color: #00bcd4; font-weight: bold;', logData);
    }
  },
  
  /**
   * Log cache operations
   */
  cache: (action: 'HIT' | 'MISS' | 'SET' | 'CLEAR' | 'EVICT', key: string, sizeKB?: number) => {
    if (isDev) {
      const colors: Record<string, string> = {
        HIT: 'color: #4caf50; font-weight: bold;',
        MISS: 'color: #ff9800; font-weight: bold;',
        SET: 'color: #2196f3; font-weight: bold;',
        CLEAR: 'color: #9c27b0; font-weight: bold;',
        EVICT: 'color: #f44336; font-weight: bold;',
      };
      const sizeStr = sizeKB ? ` (${sizeKB.toFixed(1)}KB)` : '';
      console.log(`%c[CACHE ${action}] ${key}${sizeStr}`, colors[action]);
    }
  },
  
  /**
   * Log memory warning
   */
  memoryWarning: (usage: number, limit: number) => {
    if (isDev) {
      const pct = (usage / limit * 100).toFixed(1);
      console.warn(
        `%c⚠️ [MEMORY WARNING] ${formatBytesInternal(usage)} / ${formatBytesInternal(limit)} (${pct}%)`,
        'color: #ff5722; font-weight: bold; font-size: 14px;'
      );
    }
  },
};
