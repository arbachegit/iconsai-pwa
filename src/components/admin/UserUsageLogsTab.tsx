import { useState, useMemo, useCallback } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Users, Download, Search, ChevronDown, MessageSquare, Volume2, 
  GraduationCap, Heart, Clock, ArrowUpDown, ArrowUp, ArrowDown,
  Crown, BarChart3, CalendarIcon
} from "lucide-react";
import { format, subDays, subHours, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { exportData } from "@/lib/export-utils";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from "recharts";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "all", label: "Todo o período" },
];

const CHART_PERIOD_OPTIONS = [
  { value: "today", label: "Hoje (por hora)" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "custom", label: "Data específica" },
];

const CHAT_TYPE_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  study: { color: "bg-blue-500", icon: GraduationCap, label: "Estudo" },
  health: { color: "bg-emerald-500", icon: Heart, label: "KnowYOU" },
};

type SortField = "started_at" | "user_name" | "chat_type" | "message_count" | "audio_plays";
type SortDirection = "asc" | "desc";

export const UserUsageLogsTab = () => {
  const [chatFilter, setChatFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("7days");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("started_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [chartPeriod, setChartPeriod] = useState<string>("today");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const getDateFilter = () => {
    switch (periodFilter) {
      case "today":
        return subHours(new Date(), 24).toISOString();
      case "7days":
        return subDays(new Date(), 7).toISOString();
      case "30days":
        return subDays(new Date(), 30).toISOString();
      default:
        return null;
    }
  };

  // Fetch admin users
  const { data: adminUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "superadmin"]);
      if (error) throw error;
      return data?.map(r => r.user_id) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch chat analytics with conversation history
  const { data: usageLogs, isLoading } = useQuery({
    queryKey: ["user-usage-logs", chatFilter, periodFilter, searchQuery],
    queryFn: async () => {
      let analyticsQuery = supabase
        .from("chat_analytics")
        .select("*")
        .order("started_at", { ascending: false });

      const dateFilter = getDateFilter();
      if (dateFilter) {
        analyticsQuery = analyticsQuery.gte("started_at", dateFilter);
      }

      if (searchQuery) {
        analyticsQuery = analyticsQuery.ilike("user_name", `%${searchQuery}%`);
      }

      const { data: analytics, error: analyticsError } = await analyticsQuery;
      if (analyticsError) throw analyticsError;

      let conversationsQuery = supabase
        .from("conversation_history")
        .select("session_id, chat_type, messages, title, created_at")
        .order("created_at", { ascending: false });

      if (chatFilter !== "all") {
        conversationsQuery = conversationsQuery.eq("chat_type", chatFilter);
      }

      if (dateFilter) {
        conversationsQuery = conversationsQuery.gte("created_at", dateFilter);
      }

      const { data: conversations, error: convError } = await conversationsQuery;
      if (convError) throw convError;

      const conversationsMap = new Map(
        conversations?.map((c) => [c.session_id, c]) || []
      );

      const enrichedData = (analytics || []).map((a) => {
        const conv = conversationsMap.get(a.session_id);
        return {
          ...a,
          chat_type: conv?.chat_type || "unknown",
          messages: conv?.messages || [],
          conversation_title: conv?.title || "",
          first_message: Array.isArray(conv?.messages) && conv.messages.length > 0
            ? (conv.messages[0] as any)?.content?.substring(0, 100) || ""
            : "",
        };
      });

      if (chatFilter !== "all") {
        return enrichedData.filter((d) => d.chat_type === chatFilter);
      }

      return enrichedData;
    },
    staleTime: 30 * 1000,
  });

  // Sorted logs
  const sortedLogs = useMemo(() => {
    if (!usageLogs) return [];
    
    return [...usageLogs].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "started_at":
          comparison = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
          break;
        case "user_name":
          comparison = (a.user_name || "").localeCompare(b.user_name || "");
          break;
        case "chat_type":
          comparison = (a.chat_type || "").localeCompare(b.chat_type || "");
          break;
        case "message_count":
          comparison = (a.message_count || 0) - (b.message_count || 0);
          break;
        case "audio_plays":
          comparison = (a.audio_plays || 0) - (b.audio_plays || 0);
          break;
      }
      
      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [usageLogs, sortField, sortDirection]);

  // Activity intensity data for chart
  const activityChartData = useMemo(() => {
    if (!usageLogs?.length) return [];

    const filterDate = chartPeriod === "custom" && customDate 
      ? customDate 
      : chartPeriod === "today" 
        ? new Date() 
        : null;

    if (chartPeriod === "today" || (chartPeriod === "custom" && customDate)) {
      // Group by hour
      const hourlyData: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourlyData[i] = 0;

      const targetDay = filterDate ? startOfDay(filterDate) : startOfDay(new Date());
      const targetDayEnd = endOfDay(filterDate || new Date());

      usageLogs.forEach(log => {
        const logDate = new Date(log.started_at);
        if (logDate >= targetDay && logDate <= targetDayEnd) {
          const hour = logDate.getHours();
          hourlyData[hour] += (log.message_count || 0) + (log.audio_plays || 0) + 1;
        }
      });

      return Object.entries(hourlyData).map(([hour, count]) => ({
        label: `${hour.padStart(2, '0')}h`,
        value: count,
        hour: parseInt(hour),
      }));
    } else if (chartPeriod === "30days") {
      // Group by day
      const dailyData: Record<string, number> = {};
      const today = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        dailyData[format(date, "dd/MM")] = 0;
      }

      const thirtyDaysAgo = subDays(today, 30);

      usageLogs.forEach(log => {
        const logDate = new Date(log.started_at);
        if (logDate >= thirtyDaysAgo) {
          const key = format(logDate, "dd/MM");
          if (dailyData[key] !== undefined) {
            dailyData[key] += (log.message_count || 0) + (log.audio_plays || 0) + 1;
          }
        }
      });

      return Object.entries(dailyData).map(([label, value]) => ({
        label,
        value,
      }));
    }

    return [];
  }, [usageLogs, chartPeriod, customDate]);

  const maxActivityValue = useMemo(() => {
    return Math.max(...activityChartData.map(d => d.value), 1);
  }, [activityChartData]);

  const peakActivity = useMemo(() => {
    if (!activityChartData.length) return null;
    const peak = activityChartData.reduce((max, curr) => curr.value > max.value ? curr : max);
    return peak.value > 0 ? peak : null;
  }, [activityChartData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-3 h-3 ml-1" /> 
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExportCSV = () => {
    if (!sortedLogs?.length) return;

    const csvData = sortedLogs.map((log) => ({
      data_hora: format(new Date(log.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      usuario: log.user_name || "Anônimo",
      chat: log.chat_type,
      mensagens: log.message_count || 0,
      audios: log.audio_plays || 0,
      topicos: (log.topics || []).join(", "),
      ultima_interacao: log.last_interaction
        ? format(new Date(log.last_interaction), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "",
    }));

    exportData({ filename: "user-usage-logs", data: csvData, format: "csv" });
  };

  const getChatBadge = (chatType: string) => {
    const config = CHAT_TYPE_CONFIG[chatType];
    if (!config) {
      return <Badge variant="outline">{chatType}</Badge>;
    }
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const isAdmin = (userName: string | null) => {
    // Check if user name matches known admin pattern
    return userName?.toLowerCase().includes("fernando") || 
           userName?.toLowerCase().includes("admin");
  };

  const getBarColor = (value: number) => {
    const intensity = value / maxActivityValue;
    if (intensity >= 0.7) return "hsl(var(--destructive))";
    if (intensity >= 0.4) return "hsl(45, 93%, 47%)"; // amber
    return "hsl(142, 76%, 36%)"; // green
  };

  const totals = sortedLogs?.reduce(
    (acc, log) => ({
      sessions: acc.sessions + 1,
      messages: acc.messages + (log.message_count || 0),
      audios: acc.audios + (log.audio_plays || 0),
    }),
    { sessions: 0, messages: 0, audios: 0 }
  ) || { sessions: 0, messages: 0, audios: 0 };

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo
        title="Log de Uso dos Usuários"
        level="h2"
        tooltipText="Histórico de interações dos visitantes"
        infoContent={
          <div className="space-y-2 text-sm">
            <p>Visualize como os usuários estão interagindo com os chats.</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Sessões de chat iniciadas</li>
              <li>Quantidade de mensagens trocadas</li>
              <li>Reproduções de áudio</li>
              <li>Tópicos discutidos</li>
            </ul>
          </div>
        }
        icon={Users}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={chatFilter} onValueChange={setChatFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Chat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Chats</SelectItem>
            <SelectItem value="study">Estudo</SelectItem>
            <SelectItem value="health">Saúde</SelectItem>
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <DebouncedInput
            placeholder="Buscar por nome de usuário..."
            value={searchQuery}
            onChange={setSearchQuery}
            delay={300}
            className="pl-9"
          />
        </div>

        <Button variant="outline" onClick={handleExportCSV} disabled={!sortedLogs?.length}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">{totals.sessions}</div>
          <div className="text-sm text-muted-foreground">Sessões</div>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{totals.messages}</div>
          <div className="text-sm text-muted-foreground">Mensagens</div>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-500">{totals.audios}</div>
          <div className="text-sm text-muted-foreground">Áudios Reproduzidos</div>
        </div>
      </div>

      {/* Activity Intensity Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Intensidade de Atividades
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={chartPeriod} onValueChange={(v) => {
                setChartPeriod(v);
                if (v !== "custom") setCustomDate(undefined);
              }}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {chartPeriod === "custom" && (
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {customDate ? format(customDate, "dd/MM/yyyy") : "Escolher data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={(date) => {
                        setCustomDate(date);
                        setCalendarOpen(false);
                      }}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activityChartData.length > 0 ? (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10 }} 
                      className="fill-muted-foreground"
                      interval={chartPeriod === "30days" ? 2 : 1}
                    />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px"
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {activityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {peakActivity && (
                <div className="mt-2 text-sm text-center text-muted-foreground">
                  <span className="font-medium text-foreground">Pico:</span>{" "}
                  {peakActivity.label} ({peakActivity.value} atividades)
                </div>
              )}
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground">
              Nenhuma atividade no período selecionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <ScrollArea className="h-[500px] border rounded-lg">
        <div className="w-full">
          {/* Header Row - CSS Grid fixo */}
          <div className="grid grid-cols-[100px_160px_90px_60px_60px_1fr_40px] sticky top-0 bg-muted z-10 border-b">
            <div 
              className="px-2 py-3 font-bold text-foreground uppercase tracking-wide text-xs cursor-pointer hover:bg-muted-foreground/10"
              onClick={() => handleSort("started_at")}
            >
              <div className="flex items-center gap-1">
                Data/Hora {getSortIcon("started_at")}
              </div>
            </div>
            <div 
              className="px-2 py-3 font-bold text-foreground uppercase tracking-wide text-xs cursor-pointer hover:bg-muted-foreground/10"
              onClick={() => handleSort("user_name")}
            >
              <div className="flex items-center gap-1">
                Usuário {getSortIcon("user_name")}
              </div>
            </div>
            <div 
              className="px-2 py-3 font-bold text-foreground uppercase tracking-wide text-xs cursor-pointer hover:bg-muted-foreground/10"
              onClick={() => handleSort("chat_type")}
            >
              <div className="flex items-center gap-1">
                Chat {getSortIcon("chat_type")}
              </div>
            </div>
            <div 
              className="px-2 py-3 text-center font-bold text-foreground uppercase tracking-wide text-xs cursor-pointer hover:bg-muted-foreground/10"
              onClick={() => handleSort("message_count")}
            >
              <div className="flex items-center justify-center gap-1">
                Msgs {getSortIcon("message_count")}
              </div>
            </div>
            <div 
              className="px-2 py-3 text-center font-bold text-foreground uppercase tracking-wide text-xs cursor-pointer hover:bg-muted-foreground/10"
              onClick={() => handleSort("audio_plays")}
            >
              <div className="flex items-center justify-center gap-1">
                Áudios {getSortIcon("audio_plays")}
              </div>
            </div>
            <div className="px-2 py-3 font-bold text-foreground uppercase tracking-wide text-xs">
              Tópicos
            </div>
            <div className="px-2 py-3"></div>
          </div>

          {/* Data Rows - Mesmo CSS Grid */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : sortedLogs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado
            </div>
          ) : (
            sortedLogs?.map((log) => (
              <Collapsible key={log.id} open={expandedRows.has(log.id)}>
                <div
                  className="grid grid-cols-[100px_160px_90px_60px_60px_1fr_40px] border-b cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRow(log.id)}
                >
                  <div className="px-2 py-3 font-mono text-xs flex items-center">
                    {format(new Date(log.started_at), "dd/MM HH:mm", { locale: ptBR })}
                  </div>
                  <div className="px-2 py-3 flex items-center">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{log.user_name || "Anônimo"}</span>
                      {isAdmin(log.user_name) && (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/50 gap-1 shrink-0">
                          <Crown className="w-3 h-3" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="px-2 py-3 flex items-center">{getChatBadge(log.chat_type)}</div>
                  <div className="px-2 py-3 text-center flex items-center justify-center">
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="w-3 h-3 text-muted-foreground" />
                      {log.message_count || 0}
                    </div>
                  </div>
                  <div className="px-2 py-3 text-center flex items-center justify-center">
                    <div className="flex items-center justify-center gap-1">
                      <Volume2 className="w-3 h-3 text-muted-foreground" />
                      {log.audio_plays || 0}
                    </div>
                  </div>
                  <div className="px-2 py-3 flex items-center">
                    <div className="flex flex-wrap gap-1">
                      {(log.topics || []).slice(0, 3).map((topic: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {(log.topics || []).length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(log.topics || []).length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="px-2 py-3 flex items-center justify-center">
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedRows.has(log.id) ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="bg-muted/30 py-4 border-b">
                    <div className="space-y-3 px-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Última interação:{" "}
                          {log.last_interaction
                            ? format(new Date(log.last_interaction), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })
                            : "N/A"}
                        </div>
                      </div>
                      {log.first_message && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Primeira mensagem: </span>
                          <span className="italic">"{log.first_message}..."</span>
                        </div>
                      )}
                      {log.conversation_title && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Título da conversa: </span>
                          <span>{log.conversation_title}</span>
                        </div>
                      )}
                      {Array.isArray(log.messages) && log.messages.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium mb-2">
                            Mensagens ({log.messages.length}):
                          </div>
                          <ScrollArea className="h-[150px] border rounded p-2 bg-background">
                            <div className="space-y-2">
                              {log.messages.map((msg: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={`text-xs p-2 rounded ${
                                    msg.role === "user"
                                      ? "bg-primary/10 ml-4"
                                      : "bg-muted mr-4"
                                  }`}
                                >
                                  <span className="font-medium">
                                    {msg.role === "user" ? "Usuário" : "Assistente"}:
                                  </span>{" "}
                                  {msg.content?.substring(0, 200)}
                                  {msg.content?.length > 200 && "..."}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="text-sm text-muted-foreground text-center">
        Total: {totals.sessions} sessões | {totals.messages} mensagens | {totals.audios} áudios reproduzidos
      </div>
    </div>
  );
};
