/**
 * Calculates Pearson correlation coefficient between two arrays
 * @returns r value between -1 and 1
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const sumX = xSlice.reduce((a, b) => a + b, 0);
  const sumY = ySlice.reduce((a, b) => a + b, 0);
  const sumXY = xSlice.reduce((acc, xi, i) => acc + xi * ySlice[i], 0);
  const sumX2 = xSlice.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = ySlice.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Linear regression using least squares method
 * @returns slope, intercept, and R² value
 */
export function linearRegression(
  x: number[],
  y: number[]
): { slope: number; intercept: number; r2: number } {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const sumX = xSlice.reduce((a, b) => a + b, 0);
  const sumY = ySlice.reduce((a, b) => a + b, 0);
  const sumXY = xSlice.reduce((acc, xi, i) => acc + xi * ySlice[i], 0);
  const sumX2 = xSlice.reduce((acc, xi) => acc + xi * xi, 0);

  const meanX = sumX / n;
  const meanY = sumY / n;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = meanY - slope * meanX;

  // Calculate R²
  const yPredicted = xSlice.map((xi) => slope * xi + intercept);
  const ssRes = ySlice.reduce(
    (acc, yi, i) => acc + Math.pow(yi - yPredicted[i], 2),
    0
  );
  const ssTot = ySlice.reduce((acc, yi) => acc + Math.pow(yi - meanY, 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/**
 * Standard deviation of an array
 */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(avgSquaredDiff);
}

/**
 * Mean of an array
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Moving average with specified period
 */
export function movingAverage(values: number[], period: number): number[] {
  if (period < 1 || values.length < period) return [];

  const result: number[] = [];
  for (let i = 0; i <= values.length - period; i++) {
    const sum = values.slice(i, i + period).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * Detect trend direction based on regression slope
 */
export function detectTrend(
  slope: number,
  threshold: number = 0.01
): "up" | "down" | "stable" {
  if (slope > threshold) return "up";
  if (slope < -threshold) return "down";
  return "stable";
}

/**
 * Get correlation strength description
 */
export function getCorrelationStrength(r: number): {
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

/**
 * Generate all unique pairs from an array
 */
export function generatePairs<T>(items: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push([items[i], items[j]]);
    }
  }
  return pairs;
}

/**
 * Predict future value using linear regression
 */
export function predictValue(
  regression: { slope: number; intercept: number },
  x: number
): number {
  return regression.slope * x + regression.intercept;
}

/**
 * Calculate coefficient of variation (CV)
 */
export function coefficientOfVariation(values: number[]): number {
  const m = mean(values);
  if (m === 0) return 0;
  return (standardDeviation(values) / m) * 100;
}

/**
 * Format value with unit for display
 */
export function formatValueWithUnit(value: number | null | undefined, unit: string | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  
  const normalizedUnit = (unit || "").toLowerCase().trim();
  
  // Currency formatting
  if (normalizedUnit === "r$" || normalizedUnit.includes("reais") || normalizedUnit.includes("mil")) {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Percentage formatting
  if (normalizedUnit === "%" || normalizedUnit.includes("a.a") || normalizedUnit.includes("percent")) {
    return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }
  
  // Index formatting
  if (normalizedUnit === "índice" || normalizedUnit === "pts" || normalizedUnit === "pontos") {
    return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts`;
  }
  
  // Default with unit suffix
  if (unit && unit.trim()) {
    return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`;
  }
  
  // Default number formatting
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Get unit display symbol
 */
export function getUnitSymbol(unit: string | null | undefined): string {
  if (!unit) return "";
  const normalizedUnit = unit.toLowerCase().trim();
  
  if (normalizedUnit === "r$" || normalizedUnit.includes("reais")) return "R$";
  if (normalizedUnit === "%" || normalizedUnit.includes("a.a")) return "%";
  if (normalizedUnit === "índice" || normalizedUnit === "pts") return "pts";
  
  return unit;
}

// ============================================
// GRANGER CAUSALITY TEST
// ============================================

export interface GrangerResult {
  xCausesY: boolean;
  yCausesX: boolean;
  fStatXY: number;
  fStatYX: number;
  pValueXY: number;
  pValueYX: number;
  optimalLag: number;
  interpretation: string;
  causalityType: "x_causes_y" | "y_causes_x" | "bidirectional" | "none";
}

/**
 * Perform Granger Causality Test between two time series
 * Tests if X Granger-causes Y and if Y Granger-causes X
 * 
 * @param x - First time series (potential cause)
 * @param y - Second time series (potential effect)
 * @param maxLag - Maximum number of lags to test
 * @param significance - Significance level (default 0.05)
 * @returns GrangerResult with F-statistics, p-values, and interpretation
 */
export function grangerCausalityTest(
  x: number[],
  y: number[],
  maxLag: number = 4,
  significance: number = 0.05
): GrangerResult {
  const n = Math.min(x.length, y.length);
  
  if (n < maxLag + 5) {
    return {
      xCausesY: false,
      yCausesX: false,
      fStatXY: 0,
      fStatYX: 0,
      pValueXY: 1,
      pValueYX: 1,
      optimalLag: 1,
      interpretation: "Dados insuficientes para o teste de Granger",
      causalityType: "none",
    };
  }

  // Find optimal lag using AIC
  let bestLag = 1;
  let bestAIC = Infinity;
  
  for (let lag = 1; lag <= maxLag; lag++) {
    const aic = calculateAIC(y.slice(0, n), lag);
    if (aic < bestAIC) {
      bestAIC = aic;
      bestLag = lag;
    }
  }

  // Test X → Y
  const resultXY = testGrangerDirection(x.slice(0, n), y.slice(0, n), bestLag);
  
  // Test Y → X
  const resultYX = testGrangerDirection(y.slice(0, n), x.slice(0, n), bestLag);

  const xCausesY = resultXY.pValue < significance;
  const yCausesX = resultYX.pValue < significance;

  let causalityType: GrangerResult["causalityType"] = "none";
  let interpretation = "";

  if (xCausesY && yCausesX) {
    causalityType = "bidirectional";
    interpretation = `Causalidade bidirecional detectada (lag=${bestLag}). As variáveis se influenciam mutuamente.`;
  } else if (xCausesY) {
    causalityType = "x_causes_y";
    interpretation = `X Granger-causa Y (F=${resultXY.fStat.toFixed(2)}, p=${resultXY.pValue.toFixed(4)}). Valores passados de X ajudam a prever Y.`;
  } else if (yCausesX) {
    causalityType = "y_causes_x";
    interpretation = `Y Granger-causa X (F=${resultYX.fStat.toFixed(2)}, p=${resultYX.pValue.toFixed(4)}). Valores passados de Y ajudam a prever X.`;
  } else {
    interpretation = `Nenhuma causalidade de Granger significativa detectada ao nível α=${significance}.`;
  }

  return {
    xCausesY,
    yCausesX,
    fStatXY: resultXY.fStat,
    fStatYX: resultYX.fStat,
    pValueXY: resultXY.pValue,
    pValueYX: resultYX.pValue,
    optimalLag: bestLag,
    interpretation,
    causalityType,
  };
}

/**
 * Test Granger causality in one direction (X → Y)
 */
function testGrangerDirection(
  x: number[],
  y: number[],
  lag: number
): { fStat: number; pValue: number } {
  const n = y.length;
  const effectiveN = n - lag;
  
  if (effectiveN < lag + 2) {
    return { fStat: 0, pValue: 1 };
  }

  // Restricted model: Y(t) = α + Σ β_i * Y(t-i) + ε
  // Unrestricted model: Y(t) = α + Σ β_i * Y(t-i) + Σ γ_i * X(t-i) + ε

  // Build lagged matrices
  const yTarget: number[] = [];
  const yLagged: number[][] = [];
  const xLagged: number[][] = [];

  for (let t = lag; t < n; t++) {
    yTarget.push(y[t]);
    
    const yLags: number[] = [];
    const xLags: number[] = [];
    
    for (let i = 1; i <= lag; i++) {
      yLags.push(y[t - i]);
      xLags.push(x[t - i]);
    }
    
    yLagged.push(yLags);
    xLagged.push(xLags);
  }

  // Calculate RSS for restricted model (only Y lags)
  const rssRestricted = calculateRSS(yTarget, yLagged);
  
  // Calculate RSS for unrestricted model (Y and X lags)
  const combinedLagged = yLagged.map((yLags, i) => [...yLags, ...xLagged[i]]);
  const rssUnrestricted = calculateRSS(yTarget, combinedLagged);

  // Calculate F-statistic
  // F = ((RSS_r - RSS_u) / q) / (RSS_u / (n - k))
  // q = number of restrictions (lag parameters for X)
  // k = total parameters in unrestricted model
  const q = lag;
  const k = 1 + 2 * lag; // intercept + lag*Y + lag*X
  
  if (rssUnrestricted === 0 || effectiveN <= k) {
    return { fStat: 0, pValue: 1 };
  }

  const fStat = ((rssRestricted - rssUnrestricted) / q) / (rssUnrestricted / (effectiveN - k));
  
  // Calculate p-value using F-distribution approximation
  const pValue = fDistributionPValue(fStat, q, effectiveN - k);

  return { fStat: Math.max(0, fStat), pValue };
}

/**
 * Calculate Residual Sum of Squares using OLS
 */
function calculateRSS(y: number[], X: number[][]): number {
  const n = y.length;
  if (n === 0 || X.length === 0) return Infinity;

  // Add intercept column
  const XWithIntercept = X.map(row => [1, ...row]);
  
  // Simple OLS: β = (X'X)^(-1) X'y
  // Then RSS = Σ(y_i - ŷ_i)²
  
  try {
    const k = XWithIntercept[0].length;
    
    // Calculate X'X
    const XtX: number[][] = Array(k).fill(null).map(() => Array(k).fill(0));
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        for (let t = 0; t < n; t++) {
          XtX[i][j] += XWithIntercept[t][i] * XWithIntercept[t][j];
        }
      }
    }

    // Calculate X'y
    const Xty: number[] = Array(k).fill(0);
    for (let i = 0; i < k; i++) {
      for (let t = 0; t < n; t++) {
        Xty[i] += XWithIntercept[t][i] * y[t];
      }
    }

    // Solve for β using Gaussian elimination (simplified)
    const beta = solveLinearSystem(XtX, Xty);
    if (!beta) return Infinity;

    // Calculate predicted values and RSS
    let rss = 0;
    for (let t = 0; t < n; t++) {
      let yHat = 0;
      for (let i = 0; i < k; i++) {
        yHat += beta[i] * XWithIntercept[t][i];
      }
      rss += Math.pow(y[t] - yHat, 2);
    }

    return rss;
  } catch {
    return Infinity;
  }
}

/**
 * Solve linear system using Gaussian elimination
 */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  
  // Create augmented matrix
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k;
      }
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

    if (Math.abs(aug[i][i]) < 1e-10) return null;

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = aug[k][i] / aug[i][i];
      for (let j = i; j <= n; j++) {
        aug[k][j] -= factor * aug[i][j];
      }
    }
  }

  // Back substitution
  const x: number[] = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i];
  }

  return x;
}

