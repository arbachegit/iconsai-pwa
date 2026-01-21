import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Bot, TrendingUp, Database } from "lucide-react";
import { MacroSliders } from "./simulator/MacroSliders";
import { ScenarioButtons } from "./simulator/ScenarioButtons";
import { SeasonalBars } from "./simulator/SeasonalBars";
import { MonthlyProjection2026 } from "./simulator/MonthlyProjection2026";
import { MacroIndicatorsCard } from "./simulator/MacroIndicatorsCard";
import { RealIndicators } from "@/hooks/useRealTimeIndicators";

interface AnnualData {
  year: number;
  sales: number;
  [key: string]: number;
}

interface Simulator2026Props {
  annualData: AnnualData[];
  realIndicators?: RealIndicators;
  isLoadingIndicators?: boolean;
}

type ScenarioType = "neutral" | "optimistic" | "pessimistic";

interface Sliders2026 {
  renda: number;
  dolar: number;
  selic: number;
  ipca: number;
  desemprego: number;
}

// Elasticidades estimadas (efeito % no PMC para cada 1% de variação)
const ELASTICITIES = {
  renda: 0.8,       // +1% renda → +0.8% vendas
  dolar: -0.15,     // +1% dólar → -0.15% vendas
  selic: -0.1,      // +1pp selic → -0.1% vendas
  ipca: -0.2,       // +1pp ipca → -0.2% vendas
  desemprego: -0.3, // +1pp desemprego → -0.3% vendas
};

// Fallback quando não há dados reais
const FALLBACK_BASELINE = { 
  renda: 1950, 
  dolar: 5.80, 
  selic: 12.5, 
  ipca: 4.5, 
  desemprego: 7.5 
};

