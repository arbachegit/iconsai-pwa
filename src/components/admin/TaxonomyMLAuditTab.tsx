import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { TaxonomyHierarchySimulationDiagram } from "./TaxonomyHierarchySimulationDiagram";
import {
  FolderTree,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

// Cyan/teal color palette
const CYAN_COLORS = {
  primary: 'hsl(var(--primary))',
  cyan500: '#06B6D4',
  cyan400: '#22D3EE',
  cyan300: '#67E8F9',
  cyan200: '#A5F3FC',
  teal500: '#14B8A6',
  teal400: '#2DD4BF',
  emerald500: '#10B981',
  red500: '#EF4444',
  amber500: '#F59E0B',
};

export const TaxonomyMLAuditTab = () => {
  const [timeRange, setTimeRange] = useState<number>(30);

  // Fetch taxonomy adoption events
  const { data: taxonomyEvents, isLoading, refetch } = useQuery({
    queryKey: ["taxonomy-ml-audit", timeRange],
    queryFn: async () => {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("tag_management_events")
        .select("*")
        .in("action_type", ["adopt_orphan", "delete_orphan", "reject_duplicate", "taxonomy_adoption"])
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate metrics
      const adoptions = (data || []).filter(e => e.action_type === "adopt_orphan" || e.action_type === "taxonomy_adoption").length;
      const rejections = (data || []).filter(e => e.action_type === "delete_orphan" || e.action_type === "reject_duplicate").length;
      const total = adoptions + rejections;
      const acceptanceRate = total > 0 ? (adoptions / total) * 100 : 0;

      // Group by day for time series
      const byDay = (data || []).reduce((acc, item) => {
        const date = new Date(item.created_at || "").toISOString().split("T")[0];
        if (!acc[date]) acc[date] = { adoptions: 0, rejections: 0 };
        if (item.action_type === "adopt_orphan" || item.action_type === "taxonomy_adoption") {
          acc[date].adoptions++;
        } else {
          acc[date].rejections++;
        }
        return acc;
      }, {} as Record<string, { adoptions: number; rejections: number }>);

      const timeSeriesData = Object.entries(byDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14)
        .map(([date, counts]) => ({
          date: date.slice(5),
          adoptions: counts.adoptions,
          rejections: counts.rejections,
          total: counts.adoptions + counts.rejections,
          rate: counts.adoptions + counts.rejections > 0
            ? Math.round((counts.adoptions / (counts.adoptions + counts.rejections)) * 100)
            : null,
        }));

      // Pie chart data
      const pieData = [
        { name: "Aceitas", value: adoptions, fill: CYAN_COLORS.cyan500 },
        { name: "Rejeitadas", value: rejections, fill: CYAN_COLORS.red500 },
      ].filter(d => d.value > 0);

      // Calculate avg decision time
      const withDecisionTime = (data || []).filter(e => e.time_to_decision_ms);
      const avgDecisionTime = withDecisionTime.length > 0
        ? Math.round(withDecisionTime.reduce((sum, e) => sum + (e.time_to_decision_ms || 0), 0) / withDecisionTime.length)
        : 0;

      // Extract validation scores from rationale
      const validationScores: number[] = [];
      (data || []).forEach(e => {
        if (e.rationale) {
          const match = e.rationale.match(/Score:\s*(\d+)%/);
          if (match) validationScores.push(parseInt(match[1]));
        }
      });
      const avgValidationScore = validationScores.length > 0
        ? Math.round(validationScores.reduce((a, b) => a + b, 0) / validationScores.length)
        : 0;

      return {
        total: data?.length || 0,
        adoptions,
        rejections,
        acceptanceRate,
        avgDecisionTime,
        avgValidationScore,
        timeSeriesData,
        pieData,
        recentEvents: data?.slice(0, 15) || [],
      };
    },
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="text-white font-medium">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AdminTitleWithInfo
          title="Taxonomy ML - Auditoria"
          level="h1"
          icon={FolderTree}
          tooltipText="Ver simulação do processo de descoberta taxonômica"
          infoContent={
            <div className="space-y-4">
              <TaxonomyHierarchySimulationDiagram 
                activityLevel={taxonomyEvents ? Math.min(taxonomyEvents.total / 50, 1) : 0.3} 
              />
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <h5 className="font-semibold text-emerald-400 flex items-center gap-2 text-sm">
                    Quando Aceitar
                  </h5>
                  <ul className="text-xs space-y-1 mt-2 text-muted-foreground">
                    <li>Hierarquia específica ao domínio do negócio</li>
                    <li>Relação parent-child semanticamente correta</li>
                    <li>Tag não duplica conceitos existentes</li>
                  </ul>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                  <h5 className="font-semibold text-red-400 flex items-center gap-2 text-sm">
                    Quando Rejeitar
                  </h5>
                  <ul className="text-xs space-y-1 mt-2 text-muted-foreground">
                    <li>Tags genéricas demais ("Geral", "Outros")</li>
                    <li>Hierarquia invertida ou incorreta</li>
                    <li>Duplicação de conceitos existentes</li>
                  </ul>
                </div>
              </div>
            </div>
          }
        />
        <div className="flex items-center gap-3">
          <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <CheckCircle2 className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aceitas (True Positives)</p>
              <p className="text-2xl font-bold text-cyan-400">{taxonomyEvents?.adoptions || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rejeitadas (False Positives)</p>
              <p className="text-2xl font-bold text-red-400">{taxonomyEvents?.rejections || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/20">
              <Target className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Aprendizado</p>
              <p className="text-2xl font-bold text-teal-400">
                {taxonomyEvents?.acceptanceRate.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tempo Médio Decisão</p>
              <p className="text-2xl font-bold text-amber-400">
                {taxonomyEvents?.avgDecisionTime ? `${(taxonomyEvents.avgDecisionTime / 1000).toFixed(1)}s` : "N/A"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acceptance Rate Over Time */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            Taxa de Aprendizado ao Longo do Tempo
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={taxonomyEvents?.timeSeriesData || []}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN_COLORS.cyan500} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={CYAN_COLORS.cyan500} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
              <RechartsTooltip content={<CustomTooltip />} />
              <ReferenceLine y={70} stroke={CYAN_COLORS.amber500} strokeDasharray="5 5" label={{ value: "Meta 70%", fill: CYAN_COLORS.amber500, fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="rate"
                name="Taxa %"
                stroke={CYAN_COLORS.cyan500}
                strokeWidth={2}
                fill="url(#colorRate)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Decisions Distribution */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-teal-400" />
            Distribuição de Decisões
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={taxonomyEvents?.pieData || []}
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {(taxonomyEvents?.pieData || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Adoptions vs Rejections Over Time */}
        <Card className="p-4 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-cyan-400" />
            Adoções vs Rejeições por Dia
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={taxonomyEvents?.timeSeriesData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="adoptions" name="Adoções" fill={CYAN_COLORS.cyan500} radius={[4, 4, 0, 0]} />
              <Bar dataKey="rejections" name="Rejeições" fill={CYAN_COLORS.red500} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Events Table */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Eventos Recentes de Taxonomia
        </h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {(taxonomyEvents?.recentEvents || []).map((event: any) => {
              const isAdoption = event.action_type === "adopt_orphan" || event.action_type === "taxonomy_adoption";
              const decision = typeof event.user_decision === "string" ? JSON.parse(event.user_decision) : event.user_decision;

              return (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${isAdoption ? "border-cyan-500/30 bg-cyan-500/5" : "border-red-500/30 bg-red-500/5"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isAdoption ? (
                        <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      <div>
                        <p className="font-medium">
                          {decision?.target_parent_name || decision?.action || event.action_type}
                        </p>
                        <p className="text-sm text-muted-foreground">{event.rationale}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={isAdoption ? "default" : "destructive"} className="mb-1">
                        {isAdoption ? "Aceita" : "Rejeitada"}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default TaxonomyMLAuditTab;
