import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Tags, 
  Loader2,
  TreeDeciduous,
  Filter,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  FileSearch,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  useTaxonomyData,
  TaxonomyNode,
  TaxonomyFormData,
  TaxonomyTree,
  TaxonomyDetailsPanel,
  TaxonomyFormModal,
  TaxonomyDeleteModal,
} from './taxonomy-manager';
import { useDebounce } from '@/hooks/useDebounce';
import { CSVImportButton, taxonomyImportConfig } from './csv-import';
import { useQueryClient } from '@tanstack/react-query';

export default function TaxonomyManagerTab() {
  const queryClient = useQueryClient();
  const {
    tree,
    items,
    isLoading,
    createTag,
    updateTag,
    deleteTag,
    hardDeleteTag,
    isCreating,
    isUpdating,
    isDeleting,
    isHardDeleting,
  } = useTaxonomyData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNode, setSelectedNode] = useState<TaxonomyNode | null>(null);
  const [editingNode, setEditingNode] = useState<TaxonomyNode | null>(null);
  const [deletingNode, setDeletingNode] = useState<TaxonomyNode | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Migration state
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState<{
    success: boolean;
    message: string;
    results?: {
      documentsProcessed: number;
      tagsCreated: number;
      tagsMapped: number;
      tagsPending: number;
      agentProfilesCreated: number;
      errors: string[];
      details?: {
        unmappedTags: string[];
      };
    };
  } | null>(null);

  // Gap Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    summary: {
      totalDocuments: number;
      totalTags: number;
      uniqueTags: number;
      taxonomyNodes: number;
      mappedTags: number;
      unmappedTags: number;
      coveragePercent: number;
    };
    unmappedTags: Array<{
      tagName: string;
      tagType: string;
      documentCount: number;
      suggestedTaxonomy: string[];
      sampleDocuments: string[];
    }>;
    suggestedNewTaxonomies: Array<{
      code: string;
      name: string;
      parentCode: string;
      reason: string;
      basedOnTags: string[];
    }>;
    documentsByTargetChat: Record<string, number>;
    tagDistribution: {
      parentTags: number;
      childTags: number;
      orphanTags: number;
    };
  } | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Migration handler
  const handleRunMigration = async () => {
    setIsMigrating(true);
    setMigrationResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('migrate-tags-to-taxonomy');
      
      if (error) {
        throw error;
      }
      
      setMigrationResults(data);
      
      if (data.success) {
        toast.success('Migração concluída com sucesso!');
      } else {
        toast.error('Migração falhou: ' + data.error);
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      setMigrationResults({
        success: false,
        message: error.message || 'Erro desconhecido na migração',
      });
      toast.error('Erro na migração: ' + error.message);
    } finally {
      setIsMigrating(false);
    }
  };

  // Gap Analysis handler
  const handleAnalyzeGap = async () => {
    setAnalyzing(true);
    setShowAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-taxonomy-gap');
      
      if (error) throw error;
      
      setAnalysisResult(data.analysis);
      toast.success(`Análise concluída: ${data.analysis.summary.coveragePercent}% de cobertura`);
    } catch (error: any) {
      console.error('Gap analysis error:', error);
      toast.error('Erro na análise: ' + error.message);
      setAnalysisResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  // Stats
  const totalTags = items.length;
  const level1Count = items.filter(t => t.level === 1).length;
  const pendingCount = items.filter(t => t.status === 'pending').length;

  const handleCreateTag = async (data: TaxonomyFormData) => {
    await createTag(data);
  };

  const handleUpdateTag = async (data: TaxonomyFormData) => {
    if (!editingNode) return;
    await updateTag({ id: editingNode.id, data });
    setEditingNode(null);
  };

  const handleDeleteTag = async () => {
    if (!deletingNode) return;
    await deleteTag(deletingNode.id);
    if (selectedNode?.id === deletingNode.id) {
      setSelectedNode(null);
    }
    setDeletingNode(null);
  };

  const handleHardDeleteTag = async () => {
    if (!deletingNode) return;
    await hardDeleteTag(deletingNode.id);
    if (selectedNode?.id === deletingNode.id) {
      setSelectedNode(null);
    }
    setDeletingNode(null);
  };

  const handleUpdateSynonyms = async (id: string, synonyms: string[]) => {
    await updateTag({ id, data: { synonyms } });
  };

  const handleUpdateKeywords = async (id: string, keywords: string[]) => {
    await updateTag({ id, data: { keywords } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TreeDeciduous className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Gestor de Taxonomia</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie a hierarquia global de tags
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleAnalyzeGap}
            disabled={analyzing}
            variant="outline"
            className="gap-2 bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4" />
                Analisar Gap
              </>
            )}
          </Button>
          <Button 
            onClick={() => setIsMigrationOpen(true)} 
            variant="outline"
            className="gap-2 bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
          >
            <RefreshCw className="h-4 w-4" />
            Migrar Tags Legadas
          </Button>
          <CSVImportButton
            config={taxonomyImportConfig}
            buttonVariant="outline"
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['taxonomy'] })}
          />
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Tag
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Tags</p>
                <p className="text-2xl font-bold">{totalTags}</p>
              </div>
              <Tags className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Domínios (Nível 1)</p>
                <p className="text-2xl font-bold">{level1Count}</p>
              </div>
              <TreeDeciduous className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              {pendingCount > 0 ? (
                <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Revisar
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  OK
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tree Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">Hierarquia</CardTitle>
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="approved">Ativos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="deprecated">Obsoletos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <TaxonomyTree
                nodes={tree}
                selectedId={selectedNode?.id || null}
                onSelect={setSelectedNode}
                searchQuery={debouncedSearch}
                statusFilter={statusFilter}
              />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Details Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px]">
              <TaxonomyDetailsPanel
                node={selectedNode}
                onEdit={(node) => {
                  setEditingNode(node);
                  setIsFormOpen(true);
                }}
                onDelete={setDeletingNode}
                onUpdateSynonyms={handleUpdateSynonyms}
                onUpdateKeywords={handleUpdateKeywords}
                isUpdating={isUpdating}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Modal */}
      <TaxonomyFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingNode(null);
        }}
        onSubmit={editingNode ? handleUpdateTag : handleCreateTag}
        editingNode={editingNode}
        allNodes={tree}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Delete Modal */}
      <TaxonomyDeleteModal
        open={!!deletingNode}
        onClose={() => setDeletingNode(null)}
        onConfirm={handleDeleteTag}
        onHardDelete={handleHardDeleteTag}
        node={deletingNode}
        isDeleting={isDeleting}
        isHardDeleting={isHardDeleting}
      />

      {/* Migration Modal */}
      <Dialog open={isMigrationOpen} onOpenChange={setIsMigrationOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Migrar Tags Legadas para Taxonomia Global
            </DialogTitle>
            <DialogDescription>
              Esta operação é <strong>ONE-TIME</strong> e irá migrar:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Tags de <code>document_tags</code> → <code>entity_tags</code></li>
                <li><code>allowed_tags</code> / <code>forbidden_tags</code> dos agentes → <code>agent_tag_profiles</code></li>
                <li>Documentos sem tags serão marcados como pendentes</li>
              </ul>
            </DialogDescription>
          </DialogHeader>

          {migrationResults && (
            <div className={`p-4 rounded-lg ${migrationResults.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className="flex items-center gap-2 mb-3">
                {migrationResults.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                )}
                <span className="font-medium">{migrationResults.message}</span>
              </div>
              
              {migrationResults.results && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p><strong>Tags Criadas:</strong> {migrationResults.results.tagsCreated}</p>
                    <p><strong>Tags Mapeadas:</strong> {migrationResults.results.tagsMapped}</p>
                    <p><strong>Tags Pendentes:</strong> {migrationResults.results.tagsPending}</p>
                  </div>
                  <div className="space-y-1">
                    <p><strong>Docs Processados:</strong> {migrationResults.results.documentsProcessed}</p>
                    <p><strong>Perfis de Agente:</strong> {migrationResults.results.agentProfilesCreated}</p>
                    <p><strong>Erros:</strong> {migrationResults.results.errors.length}</p>
                  </div>
                  
                  {migrationResults.results.details?.unmappedTags && migrationResults.results.details.unmappedTags.length > 0 && (
                    <div className="col-span-2 mt-2">
                      <p className="font-medium text-amber-400 mb-1">Tags não mapeadas:</p>
                      <div className="flex flex-wrap gap-1">
                        {migrationResults.results.details.unmappedTags.slice(0, 10).map((tag, i) => (
                          <Badge key={i} variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                            {tag}
                          </Badge>
                        ))}
                        {migrationResults.results.details.unmappedTags.length > 10 && (
                          <Badge variant="outline" className="bg-muted">
                            +{migrationResults.results.details.unmappedTags.length - 10} mais
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMigrationOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={handleRunMigration}
              disabled={isMigrating}
              className="gap-2 bg-orange-500 hover:bg-orange-600"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Migrando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Executar Migração
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gap Analysis Panel */}
      {showAnalysis && (
        <Card className="border-blue-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="h-5 w-5 text-blue-400" />
                  Análise de Gap: Documentos vs Taxonomia
                </CardTitle>
                <CardDescription className="mt-1">
                  Identificação de tags não mapeadas e sugestões de novas taxonomias
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAnalysis(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {analyzing ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <span className="ml-3 text-muted-foreground">Analisando tags e documentos...</span>
              </div>
            ) : analysisResult ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-foreground">{analysisResult.summary.totalDocuments}</p>
                      <p className="text-sm text-muted-foreground">Documentos</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-foreground">{analysisResult.summary.uniqueTags}</p>
                      <p className="text-sm text-muted-foreground">Tags Únicas</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-foreground">{analysisResult.summary.taxonomyNodes}</p>
                      <p className="text-sm text-muted-foreground">Nós de Taxonomia</p>
                    </CardContent>
                  </Card>
                  <Card className={`${analysisResult.summary.coveragePercent >= 70 ? 'bg-emerald-500/10' : analysisResult.summary.coveragePercent >= 40 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                    <CardContent className="p-4 text-center">
                      <p className={`text-3xl font-bold ${analysisResult.summary.coveragePercent >= 70 ? 'text-emerald-400' : analysisResult.summary.coveragePercent >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                        {analysisResult.summary.coveragePercent}%
                      </p>
                      <p className="text-sm text-muted-foreground">Cobertura</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-400">Tags Mapeadas: {analysisResult.summary.mappedTags}</span>
                    <span className="text-amber-400">Não Mapeadas: {analysisResult.summary.unmappedTags}</span>
                  </div>
                  <Progress value={analysisResult.summary.coveragePercent} className="h-3" />
                </div>

                {/* Documents by Target Chat */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Documentos por Chat</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analysisResult.documentsByTargetChat).map(([chat, count]) => (
                      <Badge key={chat} variant="outline" className="bg-muted/50">
                        {chat}: {count as number}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Unmapped Tags Table */}
                {analysisResult.unmappedTags.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <p className="text-sm font-medium">Tags Não Mapeadas ({analysisResult.unmappedTags.length})</p>
                    </div>
                    <ScrollArea className="h-[250px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tag</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Docs</TableHead>
                            <TableHead>Sugestão</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysisResult.unmappedTags.slice(0, 30).map((tag, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{tag.tagName}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {tag.tagType}
                                </Badge>
                              </TableCell>
                              <TableCell>{tag.documentCount}</TableCell>
                              <TableCell>
                                {tag.suggestedTaxonomy.length > 0 ? (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                                    {tag.suggestedTaxonomy[0]}
                                  </Badge>
                                ) : (
                                  <span className="text-amber-400 text-xs">Criar nova</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}

                {/* Suggested New Taxonomies */}
                {analysisResult.suggestedNewTaxonomies.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-400" />
                      <p className="text-sm font-medium">Sugestões de Novas Taxonomias ({analysisResult.suggestedNewTaxonomies.length})</p>
                    </div>
                    <div className="grid gap-3">
                      {analysisResult.suggestedNewTaxonomies.map((suggestion, idx) => (
                        <Card key={idx} className="bg-muted/30">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="font-mono text-sm text-blue-400">{suggestion.code}</p>
                              <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {suggestion.basedOnTags.map((t, i) => (
                                  <Badge key={i} variant="outline" className="text-xs bg-muted/50">
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                              onClick={() => {
                                setIsFormOpen(true);
                                // Pré-preencher form com sugestão
                              }}
                            >
                              <Plus className="h-3 w-3" />
                              Criar
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Clique em "Analisar Gap" para iniciar a análise
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
