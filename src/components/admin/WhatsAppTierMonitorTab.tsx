import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Shield,
  Zap,
  RefreshCw,
  Info,
  AlertCircle,
  Clock,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tier information based on Twilio/Meta limits
const TIER_INFO = [
  { tier: 0, name: "Unverified", limit: 250, color: "#ef4444" },
  { tier: 1, name: "Tier 1", limit: 1000, color: "#f59e0b" },
  { tier: 2, name: "Tier 2", limit: 10000, color: "#3b82f6" },
  { tier: 3, name: "Tier 3", limit: 100000, color: "#22c55e" },
  { tier: 4, name: "Tier 4", limit: Infinity, color: "#8b5cf6" },
];

const QUALITY_COLORS = {
  green: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
  unknown: "#6b7280",
};

interface TierStatus {
  id: string;
  current_tier: number;
  daily_limit: number;
  messages_sent_today: number;
  quality_rating: string;
  last_updated: string;
  next_tier_eligible: string | null;
  notes: string | null;
}

interface DailyMetrics {
  id: string;
  metric_date: string;
  template_messages: number;
  session_messages: number;
  failed_messages: number;
  quality_score: number | null;
}

interface QualityEvent {
  id: string;
  event_type: string;
  event_count: number;
  reported_at: string;
  details: Record<string, any> | null;
}

