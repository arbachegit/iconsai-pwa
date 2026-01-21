import { useState, useMemo, useCallback } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Search, 
  Download, 
  ChevronDown, 
  LogIn, 
  LogOut, 
  Trash2, 
  Settings, 
  FileText, 
  Upload, 
  Database, 
  GitBranch, 
  Tag, 
  Image,
  Loader2,
  ClipboardList,
  KeyRound,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Users,
  Tags,
  CalendarIcon,
  TrendingUp
} from "lucide-react";
import { exportData } from "@/lib/export-utils";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type SortColumn = "created_at" | "user_email" | "action_category" | "action";
type SortDirection = "asc" | "desc" | null;
type ChartView = "daily" | "users" | "categories";
type MetricsPeriod = "today" | "7days" | "30days" | "custom";

const CATEGORY_CONFIG: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  LOGIN: { color: "bg-green-500", icon: LogIn },
  LOGOUT: { color: "bg-gray-500", icon: LogOut },
  DELETE: { color: "bg-red-500", icon: Trash2 },
  CONFIG: { color: "bg-blue-500", icon: Settings },
  CONTENT: { color: "bg-purple-500", icon: FileText },
  DOCUMENT: { color: "bg-amber-500", icon: Upload },
  UPLOAD: { color: "bg-lime-500", icon: Upload },
  RAG: { color: "bg-cyan-500", icon: Database },
  EXPORT: { color: "bg-indigo-500", icon: Download },
  VERSION: { color: "bg-pink-500", icon: GitBranch },
  TAG: { color: "bg-orange-500", icon: Tag },
  IMAGE: { color: "bg-emerald-500", icon: Image },
  NAVIGATION: { color: "bg-slate-500", icon: ClipboardList },
  PASSWORD_RECOVERY: { color: "bg-yellow-500", icon: KeyRound },
};

const CATEGORY_COLORS: Record<string, string> = {
  LOGIN: "#22c55e",
  LOGOUT: "#6b7280",
  DELETE: "#ef4444",
  CONFIG: "#3b82f6",
  CONTENT: "#a855f7",
  DOCUMENT: "#f59e0b",
  UPLOAD: "#84cc16",
  RAG: "#06b6d4",
  EXPORT: "#6366f1",
  VERSION: "#ec4899",
  TAG: "#f97316",
  IMAGE: "#10b981",
  NAVIGATION: "#64748b",
  PASSWORD_RECOVERY: "#eab308",
};

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "all", label: "Todos" },
];

