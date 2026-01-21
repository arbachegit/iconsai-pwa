import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Mail,
  MessageSquare,
  Monitor,
  Smartphone,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
} from "lucide-react";

interface NotificationLog {
  id: string;
  channel: "email" | "whatsapp";
  status: "success" | "failed" | "pending";
  created_at: string;
  metadata: Record<string, any>;
}

const COLORS = {
  success: "#22c55e",
  failed: "#ef4444",
  pending: "#f59e0b",
  email: "#3b82f6",
  whatsapp: "#25D366",
  platform: "#8b5cf6",
  app: "#10b981",
};

export const DeliveryMetricsTab = () => {
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Fetch notification logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["delivery-metrics", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("notification_logs")
        .select("id, channel, status, created_at, metadata")
        .order("created_at", { ascending: false });

      if (dateFrom) {
        query = query.gte("created_at", `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte("created_at", `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NotificationLog[];
    },
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!logs) return null;

    const byChannel = {
      email: { success: 0, failed: 0, pending: 0, total: 0 },
      whatsapp: { success: 0, failed: 0, pending: 0, total: 0 },
    };

    const byProduct = {
      platform: { success: 0, failed: 0, total: 0 },
      app: { success: 0, failed: 0, total: 0 },
      other: { success: 0, failed: 0, total: 0 },
    };

    const byDay: Record<string, { success: number; failed: number }> = {};

    logs.forEach((log) => {
      // By channel
      byChannel[log.channel][log.status]++;
      byChannel[log.channel].total++;

      // By product (from metadata)
      const product = log.metadata?.product || "other";
      if (product === "platform" || product === "app") {
        byProduct[product][log.status === "success" ? "success" : "failed"]++;
        byProduct[product].total++;
      } else {
        byProduct.other[log.status === "success" ? "success" : "failed"]++;
        byProduct.other.total++;
      }

      // By day
      const day = log.created_at.split("T")[0];
      if (!byDay[day]) byDay[day] = { success: 0, failed: 0 };
      if (log.status === "success") byDay[day].success++;
      else if (log.status === "failed") byDay[day].failed++;
    });

    return {
      total: logs.length,
      byChannel,
      byProduct,
      byDay: Object.entries(byDay)
        .map(([date, counts]) => ({
          date,
          ...counts,
          rate: counts.success + counts.failed > 0
            ? Math.round((counts.success / (counts.success + counts.failed)) * 100)
            : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14), // Last 14 days
    };
  }, [logs]);

  const channelPieData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: "Email Sucesso", value: metrics.byChannel.email.success, color: COLORS.email },
      { name: "Email Falha", value: metrics.byChannel.email.failed, color: "#93c5fd" },
      { name: "WhatsApp Sucesso", value: metrics.byChannel.whatsapp.success, color: COLORS.whatsapp },
      { name: "WhatsApp Falha", value: metrics.byChannel.whatsapp.failed, color: "#86efac" },
    ].filter(d => d.value > 0);
  }, [metrics]);

  const productPieData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: "Plataforma Sucesso", value: metrics.byProduct.platform.success, color: COLORS.platform },
      { name: "Plataforma Falha", value: metrics.byProduct.platform.failed, color: "#c4b5fd" },
      { name: "APP Sucesso", value: metrics.byProduct.app.success, color: COLORS.app },
      { name: "APP Falha", value: metrics.byProduct.app.failed, color: "#6ee7b7" },
    ].filter(d => d.value > 0);
  }, [metrics]);

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

  const emailSuccessRate = metrics
    ? Math.round((metrics.byChannel.email.success / Math.max(metrics.byChannel.email.total, 1)) * 100)
    : 0;
  const whatsappSuccessRate = metrics
    ? Math.round((metrics.byChannel.whatsapp.success / Math.max(metrics.byChannel.whatsapp.total, 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Métricas de Envio</h2>
          <p className="text-sm text-muted-foreground">
            Dashboard de performance de entrega por canal e produto
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px]"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Envios</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total || 0}</div>
            <p className="text-xs text-muted-foreground">no período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Email</CardTitle>
            <Mail className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.byChannel.email.success || 0} / {metrics?.byChannel.email.total || 0} enviados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{whatsappSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.byChannel.whatsapp.success || 0} / {metrics?.byChannel.whatsapp.total || 0} enviados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics?.byChannel.email.pending || 0) + (metrics?.byChannel.whatsapp.pending || 0)}
            </div>
            <p className="text-xs text-muted-foreground">aguardando processamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            {channelPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={channelPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {channelPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Produto</CardTitle>
          </CardHeader>
          <CardContent>
            {productPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={productPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {productPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendência Diária de Envios</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics?.byDay && metrics.byDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.byDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.slice(5)} // MM-DD format
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="success" name="Sucesso" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Falha" fill={COLORS.failed} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem dados no período
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-400" />
              Detalhes Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Enviados com sucesso</span>
              <Badge className="bg-green-500/20 text-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {metrics?.byChannel.email.success || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Falhas</span>
              <Badge className="bg-red-500/20 text-red-400">
                <XCircle className="h-3 w-3 mr-1" />
                {metrics?.byChannel.email.failed || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-400" />
              Detalhes WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Enviados com sucesso</span>
              <Badge className="bg-green-500/20 text-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {metrics?.byChannel.whatsapp.success || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Falhas</span>
              <Badge className="bg-red-500/20 text-red-400">
                <XCircle className="h-3 w-3 mr-1" />
                {metrics?.byChannel.whatsapp.failed || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryMetricsTab;
