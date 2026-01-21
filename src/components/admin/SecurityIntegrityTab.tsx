import { useState, useEffect, useMemo } from "react";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportData } from "@/lib/export-utils";
import { notifySecurityAlert } from "@/lib/notification-dispatcher";
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Settings,
  Loader2,
  Copy,
  ArrowUpDown,
  Filter,
  CalendarIcon,
  X
} from "lucide-react";
import { format, formatDistanceToNow, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface SecurityFinding {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'info' | 'passed';
  title: string;
  description: string;
  location?: string;
  remediation?: string;
}

interface ScanResult {
  id: string;
  scan_timestamp: string;
  scanner_type: string;
  overall_status: 'critical' | 'warning' | 'healthy';
  findings_summary: {
    critical: number;
    warning: number;
    info: number;
    passed: number;
  };
  detailed_report: SecurityFinding[];
  execution_duration_ms: number;
  triggered_by: string;
  alert_sent: boolean;
}

interface AdminSettings {
  security_scan_enabled: boolean;
  security_alert_email: string | null;
  security_alert_threshold: string;
  security_scan_time: string | null;
  last_security_scan: string | null;
  last_scheduled_scan: string | null;
  last_scheduler_error: string | null;
}

type SortField = 'scan_timestamp' | 'overall_status' | 'execution_duration_ms';
type SortDirection = 'asc' | 'desc';

export const SecurityIntegrityTab = () => {
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedScanId, setExpandedScanId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings>({
    security_scan_enabled: true,
    security_alert_email: null,
    security_alert_threshold: 'critical',
    security_scan_time: '03:00',
    last_security_scan: null,
    last_scheduled_scan: null,
    last_scheduler_error: null
  });
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('scan_timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Filtering state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchScanHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('security_scan_results')
        .select('*')
        .order('scan_timestamp', { ascending: false })
        .limit(30);

      if (error) throw error;
      
      // Type assertion for the data
      const typedData = (data || []).map(item => ({
        ...item,
        findings_summary: (item.findings_summary || { critical: 0, warning: 0, info: 0, passed: 0 }) as ScanResult['findings_summary'],
        detailed_report: (Array.isArray(item.detailed_report) ? item.detailed_report : []) as unknown as SecurityFinding[],
        overall_status: (item.overall_status || 'healthy') as ScanResult['overall_status']
      }));
      
      setScanHistory(typedData);
    } catch (error) {
      logger.error('Error fetching scan history:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('security_scan_enabled, security_alert_email, security_alert_threshold, last_security_scan, last_scheduled_scan, last_scheduler_error')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          security_scan_enabled: data.security_scan_enabled ?? true,
          security_alert_email: data.security_alert_email,
          security_alert_threshold: data.security_alert_threshold ?? 'critical',
          security_scan_time: '03:00',
          last_security_scan: data.last_security_scan,
          last_scheduled_scan: (data as any).last_scheduled_scan || null,
          last_scheduler_error: (data as any).last_scheduler_error || null
        });
      }
    } catch (error) {
      logger.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchScanHistory(), fetchSettings()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const runManualScan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-integrity-scan', {
        body: { trigger: 'manual' }
      });

      if (error) throw error;

      // Map scan status to severity level for notification
      const severityMap: Record<string, string> = { healthy: 'secure', warning: 'warning', critical: 'critical' };
      const severityLevel = severityMap[data.overall_status] || 'secure';
      
      // Build threat type message based on findings
      const summary = data.findings_summary || { critical: 0, warning: 0 };
      const threatType = data.overall_status === 'healthy' 
        ? 'Nenhuma vulnerabilidade detectada'
        : `${summary.critical} críticas, ${summary.warning} avisos`;
      
      // Dispatch notification for manual scan (always notify)
      await notifySecurityAlert(severityLevel, threatType, 'Scan Manual');

      toast.success('Scan concluído', {
        description: `Status: ${data.overall_status === 'healthy' ? '✅ Saudável' : data.overall_status === 'warning' ? '⚠️ Atenção' : '🔴 Crítico'}`
      });

      await fetchScanHistory();
      await fetchSettings();
    } catch (error) {
      logger.error('Error running scan:', error);
      toast.error('Erro ao executar scan');
    } finally {
      setIsScanning(false);
    }
  };

  const updateSettings = async (updates: Partial<AdminSettings>) => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update(updates)
        .not('id', 'is', null);

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...updates }));
      toast.success('Configurações atualizadas');
    } catch (error) {
      logger.error('Error updating settings:', error);
      toast.error('Erro ao atualizar configurações');
    }
  };

  const exportToPDF = async (scan: ScanResult) => {
    const pdfData = scan.detailed_report.map(finding => ({
      Categoria: finding.category,
      Severidade: finding.severity.toUpperCase(),
      Título: finding.title,
      Descrição: finding.description,
      Localização: finding.location || 'N/A',
      Remediação: finding.remediation || 'N/A'
    }));

    await exportData({
      filename: `security-scan-${format(new Date(scan.scan_timestamp), 'yyyy-MM-dd-HHmm')}`,
      data: pdfData,
      format: 'pdf',
      columns: [
        { key: 'Categoria', label: 'Categoria' },
        { key: 'Severidade', label: 'Severidade' },
        { key: 'Título', label: 'Título' },
        { key: 'Descrição', label: 'Descrição' },
        { key: 'Localização', label: 'Localização' },
        { key: 'Remediação', label: 'Remediação' }
      ]
    });

    toast.success('PDF exportado com sucesso');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <ShieldX className="w-5 h-5 text-destructive" />;
      case 'warning': return <ShieldAlert className="w-5 h-5 text-yellow-500" />;
      case 'healthy': return <ShieldCheck className="w-5 h-5 text-green-500" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': 
        return <Badge variant="destructive" className="gap-1"><ShieldX className="w-3 h-3" />Crítico</Badge>;
      case 'warning': 
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50 gap-1"><AlertTriangle className="w-3 h-3" />Atenção</Badge>;
      case 'info': 
        return <Badge variant="secondary" className="gap-1"><Info className="w-3 h-3" />Info</Badge>;
      case 'passed': 
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/50 gap-1"><CheckCircle2 className="w-3 h-3" />Passou</Badge>;
      default: 
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  // Sorting and filtering logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 ml-1" /> 
      : <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setDateRange(undefined);
  };

  const hasActiveFilters = statusFilter !== 'all' || dateRange !== undefined;

  const filteredAndSortedScans = useMemo(() => {
    let result = [...scanHistory];

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(scan => scan.overall_status === statusFilter);
    }

    // Apply date range filter
    if (dateRange?.from) {
      result = result.filter(scan => {
        const scanDate = new Date(scan.scan_timestamp);
        const from = startOfDay(dateRange.from!);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
        return isWithinInterval(scanDate, { start: from, end: to });
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'scan_timestamp':
          comparison = new Date(a.scan_timestamp).getTime() - new Date(b.scan_timestamp).getTime();
          break;
        case 'overall_status':
          const statusOrder = { critical: 0, warning: 1, healthy: 2 };
          comparison = statusOrder[a.overall_status] - statusOrder[b.overall_status];
          break;
        case 'execution_duration_ms':
          comparison = a.execution_duration_ms - b.execution_duration_ms;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [scanHistory, statusFilter, dateRange, sortField, sortDirection]);

  // Pagination logic
  const totalItems = filteredAndSortedScans.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedScans = filteredAndSortedScans.slice(startIndex, endIndex);

  // Reset to page 1 when filters or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateRange, sortField, sortDirection, itemsPerPage]);

  const latestScan = scanHistory[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Segurança & Integridade</h2>
        </div>
        <Button 
          onClick={runManualScan} 
          disabled={isScanning}
          className="gap-2"
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isScanning ? 'Escaneando...' : 'Executar Scan Manual'}
        </Button>
      </div>

      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`border-2 ${latestScan?.overall_status === 'critical' ? 'border-destructive' : latestScan?.overall_status === 'warning' ? 'border-yellow-500' : 'border-green-500'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status Atual</p>
                <p className="text-2xl font-bold capitalize">
                  {latestScan?.overall_status === 'healthy' ? 'Saudável' : 
                   latestScan?.overall_status === 'warning' ? 'Atenção' : 
                   latestScan?.overall_status === 'critical' ? 'Crítico' : 'Desconhecido'}
                </p>
              </div>
              {latestScan && getStatusIcon(latestScan.overall_status)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold text-destructive">
                  {latestScan?.findings_summary?.critical ?? 0}
                </p>
              </div>
              <ShieldX className="w-5 h-5 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avisos</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {latestScan?.findings_summary?.warning ?? 0}
                </p>
              </div>
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprovados</p>
                <p className="text-2xl font-bold text-green-500">
                  {latestScan?.findings_summary?.passed ?? 0}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduler Status Card */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">Scan Agendado: 03:00 AM (diário)</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-2">
                {settings.last_scheduled_scan ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-500">
                      Último: {format(new Date(settings.last_scheduled_scan), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-500">Nenhum scan agendado executado ainda</span>
                  </>
                )}
              </div>
            </div>
            {settings.last_scheduler_error && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Erro: {settings.last_scheduler_error.substring(0, 50)}...
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last Scan Info */}
      {latestScan && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Último scan: {format(new Date(latestScan.scan_timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </div>
              <span>•</span>
              <span>Duração: {latestScan.execution_duration_ms}ms</span>
              <span>•</span>
              <span>Tipo: {latestScan.scanner_type === 'automated_daily' ? 'Automático' : 'Manual'}</span>
              {latestScan.alert_sent && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">Alerta enviado</Badge>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico de Scans
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("gap-2", hasActiveFilters && "border-primary text-primary")}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{(statusFilter !== 'all' ? 1 : 0) + (dateRange ? 1 : 0)}</Badge>}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Toolbar */}
          {showFilters && (
            <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-2">
                <Label className="text-sm">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                    <SelectItem value="warning">Atenção</SelectItem>
                    <SelectItem value="healthy">Aprovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecionar período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="w-4 h-4" />
                  Limpar
                </Button>
              )}
            </div>
          )}
          
          <ScrollArea className="h-[400px]">
            {/* Grid-based Table Header */}
            <div className="grid grid-cols-[200px_150px_100px_80px_80px] gap-0 border-b border-border bg-muted/50 rounded-t-md">
              <button
                onClick={() => handleSort('scan_timestamp')}
                className="flex items-center px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Data/Hora
                {getSortIcon('scan_timestamp')}
              </button>
              <button
                onClick={() => handleSort('overall_status')}
                className="flex items-center px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Status
                {getSortIcon('overall_status')}
              </button>
              <button
                onClick={() => handleSort('execution_duration_ms')}
                className="flex items-center px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Duração
                {getSortIcon('execution_duration_ms')}
              </button>
              <div className="flex items-center justify-center px-4 py-3 text-sm font-medium text-muted-foreground">
                PDF
              </div>
              <div className="flex items-center justify-center px-4 py-3 text-sm font-medium text-muted-foreground">
                Detalhes
              </div>
            </div>
            
            {/* Grid-based Table Body */}
            <div className="divide-y divide-border">
              {paginatedScans.map((scan) => (
                <Collapsible key={scan.id} open={expandedScanId === scan.id}>
                  <div className="grid grid-cols-[200px_150px_100px_80px_80px] gap-0 hover:bg-muted/50 transition-colors">
                    <div className="px-4 py-3">
                      <div className="text-sm">
                        {format(new Date(scan.scan_timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(scan.scan_timestamp), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-center gap-2">
                      {getStatusIcon(scan.overall_status)}
                      <span className="text-sm capitalize">
                        {scan.overall_status === 'healthy' ? 'Saudável' : 
                         scan.overall_status === 'warning' ? 'Atenção' : 'Crítico'}
                      </span>
                    </div>
                    <div className="px-4 py-3 flex items-center text-sm">
                      {scan.execution_duration_ms}ms
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => exportToPDF(scan)}
                        title="Exportar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setExpandedScanId(expandedScanId === scan.id ? null : scan.id)}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedScanId === scan.id ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="bg-muted/30 p-4 border-t border-border">
                      <div className="space-y-4">
                        <div className="flex gap-4 text-sm">
                          <Badge variant="destructive">{scan.findings_summary.critical} Críticos</Badge>
                          <Badge className="bg-yellow-500/20 text-yellow-500">{scan.findings_summary.warning} Avisos</Badge>
                          <Badge variant="secondary">{scan.findings_summary.info} Info</Badge>
                          <Badge className="bg-green-500/20 text-green-500">{scan.findings_summary.passed} Aprovados</Badge>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          {scan.detailed_report
                            .filter(f => f.severity !== 'passed')
                            .map((finding) => (
                              <div key={finding.id} className="p-3 rounded-lg bg-background border">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {getSeverityBadge(finding.severity)}
                                      <span className="text-xs text-muted-foreground">{finding.category}</span>
                                    </div>
                                    <p className="font-medium">{finding.title}</p>
                                    <p className="text-sm text-muted-foreground">{finding.description}</p>
                                    {finding.location && (
                                      <code className="text-xs bg-muted px-1 py-0.5 rounded mt-1 inline-block">
                                        {finding.location}
                                      </code>
                                    )}
                                    {finding.remediation && (
                                      <p className="text-xs text-primary mt-2">
                                        {finding.remediation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          
                          {scan.detailed_report.filter(f => f.severity !== 'passed').length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhum problema encontrado neste scan
                            </p>
                          )}
                        </div>
                        
                        {/* Copy Prompt Button */}
                        {scan.detailed_report.filter(f => f.severity !== 'passed').length > 0 && (
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                const issues = scan.detailed_report
                                  .filter(f => f.severity !== 'passed')
                                  .map(f => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.description}${f.location ? ` (Location: ${f.location})` : ''}${f.remediation ? ` | Fix: ${f.remediation}` : ''}`)
                                  .join('\n');
                                
                                const prompt = `Please fix the following security issues found in the scan:\n\n${issues}`;
                                
                                navigator.clipboard.writeText(prompt);
                                toast.success('Prompt copiado para a área de transferência');
                              }}
                            >
                              <Copy className="w-4 h-4" />
                              Copiar prompt
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
              
              {paginatedScans.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {scanHistory.length === 0 
                    ? 'Nenhum scan realizado ainda. Clique em "Executar Scan Manual" para começar.'
                    : 'Nenhum scan encontrado com os filtros aplicados.'}
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} de {totalItems} registros
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Itens por página:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  Primeira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Última
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default SecurityIntegrityTab;
