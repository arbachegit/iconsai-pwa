import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/date-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Search,
  RefreshCw,
  Eye,
  Mail,
  MessageSquare,
  Monitor,
  Smartphone,
  ArrowRight,
} from "lucide-react";

interface AuditEntry {
  id: string;
  invitation_id: string | null;
  invitation_token: string | null;
  action: string;
  actor_user_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  computed_policy: Record<string, any> | null;
  notes: string | null;
  created_at: string;
}

export const InvitationChannelAuditTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ["invitation-channel-audit", searchQuery, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("invitation_channel_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchQuery) {
        query = query.or(`invitation_token.ilike.%${searchQuery}%`);
      }
      if (dateFrom) {
        query = query.gte("created_at", `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte("created_at", `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditEntry[];
    },
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "create":
        return <Badge className="bg-green-500/20 text-green-400">Criado</Badge>;
      case "update":
        return <Badge className="bg-blue-500/20 text-blue-400">Atualizado</Badge>;
      case "resend":
        return <Badge className="bg-purple-500/20 text-purple-400">Reenviado</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const renderChannelIcons = (values: Record<string, any> | null) => {
    if (!values) return null;
    return (
      <div className="flex items-center gap-1">
        {values.send_via_email && <Mail className="h-4 w-4 text-blue-400" />}
        {values.send_via_whatsapp && <MessageSquare className="h-4 w-4 text-green-400" />}
      </div>
    );
  };

  const renderProductIcons = (values: Record<string, any> | null) => {
    if (!values) return null;
    return (
      <div className="flex items-center gap-1">
        {values.has_platform_access && <Monitor className="h-4 w-4 text-violet-400" />}
        {values.has_app_access && <Smartphone className="h-4 w-4 text-emerald-400" />}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6" />
            Auditoria de Convites
          </h2>
          <p className="text-sm text-muted-foreground">
            Histórico de alterações nas regras de canal e produto dos convites
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Buscar por Token</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Token do convite..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchQuery("");
            setDateFrom("");
            setDateTo("");
          }}
        >
          Limpar
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[160px]">Data/Hora</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Token</TableHead>
              <TableHead className="text-center">Produto</TableHead>
              <TableHead className="text-center">Canais</TableHead>
              <TableHead className="text-center">Política Aplicada</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries && entries.length > 0 ? (
              entries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm">
                    {formatDateTime(entry.created_at)}
                  </TableCell>
                  <TableCell>{getActionBadge(entry.action)}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[120px] truncate">
                    {entry.invitation_token?.slice(0, 12)}...
                  </TableCell>
                  <TableCell className="text-center">
                    {renderProductIcons(entry.new_values)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderChannelIcons(entry.new_values)}
                  </TableCell>
                  <TableCell className="text-center">
                    {entry.computed_policy?.enforced_whatsapp && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                        WhatsApp forçado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedEntry(entry)}
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhum registro de auditoria encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Detalhes da Alteração
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Ação</Label>
                    <div>{getActionBadge(selectedEntry.action)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data/Hora</Label>
                    <p className="text-sm">{formatDateTime(selectedEntry.created_at)}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-muted-foreground">Token do Convite</Label>
                    <p className="text-sm font-mono bg-muted/30 p-2 rounded break-all">
                      {selectedEntry.invitation_token}
                    </p>
                  </div>
                </div>

                {/* Values Comparison */}
                {selectedEntry.old_values && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Comparação de Valores</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-red-500/10 p-3 rounded border border-red-500/20">
                        <p className="text-xs font-medium text-red-400 mb-2">Antes</p>
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(selectedEntry.old_values, null, 2)}
                        </pre>
                      </div>
                      <div className="bg-green-500/10 p-3 rounded border border-green-500/20">
                        <p className="text-xs font-medium text-green-400 mb-2">Depois</p>
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(selectedEntry.new_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Computed Policy */}
                {selectedEntry.computed_policy && Object.keys(selectedEntry.computed_policy).length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Política Computada</Label>
                    <div className="bg-muted/30 p-3 rounded text-xs font-mono overflow-auto">
                      <pre>{JSON.stringify(selectedEntry.computed_policy, null, 2)}</pre>
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

export default InvitationChannelAuditTab;
