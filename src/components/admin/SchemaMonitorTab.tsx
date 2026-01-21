import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Shield, Key, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RLSResult {
  status: string;
  has_rls: boolean;
  policy_count: number;
  operations_covered: string[];
  missing_operations: string[];
}

interface FKResult {
  status: string;
  constraint_name: string;
  target_table: string;
  target_column: string;
}

interface SchemaCheckResult {
  success: boolean;
  summary: {
    timestamp: string;
    total_divergences: number;
    critical: number;
    warnings: number;
    tables_checked: number;
    functions_checked: number;
    rls_tables_checked?: number;
    fk_tables_checked?: number;
    all_ok: boolean;
  };
  results: {
    tables: Record<string, { status: string; columns?: string[]; missing?: string[] }>;
    functions: Record<string, { status: string }>;
    references: Record<string, { status: string; contains_required?: boolean; contains_forbidden?: boolean }>;
    rls_policies?: Record<string, RLSResult>;
    foreign_keys?: Record<string, FKResult[]>;
  };
  divergences: Array<{
    check_type: string;
    entity_name: string;
    expected_state: object;
    actual_state: object;
    divergence_type: string;
    severity: string;
  }>;
}

interface AuditLogEntry {
  id: string;
  check_type: string;
  entity_name: string;
  divergence_type: string;
  severity: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
}

