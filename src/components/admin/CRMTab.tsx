import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseUntyped } from "@/integrations/supabase/typed-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Calendar, 
  CalendarDays, 
  TrendingUp, 
  Users, 
  Eye,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  MoreHorizontal
} from "lucide-react";
import { format, startOfDay, startOfMonth, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface CRMVisit {
  id: string;
  salesman_id: string | null;
  presentation_topic: string;
  lead_name: string;
  lead_email: string | null;
  lead_phone: string | null;
  status: string;
  duration_seconds: number;
  summary: string | null;
  summary_sent_email: boolean;
  summary_sent_whatsapp: boolean;
  session_id: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

interface Filters {
  topic: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

const topicLabels: Record<string, string> = {
  architecture: "Architecture",
  govsystem: "GovSystem AI",
  retail: "Retail System",
  autocontrol: "AutoControl",
  tutor: "Tutor",
  healthcare: "HealthCare",
  talkapp: "Talk APP",
};

const topicColors: Record<string, string> = {
  architecture: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  govsystem: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  retail: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  autocontrol: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  tutor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  healthcare: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  talkapp: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const getStatusBadge = (status: string) => {
  switch(status) {
    case 'converted': 
      return { label: 'Convertido', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
    case 'lost': 
      return { label: 'Perdido', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
    default: 
      return { label: 'Concluído', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
  }
};

export function CRMTab() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({
    topic: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedVisit, setSelectedVisit] = useState<CRMVisit | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Buscar visitas
  const { data: visits = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-visits', filters],
    queryFn: async () => {
      let query = supabaseUntyped
        .from('crm_visits')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.topic && filters.topic !== 'all') {
        query = query.eq('presentation_topic', filters.topic);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', endOfDay(new Date(filters.dateTo)).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CRMVisit[];
    }
  });

  // Métricas
  const today = startOfDay(new Date()).toISOString();
  const monthStart = startOfMonth(new Date()).toISOString();
  
  const visitsToday = visits.filter(v => v.created_at >= today).length;
  const visitsThisMonth = visits.filter(v => v.created_at >= monthStart).length;
  const convertedCount = visits.filter(v => v.status === 'converted').length;
  const conversionRate = visits.length > 0 ? (convertedCount / visits.length) * 100 : 0;

  // Mutation para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabaseUntyped
        .from('crm_visits')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-visits'] });
      toast.success('Status atualizado!');
      setSelectedVisit(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    }
  });

  // Paginação
  const paginatedVisits = visits.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(visits.length / pageSize);

  const clearFilters = () => {
    setFilters({ topic: 'all', status: 'all', dateFrom: '', dateTo: '' });
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">CRM - Leads DataFlow</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitsToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitsThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              conversionRate > 20 ? 'text-green-600' : 
              conversionRate > 10 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {conversionRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visits.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-sm font-medium mb-1 block">De</label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="w-40"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Até</label>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="w-40"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Tópico</label>
          <Select value={filters.topic} onValueChange={(v) => setFilters(f => ({ ...f, topic: v }))}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(topicLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Status</label>
          <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="converted">Convertido</SelectItem>
              <SelectItem value="lost">Perdido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" onClick={clearFilters}>
          Limpar Filtros
        </Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tópico</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : paginatedVisits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma visita encontrada
                </TableCell>
              </TableRow>
            ) : (
              paginatedVisits.map((visit) => {
                const statusBadge = getStatusBadge(visit.status);
                return (
                  <TableRow key={visit.id}>
                    <TableCell>
                      {format(new Date(visit.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{visit.lead_name}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
                        {visit.lead_email || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={topicColors[visit.presentation_topic] || ''}>
                        {topicLabels[visit.presentation_topic] || visit.presentation_topic}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDuration(visit.duration_seconds)}</TableCell>
                    <TableCell>
                      <Badge className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedVisit(visit)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateStatusMutation.mutate({ id: visit.id, status: 'converted' })}
                            disabled={visit.status === 'converted'}
                          >
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                            Marcar Convertido
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateStatusMutation.mutate({ id: visit.id, status: 'lost' })}
                            disabled={visit.status === 'lost'}
                          >
                            <XCircle className="w-4 h-4 mr-2 text-red-600" />
                            Marcar Perdido
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Anterior
          </Button>
          <span className="py-2 px-4 text-sm">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedVisit} onOpenChange={() => setSelectedVisit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Visita</DialogTitle>
          </DialogHeader>
          
          {selectedVisit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome</label>
                  <p className="font-medium">{selectedVisit.lead_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p>{selectedVisit.lead_email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p>{selectedVisit.lead_phone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tópico</label>
                  <Badge className={topicColors[selectedVisit.presentation_topic] || ''}>
                    {topicLabels[selectedVisit.presentation_topic] || selectedVisit.presentation_topic}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Início</label>
                  <p>{format(new Date(selectedVisit.started_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duração</label>
                  <p>{formatDuration(selectedVisit.duration_seconds)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Resumo Enviado</label>
                <div className="flex gap-4 mt-1">
                  <span className={`flex items-center gap-1 ${selectedVisit.summary_sent_email ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <Mail className="w-4 h-4" />
                    {selectedVisit.summary_sent_email ? 'Sim' : 'Não'}
                  </span>
                  <span className={`flex items-center gap-1 ${selectedVisit.summary_sent_whatsapp ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <MessageSquare className="w-4 h-4" />
                    {selectedVisit.summary_sent_whatsapp ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>

              {selectedVisit.summary && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Resumo</label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                    {selectedVisit.summary}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatusMutation.mutate({ id: selectedVisit.id, status: 'converted' })}
                  disabled={selectedVisit.status === 'converted'}
                >
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Marcar Convertido
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatusMutation.mutate({ id: selectedVisit.id, status: 'lost' })}
                  disabled={selectedVisit.status === 'lost'}
                >
                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                  Marcar Perdido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
