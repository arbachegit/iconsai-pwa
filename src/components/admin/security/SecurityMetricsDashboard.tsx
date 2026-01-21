import { useMemo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  AlertTriangle, 
  Shield, 
  Clock,
  Bell,
  MapPin,
  Activity
} from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  incident_type: string;
  severity: string;
  action_taken: string | null;
  geo_country: string | null;
  geo_city: string | null;
  geo_lat: number | null;
  geo_lon: number | null;
  created_at: string;
}

interface TrendData {
  date: string;
  total: number;
  banned: number;
  allowed: number;
}

interface CountryData {
  country: string;
  count: number;
  percentage: number;
}

interface IncidentTypeData {
  type: string;
  count: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(142, 76%, 36%)', 'hsl(48, 96%, 53%)', 'hsl(221, 83%, 53%)', 'hsl(280, 100%, 65%)'];

export function SecurityMetricsDashboard() {
  const [realtimeAlerts, setRealtimeAlerts] = useState<AuditLog[]>([]);

  // Fetch last 30 days of audit logs for trend analysis
  const { data: trendLogs = [] } = useQuery({
    queryKey: ["security-trend-logs"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("security_audit_log")
        .select("id, incident_type, severity, action_taken, geo_country, geo_city, geo_lat, geo_lon, created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return (data || []) as AuditLog[];
    },
    refetchInterval: 60000,
  });

  // Set up real-time subscription for new alerts
  useEffect(() => {
    const channel = supabase
      .channel('security-realtime-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_audit_log'
        },
        (payload) => {
          const newLog = payload.new as AuditLog;
          setRealtimeAlerts(prev => [newLog, ...prev].slice(0, 10));
          
          // Show toast notification for critical alerts
          if (newLog.severity === 'critical') {
            toast.error(`🚨 Alerta Crítico: ${newLog.incident_type}`, {
              description: `IP: ${newLog.geo_city || 'Desconhecido'}, ${newLog.geo_country || 'N/A'}`,
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate trend data (daily aggregation)
  const trendData: TrendData[] = useMemo(() => {
    const last14Days = eachDayOfInterval({
      start: subDays(new Date(), 13),
      end: new Date()
    });

    return last14Days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayLogs = trendLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= dayStart && logDate < dayEnd;
      });

      return {
        date: format(day, "dd/MM", { locale: ptBR }),
        total: dayLogs.length,
        banned: dayLogs.filter(l => l.action_taken === 'banned').length,
        allowed: dayLogs.filter(l => l.action_taken === 'allowed').length,
      };
    });
  }, [trendLogs]);

  // Calculate country distribution
  const countryData: CountryData[] = useMemo(() => {
    const countryCounts: Record<string, number> = {};
    trendLogs.forEach(log => {
      if (log.geo_country) {
        countryCounts[log.geo_country] = (countryCounts[log.geo_country] || 0) + 1;
      }
    });

    const total = Object.values(countryCounts).reduce((a, b) => a + b, 0);
    return Object.entries(countryCounts)
      .map(([country, count]) => ({
        country,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [trendLogs]);

  // Calculate incident type distribution
  const incidentTypeData: IncidentTypeData[] = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    trendLogs.forEach(log => {
      typeCounts[log.incident_type] = (typeCounts[log.incident_type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [trendLogs]);

  // Calculate severity breakdown for pie chart
  const severityData = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0 };
    trendLogs.forEach(log => {
      if (log.severity in counts) {
        counts[log.severity as keyof typeof counts]++;
      }
    });
    return [
      { name: 'Crítico', value: counts.critical, color: 'hsl(var(--destructive))' },
      { name: 'Aviso', value: counts.warning, color: 'hsl(48, 96%, 53%)' },
      { name: 'Info', value: counts.info, color: 'hsl(221, 83%, 53%)' },
    ].filter(d => d.value > 0);
  }, [trendLogs]);

  // Calculate trend percentage change
  const trendChange = useMemo(() => {
    if (trendData.length < 14) return 0;
    const firstWeek = trendData.slice(0, 7).reduce((sum, d) => sum + d.total, 0);
    const secondWeek = trendData.slice(7).reduce((sum, d) => sum + d.total, 0);
    if (firstWeek === 0) return secondWeek > 0 ? 100 : 0;
    return Math.round(((secondWeek - firstWeek) / firstWeek) * 100);
  }, [trendData]);

  return (
    <div className="space-y-6">
      {/* Real-time Alerts Section */}
      {realtimeAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <Bell className="h-5 w-5 animate-pulse" />
              Alertas em Tempo Real
              <Badge variant="destructive" className="ml-2">{realtimeAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[120px]">
              <div className="space-y-2">
                {realtimeAlerts.map((alert, idx) => (
                  <div 
                    key={alert.id || idx}
                    className="flex items-center justify-between p-2 bg-background/80 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`h-4 w-4 ${alert.severity === 'critical' ? 'text-destructive' : 'text-yellow-500'}`} />
                      <span className="font-medium">{alert.incident_type}</span>
                      {alert.geo_city && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {alert.geo_city}, {alert.geo_country}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(alert.created_at), "HH:mm:ss")}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Tendência de Incidentes (14 dias)
              </CardTitle>
              <CardDescription>Visualização de incidentes ao longo do tempo</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {trendChange > 0 ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{trendChange}%
                </Badge>
              ) : trendChange < 0 ? (
                <Badge variant="outline" className="flex items-center gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                  <TrendingDown className="h-3 w-3" />
                  {trendChange}%
                </Badge>
              ) : (
                <Badge variant="outline">Estável</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBanned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="total" 
                name="Total"
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
              <Area 
                type="monotone" 
                dataKey="banned" 
                name="Banidos"
                stroke="hsl(var(--destructive))" 
                fillOpacity={1} 
                fill="url(#colorBanned)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribution Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Severity Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Severidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Incident Types Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Tipos de Incidente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incidentTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis 
                  dataKey="type" 
                  type="category" 
                  width={100}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Country Heatmap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Origem por País
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {countryData.length > 0 ? (
                  countryData.map((country, idx) => (
                    <div key={country.country} className="flex items-center gap-3">
                      <div 
                        className="w-full bg-muted rounded-full h-6 relative overflow-hidden"
                      >
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${country.percentage}%`,
                            backgroundColor: COLORS[idx % COLORS.length]
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-2">
                          <span className="text-xs font-medium truncate">{country.country}</span>
                          <span className="text-xs font-bold">{country.count}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">Sem dados de localização</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{trendLogs.length}</p>
              <p className="text-sm text-muted-foreground">Incidentes (30 dias)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">
                {trendLogs.filter(l => l.action_taken === 'banned').length}
              </p>
              <p className="text-sm text-muted-foreground">Dispositivos Banidos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {trendLogs.filter(l => l.action_taken === 'allowed').length}
              </p>
              <p className="text-sm text-muted-foreground">Permitidos (Whitelist)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">
                {new Set(trendLogs.map(l => l.geo_country).filter(Boolean)).size}
              </p>
              <p className="text-sm text-muted-foreground">Países Detectados</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SecurityMetricsDashboard;