/**
 * Calculate AIC for lag selection
 */
function calculateAIC(y: number[], lag: number): number {
  const n = y.length;
  const effectiveN = n - lag;
  
  if (effectiveN < lag + 2) return Infinity;

  const yTarget: number[] = [];
  const yLagged: number[][] = [];

  for (let t = lag; t < n; t++) {
    yTarget.push(y[t]);
    const lags: number[] = [];
    for (let i = 1; i <= lag; i++) {
      lags.push(y[t - i]);
    }
    yLagged.push(lags);
  }

  const rss = calculateRSS(yTarget, yLagged);
  if (rss === Infinity || rss === 0) return Infinity;

  const sigma2 = rss / effectiveN;
  const k = lag + 1; // parameters

  return effectiveN * Math.log(sigma2) + 2 * k;
}

/**
 * Approximate p-value for F-distribution
 * Using Wilson-Hilferty approximation
 */
function fDistributionPValue(f: number, df1: number, df2: number): number {
  if (f <= 0 || df1 <= 0 || df2 <= 0) return 1;
  
  // Convert F to approximate normal
  const a = df1 / 2;
  const b = df2 / 2;
  const x = df1 * f / (df1 * f + df2);
  
  // Incomplete beta function approximation using continued fraction
  const betaIncomplete = incompleteBeta(x, a, b);
  
  return Math.max(0, Math.min(1, 1 - betaIncomplete));
}

