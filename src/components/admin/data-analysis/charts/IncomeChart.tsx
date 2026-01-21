import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { runStructuralTimeSeries } from "@/lib/structural-time-series";

interface AnnualData {
  year: number;
  income: number;
  [key: string]: number;
}

interface IncomeChartProps {
  data: AnnualData[];
}

function calculateStd(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);
}

export function IncomeChart({ data }: IncomeChartProps) {
  const chartData = useMemo(() => {
    if (!data?.length) return { points: [], trend: [], r2: 0 };
    
    const filtered = data.filter(d => d.income > 0 && d.year >= 2012);
    const points = filtered.map(d => ({
      year: d.year,
      income: Math.round(d.income),
    }));

    if (points.length < 2) {
      return { points, trend: [], r2: 0 };
    }

    // Usar STS para calcular tendência
    const stsData = points.map(p => ({ date: `${p.year}-01-01`, value: p.income }));
    const stsResult = runStructuralTimeSeries(stsData, 'anual');
    
    // Calcular erro padrão para IC
    const se = Math.sqrt(stsResult.sigma2_epsilon);
    
    // Criar série de tendência com intervalos de confiança
    const trend = points.map((p, i) => {
      const mu = stsResult.muSeries[i] ?? p.income;
      return {
        year: p.year,
        trend: Math.round(mu),
        ciLow: Math.round(mu - 1.96 * se),
        ciHigh: Math.round(mu + 1.96 * se),
      };
    });

    // Calcular R² baseado em STS
    const values = points.map(p => p.income);
    const meanY = values.reduce((a, b) => a + b, 0) / values.length;
    const ssRes = points.reduce((sum, p, i) => {
      const diff = p.income - (stsResult.muSeries[i] ?? p.income);
      return sum + diff * diff;
    }, 0);
    const ssTot = points.reduce((sum, p) => {
      const diff = p.income - meanY;
      return sum + diff * diff;
    }, 0);
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    return { points, trend, r2 };
  }, [data]);

  if (!chartData.points.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Renda Per Capita
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
              <TrendingUp className="h-5 w-5 text-primary" />
              Renda Per Capita
            </CardTitle>
            <CardDescription>Evolução 2012-2025 (IBGE PNAD) - STS Kalman</CardDescription>
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
                <linearGradient id="ciGradientIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05}/>
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
                tickFormatter={(v) => `R$ ${v.toLocaleString('pt-BR')}`}
                width={80}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const label = name === 'income' ? 'Renda' : name === 'trend' ? 'Tendência STS' : name;
                  return [`R$ ${value.toLocaleString('pt-BR')}`, label];
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
                fill="url(#ciGradientIncome)"
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
                dataKey="income"
                name="Renda"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
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
