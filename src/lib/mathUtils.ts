/**
 * Statistical utility functions for data analysis
 * Re-exports existing functions from statistics-utils.ts and adds new ones
 */

// Re-export existing functions from statistics-utils.ts
export { 
  mean, 
  standardDeviation, 
  movingAverage, 
  linearRegression,
  pearsonCorrelation as correlation 
} from "./statistics-utils";

import { mean, standardDeviation, linearRegression } from "./statistics-utils";

/**
 * Helper to clean array by filtering NaN and undefined values
 */
function cleanArray(data: number[]): number[] {
  return data.filter(v => v != null && !isNaN(v));
}

/**
 * Calculates the median of an array
 */
export function median(data: number[]): number {
  const clean = cleanArray(data);
  if (clean.length === 0) return 0;
  
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculates the percentile of an array
 * @param data - Array of numbers
 * @param p - Percentile (0-100)
 */
export function percentile(data: number[], p: number): number {
  const clean = cleanArray(data);
  if (clean.length === 0) return 0;
  
  // Clamp p between 0 and 100
  const clampedP = Math.max(0, Math.min(100, p));
  
  const sorted = [...clean].sort((a, b) => a - b);
  const index = (clampedP / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) return sorted[lower];
  
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Forecasts future values using linear regression
 * @param data - Historical data points
 * @param periods - Number of periods to forecast
 */
export function forecast(data: number[], periods: number): number[] {
  const clean = cleanArray(data);
  if (clean.length < 2 || periods <= 0) return [];
  
  const x = clean.map((_, i) => i);
  const regression = linearRegression(x, clean);
  
  const forecasted: number[] = [];
  for (let i = 1; i <= periods; i++) {
    forecasted.push(regression.slope * (clean.length - 1 + i) + regression.intercept);
  }
  
  return forecasted;
}

/**
 * Summary statistics interface
 */
export interface SummaryStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  count: number;
}

/**
 * Returns a complete statistical summary of the data
 */
export function summary(data: number[]): SummaryStats {
  const clean = cleanArray(data);
  
  if (clean.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, std: 0, count: 0 };
  }
  
  return {
    min: Math.min(...clean),
    max: Math.max(...clean),
    mean: mean(clean),
    median: median(clean),
    std: standardDeviation(clean),
    count: clean.length,
  };
}
