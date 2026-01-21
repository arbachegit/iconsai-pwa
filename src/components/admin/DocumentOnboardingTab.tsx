import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileCheck,
  FileQuestion,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Sparkles,
  Eye,
  Check,
  X,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface OnboardingStats {
  total_onboarded: number;
  pending_documents: number;
  pending_review: number;
  auto_classified: number;
  no_suggestions: number;
  errors: number;
  avg_confidence: number | null;
  last_24h_count: number;
}

interface OnboardingLogItem {
  id: string;
  document_id: string;
  status: string;
  total_suggestions: number | null;
  auto_applied_count: number | null;
  highest_confidence: number | null;
  avg_confidence: number | null;
  processing_time_ms: number | null;
  source_text_preview: string | null;
  suggested_taxonomies: {
    taxonomy_id: string;
    taxonomy_code: string;
    taxonomy_name: string;
    confidence: number;
    auto_applied: boolean;
  }[] | null;
  applied_taxonomies: {
    taxonomy_id: string;
    taxonomy_code: string;
    taxonomy_name: string;
  }[] | null;
  error_message: string | null;
  created_at: string;
  filename?: string;
  ai_title?: string | null;
  needs_title_review?: boolean | null;
  target_chat?: string;
}

export const DocumentOnboardingTab = () => {
  const [selectedDoc, setSelectedDoc] = useState<OnboardingLogItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"pending" | "review" | "completed">("pending");

  // Fetch onboarding stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["onboarding-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_onboarding_stats");
      if (error) throw error;
      // RPC returns an array with one row
      return (data as any[])?.[0] as OnboardingStats;
    },
  });

  // Fetch pending onboarding documents
  const { data: pendingDocs, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ["pending-onboarding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, filename, ai_title, needs_title_review, target_chat, created_at, ai_summary")
        .not("id", "in", `(SELECT document_id FROM document_onboarding_log)`)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch documents pending review
  const { data: reviewDocs, isLoading: reviewLoading, refetch: refetchReview } = useQuery({
    queryKey: ["review-onboarding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_onboarding_log")
        .select(`
          id,
          document_id,
          status,
          total_suggestions,
          auto_applied_count,
          highest_confidence,
          avg_confidence,
          processing_time_ms,
          source_text_preview,
          suggested_taxonomies,
          applied_taxonomies,
          error_message,
          created_at,
          documents!inner(filename, ai_title, needs_title_review, target_chat)
        `)
        .eq("status", "pending_review")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        ...item,
        filename: item.documents?.filename,
        ai_title: item.documents?.ai_title,
        needs_title_review: item.documents?.needs_title_review,
        target_chat: item.documents?.target_chat,
      })) as OnboardingLogItem[];
    },
  });

  // Fetch completed onboarding
  const { data: completedDocs, isLoading: completedLoading, refetch: refetchCompleted } = useQuery({
    queryKey: ["completed-onboarding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_onboarding_log")
        .select(`
          id,
          document_id,
          status,
          total_suggestions,
          auto_applied_count,
          highest_confidence,
          avg_confidence,
          processing_time_ms,
          source_text_preview,
          suggested_taxonomies,
          applied_taxonomies,
          error_message,
          created_at,
          documents!inner(filename, ai_title, needs_title_review, target_chat)
        `)
        .in("status", ["completed", "reviewed", "failed"])
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        ...item,
        filename: item.documents?.filename,
        ai_title: item.documents?.ai_title,
        needs_title_review: item.documents?.needs_title_review,
        target_chat: item.documents?.target_chat,
      })) as OnboardingLogItem[];
    },
  });

  // Trigger onboarding for a document
  const triggerOnboarding = useCallback(async (documentId: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc("trigger_document_onboarding" as any, {
        p_document_id: documentId,
      });
      
      if (error) throw error;
      
      const result = (data as any[])?.[0];
      if (result?.status === "success" || result?.status === "pending_review" || result?.status === "completed") {
        toast.success("Onboarding iniciado com sucesso");
        refetchStats();
        refetchPending();
        refetchReview();
      } else {
        toast.error(result?.message || "Erro ao iniciar onboarding");
      }
    } catch (error: any) {
      console.error("Erro ao iniciar onboarding:", error);
      toast.error("Erro ao processar documento");
    } finally {
      setIsProcessing(false);
    }
  }, [refetchStats, refetchPending, refetchReview]);

  // Process pending onboarding queue
  const processQueue = useCallback(async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc("process_pending_onboarding" as any, {
        p_limit: 10,
      });
      
      if (error) throw error;
      
      const result = (data as any[])?.[0];
      toast.success(`Processados ${result?.processed || 0} documentos`);
      refetchStats();
      refetchPending();
      refetchReview();
    } catch (error: any) {
      console.error("Erro ao processar fila:", error);
      toast.error("Erro ao processar fila de onboarding");
    } finally {
      setIsProcessing(false);
    }
  }, [refetchStats, refetchPending, refetchReview]);

  // Apply taxonomy suggestion
  const applySuggestion = useCallback(async (
    documentId: string,
    taxonomyId: string,
    logId: string
  ) => {
    try {
      // Insert entity tag
      const { error: insertError } = await supabase
        .from("entity_tags")
        .insert({
          entity_id: documentId,
          entity_type: "document",
          taxonomy_id: taxonomyId,
          source: "manual",
          confidence: 1.0,
        });
      
      if (insertError) throw insertError;

      // Update log with applied taxonomy
      const currentLog = reviewDocs?.find(d => d.id === logId);
      const appliedTaxonomies = currentLog?.applied_taxonomies || [];
      const suggestedTax = currentLog?.suggested_taxonomies?.find(t => t.taxonomy_id === taxonomyId);
      
      if (suggestedTax) {
        const { error: updateError } = await supabase
          .from("document_onboarding_log")
          .update({
            applied_taxonomies: [...appliedTaxonomies, {
              taxonomy_id: taxonomyId,
              taxonomy_code: suggestedTax.taxonomy_code,
              taxonomy_name: suggestedTax.taxonomy_name,
            }],
          })
          .eq("id", logId);
        
        if (updateError) throw updateError;
      }

      toast.success("Taxonomia aplicada com sucesso");
      refetchReview();
    } catch (error: any) {
      console.error("Erro ao aplicar taxonomia:", error);
      toast.error("Erro ao aplicar taxonomia");
    }
  }, [reviewDocs, refetchReview]);

  // Complete review
  const completeReview = useCallback(async (logId: string) => {
    try {
      const { error } = await supabase
        .from("document_onboarding_log")
        .update({ status: "reviewed" })
        .eq("id", logId);
      
      if (error) throw error;

      toast.success("Revisão concluída");
      refetchStats();
      refetchReview();
      refetchCompleted();
      setSelectedDoc(null);
    } catch (error: any) {
      console.error("Erro ao concluir revisão:", error);
      toast.error("Erro ao concluir revisão");
    }
  }, [refetchStats, refetchReview, refetchCompleted]);

  const refetchAll = useCallback(() => {
    refetchStats();
    refetchPending();
    refetchReview();
    refetchCompleted();
  }, [refetchStats, refetchPending, refetchReview, refetchCompleted]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">Auto-aplicado</Badge>;
      case "pending_review":
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">Pendente Revisão</Badge>;
      case "reviewed":
        return <Badge variant="default" className="bg-blue-500/20 text-blue-500 border-blue-500/30">Revisado</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return "text-muted-foreground";
    if (confidence >= 0.8) return "text-green-500";
    if (confidence >= 0.6) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Onboarding de Documentos</h1>
          <p className="text-muted-foreground">
            Gerencie o processo de classificação automática de taxonomias para novos documentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={statsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            onClick={processQueue}
            disabled={isProcessing || (pendingDocs?.length || 0) === 0}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Processar Fila
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente Onboarding</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats?.pending_documents || pendingDocs?.length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente Revisão</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats?.pending_review || reviewDocs?.length || 0}
                </p>
              </div>
              <FileQuestion className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto-classificados</p>
                <p className="text-2xl font-bold text-green-600">{stats?.auto_classified || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confiança Média</p>
                <p className="text-2xl font-bold text-primary">
                  {stats?.avg_confidence 
                    ? `${(stats.avg_confidence * 100).toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-primary/50" />
            </div>
            {stats?.avg_confidence && (
              <Progress value={stats.avg_confidence * 100} className="mt-2" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Onboarded</p>
                <p className="text-2xl font-bold">{stats?.total_onboarded || 0}</p>
              </div>
              <FileCheck className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sem Sugestões</p>
                <p className="text-2xl font-bold text-muted-foreground">{stats?.no_suggestions || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-2xl font-bold text-red-600">{stats?.errors || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendente Onboarding
            {(pendingDocs?.length || 0) > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingDocs?.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4" />
            Pendente Revisão
            {(reviewDocs?.length || 0) > 0 && (
              <Badge variant="outline" className="ml-1 border-yellow-500/50 text-yellow-500">
                {reviewDocs?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Concluídos
          </TabsTrigger>
        </TabsList>

        {/* Pending Onboarding Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Aguardando Onboarding</CardTitle>
              <CardDescription>
                Documentos que ainda não passaram pelo processo de classificação de taxonomias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Chat</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : !pendingDocs?.length ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum documento pendente
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingDocs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="max-w-[300px]">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{doc.ai_title || doc.filename}</p>
                                {doc.ai_title && doc.needs_title_review && (
                                  <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-500 shrink-0">
                                    IA
                                  </Badge>
                                )}
                              </div>
                              {doc.ai_title && (
                                <p className="text-xs text-muted-foreground truncate">{doc.filename}</p>
                              )}
                              {doc.ai_summary && (
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {doc.ai_summary}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.target_chat}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => triggerOnboarding(doc.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4 mr-1" />
                              )}
                              Processar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Review Tab */}
        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Pendentes de Revisão</CardTitle>
              <CardDescription>
                Revise e aprove as sugestões de taxonomia para estes documentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Chat</TableHead>
                      <TableHead>Sugestões</TableHead>
                      <TableHead>Confiança</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : !reviewDocs?.length ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum documento pendente de revisão
                        </TableCell>
                      </TableRow>
                    ) : (
                      reviewDocs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="max-w-[250px]">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{doc.ai_title || doc.filename}</p>
                                {doc.ai_title && doc.needs_title_review && (
                                  <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-500 shrink-0">
                                    IA
                                  </Badge>
                                )}
                              </div>
                              {doc.ai_title && (
                                <p className="text-xs text-muted-foreground truncate">{doc.filename}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.target_chat}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{doc.total_suggestions || 0}</span>
                            <span className="text-muted-foreground text-sm ml-1">
                              ({doc.auto_applied_count || 0} auto)
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={getConfidenceColor(doc.highest_confidence)}>
                              {doc.highest_confidence
                                ? `${(doc.highest_confidence * 100).toFixed(0)}%`
                                : "N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedDoc(doc)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Revisar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Concluído</CardTitle>
              <CardDescription>
                Histórico de documentos processados pelo sistema de onboarding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Taxonomias</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : !completedDocs?.length ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum documento processado ainda
                        </TableCell>
                      </TableRow>
                    ) : (
                      completedDocs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="max-w-[250px]">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{doc.ai_title || doc.filename}</p>
                                {doc.ai_title && doc.needs_title_review && (
                                  <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-500 shrink-0">
                                    IA
                                  </Badge>
                                )}
                              </div>
                              {doc.ai_title && (
                                <p className="text-xs text-muted-foreground truncate">{doc.filename}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {(doc.applied_taxonomies?.length || 0) + (doc.auto_applied_count || 0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {doc.processing_time_ms
                              ? `${(doc.processing_time_ms / 1000).toFixed(1)}s`
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Sugestões de Taxonomia</DialogTitle>
            <DialogDescription>
              {selectedDoc?.ai_title || selectedDoc?.filename}
              {selectedDoc?.ai_title && (
                <span className="block text-xs mt-1">{selectedDoc?.filename}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview text */}
            {selectedDoc?.source_text_preview && (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Preview do texto:</p>
                <p className="text-sm line-clamp-3">{selectedDoc.source_text_preview}</p>
              </div>
            )}

            {/* Suggestions List */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Sugestões de Taxonomia:</p>
              {selectedDoc?.suggested_taxonomies?.length ? (
                <div className="space-y-2">
                  {selectedDoc.suggested_taxonomies.map((tax) => {
                    const isApplied = selectedDoc.applied_taxonomies?.some(
                      (a) => a.taxonomy_id === tax.taxonomy_id
                    ) || tax.auto_applied;

                    return (
                      <div
                        key={tax.taxonomy_id}
                        className={`flex items-center justify-between p-3 rounded-md border ${
                          isApplied ? "bg-green-500/10 border-green-500/30" : "bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <Badge variant="outline" className="mr-2">
                              {tax.taxonomy_code}
                            </Badge>
                            <span className="font-medium">{tax.taxonomy_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm ${getConfidenceColor(tax.confidence)}`}>
                            {(tax.confidence * 100).toFixed(0)}%
                          </span>
                          {isApplied ? (
                            <Badge variant="default" className="bg-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Aplicado
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                applySuggestion(
                                  selectedDoc.document_id,
                                  tax.taxonomy_id,
                                  selectedDoc.id
                                )
                              }
                            >
                              Aplicar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma sugestão disponível</p>
              )}
            </div>

            {/* Error message */}
            {selectedDoc?.error_message && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-md">
                <p className="text-sm text-red-500">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  {selectedDoc.error_message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedDoc(null)}>
                Fechar
              </Button>
              <Button onClick={() => selectedDoc && completeReview(selectedDoc.id)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Concluir Revisão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentOnboardingTab;