/**
 * Incomplete beta function approximation
 */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  
  // Use continued fraction for Ix(a,b)
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaContinuedFraction(x, a, b) / a;
  } else {
    return 1 - bt * betaContinuedFraction(1 - x, b, a) / b;
  }
}

/**
 * Continued fraction for incomplete beta
 */
function betaContinuedFraction(x: number, a: number, b: number): number {
  const maxIterations = 100;
  const epsilon = 1e-10;
  
  let c = 1;
  let d = 1 / (1 - (a + b) * x / (a + 1));
  let h = d;
  
  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    
    // Even term
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 / (1 + aa * d);
    c = 1 + aa / c;
    h *= d * c;
    
    // Odd term
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 / (1 + aa * d);
    c = 1 + aa / c;
    const delta = d * c;
    h *= delta;
    
    if (Math.abs(delta - 1) < epsilon) break;
  }
  
  return h;
}

/**
 * Log gamma function approximation (Stirling)
 */
function logGamma(x: number): number {
  if (x <= 0) return Infinity;
  
  const coefficients = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5,
  ];
  
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += coefficients[j] / y;
  }
  
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

// ============================================
// REGIONAL STORYTELLING HELPERS
// ============================================

export interface RegionalStoryData {
  ufCode: number;
  ufSigla: string;
  ufName: string;
  region: string;
  value: number;
  trend: "up" | "down" | "stable";
  percentChange: number;
}

