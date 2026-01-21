import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Merge, AlertTriangle, ArrowRight, Users, Sparkles, ClipboardList, Wand2 } from "lucide-react";
import { logTagManagementEvent, calculateTimeSinceModalOpen } from "@/lib/tag-management-logger";
import { ScrollArea } from "@/components/ui/scroll-area";
import { suggestMergeReasonsForTags, type SuggestedReasons } from "@/lib/merge-reason-heuristics";
import type { Tag } from "@/types/tag";

// Configuração dos 7 motivos de unificação baseados em Data Science
const MERGE_REASONS_CONFIG = [
  {
    key: 'synonymy' as const,
    label: 'Sinonímia (Mesmo significado)',
    description: 'Palavras diferentes que representam o mesmo conceito',
    examples: '"Staff" → "Equipe", "Veículo" → "Automóvel"'
  },
  {
    key: 'grammaticalVariation' as const,
    label: 'Variação Gramatical (Singular vs. Plural)',
    description: 'Lematização - reduzir à forma base',
    examples: '"Faturas" → "Fatura", "Projetos" → "Projeto"'
  },
  {
    key: 'spellingVariation' as const,
    label: 'Variação de Grafia ou Formatação',
    description: 'Acentos, hífens, maiúsculas/minúsculas',
    examples: '"e-mail" = "Email" = "E-mail", "relatorio" → "Relatório"'
  },
  {
    key: 'acronym' as const,
    label: 'Siglas e Extensões (Acrônimos)',
    description: 'Alguns usam sigla, outros nome completo',
    examples: '"RH" → "Recursos Humanos", "TI" → "Tecnologia da Informação"'
  },
  {
    key: 'typo' as const,
    label: 'Erro de Digitação (Typos)',
    description: 'Tag criada com erro óbvio, mas conceito válido',
    examples: '"Finaceiro" → "Financeiro"'
  },
  {
    key: 'languageEquivalence' as const,
    label: 'Equivalência de Idioma',
    description: 'Documentos bilíngues - mesmo assunto em línguas diferentes',
    examples: '"Sales" → "Vendas", "Budget" → "Orçamento"'
  },
  {
    key: 'generalization' as const,
    label: 'Generalização (Agrupamento Hierárquico)',
    description: 'Tags muito específicas que precisam subir nível na taxonomia',
    examples: '"NF Janeiro", "NF Fevereiro" → "Nota Fiscal"'
  }
];

interface MergeReasons {
  synonymy: boolean;
  grammaticalVariation: boolean;
  spellingVariation: boolean;
  acronym: boolean;
  typo: boolean;
  languageEquivalence: boolean;
  generalization: boolean;
}

// Using centralized Tag type from @/types/tag

interface ChildTag {
  id: string;
  tag_name: string;
  parent_tag_id: string;
}

interface ConflictResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictType: 'parent' | 'child' | 'semantic';
  tags: Tag[];
  childTagsMap: Record<string, Tag[]>;
  parentTags: Tag[];
  similarityScore?: number;
  onComplete?: () => void;
}

