import { useState } from "react";
import { useSecurityMetrics, usePWADevices, useSecurityScans } from "@/hooks/useSecurityMetrics";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Smartphone,
  Monitor,
  Ban,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  AlertTriangle,
  Globe,
  Fingerprint,
  Activity,
  TrendingUp,
  Lock,
  Unlock,
  Eye,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PWADiagnosticsModal } from "./PWADiagnosticsModal";

function getRiskColor(riskLevel: string) {
  switch (riskLevel) {
    case 'low': return 'text-green-500';
    case 'medium': return 'text-yellow-500';
    case 'high': return 'text-orange-500';
    case 'critical': return 'text-red-500';
    default: return 'text-muted-foreground';
  }
}

function getRiskIcon(riskLevel: string) {
  switch (riskLevel) {
    case 'low': return <ShieldCheck className="h-8 w-8 text-green-500" />;
    case 'medium': return <Shield className="h-8 w-8 text-yellow-500" />;
    case 'high': return <ShieldAlert className="h-8 w-8 text-orange-500" />;
    case 'critical': return <ShieldX className="h-8 w-8 text-red-500" />;
    default: return <Shield className="h-8 w-8 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'verified':
      return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Verificado</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Pendente</Badge>;
    case 'blocked':
      return <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30">Bloqueado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function SecurityUnifiedDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'block' | 'unblock' | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useSecurityMetrics();
  const { data: devices, isLoading: devicesLoading, refetch: refetchDevices } = usePWADevices();
  const { data: scans, isLoading: scansLoading } = useSecurityScans();

  const handleRunScan = async () => {
    try {
      toast({ title: "Iniciando scan de segurança..." });
      const { error } = await supabase.functions.invoke('security-integrity-scan', {
        body: { trigger: 'manual' }
      });
      
      if (error) throw error;
      
      toast({ title: "Scan concluído!", description: "Resultados atualizados." });
      refetchMetrics();
    } catch (err) {
      toast({ 
        title: "Erro no scan", 
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive" 
      });
    }
  };

  const handleDeviceAction = async () => {
    if (!selectedDevice || !actionType) return;
    
    setIsPerformingAction(true);
    try {
      // Use correct column names: is_blocked and is_verified
      const updatePayload = actionType === 'block' 
        ? { is_blocked: true, is_verified: false, updated_at: new Date().toISOString() }
        : { is_blocked: false, is_verified: true, updated_at: new Date().toISOString() };
      
      const { error } = await supabase
        .from('pwa_devices')
        .update(updatePayload)
        .eq('id', selectedDevice);
      
      if (error) throw error;
      
      toast({ 
        title: actionType === 'block' ? "Dispositivo bloqueado" : "Dispositivo desbloqueado",
        description: "Status atualizado com sucesso." 
      });
      
      queryClient.invalidateQueries({ queryKey: ["pwa-devices"] });
      queryClient.invalidateQueries({ queryKey: ["security-metrics"] });
    } catch (err) {
      toast({ 
        title: "Erro", 
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive" 
      });
    } finally {
      setIsPerformingAction(false);
      setActionDialogOpen(false);
      setSelectedDevice(null);
      setActionType(null);
    }
  };

  const openActionDialog = (deviceId: string, action: 'block' | 'unblock') => {
    setSelectedDevice(deviceId);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const filteredDevices = devices?.filter(device => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      device.user_name?.toLowerCase().includes(term) ||
      device.user_email?.toLowerCase().includes(term) ||
      device.device_fingerprint?.toLowerCase().includes(term) ||
      device.os_name?.toLowerCase().includes(term) ||
      device.browser_name?.toLowerCase().includes(term)
    );
  });

  if (metricsLoading) {
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
        <div className="flex items-center gap-3">
          {metrics && getRiskIcon(metrics.riskLevel)}
          <div>
            <h2 className="text-2xl font-bold">Security Dashboard v4</h2>
            <p className="text-sm text-muted-foreground">
              Monitoramento unificado de segurança
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PWADiagnosticsModal />
          <Button onClick={handleRunScan} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Executar Scan
          </Button>
        </div>
      </div>

      {/* Security Score Card */}
      <Card className="border-2" style={{ 
        borderColor: metrics?.riskLevel === 'low' ? 'hsl(var(--success))' : 
                     metrics?.riskLevel === 'medium' ? 'hsl(var(--warning))' : 
                     metrics?.riskLevel === 'high' ? 'hsl(var(--destructive) / 0.5)' : 
                     'hsl(var(--destructive))' 
      }}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-5xl font-bold ${getRiskColor(metrics?.riskLevel || 'low')}`}>
                  {metrics?.overallScore || 0}
                </div>
                <div className="text-sm text-muted-foreground">Security Score</div>
              </div>
              <div className="h-16 w-px bg-border" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={metrics?.riskLevel === 'low' ? 'default' : 'destructive'}>
                    Risco: {metrics?.riskLevel?.toUpperCase()}
                  </Badge>
                </div>
                <Progress 
                  value={metrics?.overallScore || 0} 
                  className="w-48 h-2"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-500">{metrics?.passedFindings || 0}</div>
                <div className="text-xs text-muted-foreground">Aprovados</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">{metrics?.warningFindings || 0}</div>
                <div className="text-xs text-muted-foreground">Avisos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{metrics?.criticalFindings || 0}</div>
                <div className="text-xs text-muted-foreground">Críticos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">{metrics?.totalDevices || 0}</div>
                <div className="text-xs text-muted-foreground">Dispositivos</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="devices">
            Dispositivos PWA
            {metrics && metrics.pendingVerification > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {metrics.pendingVerification}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scans">Scans</TabsTrigger>
          <TabsTrigger value="protection">Proteção</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Smartphone className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metrics?.totalDevices || 0}</div>
                    <div className="text-xs text-muted-foreground">Total Dispositivos</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metrics?.verifiedDevices || 0}</div>
                    <div className="text-xs text-muted-foreground">Verificados</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <Ban className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metrics?.activeBans || 0}</div>
                    <div className="text-xs text-muted-foreground">Banimentos Ativos</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metrics?.totalViolations || 0}</div>
                    <div className="text-xs text-muted-foreground">Violações (30d)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Whitelist Ativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xl font-bold">{metrics?.whitelistedIPs || 0}</span>
                    <span className="text-sm text-muted-foreground">IPs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xl font-bold">{metrics?.whitelistedFingerprints || 0}</span>
                    <span className="text-sm text-muted-foreground">Fingerprints</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Último Scan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {metrics?.lastScanStatus === 'healthy' && <ShieldCheck className="h-5 w-5 text-green-500" />}
                    {metrics?.lastScanStatus === 'warning' && <ShieldAlert className="h-5 w-5 text-yellow-500" />}
                    {metrics?.lastScanStatus === 'critical' && <ShieldX className="h-5 w-5 text-red-500" />}
                    <span className="font-medium capitalize">{metrics?.lastScanStatus || 'N/A'}</span>
                  </div>
                  {metrics?.lastScanDate && (
                    <span className="text-sm text-muted-foreground">
                      {new Date(metrics.lastScanDate).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Dispositivos PWA Registrados</CardTitle>
                  <CardDescription>Gerencie dispositivos com acesso ao aplicativo</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar dispositivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredDevices?.map((device) => (
                      <div
                        key={device.id}
                        className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              {device.os_name?.toLowerCase().includes('ios') || 
                               device.os_name?.toLowerCase().includes('android') ? (
                                <Smartphone className="h-5 w-5 text-primary" />
                              ) : (
                                <Monitor className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{device.user_name || 'Sem nome'}</span>
                                {getStatusBadge(device.is_blocked ? 'blocked' : device.is_verified ? 'verified' : 'pending')}
                                {device.pwa_slugs && device.pwa_slugs.length > 0 && (
                                  <Badge variant="outline">{device.pwa_slugs[0]}</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {device.user_email || device.phone_number || 'Sem contato'}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{device.os_name} {device.os_version}</span>
                                <span>{device.browser_name} {device.browser_version}</span>
                                {device.screen_width && device.screen_height && (
                                  <span>{device.screen_width}x{device.screen_height}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Registrado: {new Date(device.created_at).toLocaleString('pt-BR')}
                                </span>
                                {device.last_active_at && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      Último acesso: {new Date(device.last_active_at).toLocaleString('pt-BR')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                navigator.clipboard.writeText(device.device_fingerprint);
                                toast({ title: "Device ID copiado" });
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Copiar Device ID
                              </DropdownMenuItem>
                              {device.is_blocked ? (
                                <DropdownMenuItem onClick={() => openActionDialog(device.id, 'unblock')}>
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Desbloquear
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => openActionDialog(device.id, 'block')}
                                  className="text-red-500"
                                >
                                  <Lock className="h-4 w-4 mr-2" />
                                  Bloquear
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                    
                    {filteredDevices?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum dispositivo encontrado
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scans Tab */}
        <TabsContent value="scans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Histórico de Scans</CardTitle>
              <CardDescription>Últimos 10 scans de segurança executados</CardDescription>
            </CardHeader>
            <CardContent>
              {scansLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {scans?.map((scan: Record<string, unknown>) => {
                      const findingsSummary = scan.findings_summary as { critical?: number; warning?: number; passed?: number } | null;
                      return (
                        <div
                          key={scan.id as string}
                          className="p-3 rounded-lg border flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            {scan.overall_status === 'healthy' && <ShieldCheck className="h-5 w-5 text-green-500" />}
                            {scan.overall_status === 'warning' && <ShieldAlert className="h-5 w-5 text-yellow-500" />}
                            {scan.overall_status === 'critical' && <ShieldX className="h-5 w-5 text-red-500" />}
                            <div>
                              <div className="font-medium capitalize">{scan.overall_status as string}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(scan.scan_timestamp as string).toLocaleString('pt-BR')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-green-500">{findingsSummary?.passed || 0} ✓</span>
                            <span className="text-yellow-500">{findingsSummary?.warning || 0} ⚠</span>
                            <span className="text-red-500">{findingsSummary?.critical || 0} ✗</span>
                            <Badge variant="outline">{scan.scanner_type as string}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protection Tab */}
        <TabsContent value="protection" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Ban className="h-4 w-4" />
                  Banimentos Ativos
                </CardTitle>
                <CardDescription>Dispositivos banidos do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{metrics?.activeBans || 0}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Dispositivos com acesso negado permanentemente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Violações Recentes
                </CardTitle>
                <CardDescription>Nos últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">{metrics?.totalViolations || 0}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Tentativas de acesso não autorizado detectadas
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status de Proteção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                    <span>Security Shield v4</span>
                  </div>
                  <Badge className="bg-green-500">Ativo</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-5 w-5 text-green-500" />
                    <span>Device Fingerprinting</span>
                  </div>
                  <Badge className="bg-green-500">Ativo</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-green-500" />
                    <span>PWA Authentication</span>
                  </div>
                  <Badge className="bg-green-500">Ativo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'block' ? 'Bloquear Dispositivo' : 'Desbloquear Dispositivo'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'block' 
                ? 'O dispositivo não poderá mais acessar o aplicativo. Esta ação pode ser revertida.'
                : 'O dispositivo terá acesso restaurado ao aplicativo.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPerformingAction}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeviceAction}
              disabled={isPerformingAction}
              className={actionType === 'block' ? 'bg-red-500 hover:bg-red-600' : ''}
            >
              {isPerformingAction ? 'Processando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
