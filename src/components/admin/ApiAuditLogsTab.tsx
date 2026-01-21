import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  user_id: string | null;
  method: string | null;
  endpoint: string | null;
  response_status: number | null;
  response_time_ms: number | null;
  ip_address: string | null;
  created_at: string | null;
}

const getStatusConfig = (status: number | null) => {
  if (!status) return { icon: Info, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'N/A' };
  if (status >= 200 && status < 300) return { icon: CheckCircle2, color: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'OK' };
  if (status >= 400 && status < 500) return { icon: AlertTriangle, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'Client Error' };
  if (status >= 500) return { icon: XCircle, color: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Server Error' };
  return { icon: Info, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Info' };
};

export function ApiAuditLogsTab() {
  const [filters, setFilters] = useState({
    search: '',
    method: 'all',
    dateRange: '7d',
  });

  // Fetch logs from api_audit_logs table
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['api-audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('api_audit_logs')
        .select('id, user_id, method, endpoint, response_status, response_time_ms, ip_address, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters.method !== 'all') {
        query = query.eq('method', filters.method);
      }
      if (filters.search) {
        query = query.ilike('endpoint', `%${filters.search}%`);
      }

      if (filters.dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (filters.dateRange) {
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AuditLog[];
    },
  });

  // Stats
  const stats = useMemo(() => ({
    total: logs?.length || 0,
    success: logs?.filter(l => l.response_status && l.response_status >= 200 && l.response_status < 300).length || 0,
    errors: logs?.filter(l => l.response_status && l.response_status >= 500).length || 0,
    warnings: logs?.filter(l => l.response_status && l.response_status >= 400 && l.response_status < 500).length || 0,
  }), [logs]);

  // Export CSV
  const handleExport = () => {
    if (!logs) return;
    
    const csv = [
      ['Data/Hora', 'Método', 'Endpoint', 'Status', 'Tempo (ms)', 'IP', 'Usuário'].join(','),
      ...logs.map(log => [
        log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss') : '',
        log.method || '',
        `"${log.endpoint || ''}"`,
        log.response_status || '',
        log.response_time_ms || '',
        log.ip_address || '',
        log.user_id || 'Sistema'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Log de APIs</h1>
            <p className="text-muted-foreground text-sm">
              Auditoria de requisições à API
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!logs?.length}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de Eventos</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-500">{stats.success}</div>
            <p className="text-xs text-muted-foreground">Sucessos</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-yellow-500">{stats.warnings}</div>
            <p className="text-xs text-muted-foreground">Avisos</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-red-500">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar endpoint..."
                className="pl-9 h-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            
            <Select value={filters.method} onValueChange={(v) => setFilters({ ...filters, method: v })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.dateRange} onValueChange={(v) => setFilters({ ...filters, dateRange: v })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Últimas 24h</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Data/Hora</TableHead>
                  <TableHead className="w-[80px]">Método</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Tempo</TableHead>
                  <TableHead className="w-[120px]">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      <span className="text-sm text-muted-foreground">Carregando logs...</span>
                    </TableCell>
                  </TableRow>
                ) : logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  logs?.map((log) => {
                    const statusConfig = getStatusConfig(log.response_status);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {log.created_at ? format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR }) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.method || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm truncate max-w-[300px]" title={log.endpoint || ''}>
                            {log.endpoint || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${statusConfig.color}`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {log.response_status || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[120px]" title={log.ip_address || ''}>
                          {log.ip_address || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ApiAuditLogsTab;
