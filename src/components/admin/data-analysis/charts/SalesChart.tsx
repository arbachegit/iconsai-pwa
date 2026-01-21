import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import { runStructuralTimeSeries } from "@/lib/structural-time-series";

interface AnnualData {
  year: number;
  sales: number;
  pmcVest: number;
  pmcMov: number;
  pmcFarm: number;
  pmcComb: number;
  pmcVeic: number;
  pmcConst: number;
  [key: string]: number;
}

interface SalesChartProps {
  data: AnnualData[];
  sectorCode: string;
  sectorLabel: string;
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

export function SalesChart({ data, sectorCode, sectorLabel }: SalesChartProps) {
  const chartData = useMemo(() => {
    if (!data?.length) return { points: [], trend: [], r2: 0 };
    
    const sectorKey = SECTOR_KEY_MAP[sectorCode] || "sales";
    const filtered = data.filter(d => d[sectorKey] > 0 && d.year >= 2015);
    
    const points = filtered.map(d => ({
      year: d.year,
      value: Math.round(d[sectorKey] * 10) / 10,
    }));

    if (points.length < 2) {
      return { points, trend: [], r2: 0 };
    }

    // Usar STS para calcular tendência
    const stsData = points.map(p => ({ date: `${p.year}-01-01`, value: p.value }));
    const stsResult = runStructuralTimeSeries(stsData, 'anual');
    
    // Calcular erro padrão para IC
    const se = Math.sqrt(stsResult.sigma2_epsilon);
    
    // Criar série de tendência com intervalos de confiança
    const trend = points.map((p, i) => {
      const mu = stsResult.muSeries[i] ?? p.value;
      return {
        year: p.year,
        trend: Math.round(mu * 10) / 10,
        ciLow: Math.round((mu - 1.96 * se) * 10) / 10,
        ciHigh: Math.round((mu + 1.96 * se) * 10) / 10,
      };
    });

    // Calcular R² baseado em STS
    const values = points.map(p => p.value);
    const meanY = values.reduce((a, b) => a + b, 0) / values.length;
    const ssRes = points.reduce((sum, p, i) => {
      const diff = p.value - (stsResult.muSeries[i] ?? p.value);
      return sum + diff * diff;
    }, 0);
    const ssTot = points.reduce((sum, p) => {
      const diff = p.value - meanY;
      return sum + diff * diff;
    }, 0);
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    return { points, trend, r2 };
  }, [data, sectorCode]);

  if (!chartData.points.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-500" />
            Vendas: {sectorLabel}
          </CardTitle>
          <CardDescription>Sem dados disponíveis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Merge data for chart
  const mergedData = chartData.points.map((p, i) => ({
    ...p,
    trend: chartData.trend[i]?.trend,
    ciLow: chartData.trend[i]?.ciLow,
    ciHigh: chartData.trend[i]?.ciHigh,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Vendas: {sectorLabel}
            </CardTitle>
            <CardDescription>Índice PMC anualizado (IBGE) - STS Kalman</CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            R² = {(chartData.r2 * 100).toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mergedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`ciGradientSales-${sectorCode}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => String(v)}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.toFixed(1)}
                width={50}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const label = name === 'value' ? 'Índice PMC' : name === 'trend' ? 'Tendência STS' : name;
                  return [value.toFixed(1), label];
                }}
                labelFormatter={(label) => `Ano: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              {/* Área do Intervalo de Confiança 95% */}
              <Area
                type="monotone"
                dataKey="ciHigh"
                stroke="none"
                fill={`url(#ciGradientSales-${sectorCode})`}
                name="IC 95% Superior"
              />
              <Area
                type="monotone"
                dataKey="ciLow"
                stroke="none"
                fill="hsl(var(--card))"
                name="IC 95% Inferior"
              />
              {/* Linha de dados reais */}
              <Line
                type="monotone"
                dataKey="value"
                name="Índice PMC"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 4 }}
                activeDot={{ r: 6 }}
              />
              {/* Linha de tendência STS */}
              <Line
                type="monotone"
                dataKey="trend"
                name="Tendência STS"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