export const TagConflictResolutionModal = ({
  open,
  onOpenChange,
  conflictType,
  tags,
  childTagsMap,
  parentTags,
  similarityScore,
  onComplete
}: ConflictResolutionModalProps) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [coherentChildren, setCoherentChildren] = useState<Set<string>>(new Set());
  const [orphanChildren, setOrphanChildren] = useState<Set<string>>(new Set());
  const [rationale, setRationale] = useState("");
  const [modalOpenTime] = useState(Date.now());
  const [autoSuggestionApplied, setAutoSuggestionApplied] = useState(false);
  const [mergeReasons, setMergeReasons] = useState<MergeReasons>({
    synonymy: false,
    grammaticalVariation: false,
    spellingVariation: false,
    acronym: false,
    typo: false,
    languageEquivalence: false,
    generalization: false,
  });
  const queryClient = useQueryClient();

  // Auto-sugestão de motivos baseada em heurísticas
  const autoSuggestion = useMemo<SuggestedReasons>(() => {
    if (tags.length < 2) {
      return {
        reasons: {
          synonymy: false,
          grammaticalVariation: false,
          spellingVariation: false,
          acronym: false,
          typo: false,
          languageEquivalence: false,
          generalization: false,
        },
        confidence: 0,
        explanations: []
      };
    }
    return suggestMergeReasonsForTags(tags.map(t => t.tag_name));
  }, [tags]);

  // Aplicar auto-sugestão
  const applyAutoSuggestion = () => {
    setMergeReasons(autoSuggestion.reasons);
    setAutoSuggestionApplied(true);
    toast.success("Motivos auto-detectados aplicados!");
  };

  // Determinar status de uso da auto-sugestão
  const getAutoSuggestionUsageStatus = (): 'accepted' | 'modified' | 'ignored' | 'none' => {
    if (autoSuggestion.confidence === 0) return 'none';
    if (!autoSuggestionApplied) return 'ignored';
    
    // Verificar se os motivos foram modificados após aplicar
    const currentReasons = Object.entries(mergeReasons).filter(([_, v]) => v).map(([k]) => k).sort();
    const suggestedReasons = Object.entries(autoSuggestion.reasons).filter(([_, v]) => v).map(([k]) => k).sort();
    
    if (JSON.stringify(currentReasons) === JSON.stringify(suggestedReasons)) {
      return 'accepted';
    }
    return 'modified';
  };

  // Reset state when modal opens - CRITICAL: childTagsMap removed from deps to prevent re-render loop
  useEffect(() => {
    if (open && tags.length > 0) {
      // IMPORTANT: Always set selectedTargetId to first tag when modal opens
      const firstTagId = tags[0].id;
      
      setSelectedTargetId(firstTagId);
      setRationale("");
      setAutoSuggestionApplied(false);
      setMergeReasons({
        synonymy: false,
        grammaticalVariation: false,
        spellingVariation: false,
        acronym: false,
        typo: false,
        languageEquivalence: false,
        generalization: false,
      });
      
      if ((conflictType === 'parent' || conflictType === 'semantic') && tags.length > 1) {
        // Pre-select all children as coherent by default
        const allChildrenIds = new Set<string>();
        tags.slice(1).forEach(tag => {
          const children = childTagsMap[tag.id] || [];
          children.forEach(child => allChildrenIds.add(child.id));
        });
        setCoherentChildren(allChildrenIds);
        setOrphanChildren(new Set());
      }
    } else if (open && tags.length === 0) {
      console.error("[TAG MERGE ERROR] Modal opened but no tags provided!");
      toast.error("Erro: Nenhuma tag selecionada para unificação");
    }
  }, [open, tags, conflictType]); // REMOVED childTagsMap from deps - it causes state reset loops

  // Check if at least one merge reason is selected (for child merges)
  const hasSelectedMergeReason = Object.values(mergeReasons).some(v => v);

  // Build rationale string from selected merge reasons
  const buildMergeRationale = () => {
    const reasons: string[] = [];
    if (mergeReasons.synonymy) reasons.push('Sinonímia');
    if (mergeReasons.grammaticalVariation) reasons.push('Variação Gramatical (Lematização)');
    if (mergeReasons.spellingVariation) reasons.push('Variação de Grafia');
    if (mergeReasons.acronym) reasons.push('Sigla/Acrônimo');
    if (mergeReasons.typo) reasons.push('Erro de Digitação');
    if (mergeReasons.languageEquivalence) reasons.push('Equivalência de Idioma');
    if (mergeReasons.generalization) reasons.push('Generalização Hierárquica');
    
    return reasons.length > 0 
      ? `Unificação: ${reasons.join(', ')}${rationale ? `. ${rationale}` : ''}`
      : rationale;
  };

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const targetTag = tags.find(t => t.id === selectedTargetId);
      const sourceTags = tags.filter(t => t.id !== selectedTargetId);
      
      if (!targetTag) {
        console.error("[TAG MERGE ERROR] Target tag not found! selectedTargetId:", selectedTargetId);
        throw new Error("Tag alvo não encontrada");
      }
      
      if (sourceTags.length === 0) {
        console.error("[TAG MERGE ERROR] No source tags to merge!");
        throw new Error("Nenhuma tag fonte para unificar");
      }

      const timeToDecision = calculateTimeSinceModalOpen(modalOpenTime);

      if (conflictType === 'child') {
        // Child merge: must select a parent
        if (!selectedParentId) throw new Error("Selecione um parent tag");
        
        const parentTag = parentTags.find(p => p.id === selectedParentId);
        
        // Move all children to selected parent
        for (const tag of tags) {
          await supabase
            .from("document_tags")
            .update({ parent_tag_id: selectedParentId })
            .eq("id", tag.id);
        }
        
        // Delete source tags (keep only target)
        await supabase
          .from("document_tags")
          .delete()
          .in("id", sourceTags.map(t => t.id));

        // Create ML rule
        for (const source of sourceTags) {
          if (source.tag_name.toLowerCase() !== targetTag.tag_name.toLowerCase()) {
            await supabase
              .from("tag_merge_rules")
              .upsert({
                source_tag: source.tag_name,
                canonical_tag: targetTag.tag_name,
                chat_type: targetTag.target_chat || "health",
                created_by: "admin"
              }, { onConflict: "source_tag,chat_type" });
          }
        }

        // Log event with merge reasons
        const finalRationale = buildMergeRationale();
        await logTagManagementEvent({
          input_state: {
            tags_involved: tags.map(t => ({
              id: t.id,
              name: t.tag_name,
              type: 'child',
              parent_id: t.parent_tag_id
            })),
            similarity_score: similarityScore,
            detection_type: conflictType === 'child' ? 'child_similarity' : 'semantic'
          },
          action_type: 'merge_child',
          user_decision: {
            target_tag_id: targetTag.id,
            target_tag_name: targetTag.tag_name,
            target_parent_id: selectedParentId,
            target_parent_name: parentTag?.tag_name,
            source_tags_removed: sourceTags.map(t => t.id),
            merge_reasons: mergeReasons,
            auto_suggestion_used: getAutoSuggestionUsageStatus()
          },
          rationale: finalRationale,
          similarity_score: similarityScore,
          time_to_decision_ms: timeToDecision
        });

      } else if (conflictType === 'parent' || conflictType === 'semantic') {
        // Parent merge: coherence check for children
        const coherentChildrenArr = Array.from(coherentChildren);
        const orphanChildrenArr = Array.from(orphanChildren);

        // Move coherent children to target
        if (coherentChildrenArr.length > 0) {
          await supabase
            .from("document_tags")
            .update({ parent_tag_id: targetTag.id })
            .in("id", coherentChildrenArr);
        }

        // Orphan incoherent children (set parent_tag_id to null)
        if (orphanChildrenArr.length > 0) {
          await supabase
            .from("document_tags")
            .update({ parent_tag_id: null })
            .in("id", orphanChildrenArr);
        }

        // Delete source parent tags
        await supabase
          .from("document_tags")
          .delete()
          .in("id", sourceTags.map(t => t.id));

        // Create ML rules
        for (const source of sourceTags) {
          if (source.tag_name.toLowerCase() !== targetTag.tag_name.toLowerCase()) {
            await supabase
              .from("tag_merge_rules")
              .upsert({
                source_tag: source.tag_name,
                canonical_tag: targetTag.tag_name,
                chat_type: targetTag.target_chat || "health",
                created_by: "admin"
              }, { onConflict: "source_tag,chat_type" });
          }
        }

        // Log event
        await logTagManagementEvent({
          input_state: {
            tags_involved: tags.map(t => ({
              id: t.id,
              name: t.tag_name,
              type: 'parent',
              children: (childTagsMap[t.id] || []).map(c => ({ id: c.id, name: c.tag_name }))
            })),
            similarity_score: similarityScore,
            detection_type: conflictType === 'parent' ? 'exact' : 'semantic'
          },
          action_type: 'merge_parent',
          user_decision: {
            target_tag_id: targetTag.id,
            target_tag_name: targetTag.tag_name,
            moved_children: coherentChildrenArr,
            orphaned_children: orphanChildrenArr,
            source_tags_removed: sourceTags.map(t => t.id),
            auto_suggestion_used: getAutoSuggestionUsageStatus()
          },
          rationale,
          similarity_score: similarityScore,
          time_to_decision_ms: timeToDecision
        });
      }
    },
    onSuccess: () => {
      toast.success("Tags unificadas com sucesso! Regra ML criada.");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tag-merge-rules"] });
      onOpenChange(false);
      onComplete?.();
    },
    onError: (error: Error) => {
      console.error("[TAG MERGE ERROR] Merge failed:", error);
      toast.error(`Erro ao unificar: ${error.message}`);
    },
  });

  const handleRejectDuplicate = async () => {
    const timeToDecision = calculateTimeSinceModalOpen(modalOpenTime);
    
    await logTagManagementEvent({
      input_state: {
        tags_involved: tags.map(t => ({
          id: t.id,
          name: t.tag_name,
          type: t.parent_tag_id ? 'child' : 'parent'
        })),
        similarity_score: similarityScore,
        detection_type: conflictType === 'parent' ? 'exact' : conflictType === 'semantic' ? 'semantic' : 'child_similarity'
      },
      action_type: 'reject_duplicate',
      user_decision: {},
      rationale,
      similarity_score: similarityScore,
      time_to_decision_ms: timeToDecision
    });

    toast.info("Duplicata rejeitada. Decisão registrada para aprendizado.");
    onOpenChange(false);
  };

  const toggleCoherent = (childId: string) => {
    setCoherentChildren(prev => {
      const newSet = new Set(prev);
      if (newSet.has(childId)) {
        newSet.delete(childId);
        setOrphanChildren(p => new Set(p).add(childId));
      } else {
        newSet.add(childId);
        setOrphanChildren(p => {
          const ns = new Set(p);
          ns.delete(childId);
          return ns;
        });
      }
      return newSet;
    });
  };

  // Get all children from source tags (for parent merge)
  const sourceChildren: ChildTag[] = [];
  if (conflictType === 'parent' || conflictType === 'semantic') {
    tags.filter(t => t.id !== selectedTargetId).forEach(tag => {
      const children = childTagsMap[tag.id] || [];
      children.forEach(child => {
        sourceChildren.push({
          id: child.id,
          tag_name: child.tag_name,
          parent_tag_id: tag.id
        });
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5 text-purple-400" />
            Resolução de Conflito - {conflictType === 'child' ? 'Tags Filhas' : conflictType === 'semantic' ? 'Similaridade Semântica' : 'Tags Pai'}
          </DialogTitle>
          <DialogDescription>
            {similarityScore && (
              <Badge variant="outline" className="mb-2 bg-amber-500/20 text-amber-300 border-amber-500/30">
                {Math.round(similarityScore * 100)}% similaridade
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tags envolvidas */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Tags Envolvidas:</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Badge 
                  key={tag.id} 
                  variant={tag.id === selectedTargetId ? "default" : "secondary"}
                  className={tag.id === selectedTargetId ? "bg-green-500/20 text-green-300 border-green-500/30" : ""}
                >
                  {tag.tag_name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Seleção da tag alvo */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Tag Alvo (será mantida):</Label>
            <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a tag alvo..." />
              </SelectTrigger>
              <SelectContent>
                {tags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.tag_name} ({tag.source || "N/A"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Para merge de child tags: forçar seleção de parent + motivos de unificação */}
          {conflictType === 'child' && (
            <div className="border border-blue-500/30 rounded-lg p-4 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-blue-400" />
                <Label className="text-sm font-medium">Selecione o Parent Tag Destino:</Label>
              </div>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um parent tag..." />
                </SelectTrigger>
                <SelectContent>
                  {parentTags.map(parent => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.tag_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2 mb-4">
                A tag unificada será movida para este parent.
              </p>

              {/* Seção de Motivos de Unificação - 7 razões baseadas em Data Science */}
              <div className="border-t border-blue-500/20 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-purple-400" />
                    <Label className="text-sm font-medium">Por que estas tags estão sendo unificadas?</Label>
                  </div>
                  
                  {/* Botão de Auto-Sugestão */}
                  {autoSuggestion.confidence > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={applyAutoSuggestion}
                      className="h-7 gap-1.5 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-purple-500/40 hover:border-purple-400 text-purple-300 hover:text-purple-200"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Auto-detectar
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] bg-cyan-500/30 text-cyan-200">
                        {Math.round(autoSuggestion.confidence * 100)}%
                      </Badge>
                    </Button>
                  )}
                </div>
                
                {/* Explicações da auto-sugestão */}
                {autoSuggestion.explanations.length > 0 && (
                  <div className="mb-3 p-2 rounded bg-cyan-500/10 border border-cyan-500/30">
                    <p className="text-xs text-cyan-300 font-medium mb-1 flex items-center gap-1">
                      <Wand2 className="h-3 w-3" />
                      Heurísticas detectadas:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {autoSuggestion.explanations.map((exp, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-cyan-400">•</span>
                          {exp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mb-3">
                  Selecione pelo menos um motivo para o treinamento de ML:
                </p>
                <ScrollArea className="h-[240px] pr-2">
                  <div className="space-y-3">
                    {MERGE_REASONS_CONFIG.map((reason) => (
                      <div
                        key={reason.key}
                        className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                          mergeReasons[reason.key]
                            ? 'bg-purple-500/15 border-purple-500/40'
                            : 'bg-muted/30 border-border/50 hover:border-purple-500/30'
                        }`}
                        onClick={() => setMergeReasons(prev => ({ ...prev, [reason.key]: !prev[reason.key] }))}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={mergeReasons[reason.key]}
                            onCheckedChange={(checked) => 
                              setMergeReasons(prev => ({ ...prev, [reason.key]: !!checked }))
                            }
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{reason.label}</span>
                            <p className="text-xs text-muted-foreground mt-1">{reason.description}</p>
                            <p className="text-xs text-cyan-400/80 mt-1">Ex: {reason.examples}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {!hasSelectedMergeReason && (
                  <p className="text-xs text-amber-400 mt-3 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Escolha ao menos um motivo para unificar
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Para merge de parent tags: Coherence Check */}
          {(conflictType === 'parent' || conflictType === 'semantic') && sourceChildren.length > 0 && (
            <div className="border border-orange-500/30 rounded-lg p-4 bg-orange-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-orange-400" />
                <Label className="text-sm font-medium">Verificação de Coerência - Tags Filhas:</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Selecione quais filhas devem migrar para o parent alvo. As não selecionadas irão para a "Zona de Órfãs".
              </p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {sourceChildren.map(child => {
                  const isCoherent = coherentChildren.has(child.id);
                  const parentTag = tags.find(t => t.id === child.parent_tag_id);
                  
                  return (
                    <div 
                      key={child.id} 
                      className={`flex items-center justify-between p-2 rounded border ${
                        isCoherent 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-orange-500/10 border-orange-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isCoherent}
                          onCheckedChange={() => toggleCoherent(child.id)}
                        />
                        <span className="text-sm">{child.tag_name}</span>
                        <Badge variant="outline" className="text-xs">
                          de: {parentTag?.tag_name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <ArrowRight className="h-3 w-3" />
                        <span className={isCoherent ? "text-green-400" : "text-orange-400"}>
                          {isCoherent ? tags.find(t => t.id === selectedTargetId)?.tag_name : "Órfãs"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex gap-4 mt-3 text-xs">
                <span className="text-green-400">
                  Migrar: {coherentChildren.size}
                </span>
                <span className="text-orange-400">
                  Órfãs: {orphanChildren.size}
                </span>
              </div>
            </div>
          )}

          {/* Campo de rationale */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Justificativa (opcional - para treinamento ML):
            </Label>
            <Textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Por que você está unificando estas tags? Ex: 'São sinônimos no contexto médico'"
              className="h-20"
            />
          </div>

          {/* ML Info Box */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <strong className="text-purple-300">Aprendizado de Máquina:</strong>
                <p className="text-muted-foreground mt-1">
                  Sua decisão será registrada para treinar o modelo de detecção de duplicatas.
                  A IA aprenderá a usar sempre a tag padronizada.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleRejectDuplicate}>
            Não são Duplicatas
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!selectedTargetId) {
                toast.error("Selecione uma tag alvo");
                return;
              }
              
              if (tags.length < 2) {
                toast.error("Precisa de pelo menos 2 tags para unificar");
                return;
              }
              
              mergeMutation.mutate();
            }}
            disabled={
              mergeMutation.isPending || 
              !selectedTargetId || 
              tags.length < 2 ||
              (conflictType === 'child' && (!selectedParentId || !hasSelectedMergeReason))
            }
          >
            {mergeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Unificando...
              </>
            ) : (
              <>
                <Merge className="h-4 w-4 mr-2" />
                Unificar Tags
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