export const WhatsAppTierMonitorTab = () => {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch current tier status
  // Note: Using type assertion because new tables may not be in generated types yet
  const { data: tierStatus, isLoading: loadingTier } = useQuery({
    queryKey: ["whatsapp-tier-status"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_tier_status")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as TierStatus | null;
    },
  });

  // Fetch daily metrics for the last 30 days
  const { data: dailyMetrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["whatsapp-daily-metrics"],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data, error } = await (supabase as any)
        .from("whatsapp_daily_metrics")
        .select("*")
        .gte("metric_date", thirtyDaysAgo)
        .order("metric_date", { ascending: true });
      if (error) throw error;
      return data as DailyMetrics[];
    },
  });

  // Fetch quality events
  const { data: qualityEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ["whatsapp-quality-events"],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data, error } = await (supabase as any)
        .from("whatsapp_quality_events")
        .select("*")
        .gte("reported_at", thirtyDaysAgo)
        .order("reported_at", { ascending: false });
      if (error) throw error;
      return data as QualityEvent[];
    },
  });

  // Mutation to refresh metrics from notification_logs
  const refreshMetricsMutation = useMutation({
    mutationFn: async () => {
      setRefreshing(true);
      
      // Aggregate today's data from notification_logs
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: logs, error: logsError } = await (supabase as any)
        .from("notification_logs")
        .select("status, metadata, created_at")
        .eq("channel", "whatsapp")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      if (logsError) throw logsError;

      const logsTyped = logs as Array<{ status: string; metadata: Record<string, any>; created_at: string }> || [];
      const templateMessages = logsTyped.filter(l => l.metadata?.template_type === "template").length;
      const sessionMessages = logsTyped.filter(l => l.metadata?.template_type === "session").length;
      const failedMessages = logsTyped.filter(l => l.status === "failed").length;
      const totalSuccess = logsTyped.filter(l => l.status === "success").length;
      const total = logsTyped.length;
      const qualityScore = total > 0 ? Math.round((totalSuccess / total) * 100) : null;

      // Upsert daily metrics
      const { error: upsertError } = await (supabase as any)
        .from("whatsapp_daily_metrics")
        .upsert({
          metric_date: today,
          template_messages: templateMessages,
          session_messages: sessionMessages,
          failed_messages: failedMessages,
          quality_score: qualityScore,
        }, { onConflict: "metric_date" });

      if (upsertError) throw upsertError;

      // Update tier status with today's count
      if (tierStatus?.id) {
        const { error: tierError } = await (supabase as any)
          .from("whatsapp_tier_status")
          .update({
            messages_sent_today: templateMessages + sessionMessages,
            last_updated: new Date().toISOString(),
          })
          .eq("id", tierStatus.id);

        if (tierError) throw tierError;
      }

      return { templateMessages, sessionMessages, failedMessages };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-tier-status"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-daily-metrics"] });
      toast.success("Métricas atualizadas com sucesso");
      setRefreshing(false);
    },
    onError: (error) => {
      console.error("Error refreshing metrics:", error);
      toast.error("Erro ao atualizar métricas");
      setRefreshing(false);
    },
  });

  // Calculate usage percentage
  const usagePercent = useMemo(() => {
    if (!tierStatus) return 0;
    if (tierStatus.daily_limit === 0) return 0;
    return Math.min(100, Math.round((tierStatus.messages_sent_today / tierStatus.daily_limit) * 100));
  }, [tierStatus]);

  // Get tier info
  const currentTierInfo = useMemo(() => {
    if (!tierStatus) return TIER_INFO[0];
    return TIER_INFO.find(t => t.tier === tierStatus.current_tier) || TIER_INFO[0];
  }, [tierStatus]);

  // Chart data
  const chartData = useMemo(() => {
    if (!dailyMetrics) return [];
    return dailyMetrics.map(m => ({
      date: format(new Date(m.metric_date), "dd/MM", { locale: ptBR }),
      templates: m.template_messages,
      sessions: m.session_messages,
      falhas: m.failed_messages,
      qualidade: m.quality_score || 0,
    }));
  }, [dailyMetrics]);

  // Aggregate quality events
  const eventsSummary = useMemo(() => {
    if (!qualityEvents) return { blocks: 0, reports: 0, mutes: 0 };
    return {
      blocks: qualityEvents.filter(e => e.event_type === "block").reduce((a, e) => a + e.event_count, 0),
      reports: qualityEvents.filter(e => e.event_type === "report").reduce((a, e) => a + e.event_count, 0),
      mutes: qualityEvents.filter(e => e.event_type === "mute").reduce((a, e) => a + e.event_count, 0),
    };
  }, [qualityEvents]);

  const isLoading = loadingTier || loadingMetrics || loadingEvents;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-green-500" />
            Monitoramento WhatsApp Tier
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhamento de limites, qualidade e eventos do WhatsApp Business API
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMetricsMutation.mutate()}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar Métricas
        </Button>
      </div>

      {/* Tier Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Current Tier */}
        <Card style={{ borderColor: currentTierInfo.color + "50" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tier Atual</CardTitle>
            <Shield className="h-4 w-4" style={{ color: currentTierInfo.color }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: currentTierInfo.color }}>
              {currentTierInfo.name}
            </div>
            <p className="text-xs text-muted-foreground">
              Limite: {tierStatus?.daily_limit?.toLocaleString() || "N/A"} msgs/dia
            </p>
          </CardContent>
        </Card>

        {/* Daily Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Uso Hoje</CardTitle>
            <Zap className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tierStatus?.messages_sent_today?.toLocaleString() || 0}
            </div>
            <Progress value={usagePercent} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {usagePercent}% do limite diário
            </p>
          </CardContent>
        </Card>

        {/* Quality Rating */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Qualidade</CardTitle>
            {tierStatus?.quality_rating === "green" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : tierStatus?.quality_rating === "yellow" ? (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            ) : tierStatus?.quality_rating === "red" ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Info className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <Badge
              className="text-sm px-3 py-1"
              style={{
                backgroundColor: QUALITY_COLORS[tierStatus?.quality_rating as keyof typeof QUALITY_COLORS || "unknown"] + "20",
                color: QUALITY_COLORS[tierStatus?.quality_rating as keyof typeof QUALITY_COLORS || "unknown"],
              }}
            >
              {tierStatus?.quality_rating?.toUpperCase() || "N/A"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Rating Meta/Twilio
            </p>
          </CardContent>
        </Card>

        {/* Next Tier Eligible */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próximo Tier</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            {tierStatus?.next_tier_eligible ? (
              <>
                <div className="text-2xl font-bold">
                  {format(new Date(tierStatus.next_tier_eligible), "dd/MM", { locale: ptBR })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Elegível para upgrade
                </p>
              </>
            ) : (
              <>
                <div className="text-lg font-medium text-muted-foreground">--</div>
                <p className="text-xs text-muted-foreground">
                  Mantenha qualidade alta
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quality Events Alert */}
      {(eventsSummary.blocks > 0 || eventsSummary.reports > 0) && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Eventos de Qualidade (Últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <span className="text-2xl font-bold text-red-500">{eventsSummary.blocks}</span>
                <span className="text-sm text-muted-foreground ml-2">Bloqueios</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-yellow-500">{eventsSummary.reports}</span>
                <span className="text-sm text-muted-foreground ml-2">Denúncias</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-orange-500">{eventsSummary.mutes}</span>
                <span className="text-sm text-muted-foreground ml-2">Silenciados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Volume de Mensagens (30 dias)</CardTitle>
            <CardDescription>Templates vs Sessões por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="templates"
                    name="Templates"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    name="Sessões"
                    stackId="1"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quality Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score de Qualidade</CardTitle>
            <CardDescription>Taxa de sucesso por dia (%)</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="qualidade"
                    name="Qualidade %"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: "#22c55e", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Failures Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Falhas de Entrega</CardTitle>
          <CardDescription>Mensagens com erro por dia</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="falhas" name="Falhas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Limits Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referência de Tiers</CardTitle>
          <CardDescription>Limites do WhatsApp Business API (Meta/Twilio)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TIER_INFO.map((tier) => (
              <div
                key={tier.tier}
                className={`p-3 rounded-lg border ${
                  tierStatus?.current_tier === tier.tier
                    ? "ring-2 ring-offset-2"
                    : "opacity-70"
                }`}
                style={{
                  borderColor: tier.color + "50",
                  backgroundColor: tier.color + "10",
                  // ringColor applied via className conditionally
                }}
              >
                <div className="text-sm font-medium" style={{ color: tier.color }}>
                  {tier.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {tier.limit === Infinity ? "Ilimitado" : `${tier.limit.toLocaleString()}/dia`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      {tierStatus?.last_updated && (
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Clock className="h-3 w-3" />
          Última atualização: {format(new Date(tierStatus.last_updated), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </p>
      )}
    </div>
  );
};

export default WhatsAppTierMonitorTab;
