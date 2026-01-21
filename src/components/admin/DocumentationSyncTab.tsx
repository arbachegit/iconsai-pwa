import React, { useState, useEffect, useMemo } from 'react';
import { formatDateTime } from '@/lib/date-utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Database, 
  Code, 
  Layout, 
  Palette,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
  Timer,
  FileText,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Settings,
  Save,
  Mail
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface SyncLog {
  id: string;
  sync_id: string;
  trigger_type: 'scheduled' | 'manual';
  triggered_by: string | null;
  status: 'running' | 'completed' | 'failed';
  current_phase: string | null;
  progress: number;
  phases_completed: string[];
  changes_detected: Record<string, any>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

interface SyncStats {
  totalSyncs: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgDuration: number;
  manualCount: number;
  scheduledCount: number;
}

interface ComponentsBreakdown {
  tables: number;
  edgeFunctions: number;
  components: number;
  icons: number;
}

const SYNC_PHASES = [
  { id: 'database', label: 'Schema do Banco', icon: Database },
  { id: 'edge_functions', label: 'Edge Functions', icon: Code },
  { id: 'frontend', label: 'Componentes', icon: Layout },
  { id: 'icons', label: 'Ícones', icon: Palette },
  { id: 'finalize', label: 'Finalização', icon: CheckCircle2 },
];

const PIE_COLORS = {
  success: 'hsl(142, 76%, 36%)',
  failed: 'hsl(0, 84%, 60%)',
  manual: 'hsl(187, 92%, 69%)',
  scheduled: 'hsl(38, 92%, 50%)'
};

export const DocumentationSyncTab: React.FC = () => {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [allLogs, setAllLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Configuration states
  const { settings, updateSettings } = useAdminSettings();
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [syncTime, setSyncTime] = useState('03:00');
  const [alertEmail, setAlertEmail] = useState('');
  
  // Sync settings from database when loaded
  useEffect(() => {
    if (settings) {
      setSyncTime(settings.doc_sync_time || '03:00');
      setAlertEmail(settings.doc_sync_alert_email || '');
    }
  }, [settings]);

  // Calculate stats from all logs
  const syncStats = useMemo<SyncStats>(() => {
    const successLogs = allLogs.filter(l => l.status === 'completed');
    const failedLogs = allLogs.filter(l => l.status === 'failed');
    const manualLogs = allLogs.filter(l => l.trigger_type === 'manual');
    const scheduledLogs = allLogs.filter(l => l.trigger_type === 'scheduled');
    
    const totalDuration = successLogs.reduce((acc, l) => acc + (l.duration_ms || 0), 0);
    
    return {
      totalSyncs: allLogs.length,
      successCount: successLogs.length,
      failedCount: failedLogs.length,
      successRate: allLogs.length > 0 ? Math.round((successLogs.length / allLogs.length) * 100) : 0,
      avgDuration: successLogs.length > 0 ? Math.round(totalDuration / successLogs.length) : 0,
      manualCount: manualLogs.length,
      scheduledCount: scheduledLogs.length
    };
  }, [allLogs]);

  // Get components breakdown from last successful sync
  const componentsBreakdown = useMemo<ComponentsBreakdown>(() => {
    const lastSuccessful = allLogs.find(l => l.status === 'completed');
    if (!lastSuccessful?.changes_detected) {
      return { tables: 0, edgeFunctions: 0, components: 0, icons: 0 };
    }
    return {
      tables: lastSuccessful.changes_detected?.database?.tables || 0,
      edgeFunctions: lastSuccessful.changes_detected?.edge_functions?.total || 0,
      components: lastSuccessful.changes_detected?.frontend?.components || 0,
      icons: lastSuccessful.changes_detected?.icons?.total || 0
    };
  }, [allLogs]);

  // Generate trend data for chart (last 30 days)
  const trendData = useMemo(() => {
    const days = 30;
    const data: { date: string; success: number; failed: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayLogs = allLogs.filter(log => {
        const logDate = new Date(log.started_at).toISOString().split('T')[0];
        return logDate === dateStr;
      });
      
      data.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        success: dayLogs.filter(l => l.status === 'completed').length,
        failed: dayLogs.filter(l => l.status === 'failed').length
      });
    }
    
    return data;
  }, [allLogs]);

  // Pie chart data
  const statusPieData = useMemo(() => [
    { name: 'Sucesso', value: syncStats.successCount, fill: PIE_COLORS.success },
    { name: 'Falha', value: syncStats.failedCount, fill: PIE_COLORS.failed }
  ], [syncStats]);

  const triggerPieData = useMemo(() => [
    { name: 'Manual', value: syncStats.manualCount, fill: PIE_COLORS.manual },
    { name: 'Agendado', value: syncStats.scheduledCount, fill: PIE_COLORS.scheduled }
  ], [syncStats]);

  // Filtered logs for display
  const filteredLogs = useMemo(() => {
    return syncLogs.filter(log => {
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (typeFilter !== 'all' && log.trigger_type !== typeFilter) return false;
      return true;
    });
  }, [syncLogs, statusFilter, typeFilter]);

  // Fetch sync logs
  const fetchSyncLogs = async () => {
    try {
      // Fetch all logs for stats
      const { data: allData, error: allError } = await supabase
        .from('documentation_sync_log')
        .select('*')
        .order('started_at', { ascending: false });

      if (allError) throw allError;
      
      setAllLogs((allData || []) as unknown as SyncLog[]);
      setSyncLogs(((allData || []) as unknown as SyncLog[]).slice(0, 20));
    } catch (error) {
      console.error('Failed to fetch sync logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncLogs();
  }, []);

  // Realtime subscription for progress updates
  useEffect(() => {
    if (!activeSyncId) return;

    const channel = supabase
      .channel('sync-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentation_sync_log',
          filter: `sync_id=eq.${activeSyncId}`,
        },
        (payload) => {
          const newData = payload.new as SyncLog;
          setCurrentProgress(newData.progress);
          setCurrentPhase(newData.current_phase);

          if (newData.status === 'completed') {
            setIsSyncing(false);
            setActiveSyncId(null);
            toast.success('Sincronização concluída com sucesso!');
            fetchSyncLogs();
          } else if (newData.status === 'failed') {
            setIsSyncing(false);
            setActiveSyncId(null);
            toast.error(`Sincronização falhou: ${newData.error_message}`);
            fetchSyncLogs();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSyncId]);

  const handleStartSync = async () => {
    setIsSyncing(true);
    setCurrentProgress(0);
    setCurrentPhase(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const response = await supabase.functions.invoke('sync-documentation', {
        body: {
          trigger: 'manual',
          triggered_by: userData.user?.email || 'admin',
        },
      });

      if (response.error) throw response.error;

      const { sync_id } = response.data;
      setActiveSyncId(sync_id);
      toast.info('Sincronização iniciada...');
    } catch (error) {
      console.error('Failed to start sync:', error);
      toast.error('Falha ao iniciar sincronização');
      setIsSyncing(false);
    }
  };

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // formatDate moved to centralized utility
  const formatLocalDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-400/40"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluído</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-400/40"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>;
      case 'running':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/40"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Em Andamento</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTriggerBadge = (triggerType: string) => {
    return triggerType === 'scheduled' ? (
      <Badge variant="outline" className="text-amber-400 border-amber-400/40">
        <Clock className="w-3 h-3 mr-1" /> Agendado
      </Badge>
    ) : (
      <Badge variant="outline" className="text-cyan-400 border-cyan-400/40">
        <RefreshCw className="w-3 h-3 mr-1" /> Manual
      </Badge>
    );
  };

  const lastSync = syncLogs.find((log) => log.status === 'completed');

  // Calculate trend (comparing last 7 days vs previous 7 days)
  const successTrend = useMemo(() => {
    const last7Days = allLogs.filter(l => {
      const logDate = new Date(l.started_at);
      const daysAgo = (Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7 && l.status === 'completed';
    }).length;
    
    const prev7Days = allLogs.filter(l => {
      const logDate = new Date(l.started_at);
      const daysAgo = (Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo > 7 && daysAgo <= 14 && l.status === 'completed';
    }).length;
    
    if (prev7Days === 0) return { direction: 'up' as const, value: 0 };
    const change = ((last7Days - prev7Days) / prev7Days) * 100;
    return { direction: change >= 0 ? 'up' as const : 'down' as const, value: Math.abs(Math.round(change)) };
  }, [allLogs]);

  const maxComponents = Math.max(componentsBreakdown.tables, componentsBreakdown.edgeFunctions, componentsBreakdown.components, componentsBreakdown.icons, 1);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-card/80 to-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Sincronização de Documentação
          </CardTitle>
          <CardDescription>
            Sincronize a documentação interna da aplicação rastreando todas as seções, Edge Functions e componentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Last Sync Info */}
          {lastSync && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Última sincronização: {formatDateTime(lastSync.started_at)}
              </span>
              <span className="flex items-center gap-1">
                <Timer className="w-4 h-4" />
                Duração: {formatDuration(lastSync.duration_ms)}
              </span>
              {getTriggerBadge(lastSync.trigger_type)}
            </div>
          )}

          {/* Sync Button */}
          <Button
            onClick={handleStartSync}
            disabled={isSyncing}
            className="w-full sm:w-auto"
            size="lg"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Agora
              </>
            )}
          </Button>

          {/* Progress Section */}
          {isSyncing && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso da Sincronização</span>
                <span className="font-medium">{currentProgress}%</span>
              </div>
              <Progress value={currentProgress} className="h-3" />
              
              {/* Phase Indicators */}
              <div className="flex justify-between gap-1 mt-4">
                {SYNC_PHASES.map((phase, index) => {
                  const PhaseIcon = phase.icon;
                  const isCompleted = SYNC_PHASES.findIndex(p => p.id === currentPhase) > index;
                  const isCurrent = phase.id === currentPhase;
                  
                  return (
                    <div
                      key={phase.id}
                      className={`flex flex-col items-center gap-1 flex-1 ${
                        isCompleted ? 'text-green-400' : isCurrent ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${
                        isCompleted ? 'bg-green-500/20' : isCurrent ? 'bg-primary/20' : 'bg-muted/50'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <PhaseIcon className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-xs text-center hidden sm:block">{phase.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card className="bg-gradient-to-br from-card/80 to-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Configurações de Gestão de Documentos
          </CardTitle>
          <CardDescription>
            Configure o horário de sincronização automática e o e-mail para receber alertas de falhas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sync Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horário de Sincronização
              </Label>
              <Input
                type="time"
                value={syncTime}
                onChange={(e) => setSyncTime(e.target.value)}
                disabled={!isEditingConfig}
                className="border-blue-400/60 focus:border-blue-500"
              />
              <p className="text-xs text-muted-foreground">
                Horário diário para sincronização automática
              </p>
            </div>
            
            {/* Alert Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-mail para Alertas
              </Label>
              <Input
                type="email"
                placeholder="admin@exemplo.com"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                disabled={!isEditingConfig}
                className="border-blue-400/60 focus:border-blue-500"
              />
              <p className="text-xs text-muted-foreground">
                Receba notificações quando a sincronização falhar
              </p>
            </div>
          </div>
          
          {/* Toggle Button */}
          <Button
            onClick={async () => {
              if (isEditingConfig) {
                // Save configuration
                setIsSavingConfig(true);
                try {
                  await updateSettings({
                    doc_sync_time: syncTime,
                    doc_sync_alert_email: alertEmail || null
                  });
                  toast.success('Configurações salvas com sucesso!');
                  setIsEditingConfig(false);
                } catch (error) {
                  console.error('Error saving config:', error);
                  toast.error('Erro ao salvar configurações');
                } finally {
                  setIsSavingConfig(false);
                }
              } else {
                // Enable editing
                setIsLoadingConfig(true);
                await new Promise(resolve => setTimeout(resolve, 300));
                setIsLoadingConfig(false);
                setIsEditingConfig(true);
              }
            }}
            disabled={isSavingConfig || isLoadingConfig}
            variant={isEditingConfig ? "default" : "outline"}
            className="w-full sm:w-auto"
          >
            {isSavingConfig ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : isLoadingConfig ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : isEditingConfig ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Configurar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <RefreshCw className="w-8 h-8 text-blue-400" />
              <div className="text-right">
                <p className="text-3xl font-bold">{syncStats.totalSyncs}</p>
                <p className="text-xs text-muted-foreground">Total Syncs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <div className="text-right">
                <p className="text-3xl font-bold">{syncStats.successRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
              </div>
            </div>
            {successTrend.value > 0 && (
              <div className={`flex items-center justify-end mt-2 text-xs ${successTrend.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {successTrend.direction === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {successTrend.value}% vs semana anterior
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <XCircle className="w-8 h-8 text-red-400" />
              <div className="text-right">
                <p className="text-3xl font-bold">{syncStats.failedCount}</p>
                <p className="text-xs text-muted-foreground">Falhas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <Timer className="w-8 h-8 text-amber-400" />
              <div className="text-right">
                <p className="text-3xl font-bold">{formatDuration(syncStats.avgDuration)}</p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <Calendar className="w-8 h-8 text-cyan-400" />
              <div className="text-right">
                <p className="text-lg font-bold">
                  {lastSync ? new Date(lastSync.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Última Sync</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - Trend */}
        <Card className="lg:col-span-2 bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-primary" />
              Evolução das Sincronizações (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="success" 
                  stroke="hsl(142, 76%, 36%)" 
                  fill="url(#successGradient)"
                  strokeWidth={2}
                  name="Sucesso"
                />
                <Area 
                  type="monotone" 
                  dataKey="failed" 
                  stroke="hsl(0, 84%, 60%)" 
                  fill="url(#failedGradient)"
                  strokeWidth={2}
                  name="Falha"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Components Breakdown */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              Componentes Detectados
            </CardTitle>
            <CardDescription>Última sincronização</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tables */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  Tabelas do Banco
                </span>
                <span className="font-bold">{componentsBreakdown.tables}</span>
              </div>
              <Progress value={(componentsBreakdown.tables / maxComponents) * 100} className="h-2 [&>div]:bg-blue-400" />
            </div>
            
            {/* Edge Functions */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-purple-400" />
                  Edge Functions
                </span>
                <span className="font-bold">{componentsBreakdown.edgeFunctions}</span>
              </div>
              <Progress value={(componentsBreakdown.edgeFunctions / maxComponents) * 100} className="h-2 [&>div]:bg-purple-400" />
            </div>
            
            {/* Frontend Components */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-green-400" />
                  Componentes Frontend
                </span>
                <span className="font-bold">{componentsBreakdown.components}</span>
              </div>
              <Progress value={(componentsBreakdown.components / maxComponents) * 100} className="h-2 [&>div]:bg-green-400" />
            </div>
            
            {/* Icons */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  Ícones Lucide
                </span>
                <span className="font-bold">{componentsBreakdown.icons > 100 ? '100+' : componentsBreakdown.icons}</span>
              </div>
              <Progress value={100} className="h-2 [&>div]:bg-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pie Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Success vs Failure Pie */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Taxa de Sucesso vs Falha</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Manual vs Scheduled Pie */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Manual vs Agendado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={triggerPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {triggerPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sync History with Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Histórico de Sincronizações</CardTitle>
              <CardDescription>Últimas 20 sincronizações realizadas</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Sucesso</SelectItem>
                  <SelectItem value="failed">Falha</SelectItem>
                  <SelectItem value="running">Em Andamento</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {syncLogs.length === 0 ? 'Nenhuma sincronização realizada ainda.' : 'Nenhum resultado encontrado para os filtros selecionados.'}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleLogExpanded(log.id)}
                      >
                        <TableCell>
                          {expandedLogs.has(log.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDateTime(log.started_at)}
                        </TableCell>
                        <TableCell>{getTriggerBadge(log.trigger_type)}</TableCell>
                        <TableCell>{formatDuration(log.duration_ms)}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                      </TableRow>
                      
                      {expandedLogs.has(log.id) && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/20">
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                                  <div className="text-xs text-muted-foreground mb-1">Tabelas</div>
                                  <div className="text-xl font-bold text-primary">
                                    {log.changes_detected?.database?.tables || 0}
                                  </div>
                                </div>
                                <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                                  <div className="text-xs text-muted-foreground mb-1">Edge Functions</div>
                                  <div className="text-xl font-bold text-primary">
                                    {log.changes_detected?.edge_functions?.total || 0}
                                  </div>
                                </div>
                                <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                                  <div className="text-xs text-muted-foreground mb-1">Componentes</div>
                                  <div className="text-xl font-bold text-primary">
                                    {log.changes_detected?.frontend?.components || 0}
                                  </div>
                                </div>
                                <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                                  <div className="text-xs text-muted-foreground mb-1">Ícones</div>
                                  <div className="text-xl font-bold text-primary">
                                    {log.changes_detected?.icons?.total || 0}
                                  </div>
                                </div>
                              </div>
                              
                              {log.triggered_by && (
                                <div className="text-sm text-muted-foreground">
                                  Iniciado por: <span className="text-foreground">{log.triggered_by}</span>
                                </div>
                              )}
                              
                              {log.error_message && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                  {log.error_message}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Schedule Info */}
      <Card className="bg-muted/20 border-border/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              A sincronização automática é executada diariamente às <strong className="text-foreground">03:00</strong>.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};