const SchemaMonitorTab = () => {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<SchemaCheckResult | null>(null);

  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["schema-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schema_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  const runCheckMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("schema-monitor");
      if (error) throw error;
      return data as SchemaCheckResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ["schema-audit-logs"] });
      if (data.summary.all_ok) {
        toast.success("Schema íntegro!");
      } else {
        toast.warning(`${data.summary.total_divergences} divergência(s) encontrada(s)`);
      }
    },
    onError: (error) => toast.error("Erro: " + (error as Error).message),
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("schema_audit_log").update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: "admin",
        resolution_notes: notes,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schema-audit-logs"] });
      toast.success("Divergência resolvida");
    },
  });

  const getSeverityBadge = (severity: string) => {
    if (severity === "critical") return <Badge variant="destructive">Crítico</Badge>;
    if (severity === "warning") return <Badge className="bg-yellow-500/20 text-yellow-600">Aviso</Badge>;
    return <Badge variant="outline">Info</Badge>;
  };

  const getStatusIcon = (status: string) => {
    if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === "missing" || status === "rls_disabled") return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const pendingLogs = auditLogs?.filter(log => !log.is_resolved) || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Monitor de Schema
          </h2>
          <p className="text-muted-foreground">Verificação de integridade, RLS e relações</p>
        </div>
        <Button onClick={() => runCheckMutation.mutate()} disabled={runCheckMutation.isPending}>
          {runCheckMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Verificar Agora
        </Button>
      </div>

      {lastResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Status</p><p className="text-2xl font-bold">{lastResult.summary.all_ok ? "OK" : "Problemas"}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Críticos</p><p className="text-2xl font-bold text-red-500">{lastResult.summary.critical}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Avisos</p><p className="text-2xl font-bold text-yellow-500">{lastResult.summary.warnings}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Última Verificação</p><p className="text-sm">{new Date(lastResult.summary.timestamp).toLocaleString("pt-BR")}</p></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Status Atual</TabsTrigger>
          <TabsTrigger value="rls"><Shield className="h-4 w-4 mr-1" />RLS</TabsTrigger>
          <TabsTrigger value="fk"><Link2 className="h-4 w-4 mr-1" />FK</TabsTrigger>
          <TabsTrigger value="history">Histórico {pendingLogs.length > 0 && <Badge variant="destructive" className="ml-2">{pendingLogs.length}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          {lastResult ? (
            <div className="grid md:grid-cols-2 gap-4">
              <Card><CardHeader><CardTitle className="text-lg">Tabelas</CardTitle></CardHeader><CardContent><div className="space-y-2">
                {Object.entries(lastResult.results.tables).map(([t, r]) => (
                  <div key={t} className="flex items-center justify-between p-2 border rounded">{getStatusIcon(r.status)}<span className="font-mono text-sm flex-1 ml-2">{t}</span><Badge variant={r.status === "ok" ? "default" : "destructive"}>{r.status}</Badge></div>
                ))}
              </div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-lg">Funções</CardTitle></CardHeader><CardContent><div className="space-y-2">
                {Object.entries(lastResult.results.functions).map(([f, r]) => (
                  <div key={f} className="flex items-center justify-between p-2 border rounded">{getStatusIcon(r.status)}<span className="font-mono text-sm flex-1 ml-2">{f}</span><Badge variant={r.status === "ok" ? "default" : "destructive"}>{r.status}</Badge></div>
                ))}
              </div></CardContent></Card>
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center"><Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Clique em "Verificar Agora"</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="rls">
          {lastResult?.results.rls_policies ? (
            <Card><CardHeader><CardTitle><Shield className="h-5 w-5 inline mr-2" />RLS Policies</CardTitle></CardHeader><CardContent>
              <Table><TableHeader><TableRow><TableHead>Tabela</TableHead><TableHead>RLS</TableHead><TableHead>Políticas</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{Object.entries(lastResult.results.rls_policies).map(([t, r]) => (
                <TableRow key={t}><TableCell className="font-mono text-sm">{t}</TableCell><TableCell>{r.has_rls ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell><TableCell><Badge variant="outline">{r.policy_count}</Badge></TableCell><TableCell>{getStatusIcon(r.status)}</TableCell></TableRow>
              ))}</TableBody></Table>
            </CardContent></Card>
          ) : <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Execute uma verificação</p></CardContent></Card>}
        </TabsContent>

        <TabsContent value="fk">
          {lastResult?.results.foreign_keys && Object.keys(lastResult.results.foreign_keys).length > 0 ? (
            <Card><CardHeader><CardTitle><Key className="h-5 w-5 inline mr-2" />Foreign Keys</CardTitle></CardHeader><CardContent>
              <Table><TableHeader><TableRow><TableHead>Origem</TableHead><TableHead>Constraint</TableHead><TableHead>Destino</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{Object.entries(lastResult.results.foreign_keys).flatMap(([t, fks]) => fks.map((fk, i) => (
                <TableRow key={`${t}-${i}`}><TableCell className="font-mono text-sm">{t}</TableCell><TableCell className="font-mono text-xs">{fk.constraint_name}</TableCell><TableCell className="font-mono text-sm">{fk.target_table}.{fk.target_column}</TableCell><TableCell>{getStatusIcon(fk.status)}</TableCell></TableRow>
              )))}</TableBody></Table>
            </CardContent></Card>
          ) : <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Execute uma verificação</p></CardContent></Card>}
        </TabsContent>

        <TabsContent value="history">
          <Card><CardHeader><CardTitle>Histórico</CardTitle></CardHeader><CardContent>
            {logsLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : auditLogs?.length ? (
              <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Entidade</TableHead><TableHead>Tipo</TableHead><TableHead>Severidade</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
              <TableBody>{auditLogs.map(log => (
                <TableRow key={log.id}><TableCell className="text-sm">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell><TableCell className="font-mono text-sm">{log.entity_name}</TableCell><TableCell>{log.divergence_type}</TableCell><TableCell>{getSeverityBadge(log.severity)}</TableCell><TableCell>{log.is_resolved ? <Badge className="bg-green-500">Resolvido</Badge> : <Badge variant="destructive">Pendente</Badge>}</TableCell><TableCell>{!log.is_resolved && <Button size="sm" variant="outline" onClick={() => resolveMutation.mutate({ id: log.id, notes: "Resolvido" })}>Resolver</Button>}</TableCell></TableRow>
              ))}</TableBody></Table>
            ) : <p className="text-center text-muted-foreground py-8">Nenhum registro</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SchemaMonitorTab;