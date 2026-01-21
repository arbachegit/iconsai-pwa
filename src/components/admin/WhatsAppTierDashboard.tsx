import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  Shield,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  ArrowRightLeft,
  Clock,
  Zap,
  CloudDownload,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tier limits definition
const TIER_LIMITS: Record<number, number> = {
  0: 250,
  1: 1000,
  2: 10000,
  3: 100000,
  4: 1000000,
};

const TIER_NAMES: Record<number, string> = {
  0: "Unverified",
  1: "Tier 1",
  2: "Tier 2",
  3: "Tier 3",
  4: "Unlimited",
};

const TIER_COLORS: Record<number, string> = {
  0: "bg-red-500/20 text-red-500 border-red-500/30",
  1: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  2: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  3: "bg-green-500/20 text-green-500 border-green-500/30",
  4: "bg-purple-500/20 text-purple-500 border-purple-500/30",
};

const QUALITY_COLORS: Record<string, string> = {
  green: "bg-green-500/20 text-green-500 border-green-500/30",
  yellow: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  red: "bg-red-500/20 text-red-500 border-red-500/30",
  unknown: "bg-muted text-muted-foreground border-muted",
};

interface EligibilityData {
  current_tier: number;
  current_limit: number;
  next_tier: number | null;
  next_limit: number | null;
  quality_rating: string;
  phone_status: string;
  business_verified: boolean;
  threshold_required: number;
  days_above_threshold: number;
  avg_daily_users: number;
  percent_limit_used: number;
  blocks_7days: number;
  reports_7days: number;
  eligible_for_upgrade: boolean;
  recommendation: string;
  daily_metrics: Array<{
    metric_date: string;
    messages_sent: number;
    unique_users: number;
  }>;
}

// Helper to get color based on usage percentage
const getColorByPercent = (percent: number): string => {
  if (percent >= 80) return "hsl(0, 84%, 60%)"; // red-500
  if (percent >= 60) return "hsl(38, 92%, 50%)"; // amber-500
  return "hsl(142, 71%, 45%)"; // green-500
};

const getColorClass = (percent: number): string => {
  if (percent >= 80) return "text-red-500";
  if (percent >= 60) return "text-amber-500";
  return "text-green-500";
};

