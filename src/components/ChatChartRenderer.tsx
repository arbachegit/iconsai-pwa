import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Brush,
  ReferenceLine,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RangeSlider } from '@/components/ui/range-slider';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, AreaChart as AreaChartIcon, Download, MessageCircle, Mail, ChevronDown, AlertCircle, Percent, Copy, Check, Zap, RotateCcw, Target, Plus, X, Minus, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'area';
  title: string;
  data: { name: string; value: number; [key: string]: any }[];
  xKey?: string;
  yKeys?: string[];
  axisConfig?: {
    min?: number;
    max?: number;
  };
}

interface ChatChartRendererProps {
  chartData: ChartData;
  className?: string;
}

interface ProportionValidation {
  isValid: boolean;
  sum: number;
  message?: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(210, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(45, 90%, 55%)',
  'hsl(0, 70%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(180, 60%, 45%)',
];

// Custom Tooltip that displays ALL extra fields from the data object
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const dadosOriginais = payload[0].payload;
  
  // Get all extra fields (excluding standard chart keys)
  const standardKeys = ['name', 'value', 'fill', 'stroke'];
  const extraFields = Object.keys(dadosOriginais)
    .filter(key => !standardKeys.includes(key) && dadosOriginais[key] !== undefined && dadosOriginais[key] !== null);
  
