import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, MessageCircle, CheckCircle, HelpCircle, TrendingUp, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface MaieuticMetric {
  date: string;
  cognitive_mode: string;
  total_interactions: number;
  confirmed_understanding: number;
  asked_clarification: number;
  avg_pillbox_count: number;
  avg_questions_asked: number;
  avg_response_time: number;
}

const COLORS = {
  normal: "#3b82f6",
  simplified: "#f59e0b",
  maieutic: "#8b5cf6",
};

export function MaieuticEffectivenessTab() {
  const [period, setPeriod] = useState<number>(30);

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["maieutic-effectiveness", period],
    queryFn: async () => {
      const startDate = subDays(new Date(), period).toISOString();
      
      const { data, error } = await supabase
        .from("maieutic_effectiveness")
        .select("*")
        .gte("date", startDate)
        .order("date", { ascending: true });

      if (error) throw error;
      return (data || []) as MaieuticMetric[];
    },
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalInteractions = metrics.reduce((sum, m) => sum + Number(m.total_interactions || 0), 0);
    const maieuticInteractions = metrics
      .filter((m) => m.cognitive_mode === "maieutic")
      .reduce((sum, m) => sum + Number(m.total_interactions || 0), 0);
    const confirmedUnderstanding = metrics.reduce((sum, m) => sum + Number(m.confirmed_understanding || 0), 0);
    const askedClarification = metrics.reduce((sum, m) => sum + Number(m.asked_clarification || 0), 0);

    return {
      totalInteractions,
      maieuticInteractions,
      confirmedUnderstandingRate: totalInteractions > 0 
        ? ((confirmedUnderstanding / totalInteractions) * 100).toFixed(1) 
        : "0.0",
      askedClarificationRate: totalInteractions > 0 
        ? ((askedClarification / totalInteractions) * 100).toFixed(1) 
        : "0.0",
    };
  }, [metrics]);

  // Data for area chart (maieutic mode only)
  const areaChartData = useMemo(() => {
    return metrics
      .filter((m) => m.cognitive_mode === "maieutic")
      .map((m) => ({
        date: format(new Date(m.date), "dd/MM", { locale: ptBR }),
        fullDate: m.date,
        total_interactions: Number(m.total_interactions || 0),
        confirmed_understanding: Number(m.confirmed_understanding || 0),
      }));
  }, [metrics]);

  // Data for pie chart (distribution by mode)
  const pieChartData = useMemo(() => {
    const modeMap: Record<string, number> = {};
    
    metrics.forEach((m) => {
      const mode = m.cognitive_mode || "normal";
      modeMap[mode] = (modeMap[mode] || 0) + Number(m.total_interactions || 0);
    });

    return Object.entries(modeMap).map(([mode, value]) => ({
      name: mode === "maieutic" ? "Maiêutico" : mode === "simplified" ? "Simplificado" : "Normal",
      value,
      color: COLORS[mode as keyof typeof COLORS] || COLORS.normal,
    }));
  }, [metrics]);

  const totalPieValue = pieChartData.reduce((sum, d) => sum + d.value, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Eficácia do Sistema Maiêutico</h1>
            <p className="text-muted-foreground text-sm">
              Métricas de adaptação cognitiva e compreensão do usuário
            </p>
          </div>
        </div>

        <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-400/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MessageCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Interações</p>
                <p className="text-2xl font-bold">{kpis.totalInteractions.toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-400/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modo Maiêutico</p>
                <p className="text-2xl font-bold">{kpis.maieuticInteractions.toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-400/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmou Entendimento</p>
                <p className="text-2xl font-bold">{kpis.confirmedUnderstandingRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-400/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <HelpCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pediu Esclarecimento</p>
                <p className="text-2xl font-bold">{kpis.askedClarificationRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Evolução do Modo Maiêutico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={areaChartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorConfirmed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => [
                      value.toLocaleString("pt-BR"),
                      name === "total_interactions" ? "Interações" : "Confirmou Entendimento",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_interactions"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorTotal)"
                    name="total_interactions"
                  />
                  <Area
                    type="monotone"
                    dataKey="confirmed_understanding"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#colorConfirmed)"
                    name="confirmed_understanding"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <Brain className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma métrica maiêutica registrada no período
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  As métricas serão populadas conforme usuários interagem com o chat
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - 1 column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-400" />
              Distribuição por Modo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 && totalPieValue > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [value.toLocaleString("pt-BR"), "Interações"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <Brain className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Sem dados de distribuição
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MaieuticEffectivenessTab;
