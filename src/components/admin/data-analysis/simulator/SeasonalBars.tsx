import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar } from "lucide-react";

type ScenarioType = "neutral" | "optimistic" | "pessimistic";

interface SeasonalBarsProps {
  scenario: ScenarioType;
  baseProjection: number;
}

// Multiplicadores BASE por evento
const BASE_MULTIPLIERS = {
  carnaval: 0.12,
  maes: 0.18,
  namorados: 0.08,
  pais: 0.10,
  criancas: 0.15,
  blackfriday: 0.30,
  natal: 0.45,
};

// AJUSTE por cenário (o multiplicador muda!)
const SCENARIO_MULTIPLIER_ADJUSTMENT = {
  optimistic: 1.25,    // Cenário otimista: eventos impactam 25% mais
  neutral: 1.00,       // Cenário neutro: impacto base
  pessimistic: 0.75,   // Cenário pessimista: eventos impactam 25% menos
};

const SCENARIO_COLORS = {
  optimistic: "#10B981",
  neutral: "#F59E0B",
  pessimistic: "#EF4444",
};

const SCENARIO_LABELS = {
  optimistic: "📈 Cenário otimista: +25% impacto sazonal",
  neutral: "➡️ Cenário neutro: impacto histórico médio",
  pessimistic: "📉 Cenário pessimista: -25% impacto sazonal",
};

const SEASONAL_EVENTS = [
  { key: "carnaval", label: "Carnaval", month: "Fev" },
  { key: "maes", label: "Dia das Mães", month: "Mai" },
  { key: "namorados", label: "Namorados", month: "Jun" },
  { key: "pais", label: "Dia dos Pais", month: "Ago" },
  { key: "criancas", label: "Crianças", month: "Out" },
  { key: "blackfriday", label: "Black Friday", month: "Nov" },
  { key: "natal", label: "Natal", month: "Dez" },
];

export function SeasonalBars({ scenario, baseProjection }: SeasonalBarsProps) {
  const barColor = SCENARIO_COLORS[scenario];
  const adjustment = SCENARIO_MULTIPLIER_ADJUSTMENT[scenario];
  
  const chartData = useMemo(() => {
    return SEASONAL_EVENTS.map(event => {
      const baseMultiplier = BASE_MULTIPLIERS[event.key as keyof typeof BASE_MULTIPLIERS];
      // O multiplicador AJUSTADO pelo cenário
      const adjustedMultiplier = baseMultiplier * adjustment;
      const impact = adjustedMultiplier * 100;
      const pmcValue = Math.round(baseProjection * (1 + adjustedMultiplier) * 10) / 10;
      
      return {
        ...event,
        impact,              // Agora muda com cenário!
        pmcValue,            // Agora muda com cenário!
        baseImpact: baseMultiplier * 100,
        diff: Math.round((adjustedMultiplier - baseMultiplier) * 1000) / 10,
      };
    });
  }, [scenario, baseProjection, adjustment]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">Eventos Sazonais 2026</CardTitle>
            <CardDescription>Impacto estimado nas vendas por período</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" vertical={false} />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10 }}
                interval={0}
                angle={0}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `+${v.toFixed(0)}%`}
                width={50}
                domain={[0, 'auto']}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border p-2 rounded-lg shadow-lg">
                      <p className="font-semibold text-sm">{data.label}</p>
                      <p className="text-xs text-muted-foreground">{data.month}/2026</p>
                      <div className="mt-1 space-y-0.5">
                        <p className="text-sm">
                          Impacto: <span className="font-medium text-primary">+{data.impact.toFixed(1)}%</span>
                          {data.diff !== 0 && (
                            <span className={`ml-1 text-xs ${data.diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ({data.diff > 0 ? '+' : ''}{data.diff.toFixed(1)}% vs base)
                            </span>
                          )}
                        </p>
                        <p className="text-sm">
                          PMC estimado: <span className="font-medium">{data.pmcValue.toFixed(1)}</span>
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="impact" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={barColor} 
                    fillOpacity={0.6 + (entry.impact / 100)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legenda explicativa */}
        <p className="text-xs text-muted-foreground text-center mt-3">
          {SCENARIO_LABELS[scenario]}
        </p>
      </CardContent>
    </Card>
  );
}
