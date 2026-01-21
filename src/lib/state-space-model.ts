/**
 * State-Space Model for Time Series Analysis
 * Implements a simplified Kalman filter for stochastic trend estimation
 */

import { getNextPeriodLabel, type Frequency } from './date-formatters';

export interface StateSpaceResult {
  trend: number[];
  forecast: {
    value: number;
    lower: number;
    upper: number;
    confidence: number;
  };
  direction: 'up' | 'down' | 'stable';
  strength: 'strong' | 'moderate' | 'weak';
  uncertainty: 'low' | 'moderate' | 'high';
  nextPeriodLabel: string;
  percentageChange: number;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Analyze time series using State-Space model with Kalman filter
 * @param data - Array of { date, value } objects sorted by date
 * @param frequency - Data frequency
 * @returns StateSpaceResult with trend analysis and forecast
 */
export function analyzeTimeSeries(
  data: { date: Date | string; value: number }[],
  frequency: Frequency
): StateSpaceResult {
  // Default result for insufficient data
  const defaultResult: StateSpaceResult = {
    trend: [],
    forecast: { value: 0, lower: 0, upper: 0, confidence: 0.68 },
    direction: 'stable',
    strength: 'weak',
    uncertainty: 'high',
    nextPeriodLabel: 'N/A',
    percentageChange: 0,
  };

  if (!data || data.length < 3) {
    return defaultResult;
  }

  // Sort by date
  const sorted = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const values = sorted.map(d => d.value);
  const n = values.length;

  // Initialize state
  let level = values[0];
  let slope = n > 5 ? (values[Math.min(5, n - 1)] - values[0]) / Math.min(5, n - 1) : 0;

  // Variance parameters
  const sigmaObs = calculateStdDev(values) * 0.5;

  // Kalman filter
  const trend: number[] = [];
  const K = 0.3; // Kalman gain

  for (let i = 0; i < n; i++) {
    // Prediction
    const predictedLevel = level + slope;
    const predictedSlope = slope;

    // Update
    const error = values[i] - predictedLevel;
    level = predictedLevel + K * error;
    slope = predictedSlope + K * error * 0.1;

    trend.push(level);
  }

  // Forecast for next period
  const forecastValue = level + slope;
  const forecastStd = sigmaObs * 1.5;

  // Determine direction and strength
  const avgValue = values.reduce((a, b) => a + b, 0) / n;
  const slopePercentage = (slope / Math.max(avgValue, 0.001)) * 100;

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

  // Calculate uncertainty
  const cv = (forecastStd / Math.max(Math.abs(forecastValue), 0.001)) * 100;
  const uncertainty: 'low' | 'moderate' | 'high' = cv < 5 ? 'low' : cv < 15 ? 'moderate' : 'high';

  // Next period label
  const lastDate = sorted[n - 1].date;
  const nextPeriodLabel = getNextPeriodLabel(lastDate, frequency);

  // Percentage change from last value to forecast
  const lastValue = values[n - 1];
  const percentageChange = lastValue !== 0 
    ? ((forecastValue - lastValue) / Math.abs(lastValue)) * 100 
    : 0;

  return {
    trend,
    forecast: {
      value: forecastValue,
      lower: forecastValue - 1.96 * forecastStd,
      upper: forecastValue + 1.96 * forecastStd,
      confidence: 0.68,
    },
    direction,
    strength,
    uncertainty,
    nextPeriodLabel,
    percentageChange,
  };
}

/**
 * Get trend description in Portuguese
 */
export function getTrendDescription(result: StateSpaceResult): string {
  const directionLabel = {
    up: 'Alta',
    down: 'Baixa',
    stable: 'Estável',
  }[result.direction];

  const strengthLabel = {
    strong: 'forte',
    moderate: 'moderada',
    weak: 'fraca',
  }[result.strength];

  if (result.direction === 'stable') {
    return 'Tendência estável';
  }

  const change = result.percentageChange >= 0 
    ? `+${result.percentageChange.toFixed(1)}%` 
    : `${result.percentageChange.toFixed(1)}%`;

  return `${directionLabel} ${strengthLabel} (${change})`;
}

/**
 * Get uncertainty bar width (0-100)
 */
export function getUncertaintyBarWidth(uncertainty: 'low' | 'moderate' | 'high'): number {
  switch (uncertainty) {
    case 'low': return 33;
    case 'moderate': return 66;
    case 'high': return 100;
    default: return 50;
  }
}

/**
 * Get uncertainty label in Portuguese
 */
export function getUncertaintyLabel(uncertainty: 'low' | 'moderate' | 'high'): string {
  switch (uncertainty) {
    case 'low': return 'Baixa';
    case 'moderate': return 'Moderada';
    case 'high': return 'Alta';
    default: return 'N/A';
  }
}