export interface RegionalNarrative {
  title: string;
  story: string;
  highlights: string[];
  ranking: RegionalStoryData[];
  regionComparison: { region: string; avgValue: number; count: number }[];
}

/**
 * Generate regional storytelling narrative from data
 */
export function generateRegionalNarrative(
  data: RegionalStoryData[],
  indicatorName: string,
  unit: string | null
): RegionalNarrative {
  if (data.length === 0) {
    return {
      title: "Dados regionais não disponíveis",
      story: "Não há dados suficientes para gerar uma análise regional.",
      highlights: [],
      ranking: [],
      regionComparison: [],
    };
  }

  // Sort by value descending
  const ranking = [...data].sort((a, b) => b.value - a.value);
  
  // Group by region
  const regionGroups = new Map<string, { total: number; count: number }>();
  data.forEach((d) => {
    const current = regionGroups.get(d.region) || { total: 0, count: 0 };
    regionGroups.set(d.region, {
      total: current.total + d.value,
      count: current.count + 1,
    });
  });

  const regionComparison = Array.from(regionGroups.entries())
    .map(([region, { total, count }]) => ({
      region,
      avgValue: total / count,
      count,
    }))
    .sort((a, b) => b.avgValue - a.avgValue);

  // Build narrative
  const best = ranking[0];
  const worst = ranking[ranking.length - 1];
  const avgValue = mean(data.map((d) => d.value));
  const unitStr = unit || "";

  const highlights: string[] = [];
  
  // Best performer
  highlights.push(`🏆 ${best.ufName} (${best.ufSigla}) lidera com ${formatValueWithUnit(best.value, unit)}`);
  
  // Regional champion
  if (regionComparison.length > 0) {
    highlights.push(`📍 Região ${regionComparison[0].region} apresenta a maior média regional`);
  }
  
  // Biggest growth
  const growthLeader = [...data].sort((a, b) => b.percentChange - a.percentChange)[0];
  if (growthLeader && growthLeader.percentChange > 0) {
    highlights.push(`📈 ${growthLeader.ufName} registra maior crescimento: +${growthLeader.percentChange.toFixed(1)}%`);
  }
  
  // Warning for declines
  const declining = data.filter((d) => d.trend === "down");
  if (declining.length > 0) {
    highlights.push(`⚠️ ${declining.length} estado(s) em tendência de queda`);
  }

  const story = `
A análise do indicador **${indicatorName}** revela disparidades regionais significativas no Brasil. 
${best.ufName} destaca-se com o maior valor (${formatValueWithUnit(best.value, unit)}), 
enquanto ${worst.ufName} registra o menor (${formatValueWithUnit(worst.value, unit)}). 
A média nacional situa-se em ${formatValueWithUnit(avgValue, unit)}.

${regionComparison.length > 1 
  ? `Entre as regiões, ${regionComparison[0].region} apresenta desempenho superior com média de ${formatValueWithUnit(regionComparison[0].avgValue, unit)}, 
     seguida por ${regionComparison[1]?.region || "outras regiões"}.` 
  : ""}

${declining.length > 3 
  ? `Atenção especial deve ser dada aos ${declining.length} estados com tendência de queda, indicando possível necessidade de intervenção ou análise mais aprofundada.` 
  : declining.length > 0 
    ? `Os estados ${declining.map(d => d.ufSigla).join(", ")} apresentam tendência de queda.`
    : "A maioria dos estados apresenta tendência estável ou de crescimento."}
  `.trim();

  return {
    title: `Panorama Regional: ${indicatorName}`,
    story,
    highlights,
    ranking,
    regionComparison,
  };
}

