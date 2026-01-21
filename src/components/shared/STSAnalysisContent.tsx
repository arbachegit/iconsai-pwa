import { 
  TrendingUp, 
  TrendingDown,
  Target, 
  AlertTriangle,
  BarChart3,
  Activity,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type STSResult, formatSTSValue } from '@/lib/structural-time-series';

interface STSAnalysisContentProps {
  onBack: () => void;
  indicatorName: string;
  unit: string | null;
  frequency: string | null;
  stsData: STSResult;
  statistics: {
    mean: number;
    movingAverage: number | null;
    stdDev: number;
    coefficientOfVariation: number;
  };
  currentValue: number;
}

export function STSAnalysisContent({
  onBack,
  indicatorName,
  unit,
  frequency,
  stsData,
  statistics,
  currentValue,
}: STSAnalysisContentProps) {
  // Trend characteristics
  const trendDirection = stsData.direction;
  const trendStrength = stsData.strength;
  
  const trendLabel = trendDirection === 'up' ? `ALTA ${trendStrength === 'strong' ? 'FORTE' : trendStrength === 'weak' ? 'LEVE' : 'MODERADA'}` :
                     trendDirection === 'down' ? `QUEDA ${trendStrength === 'strong' ? 'FORTE' : trendStrength === 'weak' ? 'LEVE' : 'MODERADA'}` :
                     'ESTABILIDADE';

  // Position relative to moving average
  const ma = statistics.movingAverage || statistics.mean;
  const positionToMA = currentValue > ma * 1.02 ? 'above' :
                       currentValue < ma * 0.98 ? 'below' : 'near';

  // CV classification
  const cvClassification = statistics.coefficientOfVariation < 15 ? 'baixa' :
                           statistics.coefficientOfVariation < 30 ? 'moderada' : 'alta';

  // Uncertainty classification
  const bandWidth = stsData.mu_ci_high - stsData.mu_ci_low;
  const uncertaintyLevel = (bandWidth / Math.max(Math.abs(stsData.mu_smoothed), 0.001)) < 0.1 ? 'baixa' :
                           (bandWidth / Math.max(Math.abs(stsData.mu_smoothed), 0.001)) < 0.25 ? 'moderada' : 'alta';

  // Frequency labels
  const frequencyLabels: Record<string, string> = {
    daily: 'dia',
    monthly: 'mês',
    quarterly: 'trimestre',
    annual: 'ano',
    yearly: 'ano',
  };
  const periodLabel = frequencyLabels[frequency || ''] || 'período';

  const maPeriods: Record<string, number> = {
    daily: 30,
    monthly: 12,
    quarterly: 4,
    annual: 5,
    yearly: 5,
  };
  const maWindow = maPeriods[frequency || ''] || 4;

  // Format helper
  const formatVal = (v: number) => formatSTSValue(v, unit);

  // Get unit suffix
  const getUnitSuffix = () => {
    const u = (unit || '').toLowerCase();
    if (u.includes('%')) return 'pp';
    return unit || '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="flex-shrink-0 sticky top-0 z-10 px-6 py-4 border-b border-cyan-500/20 bg-[#0D0D12]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={cn(
              "flex items-center gap-2 px-3 py-2",
              "bg-cyan-500/10 hover:bg-cyan-500/20",
              "border border-cyan-500/30 hover:border-cyan-500/50",
              "rounded-lg transition-all duration-200 text-white"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-500" />
            <h3 className="text-lg font-semibold text-white">Análise Completa</h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-[88px]">{indicatorName}</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
        {/* Section 1: Trend Analysis */}
        <section>
          <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 mb-3">
            {trendDirection === 'up' ? <TrendingUp className="h-4 w-4" /> : 
             trendDirection === 'down' ? <TrendingDown className="h-4 w-4" /> :
             <Activity className="h-4 w-4" />}
            ANÁLISE DA TENDÊNCIA (State-Space)
          </h4>
          <div className="text-sm text-gray-300 space-y-3">
            <p>
              A série de <strong className="text-white">{indicatorName}</strong> apresenta 
              uma tendência estrutural de <strong className={cn(
                trendDirection === 'up' && "text-green-400",
                trendDirection === 'down' && "text-red-400",
                trendDirection === 'stable' && "text-yellow-400"
              )}>{trendLabel}</strong>.
            </p>
            <p>
              O modelo State-Space identificou que o patamar subjacente 
              (<span className="font-mono text-cyan-300">μt = {formatVal(stsData.mu_smoothed)}</span>) 
              está em trajetória {trendDirection === 'up' ? 'ascendente' : 
                                  trendDirection === 'down' ? 'descendente' : 'estável'}, 
              com uma inclinação (<span className="font-mono text-cyan-300">βt = {stsData.beta_smoothed > 0 ? '+' : ''}{stsData.beta_smoothed.toFixed(3)} {getUnitSuffix()}/{periodLabel}</span>) 
              indicando {stsData.beta_smoothed > 0.01 ? 'aceleração' : 
                         stsData.beta_smoothed < -0.01 ? 'desaceleração' : 'estabilidade'} contínua.
            </p>
            <div className="bg-[#12121A] rounded-lg p-3 border border-cyan-500/10">
              <p className="text-xs text-muted-foreground mb-2">O que isso significa na prática:</p>
              <ul className="text-sm space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5">•</span>
                  <span>A tendência "de fundo" está {trendDirection === 'up' ? 'subindo' : trendDirection === 'down' ? 'caindo' : 'estável'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5">•</span>
                  <span>A velocidade de {trendDirection === 'up' ? 'crescimento' : trendDirection === 'down' ? 'queda' : 'variação'} é {trendStrength === 'strong' ? 'forte' : trendStrength === 'weak' ? 'leve' : 'moderada'} ({Math.abs(stsData.beta_smoothed).toFixed(3)} por {periodLabel})</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5">•</span>
                  <span>{Math.abs(stsData.beta_smoothed) < 0.01 
                    ? 'A inclinação próxima de zero indica possível virada ou estabilização' 
                    : 'Não há sinais de virada iminente (βt distante de zero)'}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Forecast */}
        <section>
          <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 mb-3">
            <Target className="h-4 w-4" />
            PREVISÃO PARA O PRÓXIMO PERÍODO
          </h4>
          <div className="text-sm text-gray-300 space-y-3">
            <p>
              Para <strong className="text-white">{stsData.forecast.nextPeriod}</strong>:
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#12121A] rounded-lg p-3 border border-cyan-500/10 text-center">
                <span className="text-xs text-muted-foreground block">Valor Central</span>
                <span className="text-lg font-bold text-white">{formatVal(stsData.forecast.mean)}</span>
              </div>
              <div className="bg-[#12121A] rounded-lg p-3 border border-cyan-500/10 text-center">
                <span className="text-xs text-muted-foreground block">Faixa 68%</span>
                <span className="text-sm font-semibold text-white">
                  {formatVal(stsData.forecast.p25)} - {formatVal(stsData.forecast.p75)}
                </span>
              </div>
              <div className="bg-[#12121A] rounded-lg p-3 border border-cyan-500/10 text-center">
                <span className="text-xs text-muted-foreground block">Faixa 95%</span>
                <span className="text-sm font-semibold text-white">
                  {formatVal(stsData.forecast.p05)} - {formatVal(stsData.forecast.p95)}
                </span>
              </div>
            </div>
            <p>
              A incerteza é <strong className={cn(
                uncertaintyLevel === 'baixa' && "text-green-400",
                uncertaintyLevel === 'moderada' && "text-yellow-400",
                uncertaintyLevel === 'alta' && "text-red-400"
              )}>{uncertaintyLevel.toUpperCase()}</strong>, o que significa que a previsão tem 
              {uncertaintyLevel === 'baixa' ? ' alta confiabilidade' : 
               uncertaintyLevel === 'moderada' ? ' confiabilidade razoável, mas fatores externos podem impactar' : 
               ' baixa confiabilidade e deve ser interpretada com cautela'}.
            </p>
          </div>
        </section>

        {/* Section 3: Moving Average */}
        <section>
          <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4" />
            O QUE A MÉDIA MÓVEL NOS DIZ
          </h4>
          <div className="text-sm text-gray-300 space-y-3">
            <p>
              A média móvel de {maWindow} {periodLabel}s 
              é <strong className="text-white">{formatVal(statistics.movingAverage || statistics.mean)}</strong>.
            </p>
            <p>
              O valor atual (<strong className="text-white">{formatVal(currentValue)}</strong>) está 
              <strong className={cn(
                "ml-1",
                positionToMA === 'above' && "text-green-400",
                positionToMA === 'below' && "text-red-400",
                positionToMA === 'near' && "text-yellow-400"
              )}>{positionToMA === 'above' ? ' ACIMA' : positionToMA === 'below' ? ' ABAIXO' : ' PRÓXIMO'}</strong> da 
              média móvel, o que indica:
            </p>
            <div className="bg-[#12121A] rounded-lg p-3 border border-cyan-500/10">
              <ul className="text-sm space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5">•</span>
                  <span>Momento {positionToMA === 'above' ? 'POSITIVO' : positionToMA === 'below' ? 'NEGATIVO' : 'NEUTRO'} para o indicador</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5">•</span>
                  <span>{(positionToMA === 'above' && trendDirection === 'up') || 
                         (positionToMA === 'below' && trendDirection === 'down') ||
                         positionToMA === 'near' 
                    ? 'Consistente com a tendência identificada pelo STS' 
                    : 'Pode indicar reversão ou ajuste de curto prazo'}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 4: Standard Deviation */}
        <section>
          <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" />
            O QUE O DESVIO PADRÃO NOS DIZ
          </h4>
          <div className="text-sm text-gray-300 space-y-3">
            <p>
              O desvio padrão é <strong className="text-white">{formatVal(statistics.stdDev)}</strong>, 
              resultando em um coeficiente de variação de 
              <strong className={cn(
                "ml-1",
                cvClassification === 'baixa' && "text-green-400",
                cvClassification === 'moderada' && "text-yellow-400",
                cvClassification === 'alta' && "text-red-400"
              )}>{statistics.coefficientOfVariation.toFixed(1)}%</strong>.
            </p>
            <div className="bg-[#12121A] rounded-lg p-3 border border-cyan-500/10">
              <p className="text-xs text-muted-foreground mb-2">Isso significa:</p>
              <ul className="text-sm space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5">•</span>
                  <span>Volatilidade <strong className="text-white">{cvClassification.toUpperCase()}</strong> para esta série</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5">•</span>
                  <span>Oscilações típicas entre {formatVal(statistics.mean - statistics.stdDev)} e {formatVal(statistics.mean + statistics.stdDev)}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5">•</span>
                  <span>{cvClassification === 'baixa' 
                    ? 'Previsões tendem a ser mais confiáveis' 
                    : cvClassification === 'moderada'
                    ? 'Previsões devem considerar margem de erro'
                    : 'Previsões devem ser interpretadas com cautela'}</span>
                </li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Um CV de {statistics.coefficientOfVariation.toFixed(1)}% é considerado {cvClassification}, 
              indicando que o indicador {cvClassification === 'baixa' 
                ? 'apresenta comportamento relativamente estável' 
                : cvClassification === 'moderada'
                ? 'apresenta variações significativas'
                : 'apresenta alta variabilidade histórica'}.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default STSAnalysisContent;
