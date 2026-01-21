import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  RefreshCcw, 
  Play, 
  Pause, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Tags,
  AlertTriangle,
  Loader2,
  BarChart3,
  Filter
} from "lucide-react";

interface CoverageStats {
  total_documents: number;
  documents_with_taxonomy: number;
  documents_without_taxonomy: number;
  coverage_percentage: number;
  pending_classification: number;
  low_confidence_count: number;
}

interface ReclassificationJob {
  id: string;
  filter: string;
  batch_size: number;
  auto_approve_threshold: number;
  status: string;
  total_documents: number;
  processed_documents: number;
  auto_approved_count: number;
  pending_review_count: number;
  error_count: number;
  current_batch: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface DocumentForReview {
  document_id: string;
  filename: string;
  target_chat: string;
  ai_summary: string | null;
  text_preview: string | null;
  created_at: string;
  current_taxonomies: unknown;
  tag_count: number;
  avg_confidence: number;
  has_pending_tag: boolean;
}

const FILTER_OPTIONS = [
  { value: 'no_taxonomy', label: 'Sem Taxonomia', description: 'Documentos sem nenhuma tag de taxonomia' },
  { value: 'pending_classification', label: 'Pendente Classificação', description: 'Docs com tag _pendente.classificacao' },
  { value: 'low_confidence', label: 'Baixa Confiança', description: 'Tags com confiança < 70%' },
  { value: 'all', label: 'Todos', description: 'Todos os documentos completos' }
];

export function DocumentReclassificationTab() {
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [currentJob, setCurrentJob] = useState<ReclassificationJob | null>(null);
  const [documents, setDocuments] = useState<DocumentForReview[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Job config
  const [filter, setFilter] = useState<string>('no_taxonomy');
  const [batchSize, setBatchSize] = useState(10);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(0.9);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('reclassify-documents', {
        body: { action: 'stats' }
      });

      if (error) throw error;
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      toast.error('Erro ao carregar estatísticas');
    }
  }, []);

  // Fetch current job
  const fetchCurrentJob = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('reclassify-documents', {
        body: { action: 'status' }
      });

      if (error) throw error;
      setCurrentJob(data?.job || null);
    } catch (err: any) {
      console.error('Error fetching job:', err);
    }
  }, []);

  // Fetch documents for review
  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_documents_for_reclassification', {
        p_filter: filter,
        p_limit: 50,
        p_offset: 0
      });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
    }
  }, [filter]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchStats(), fetchCurrentJob(), fetchDocuments()]);
      setIsLoading(false);
    };
    load();
  }, [fetchStats, fetchCurrentJob, fetchDocuments]);

  // Refresh on filter change
  useEffect(() => {
    fetchDocuments();
  }, [filter, fetchDocuments]);

  // Start job
  const handleStartJob = async () => {
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('reclassify-documents', {
        body: {
          action: 'start',
          filter,
          batchSize,
          autoApproveThreshold
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message);
        setCurrentJob(data.job);
        // Start processing batches
        processNextBatch(data.job.id);
      } else {
        toast.warning(data?.message || 'Nenhum documento para processar');
      }
    } catch (err: any) {
      console.error('Error starting job:', err);
      toast.error('Erro ao iniciar job');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process next batch
  const processNextBatch = async (jobId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('reclassify-documents', {
        body: { action: 'process_batch', jobId }
      });

      if (error) throw error;

      // Refresh job status
      await fetchCurrentJob();

      if (data?.completed) {
        toast.success('Re-classificação concluída!');
        await fetchStats();
        await fetchDocuments();
      } else if (data?.success) {
        // Continue processing
        setTimeout(() => processNextBatch(jobId), 1000);
      }
    } catch (err: any) {
      console.error('Error processing batch:', err);
      toast.error('Erro ao processar lote');
    }
  };

  // Cancel job
  const handleCancelJob = async () => {
    if (!currentJob) return;
    
    try {
      await supabase.functions.invoke('reclassify-documents', {
        body: { action: 'cancel', jobId: currentJob.id }
      });
      toast.info('Job cancelado');
      await fetchCurrentJob();
    } catch (err: any) {
      console.error('Error cancelling job:', err);
      toast.error('Erro ao cancelar job');
    }
  };

  // Select/deselect document
  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Select all
  const selectAll = () => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map(d => d.document_id)));
    }
  };

  const progressPercent = currentJob 
    ? Math.round((currentJob.processed_documents / currentJob.total_documents) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documentos</p>
                <p className="text-2xl font-bold">{stats?.total_documents || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Com Taxonomia</p>
                <p className="text-2xl font-bold text-green-600">{stats?.documents_with_taxonomy || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sem Taxonomia</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.documents_without_taxonomy || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cobertura</p>
                <p className="text-2xl font-bold text-primary">
                  {stats?.coverage_percentage != null 
                    ? Number(stats.coverage_percentage).toFixed(2) 
                    : '0.00'}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary/50" />
            </div>
            <Progress value={stats?.coverage_percentage || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Job Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Controle de Re-classificação
          </CardTitle>
          <CardDescription>
            Configure e inicie jobs de re-classificação automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Job Status */}
          {currentJob && currentJob.status === 'processing' && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">Job em andamento</span>
                </div>
                <Button variant="destructive" size="sm" onClick={handleCancelJob}>
                  Cancelar
                </Button>
              </div>
              <Progress value={progressPercent} />
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Processados:</span>
                  <span className="ml-2 font-medium">{currentJob.processed_documents}/{currentJob.total_documents}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Auto-aprovados:</span>
                  <span className="ml-2 font-medium text-green-600">{currentJob.auto_approved_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Para revisão:</span>
                  <span className="ml-2 font-medium text-orange-600">{currentJob.pending_review_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Erros:</span>
                  <span className="ml-2 font-medium text-red-600">{currentJob.error_count}</span>
                </div>
              </div>
            </div>
          )}

          {/* Job Config */}
          {(!currentJob || currentJob.status !== 'processing') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Filtro</label>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tamanho do Lote: {batchSize}</label>
                <Slider
                  value={[batchSize]}
                  onValueChange={([v]) => setBatchSize(v)}
                  min={5}
                  max={50}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Auto-aprovar se confiança ≥ {Math.round(autoApproveThreshold * 100)}%</label>
                <Slider
                  value={[autoApproveThreshold * 100]}
                  onValueChange={([v]) => setAutoApproveThreshold(v / 100)}
                  min={70}
                  max={100}
                  step={5}
                />
              </div>
            </div>
          )}

          {/* Start Button */}
          {(!currentJob || currentJob.status !== 'processing') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Iniciar Re-classificação
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Re-classificação</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá processar documentos com filtro "{FILTER_OPTIONS.find(o => o.value === filter)?.label}" 
                    em lotes de {batchSize}. Documentos com confiança ≥ {Math.round(autoApproveThreshold * 100)}% 
                    serão auto-aprovados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleStartJob}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      {/* Documents for Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Documentos ({documents.length})
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchDocuments()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedDocs.size === documents.length && documents.length > 0}
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Chat</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum documento encontrado para o filtro selecionado
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map(doc => (
                    <TableRow key={doc.document_id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedDocs.has(doc.document_id)}
                          onCheckedChange={() => toggleDocSelection(doc.document_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <p className="font-medium truncate">{doc.filename}</p>
                          {doc.ai_summary && (
                            <p className="text-xs text-muted-foreground truncate">{doc.ai_summary}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.target_chat}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{doc.tag_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {doc.avg_confidence > 0 ? (
                          <span className={doc.avg_confidence >= 0.7 ? 'text-green-600' : 'text-orange-600'}>
                            {Math.round(doc.avg_confidence * 100)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.has_pending_tag ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Pendente
                          </Badge>
                        ) : doc.tag_count === 0 ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            Sem tags
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
