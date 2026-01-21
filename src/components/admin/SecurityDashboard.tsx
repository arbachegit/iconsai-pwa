import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  Shield, 
  Ban, 
  AlertTriangle, 
  MapPin, 
  Monitor, 
  Globe, 
  Clock,
  Mail,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Unlock,
  Loader2
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface AuditLog {
  id: string;
  incident_type: string;
  severity: string;
  device_fingerprint: string;
  ip_address: string;
  user_email: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  screen_resolution: string | null;
  geo_country: string | null;
  geo_city: string | null;
  geo_lat: number | null;
  geo_lon: number | null;
  geo_isp: string | null;
  action_taken: string;
  was_whitelisted: boolean;
  ban_applied: boolean;
  email_sent: boolean;
  whatsapp_sent: boolean;
  page_url: string | null;
  occurred_at: string;
  violation_details?: Record<string, unknown>; // ✅ BUG FIX: Adicionado para mostrar detalhes
}

const COLORS = ['#e94560', '#0f3460', '#16213e', '#1a1a2e', '#533483', '#f39c12'];

export function SecurityDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  // ✅ NOVO: Estado para rastrear dispositivos desbanidos nesta sessão
  const [unbannedDevices, setUnbannedDevices] = useState<Set<string>>(new Set());
  const [unbanningDevice, setUnbanningDevice] = useState<string | null>(null);

  // Fetch audit logs
  const { data: auditLogs, isLoading: logsLoading, refetch } = useQuery({
    queryKey: ["security-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_audit_log")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // ✅ NOVO: Fetch dispositivos atualmente banidos
  const { data: currentlyBannedDevices } = useQuery({
    queryKey: ["currently-banned-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banned_devices")
        .select("device_fingerprint")
        .eq("is_active", true);
      
      if (error) throw error;
      return new Set(data?.map(d => d.device_fingerprint) || []);
    },
  });

  // Calculate metrics
  const metrics = {
    totalViolations: auditLogs?.length || 0,
    bans: auditLogs?.filter(l => l.ban_applied).length || 0,
    whitelisted: auditLogs?.filter(l => l.was_whitelisted).length || 0,
    uniqueIPs: new Set(auditLogs?.map(l => l.ip_address).filter(Boolean)).size,
    uniqueUsers: new Set(auditLogs?.map(l => l.user_email).filter(Boolean)).size,
    emailsSent: auditLogs?.filter(l => l.email_sent).length || 0,
    whatsappSent: auditLogs?.filter(l => l.whatsapp_sent).length || 0,
  };

  // Prepare chart data
  const violationTypes = auditLogs?.reduce((acc, log) => {
    acc[log.incident_type] = (acc[log.incident_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const pieData = Object.entries(violationTypes).map(([name, value]) => ({
    name,
    value,
  }));

  const browserData = auditLogs?.reduce((acc, log) => {
    if (log.browser_name) {
      acc[log.browser_name] = (acc[log.browser_name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const barData = Object.entries(browserData)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Timeline data (last 7 days)
  const timelineData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const count = auditLogs?.filter(l => 
      l.occurred_at.startsWith(dateStr)
    ).length || 0;
    return {
      date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
      count,
    };
  });

  // Top countries
  const countryData = auditLogs?.reduce((acc, log) => {
    if (log.geo_country) {
      acc[log.geo_country] = (acc[log.geo_country] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const topCountries = Object.entries(countryData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Filter logs
  const filteredLogs = auditLogs?.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.incident_type.toLowerCase().includes(term) ||
      log.ip_address?.toLowerCase().includes(term) ||
      log.user_email?.toLowerCase().includes(term) ||
      log.geo_city?.toLowerCase().includes(term) ||
      log.geo_country?.toLowerCase().includes(term)
    );
  });

  if (logsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Security Dashboard v3</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <AlertTriangle className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
              <div className="text-2xl font-bold">{metrics.totalViolations}</div>
              <div className="text-xs text-muted-foreground">Violações</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Ban className="h-6 w-6 mx-auto text-red-500 mb-2" />
              <div className="text-2xl font-bold">{metrics.bans}</div>
              <div className="text-xs text-muted-foreground">Banimentos</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold">{metrics.whitelisted}</div>
              <div className="text-xs text-muted-foreground">Whitelisted</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Globe className="h-6 w-6 mx-auto text-blue-500 mb-2" />
              <div className="text-2xl font-bold">{metrics.uniqueIPs}</div>
              <div className="text-xs text-muted-foreground">IPs Únicos</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Monitor className="h-6 w-6 mx-auto text-purple-500 mb-2" />
              <div className="text-2xl font-bold">{metrics.uniqueUsers}</div>
              <div className="text-xs text-muted-foreground">Usuários</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Mail className="h-6 w-6 mx-auto text-orange-500 mb-2" />
              <div className="text-2xl font-bold">{metrics.emailsSent}</div>
              <div className="text-xs text-muted-foreground">Emails</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <MessageSquare className="h-6 w-6 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold">{metrics.whatsappSent}</div>
              <div className="text-xs text-muted-foreground">WhatsApp</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Violation Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tipos de Violação</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Browser Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Navegadores</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={60} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#e94560" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineData}>
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#e94560" 
                  fill="#e94560" 
                  fillOpacity={0.3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Countries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top Países/Regiões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {topCountries.map(([country, count]) => (
              <Badge key={country} variant="secondary">
                {country}: {count}
              </Badge>
            ))}
            {topCountries.length === 0 && (
              <span className="text-muted-foreground text-sm">Sem dados de geolocalização</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Logs de Auditoria</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredLogs?.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const hasViolationDetails = log.violation_details && Object.keys(log.violation_details).length > 0;
                
                const handleUnban = async () => {
                  // Prevenir duplo clique
                  if (unbanningDevice === log.device_fingerprint) return;
                  
                  setUnbanningDevice(log.device_fingerprint);
                  
                  try {
                    // Usar edge function para remover banimento (bypassa RLS)
                    const { data, error } = await supabase.functions.invoke('unban-device', {
                      body: { 
                        deviceFingerprint: log.device_fingerprint,
                        reason: 'Removido manualmente pelo administrador via Dashboard'
                      }
                    });
                    
                    if (error) throw error;
                    if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');
                    
                    // ✅ Marcar como desbanido localmente
                    setUnbannedDevices(prev => new Set(prev).add(log.device_fingerprint));
                    
                    toast.success('Banimento removido com sucesso!', {
                      description: `Dispositivo ${log.device_fingerprint.substring(0, 12)}... foi liberado.`
                    });
                    
                    // Atualizar dados após pequeno delay
                    setTimeout(() => refetch(), 500);
                    
                  } catch (error) {
                    console.error('Erro ao remover banimento:', error);
                    toast.error('Erro ao remover banimento', {
                      description: error instanceof Error ? error.message : 'Tente novamente ou verifique os logs.'
                    });
                  } finally {
                    setUnbanningDevice(null);
                  }
                };
                
                return (
                  <Collapsible 
                    key={log.id} 
                    open={isExpanded}
                    onOpenChange={(open) => {
                      setExpandedLogs(prev => {
                        const newSet = new Set(prev);
                        if (open) {
                          newSet.add(log.id);
                        } else {
                          newSet.delete(log.id);
                        }
                        return newSet;
                      });
                    }}
                  >
                    <div
                      className={`p-3 rounded-lg border ${
                        log.was_whitelisted 
                          ? 'border-green-500/30 bg-green-500/5' 
                          : 'border-red-500/30 bg-red-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant={log.severity === 'critical' ? 'destructive' : 'secondary'}
                            >
                              {log.incident_type}
                            </Badge>
                            <Badge variant="outline">
                              {log.action_taken}
                            </Badge>
                            {log.was_whitelisted && (
                              <Badge className="bg-green-500">Whitelisted</Badge>
                            )}
                            {log.email_sent && (
                              <Mail className="h-3 w-3 text-orange-500" />
                            )}
                            {log.whatsapp_sent && (
                              <MessageSquare className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(log.occurred_at).toLocaleString("pt-BR")}
                            </span>
                            
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {log.ip_address || 'N/A'}
                            </span>
                            
                            {log.geo_city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {log.geo_city}, {log.geo_country}
                                {log.geo_lat && log.geo_lon && (
                                  <a
                                    href={`https://www.google.com/maps?q=${log.geo_lat},${log.geo_lon}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </span>
                            )}
                            
                            {log.browser_name && (
                              <span className="flex items-center gap-1">
                                <Monitor className="h-3 w-3" />
                                {log.browser_name} {log.browser_version} / {log.os_name} {log.os_version}
                              </span>
                            )}
                          </div>
                          
                          {log.user_email && (
                            <div className="text-xs text-muted-foreground">
                              👤 {log.user_email}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {(hasViolationDetails || log.ban_applied) && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          )}
                          <div className="text-right text-xs text-muted-foreground">
                            <div className="font-mono">{log.device_fingerprint?.substring(0, 12)}...</div>
                          </div>
                        </div>
                      </div>
                      
                      <CollapsibleContent className="mt-3 pt-3 border-t border-border/50">
                        <div className="space-y-3">
                          {/* Detalhes da Violação */}
                          {hasViolationDetails && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-muted-foreground">Detalhes da Detecção</h4>
                              <div className="bg-muted/30 rounded p-2 text-xs font-mono overflow-x-auto">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(log.violation_details, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          {/* Botão para Desbanir - com estado visual */}
                          {log.ban_applied && !log.was_whitelisted && (
                            <div className="flex items-center gap-2">
                              {unbannedDevices.has(log.device_fingerprint) || 
                               !currentlyBannedDevices?.has(log.device_fingerprint) ? (
                                // ✅ ESTADO: Já desbanido
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    {unbannedDevices.has(log.device_fingerprint) ? 'Banimento Removido' : 'Já desbanido'}
                                  </span>
                                </div>
                              ) : (
                                // Botão para desbanir
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={handleUnban}
                                  disabled={unbanningDevice === log.device_fingerprint}
                                  className="text-green-600 border-green-600 hover:bg-green-600/10 disabled:opacity-50"
                                >
                                  {unbanningDevice === log.device_fingerprint ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Removendo...
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="h-3 w-3 mr-1" />
                                      Remover Banimento
                                    </>
                                  )}
                                </Button>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Fingerprint: {log.device_fingerprint.substring(0, 16)}...
                              </span>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
              
              {filteredLogs?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum log encontrado
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
