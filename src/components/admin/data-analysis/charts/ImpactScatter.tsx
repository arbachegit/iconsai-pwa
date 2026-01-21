import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calculator, Info } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { spearmanCorrelation, getCorrelationStrengthPtBr } from "@/lib/time-series-correlation";

interface AnnualData {
  year: number;
  income: number;
  sales: number;
  pmcVest: number;
  pmcMov: number;
  pmcFarm: number;
  pmcComb: number;
  pmcVeic: number;
  pmcConst: number;
  [key: string]: number;
}

interface ImpactScatterProps {
  data: AnnualData[];
  sectorCode: string;
}

const SECTOR_KEY_MAP: Record<string, string> = {
  "PMC": "sales",
  "PMC_VEST": "pmcVest",
  "PMC_MOV": "pmcMov",
  "PMC_FARM": "pmcFarm",
  "PMC_COMB": "pmcComb",
  "PMC_VEIC": "pmcVeic",
  "PMC_CONST": "pmcConst",
};

function linearRegression(data: [number, number][]): { equation: [number, number]; r2: number } {
  const n = data.length;
  if (n < 2) return { equation: [0, 0], r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const [x, y] of data) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const [x, y] of data) {
    const predicted = slope * x + intercept;
    ssRes += (y - predicted) ** 2;
    ssTot += (y - meanY) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { equation: [intercept, slope], r2 };
}

export function ImpactScatter({ data, sectorCode }: ImpactScatterProps) {
  const chartData = useMemo(() => {
    if (!data?.length) return { points: [], regression: { equation: [0, 0], r2: 0 }, elasticity: 0, spearmanRho: 0, correlationInfo: getCorrelationStrengthPtBr(0) };
    
    const sectorKey = SECTOR_KEY_MAP[sectorCode] || "sales";
    const filtered = data.filter(d => d.income > 0 && d[sectorKey] > 0 && d.year >= 2015);
    
    const points = filtered.map(d => ({
      x: d.income,
      y: d[sectorKey],
      year: d.year,
    }));

    // Calcular regressão
    const regressionData: [number, number][] = points.map(p => [p.x, p.y]);
    const regression = linearRegression(regressionData);
    
    // Elasticidade: (∂Y/∂X) * (X̄/Ȳ)
    const avgX = points.reduce((a, b) => a + b.x, 0) / points.length;
    const avgY = points.reduce((a, b) => a + b.y, 0) / points.length;
    const elasticity = regression.equation[1] * (avgX / avgY);

    // Calcular Spearman (mais robusto para séries temporais)
    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    const spearmanRho = spearmanCorrelation(xValues, yValues);
    const correlationInfo = getCorrelationStrengthPtBr(spearmanRho);

    return { points, regression, elasticity, spearmanRho, correlationInfo };
  }, [data, sectorCode]);

  if (!chartData.points.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-purple-500" />
            Impacto: Renda vs Vendas
          </CardTitle>
          <CardDescription>Sem dados disponíveis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calcular linha de regressão para visualização
  const minX = Math.min(...chartData.points.map(p => p.x));
  const maxX = Math.max(...chartData.points.map(p => p.x));
  const [intercept, slope] = chartData.regression.equation;
  
  const regressionLine = [
    { x: minX, y: intercept + slope * minX },
    { x: maxX, y: intercept + slope * maxX },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-purple-500" />
              Impacto: Renda vs Vendas
            </CardTitle>
            <CardDescription>Correlação Spearman e elasticidade</CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Badge Spearman com Tooltip explicativo */}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs cursor-help ${chartData.correlationInfo.color}`}
                  >
                    <Info className="h-3 w-3 mr-1" />
                    ρ = {chartData.spearmanRho.toFixed(2)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3">
                  <p className="font-semibold text-sm">Correlação de Spearman (ρ)</p>
                  <p className="text-sm mt-1">{chartData.correlationInfo.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Mede relação monotônica baseada em rankings. 
                    Mais robusta a outliers e não-linearidades que Pearson.
                    Ideal para séries temporais econômicas.
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            <Badge 
              variant="outline" 
              className={`text-xs ${chartData.elasticity > 0 ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}`}
            >
              ε = {chartData.elasticity.toFixed(3)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="x" 
                type="number"
                name="Renda"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `R$ ${v.toLocaleString('pt-BR')}`}
                domain={['dataMin - 100', 'dataMax + 100']}
              />
              <YAxis 
                dataKey="y" 
                type="number"
                name="Vendas"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.toFixed(1)}
                width={50}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const point = payload[0].payload;
                  return (
                    <div className="bg-card border border-border p-2 rounded-lg shadow-lg">
                      <p className="font-semibold text-sm">{point.year}</p>
                      <p className="text-xs text-muted-foreground">
                        Renda: R$ {point.x.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PMC: {point.y.toFixed(1)}
                      </p>
                    </div>
                  );
                }}
              />
              <Scatter 
                name="Anos" 
                data={chartData.points} 
                fill="#8B5CF6"
              >
                {chartData.points.map((entry, index) => (
                  <circle key={`dot-${index}`} r={6} />
                ))}
              </Scatter>
              {/* Linha de regressão */}
              <Scatter
                name="Regressão"
                data={regressionLine}
                fill="transparent"
                line={{ stroke: '#94A3B8', strokeWidth: 2, strokeDasharray: '5 5' }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Elasticidade: variação de {(chartData.elasticity * 100).toFixed(1)}% nas vendas para cada 100% de aumento na renda
        </div>
      </CardContent>
    </Card>
  );
}
