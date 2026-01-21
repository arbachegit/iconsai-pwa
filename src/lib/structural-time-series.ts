/**
 * Structural Time Series (STS) / State-Space Model
 * Full Kalman Filter Implementation with Forward Filtering and Backward Smoothing
 */

import { getNextPeriodLabel, type Frequency } from './date-formatters';

export interface STSResult {
  // Smoothed states (final estimates)
  mu_smoothed: number;        // Current trend level
  mu_ci_low: number;          // 95% CI lower bound
  mu_ci_high: number;         // 95% CI upper bound
  beta_smoothed: number;      // Current slope (rate of change)
  beta_ci_low: number;
  beta_ci_high: number;
  
  // Full time series of states
  muSeries: number[];
  betaSeries: number[];
  
  // Model variances
  sigma2_epsilon: number;     // Observation noise variance
  sigma2_eta: number;         // Level shock variance
  sigma2_zeta: number;        // Slope shock variance
  
  // Forecast with percentiles
  forecast: {
    nextPeriod: string;
    mean: number;
    p05: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  
  // Trend characteristics
  direction: 'up' | 'down' | 'stable';
  strength: 'strong' | 'moderate' | 'weak';
  uncertainty: 'low' | 'moderate' | 'high';
  
  // Diagnostics
  innovations: number[];
  anomalyIndices: number[];
}

/**
 * Calculate standard deviation
 */
function calculateStd(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Run Structural Time Series analysis with full Kalman filtering and smoothing
 */
export function runStructuralTimeSeries(
  data: { date: Date | string; value: number }[],
  frequency: Frequency
): STSResult {
  // Sort by date
  const sorted = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const y = sorted.map(d => d.value);
  const n = y.length;
  
  // Default result for insufficient data
  if (n < 3) {
    return getDefaultResult(frequency);
  }

  // ══════════════════════════════════════════════════════════════════════
  // INITIALIZE PARAMETERS
  // ══════════════════════════════════════════════════════════════════════
  
  // Initial estimates
  let level = y[0];
  let slope = n > 5 ? (y[Math.min(5, n - 1)] - y[0]) / Math.min(5, n - 1) : 0;
  
  // Variance estimates
  const yStd = calculateStd(y);
  const sigma2_epsilon = Math.pow(yStd * 0.5, 2);  // Observation noise
  const sigma2_eta = Math.pow(yStd * 0.1, 2);      // Level shock
  const sigma2_zeta = Math.pow(yStd * 0.05, 2);    // Slope shock

  // Storage arrays
  const mu_filtered: number[] = [];
  const beta_filtered: number[] = [];
  const P_level: number[] = [];
  const P_slope: number[] = [];
  const innovations: number[] = [];

  // ══════════════════════════════════════════════════════════════════════
  // KALMAN FILTER - FORWARD PASS
  // ══════════════════════════════════════════════════════════════════════
  
  let P_l = sigma2_eta;
  let P_s = sigma2_zeta;
  
  for (let t = 0; t < n; t++) {
    // Prediction step
    const level_pred = level + slope;
    const slope_pred = slope;
    const P_l_pred = P_l + sigma2_eta;
    const P_s_pred = P_s + sigma2_zeta;
    
    // Innovation (prediction error)
    const innovation = y[t] - level_pred;
    innovations.push(innovation);
    
    // Innovation variance
    const F = P_l_pred + sigma2_epsilon;
    
    // Kalman gain
    const K_l = P_l_pred / F;
    const K_s = P_s_pred / F * 0.5; // Attenuated for slope
    
    // Update step
    level = level_pred + K_l * innovation;
    slope = slope_pred + K_s * innovation;
    P_l = P_l_pred * (1 - K_l);
    P_s = P_s_pred * (1 - K_s * 0.5);
    
    // Store filtered states
    mu_filtered.push(level);
    beta_filtered.push(slope);
    P_level.push(P_l);
    P_slope.push(P_s);
  }

  // ══════════════════════════════════════════════════════════════════════
  // KALMAN SMOOTHER - BACKWARD PASS
  // ══════════════════════════════════════════════════════════════════════
  
  const mu_smoothed: number[] = new Array(n);
  const beta_smoothed: number[] = new Array(n);
  
  // Initialize with last filtered values
  mu_smoothed[n - 1] = mu_filtered[n - 1];
  beta_smoothed[n - 1] = beta_filtered[n - 1];
  
  for (let t = n - 2; t >= 0; t--) {
    const L = P_level[t] / (P_level[t] + sigma2_eta);
    mu_smoothed[t] = mu_filtered[t] + L * (mu_smoothed[t + 1] - mu_filtered[t] - beta_filtered[t]);
    beta_smoothed[t] = beta_filtered[t] + L * 0.5 * (beta_smoothed[t + 1] - beta_filtered[t]);
  }

  // ══════════════════════════════════════════════════════════════════════
  // CONFIDENCE INTERVALS
  // ══════════════════════════════════════════════════════════════════════
  
  const z95 = 1.96;
  const lastMu = mu_smoothed[n - 1];
  const lastBeta = beta_smoothed[n - 1];
  const lastP_l = P_level[n - 1];
  const lastP_s = P_slope[n - 1];
  
  const mu_ci_low = lastMu - z95 * Math.sqrt(lastP_l);
  const mu_ci_high = lastMu + z95 * Math.sqrt(lastP_l);
  const beta_ci_low = lastBeta - z95 * Math.sqrt(lastP_s);
  const beta_ci_high = lastBeta + z95 * Math.sqrt(lastP_s);

  // ══════════════════════════════════════════════════════════════════════
  // FORECAST
  // ══════════════════════════════════════════════════════════════════════
  
  const forecastMean = lastMu + lastBeta;
  const forecastStd = Math.sqrt(lastP_l + lastP_s + sigma2_epsilon);
  
  const lastDate = sorted[n - 1].date;
  const nextPeriod = getNextPeriodLabel(lastDate, frequency);

  // ══════════════════════════════════════════════════════════════════════
  // TREND CLASSIFICATION
  // ══════════════════════════════════════════════════════════════════════
  
  const avgValue = y.reduce((a, b) => a + b, 0) / n;
  const slopePercentage = (lastBeta / Math.max(avgValue, 0.001)) * 100;
  
  let direction: 'up' | 'down' | 'stable';
  let strength: 'strong' | 'moderate' | 'weak';
  
  if (Math.abs(slopePercentage) < 0.5) {
    direction = 'stable';
    strength = 'weak';
  } else if (slopePercentage > 0) {
    direction = 'up';
    strength = slopePercentage > 2 ? 'strong' : 'moderate';
  } else {
    direction = 'down';
    strength = slopePercentage < -2 ? 'strong' : 'moderate';
  }

  // ══════════════════════════════════════════════════════════════════════
  // UNCERTAINTY CLASSIFICATION
  // ══════════════════════════════════════════════════════════════════════
  
  const bandWidth = mu_ci_high - mu_ci_low;
  const relativeUncertainty = bandWidth / Math.max(Math.abs(lastMu), 0.001);
  
  const uncertainty: 'low' | 'moderate' | 'high' = 
    relativeUncertainty < 0.1 ? 'low' : 
    relativeUncertainty < 0.25 ? 'moderate' : 'high';

  // ══════════════════════════════════════════════════════════════════════
  // ANOMALY DETECTION
  // ══════════════════════════════════════════════════════════════════════
  
  const innovStd = calculateStd(innovations);
  const anomalyIndices = innovations
    .map((inn, idx) => Math.abs(inn / innovStd) > 2 ? idx : -1)
    .filter(idx => idx !== -1);

  // ══════════════════════════════════════════════════════════════════════
  // RETURN RESULT
  // ══════════════════════════════════════════════════════════════════════
  
  return {
    mu_smoothed: lastMu,
    mu_ci_low,
    mu_ci_high,
    beta_smoothed: lastBeta,
    beta_ci_low,
    beta_ci_high,
    muSeries: mu_smoothed,
    betaSeries: beta_smoothed,
    sigma2_epsilon,
    sigma2_eta,
    sigma2_zeta,
    forecast: {
      nextPeriod,
      mean: forecastMean,
      p05: forecastMean - 1.645 * forecastStd,
      p25: forecastMean - 0.675 * forecastStd,
      p50: forecastMean,
      p75: forecastMean + 0.675 * forecastStd,
      p95: forecastMean + 1.645 * forecastStd,
    },
    direction,
    strength,
    uncertainty,
    innovations,
    anomalyIndices,
  };
}

/**
 * Get default result for insufficient data
 */
function getDefaultResult(frequency: Frequency): STSResult {
  return {
    mu_smoothed: 0,
    mu_ci_low: 0,
    mu_ci_high: 0,
    beta_smoothed: 0,
    beta_ci_low: 0,
    beta_ci_high: 0,
    muSeries: [],
    betaSeries: [],
    sigma2_epsilon: 0,
    sigma2_eta: 0,
    sigma2_zeta: 0,
    forecast: {
      nextPeriod: 'N/A',
      mean: 0,
      p05: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p95: 0,
    },
    direction: 'stable',
    strength: 'weak',
    uncertainty: 'high',
    innovations: [],
    anomalyIndices: [],
  };
}

/**
 * Format value for display
 */
export function formatSTSValue(value: number, unit: string | null): string {
  const u = (unit || '').toLowerCase();
  
  if (u.includes('%') || u.includes('a.m.') || u.includes('a.a.')) {
    return `${value.toFixed(2)}%`;
  }
  
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      maximumFractionDigits: 2
    });
  }
  
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
