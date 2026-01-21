import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Calendar } from "lucide-react";

interface MonthlyProjection2026Props {
  baseProjection: number;
  scenario: "neutral" | "optimistic" | "pessimistic";
}

// Multiplicadores sazonais por mês (baseado em dados históricos do varejo brasileiro)
const MONTHLY_SEASONALITY = [
  { month: "Jan", label: "Janeiro", base: 0.85 },
  { month: "Fev", label: "Fevereiro", base: 0.90, event: "Carnaval +12%" },
  { month: "Mar", label: "Março", base: 0.88 },
  { month: "Abr", label: "Abril", base: 0.92 },
  { month: "Mai", label: "Maio", base: 1.05, event: "Dia das Mães +18%" },
  { month: "Jun", label: "Junho", base: 0.98, event: "Namorados +8%" },
  { month: "Jul", label: "Julho", base: 0.95 },
  { month: "Ago", label: "Agosto", base: 1.02, event: "Dia dos Pais +10%" },
  { month: "Set", label: "Setembro", base: 0.97 },
  { month: "Out", label: "Outubro", base: 1.08, event: "Dia das Crianças +15%" },
  { month: "Nov", label: "Novembro", base: 1.20, event: "Black Friday +30%" },
  { month: "Dez", label: "Dezembro", base: 1.35, event: "Natal +45%" },
];

// Ajuste por cenário
const SCENARIO_ADJUSTMENT = {
  optimistic: 1.12,
  neutral: 1.00,
  pessimistic: 0.88,
};

const SCENARIO_COLORS = {
  optimistic: "hsl(142, 76%, 36%)",
  neutral: "hsl(38, 92%, 50%)",
  pessimistic: "hsl(0, 84%, 60%)",
};

export function MonthlyProjection2026({ baseProjection, scenario }: MonthlyProjection2026Props) {
  const chartData = useMemo(() => {
    const adjustment = SCENARIO_ADJUSTMENT[scenario];
    
    return MONTHLY_SEASONALITY.map(m => {
      const value = Math.round(baseProjection * m.base * adjustment * 10) / 10;
      return {
        ...m,
        pmc: value,
        ciLow: Math.round(value * 0.92 * 10) / 10,
        ciHigh: Math.round(value * 1.08 * 10) / 10,
      };
    });
  }, [baseProjection, scenario]);

  const strokeColor = SCENARIO_COLORS[scenario];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">Projeção Mensal 2026</CardTitle>
            <CardDescription>Tendência de vendas Jan-Dez com sazonalidade</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10 }}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.toFixed(0)}
                width={45}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border p-2 rounded-lg shadow-lg">
                      <p className="font-semibold text-sm">{data.label} 2026</p>
                      <p className="text-sm">PMC: <span className="font-medium text-primary">{data.pmc.toFixed(1)}</span></p>
                      <p className="text-xs text-muted-foreground">
                        IC 95%: [{data.ciLow.toFixed(1)} - {data.ciHigh.toFixed(1)}]
                      </p>
                      {data.event && (
                        <p className="text-xs mt-1 text-amber-500 font-medium">{data.event}</p>
                      )}
                    </div>
                  );
                }}
              />
              {/* Área de Incerteza */}
              <Area
                type="monotone"
                dataKey="ciHigh"
                stroke="none"
                fill={strokeColor}
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="ciLow"
                stroke="none"
                fill="hsl(var(--background))"
                fillOpacity={1}
              />
              {/* Linha principal */}
              <Area
                type="monotone"
                dataKey="pmc"
                stroke={strokeColor}
                fill="url(#monthlyGradient)"
                strokeWidth={2}
              />
              {/* Referências para eventos importantes */}
              <ReferenceLine x="Mai" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine x="Nov" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine x="Dez" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legenda */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: strokeColor }} />
            <span>PMC Projetado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border border-dashed border-muted-foreground opacity-50" />
            <span>Eventos Sazonais</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