  // Format field name for display (capitalize, replace underscores)
  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="bg-popover p-2.5 border border-border rounded-lg shadow-lg min-w-[140px]">
      <p className="font-semibold text-sm text-foreground mb-1">
        {label || dadosOriginais.name}
      </p>
      <p className="text-primary font-medium">
        Valor: {typeof dadosOriginais.value === 'number' ? dadosOriginais.value.toLocaleString('pt-BR') : dadosOriginais.value}
      </p>
      {extraFields.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-border/50 space-y-0.5">
          {extraFields.map(campo => (
            <p key={campo} className="text-xs text-muted-foreground">
              <span className="font-medium">{formatFieldName(campo)}:</span>{' '}
              {typeof dadosOriginais[campo] === 'number' 
                ? dadosOriginais[campo].toLocaleString('pt-BR') 
                : dadosOriginais[campo]}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

// Validate if data sums to 100% (±0.1% tolerance) for proportion charts
const validateProportionData = (data: { value: number }[]): ProportionValidation => {
  const sum = data.reduce((acc, item) => acc + (item.value || 0), 0);
  const tolerance = 0.1; // ±0.1% tolerance
  const isValid = Math.abs(sum - 100) <= tolerance;
  
  return {
    isValid,
    sum,
    message: !isValid 
      ? `A soma das variáveis é de ${sum.toFixed(1)}% e deve ser 100% para este tipo de gráfico proporcional.`
      : undefined
  };
};

// Normalize data to sum to 100%
const normalizeToPercentage = <T extends { value: number }>(data: T[]): T[] => {
  const sum = data.reduce((acc, item) => acc + (item.value || 0), 0);
  if (sum === 0) return data;
  
  return data.map(item => ({
    ...item,
    value: Number(((item.value / sum) * 100).toFixed(1))
  }));
};

// Robust number parsing for values that may be strings
const parseNumericValue = (value: any): number => {
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : value;
  }
  if (typeof value === 'string') {
    // Handle Brazilian format (1.234,56) and standard format (1,234.56)
    const cleaned = value
      .replace(/[R$\s]/g, '') // Remove currency symbols
      .replace(/\./g, '')     // Remove thousand separators (BR format)
      .replace(',', '.');     // Convert decimal comma to dot
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  }
  return 0;
};

// Mapeamento reverso: nome → sigla para reconhecimento de estados
const UF_NAME_TO_SIGLA: Record<string, string> = {
  "acre": "AC", "alagoas": "AL", "amapá": "AP", "amapa": "AP", "amazonas": "AM",
  "bahia": "BA", "ceará": "CE", "ceara": "CE", "distrito federal": "DF", 
  "espírito santo": "ES", "espirito santo": "ES", "goiás": "GO", "goias": "GO", 
  "maranhão": "MA", "maranhao": "MA", "mato grosso": "MT", "mato grosso do sul": "MS", 
  "minas gerais": "MG", "pará": "PA", "para": "PA", "paraíba": "PB", "paraiba": "PB", 
  "paraná": "PR", "parana": "PR", "pernambuco": "PE", "piauí": "PI", "piaui": "PI", 
  "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS", 
  "rondônia": "RO", "rondonia": "RO", "roraima": "RR", "santa catarina": "SC", 
  "são paulo": "SP", "sao paulo": "SP", "sergipe": "SE", "tocantins": "TO"
};

const VALID_UF_SIGLAS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

// Função para normalizar sigla ou nome para sigla oficial
const normalizeUF = (input: string): string | null => {
  if (!input) return null;
  const cleaned = input.toLowerCase().trim();
  
  // Já é uma sigla válida?
  if (VALID_UF_SIGLAS.includes(cleaned.toUpperCase())) {
    return cleaned.toUpperCase();
  }
  
  // É um nome completo?
  if (UF_NAME_TO_SIGLA[cleaned]) {
    return UF_NAME_TO_SIGLA[cleaned];
  }
  
  // Tenta encontrar correspondência parcial
  for (const [name, sigla] of Object.entries(UF_NAME_TO_SIGLA)) {
    if (cleaned.includes(name) || name.includes(cleaned)) {
      return sigla;
    }
  }
  
  return null;
};

const ChartTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'bar': return <BarChart3 className="h-4 w-4" />;
    case 'line': return <TrendingUp className="h-4 w-4" />;
    case 'pie': return <PieChartIcon className="h-4 w-4" />;
    case 'area': return <AreaChartIcon className="h-4 w-4" />;
    default: return <BarChart3 className="h-4 w-4" />;
  }
};

export const ChatChartRenderer = ({ chartData, className }: ChatChartRendererProps) => {
  const { toast } = useToast();
  
  // State for normalized data
  const [normalizedData, setNormalizedData] = useState<typeof chartData.data | null>(null);
  const [showNormalizeDialog, setShowNormalizeDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Use normalized data if available, otherwise original
  const displayData = normalizedData || chartData.data;
  
  // Validate proportion data based on current display data
  const proportionValidation = useMemo(() => validateProportionData(displayData), [displayData]);
  
  // Initialize chart type with auto-correction for invalid pie charts
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>(() => {
    const requestedType = chartData.type || 'bar';
    // Auto-correct pie to bar if data doesn't sum to 100%
    if (requestedType === 'pie') {
      const validation = validateProportionData(chartData.data);
      if (!validation.isValid) {
        logger.warn(`Gráfico de pizza solicitado mas soma é ${validation.sum.toFixed(1)}%, usando barras`);
        return 'bar';
      }
    }
    return requestedType;
  });
  
  const chartRef = React.useRef<HTMLDivElement>(null);

  const xKey = chartData.xKey || 'name';
  const yKeys = chartData.yKeys || ['value'];

  // ===== Y-AXIS ZOOM CONTROLS =====
  // Y-axis domain state - initial values will be set by useEffect
  const [yDomain, setYDomain] = useState<[number, number]>([0, 100]);
  const [isAutoScale, setIsAutoScale] = useState(false);

  // ===== X-AXIS ZOOM CONTROLS =====
  // X-axis range state (index-based filtering)
  const [xRange, setXRange] = useState<[number, number]>([0, displayData.length - 1]);
  
  // ===== REFERENCE LINES =====
  interface ReferenceLineConfig {
    id: string;
    value: number;
    label: string;
    color: string;
    type: 'average' | 'target' | 'limit';
  }
  const [referenceLines, setReferenceLines] = useState<ReferenceLineConfig[]>([]);
  const [showRefLineForm, setShowRefLineForm] = useState(false);
  const [newRefLine, setNewRefLine] = useState<{ value: string; label: string; type: 'average' | 'target' | 'limit' }>({ value: '', label: '', type: 'target' });
  
  const REFLINE_COLORS: Record<string, string> = {
    average: 'hsl(150, 60%, 45%)',
    target: 'hsl(45, 90%, 55%)',
    limit: 'hsl(0, 70%, 55%)',
  };
  
  const REFLINE_LABELS: Record<string, string> = {
    average: 'Média',
    target: 'Meta',
    limit: 'Limite',
  };
  
  // Handler for brush change
  const handleBrushChange = useCallback((brushData: { startIndex?: number; endIndex?: number }) => {
    if (brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      setXRange([brushData.startIndex, brushData.endIndex]);
    }
  }, []);
  
  // Filtered data based on X-axis range
  const filteredDisplayData = useMemo(() => {
    const startIdx = Math.max(0, xRange[0]);
    const endIdx = Math.min(displayData.length - 1, xRange[1]);
    return displayData.slice(startIdx, endIdx + 1);
  }, [displayData, xRange]);

  // Calculate average from filtered data (must be after filteredDisplayData)
  // Supports multi-series: uses first yKey if not 'value'
  const dataAverage = useMemo(() => {
    if (filteredDisplayData.length === 0) return 0;
    
    // Detect which key to use for values
    const firstKey = yKeys[0];
    const useValueKey = firstKey === 'value' || !filteredDisplayData[0]?.[firstKey];
    
    const validValues = filteredDisplayData.map(d => {
      const val = useValueKey ? d.value : d[firstKey];
      return parseNumericValue(val);
    });
    
    const sum = validValues.reduce((acc, v) => acc + v, 0);
    const avg = sum / validValues.length;
    return isNaN(avg) || !isFinite(avg) ? 0 : Math.round(avg);
  }, [filteredDisplayData, yKeys]);

  const addReferenceLine = useCallback(() => {
    const value = newRefLine.type === 'average' ? dataAverage : parseFloat(newRefLine.value);
    if (isNaN(value)) {
      console.warn('Valor inválido para linha de referência:', newRefLine.value);
      return;
    }
    
    setReferenceLines(prev => [...prev, {
      id: `ref-${Date.now()}`,
      value,
      label: newRefLine.label || REFLINE_LABELS[newRefLine.type],
      color: REFLINE_COLORS[newRefLine.type],
      type: newRefLine.type,
    }]);
    setNewRefLine({ value: '', label: '', type: 'target' });
    setShowRefLineForm(false);
  }, [newRefLine, dataAverage]);

  const removeReferenceLine = useCallback((id: string) => {
    setReferenceLines(prev => prev.filter(r => r.id !== id));
  }, []);

  // ===== MOVING AVERAGE & TREND LINE =====
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [showTrendLine, setShowTrendLine] = useState(false);

  // Moving Average calculation (3-point window)
  // Supports multi-series: uses first yKey if not 'value'
  const movingAverageData = useMemo(() => {
    if (!showMovingAverage || filteredDisplayData.length < 3) return [];
    const window = 3;
    
    // Detect which key to use for values
    const firstKey = yKeys[0];
    const useValueKey = firstKey === 'value' || !filteredDisplayData[0]?.[firstKey];
    
    return filteredDisplayData.map((item, idx, arr) => {
      if (idx < window - 1) return { ...item, movingAvg: null };
      const slice = arr.slice(idx - window + 1, idx + 1);
      const validValues = slice.map(d => {
        const val = useValueKey ? d.value : d[firstKey];
        return parseNumericValue(val);
      });
      const avg = validValues.reduce((sum, v) => sum + v, 0) / window;
      return { ...item, movingAvg: isNaN(avg) || !isFinite(avg) ? null : avg };
    });
  }, [filteredDisplayData, showMovingAverage, yKeys]);

  // Linear Regression for Trend Line with R² calculation
  // Supports multi-series: uses first yKey if not 'value'
  const trendLineData = useMemo(() => {
    if (!showTrendLine || filteredDisplayData.length < 2) return null;
    
    // Detect which key to use for values
    const firstKey = yKeys[0];
    const useValueKey = firstKey === 'value' || !filteredDisplayData[0]?.[firstKey];
    
    const yValues = filteredDisplayData.map(d => {
      const val = useValueKey ? d.value : d[firstKey];
      return parseNumericValue(val);
    });
    
    // Validate we have valid numeric data
    const validYValues = yValues.filter(v => !isNaN(v) && isFinite(v) && v !== 0);
    if (validYValues.length < 2) return null;
    
    const n = yValues.length;
    const xValues = yValues.map((_, i) => i);
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return null; // Avoid division by zero
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    
    // Validate results
    if (isNaN(slope) || !isFinite(slope) || isNaN(intercept) || !isFinite(intercept)) return null;
    
    // Calculate R²
    const yMean = sumY / n;
    const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = yValues.reduce((sum, y, i) => sum + Math.pow(y - (slope * xValues[i] + intercept), 2), 0);
    const r2 = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);
    
    const data = filteredDisplayData.map((item, idx) => ({
      ...item,
      trend: intercept + slope * idx
    }));
    
    return { slope, intercept, r2: isNaN(r2) ? 0 : r2, data };
  }, [filteredDisplayData, showTrendLine, yKeys]);

  // Recalculate Y bounds based on filtered data
  // Supports multi-series: collects values from all yKeys
  const filteredDataBounds = useMemo(() => {
    // Collect all numeric values from all yKeys
    const allValues: number[] = [];
    filteredDisplayData.forEach(d => {
      yKeys.forEach(key => {
        const val = parseNumericValue(d[key]);
        if (!isNaN(val) && isFinite(val)) {
          allValues.push(val);
        }
      });
      // Also check 'value' field as fallback
      if (!yKeys.includes('value') && d.value !== undefined) {
        const val = parseNumericValue(d.value);
        if (!isNaN(val) && isFinite(val)) {
          allValues.push(val);
        }
      }
    });
    
    if (allValues.length === 0) {
      return { dataMin: 0, dataMax: 100, absoluteMin: 0, absoluteMax: 100 };
    }
    
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const padding = (dataMax - dataMin) * 0.1 || 5;
    
    return {
      dataMin: isNaN(dataMin) ? 0 : dataMin,
      dataMax: isNaN(dataMax) ? 100 : dataMax,
      absoluteMin: 0,
      absoluteMax: Math.ceil((isNaN(dataMax) ? 100 : dataMax) + padding)
    };
  }, [filteredDisplayData, yKeys]);

  // Reset xRange when data changes
  useEffect(() => {
    setXRange([0, displayData.length - 1]);
  }, [displayData.length]);

  // Reset yDomain when filtered data changes or chart type changes
  useEffect(() => {
    if (isAutoScale) {
      const autoMin = Math.max(0, Math.floor(filteredDataBounds.dataMin - 5));
      setYDomain([autoMin, filteredDataBounds.absoluteMax]);
    } else {
      setYDomain([0, filteredDataBounds.absoluteMax]);
    }
  }, [filteredDataBounds.absoluteMax, filteredDataBounds.dataMin, chartType]);

  // Handle auto-scale toggle
  useEffect(() => {
    if (isAutoScale) {
      const autoMin = Math.max(0, Math.floor(filteredDataBounds.dataMin - 5));
      setYDomain([autoMin, filteredDataBounds.absoluteMax]);
    }
  }, [isAutoScale, filteredDataBounds]);

  // Handle pie chart selection with normalization prompt
  const handlePieSelection = () => {
    if (proportionValidation.isValid) {
      setChartType('pie');
    } else {
      setShowNormalizeDialog(true);
    }
  };

  // Apply normalization and switch to pie
  const applyNormalization = () => {
    const normalized = normalizeToPercentage(chartData.data);
    setNormalizedData(normalized);
    setChartType('pie');
    setShowNormalizeDialog(false);
  };

  const exportToCSV = () => {
    const headers = [xKey, ...yKeys].join(',');
    const rows = displayData.map(item => 
      [item[xKey], ...yKeys.map(k => item[k])].join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `grafico_${chartData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const shareViaWhatsApp = () => {
    const text = `📊 ${chartData.title}\n\n${displayData.map(d => `${d[xKey]}: ${d.value}`).join('\n')}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Gráfico: ${chartData.title}`;
    const body = `📊 ${chartData.title}\n\n${displayData.map(d => `${d[xKey]}: ${d.value}`).join('\n')}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  const copyChartData = async () => {
    const textToCopy = `📊 ${chartData.title}\n\nDados:\n${displayData.map(d => `- ${d[xKey]}: ${d.value}`).join('\n')}\n\nPrompt sugerido para recriar:\n"Crie um gráfico de ${chartType === 'bar' ? 'barras' : chartType === 'line' ? 'linha' : chartType === 'pie' ? 'pizza' : 'área'} mostrando: ${displayData.map(d => `${d[xKey]} (${d.value})`).join(', ')}"`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast({
        title: "Copiado!",
        description: "Dados do gráfico copiados para a área de transferência",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar os dados",
        variant: "destructive",
      });
    }
  };

  const renderChart = () => {
    // Only show brush if there are more than 3 data points
    const showBrush = displayData.length > 3;
    const chartHeight = showBrush ? 300 : 250;
    
    switch (chartType) {
      case 'bar':
        // Use trendLineData if trend line is enabled, merging with display data
        const barChartData = showTrendLine && trendLineData ? trendLineData.data : (showMovingAverage ? movingAverageData : displayData);
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: showBrush ? 5 : 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                domain={[yDomain[0], yDomain[1]]}
                allowDataOverflow={true}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <RechartsTooltip content={<CustomChartTooltip />} />
              <Legend />
              {yKeys.map((key, idx) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={[4, 4, 0, 0]} name={key} />
              ))}
              {/* Moving Average Line for bar chart */}
              {showMovingAverage && (
                <Line
                  type="monotone"
                  dataKey="movingAvg"
                  stroke="hsl(45, 90%, 55%)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Média Móvel"
                  connectNulls={false}
                />
              )}
              {/* Trend Line for bar chart */}
              {showTrendLine && trendLineData && (
                <Line
                  type="linear"
                  dataKey="trend"
                  stroke="hsl(280, 60%, 55%)"
                  strokeWidth={2}
                  strokeDasharray="10 5"
                  dot={false}
                  name="Tendência"
                />
              )}
              {referenceLines.map((refLine) => (
                <ReferenceLine
                  key={refLine.id}
                  y={refLine.value}
                  stroke={refLine.color}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `${refLine.label}: ${refLine.value}`,
                    position: 'right',
                    fill: refLine.color,
                    fontSize: 10,
                  }}
                />
              ))}
              {showBrush && (
                <Brush
                  dataKey={xKey}
                  height={30}
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--muted))"
                  startIndex={xRange[0]}
                  endIndex={xRange[1]}
                  onChange={handleBrushChange}
                  tickFormatter={(value) => String(value).substring(0, 8)}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'line':
        // Use movingAverageData or trendLineData if enabled, otherwise displayData
        const lineChartData = showMovingAverage ? movingAverageData : (showTrendLine && trendLineData ? trendLineData.data : displayData);
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 0, bottom: showBrush ? 5 : 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                domain={[yDomain[0], yDomain[1]]}
                allowDataOverflow={true}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <RechartsTooltip content={<CustomChartTooltip />} />
              <Legend />
              {yKeys.map((key, idx) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]} 
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], strokeWidth: 2 }}
                  name={key}
                />
              ))}
              {/* Moving Average Line */}
              {showMovingAverage && (
                <Line
                  type="monotone"
                  dataKey="movingAvg"
                  stroke="hsl(45, 90%, 55%)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Média Móvel"
                  connectNulls={false}
                />
              )}
              {/* Trend Line */}
              {showTrendLine && trendLineData && (
                <Line
                  type="linear"
                  dataKey="trend"
                  stroke="hsl(280, 60%, 55%)"
                  strokeWidth={2}
                  strokeDasharray="10 5"
                  dot={false}
                  name="Tendência"
                />
              )}
              {referenceLines.map((refLine) => (
                <ReferenceLine
                  key={refLine.id}
                  y={refLine.value}
                  stroke={refLine.color}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `${refLine.label}: ${refLine.value}`,
                    position: 'right',
                    fill: refLine.color,
                    fontSize: 10,
                  }}
                />
              ))}
              {showBrush && (
                <Brush
                  dataKey={xKey}
                  height={30}
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--muted))"
                  startIndex={xRange[0]}
                  endIndex={xRange[1]}
                  onChange={handleBrushChange}
                  tickFormatter={(value) => String(value).substring(0, 8)}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={filteredDisplayData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {filteredDisplayData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomChartTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        // Use trendLineData if trend line is enabled
        const areaChartData = showTrendLine && trendLineData ? trendLineData.data : (showMovingAverage ? movingAverageData : displayData);
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={areaChartData} margin={{ top: 10, right: 10, left: 0, bottom: showBrush ? 5 : 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                domain={[yDomain[0], yDomain[1]]}
                allowDataOverflow={true}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <RechartsTooltip content={<CustomChartTooltip />} />
              <Legend />
              {yKeys.map((key, idx) => (
                <Area 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]} 
                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                  fillOpacity={0.3}
                  name={key}
                />
              ))}
              {/* Moving Average Line for area chart */}
              {showMovingAverage && (
                <Line
                  type="monotone"
                  dataKey="movingAvg"
                  stroke="hsl(45, 90%, 55%)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Média Móvel"
                  connectNulls={false}
                />
              )}
              {/* Trend Line for area chart */}
              {showTrendLine && trendLineData && (
                <Line
                  type="linear"
                  dataKey="trend"
                  stroke="hsl(280, 60%, 55%)"
                  strokeWidth={2}
                  strokeDasharray="10 5"
                  dot={false}
                  name="Tendência"
                />
              )}
              {referenceLines.map((refLine) => (
                <ReferenceLine
                  key={refLine.id}
                  y={refLine.value}
                  stroke={refLine.color}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `${refLine.label}: ${refLine.value}`,
                    position: 'right',
                    fill: refLine.color,
                    fontSize: 10,
                  }}
                />
              ))}
              {showBrush && (
                <Brush
                  dataKey={xKey}
                  height={30}
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--muted))"
                  startIndex={xRange[0]}
                  endIndex={xRange[1]}
                  onChange={handleBrushChange}
                  tickFormatter={(value) => String(value).substring(0, 8)}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  // Preview of normalized values for dialog
  const normalizedPreview = useMemo(() => normalizeToPercentage(chartData.data), [chartData.data]);

  return (
    <TooltipProvider>
      <div ref={chartRef} className={cn("my-3 rounded-lg border border-border/50 overflow-hidden bg-card w-full", className)}>
        {/* Header with title and controls */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-sm font-medium truncate">{chartData.title}</h4>
            {normalizedData && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                    <Percent className="h-3 w-3" />
                    Normalizado
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Valores convertidos para porcentagem (soma = 100%)</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Chart Type Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <ChartTypeIcon type={chartType} />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Barras - sempre habilitado */}
                <DropdownMenuItem onClick={() => setChartType('bar')}>
                  <BarChart3 className="h-4 w-4 mr-2" /> Barras
                </DropdownMenuItem>
                
                {/* Linha - sempre habilitado */}
                <DropdownMenuItem onClick={() => setChartType('line')}>
                  <TrendingUp className="h-4 w-4 mr-2" /> Linha
                </DropdownMenuItem>
                
                {/* Pizza - usa handlePieSelection que abre dialog de normalização se necessário */}
                <DropdownMenuItem onClick={handlePieSelection}>
                  <PieChartIcon className="h-4 w-4 mr-2" /> 
                  Pizza
                  {!proportionValidation.isValid && (
                    <span className="ml-auto text-xs text-amber-400">
                      ({proportionValidation.sum.toFixed(0)}%)
                    </span>
                  )}
                </DropdownMenuItem>
                
                {/* Área - sempre habilitado */}
                <DropdownMenuItem onClick={() => setChartType('area')}>
                  <AreaChartIcon className="h-4 w-4 mr-2" /> Área
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Copy Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={copyChartData}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Copiar dados e prompt</p>
              </TooltipContent>
            </Tooltip>

            {/* Export/Share Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareViaWhatsApp}>
                  <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareViaEmail}>
                  <Mail className="h-4 w-4 mr-2" /> Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Y-Axis Zoom Controls - Only for bar, line, area (not pie) */}
        {chartType !== 'pie' && (
          <div className="px-3 py-2 border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Eixo Y:
              </span>
              
              <div className="flex-1 px-2">
                <RangeSlider
                  min={filteredDataBounds.absoluteMin}
                  max={filteredDataBounds.absoluteMax}
                  step={1}
                  value={yDomain}
                  onValueChange={(val) => {
                    setIsAutoScale(false);
                    setYDomain(val as [number, number]);
                  }}
                  disabled={isAutoScale}
                  className={cn(isAutoScale && "opacity-50")}
                />
              </div>
              
              <div className="flex items-center gap-1 text-xs font-mono min-w-[70px]">
                <span className="text-cyan-400">{yDomain[0]}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-cyan-400">{yDomain[1]}</span>
              </div>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isAutoScale ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-6 text-[10px] gap-1 px-2",
                      isAutoScale && "bg-cyan-600 hover:bg-cyan-700"
                    )}
                    onClick={() => setIsAutoScale(!isAutoScale)}
                  >
                    <Zap className="h-3 w-3" />
                    Auto
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {isAutoScale 
                      ? "Desativar auto-ajuste e usar controle manual" 
                      : "Ativar auto-ajuste para focar nas variações"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* X-Axis Zoom Controls - Only for bar, line, area (not pie) and when more than 2 data points */}
        {chartType !== 'pie' && displayData.length > 2 && (
          <div className="px-3 py-2 border-b border-border/30 bg-muted/10">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Eixo X:
              </span>
              
              <div className="flex-1 px-2">
                <RangeSlider
                  min={0}
                  max={displayData.length - 1}
                  step={1}
                  value={xRange}
                  onValueChange={(val) => setXRange(val as [number, number])}
                />
              </div>
              
              <div className="flex items-center gap-1 text-xs min-w-[100px]">
                <span className="text-amber-400 truncate max-w-[45px]" title={displayData[xRange[0]]?.[xKey]}>
                  {displayData[xRange[0]]?.[xKey]}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-amber-400 truncate max-w-[45px]" title={displayData[xRange[1]]?.[xKey]}>
                  {displayData[xRange[1]]?.[xKey]}
                </span>
              </div>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1 px-2"
                    onClick={() => {
                      setXRange([0, displayData.length - 1]);
                      setIsAutoScale(false);
                      setYDomain([0, filteredDataBounds.absoluteMax]);
                    }}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Resetar zoom para mostrar todos os dados</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {/* Data point count indicator */}
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Exibindo {filteredDisplayData.length} de {displayData.length} pontos</span>
              {filteredDisplayData.length < displayData.length && (
                <span className="text-amber-400">
                  Zoom ativo ({Math.round((filteredDisplayData.length / displayData.length) * 100)}%)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Reference Lines Controls - Only for bar, line, area (not pie) */}
        {chartType !== 'pie' && (
          <div className="px-3 py-2 border-b border-border/30 bg-muted/5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Linhas de Referência</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1 px-2"
                onClick={() => setShowRefLineForm(!showRefLineForm)}
              >
                {showRefLineForm ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {showRefLineForm ? 'Fechar' : 'Adicionar'}
              </Button>
            </div>
            
            {/* Add reference line form */}
            {showRefLineForm && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded bg-muted/30">
                <select
                  className="h-7 text-xs rounded border border-border bg-background px-2"
                  value={newRefLine.type}
                  onChange={(e) => setNewRefLine(prev => ({ 
                    ...prev, 
                    type: e.target.value as 'average' | 'target' | 'limit',
                    value: e.target.value === 'average' ? String(dataAverage) : prev.value
                  }))}
                >
                  <option value="target">Meta</option>
                  <option value="average">Média ({dataAverage})</option>
                  <option value="limit">Limite</option>
                </select>
                <Input
                  type="number"
                  placeholder="Valor"
                  className="h-7 w-20 text-xs"
                  value={newRefLine.type === 'average' ? dataAverage : newRefLine.value}
                  disabled={newRefLine.type === 'average'}
                  onChange={(e) => setNewRefLine(prev => ({ ...prev, value: e.target.value }))}
                />
                <Input
                  type="text"
                  placeholder="Label (opcional)"
                  className="h-7 flex-1 text-xs"
                  value={newRefLine.label}
                  onChange={(e) => setNewRefLine(prev => ({ ...prev, label: e.target.value }))}
                />
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={addReferenceLine}
                  disabled={newRefLine.type !== 'average' && (!newRefLine.value || isNaN(parseFloat(newRefLine.value)))}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Active reference lines */}
            {referenceLines.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {referenceLines.map((refLine) => (
                  <span
                    key={refLine.id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] rounded-full border"
                    style={{ 
                      borderColor: refLine.color, 
                      backgroundColor: `${refLine.color}20`,
                      color: refLine.color 
                    }}
                  >
                    <span className="w-2 h-0.5" style={{ backgroundColor: refLine.color }} />
                    {refLine.label}: {refLine.value}
                    <button
                      className="hover:opacity-70 ml-0.5"
                      onClick={() => removeReferenceLine(refLine.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Moving Average & Trend Line Controls - For line, bar, and area charts */}
        {(chartType === 'line' || chartType === 'bar' || chartType === 'area') && (
          <div className="px-3 py-2 border-b border-border/30 bg-muted/5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Análise:</span>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showMovingAverage ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-6 text-[10px] gap-1 px-2",
                      showMovingAverage && "bg-amber-600 hover:bg-amber-700"
                    )}
                    onClick={() => setShowMovingAverage(!showMovingAverage)}
                  >
                    <TrendingUp className="h-3 w-3" />
                    Média Móvel
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Exibir média móvel de 3 pontos para suavizar variações</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showTrendLine ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-6 text-[10px] gap-1 px-2",
                      showTrendLine && "bg-purple-600 hover:bg-purple-700"
                    )}
                    onClick={() => setShowTrendLine(!showTrendLine)}
                  >
                    <Activity className="h-3 w-3" />
                    Tendência
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Exibir linha de regressão linear para análise de tendência</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Trend Line Equation and R² */}
              {showTrendLine && trendLineData && (
                <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                  <span>
                    y = {
                      isNaN(trendLineData.slope) || !isFinite(trendLineData.slope)
                        ? 'N/A'
                        : Math.abs(trendLineData.slope) >= 1000 || (Math.abs(trendLineData.slope) > 0 && Math.abs(trendLineData.slope) < 0.0001)
                          ? trendLineData.slope.toExponential(2)
                          : trendLineData.slope.toFixed(4)
                    }x + {
                      isNaN(trendLineData.intercept) || !isFinite(trendLineData.intercept)
                        ? 'N/A'
                        : Math.abs(trendLineData.intercept) >= 1000 || (Math.abs(trendLineData.intercept) > 0 && Math.abs(trendLineData.intercept) < 0.0001)
                          ? trendLineData.intercept.toExponential(2)
                          : trendLineData.intercept.toFixed(4)
                    }
                  </span>
                  <span className="text-emerald-400 font-medium">
                    (R² = {
                      isNaN(trendLineData.r2) || !isFinite(trendLineData.r2)
                        ? 'N/A'
                        : trendLineData.r2.toFixed(4)
                    })
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="p-3">
          {renderChart()}
        </div>
      </div>

      {/* Normalization Confirmation Dialog */}
      <AlertDialog open={showNormalizeDialog} onOpenChange={setShowNormalizeDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-amber-500" />
              Normalizar para 100%?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  A soma atual dos valores é <strong className="text-foreground">{proportionValidation.sum.toFixed(1)}%</strong>, 
                  mas gráficos de pizza requerem exatamente 100%.
                </p>
                <p>
                  Deseja converter automaticamente os valores para porcentagens proporcionais?
                </p>
                
                {/* Preview table */}
                <div className="mt-3 rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">Categoria</th>
                        <th className="px-2 py-1.5 text-right font-medium">Original</th>
                        <th className="px-2 py-1.5 text-right font-medium text-emerald-400">Normalizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.data.map((item, idx) => (
                        <tr key={idx} className="border-t border-border/50">
                          <td className="px-2 py-1.5 truncate max-w-[120px]">{item.name}</td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground">{item.value}</td>
                          <td className="px-2 py-1.5 text-right text-emerald-400 font-medium">
                            {normalizedPreview[idx]?.value}%
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-border bg-muted/30">
                        <td className="px-2 py-1.5 font-medium">Total</td>
                        <td className="px-2 py-1.5 text-right text-amber-400 font-medium">
                          {proportionValidation.sum.toFixed(1)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-emerald-400 font-medium">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={applyNormalization} className="bg-emerald-600 hover:bg-emerald-700">
              <Percent className="h-4 w-4 mr-2" />
              Normalizar e Exibir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

// Parse single CHART_DATA block using brace-balancing
const extractChartBlock = (content: string, startSearchIndex: number): { chartData: ChartData; jsonStart: number; jsonEnd: number } | null => {
  const markerIndex = content.indexOf('CHART_DATA:', startSearchIndex);
  if (markerIndex === -1) return null;
  
  const startIndex = markerIndex + 'CHART_DATA:'.length;
  let braceCount = 0;
  let jsonStart = -1;
  let jsonEnd = -1;
  
  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
      if (jsonStart === -1) jsonStart = i;
      braceCount++;
    } else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0 && jsonStart !== -1) {
        jsonEnd = i + 1;
        break;
      }
    }
  }
  
  if (jsonStart === -1 || jsonEnd === -1) return null;
  
  try {
    const jsonStr = content.slice(jsonStart, jsonEnd);
    const chartData = JSON.parse(jsonStr) as ChartData;
    return { chartData, jsonStart: markerIndex, jsonEnd };
  } catch (e) {
    console.error('Error parsing chart data:', e);
    return null;
  }
};

// Parse CHART_DATA from text content (supports multiple charts)
export const parseChartData = (content: string): { chartData: ChartData | null; cleanedContent: string; allCharts?: ChartData[] } => {
  const allCharts: ChartData[] = [];
  const blocksToRemove: { start: number; end: number }[] = [];
  
  let searchIndex = 0;
  while (searchIndex < content.length) {
    const block = extractChartBlock(content, searchIndex);
    if (!block) break;
    
    allCharts.push(block.chartData);
    blocksToRemove.push({ start: block.jsonStart, end: block.jsonEnd });
    searchIndex = block.jsonEnd;
  }
  
  if (allCharts.length === 0) {
    return { chartData: null, cleanedContent: content };
  }
  
  // Remove all CHART_DATA blocks from content (in reverse order to preserve indices)
  let cleanedContent = content;
  for (let i = blocksToRemove.length - 1; i >= 0; i--) {
    const block = blocksToRemove[i];
    cleanedContent = (
      cleanedContent.slice(0, block.start) + 
      cleanedContent.slice(block.end)
    ).trim();
  }
  
  return { 
    chartData: allCharts[0], // First chart for backward compatibility
    cleanedContent,
    allCharts // All charts for components that support multiple
  };
};
