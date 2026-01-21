import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatDateTimeAt } from "@/lib/date-utils";
import {
  Mail,
  MessageCircle,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  Phone,
  Copy,
  ExternalLink,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface NotificationLog {
  id: string;
  event_type: string;
  channel: "email" | "whatsapp" | "sms";
  recipient: string;
  subject: string | null;
  message_body: string;
  status: "pending" | "success" | "failed";
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
  is_read: boolean;
  message_sid: string | null;
  provider_status: string | null;
  provider_error_code: string | null;
  final_status: string | null;
  final_status_at: string | null;
  delivery_attempts: number | null;
  fallback_used: boolean | null;
}

// Event type labels in Portuguese
const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  security_alert: { label: "Alerta de Segurança", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  password_reset: { label: "Recuperação Senha", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  login_alert: { label: "Login Suspeito", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  ml_accuracy_drop: { label: "Queda ML", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  sentiment_alert: { label: "Sentimento Negativo", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  taxonomy_anomaly: { label: "Anomalia Taxonomia", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  document_failed: { label: "Falha Processamento", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  new_contact_message: { label: "Nova Mensagem", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  new_conversation: { label: "Nova Conversa", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  new_document: { label: "Novo Documento", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

export const NotificationLogsTab = () => {
  const queryClient = useQueryClient();
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);

  // Fetch notification logs
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["notification-logs", channelFilter, statusFilter, readFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("notification_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (channelFilter !== "all") {
        query = query.eq("channel", channelFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (readFilter === "unread") {
        query = query.eq("is_read", false);
      } else if (readFilter === "read") {
        query = query.eq("is_read", true);
      }
      if (dateFrom) {
        query = query.gte("created_at", `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte("created_at", `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NotificationLog[];
    },
  });

  // Mark notification as read
  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notification_logs')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      refetch();
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadIds = logs?.filter(l => !l.is_read).map(l => l.id) || [];
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notification_logs')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (!error) {
      refetch();
    }
  };

  // Real-time subscription for new logs
  useEffect(() => {
    const channel = supabase
      .channel("notification-logs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification_logs",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notification-logs"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getStatusBadge = (status: string, finalStatus?: string | null) => {
    // If we have a final delivery status, show that instead
    if (finalStatus) {
      switch (finalStatus) {
        case "delivered":
          return (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Entregue
            </Badge>
          );
        case "read":
          return (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1">
              <Eye className="h-3 w-3" />
              Lido
            </Badge>
          );
        case "undelivered":
          return (
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Não Entregue
            </Badge>
          );
        case "failed":
          return (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
              <XCircle className="h-3 w-3" />
              Falha
            </Badge>
          );
      }
    }

    // Fallback to original status
    switch (status) {
      case "success":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
            <Truck className="h-3 w-3" />
            Enviado
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
            <XCircle className="h-3 w-3" />
            Falha
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 gap-1">
            <Clock className="h-3 w-3" />
            Processando
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFinalStatusBadge = (finalStatus: string | null, providerStatus: string | null) => {
    if (!finalStatus && !providerStatus) {
      return (
        <span className="text-xs text-muted-foreground">—</span>
      );
    }
    
    if (finalStatus) {
      return getStatusBadge("pending", finalStatus);
    }
    
    // Show provider status if no final status yet
    return (
      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1">
        <Clock className="h-3 w-3" />
        {providerStatus === 'queued' ? 'Na fila' : 
         providerStatus === 'sent' ? 'Enviando...' : 
         providerStatus === 'accepted' ? 'Aceito' : providerStatus}
      </Badge>
    );
  };

  const getEventTypeBadge = (eventType: string) => {
    const config = EVENT_TYPE_LABELS[eventType] || {
      label: eventType,
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência`,
    });
  };

  const clearFilters = () => {
    setChannelFilter("all");
    setStatusFilter("all");
    setReadFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const unreadCount = logs?.filter(l => !l.is_read).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Logs de Notificações</h2>
          <p className="text-sm text-muted-foreground">
            Histórico de todas as notificações enviadas pelo sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Marcar todas como lidas ({unreadCount})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Canal</Label>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Enviado</SelectItem>
              <SelectItem value="failed">Falha</SelectItem>
              <SelectItem value="pending">Processando</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Leitura</Label>
          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">Não lidas</SelectItem>
              <SelectItem value="read">Lidas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
          />
        </div>

        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Limpar
        </Button>
      </div>

      {/* Data Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[150px]">Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-[80px] text-center">Canal</TableHead>
              <TableHead className="w-[100px]">Envio</TableHead>
              <TableHead className="w-[120px]">Entrega</TableHead>
              <TableHead className="w-[80px] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : logs && logs.length > 0 ? (
              logs.map((log) => (
                <TableRow 
                  key={log.id} 
                  className={`hover:bg-muted/30 cursor-pointer ${!log.is_read ? 'bg-primary/5' : ''}`}
                  onClick={() => {
                    if (!log.is_read) {
                      markAsRead(log.id);
                    }
                    setSelectedLog(log);
                  }}
                >
                  <TableCell>
                    {!log.is_read && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell>{getEventTypeBadge(log.event_type)}</TableCell>
                  <TableCell className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="inline-flex items-center justify-center">
                            {log.channel === "email" ? (
                              <Mail className="h-5 w-5 text-blue-400" />
                            ) : log.channel === "sms" ? (
                              <Phone className="h-5 w-5 text-purple-400" />
                            ) : (
                              <MessageCircle className="h-5 w-5 text-green-400" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {log.channel === "email" ? "Email: " : log.channel === "sms" ? "SMS: " : "WhatsApp: "}
                            {log.recipient}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>{getFinalStatusBadge(log.final_status, log.provider_status)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!log.is_read) {
                            markAsRead(log.id);
                          }
                          setSelectedLog(log);
                        }}
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhum log de notificação encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stats Summary */}
      {logs && logs.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span>Total: {logs.length} registros</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            {logs.filter((l) => l.status === "success").length} enviados
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-400" />
            {logs.filter((l) => l.status === "failed").length} falhas
          </span>
        </div>
      )}

      {/* Details Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedLog?.channel === "email" ? (
                <Mail className="h-5 w-5 text-blue-400" />
              ) : selectedLog?.channel === "sms" ? (
                <Phone className="h-5 w-5 text-purple-400" />
              ) : (
                <MessageCircle className="h-5 w-5 text-green-400" />
              )}
              Detalhes da Notificação
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tipo do Evento</Label>
                    <div>{getEventTypeBadge(selectedLog.event_type)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status de Envio</Label>
                    <div>{getStatusBadge(selectedLog.status)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status de Entrega</Label>
                    <div>{getFinalStatusBadge(selectedLog.final_status, selectedLog.provider_status)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Canal</Label>
                    <p className="text-sm capitalize">{selectedLog.channel}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Destinatário</Label>
                    <p className="text-sm font-mono">{selectedLog.recipient}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data/Hora Envio</Label>
                    <p className="text-sm">
                      {formatDateTimeAt(selectedLog.created_at)}
                    </p>
                  </div>
                </div>

                {/* Delivery Tracking Section */}
                {(selectedLog.message_sid || selectedLog.final_status) && (
                  <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                    <Label className="text-xs text-muted-foreground font-semibold">Rastreio de Entrega</Label>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedLog.message_sid && (
                        <div className="space-y-1 col-span-2">
                          <Label className="text-xs text-muted-foreground">Message SID</Label>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-background px-2 py-1 rounded font-mono flex-1 overflow-hidden text-ellipsis">
                              {selectedLog.message_sid}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(selectedLog.message_sid!, 'Message SID')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedLog.provider_status && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Status do Provedor</Label>
                          <p className="text-sm capitalize">{selectedLog.provider_status}</p>
                        </div>
                      )}
                      {selectedLog.final_status && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Status Final</Label>
                          <p className="text-sm capitalize">{selectedLog.final_status}</p>
                        </div>
                      )}
                      {selectedLog.final_status_at && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Atualizado em</Label>
                          <p className="text-sm">{formatDateTimeAt(selectedLog.final_status_at)}</p>
                        </div>
                      )}
                      {selectedLog.delivery_attempts && selectedLog.delivery_attempts > 0 && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Tentativas</Label>
                          <p className="text-sm">{selectedLog.delivery_attempts}</p>
                        </div>
                      )}
                      {selectedLog.provider_error_code && (
                        <div className="space-y-1 col-span-2">
                          <Label className="text-xs text-red-400">Código de Erro</Label>
                          <p className="text-sm text-red-400">{selectedLog.provider_error_code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Subject (for email) */}
                {selectedLog.subject && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Assunto</Label>
                    <p className="text-sm bg-muted/30 p-2 rounded">{selectedLog.subject}</p>
                  </div>
                )}

                {/* Message Body */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Conteúdo da Mensagem</Label>
                  <div className="bg-muted/30 p-3 rounded text-sm whitespace-pre-wrap max-h-[200px] overflow-auto">
                    {selectedLog.message_body}
                  </div>
                </div>

                {/* Error Message */}
                {selectedLog.error_message && (
                  <div className="space-y-1">
                    <Label className="text-xs text-red-400">Mensagem de Erro</Label>
                    <div className="bg-red-500/10 border border-red-500/30 p-3 rounded text-sm text-red-400">
                      {selectedLog.error_message}
                    </div>
                  </div>
                )}

                {/* Fallback indicator */}
                {selectedLog.fallback_used && (
                  <div className="flex items-center gap-2 text-sm text-orange-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Fallback utilizado (WhatsApp → SMS)</span>
                  </div>
                )}

                {/* Metadata */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Variáveis Utilizadas</Label>
                    <div className="bg-muted/30 p-3 rounded text-xs font-mono overflow-auto">
                      <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationLogsTab;
