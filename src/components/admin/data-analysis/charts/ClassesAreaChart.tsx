import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users } from "lucide-react";

interface AnnualData {
  year: number;
  incomeClassA: number;
  incomeClassB: number;
  incomeClassC: number;
  incomeClassD: number;
  incomeClassE: number;
  [key: string]: number;
}

interface ClassesAreaChartProps {
  data: AnnualData[];
}

const CLASS_COLORS = {
  A: "#3B82F6", // azul
  B: "#10B981", // verde
  C: "#F59E0B", // amarelo
  D: "#F97316", // laranja
  E: "#EF4444", // vermelho
};

export function ClassesAreaChart({ data }: ClassesAreaChartProps) {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    
    const filtered = data.filter(d => 
      d.incomeClassA > 0 || d.incomeClassB > 0 || d.incomeClassC > 0 || 
      d.incomeClassD > 0 || d.incomeClassE > 0
    );
    
    return filtered.map(d => {
      const total = d.incomeClassA + d.incomeClassB + d.incomeClassC + d.incomeClassD + d.incomeClassE;
      if (total === 0) return null;
      
      return {
        year: d.year,
        A: (d.incomeClassA / total) * 100,
        B: (d.incomeClassB / total) * 100,
        C: (d.incomeClassC / total) * 100,
        D: (d.incomeClassD / total) * 100,
        E: (d.incomeClassE / total) * 100,
        // Valores absolutos para tooltip
        absA: d.incomeClassA,
        absB: d.incomeClassB,
        absC: d.incomeClassC,
        absD: d.incomeClassD,
        absE: d.incomeClassE,
      };
    }).filter(Boolean);
  }, [data]);

  if (!chartData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            Participação Classes Sociais
          </CardTitle>
          <CardDescription>Sem dados disponíveis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            Participação Classes Sociais
          </CardTitle>
          <CardDescription>Distribuição percentual da renda (IBGE PNAD)</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData} 
              stackOffset="expand"
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => String(v)}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                width={50}
              />
              <Tooltip
                content={({ payload, label }) => {
                  if (!payload?.length) return null;
                  const data = payload[0]?.payload;
                  if (!data) return null;
                  
                  return (
                    <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
                      <p className="font-semibold text-sm mb-2">Ano: {label}</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: CLASS_COLORS.A }} />
                          <span>Classe A (Top 5%): {data.A?.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: CLASS_COLORS.B }} />
                          <span>Classe B (15%): {data.B?.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: CLASS_COLORS.C }} />
                          <span>Classe C (40%): {data.C?.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: CLASS_COLORS.D }} />
                          <span>Classe D (20%): {data.D?.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: CLASS_COLORS.E }} />
                          <span>Classe E (20%): {data.E?.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="E"
                name="Classe E"
                stackId="1"
                stroke={CLASS_COLORS.E}
                fill={CLASS_COLORS.E}
                fillOpacity={0.8}
              />
              <Area
                type="monotone"
                dataKey="D"
                name="Classe D"
                stackId="1"
                stroke={CLASS_COLORS.D}
                fill={CLASS_COLORS.D}
                fillOpacity={0.8}
              />
              <Area
                type="monotone"
                dataKey="C"
                name="Classe C"
                stackId="1"
                stroke={CLASS_COLORS.C}
                fill={CLASS_COLORS.C}
                fillOpacity={0.8}
              />
              <Area
                type="monotone"
                dataKey="B"
                name="Classe B"
                stackId="1"
                stroke={CLASS_COLORS.B}
                fill={CLASS_COLORS.B}
                fillOpacity={0.8}
              />
              <Area
                type="monotone"
                dataKey="A"
                name="Classe A"
                stackId="1"
                stroke={CLASS_COLORS.A}
                fill={CLASS_COLORS.A}
                fillOpacity={0.8}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: CLASS_COLORS.A }} />
            <span>A</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: CLASS_COLORS.B }} />
            <span>B</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: CLASS_COLORS.C }} />
            <span>C</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: CLASS_COLORS.D }} />
            <span>D</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: CLASS_COLORS.E }} />
            <span>E</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
