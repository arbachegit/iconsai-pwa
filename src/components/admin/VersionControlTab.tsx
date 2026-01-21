import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Rocket, RefreshCw, Clock, Download, Undo2, Tag, FileText } from "lucide-react";
import { toast } from "sonner";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const VersionControlTab = () => {
  const [versionDialog, setVersionDialog] = useState<"minor" | "major" | "code_change" | null>(null);
  const [rollbackDialog, setRollbackDialog] = useState<{ open: boolean; versionId: string | null; version: string | null }>({
    open: false,
    versionId: null,
    version: null,
  });
  const [logMessage, setLogMessage] = useState("");
  const [rollbackMessage, setRollbackMessage] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const queryClient = useQueryClient();

  // Fetch version history
  const { data: versionData, isLoading } = useQuery({
    queryKey: ["version-control"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("version-control", {
        method: "GET",
      });

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Increment version mutation
  const incrementVersion = useMutation({
    mutationFn: async ({ action, message, notes, versionTags }: { 
      action: "minor" | "major" | "code_change"; 
      message: string;
      notes: string;
      versionTags: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke("version-control", {
        body: {
          action,
          log_message: message,
          associated_data: {
            manual_trigger: true,
            triggered_by: "admin",
            timestamp: new Date().toISOString(),
            release_notes: notes,
            tags: versionTags,
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Versão atualizada: ${data.previous_version} → ${data.new_version}`
      );
      queryClient.invalidateQueries({ queryKey: ["version-control"] });
      setVersionDialog(null);
      setLogMessage("");
      setReleaseNotes("");
      setTags([]);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar versão: ${error.message}`);
    },
  });

  const handleVersionUpdate = (action: "minor" | "major" | "code_change") => {
    if (!logMessage.trim()) {
      toast.error("Por favor, descreva a mudança");
      return;
    }
    incrementVersion.mutate({ 
      action, 
      message: logMessage,
      notes: releaseNotes,
      versionTags: tags
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async ({ versionId, message }: { versionId: string; message: string }) => {
      const { data, error } = await supabase.functions.invoke("version-control", {
        body: {
          action: "rollback",
          target_version_id: versionId,
          log_message: message,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Rollback realizado: ${data.rolled_back_to} → ${data.new_version}`);
      queryClient.invalidateQueries({ queryKey: ["version-control"] });
      setRollbackDialog({ open: false, versionId: null, version: null });
      setRollbackMessage("");
    },
    onError: (error) => {
      toast.error(`Erro no rollback: ${error.message}`);
    },
  });

  // Export changelog mutation
  const exportChangelog = useMutation({
    mutationFn: async (format: "markdown" | "json") => {
      const { data, error } = await supabase.functions.invoke("version-control", {
        body: {
          action: "export_changelog",
          format,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data.content], { type: data.format === "json" ? "application/json" : "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `changelog-knowyou.${data.format === "json" ? "json" : "md"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Changelog exportado (${data.format})`);
    },
    onError: (error) => {
      toast.error(`Erro ao exportar: ${error.message}`);
    },
  });

  const handleRollback = () => {
    if (!rollbackMessage.trim()) {
      toast.error("Por favor, descreva a razão do rollback");
      return;
    }
    if (!rollbackDialog.versionId) return;
    rollbackMutation.mutate({ versionId: rollbackDialog.versionId, message: rollbackMessage });
  };

  const getTriggerTypeBadge = (type: string) => {
    const variants = {
      AUTO_PATCH: { variant: "secondary" as const, label: "Auto Patch" },
      MANUAL_MINOR: { variant: "default" as const, label: "Minor" },
      MANUAL_MAJOR: { variant: "destructive" as const, label: "Major" },
      CODE_CHANGE: { variant: "outline" as const, label: "Code Change" },
      INITIAL: { variant: "outline" as const, label: "Inicial" },
      ROLLBACK: { variant: "outline" as const, label: "Rollback" },
    };
    const config = variants[type as keyof typeof variants] || variants.INITIAL;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentVersion = versionData?.current_version || "0.0.0";
  const history = versionData?.history || [];
  const [major, minor, patch] = currentVersion.split(".");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <AdminTitleWithInfo
            title="Controle de Versão"
            level="h2"
            icon={GitBranch}
            tooltipText="Sistema de versionamento"
            infoContent={
              <>
                <p>Gerencie versões automáticas e manuais do sistema.</p>
                <p className="mt-2">Incremente patches, minor releases ou major versions. Exporte changelog e faça rollback quando necessário.</p>
              </>
            }
          />
          <p className="text-muted-foreground mt-1">
            Sistema de versionamento automático e manual
          </p>
        </div>
      </div>

      {/* Current Version Card */}
      <Card className="p-8 border-primary/20 bg-gradient-to-br from-card to-card/50">
        <div className="text-center space-y-6">
          <h3 className="text-xl font-semibold text-muted-foreground">
            Versão Atual
          </h3>
          
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-6xl font-bold text-gradient">{major}</div>
              <div className="text-sm text-muted-foreground mt-2">Major</div>
            </div>
            <div className="text-4xl text-muted-foreground">.</div>
            <div className="text-center">
              <div className="text-6xl font-bold text-gradient">{minor}</div>
              <div className="text-sm text-muted-foreground mt-2">Minor</div>
            </div>
            <div className="text-4xl text-muted-foreground">.</div>
            <div className="text-center">
              <div className="text-6xl font-bold text-gradient">{patch}</div>
              <div className="text-sm text-muted-foreground mt-2">Patch</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              onClick={() => setVersionDialog("code_change")}
              variant="outline"
              className="gap-2"
              size="lg"
            >
              <GitBranch className="h-4 w-4" />
              Mudanças de Código
            </Button>
            <Button
              onClick={() => setVersionDialog("minor")}
              className="gap-2 bg-gradient-primary"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              Versionamento (Minor)
            </Button>
            <Button
              onClick={() => setVersionDialog("major")}
              variant="destructive"
              className="gap-2"
              size="lg"
            >
              <Rocket className="h-4 w-4" />
              Produção (Major)
            </Button>
            <Button
              onClick={() => exportChangelog.mutate("markdown")}
              variant="outline"
              className="gap-2"
              size="lg"
              disabled={exportChangelog.isPending}
            >
              <Download className="h-4 w-4" />
              Exportar Changelog
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-secondary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/20 rounded-lg">
              <GitBranch className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{patch}</div>
              <div className="text-sm text-muted-foreground">Patches Automáticos</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{minor}</div>
              <div className="text-sm text-muted-foreground">Releases Minor</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-destructive/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/20 rounded-lg">
              <Rocket className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <div className="text-2xl font-bold">{major}</div>
              <div className="text-sm text-muted-foreground">Versões de Produção</div>
            </div>
          </div>
        </Card>
      </div>

      {/* History Table */}
      <Card className="p-6 border-primary/20">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Histórico de Alterações
        </h3>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum histórico disponível
                  </TableCell>
                </TableRow>
              ) : (
                history.map((record: any, index: number) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(record.timestamp).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-bold">{record.current_version}</TableCell>
                    <TableCell>{getTriggerTypeBadge(record.trigger_type)}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {record.log_message}
                    </TableCell>
                    <TableCell>
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRollbackDialog({ 
                            open: true, 
                            versionId: record.id, 
                            version: record.current_version 
                          })}
                          title="Rollback para esta versão"
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Badge variant="secondary">Auto Patch</Badge>
            <span className="text-muted-foreground">
              Automático após upload RAG (Z+1)
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Badge variant="outline">Code Change</Badge>
            <span className="text-muted-foreground">
              Manual - mudanças de código (frontend, Edge Functions, i18n) (Z+1)
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Badge variant="default">Minor</Badge>
            <span className="text-muted-foreground">
              Manual - agrupa patches em release (Y+1, Z=0)
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Badge variant="destructive">Major</Badge>
            <span className="text-muted-foreground">
              Manual - versão de produção estável (X+1, Y=0, Z=0)
            </span>
          </p>
        </div>
      </Card>

      {/* Version Update Dialog */}
      <Dialog
        open={versionDialog !== null}
        onOpenChange={(open) => !open && setVersionDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {versionDialog === "code_change" 
                ? "Registrar Mudanças de Código"
                : versionDialog === "minor" 
                ? "Atualização Minor" 
                : "Lançamento Major"}
            </DialogTitle>
            <DialogDescription>
              {versionDialog === "code_change"
                ? "Registre mudanças no código (frontend, Edge Functions, i18n). Isso incrementará o patch automaticamente."
                : versionDialog === "minor"
                ? "Agrupe as mudanças recentes em uma nova release. Isso incrementará o segundo número da versão."
                : "Lance uma nova versão de produção estável. Isso incrementará o primeiro número da versão."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="log-message">Título da Mudança</Label>
              <Input
                id="log-message"
                placeholder={
                  versionDialog === "code_change"
                    ? "ex: Implementação de UX/UI: botão copiar, mini player flutuante, design tokens"
                    : versionDialog === "minor"
                    ? "ex: Melhorias no sistema RAG e interface admin"
                    : "ex: Lançamento oficial da plataforma KnowYOU v1.0"
                }
                value={logMessage}
                onChange={(e) => setLogMessage(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="release-notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Release Notes (Markdown)
              </Label>
              <Textarea
                id="release-notes"
                placeholder="# Principais Mudanças&#10;&#10;- Feature 1: Descrição...&#10;- Feature 2: Descrição...&#10;&#10;## Melhorias&#10;- Melhoria 1&#10;- Melhoria 2&#10;&#10;## Correções&#10;- Bug fix 1"
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                className="mt-2 min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Suporta Markdown. Este conteúdo será incluído no changelog e email de notificação.
              </p>
            </div>

            <div>
              <Label htmlFor="tags" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tags"
                  placeholder="ex: breaking-change, feature, bugfix"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Adicionar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Sugestões: breaking-change, feature, bugfix, security, rag-update
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Versão atual:</p>
              <p className="text-2xl font-bold text-gradient">{currentVersion}</p>
              <p className="text-sm font-medium mt-3 mb-1">Nova versão:</p>
              <p className="text-2xl font-bold text-gradient">
                {versionDialog === "minor"
                  ? `${major}.${parseInt(minor) + 1}.0`
                  : `${parseInt(major) + 1}.0.0`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVersionDialog(null);
                setLogMessage("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleVersionUpdate(versionDialog!)}
              disabled={!logMessage.trim() || incrementVersion.isPending}
              className="bg-gradient-primary"
            >
              {incrementVersion.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                `Confirmar ${versionDialog === "minor" ? "Minor" : "Major"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog
        open={rollbackDialog.open}
        onOpenChange={(open) => !open && setRollbackDialog({ open: false, versionId: null, version: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback para Versão {rollbackDialog.version}</DialogTitle>
            <DialogDescription>
              Restaurar o estado do sistema para uma versão anterior. Isso criará uma nova entrada no histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm font-medium text-yellow-600">⚠️ Atenção</p>
              <p className="text-sm text-muted-foreground mt-1">
                O rollback não desfaz alterações no banco de dados. Ele apenas restaura os dados 
                associados à versão selecionada e cria uma nova entrada no histórico.
              </p>
            </div>
            <div>
              <Label htmlFor="rollback-message">Motivo do Rollback</Label>
              <Input
                id="rollback-message"
                placeholder="ex: Reverter mudanças problemáticas no sistema RAG"
                value={rollbackMessage}
                onChange={(e) => setRollbackMessage(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Versão atual:</p>
              <p className="text-2xl font-bold text-gradient">{currentVersion}</p>
              <p className="text-sm font-medium mt-3 mb-1">Restaurar para:</p>
              <p className="text-2xl font-bold text-gradient">{rollbackDialog.version}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRollbackDialog({ open: false, versionId: null, version: null });
                setRollbackMessage("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRollback}
              disabled={!rollbackMessage.trim() || rollbackMutation.isPending}
              variant="destructive"
            >
              {rollbackMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Realizando Rollback...
                </>
              ) : (
                <>
                  <Undo2 className="h-4 w-4 mr-2" />
                  Confirmar Rollback
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VersionControlTab;
