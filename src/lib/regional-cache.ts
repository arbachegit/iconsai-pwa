/**
 * Intelligent Cache System for Regional Data
 * Uses localStorage with TTL (Time To Live) for efficient data caching
 */

import { RegionalContext } from "@/contexts/DashboardAnalyticsContext";
import { logger } from "./logger";

const REGIONAL_CACHE_KEY = 'regional_data_cache_v1';
const REGIONAL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHED_RESEARCHES = 10;

interface CacheEntry {
  data: Record<string, RegionalContext>;
  timestamp: number;
  researchId: string;
  researchName: string;
  stateCount: number;
}

interface CacheStore {
  entries: Record<string, CacheEntry>;
  lastCleanup: number;
}

/**
 * Get cache store from localStorage
 */
function getCacheStore(): CacheStore {
  try {
    const stored = localStorage.getItem(REGIONAL_CACHE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.warn('[CACHE] Failed to parse cache store:', e);
  }
  return { entries: {}, lastCleanup: Date.now() };
}

/**
 * Save cache store to localStorage
 */
function saveCacheStore(store: CacheStore): void {
  try {
    localStorage.setItem(REGIONAL_CACHE_KEY, JSON.stringify(store));
  } catch (e) {
    logger.warn('[CACHE] Failed to save cache store:', e);
    // If storage is full, clear old entries
    clearExpiredCache();
  }
}

/**
 * Check if a cache entry is still valid
 */
export function isCacheValid(entry: CacheEntry | null): boolean {
  if (!entry) return false;
  const age = Date.now() - entry.timestamp;
  return age < REGIONAL_CACHE_TTL;
}

/**
 * Get cached data for a research ID
 */
export function getFromCache(researchId: string): CacheEntry | null {
  const store = getCacheStore();
  const entry = store.entries[researchId];
  
  if (entry && isCacheValid(entry)) {
    logger.cache('HIT', researchId, estimateSizeKB(entry.data));
    return entry;
  }
  
  logger.cache('MISS', researchId);
  return null;
}

/**
 * Save data to cache
 */
export function saveToCache(
  researchId: string, 
  data: Record<string, RegionalContext>, 
  researchName: string
): void {
  const store = getCacheStore();
  
  // Enforce max cache size - remove oldest entries
  const entries = Object.entries(store.entries);
  if (entries.length >= MAX_CACHED_RESEARCHES) {
    const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sorted.slice(0, entries.length - MAX_CACHED_RESEARCHES + 1);
    toRemove.forEach(([key]) => {
      delete store.entries[key];
      logger.cache('EVICT', key);
    });
  }
  
  store.entries[researchId] = {
    data,
    timestamp: Date.now(),
    researchId,
    researchName,
    stateCount: Object.keys(data).length,
  };
  
  saveCacheStore(store);
  logger.cache('SET', researchId, estimateSizeKB(data));
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const store = getCacheStore();
  const now = Date.now();
  let cleared = 0;
  
  Object.entries(store.entries).forEach(([key, entry]) => {
    if (!isCacheValid(entry)) {
      delete store.entries[key];
      cleared++;
    }
  });
  
  if (cleared > 0) {
    store.lastCleanup = now;
    saveCacheStore(store);
    logger.cache('CLEAR', `${cleared} expired entries`);
  }
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  localStorage.removeItem(REGIONAL_CACHE_KEY);
  logger.cache('CLEAR', 'all entries');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entries: number;
  sizeKB: number;
  oldestAge: number | null;
  newestAge: number | null;
} {
  const store = getCacheStore();
  const entries = Object.values(store.entries);
  const now = Date.now();
  
  if (entries.length === 0) {
    return { entries: 0, sizeKB: 0, oldestAge: null, newestAge: null };
  }
  
  const ages = entries.map(e => now - e.timestamp);
  const totalSize = entries.reduce((acc, e) => acc + estimateSizeKB(e.data), 0);
  
  return {
    entries: entries.length,
    sizeKB: totalSize,
    oldestAge: Math.max(...ages),
    newestAge: Math.min(...ages),
  };
}

/**
 * Estimate size of data in KB
 */
function estimateSizeKB(data: unknown): number {
  try {
    const str = JSON.stringify(data);
    return str.length / 1024;
  } catch {
    return 0;
  }
}

/**
 * Format age in human readable format
 */
export function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes < 1) return `${seconds}s`;
  return `${minutes}m`;
}
