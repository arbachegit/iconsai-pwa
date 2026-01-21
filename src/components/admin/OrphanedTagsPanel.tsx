import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, ChevronDown, FolderOpen, Loader2, ArrowRight, Users, Trash2 } from "lucide-react";
import { logTagManagementEvent } from "@/lib/tag-management-logger";

import type { OrphanedTag } from "./tags/useSimilarityCalculations";

interface ParentTag {
  id: string;
  tag_name: string;
}

interface OrphanedTagsPanelProps {
  orphanedTags: OrphanedTag[];
  parentTags: ParentTag[];
}

interface DeletionReasons {
  generic: boolean;
  outOfDomain: boolean;
  properName: boolean;
  isYear: boolean;
  isPhrase: boolean;
  typo: boolean;
  variation: boolean;
  isolatedVerb: boolean;
  pii: boolean;
}

const DELETION_REASONS_CONFIG = [
  { key: 'generic' as const, title: 'Termo genérico', description: 'Stopwords que não agregam valor de predição' },
  { key: 'outOfDomain' as const, title: 'Não se encaixa nas categorias', description: 'Irrelevância de domínio (Out-of-domain)' },
  { key: 'properName' as const, title: 'Nome próprio', description: 'Alta cardinalidade - cria matriz esparsa' },
  { key: 'isYear' as const, title: 'É um ano', description: 'Dados temporais devem ser variáveis contínuas' },
  { key: 'isPhrase' as const, title: 'É uma frase, não palavra-chave', description: 'Ensina IA a detectar length excessivo' },
  { key: 'typo' as const, title: 'Erro de digitação/grafia', description: 'Sugere fuzzy matching para correções futuras' },
  { key: 'variation' as const, title: 'Variação (Plural/Singular/Sinônimo)', description: 'Ensina lemmatization - reduzir à raiz' },
  { key: 'isolatedVerb' as const, title: 'Verbo/Ação isolada', description: 'Verbos soltos não classificam - precisam substantivo' },
  { key: 'pii' as const, title: 'Dado sensível (PII)', description: 'CPF, Telefone, E-mail - bloquear por segurança' },
];

const DEFAULT_REASONS: DeletionReasons = {
  generic: false,
  outOfDomain: false,
  properName: false,
  isYear: false,
  isPhrase: false,
  typo: false,
  variation: false,
  isolatedVerb: false,
  pii: false,
};

