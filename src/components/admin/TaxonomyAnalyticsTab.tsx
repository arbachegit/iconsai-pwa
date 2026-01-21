import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  Tag,
  Target,
  RefreshCw,
  Loader2,
  Award,
  Activity,
} from 'lucide-react';

const COLORS = ['#06b6d4', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#10b981'];

interface TimeseriesData {
  metric_date: string;
  coverage_percentage: number;
  total_documents: number;
  documents_with_taxonomy: number;
  classifications_total: number;
  avg_confidence: number;
  date?: string;
}

interface DomainData {
  domain: string;
  taxonomy_count: number;
  document_count: number;
  avg_confidence: number;
}

interface SourceData {
  source: string;
  classification_count: number;
  avg_confidence: number;
  percentage: number;
}

export function TaxonomyAnalyticsTab() {
  const [period, setPeriod] = useState('30');

  // Fetch timeseries data
  const { data: timeseries, isLoading: timeseriesLoading, refetch: refetchTimeseries } = useQuery({
    queryKey: ['taxonomy-timeseries', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_taxonomy_metrics_timeseries', {
        p_days: parseInt(period)
      });
      if (error) throw error;
      return ((data as TimeseriesData[]) || []).map(d => ({
        ...d,
        date: new Date(d.metric_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      }));
    },
  });

  // Fetch domain distribution
  const { data: domains, isLoading: domainsLoading } = useQuery({
    queryKey: ['taxonomy-domains'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_taxonomy_distribution_by_domain');
      if (error) throw error;
      return data as DomainData[];
    },
  });

  // Fetch source stats
  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['taxonomy-sources'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_classification_sources_stats');
      if (error) throw error;
      return data as SourceData[];
    },
  });

  // Fetch top taxonomies
  const { data: topTaxonomies } = useQuery({
    queryKey: ['top-taxonomies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_taxonomy')
        .select(`
          id, code, name,
          entity_tags (id)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || [])
        .map(t => ({
          code: t.code,
          name: t.name,
          count: (t.entity_tags as any[])?.length || 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  // Calculate KPIs from latest timeseries
  const latestMetrics = timeseries?.[timeseries.length - 1];
  const previousMetrics = timeseries?.[timeseries.length - 8]; // ~1 week ago
  
  const coverageTrend = latestMetrics && previousMetrics
    ? Number(latestMetrics.coverage_percentage) - Number(previousMetrics.coverage_percentage)
    : 0;

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'ai_auto': 'IA Automático',
      'ai_suggested': 'IA Sugerido',
      'admin': 'Admin Manual',
      'manual': 'Manual',
      'auto': 'Auto',
      'inherited': 'Herdado',
    };
    return labels[source] || source;
  };

  const isLoading = timeseriesLoading || domainsLoading || sourcesLoading;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Analytics de Taxonomia</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Métricas e tendências do sistema de classificação
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetchTimeseries()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cobertura</p>
                <p className="text-3xl font-bold text-foreground">
                  {latestMetrics?.coverage_percentage?.toFixed(1) || 0}%
                </p>
              </div>
              <Target className="h-8 w-8 text-primary/40" />
            </div>
            <p className={`text-sm mt-2 flex items-center gap-1 ${coverageTrend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {coverageTrend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(coverageTrend).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documentos</p>
                <p className="text-3xl font-bold text-foreground">
                  {latestMetrics?.documents_with_taxonomy || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-primary/40" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              de {latestMetrics?.total_documents || 0} total
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxonomias Ativas</p>
                <p className="text-3xl font-bold text-foreground">
                  {domains?.reduce((acc, d) => acc + Number(d.taxonomy_count), 0) || 0}
                </p>
              </div>
              <Tag className="h-8 w-8 text-primary/40" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {domains?.length || 0} domínios
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confiança Média</p>
                <p className="text-3xl font-bold text-foreground">
                  {((sources?.reduce((acc, s) => acc + (Number(s.avg_confidence) || 0) * Number(s.classification_count), 0) || 0) /
                    Math.max(sources?.reduce((acc, s) => acc + Number(s.classification_count), 0) || 1, 1) * 100).toFixed(0)}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage Trend */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução da Cobertura
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeseries}>
                  <defs>
                    <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Cobertura']}
                  />
                  <Area
                    type="monotone"
                    dataKey="coverage_percentage"
                    stroke="hsl(var(--primary))"
                    fill="url(#coverageGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sources Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Fontes de Classificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourcesLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={sources}
                      dataKey="classification_count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                    >
                      {sources?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => [value, getSourceLabel(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {sources?.map((source, index) => (
                    <div key={source.source} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-muted-foreground flex-1">{getSourceLabel(source.source)}</span>
                      <Badge variant="secondary">
                        {source.percentage?.toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Domain Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Distribuição por Domínio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {domainsLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={domains} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="domain" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="document_count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Taxonomies */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Top 10 Taxonomias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topTaxonomies?.map((tax, index) => (
                <div key={tax.code} className="flex items-center gap-3">
                  <span className="text-muted-foreground w-6">{index + 1}.</span>
                  <Badge variant="outline" className="font-mono">
                    {tax.code}
                  </Badge>
                  <span className="text-sm flex-1 truncate">{tax.name}</span>
                  <Badge variant="secondary">
                    {tax.count} docs
                  </Badge>
                </div>
              ))}
              {(!topTaxonomies || topTaxonomies.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma taxonomia com documentos ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TaxonomyAnalyticsTab;
