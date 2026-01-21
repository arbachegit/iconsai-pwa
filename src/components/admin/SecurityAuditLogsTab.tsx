import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Search, 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Ban,
  MapPin,
  Globe,
  Monitor,
  Smartphone,
  Clock,
  User,
  ExternalLink,
  Filter,
  FileText,
  BarChart3,
  List
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SecurityMetricsDashboard } from "./security/SecurityMetricsDashboard";

interface AuditLog {
  id: string;
  incident_type: string;
  severity: string;
  device_fingerprint: string | null;
  ip_address: string | null;
  user_agent: string | null;
  user_email: string | null;
  user_id: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  screen_resolution: string | null;
  canvas_fingerprint: string | null;
  webgl_fingerprint: string | null;
  hardware_concurrency: number | null;
  device_memory: number | null;
  timezone: string | null;
  language: string | null;
  platform: string | null;
  geo_country: string | null;
  geo_region: string | null;
  geo_city: string | null;
  geo_lat: number | null;
  geo_lon: number | null;
  geo_isp: string | null;
  geo_org: string | null;
  geo_timezone: string | null;
  action_taken: string | null;
  was_whitelisted: boolean | null;
  ban_applied: boolean | null;
  page_url: string | null;
  violation_details: Record<string, unknown> | null;
  created_at: string;
}

