/**
 * Centralized string similarity utilities
 * Single source of truth for Levenshtein distance and similarity calculations
 */

/**
 * Calculate Levenshtein distance between two strings
 * Uses dynamic programming with O(n*m) time complexity
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  // Use single array optimization for space efficiency
  const dp: number[] = Array(n + 1).fill(0).map((_, i) => i);
  
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const curr = a[i - 1] === b[j - 1]
        ? dp[j - 1]
        : Math.min(dp[j - 1], prev, dp[j]) + 1;
      dp[j - 1] = prev;
      prev = curr;
    }
    dp[n] = prev;
  }
  
  return dp[n];
}

/**
 * Calculate similarity score between two strings (0-100%)
 * @param a First string
 * @param b Second string
 * @returns Similarity percentage (0-100)
 */
export function calculateSimilarity(a: string, b: string): number {
  const normalizedA = a.toLowerCase().trim();
  const normalizedB = b.toLowerCase().trim();
  
  if (normalizedA === normalizedB) return 100;
  if (!normalizedA || !normalizedB) return 0;
  
  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  const distance = levenshteinDistance(normalizedA, normalizedB);
  
  return Math.round((1 - distance / maxLength) * 100);
}

/**
 * Check if two strings are similar above a threshold
 * @param a First string
 * @param b Second string
 * @param threshold Minimum similarity percentage (default 70)
 */
export function areSimilar(a: string, b: string, threshold = 70): boolean {
  return calculateSimilarity(a, b) >= threshold;
}
