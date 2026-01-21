import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Sparkles,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  FileText,
  Tag,
  TrendingUp,
  Activity,
  Loader2,
  ChevronRight,
  Lightbulb,
  Search,
  ArrowRight
} from 'lucide-react';

interface HealthStats {
  total_taxonomies: number;
  approved_count: number;
  pending_count: number;
  deprecated_count: number;
  auto_created_count: number;
  total_documents: number;
  documents_with_taxonomy: number;
  documents_without_taxonomy: number;
  orphan_taxonomies: number;
  pending_suggestions: number;
  gaps_detected: number;
  health_score: number;
  coverage_percentage: number;
}

interface Gap {
  gap_type: string;
  description: string;
  severity: string;
  document_count: number;
  sample_documents: any[];
  suggested_action: string;
}

interface Suggestion {
  id: string;
  suggested_code: string;
  suggested_name: string;
  suggested_description: string | null;
  suggested_parent_code: string | null;
  suggested_keywords: string[];
  source: string;
  confidence: number;
  occurrence_count: number;
  based_on_documents: string[];
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

interface Keyword {
  keyword: string;
  occurrence_count: number;
  document_ids: string[];
  sample_contexts: string[];
  existing_taxonomy_code: string | null;
}

const TaxonomySuggestionsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Fetch health stats
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['taxonomy-health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { action: 'health' }
      });
      if (error) throw error;
      return data.data as HealthStats;
    }
  });

  // Fetch gaps
  const { data: gapsData, isLoading: gapsLoading, refetch: refetchGaps } = useQuery({
    queryKey: ['taxonomy-gaps'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { action: 'gaps' }
      });
      if (error) throw error;
      return data.gaps as Gap[];
    }
  });

  // Fetch suggestions
  const { data: suggestionsData, isLoading: suggestionsLoading, refetch: refetchSuggestions } = useQuery({
    queryKey: ['taxonomy-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { action: 'suggestions' }
      });
      if (error) throw error;
      return data.suggestions as { pending: Suggestion[]; approved: Suggestion[]; rejected: Suggestion[] };
    }
  });

  // Fetch keywords
  const { data: keywordsData, isLoading: keywordsLoading, refetch: refetchKeywords } = useQuery({
    queryKey: ['taxonomy-keywords'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { action: 'keywords', minOccurrences: 2, limit: 30 }
      });
      if (error) throw error;
      return data.keywords as Keyword[];
    }
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { action: 'analyze' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Análise concluída: ${data.analysis?.createdSuggestions || 0} sugestões criadas`);
      refetchAll();
    },
    onError: (error: any) => {
      toast.error(`Erro na análise: ${error.message}`);
    }
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { action: 'approve', suggestionId: id, notes }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Sugestão aprovada e taxonomia criada!');
      setApproveDialogOpen(false);
      setSelectedSuggestion(null);
      setReviewNotes('');
      refetchAll();
    },
    onError: (error: any) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { action: 'reject', suggestionId: id, notes }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Sugestão rejeitada');
      setRejectDialogOpen(false);
      setSelectedSuggestion(null);
      setReviewNotes('');
      refetchAll();
    },
    onError: (error: any) => {
      toast.error(`Erro ao rejeitar: ${error.message}`);
    }
  });

  // Batch approve mutation
  const batchApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { action: 'batch_approve', suggestionIds: ids }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.approved} sugestões aprovadas`);
      setSelectedSuggestions(new Set());
      refetchAll();
    },
    onError: (error: any) => {
      toast.error(`Erro ao aprovar em lote: ${error.message}`);
    }
  });

  // Batch reject mutation
  const batchRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { action: 'batch_reject', suggestionIds: ids }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.rejected} sugestões rejeitadas`);
      setSelectedSuggestions(new Set());
      refetchAll();
    },
    onError: (error: any) => {
      toast.error(`Erro ao rejeitar em lote: ${error.message}`);
    }
  });

  const refetchAll = () => {
    refetchHealth();
    refetchGaps();
    refetchSuggestions();
    refetchKeywords();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuggestions(new Set(suggestionsData?.pending.map(s => s.id) || []));
    } else {
      setSelectedSuggestions(new Set());
    }
  };

  const handleSelectSuggestion = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedSuggestions);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedSuggestions(newSelected);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">Média</Badge>;
      case 'low':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    const sourceMap: Record<string, { label: string; className: string }> = {
      'ai_analysis': { label: 'IA', className: 'bg-purple-500/20 text-purple-600' },
      'keyword_frequency': { label: 'Keywords', className: 'bg-blue-500/20 text-blue-600' },
      'user_request': { label: 'Usuário', className: 'bg-green-500/20 text-green-600' },
      'ml_pattern': { label: 'ML', className: 'bg-orange-500/20 text-orange-600' },
      'gap_detection': { label: 'Gap', className: 'bg-red-500/20 text-red-600' }
    };
    const config = sourceMap[source] || { label: source, className: '' };
    return <Badge variant="secondary" className={config.className}>{config.label}</Badge>;
  };

  const isLoading = healthLoading || gapsLoading || suggestionsLoading || keywordsLoading;
  const pendingCount = suggestionsData?.pending.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Auto-Gestão de Taxonomias
          </h2>
          <p className="text-muted-foreground">
            Sistema automático de sugestões e manutenção de taxonomias
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refetchAll}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Analisar Documentos
          </Button>
        </div>
      </div>

      {/* Health Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score de Saúde</p>
                <p className={`text-2xl font-bold ${getHealthScoreColor(healthData?.health_score || 0)}`}>
                  {healthData?.health_score || 0}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <Progress value={healthData?.health_score || 0} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cobertura</p>
                <p className="text-2xl font-bold text-primary">
                  {healthData?.coverage_percentage || 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthData?.documents_with_taxonomy || 0} de {healthData?.total_documents || 0} docs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxonomias</p>
                <p className="text-2xl font-bold">{healthData?.total_taxonomies || 0}</p>
              </div>
              <Tag className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthData?.auto_created_count || 0} automáticas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
              </div>
              <Lightbulb className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              sugestões para revisar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Órfãs</p>
                <p className="text-2xl font-bold text-orange-500">{healthData?.orphan_taxonomies || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              sem documentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gaps</p>
                <p className="text-2xl font-bold text-red-500">{healthData?.gaps_detected || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              problemas detectados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="suggestions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Sugestões
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Gaps
            {(gapsData?.length || 0) > 0 && (
              <Badge variant="destructive" className="ml-1">{gapsData?.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Keywords
          </TabsTrigger>
        </TabsList>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          {pendingCount > 0 && (
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedSuggestions.size === pendingCount}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm">
                  {selectedSuggestions.size} de {pendingCount} selecionadas
                </span>
              </div>
              {selectedSuggestions.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => batchApproveMutation.mutate(Array.from(selectedSuggestions))}
                    disabled={batchApproveMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aprovar ({selectedSuggestions.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => batchRejectMutation.mutate(Array.from(selectedSuggestions))}
                    disabled={batchRejectMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rejeitar ({selectedSuggestions.size})
                  </Button>
                </div>
              )}
            </div>
          )}

          {suggestionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhuma sugestão pendente</p>
                <Button
                  variant="link"
                  onClick={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending}
                >
                  Analisar documentos para gerar sugestões
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {suggestionsData?.pending.map((suggestion) => (
                <Card key={suggestion.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedSuggestions.has(suggestion.id)}
                        onCheckedChange={(checked) => handleSelectSuggestion(suggestion.id, !!checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold">{suggestion.suggested_code}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{suggestion.suggested_name}</span>
                          {getSourceBadge(suggestion.source)}
                          <Badge variant="outline">
                            {Math.round(suggestion.confidence * 100)}% confiança
                          </Badge>
                        </div>
                        {suggestion.suggested_description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {suggestion.suggested_description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{suggestion.occurrence_count} ocorrência(s)</span>
                          <span>{suggestion.based_on_documents?.length || 0} documento(s)</span>
                          {suggestion.suggested_keywords?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {suggestion.suggested_keywords.slice(0, 3).join(', ')}
                              {suggestion.suggested_keywords.length > 3 && '...'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSuggestion(suggestion);
                            setApproveDialogOpen(true);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSuggestion(suggestion);
                            setRejectDialogOpen(true);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          {gapsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (gapsData?.length || 0) === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Check className="h-12 w-12 text-green-500/50 mb-4" />
                <p className="text-muted-foreground">Nenhum gap detectado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {gapsData?.map((gap, index) => (
                <Card key={index}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{gap.description}</span>
                          {getSeverityBadge(gap.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {gap.document_count} documento(s) afetado(s)
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <ArrowRight className="h-4 w-4 text-primary" />
                          <span className="text-primary">{gap.suggested_action}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {gap.gap_type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-4">
          {keywordsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (keywordsData?.length || 0) === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhuma keyword frequente sem taxonomia</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {keywordsData?.map((kw, index) => (
                <Card key={index} className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{kw.keyword}</span>
                        <p className="text-xs text-muted-foreground">
                          {kw.occurrence_count} documento(s)
                        </p>
                      </div>
                      <Badge variant="outline">Sem taxonomia</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Sugestão</DialogTitle>
            <DialogDescription>
              Isso criará uma nova taxonomia e aplicará aos documentos relacionados.
            </DialogDescription>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{selectedSuggestion.suggested_code}</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>{selectedSuggestion.suggested_name}</span>
                </div>
                {selectedSuggestion.suggested_description && (
                  <p className="text-sm text-muted-foreground">{selectedSuggestion.suggested_description}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {selectedSuggestion.suggested_keywords?.map((kw, i) => (
                    <Badge key={i} variant="secondary">{kw}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notas (opcional)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Adicione notas sobre esta aprovação..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedSuggestion) {
                  approveMutation.mutate({ id: selectedSuggestion.id, notes: reviewNotes });
                }
              }}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Aprovar e Criar Taxonomia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Sugestão</DialogTitle>
            <DialogDescription>
              A sugestão será marcada como rejeitada e não aparecerá mais na lista.
            </DialogDescription>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{selectedSuggestion.suggested_code}</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>{selectedSuggestion.suggested_name}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Motivo da rejeição (opcional)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Por que esta sugestão foi rejeitada..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedSuggestion) {
                  rejectMutation.mutate({ id: selectedSuggestion.id, notes: reviewNotes });
                }
              }}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaxonomySuggestionsTab;