export function Simulator2026({ annualData, realIndicators, isLoadingIndicators }: Simulator2026Props) {
  const animationRef = useRef<number | null>(null);

  // BASELINE DINÂMICO: usa dados reais do banco ou fallback
  const BASELINE = useMemo(() => ({
    renda: realIndicators?.renda ?? FALLBACK_BASELINE.renda,
    dolar: realIndicators?.dolar ?? FALLBACK_BASELINE.dolar,
    selic: realIndicators?.selic ?? FALLBACK_BASELINE.selic,
    ipca: realIndicators?.ipca ?? FALLBACK_BASELINE.ipca,
    desemprego: realIndicators?.desemprego ?? FALLBACK_BASELINE.desemprego,
  }), [realIndicators]);

  // CENÁRIOS DINÂMICOS: calculados como variações do baseline real
  const SCENARIOS_2026 = useMemo((): Record<ScenarioType, Sliders2026> => ({
    neutral: { ...BASELINE },
    optimistic: {
      renda: Math.round(BASELINE.renda * 1.12),           // +12%
      dolar: Math.round(BASELINE.dolar * 0.90 * 100) / 100, // -10%
      selic: Math.round(BASELINE.selic * 0.75 * 10) / 10,   // -25%
      ipca: Math.round(BASELINE.ipca * 0.70 * 100) / 100,   // -30%
      desemprego: Math.round(BASELINE.desemprego * 0.85 * 10) / 10, // -15%
    },
    pessimistic: {
      renda: Math.round(BASELINE.renda * 0.92),           // -8%
      dolar: Math.round(BASELINE.dolar * 1.15 * 100) / 100, // +15%
      selic: Math.round(BASELINE.selic * 1.20 * 10) / 10,   // +20%
      ipca: Math.round(BASELINE.ipca * 1.40 * 100) / 100,   // +40%
      desemprego: Math.round(BASELINE.desemprego * 1.30 * 10) / 10, // +30%
    },
  }), [BASELINE]);

  const [activeScenario, setActiveScenario] = useState<ScenarioType>("neutral");
  const [sliders, setSliders] = useState<Sliders2026>(BASELINE);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sincronizar sliders quando baseline muda
  useMemo(() => {
    if (!isAnimating) {
      setSliders(SCENARIOS_2026[activeScenario]);
    }
  }, [BASELINE, activeScenario, isAnimating]);

  // Função para animar sliders ao mudar cenário
  const applyScenario = (scenario: ScenarioType) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setActiveScenario(scenario);
    const target = SCENARIOS_2026[scenario];
    const start = { ...sliders };
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      setSliders({
        renda: Math.round(start.renda + (target.renda - start.renda) * eased),
        dolar: Math.round((start.dolar + (target.dolar - start.dolar) * eased) * 100) / 100,
        selic: Math.round((start.selic + (target.selic - start.selic) * eased) * 10) / 10,
        ipca: Math.round((start.ipca + (target.ipca - start.ipca) * eased) * 100) / 100,
        desemprego: Math.round((start.desemprego + (target.desemprego - start.desemprego) * eased) * 10) / 10,
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSliders(target);
        setIsAnimating(false);
      }
    };

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);
  };

  // Calcular projeção baseada nos sliders
  const projection = useMemo(() => {
    const lastYear = annualData?.filter(d => d.sales > 0).slice(-1)[0];
    if (!lastYear) return { base: 100, projected: 100, change: 0 };
    
    const base = lastYear.sales;
    
    // Calcular efeito combinado
    let effect = 1;
    
    // Renda: variação percentual
    const rendaChange = ((sliders.renda - BASELINE.renda) / BASELINE.renda) * 100;
    effect += (rendaChange * ELASTICITIES.renda) / 100;
    
    // Dólar: variação percentual
    const dolarChange = ((sliders.dolar - BASELINE.dolar) / BASELINE.dolar) * 100;
    effect += (dolarChange * ELASTICITIES.dolar) / 100;
    
    // Selic: variação em pontos percentuais
    const selicChange = sliders.selic - BASELINE.selic;
    effect += (selicChange * ELASTICITIES.selic) / 100;
    
    // IPCA: variação em pontos percentuais
    const ipcaChange = sliders.ipca - BASELINE.ipca;
    effect += (ipcaChange * ELASTICITIES.ipca) / 100;
    
    // Desemprego: variação em pontos percentuais
    const desempregoChange = sliders.desemprego - BASELINE.desemprego;
    effect += (desempregoChange * ELASTICITIES.desemprego) / 100;
    
    const projected = Math.round(base * effect * 10) / 10;
    const change = Math.round((projected / base - 1) * 1000) / 10;
    
    return { base, projected, change };
  }, [sliders, annualData, BASELINE]);

  // Dados HISTÓRICOS - FIXOS (não dependem dos sliders!)
  const historicalData = useMemo(() => {
    if (!annualData?.length) return [];
    return annualData
      .filter(d => d.sales > 0 && d.year >= 2020 && d.year <= 2025)
      .map(d => ({
        year: d.year,
        historical: Math.round(d.sales * 10) / 10,
      }));
  }, [annualData]);

  // Dados do gráfico - Combina histórico FIXO + projeção DINÂMICA
  const chartData = useMemo(() => {
    if (!historicalData.length) return [];
    
    // Calcular intervalo de confiança (±10% para IC 95%)
    const ci = projection.projected * 0.10;
    
    return [
      ...historicalData.map(h => ({
        ...h,
        projected: null as number | null,
        ciLow: null as number | null,
        ciHigh: null as number | null,
      })),
      {
        year: 2026,
        historical: null,
        projected: projection.projected,
        ciLow: Math.round((projection.projected - ci) * 10) / 10,
        ciHigh: Math.round((projection.projected + ci) * 10) / 10,
      },
    ];
  }, [historicalData, projection.projected]);

  const hasRealData = !!realIndicators && realIndicators.sources.renda !== "Fallback";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h3 className="text-xl font-semibold">Simulador de Cenários 2026</h3>
            <p className="text-muted-foreground text-sm">
              Projete vendas 2026 com base em variáveis macroeconômicas
            </p>
          </div>
        </div>
        {hasRealData && (
          <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            <Database className="h-3.5 w-3.5" />
            Dados Reais
          </Badge>
        )}
      </div>

      {/* Card de Indicadores Atuais */}
      {realIndicators && (
        <MacroIndicatorsCard 
          indicators={realIndicators} 
          isLoading={isLoadingIndicators} 
        />
      )}

      {/* Gráfico de Projeção */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Projeção de Vendas PMC
              </CardTitle>
              <CardDescription>Histórico (2020-2025) + Projeção 2026</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`text-lg font-bold ${projection.change >= 0 ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}`}
              >
                {projection.change >= 0 ? '+' : ''}{projection.change}%
              </Badge>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{projection.projected.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">PMC 2026</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  width={50}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ payload, label }) => {
                    if (!payload?.length) return null;
                    const data = payload[0].payload;
                    const value = data.historical ?? data.projected;
                    const isProjection = data.projected !== null;
                    return (
                      <div className="bg-card border border-border p-2 rounded-lg shadow-lg">
                        <p className="font-semibold text-sm">{label}</p>
                        <p className={`text-sm ${isProjection ? 'text-primary font-bold' : ''}`}>
                          PMC: {value?.toFixed(1)} {isProjection && '(projeção)'}
                        </p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={2026} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                {/* Área de Incerteza 95% para projeção */}
                <Area
                  type="monotone"
                  dataKey="ciHigh"
                  stroke="none"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="ciLow"
                  stroke="none"
                  fill="hsl(var(--background))"
                  fillOpacity={1}
                  connectNulls={false}
                />
                {/* Histórico - FIXO */}
                <Area
                  type="monotone"
                  dataKey="historical"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  connectNulls={false}
                />
                {/* Projeção - DINÂMICA */}
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--primary))', r: 8 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Projeção MENSAL 2026 */}
      <MonthlyProjection2026 
        baseProjection={projection.projected} 
        scenario={activeScenario} 
      />
      
      {/* Controles: Sliders + Cenários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <MacroSliders 
              values={sliders} 
              onChange={setSliders}
              disabled={isAnimating}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <ScenarioButtons 
              activeScenario={activeScenario}
              onSelect={applyScenario}
              isAnimating={isAnimating}
            />
            
            {/* Resultado da Projeção */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projeção PMC 2026</p>
                  <p className="text-3xl font-bold text-primary">{projection.projected.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">vs 2025</p>
                  <p className={`text-xl font-bold ${projection.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {projection.change >= 0 ? '+' : ''}{projection.change}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barras Sazonais */}
      <SeasonalBars scenario={activeScenario} baseProjection={projection.projected} />
    </div>
  );
}
