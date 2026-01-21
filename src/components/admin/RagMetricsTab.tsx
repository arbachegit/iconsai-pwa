import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Database, FileText, Search, CheckCircle2, Loader2, Clock, TrendingUp, Download, FileSpreadsheet, FileJson, FileDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportData, type ExportFormat } from "@/lib/export-utils";
import { toast } from "sonner";
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
  LineChart,
  Line,
} from "recharts";

export const RagMetricsTab = () => {
  // Fetch documents metrics
  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ["rag-metrics-docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("status, target_chat, total_chunks, is_readable");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch chunks count and metrics
  const { data: chunksCount, isLoading: chunksLoading } = useQuery({
    queryKey: ["rag-metrics-chunks"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("document_chunks")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch chunk details for performance metrics
  const { data: chunkDetails } = useQuery({
    queryKey: ["rag-metrics-chunk-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_chunks")
        .select("word_count, document_id");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch temporal evolution data
  const { data: temporalData } = useQuery({
    queryKey: ["rag-metrics-temporal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("created_at, status")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      // Group by date
      const grouped = data.reduce((acc: any, doc) => {
        const date = new Date(doc.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, total: 0, completed: 0, failed: 0 };
        }
        acc[date].total++;
        if (doc.status === 'completed') acc[date].completed++;
        if (doc.status === 'failed') acc[date].failed++;
        return acc;
      }, {});
      
      return Object.values(grouped);
    },
  });

  // Fetch tag distribution data
  const { data: tagDistribution } = useQuery({
    queryKey: ["rag-metrics-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select("tag_name");
      
      if (error) throw error;
      
      // Count occurrences
      const counts = data.reduce((acc: any, tag) => {
        acc[tag.tag_name] = (acc[tag.tag_name] || 0) + 1;
        return acc;
      }, {});
      
      // Sort and get top 10
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 10);
    },
  });
  
  // Fetch RAG search analytics
  const { data: ragAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["rag-search-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rag_analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalDocs = docsData?.length || 0;
  const completedDocs = docsData?.filter(d => d.status === "completed").length || 0;
  const failedDocs = docsData?.filter(d => d.status === "failed").length || 0;
  const pendingDocs = docsData?.filter(d => d.status === "pending" || d.status === "processing").length || 0;
  const successRate = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
  const avgChunks = totalDocs > 0 ? Math.round((chunksCount || 0) / totalDocs) : 0;
  
  // Performance metrics
  const avgWordsPerChunk = chunkDetails?.length ? 
    Math.round(chunkDetails.reduce((sum, c) => sum + c.word_count, 0) / chunkDetails.length) : 0;
  const readableDocs = docsData?.filter(d => d.is_readable).length || 0;
  const readableRate = totalDocs > 0 ? Math.round((readableDocs / totalDocs) * 100) : 0;

  // Status distribution data
  const statusData = [
    { name: "Completo", value: completedDocs, color: "#10B981" },
    { name: "Falha", value: failedDocs, color: "#EF4444" },
    { name: "Processando", value: pendingDocs, color: "#F59E0B" },
  ];

  // Target chat distribution data
  const chatData = [
    { name: "Saúde", value: docsData?.filter(d => d.target_chat === "health").length || 0 },
    { name: "Estudo", value: docsData?.filter(d => d.target_chat === "study").length || 0 },
    { name: "Geral", value: docsData?.filter(d => d.target_chat === "general").length || 0 },
  ];
  
  // Calculate RAG search analytics
  const avgLatency = ragAnalytics?.length 
    ? Math.round(ragAnalytics.reduce((sum, r) => sum + r.latency_ms, 0) / ragAnalytics.length)
    : 0;
  const ragSuccessRate = ragAnalytics?.length 
    ? Math.round((ragAnalytics.filter(r => r.success_status).length / ragAnalytics.length) * 100)
    : 0;
  const avgSimilarity = ragAnalytics?.filter(r => r.top_similarity_score).length
    ? ragAnalytics
        .filter(r => r.top_similarity_score)
        .reduce((sum, r) => sum + r.top_similarity_score!, 0) / 
      ragAnalytics.filter(r => r.top_similarity_score).length
    : 0;
  const totalSearches = ragAnalytics?.length || 0;
  
  // Top queries
  const topQueries = ragAnalytics?.length 
    ? Object.entries(
        ragAnalytics.reduce((acc: Record<string, number>, r) => {
          acc[r.query] = (acc[r.query] || 0) + 1;
          return acc;
        }, {})
      )
      .map(([query, count]) => ({ 
        query: query.length > 40 ? query.slice(0, 40) + "..." : query, 
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    : [];
  
  // Latency over time (grouped by day)
  const latencyOverTime = ragAnalytics?.length
    ? Object.values(
        ragAnalytics.reduce((acc: Record<string, { date: string; total_latency: number; count: number }>, r) => {
          const date = new Date(r.created_at).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { date, total_latency: 0, count: 0 };
          }
          acc[date].total_latency += r.latency_ms;
          acc[date].count++;
          return acc;
        }, {})
      ).map((day: any) => ({
        date: day.date,
        avg_latency: Math.round(day.total_latency / day.count)
      }))
    : [];

  if (docsLoading || chunksLoading || analyticsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleExport = async (format: ExportFormat) => {
    const exportColumns = [
      { key: 'query', label: 'Query' },
      { key: 'latency_ms', label: 'Latência (ms)' },
      { key: 'success_status', label: 'Sucesso' },
      { key: 'similarity_score', label: 'Similaridade' },
      { key: 'results_count', label: 'Resultados' },
      { key: 'created_at', label: 'Data' },
    ];

    const exportableData = ragAnalytics?.map(r => ({
      query: r.query,
      latency_ms: r.latency_ms,
      success_status: r.success_status ? 'Sim' : 'Não',
      similarity_score: r.top_similarity_score?.toFixed(4) || 'N/A',
      results_count: r.results_count || 0,
      created_at: new Date(r.created_at).toLocaleString('pt-BR'),
    })) || [];

    try {
      await exportData({
        filename: 'rag_metrics',
        data: exportableData,
        format,
        columns: exportColumns,
      });
      toast.success(`Dados exportados em formato ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Erro ao exportar dados");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <AdminTitleWithInfo
            title="Métricas RAG"
            level="h2"
            icon={BarChart3}
            tooltipText="Estatísticas do sistema RAG"
            infoContent={
              <>
                <p>Analise o desempenho do sistema de Recuperação Aumentada por Geração.</p>
                <p className="mt-2">Visualize taxa de sucesso, distribuição de chunks, qualidade de embeddings e performance de busca.</p>
              </>
            }
          />
          <p className="text-muted-foreground">
            Estatísticas detalhadas do sistema de Recuperação Aumentada por Geração
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              <FileText className="h-4 w-4 mr-2" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('xlsx')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('json')}>
              <FileJson className="h-4 w-4 mr-2" /> JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              <FileDown className="h-4 w-4 mr-2" /> PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Documentos</p>
              <p className="text-3xl font-bold mt-1">{totalDocs}</p>
            </div>
            <Database className="h-10 w-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Chunks Totais</p>
              <p className="text-3xl font-bold mt-1">{chunksCount}</p>
              <p className="text-xs text-muted-foreground mt-1">~{avgChunks} por doc</p>
            </div>
            <FileText className="h-10 w-10 text-secondary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
              <p className="text-3xl font-bold mt-1">{successRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">{completedDocs}/{totalDocs} completos</p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-accent opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Falhas</p>
              <p className="text-3xl font-bold mt-1">{failedDocs}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalDocs > 0 ? Math.round((failedDocs / totalDocs) * 100) : 0}% dos docs
              </p>
            </div>
            <Search className="h-10 w-10 text-destructive opacity-20" />
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Métricas de Performance RAG</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Média de Chunks/Documento</p>
            <p className="text-3xl font-bold text-primary">{avgChunks}</p>
            <p className="text-xs text-muted-foreground mt-1">chunks por documento</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Média de Palavras/Chunk</p>
            <p className="text-3xl font-bold text-secondary">{avgWordsPerChunk}</p>
            <p className="text-xs text-muted-foreground mt-1">palavras por chunk</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Taxa de Legibilidade</p>
            <p className="text-3xl font-bold text-accent">{readableRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{readableDocs}/{totalDocs} legíveis</p>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temporal Evolution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Evolução Temporal de Uploads</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={temporalData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" name="Total" strokeWidth={2} />
              <Line type="monotone" dataKey="completed" stroke="#10B981" name="Completos" strokeWidth={2} />
              <Line type="monotone" dataKey="failed" stroke="#EF4444" name="Falhas" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Tag Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top 10 Tags Mais Usadas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tagDistribution || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--secondary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Status and Chat Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Status dos Documentos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 30;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text
                      x={x}
                      y={y}
                      fill="currentColor"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      className="text-xs"
                    >
                      {`${name}: ${value}`}
                    </text>
                  );
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Target Chat Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Distribuição por Chat</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chatData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Estatísticas Detalhadas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Documentos de Saúde</p>
            <p className="text-2xl font-bold text-primary">{chatData[0].value}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Documentos de Estudo</p>
            <p className="text-2xl font-bold text-secondary">{chatData[1].value}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Documentos Gerais</p>
            <p className="text-2xl font-bold text-accent">{chatData[2].value}</p>
          </div>
        </div>
      </Card>
      
      {/* RAG Search Analytics Dashboard */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          📊 Analytics de Busca RAG
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Latência Média</p>
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <p className="text-3xl font-bold text-primary">{avgLatency}ms</p>
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Taxa de Sucesso</p>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <p className="text-3xl font-bold text-green-500">{ragSuccessRate}%</p>
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Similaridade Média</p>
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <p className="text-3xl font-bold text-secondary">{(avgSimilarity * 100).toFixed(1)}%</p>
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Total de Buscas</p>
            <div className="flex items-center justify-center gap-2">
              <Search className="h-4 w-4 text-accent" />
              <p className="text-3xl font-bold text-accent">{totalSearches}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Top Queries and Latency Evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Queries */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">🔍 Top 10 Queries Mais Frequentes</h3>
          {topQueries.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topQueries} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="query" type="category" width={180} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhuma busca registrada ainda
            </div>
          )}
        </Card>

      {/* Latency Evolution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">⚡ Evolução de Latência</h3>
          {latencyOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={latencyOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="avg_latency" stroke="hsl(var(--primary))" strokeWidth={2} name="Latência Média (ms)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Dados insuficientes para análise temporal
            </div>
          )}
        </Card>
      </div>

      {/* Embedding Quality Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🔬 Análise de Qualidade de Embeddings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Chunks Válidos</p>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <p className="text-3xl font-bold text-green-500">
                {chunkDetails?.filter(c => c.word_count > 0).length || 0}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {chunkDetails?.length ? 
                Math.round((chunkDetails.filter(c => c.word_count > 0).length / chunkDetails.length) * 100) 
                : 0}% do total
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Palavras Médias/Chunk</p>
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4 text-secondary" />
              <p className="text-3xl font-bold text-secondary">{avgWordsPerChunk}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">palavras por chunk</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Chunks Problemáticos</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-3xl font-bold text-destructive">
                {chunkDetails?.filter(c => c.word_count < 50).length || 0}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">&lt; 50 palavras</p>
          </div>
        </div>

        {/* Quality Distribution */}
        {chunkDetails && chunkDetails.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Distribuição de Qualidade por Palavras</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm font-medium text-destructive mb-1">Muito Baixa (&lt;50)</p>
                <p className="text-2xl font-bold">
                  {chunkDetails.filter(c => c.word_count < 50).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((chunkDetails.filter(c => c.word_count < 50).length / chunkDetails.length) * 100)}%
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm font-medium text-yellow-600 mb-1">Baixa (50-200)</p>
                <p className="text-2xl font-bold">
                  {chunkDetails.filter(c => c.word_count >= 50 && c.word_count < 200).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((chunkDetails.filter(c => c.word_count >= 50 && c.word_count < 200).length / chunkDetails.length) * 100)}%
                </p>
              </div>
              <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-lg">
                <p className="text-sm font-medium text-secondary mb-1">Boa (200-800)</p>
                <p className="text-2xl font-bold">
                  {chunkDetails.filter(c => c.word_count >= 200 && c.word_count < 800).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((chunkDetails.filter(c => c.word_count >= 200 && c.word_count < 800).length / chunkDetails.length) * 100)}%
                </p>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm font-medium text-green-600 mb-1">Excelente (800+)</p>
                <p className="text-2xl font-bold">
                  {chunkDetails.filter(c => c.word_count >= 800).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((chunkDetails.filter(c => c.word_count >= 800).length / chunkDetails.length) * 100)}%
                </p>
              </div>
            </div>

            {/* Alerts for problematic chunks */}
            {chunkDetails.filter(c => c.word_count < 50).length > 0 && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="font-semibold text-sm text-destructive mb-2">⚠️ Alerta de Qualidade</p>
                <p className="text-sm text-muted-foreground">
                  {chunkDetails.filter(c => c.word_count < 50).length} chunks com menos de 50 palavras 
                  podem impactar a qualidade das respostas. Considere revisar os documentos originais.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default RagMetricsTab;
