/**
 * Time Series Correlation Utilities
 * Advanced correlation methods for time series analysis
 */

import { pearsonCorrelation } from "./statistics-utils";

/**
 * Convert array to ranks (used by Spearman correlation)
 * Handles ties by assigning average rank
 */
export function getRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ value: v, index: i }));
  indexed.sort((a, b) => a.value - b.value);
  
  const ranks = new Array(values.length);
  let i = 0;
  
  while (i < indexed.length) {
    let j = i;
    // Find all elements with the same value (ties)
    while (j < indexed.length && indexed[j].value === indexed[i].value) {
      j++;
    }
    // Assign average rank to all tied elements
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[indexed[k].index] = avgRank;
    }
    i = j;
  }
  
  return ranks;
}

/**
 * Spearman rank correlation coefficient
 * More robust to outliers and non-linear relationships
 * @returns rho value between -1 and 1
 */
export function spearmanCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);
  
  const rankX = getRanks(xSlice);
  const rankY = getRanks(ySlice);
  
  return pearsonCorrelation(rankX, rankY);
}

/**
 * Cross-correlation with lags
 * Identifies temporal relationships between two series
 * @param x First time series
 * @param y Second time series
 * @param maxLag Maximum lag to test (positive and negative)
 * @returns Array of { lag, correlation } sorted by absolute correlation
 */
export function crossCorrelation(
  x: number[],
  y: number[],
  maxLag: number = 12
): { lag: number; correlation: number }[] {
  const n = Math.min(x.length, y.length);
  if (n < 3) return [{ lag: 0, correlation: 0 }];
  
  const results: { lag: number; correlation: number }[] = [];
  const effectiveMaxLag = Math.min(maxLag, Math.floor(n / 3)); // Ensure enough data points
  
  for (let lag = -effectiveMaxLag; lag <= effectiveMaxLag; lag++) {
    let xShifted: number[];
    let yShifted: number[];
    
    if (lag > 0) {
      // X leads Y (X happens first, Y follows)
      xShifted = x.slice(0, n - lag);
      yShifted = y.slice(lag);
    } else if (lag < 0) {
      // Y leads X (Y happens first, X follows)
      xShifted = x.slice(-lag);
      yShifted = y.slice(0, n + lag);
    } else {
      xShifted = x.slice(0, n);
      yShifted = y.slice(0, n);
    }
    
    if (xShifted.length >= 3 && yShifted.length >= 3) {
      const r = pearsonCorrelation(xShifted, yShifted);
      results.push({ lag, correlation: r });
    }
  }
  
  return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

/**
 * Find optimal lag between two series
 * @returns The lag with highest absolute correlation
 */
export function findOptimalLag(
  x: number[],
  y: number[],
  maxLag: number = 12
): { lag: number; correlation: number; direction: "X→Y" | "Y→X" | "simultâneo" } {
  const ccf = crossCorrelation(x, y, maxLag);
  
  if (ccf.length === 0) {
    return { lag: 0, correlation: 0, direction: "simultâneo" };
  }
  
  const best = ccf[0];
  let direction: "X→Y" | "Y→X" | "simultâneo";
  
  if (best.lag > 0) {
    direction = "X→Y"; // X leads (precedes) Y
  } else if (best.lag < 0) {
    direction = "Y→X"; // Y leads (precedes) X
  } else {
    direction = "simultâneo";
  }
  
  return { lag: best.lag, correlation: best.correlation, direction };
}

/**
 * Interpret lag in natural language (Portuguese)
 */
export function interpretLag(lag: number, xName: string, yName: string): string {
  if (lag === 0) {
    return "Relação simultânea";
  }
  
  const absLag = Math.abs(lag);
  const periods = absLag === 1 ? "período" : "períodos";
  
  if (lag > 0) {
    // X leads Y
    return `${xName} antecede ${yName} em ${absLag} ${periods}`;
  } else {
    // Y leads X
    return `${yName} antecede ${xName} em ${absLag} ${periods}`;
  }
}

/**
 * Interface for correlation candidate
 */
export interface CorrelationCandidate {
  id: string;
  name: string;
  values: number[];
}

/**
 * Interface for best correlation result
 */
export interface BestCorrelation {
  id: string;
  name: string;
  correlation: number;
  method: "pearson" | "spearman" | "crosscorr";
  lag?: number;
  lagInterpretation?: string;
}

/**
 * Auto-discovery: find the most correlated variables for a target
 * @param target The target indicator
 * @param candidates Array of candidate indicators
 * @param method Correlation method to use
 * @param topN Number of top correlations to return
 * @param maxLag Maximum lag for cross-correlation
 */
export function findBestCorrelations(
  target: CorrelationCandidate,
  candidates: CorrelationCandidate[],
  method: "pearson" | "spearman" | "crosscorr" = "spearman",
  topN: number = 5,
  maxLag: number = 12
): BestCorrelation[] {
  const results: BestCorrelation[] = [];
  
  for (const candidate of candidates) {
    if (candidate.id === target.id) continue; // Skip self
    
    const minLength = Math.min(target.values.length, candidate.values.length);
    if (minLength < 5) continue; // Need enough data points
    
    const targetValues = target.values.slice(0, minLength);
    const candidateValues = candidate.values.slice(0, minLength);
    
    if (method === "crosscorr") {
      const optimal = findOptimalLag(candidateValues, targetValues, maxLag);
      results.push({
        id: candidate.id,
        name: candidate.name,
        correlation: optimal.correlation,
        method,
        lag: optimal.lag,
        lagInterpretation: interpretLag(optimal.lag, candidate.name, target.name),
      });
    } else {
      const r = method === "spearman"
        ? spearmanCorrelation(candidateValues, targetValues)
        : pearsonCorrelation(candidateValues, targetValues);
      
      results.push({
        id: candidate.id,
        name: candidate.name,
        correlation: r,
        method,
      });
    }
  }
  
  return results
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, topN);
}

/**
 * Get correlation strength description (Portuguese)
 */
export function getCorrelationStrengthPtBr(r: number): {
  strength: string;
  color: string;
  description: string;
} {
  const absR = Math.abs(r);
  const direction = r >= 0 ? "positiva" : "negativa";

  if (absR >= 0.9) {
    return {
      strength: "Muito Forte",
      color: r >= 0 ? "text-green-500" : "text-red-500",
      description: `Correlação ${direction} muito forte`,
    };
  }
  if (absR >= 0.7) {
    return {
      strength: "Forte",
      color: r >= 0 ? "text-green-400" : "text-red-400",
      description: `Correlação ${direction} forte`,
    };
  }
  if (absR >= 0.5) {
    return {
      strength: "Moderada",
      color: "text-yellow-500",
      description: `Correlação ${direction} moderada`,
    };
  }
  if (absR >= 0.3) {
    return {
      strength: "Fraca",
      color: "text-gray-400",
      description: `Correlação ${direction} fraca`,
    };
  }
  return {
    strength: "Muito Fraca",
    color: "text-gray-500",
    description: "Correlação insignificante",
  };
}