export default function WhatsAppTierDashboard() {
  const queryClient = useQueryClient();

  // Fetch eligibility data from edge function
  const { data: eligibilityData, isLoading, error, refetch } = useQuery({
    queryKey: ["whatsapp-tier-eligibility"],
    queryFn: async (): Promise<EligibilityData> => {
      const { data, error } = await supabase.functions.invoke("check-tier-eligibility");
      
      if (error) {
        console.error("[WhatsAppTierDashboard] Edge function error:", error);
        throw new Error(error.message || "Falha ao buscar dados");
      }
      
      if (!data?.success) {
        throw new Error(data?.error || "Falha ao buscar elegibilidade");
      }
      
      return data.data as EligibilityData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Real-time today's count
  const { data: todayCount = 0 } = useQuery({
    queryKey: ["whatsapp-today-count"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { count, error } = await supabase
        .from("notification_logs")
        .select("*", { count: "exact", head: true })
        .eq("channel", "whatsapp")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);
      
      if (error) {
        console.error("[WhatsAppTierDashboard] Error fetching today count:", error);
        return 0;
      }
      return count || 0;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fallbacks today count
  const { data: fallbacksToday } = useQuery({
    queryKey: ["fallbacks-today"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { count, error } = await supabase
        .from("notification_fallback_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`);
      
      if (error) {
        console.error("[WhatsAppTierDashboard] Error fetching fallbacks:", error);
        return 0;
      }
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Mutation to update metrics
  const updateMetricsMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.functions.invoke("update-whatsapp-metrics", {
        body: { date: today },
      });
      
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Falha ao atualizar métricas");
      
      return data;
    },
    onSuccess: () => {
      toast.success("Métricas atualizadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-tier-eligibility"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-today-count"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar métricas", {
        description: error.message,
      });
    },
  });

  // Mutation to sync with Meta
  const syncMetaMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-meta-tier");
      
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Falha ao sincronizar com Meta");
      
      return data;
    },
    onSuccess: (data) => {
      toast.success("Sincronizado com Meta!", {
        description: `Tier: ${TIER_NAMES[data.data?.current_tier] || 'N/A'}, Limite: ${data.data?.messaging_limit?.toLocaleString() || 'N/A'}`,
      });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-tier-eligibility"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao sincronizar com Meta", {
        description: error.message,
      });
    },
  });

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Erro ao carregar dados</p>
                <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!eligibilityData) return null;

  const {
    current_tier,
    current_limit,
    next_tier,
    next_limit,
    quality_rating,
    phone_status,
    business_verified,
    threshold_required,
    days_above_threshold,
    avg_daily_users,
    percent_limit_used,
    blocks_7days,
    reports_7days,
    eligible_for_upgrade,
    recommendation,
    daily_metrics,
  } = eligibilityData;

  // Calculate real-time usage percentage
  const dailyLimit = current_limit || 1000;
  const realTimeUsagePercent = (todayCount / dailyLimit) * 100;
  const remaining = dailyLimit - todayCount;

  const progressUpgradePercent = (days_above_threshold / 7) * 100;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            WhatsApp Business API - Tier Monitor
          </h1>
          <p className="text-muted-foreground">
            Monitoramento de limites, qualidade e elegibilidade para upgrade
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncMetaMutation.mutate()}
            disabled={syncMetaMutation.isPending}
          >
            {syncMetaMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CloudDownload className="h-4 w-4 mr-2" />
            )}
            Sincronizar Meta
          </Button>
          <Button
            onClick={() => updateMetricsMutation.mutate()}
            disabled={updateMetricsMutation.isPending}
          >
            {updateMetricsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar Métricas
          </Button>
        </div>
      </div>

      {/* Real-time Counter Card - PROMINENT */}
      <Card 
        className="border-2 transition-colors"
        style={{ borderColor: getColorByPercent(realTimeUsagePercent) }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Envios Hoje (Tempo Real)
          </CardTitle>
          <CardDescription>
            Atualiza automaticamente a cada 30 segundos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-bold ${getColorClass(realTimeUsagePercent)}`}>
              {todayCount.toLocaleString()}
            </span>
            <span className="text-2xl text-muted-foreground">
              / {dailyLimit.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={Math.min(realTimeUsagePercent, 100)} 
            className="mt-4 h-4"
          />
          <div className="flex justify-between mt-3 text-sm">
            <span className="text-muted-foreground">
              Restante: <strong>{remaining.toLocaleString()}</strong> mensagens
            </span>
            <span className={getColorClass(realTimeUsagePercent)}>
              <strong>{realTimeUsagePercent.toFixed(1)}%</strong> usado
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 5 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Tier Atual */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Tier Atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className={`text-lg px-3 py-1 ${TIER_COLORS[current_tier]}`}>
              {TIER_NAMES[current_tier]}
            </Badge>
            <p className="text-xl font-bold mt-2">
              {formatNumber(current_limit)}
              <span className="text-sm text-muted-foreground font-normal"> msgs/dia</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Quality Rating */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Quality Rating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className={`capitalize ${QUALITY_COLORS[quality_rating] || QUALITY_COLORS.unknown}`}>
              {quality_rating === "unknown" ? "Não avaliado" : quality_rating}
            </Badge>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                {blocks_7days} bloq.
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                {reports_7days} den.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Uso do Limite */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Uso do Limite
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{percent_limit_used.toFixed(1)}%</p>
            <Progress value={Math.min(percent_limit_used, 100)} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Média: {avg_daily_users.toFixed(0)} users/dia
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Progresso Upgrade */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Progresso Upgrade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{days_above_threshold}/7</p>
              <span className="text-muted-foreground text-sm">dias</span>
              {eligible_for_upgrade && (
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30 ml-auto text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Elegível!
                </Badge>
              )}
            </div>
            <Progress value={progressUpgradePercent} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Meta: {formatNumber(threshold_required)}+ users/dia
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Fallbacks Hoje */}
        <Card className={fallbacksToday && fallbacksToday > 0 ? "border-orange-500/50" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ArrowRightLeft className="h-4 w-4" />
              Fallbacks Hoje
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${fallbacksToday && fallbacksToday > 0 ? "text-orange-500" : ""}`}>
              {fallbacksToday || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Mensagens redirecionadas para SMS
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendation Card */}
      <Card className={eligible_for_upgrade ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            {eligible_for_upgrade ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <Info className="h-5 w-5 text-amber-500 mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {eligible_for_upgrade ? "Pronto para upgrade!" : "Recomendação"}
              </p>
              <p className="text-sm text-muted-foreground">{recommendation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last 7 Days Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Últimos 7 Dias</CardTitle>
          <CardDescription>
            Progresso diário em direção ao threshold de {formatNumber(threshold_required)} usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {daily_metrics.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma métrica disponível ainda
              </p>
            ) : (
              daily_metrics.map((metric) => {
                const progressPercent = Math.min((metric.unique_users / threshold_required) * 100, 100);
                const isAboveThreshold = metric.unique_users >= threshold_required;
                
                return (
                  <div key={metric.metric_date} className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">
                      {format(parseISO(metric.metric_date), "dd/MM (EEE)", { locale: ptBR })}
                    </span>
                    <div className="flex-1">
                      <Progress 
                        value={progressPercent} 
                        className={`h-3 ${isAboveThreshold ? "bg-green-500/20" : ""}`}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {metric.unique_users}
                    </span>
                    {isAboveThreshold && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                        ✓ 50%+
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Roadmap Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Roadmap de Tiers</CardTitle>
          <CardDescription>
            Requisitos para progressão de tier no WhatsApp Business API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Tier 0 → 1 */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${current_tier >= 1 ? "bg-green-500/20" : "bg-muted"}`}>
                {current_tier >= 1 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-muted-foreground font-medium">0</span>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${current_tier >= 1 ? "bg-green-500/20" : "bg-amber-500/20"}`}>
                <span className={current_tier >= 1 ? "text-green-500 font-medium" : "text-amber-500 font-medium"}>1</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Verificar Negócio</p>
                <p className="text-sm text-muted-foreground">Verificação do Meta Business Suite</p>
              </div>
              <Badge className={business_verified ? "bg-green-500/20 text-green-500" : "bg-amber-500/20 text-amber-500"}>
                {business_verified ? "Verificado" : "Pendente"}
              </Badge>
            </div>

            {/* Tier 1 → 2 */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${current_tier >= 2 ? "bg-green-500/20" : "bg-muted"}`}>
                {current_tier >= 2 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-muted-foreground font-medium">1</span>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${current_tier >= 2 ? "bg-green-500/20" : "bg-blue-500/20"}`}>
                <span className={current_tier >= 2 ? "text-green-500 font-medium" : "text-blue-500 font-medium"}>2</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">500+ msgs/dia por 7 dias</p>
                <p className="text-sm text-muted-foreground">Manter volume consistente acima de 50% do limite</p>
              </div>
              {current_tier === 1 && (
                <Badge variant="outline">{days_above_threshold}/7 dias</Badge>
              )}
              {current_tier >= 2 && (
                <Badge className="bg-green-500/20 text-green-500">Completo</Badge>
              )}
            </div>

            {/* Tier 2 → 3 */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${current_tier >= 3 ? "bg-green-500/20" : "bg-muted"}`}>
                {current_tier >= 3 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-muted-foreground font-medium">2</span>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${current_tier >= 3 ? "bg-green-500/20" : "bg-green-500/20"}`}>
                <span className={current_tier >= 3 ? "text-green-500 font-medium" : "text-green-500 font-medium"}>3</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">5.000+ msgs/dia por 7 dias</p>
                <p className="text-sm text-muted-foreground">Escalar para alto volume</p>
              </div>
              {current_tier === 2 && (
                <Badge variant="outline">{days_above_threshold}/7 dias</Badge>
              )}
              {current_tier >= 3 && (
                <Badge className="bg-green-500/20 text-green-500">Completo</Badge>
              )}
            </div>

            {/* Tier 3 → 4 */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${current_tier >= 4 ? "bg-green-500/20" : "bg-muted"}`}>
                {current_tier >= 4 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-muted-foreground font-medium">3</span>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${current_tier >= 4 ? "bg-green-500/20" : "bg-purple-500/20"}`}>
                <span className={current_tier >= 4 ? "text-green-500 font-medium" : "text-purple-500 font-medium"}>∞</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">50.000+ msgs/dia por 7 dias</p>
                <p className="text-sm text-muted-foreground">Tier ilimitado para grandes operações</p>
              </div>
              {current_tier === 3 && (
                <Badge variant="outline">{days_above_threshold}/7 dias</Badge>
              )}
              {current_tier >= 4 && (
                <Badge className="bg-purple-500/20 text-purple-500">Ilimitado</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Telefone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{phone_status}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Negócio Verificado</p>
              <p className="font-medium">{business_verified ? "Sim" : "Não"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Próximo Tier</p>
              <p className="font-medium">{next_tier !== null ? TIER_NAMES[next_tier] : "Máximo"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Próximo Limite</p>
              <p className="font-medium">{next_limit ? formatNumber(next_limit) + " msgs/dia" : "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
