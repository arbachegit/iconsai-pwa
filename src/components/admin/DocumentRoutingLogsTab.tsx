import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, ArrowRight, CheckCircle2, XCircle, AlertCircle, ClipboardList } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";

export const DocumentRoutingLogsTab = () => {
  const { data: routingLogs, isLoading } = useQuery({
    queryKey: ["document-routing-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_routing_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case "auto_expanded":
        return <Badge className="bg-blue-500">Auto-Expandido</Badge>;
      case "manual_redirect":
        return <Badge className="bg-amber-500">Redirecionamento Manual</Badge>;
      case "kept_general":
        return <Badge variant="outline">Mantido como General</Badge>;
      default:
        return <Badge variant="secondary">{actionType}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      health: "bg-red-500",
      study: "bg-blue-500",
      general: "bg-gray-500",
    };
    
    return (
      <Badge className={colors[category as keyof typeof colors] || "bg-gray-500"}>
        {category}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <AdminTitleWithInfo
          title="Logs de Roteamento de Documentos"
          level="h2"
          icon={ClipboardList}
          tooltipText="Histórico de roteamento"
          infoContent={
            <>
              <p>Acompanhe como documentos foram direcionados entre categorias.</p>
              <p className="mt-2">Visualize Health, Study e General com ações, mudanças de escopo e disclaimers.</p>
            </>
          }
        />
        <p className="text-muted-foreground mb-2">
          Histórico completo de como documentos foram direcionados entre as categorias Health, Study e General.
        </p>
      </div>

      <Card className="p-6">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Categoria Original</TableHead>
                <TableHead className="text-center">→</TableHead>
                <TableHead>Categoria Final</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Escopo Alterado</TableHead>
                <TableHead>Disclaimer</TableHead>
                <TableHead>Session ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routingLogs && routingLogs.length > 0 ? (
                routingLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {new Date(log.created_at!).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{log.document_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryBadge(log.original_category)}</TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
                    </TableCell>
                    <TableCell>{getCategoryBadge(log.final_category)}</TableCell>
                    <TableCell>{getActionBadge(log.action_type)}</TableCell>
                    <TableCell className="text-center">
                      {log.scope_changed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {log.disclaimer_shown ? (
                        <AlertCircle className="h-5 w-5 text-amber-500 mx-auto" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.session_id || "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum log de roteamento encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {routingLogs && routingLogs.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Total de logs: {routingLogs.length}</p>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-muted/50">
        <h3 className="text-lg font-semibold mb-4">Legenda de Ações</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <Badge className="bg-blue-500 mt-0.5">Auto-Expandido</Badge>
            <p className="text-sm text-muted-foreground">
              Documentos Health ou Study são automaticamente expandidos no chat correspondente.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-amber-500 mt-0.5">Redirecionamento Manual</Badge>
            <p className="text-sm text-muted-foreground">
              Documentos General foram manualmente redirecionados para Health ou Study.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">Mantido como General</Badge>
            <p className="text-sm text-muted-foreground">
              Documentos General que permaneceram sem contexto específico de chat.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DocumentRoutingLogsTab;