/**
 * Map UF code to region name
 */
export function getRegionByUfCode(ufCode: number): string {
  const regionMap: Record<number, string> = {
    // Norte
    11: "Norte", 12: "Norte", 13: "Norte", 14: "Norte", 15: "Norte", 16: "Norte", 17: "Norte",
    // Nordeste
    21: "Nordeste", 22: "Nordeste", 23: "Nordeste", 24: "Nordeste", 25: "Nordeste",
    26: "Nordeste", 27: "Nordeste", 28: "Nordeste", 29: "Nordeste",
    // Sudeste
    31: "Sudeste", 32: "Sudeste", 33: "Sudeste", 35: "Sudeste",
    // Sul
    41: "Sul", 42: "Sul", 43: "Sul",
    // Centro-Oeste
    50: "Centro-Oeste", 51: "Centro-Oeste", 52: "Centro-Oeste", 53: "Centro-Oeste",
  };
  return regionMap[ufCode] || "Outros";
}

/**
 * Get UF name from code
 */
export function getUfNameByCode(ufCode: number): string {
  const ufNames: Record<number, string> = {
    11: "Rondônia", 12: "Acre", 13: "Amazonas", 14: "Roraima", 15: "Pará",
    16: "Amapá", 17: "Tocantins", 21: "Maranhão", 22: "Piauí", 23: "Ceará",
    24: "Rio Grande do Norte", 25: "Paraíba", 26: "Pernambuco", 27: "Alagoas",
    28: "Sergipe", 29: "Bahia", 31: "Minas Gerais", 32: "Espírito Santo",
    33: "Rio de Janeiro", 35: "São Paulo", 41: "Paraná", 42: "Santa Catarina",
    43: "Rio Grande do Sul", 50: "Mato Grosso do Sul", 51: "Mato Grosso",
    52: "Goiás", 53: "Distrito Federal",
  };
  return ufNames[ufCode] || `UF ${ufCode}`;
}

/**
 * Get UF sigla from code
 */
export function getUfSiglaByCode(ufCode: number): string {
  const ufSiglas: Record<number, string> = {
    11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
    21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL",
    28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP",
    41: "PR", 42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF",
  };
  return ufSiglas[ufCode] || `${ufCode}`;
}