export const ActivityLogsTab = () => {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("7days");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Metrics dashboard state
  const [chartView, setChartView] = useState<ChartView>("daily");
  const [metricsPeriod, setMetricsPeriod] = useState<MetricsPeriod>("30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const getDateFilter = () => {
    const now = new Date();
    switch (periodFilter) {
      case "today":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case "7days":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30days":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  const getMetricsDateFilter = () => {
    const now = new Date();
    switch (metricsPeriod) {
      case "today":
        return startOfDay(now).toISOString();
      case "7days":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30days":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case "custom":
        return customDateRange.from ? startOfDay(customDateRange.from).toISOString() : null;
      default:
        return null;
    }
  };

  const getMetricsEndDateFilter = () => {
    if (metricsPeriod === "custom" && customDateRange.to) {
      return endOfDay(customDateRange.to).toISOString();
    }
    return null;
  };

  // Activity logs interface for type safety
  interface ActivityLog {
    id: string;
    created_at: string;
    user_email: string | null;
    action: string;
    action_category: string | null;
    details: Record<string, unknown> | null;
    user_agent: string | null;
  }

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-logs", categoryFilter, periodFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select("id, created_at, user_id, action, resource, resource_id, details, user_agent")
        .order("created_at", { ascending: false })
        .limit(500);

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }

      if (searchQuery) {
        query = query.ilike("action", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      // Map to expected format
      return (data || []).map(log => ({
        id: log.id,
        created_at: log.created_at || new Date().toISOString(),
        user_email: log.user_id,
        action: log.action,
        action_category: log.resource || 'NAVIGATION',
        details: log.details as Record<string, unknown> | null,
        user_agent: log.user_agent
      })) as ActivityLog[];
    },
  });

  // Fetch metrics data
  const { data: metricsLogs } = useQuery({
    queryKey: ["activity-logs-metrics", metricsPeriod, customDateRange],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select("id, created_at, user_id, action, resource, details")
        .order("created_at", { ascending: false });

      const dateFilter = getMetricsDateFilter();
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }

      const endDateFilter = getMetricsEndDateFilter();
      if (endDateFilter) {
        query = query.lte("created_at", endDateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(log => ({
        id: log.id,
        created_at: log.created_at || new Date().toISOString(),
        user_email: log.user_id,
        action: log.action,
        action_category: log.resource || 'NAVIGATION',
        details: log.details as Record<string, unknown> | null
      })) as ActivityLog[];
    },
  });

  // Process metrics data
  const metricsData = useMemo(() => {
    if (!metricsLogs) return { daily: [], users: [], categories: [] };

    // Activities by day
    const dailyMap = new Map<string, number>();
    metricsLogs.forEach(log => {
      const day = format(new Date(log.created_at!), "dd/MM", { locale: ptBR });
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    });
    const daily = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .reverse()
      .slice(-30);

    // Most active users
    const usersMap = new Map<string, number>();
    metricsLogs.forEach(log => {
      const email = log.user_email || "Desconhecido";
      usersMap.set(email, (usersMap.get(email) || 0) + 1);
    });
    const users = Array.from(usersMap.entries())
      .map(([email, count]) => ({ email: email.split("@")[0], fullEmail: email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Categories frequency
    const categoriesMap = new Map<string, number>();
    metricsLogs.forEach(log => {
      const category = log.action_category || "OUTROS";
      categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
    });
    const categories = Array.from(categoriesMap.entries())
      .map(([category, count]) => ({ 
        category, 
        count,
        fill: CATEGORY_COLORS[category] || "#94a3b8"
      }))
      .sort((a, b) => b.count - a.count);

    return { daily, users, categories };
  }, [metricsLogs]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleExportCSV = async () => {
    if (!logs || logs.length === 0) {
      toast.error("Nenhum log para exportar");
      return;
    }

    const exportLogs = logs.map(log => ({
      "Data/Hora": format(new Date(log.created_at!), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
      "Usuário": log.user_email,
      "Categoria": log.action_category,
      "Ação": log.action,
      "Detalhes": JSON.stringify(log.details),
      "Browser": log.user_agent?.substring(0, 50) || "-",
    }));

    await exportData({
      filename: "activity-logs",
      data: exportLogs,
      format: "csv",
    });

    toast.success("Logs exportados com sucesso");
  };

  const getCategoryBadge = (category: string) => {
    const config = CATEGORY_CONFIG[category] || { color: "bg-gray-400", icon: ClipboardList };
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white gap-1`}>
        <Icon className="w-3 h-3" />
        {category}
      </Badge>
    );
  };

  const categories = Object.keys(CATEGORY_CONFIG);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-4 h-4 ml-1" />;
    }
    return <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const sortedLogs = useMemo(() => {
    if (!logs || !sortColumn || !sortDirection) return logs;

    return [...logs].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      if (sortColumn === "created_at") {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      } else {
        aValue = (aValue || "").toString().toLowerCase();
        bValue = (bValue || "").toString().toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [logs, sortColumn, sortDirection]);

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setCustomDateRange({ from: range.from, to: range.to });
      if (range.from && range.to) {
        setIsCalendarOpen(false);
      }
    }
  };

  const getPeriodLabel = () => {
    switch (metricsPeriod) {
      case "today":
        return "Hoje";
      case "7days":
        return "Últimos 7 dias";
      case "30days":
        return "Últimos 30 dias";
      case "custom":
        if (customDateRange.from && customDateRange.to) {
          return `${format(customDateRange.from, "dd/MM")} - ${format(customDateRange.to, "dd/MM")}`;
        }
        return "Selecionar data";
      default:
        return "Últimos 30 dias";
    }
  };

  const chartConfig = {
    count: {
      label: "Atividades",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo
        title="Log de Atividades (Admin)"
        level="h1"
        tooltipText="Histórico completo de ações administrativas"
        infoContent={
          <div className="space-y-3">
            <p className="text-sm">Sistema de rastreamento automático de atividades no painel administrativo.</p>
            
            <div>
              <p className="font-semibold text-emerald-400 mb-1">Implementado</p>
              <ul className="space-y-0.5 text-sm">
                <li><span className="font-semibold text-emerald-400">LOGIN</span> — Logins e tentativas falhas</li>
                <li><span className="font-semibold text-emerald-400">LOGOUT</span> — Logout com duração da sessão</li>
                <li><span className="font-semibold text-emerald-400">CONFIG</span> — Alterações de áudio/alertas</li>
                <li><span className="font-semibold text-emerald-400">USER</span> — Criação e gestão de usuários</li>
                <li><span className="font-semibold text-emerald-400">CONTENT</span> — Atualizações de conteúdo</li>
                <li><span className="font-semibold text-emerald-400">NAVIGATION</span> — Navegação no Admin Panel</li>
              </ul>
            </div>
            
            <div>
              <p className="font-semibold text-amber-400 mb-1">Em Desenvolvimento</p>
              <ul className="space-y-0.5 text-sm">
                <li><span className="font-semibold text-amber-400">DOCUMENT</span> — Upload/exclusão de docs</li>
                <li><span className="font-semibold text-amber-400">TAG</span> — Criação/edição de tags</li>
                <li>Indicadores econômicos, Podcasts, Mídia</li>
                <li>Configurações regionais, Cache de imagens</li>
              </ul>
            </div>
            
            <p className="text-xs text-muted-foreground/80">
              Cada registro inclui: Data/hora, Usuário, Categoria, Ação e Detalhes técnicos (JSON).
            </p>
          </div>
        }
      />

      {/* Metrics Dashboard */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Métricas de Atividade</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {metricsLogs?.length || 0} registros
              </Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Period filter buttons */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                <Button
                  variant={metricsPeriod === "today" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMetricsPeriod("today")}
                  className="h-7 text-xs"
                >
                  Hoje
                </Button>
                <Button
                  variant={metricsPeriod === "7days" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMetricsPeriod("7days")}
                  className="h-7 text-xs"
                >
                  7 dias
                </Button>
                <Button
                  variant={metricsPeriod === "30days" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMetricsPeriod("30days")}
                  className="h-7 text-xs"
                >
                  30 dias
                </Button>
              </div>

              {/* Custom date picker */}
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={metricsPeriod === "custom" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setMetricsPeriod("custom")}
                  >
                    <CalendarIcon className="w-3 h-3" />
                    {metricsPeriod === "custom" && customDateRange.from && customDateRange.to
                      ? `${format(customDateRange.from, "dd/MM")} - ${format(customDateRange.to, "dd/MM")}`
                      : "Data específica"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="end">
                  <Calendar
                    mode="range"
                    selected={{ from: customDateRange.from, to: customDateRange.to }}
                    onSelect={handleDateSelect}
                    numberOfMonths={2}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Chart view toggle */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant={chartView === "daily" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartView("daily")}
              className="gap-1"
            >
              <BarChart3 className="w-4 h-4" />
              Por Dia
            </Button>
            <Button
              variant={chartView === "users" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartView("users")}
              className="gap-1"
            >
              <Users className="w-4 h-4" />
              Usuários
            </Button>
            <Button
              variant={chartView === "categories" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartView("categories")}
              className="gap-1"
            >
              <Tags className="w-4 h-4" />
              Categorias
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-[300px] w-full">
            {chartView === "daily" && (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricsData.daily} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Atividades"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}

            {chartView === "users" && (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={metricsData.users} 
                    layout="vertical" 
                    margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                    <XAxis 
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      type="category"
                      dataKey="email"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                      width={75}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow-lg">
                              <p className="text-sm font-medium">{payload[0].payload.fullEmail}</p>
                              <p className="text-sm text-muted-foreground">{payload[0].value} atividades</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                      name="Atividades"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}

            {chartView === "categories" && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metricsData.categories}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {metricsData.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-lg">
                            <p className="text-sm font-medium">{payload[0].name}</p>
                            <p className="text-sm text-muted-foreground">{payload[0].value} atividades</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <DebouncedInput
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  delay={300}
                  className="pl-9 w-[200px]"
                />
              </div>
            </div>

            <Button variant="outline" onClick={handleExportCSV} disabled={!logs?.length}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : logs && logs.length > 0 ? (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow className="border-b-2 border-border">
                      <TableHead 
                        className="w-[150px] cursor-pointer select-none hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort("created_at")}
                      >
                        <div className="flex items-center font-bold text-foreground text-sm uppercase tracking-wide">
                          Data/Hora
                          {getSortIcon("created_at")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="w-[200px] cursor-pointer select-none hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort("user_email")}
                      >
                        <div className="flex items-center font-bold text-foreground text-sm uppercase tracking-wide">
                          Usuário
                          {getSortIcon("user_email")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="w-[120px] cursor-pointer select-none hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort("action_category")}
                      >
                        <div className="flex items-center font-bold text-foreground text-sm uppercase tracking-wide">
                          Categoria
                          {getSortIcon("action_category")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort("action")}
                      >
                        <div className="flex items-center font-bold text-foreground text-sm uppercase tracking-wide">
                          Ação
                          {getSortIcon("action")}
                        </div>
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLogs?.map((log) => (
                      <Collapsible key={log.id} asChild open={expandedRows.has(log.id)}>
                        <>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(log.id)}>
                            <TableCell className="font-mono text-xs">
                              {format(new Date(log.created_at!), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-sm truncate max-w-[200px]" title={log.user_email}>
                              {log.user_email}
                            </TableCell>
                            <TableCell>{getCategoryBadge(log.action_category)}</TableCell>
                            <TableCell className="text-sm">{log.action}</TableCell>
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedRows.has(log.id) ? 'rotate-180' : ''}`} />
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={5} className="p-4">
                                <div className="space-y-2 text-sm">
                                  {log.details && Object.keys(log.details as object).length > 0 && (
                                    <div>
                                      <span className="font-semibold text-muted-foreground">Detalhes:</span>
                                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-[200px]">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.user_agent && (
                                    <div>
                                      <span className="font-semibold text-muted-foreground">Browser: </span>
                                      <span className="text-xs text-muted-foreground">{log.user_agent}</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                Total: {logs.length} log(s) encontrado(s)
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum log encontrado para os filtros selecionados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