const severityConfig: Record<string, { icon: React.ElementType; className: string; label: string }> = {
  critical: { icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20", label: "Crítico" },
  warning: { icon: AlertTriangle, className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", label: "Aviso" },
  info: { icon: CheckCircle, className: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Info" },
};

const actionConfig: Record<string, { icon: React.ElementType; className: string; label: string }> = {
  banned: { icon: Ban, className: "bg-destructive/10 text-destructive", label: "Banido" },
  allowed: { icon: CheckCircle, className: "bg-green-500/10 text-green-600", label: "Permitido" },
  logged: { icon: FileText, className: "bg-blue-500/10 text-blue-600", label: "Registrado" },
};

const incidentTypes = [
  "devtools_open",
  "right_click",
  "keyboard_shortcut",
  "copy_attempt",
  "print_attempt",
  "screenshot_attempt",
  "inspector_detected",
  "unban_device",
  "ban_device",
  "whitelist_add",
  "whitelist_remove",
];

export function SecurityAuditLogsTab() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<"dashboard" | "logs">("dashboard");
  const pageSize = 50;

  // Fetch audit logs
  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ["security-audit-logs", search, severityFilter, actionFilter, typeFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("security_audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) {
        query = query.or(`ip_address.ilike.%${search}%,user_email.ilike.%${search}%,device_fingerprint.ilike.%${search}%,geo_country.ilike.%${search}%,geo_city.ilike.%${search}%`);
      }
      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }
      if (actionFilter !== "all") {
        query = query.eq("action_taken", actionFilter);
      }
      if (typeFilter !== "all") {
        query = query.eq("incident_type", typeFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data as AuditLog[], totalCount: count || 0 };
    },
    refetchInterval: 60000,
  });

  const logs = logsData?.logs || [];
  const totalCount = logsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Stats calculation
  const stats = {
    total: totalCount,
    banned: logs.filter(l => l.action_taken === "banned").length,
    allowed: logs.filter(l => l.was_whitelisted).length,
    critical: logs.filter(l => l.severity === "critical").length,
  };

  // Export to CSV
  const handleExport = () => {
    if (!logs.length) return;
    
    const headers = [
      "Data/Hora", "Tipo", "Severidade", "Ação", "IP", "Email", 
      "Localização", "Device Fingerprint", "Browser", "OS"
    ];
    
    const rows = logs.map(log => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
      log.incident_type,
      log.severity,
      log.action_taken || "N/A",
      log.ip_address || "N/A",
      log.user_email || "Anônimo",
      log.geo_city && log.geo_country ? `${log.geo_city}, ${log.geo_country}` : "N/A",
      log.device_fingerprint || "N/A",
      log.browser_name ? `${log.browser_name} ${log.browser_version}` : "N/A",
      log.os_name ? `${log.os_name} ${log.os_version}` : "N/A",
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `security-audit-logs-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityBadge = (severity: string) => {
    const config = severityConfig[severity] || severityConfig.info;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getActionBadge = (action: string | null) => {
    if (!action) return <Badge variant="outline">N/A</Badge>;
    const config = actionConfig[action] || actionConfig.logged;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Logs de Auditoria de Segurança</h1>
            <p className="text-muted-foreground">Visualize todas as ações de segurança do sistema</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button 
              variant={viewMode === "dashboard" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setViewMode("dashboard")}
              className="rounded-none"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button 
              variant={viewMode === "logs" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setViewMode("logs")}
              className="rounded-none"
            >
              <List className="h-4 w-4 mr-2" />
              Logs
            </Button>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!logs.length}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Dashboard View */}
      {viewMode === "dashboard" && <SecurityMetricsDashboard />}

      {/* Logs View */}
      {viewMode === "logs" && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <Ban className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Banimentos</p>
                <p className="text-2xl font-bold">{stats.banned}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Whitelisted</p>
                <p className="text-2xl font-bold">{stats.allowed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por IP, email, fingerprint, país..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Incidente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {incidentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ação Tomada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="banned">Banido</SelectItem>
                <SelectItem value="allowed">Permitido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Auditoria</CardTitle>
          <CardDescription>
            Mostrando {logs.length} de {totalCount} registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.incident_type}</Badge>
                      </TableCell>
                      <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                      <TableCell className="font-mono text-sm">{log.ip_address || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{log.user_email || "Anônimo"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.geo_city && log.geo_country ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{log.geo_city}, {log.geo_country}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action_taken)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Detalhes do Incidente
            </DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="max-h-[70vh]">
              <Tabs defaultValue="incident" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="incident">Incidente</TabsTrigger>
                  <TabsTrigger value="device">Dispositivo</TabsTrigger>
                  <TabsTrigger value="location">Localização</TabsTrigger>
                  <TabsTrigger value="raw">Dados Brutos</TabsTrigger>
                </TabsList>

                <TabsContent value="incident" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tipo de Incidente</p>
                      <Badge variant="outline" className="text-base">{selectedLog.incident_type}</Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Severidade</p>
                      {getSeverityBadge(selectedLog.severity)}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Ação Tomada</p>
                      {getActionBadge(selectedLog.action_taken)}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Whitelisted?</p>
                      <Badge variant={selectedLog.was_whitelisted ? "default" : "outline"}>
                        {selectedLog.was_whitelisted ? "Sim" : "Não"}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Usuário</p>
                    <p className="font-mono">{selectedLog.user_email || "Anônimo"}</p>
                  </div>
                  {selectedLog.page_url && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Página</p>
                      <p className="font-mono text-sm break-all">{selectedLog.page_url}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="device" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Navegador
                      </p>
                      <p>{selectedLog.browser_name} {selectedLog.browser_version}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Monitor className="h-4 w-4" /> Sistema Operacional
                      </p>
                      <p>{selectedLog.os_name} {selectedLog.os_version}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Smartphone className="h-4 w-4" /> Plataforma
                      </p>
                      <p>{selectedLog.platform || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Resolução</p>
                      <p>{selectedLog.screen_resolution || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">CPU Cores</p>
                      <p>{selectedLog.hardware_concurrency || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Memória</p>
                      <p>{selectedLog.device_memory ? `${selectedLog.device_memory} GB` : "N/A"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Device Fingerprint</p>
                    <p className="font-mono text-sm break-all bg-muted p-2 rounded">{selectedLog.device_fingerprint}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Canvas Fingerprint</p>
                    <p className="font-mono text-sm break-all bg-muted p-2 rounded">{selectedLog.canvas_fingerprint || "N/A"}</p>
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">IP Address</p>
                      <p className="font-mono">{selectedLog.ip_address || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">País</p>
                      <p>{selectedLog.geo_country || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Região</p>
                      <p>{selectedLog.geo_region || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Cidade</p>
                      <p>{selectedLog.geo_city || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">ISP</p>
                      <p>{selectedLog.geo_isp || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Organização</p>
                      <p>{selectedLog.geo_org || "N/A"}</p>
                    </div>
                  </div>
                  {selectedLog.geo_lat && selectedLog.geo_lon && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Coordenadas</p>
                        <p className="font-mono">{selectedLog.geo_lat}, {selectedLog.geo_lon}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://www.google.com/maps?q=${selectedLog.geo_lat},${selectedLog.geo_lon}`, "_blank")}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Abrir no Google Maps
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="raw" className="mt-4">
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}

export default SecurityAuditLogsTab;
