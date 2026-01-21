import { useChatAnalytics } from "@/hooks/useChatAnalytics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Download, Loader2, MessageSquare, Clock, Smile, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";

export const AnalyticsTab = () => {
  const { analytics, isLoading } = useChatAnalytics();
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Fetch conversation data for analysis - use chat_sessions instead of conversation_history
  const { data: sessions } = useQuery({
    queryKey: ["chat-sessions-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("id, started_at, ended_at, metadata")
        .order("started_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Fetch message count separately
  const { data: messageCount } = useQuery({
    queryKey: ["messages-count-analytics"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Calculate summary stats - current week
  const today = startOfDay(new Date());
  const todaySessions = sessions?.filter(
    (s) => new Date(s.started_at || '') >= today
  ).length || 0;
  
  const totalMessages = messageCount || 0;

  // Calculate previous week stats for comparison
  const currentWeekStart = subDays(new Date(), 7);
  const previousWeekStart = subDays(new Date(), 14);
  
  const currentWeekSessions = sessions?.filter(
    (s) => new Date(s.started_at || '') >= currentWeekStart
  ).length || 0;
  
  const previousWeekSessions = sessions?.filter((s) => {
    const date = new Date(s.started_at || '');
    return date >= previousWeekStart && date < currentWeekStart;
  }).length || 0;

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const sessionsGrowth = calculateGrowth(currentWeekSessions, previousWeekSessions);

  // Peak hours analysis
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const count = sessions?.filter((s) => {
      const createdHour = new Date(s.started_at || '').getHours();
      return createdHour === hour;
    }).length || 0;
    return {
      hour: `${hour}h`,
      conversas: count,
    };
  }) || [];

  const peakHour = hourlyData.reduce((max, curr) => 
    curr.conversas > max.conversas ? curr : max
  , { hour: "0h", conversas: 0 });

  // Simple sentiment data (placeholder - would need actual sentiment analysis)
  const sentimentData = [
    { name: "Positivo", value: 60, color: "#22c55e" },
    { name: "Neutro", value: 30, color: "#eab308" },
    { name: "Negativo", value: 10, color: "#ef4444" },
  ];

  const totalSentiment = sentimentData.reduce((sum, s) => sum + s.value, 0);
  const positivePercent = totalSentiment > 0 
    ? Math.round((sentimentData[0].value / totalSentiment) * 100)
    : 0;

  // Process data for trend charts
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "dd/MM", { locale: ptBR });
    
    const dayAnalytics = analytics?.filter((a) => {
      const analyticsDate = new Date(a.started_at);
      return analyticsDate.toDateString() === date.toDateString();
    });

    return {
      date: dateStr,
      conversas: dayAnalytics?.length || 0,
      mensagens: dayAnalytics?.reduce((sum, a) => sum + a.message_count, 0) || 0,
      audios: dayAnalytics?.reduce((sum, a) => sum + a.audio_plays, 0) || 0,
    };
  });

  // Top topics
  const topicsCount = analytics?.reduce((acc: Record<string, number>, curr) => {
    curr.topics?.forEach((topic: string) => {
      acc[topic] = (acc[topic] || 0) + 1;
    });
    return acc;
  }, {});

  const topicsData = Object.entries(topicsCount || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  const exportToPDF = async () => {
    if (!dashboardRef.current) return;
    
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.setFontSize(20);
      pdf.text("KnowYOU - Relatório de Analytics", 20, 20);
      pdf.setFontSize(12);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 20, 30);
      
      pdf.addImage(imgData, "PNG", 10, 40, pdfWidth - 20, pdfHeight);
      
      pdf.save(`knowyou-analytics-${Date.now()}.pdf`);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={exportToPDF} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar PDF
        </Button>
      </div>

      <div ref={dashboardRef} className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sessões Hoje</p>
                  <p className="text-2xl font-bold">{todaySessions}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {sessionsGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                    <span className={`text-xs ${sessionsGrowth >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {sessionsGrowth.toFixed(1)}% vs. semana anterior
                    </span>
                  </div>
                </div>
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Mensagens</p>
                  <p className="text-2xl font-bold">{totalMessages.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Horário de Pico</p>
                  <p className="text-2xl font-bold">{peakHour.hour}</p>
                </div>
                <Clock className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Satisfação</p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    {positivePercent}%
                    <Smile className="w-6 h-6 text-green-500" />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversations Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Conversas nos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="conversas" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Horários de Pico (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="conversas" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sentiment and Topics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Sentimento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Tópicos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topicsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="topic" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
