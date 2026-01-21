/**
 * Memory Monitor Utility
 * Provides real-time memory usage monitoring and automatic cleanup triggers
 */

import { logger } from "./logger";
import { clearExpiredCache } from "./regional-cache";

// Memory thresholds
const WARNING_THRESHOLD = 0.70; // 70% of limit
const CRITICAL_THRESHOLD = 0.85; // 85% of limit

export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePct: number;
  isWarning: boolean;
  isCritical: boolean;
  isSupported: boolean;
}

/**
 * Check if memory API is available
 */
function isMemoryApiSupported(): boolean {
  return typeof performance !== 'undefined' && 
         'memory' in performance &&
         typeof (performance as unknown as { memory: unknown }).memory === 'object';
}

/**
 * Get current memory statistics
 */
export function getMemoryStats(): MemoryStats | null {
  if (!isMemoryApiSupported()) {
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      usagePct: 0,
      isWarning: false,
      isCritical: false,
      isSupported: false,
    };
  }
  
  try {
    const memory = (performance as unknown as { memory: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    } }).memory;
    
    const usagePct = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePct,
      isWarning: usagePct >= WARNING_THRESHOLD,
      isCritical: usagePct >= CRITICAL_THRESHOLD,
      isSupported: true,
    };
  } catch (e) {
    logger.warn('[MEMORY] Failed to get memory stats:', e);
    return null;
  }
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Log current memory usage
 */
export function logMemoryUsage(context: string): void {
  const stats = getMemoryStats();
  
  if (!stats || !stats.isSupported) {
    logger.debug(`[MEMORY] ${context} - Memory API not supported`);
    return;
  }
  
  const pct = (stats.usagePct * 100).toFixed(1);
  const used = formatBytes(stats.usedJSHeapSize);
  const limit = formatBytes(stats.jsHeapSizeLimit);
  
  if (stats.isCritical) {
    logger.memoryWarning(stats.usedJSHeapSize, stats.jsHeapSizeLimit);
  } else if (stats.isWarning) {
    logger.warn(`[MEMORY] ${context}: ${used} / ${limit} (${pct}%) - WARNING`);
  } else {
    logger.debug(`[MEMORY] ${context}: ${used} / ${limit} (${pct}%)`);
  }
}

/**
 * Check memory and trigger cleanup if needed
 */
export function checkAndCleanup(): boolean {
  const stats = getMemoryStats();
  
  if (!stats || !stats.isSupported) return false;
  
  if (stats.isCritical) {
    logger.warn('[MEMORY] Critical memory usage detected, triggering cleanup...');
    
    // Clear expired regional cache
    clearExpiredCache();
    
    return true;
  }
  
  return false;
}

/**
 * Start continuous memory monitoring
 * Returns a cleanup function to stop monitoring
 */
export function startMemoryMonitoring(intervalMs: number = 30000): () => void {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  
  const monitor = () => {
    logMemoryUsage('Periodic check');
    checkAndCleanup();
  };
  
  // Initial check
  monitor();
  
  // Start interval
  intervalId = setInterval(monitor, intervalMs);
  
  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

/**
 * Get memory status label
 */
export function getMemoryStatusLabel(stats: MemoryStats | null): {
  label: string;
  color: 'green' | 'yellow' | 'red';
  emoji: string;
} {
  if (!stats || !stats.isSupported) {
    return { label: 'N/A', color: 'green', emoji: '⚪' };
  }
  
  if (stats.isCritical) {
    return { label: 'CRÍTICO', color: 'red', emoji: '🔴' };
  }
  
  if (stats.isWarning) {
    return { label: 'ALTO', color: 'yellow', emoji: '🟡' };
  }
  
  return { label: 'NORMAL', color: 'green', emoji: '🟢' };
}
