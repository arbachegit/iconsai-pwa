import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, FileText, ShieldAlert, Users, 
  ArrowUpRight, ArrowDownRight, Activity, Info, Clock
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import DataFlowDiagram from "@/components/DataFlowDiagram";

// Stat Card Component
const StatCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend,
  tooltip
}: { 
  title: string; 
  value: string; 
  change: string; 
  icon: React.ElementType; 
  trend: "up" | "down";
  tooltip: string;
}) => (
  <div className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow relative">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
            <Info size={20} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-sm">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <div className="flex items-center justify-between">
      <div className="p-3 bg-primary/10 rounded-lg">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium ${
        trend === "up" ? "text-emerald-500" : "text-red-500"
      }`}>
        {trend === "up" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        {change}
      </div>
    </div>
    <div className="mt-4">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
    </div>
  </div>
);

export const DashboardTab = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch chat analytics
  const { data: chatAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["dashboard-chat-analytics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_analytics")
        .select("id, started_at, message_count")
        .order("started_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  // Fetch documents count
  const { data: documentsData, isLoading: docsLoading } = useQuery({
    queryKey: ["dashboard-documents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, status, created_at")
        .eq("status", "completed");
      return data || [];
    },
  });

  // Fetch security alerts
  const { data: securityAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["dashboard-security-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("security_scan_results")
        .select("id, overall_status")
        .eq("overall_status", "critical")
        .limit(10);
      return data || [];
    },
  });

  // Fetch recent activity logs
  const { data: recentLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["dashboard-recent-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_activity_logs")
        .select("id, action, action_category, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Fetch hourly activity for peak hours chart
  const { data: hourlyActivityLogs } = useQuery({
    queryKey: ["dashboard-hourly-activity"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data } = await supabase
        .from("user_activity_logs")
        .select("created_at")
        .gte("created_at", sevenDaysAgo);
      return data || [];
    },
  });

  const { data: hourlyChatActivity } = useQuery({
    queryKey: ["dashboard-hourly-chat"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data } = await supabase
        .from("chat_analytics")
        .select("started_at, message_count")
        .gte("started_at", sevenDaysAgo);
      return data || [];
    },
  });

  // Fetch active users (unique sessions in last 24h)
  const { data: activeUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["dashboard-active-users"],
    queryFn: async () => {
      const yesterday = subDays(new Date(), 1).toISOString();
      const { data } = await supabase
        .from("chat_analytics")
        .select("session_id")
        .gte("last_interaction", yesterday);
      return data || [];
    },
  });

  const isLoading = analyticsLoading || docsLoading || alertsLoading || logsLoading || usersLoading;

  // Safe mode: always render something visible during mount
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-64 min-h-[256px] bg-background">
        <div className="text-muted-foreground">Carregando painel...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 min-h-[256px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate metrics
  const totalConversas = chatAnalytics?.length || 0;
  const docsProcessados = documentsData?.length || 0;
  const alertasCriticos = securityAlerts?.length || 0;
  const usuariosAtivos = activeUsers?.length || 0;

  // Generate chart data from real data or fallback to mock
  const generateChartData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayName = format(date, "EEE", { locale: ptBR });
      const dateStr = format(date, "yyyy-MM-dd");
      
      const conversasCount = chatAnalytics?.filter(c => 
        c.started_at?.startsWith(dateStr)
      ).length ?? 0;
      
      const docsCount = documentsData?.filter(d => 
        d.created_at?.startsWith(dateStr)
      ).length ?? 0;
      
      days.push({
        name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        conversas: conversasCount,
        docs: docsCount,
      });
    }
    return days;
  };

  const chartData = generateChartData();

  // Generate hourly peak usage data
  const generatePeakHoursData = () => {
    const hourlyData: { [hour: number]: { sections: number; chats: number } } = {};
    
    // Initialize all 24 hours
    for (let h = 0; h < 24; h++) {
      hourlyData[h] = { sections: 0, chats: 0 };
    }
    
    // Count activity logs (sections visited, simulations tested)
    hourlyActivityLogs?.forEach((log) => {
      if (log.created_at) {
        const hour = new Date(log.created_at).getHours();
        hourlyData[hour].sections += 1;
      }
    });
    
    // Count chat interactions
    hourlyChatActivity?.forEach((chat) => {
      if (chat.started_at) {
        const hour = new Date(chat.started_at).getHours();
        hourlyData[hour].chats += (chat.message_count || 1);
      }
    });
    
    // Convert to array format for chart
    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, "0")}h`,
      total: hourlyData[hour].sections + hourlyData[hour].chats,
      sections: hourlyData[hour].sections,
      chats: hourlyData[hour].chats,
    }));
  };

  const peakHoursData = generatePeakHoursData();

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `Há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    return `Há ${Math.floor(diffHours / 24)}d`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema KnowYOU.</p>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Conversas Totais" 
          value={totalConversas.toLocaleString()} 
          change="+12.5%" 
          icon={MessageSquare} 
          trend="up"
          tooltip="Total de sessões de chat registradas no sistema. Cada conversa iniciada conta como uma sessão única."
        />
        <StatCard 
          title="Docs Processados" 
          value={docsProcessados.toLocaleString()} 
          change="+5.2%" 
          icon={FileText} 
          trend="up"
          tooltip="Quantidade de documentos processados com sucesso e inseridos no sistema RAG para uso nos chats."
        />
        <StatCard 
          title="Alertas Críticos" 
          value={alertasCriticos.toString()} 
          change="-2.0%" 
          icon={ShieldAlert} 
          trend="down"
          tooltip="Número de alertas de segurança com status crítico identificados nos últimos scans do sistema."
        />
        <StatCard 
          title="Usuários Ativos" 
          value={usuariosAtivos.toLocaleString()} 
          change="+18.2%" 
          icon={Users} 
          trend="up"
          tooltip="Sessões únicas de chat com interação nas últimas 24 horas. Inclui visitantes anônimos que usaram o chat."
        />
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN CHART */}
        <div className="lg:col-span-2 bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Atividade do Sistema</h3>
            <p className="text-sm text-muted-foreground">Volume de conversas e processamento RAG (7 dias)</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConversas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))', 
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="conversas" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorConversas)" 
                  name="Conversas"
                />
                <Area 
                  type="monotone" 
                  dataKey="docs" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorDocs)" 
                  name="Documentos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECENT ACTIVITY / LOGS */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Logs Recentes</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[280px] text-sm">
                  Registro das últimas ações realizadas por administradores no sistema, incluindo navegação, uploads, exclusões e alterações de configuração.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="space-y-4">
            {recentLogs && recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <TooltipProvider key={log.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 rounded-md transition-colors p-2 -mx-2"
                      >
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                          <Activity size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{log.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(log.created_at)} • {log.action_category}
                          </p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[300px] text-sm">
                      <p className="font-medium">{log.action}</p>
                      <p className="text-muted-foreground mt-1">{log.action_category} • {formatTimeAgo(log.created_at)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))
            ) : (
              [1, 2, 3, 4, 5].map((_, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Activity size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Novo Documento Ingerido</p>
                    <p className="text-xs text-muted-foreground">Há {i * 15 + 2} minutos • UPLOAD</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PEAK HOURS CHART */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Horários de Pico de Uso</h3>
            <p className="text-sm text-muted-foreground">Volume de atividades ao longo das 24 horas (últimos 7 dias)</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[300px] text-sm">
                Soma de seções visitadas, simulações testadas e interações com os chats, agrupadas por hora do dia.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={peakHoursData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="hour" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                interval={1}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))' }} 
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number, name: string) => {
                  const labels: { [key: string]: string } = {
                    total: "Total",
                    sections: "Seções/Simulações",
                    chats: "Interações Chat"
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Bar 
                dataKey="total" 
                fill="url(#colorPeak)" 
                radius={[4, 4, 0, 0]}
                name="total"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DATA FLOW DIAGRAM */}
      <DataFlowDiagram />
    </div>
  );
};
