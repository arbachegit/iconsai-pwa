import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Activity,
  BarChart3,
  Info,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type STSResult, formatSTSValue } from '@/lib/structural-time-series';

interface STSOutputPanelProps {
  data: STSResult;
  unit: string | null;
  frequency: string | null;
  indicatorName: string;
  onOpenAnalysis?: () => void;
}

export function STSOutputPanel({
  data,
  unit,
  frequency,
  indicatorName,
  onOpenAnalysis,
}: STSOutputPanelProps) {
  
  // Determine trend characteristics
  const TrendIcon = data.direction === 'up' ? ArrowUpRight : 
                    data.direction === 'down' ? ArrowDownRight : Minus;

  const trendLabel = data.direction === 'up' ? 'Alta' : 
                     data.direction === 'down' ? 'Queda' : 'Estável';

  const strengthLabel = data.strength === 'strong' ? 'forte' : 
                        data.strength === 'weak' ? 'leve' : 'moderada';

  // Band width classification
  const bandWidth = data.mu_ci_high - data.mu_ci_low;
  const relativeBand = bandWidth / Math.max(Math.abs(data.mu_smoothed), 0.001);
  const bandLabel = relativeBand < 0.1 ? 'estreita' : 
                    relativeBand < 0.25 ? 'moderada' : 'larga';
  const confidenceLabel = bandLabel === 'estreita' ? 'alta confiança' : 
                          bandLabel === 'moderada' ? 'confiança média' : 'baixa confiança';

  // Slope interpretation
  const slopeLabel = data.beta_smoothed > 0.01 ? 'Acelerando' : 
                     data.beta_smoothed < -0.01 ? 'Desacelerando' : 'Estável';

  // Trend adaptability
  const isAdaptive = data.sigma2_eta > 0.05 || data.sigma2_zeta > 0.02;

  // Get unit suffix for slope
  const getUnitSuffix = () => {
    const u = (unit || '').toLowerCase();
    if (u.includes('%')) return 'pp';
    return unit || '';
  };

  // Frequency label for period
  const freqLabels: Record<string, string> = {
    daily: 'dia',
    monthly: 'mês',
    quarterly: 'trimestre',
    annual: 'ano',
    yearly: 'ano',
  };
  const periodLabel = freqLabels[frequency || ''] || 'período';

  return (
    <div className={cn(
      "bg-[#0D0D12]",
      "border-t border-cyan-500/20",
      "px-6 py-4"
    )}>
      {/* Section title */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-500" />
          Saída do Modelo STS (State-Space)
        </h4>
        {onOpenAnalysis && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenAnalysis();
            }}
            className={cn(
              "flex items-center gap-1",
              "px-3 py-1.5",
              "text-sm font-medium text-white",
              "bg-cyan-500/10 hover:bg-cyan-500/20",
              "border border-cyan-500/30 hover:border-cyan-500/50",
              "rounded-lg",
              "transition-all duration-200"
            )}
          >
            Ver Análise Completa
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main variables grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        
        {/* Trend (μt) */}
        <div className="bg-[#0A0A0F] rounded-lg p-3 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Tendência (μt)</span>
            <TrendIcon className={cn(
              "h-4 w-4",
              data.direction === 'up' && "text-green-500",
              data.direction === 'down' && "text-red-500",
              data.direction === 'stable' && "text-yellow-500"
            )} />
          </div>
          <div className="text-lg font-bold text-white">
            {formatSTSValue(data.mu_smoothed, unit)}
          </div>
          <div className={cn(
            "text-xs mt-1",
            data.direction === 'up' && "text-green-400",
            data.direction === 'down' && "text-red-400",
            data.direction === 'stable' && "text-yellow-400"
          )}>
            {data.direction === 'stable' ? 'Estável' : `${trendLabel} ${strengthLabel}`}
          </div>
        </div>

        {/* Slope (βt) */}
        <div className="bg-[#0A0A0F] rounded-lg p-3 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Inclinação (βt)</span>
            <BarChart3 className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="text-lg font-bold text-white">
            {data.beta_smoothed > 0 ? '+' : ''}{data.beta_smoothed.toFixed(3)}
            <span className="text-xs text-muted-foreground ml-1">
              {getUnitSuffix()}/{periodLabel}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {slopeLabel}
          </div>
        </div>

        {/* Confidence Interval */}
        <div className="bg-[#0A0A0F] rounded-lg p-3 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">IC 95%</span>
            <Info className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="text-lg font-bold text-white">
            [{formatSTSValue(data.mu_ci_low, unit)} - {formatSTSValue(data.mu_ci_high, unit)}]
          </div>
          <div className={cn(
            "text-xs mt-1",
            bandLabel === 'estreita' && "text-green-400",
            bandLabel === 'moderada' && "text-yellow-400",
            bandLabel === 'larga' && "text-red-400"
          )}>
            Banda {bandLabel} ({confidenceLabel})
          </div>
        </div>
      </div>

      {/* Model variances (compact) */}
      <div className="bg-[#0A0A0F] rounded-lg p-3 border border-cyan-500/10">
        <div className="flex items-center gap-6 text-xs">
          <span className="text-muted-foreground">Variâncias:</span>
          <div className="flex items-center gap-4">
            <span>
              <span className="text-muted-foreground">σ²ε (ruído):</span>
              <span className="text-white ml-1">{data.sigma2_epsilon.toFixed(4)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">σ²η (nível):</span>
              <span className="text-white ml-1">{data.sigma2_eta.toFixed(4)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">σ²ζ (inclin.):</span>
              <span className="text-white ml-1">{data.sigma2_zeta.toFixed(4)}</span>
            </span>
          </div>
          <div className="ml-auto text-muted-foreground">
            {isAdaptive ? 'Tendência adaptativa' : 'Tendência estável'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default STSOutputPanel;