export const OrphanedTagsPanel = ({ orphanedTags, parentTags }: OrphanedTagsPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedParents, setSelectedParents] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingType, setProcessingType] = useState<'adopt' | 'delete' | 'bulk_delete' | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    tag: OrphanedTag | null;
    reasons: DeletionReasons;
  }>({
    open: false,
    tag: null,
    reasons: { ...DEFAULT_REASONS },
  });
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    open: boolean;
    reasons: DeletionReasons;
  }>({
    open: false,
    reasons: { ...DEFAULT_REASONS },
  });
  const queryClient = useQueryClient();

  const isProcessing = processingId !== null;

  const reassignMutation = useMutation({
    mutationFn: async ({ tagId, newParentId, tagName, parentName }: { 
      tagId: string; 
      newParentId: string;
      tagName: string;
      parentName: string;
    }) => {
      const startTime = Date.now();
      
      const { error } = await supabase
        .from("document_tags")
        .update({ parent_tag_id: newParentId })
        .eq("id", tagId);

      if (error) throw error;

      await logTagManagementEvent({
        input_state: {
          tags_involved: [{
            id: tagId,
            name: tagName,
            type: 'child',
            parent_id: null
          }]
        },
        action_type: 'adopt_orphan',
        user_decision: {
          target_tag_id: tagId,
          target_tag_name: tagName,
          target_parent_id: newParentId,
          target_parent_name: parentName
        },
        time_to_decision_ms: Date.now() - startTime
      });
    },
    onSuccess: () => {
      toast.success("Tag reatribuída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      setProcessingId(null);
      setProcessingType(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reatribuir tag: ${error.message}`);
      setProcessingId(null);
      setProcessingType(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ 
      tagId, 
      tagName,
      deletion_reasons,
      rationale
    }: { 
      tagId: string; 
      tagName: string;
      deletion_reasons: DeletionReasons;
      rationale: string;
    }) => {
      const startTime = Date.now();
      
      const { error } = await supabase
        .from("document_tags")
        .delete()
        .eq("id", tagId);

      if (error) throw error;

      await logTagManagementEvent({
        input_state: {
          tags_involved: [{ id: tagId, name: tagName, type: 'child', parent_id: null }]
        },
        action_type: 'delete_orphan',
        user_decision: {
          target_tag_id: tagId,
          target_tag_name: tagName,
          action: 'permanently_deleted',
          deletion_reasons
        },
        rationale,
        time_to_decision_ms: Date.now() - startTime
      });
    },
    onSuccess: () => {
      toast.success("Tag órfã excluída permanentemente!");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      setProcessingId(null);
      setProcessingType(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir tag: ${error.message}`);
      setProcessingId(null);
      setProcessingType(null);
    },
  });

  const handleReassign = (tag: OrphanedTag) => {
    const newParentId = selectedParents[tag.id];
    if (!newParentId) {
      toast.error("Selecione um parent tag primeiro");
      return;
    }

    const parentTag = parentTags.find(p => p.id === newParentId);
    if (!parentTag) return;

    setProcessingId(tag.id);
    setProcessingType('adopt');
    reassignMutation.mutate({ 
      tagId: tag.id, 
      newParentId,
      tagName: tag.tag_name,
      parentName: parentTag.tag_name
    });
  };

  const openDeleteModal = (tag: OrphanedTag) => {
    setDeleteModal({
      open: true,
      tag,
      reasons: { ...DEFAULT_REASONS },
    });
  };

  const confirmDelete = () => {
    if (!deleteModal.tag) return;
    
    const { tag, reasons } = deleteModal;
    
    // Construir rationale baseado nos motivos selecionados
    const selectedReasonLabels: string[] = [];
    if (reasons.generic) selectedReasonLabels.push('Termo genérico (Stopwords)');
    if (reasons.outOfDomain) selectedReasonLabels.push('Irrelevância de domínio');
    if (reasons.properName) selectedReasonLabels.push('Nome próprio (High Cardinality)');
    if (reasons.isYear) selectedReasonLabels.push('Dado temporal (Ano)');
    if (reasons.isPhrase) selectedReasonLabels.push('Frase (Length excessivo)');
    if (reasons.typo) selectedReasonLabels.push('Erro de grafia');
    if (reasons.variation) selectedReasonLabels.push('Variação (Plural/Sinônimo)');
    if (reasons.isolatedVerb) selectedReasonLabels.push('Verbo isolado');
    if (reasons.pii) selectedReasonLabels.push('Dado sensível (PII)');
    
    const rationale = `Exclusão de tag órfã: ${tag.tag_name}. Motivos: ${selectedReasonLabels.join(', ')}`;
    
    setProcessingId(tag.id);
    setProcessingType('delete');
    
    deleteMutation.mutate({ 
      tagId: tag.id, 
      tagName: tag.tag_name,
      deletion_reasons: reasons,
      rationale
    });
    
    setDeleteModal(prev => ({ ...prev, open: false }));
  };

  const hasSelectedReason = Object.values(deleteModal.reasons).some(v => v);
  const hasBulkSelectedReason = Object.values(bulkDeleteModal.reasons).some(v => v);

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ 
      tagIds, 
      deletion_reasons,
      rationale
    }: { 
      tagIds: string[]; 
      deletion_reasons: DeletionReasons;
      rationale: string;
    }) => {
      const startTime = Date.now();
      
      const { error } = await supabase
        .from("document_tags")
        .delete()
        .in("id", tagIds);

      if (error) throw error;

      await logTagManagementEvent({
        input_state: {
          tags_involved: orphanedTags
            .filter(t => tagIds.includes(t.id))
            .map(t => ({ id: t.id, name: t.tag_name, type: 'child' as const, parent_id: null }))
        },
        action_type: 'bulk_delete_orphans',
        user_decision: {
          deleted_count: tagIds.length,
          action: 'bulk_deleted',
          deletion_reasons
        },
        rationale,
        time_to_decision_ms: Date.now() - startTime
      });
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.tagIds.length} tags órfãs excluídas!`);
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      setProcessingType(null);
      setBulkDeleteModal({ open: false, reasons: { ...DEFAULT_REASONS } });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir tags: ${error.message}`);
      setProcessingType(null);
    },
  });

  const handleBulkDelete = () => {
    const { reasons } = bulkDeleteModal;
    
    const selectedReasonLabels: string[] = [];
    if (reasons.generic) selectedReasonLabels.push('Termo genérico (Stopwords)');
    if (reasons.outOfDomain) selectedReasonLabels.push('Irrelevância de domínio');
    if (reasons.properName) selectedReasonLabels.push('Nome próprio (High Cardinality)');
    if (reasons.isYear) selectedReasonLabels.push('Dado temporal (Ano)');
    if (reasons.isPhrase) selectedReasonLabels.push('Frase (Length excessivo)');
    if (reasons.typo) selectedReasonLabels.push('Erro de grafia');
    if (reasons.variation) selectedReasonLabels.push('Variação (Plural/Sinônimo)');
    if (reasons.isolatedVerb) selectedReasonLabels.push('Verbo isolado');
    if (reasons.pii) selectedReasonLabels.push('Dado sensível (PII)');
    
    const rationale = `Exclusão em massa de ${orphanedTags.length} tags órfãs. Motivos: ${selectedReasonLabels.join(', ')}`;
    
    setProcessingType('bulk_delete');
    bulkDeleteMutation.mutate({ 
      tagIds: orphanedTags.map(t => t.id), 
      deletion_reasons: reasons,
      rationale
    });
  };

  if (orphanedTags.length === 0) {
    return null;
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="p-4 border-orange-500/50 bg-gradient-to-r from-orange-500/5 to-amber-500/5">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-orange-400" />
              <h3 className="font-semibold">Zona de Tags Órfãs</h3>
              <Badge variant="outline" className="ml-2 bg-orange-500/20 text-orange-300 border-orange-500/30">
                <Users className="h-3 w-3 mr-1" />
                {orphanedTags.length} órfã(s)
              </Badge>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Tags filhas sem parent válido. Reatribua-as a um parent tag existente ou exclua permanentemente.
              </p>
              
              {/* Bulk Delete Button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteModal({ open: true, reasons: { ...DEFAULT_REASONS } })}
                disabled={isProcessing || orphanedTags.length === 0}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Todas ({orphanedTags.length})
              </Button>
            </div>

            <div className={`space-y-3 max-h-[300px] overflow-y-auto transition-opacity ${isProcessing ? 'opacity-60' : ''}`}>
              {orphanedTags.map((tag) => (
                <div 
                  key={tag.id} 
                  className="flex items-center justify-between gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
                    <span className="text-sm font-medium truncate">{tag.tag_name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {tag.source || "N/A"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedParents[tag.id] || ""}
                      onValueChange={(value) => setSelectedParents(prev => ({ ...prev, [tag.id]: value }))}
                      disabled={isProcessing}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="Selecionar parent..." />
                      </SelectTrigger>
                      <SelectContent>
                        {parentTags.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id} className="text-xs">
                            {parent.tag_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReassign(tag)}
                      disabled={!selectedParents[tag.id] || isProcessing}
                      className="h-8 px-3 text-xs border-green-500/50 text-green-400 hover:bg-green-500/20"
                    >
                      {processingId === tag.id && processingType === 'adopt' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Adotar
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteModal(tag)}
                      disabled={isProcessing}
                      className="h-8 w-8 p-0 border-red-500/50 text-red-400 hover:bg-red-500/20"
                    >
                      {processingId === tag.id && processingType === 'delete' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Modal de Confirmação de Exclusão com 9 Motivos */}
      <AlertDialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Confirmar Exclusão de Tag Órfã
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente: <strong className="text-foreground">"{deleteModal.tag?.tag_name}"</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Selecione pelo menos um motivo para excluir:</span>
            </div>

            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                {DELETION_REASONS_CONFIG.map((reason) => (
                  <div 
                    key={reason.key}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    <Checkbox
                      id={`orphan-reason-${reason.key}`}
                      checked={deleteModal.reasons[reason.key]}
                      onCheckedChange={(checked) =>
                        setDeleteModal(prev => ({
                          ...prev,
                          reasons: { ...prev.reasons, [reason.key]: checked === true }
                        }))
                      }
                      className="mt-0.5"
                    />
                    <label htmlFor={`orphan-reason-${reason.key}`} className="cursor-pointer flex-1">
                      <span className="font-medium text-sm text-foreground">{reason.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{reason.description}</p>
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {!hasSelectedReason && (
              <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Escolha ao menos um motivo para habilitar a exclusão
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={!hasSelectedReason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Confirmação de Exclusão em Massa */}
      <AlertDialog open={bulkDeleteModal.open} onOpenChange={(open) => setBulkDeleteModal(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão em Massa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente <strong className="text-foreground">{orphanedTags.length}</strong> tags órfãs.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Selecione pelo menos um motivo para excluir:</span>
            </div>

            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                {DELETION_REASONS_CONFIG.map((reason) => (
                  <div 
                    key={reason.key}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    <Checkbox
                      id={`bulk-reason-${reason.key}`}
                      checked={bulkDeleteModal.reasons[reason.key]}
                      onCheckedChange={(checked) =>
                        setBulkDeleteModal(prev => ({
                          ...prev,
                          reasons: { ...prev.reasons, [reason.key]: checked === true }
                        }))
                      }
                      className="mt-0.5"
                    />
                    <label htmlFor={`bulk-reason-${reason.key}`} className="cursor-pointer flex-1">
                      <span className="font-medium text-sm text-foreground">{reason.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{reason.description}</p>
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {!hasBulkSelectedReason && (
              <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Escolha ao menos um motivo para habilitar a exclusão
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={!hasBulkSelectedReason || bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Todas ({orphanedTags.length})
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
