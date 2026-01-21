import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Merge, XCircle, ChevronRight, Brain, Target, Home, Users, FolderOpen } from "lucide-react";
import { suggestMergeReasons, type SuggestedReasons } from "@/lib/merge-reason-heuristics";
import { calculateSimilarity } from "@/lib/string-similarity";
import type { Tag } from "@/types/tag";

interface OrphanedTag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  source: string | null;
  document_id: string;
  parent_tag_id: string | null;
  created_at: string;
}

interface UnificationSuggestion {
  tag1: Tag;
  tag2: Tag;
  suggestion: SuggestedReasons;
  type: 'parent' | 'child';
}

interface OrphanAdoptionSuggestion {
  orphan: OrphanedTag;
  suggestedParent: Tag;
  similarity: number;
  explanations: string[];
}

interface TagUnificationSuggestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentTags: Tag[];
  childTagsMap: Record<string, Tag[]>;
  orphanedTags: OrphanedTag[];
  onMerge: (type: 'parent' | 'child' | 'semantic', ids: string[], similarity?: number) => void;
  onReject: (ids: string[], tagName: string, type: 'parent' | 'child') => void;
  onAdoptOrphan?: (orphanId: string, parentId: string) => void;
}

// Use centralized similarity calculation (returns 0-100)

export const TagUnificationSuggestionsModal = ({
  open,
  onOpenChange,
  parentTags,
  childTagsMap,
  orphanedTags,
  onMerge,
  onReject,
  onAdoptOrphan,
}: TagUnificationSuggestionsModalProps) => {
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [dismissedAdoptions, setDismissedAdoptions] = useState<Set<string>>(new Set());

  // Gerar sugestões de unificação usando heurísticas
  const suggestions = useMemo<UnificationSuggestion[]>(() => {
    if (!open) return [];
    
    const results: UnificationSuggestion[] = [];
    
    // Analisar parent tags entre si
    for (let i = 0; i < parentTags.length; i++) {
      for (let j = i + 1; j < parentTags.length; j++) {
        const tag1 = parentTags[i];
        const tag2 = parentTags[j];
        
        // Pular se já foi rejeitada
        const key = `${tag1.id}-${tag2.id}`;
        if (dismissedSuggestions.has(key)) continue;
        
        const suggestion = suggestMergeReasons(tag1.tag_name, tag2.tag_name);
        
        // Incluir se confiança > 0 (alguma heurística detectou algo)
        if (suggestion.confidence > 0) {
          results.push({ tag1, tag2, suggestion, type: 'parent' });
        } else {
          // Verificar similaridade textual mesmo sem match de heurística
          const similarityPct = calculateSimilarity(tag1.tag_name, tag2.tag_name);
          const similarity = similarityPct / 100; // Convert to 0-1 for consistency
          if (similarity >= 0.7) {
            results.push({
              tag1,
              tag2,
              suggestion: {
                ...suggestion,
                confidence: similarity,
                explanations: [`Similaridade textual de ${Math.round(similarityPct)}%`]
              },
              type: 'parent'
            });
          }
        }
      }
    }
    
    // Analisar child tags dentro do mesmo parent
    Object.entries(childTagsMap).forEach(([parentId, children]) => {
      for (let i = 0; i < children.length; i++) {
        for (let j = i + 1; j < children.length; j++) {
          const tag1 = children[i];
          const tag2 = children[j];
          
          const key = `${tag1.id}-${tag2.id}`;
          if (dismissedSuggestions.has(key)) continue;
          
          const suggestion = suggestMergeReasons(tag1.tag_name, tag2.tag_name);
          
          if (suggestion.confidence > 0) {
            results.push({ tag1, tag2, suggestion, type: 'child' });
          } else {
            const similarityPct = calculateSimilarity(tag1.tag_name, tag2.tag_name);
            const similarity = similarityPct / 100; // Convert to 0-1 for consistency
            if (similarity >= 0.6) {
              results.push({
                tag1,
                tag2,
                suggestion: {
                  ...suggestion,
                  confidence: similarity,
                  explanations: [`Similaridade textual de ${Math.round(similarityPct)}%`]
                },
                type: 'child'
              });
            }
          }
        }
      }
    });
    
    // Ordenar por confiança (mais alta primeiro)
    return results.sort((a, b) => b.suggestion.confidence - a.suggestion.confidence);
  }, [open, parentTags, childTagsMap, dismissedSuggestions]);

  // Gerar sugestões de adoção para tags órfãs
  const orphanAdoptionSuggestions = useMemo<OrphanAdoptionSuggestion[]>(() => {
    if (!open || !orphanedTags || orphanedTags.length === 0) return [];
    
    const results: OrphanAdoptionSuggestion[] = [];
    
    for (const orphan of orphanedTags) {
      // Pular se já foi rejeitada
      if (dismissedAdoptions.has(orphan.id)) continue;
      
      let bestMatch: { parent: Tag; similarity: number; explanations: string[] } | null = null;
      
      for (const parent of parentTags) {
        // Verificar similaridade textual (returns 0-100)
        const similarityPct = calculateSimilarity(orphan.tag_name, parent.tag_name);
        const similarity = similarityPct / 100; // Convert to 0-1 for consistency
        
        // Verificar heurísticas de merge
        const heuristicResult = suggestMergeReasons(orphan.tag_name, parent.tag_name);
        
        // Combinar score: usar o maior entre similaridade textual e confiança heurística
        const combinedScore = Math.max(similarity, heuristicResult.confidence);
        
        // Threshold mais baixo para sugestões de adoção (50%)
        if (combinedScore >= 0.5) {
          const explanations: string[] = [];
          
          if (heuristicResult.confidence > 0) {
            explanations.push(...heuristicResult.explanations);
          }
          if (similarity >= 0.5) {
            explanations.push(`Similaridade textual: ${Math.round(similarityPct)}%`);
          }
          
          if (!bestMatch || combinedScore > bestMatch.similarity) {
            bestMatch = { parent, similarity: combinedScore, explanations };
          }
        }
      }
      
      if (bestMatch) {
        results.push({
          orphan,
          suggestedParent: bestMatch.parent,
          similarity: bestMatch.similarity,
          explanations: bestMatch.explanations
        });
      }
    }
    
    // Ordenar por similaridade (mais alta primeiro)
    return results.sort((a, b) => b.similarity - a.similarity);
  }, [open, orphanedTags, parentTags, dismissedAdoptions]);

  const handleDismiss = (tag1Id: string, tag2Id: string, tag1Name: string, tag2Name: string, type: 'parent' | 'child') => {
    const key = `${tag1Id}-${tag2Id}`;
    setDismissedSuggestions(prev => new Set(prev).add(key));
    onReject([tag1Id, tag2Id], `${tag1Name} / ${tag2Name}`, type);
  };

  const handleDismissAdoption = (orphanId: string) => {
    setDismissedAdoptions(prev => new Set(prev).add(orphanId));
  };

  const handleMerge = (s: UnificationSuggestion) => {
    onMerge(
      s.type === 'parent' ? 'semantic' : 'child', 
      [s.tag1.id, s.tag2.id], 
      s.suggestion.confidence
    );
  };

  const handleAdopt = (suggestion: OrphanAdoptionSuggestion) => {
    if (onAdoptOrphan) {
      onAdoptOrphan(suggestion.orphan.id, suggestion.suggestedParent.id);
    }
  };

  const getReasonLabels = (suggestion: SuggestedReasons): string[] => {
    const labels: string[] = [];
    if (suggestion.reasons.synonymy) labels.push('Sinonímia');
    if (suggestion.reasons.grammaticalVariation) labels.push('Plural/Singular');
    if (suggestion.reasons.spellingVariation) labels.push('Variação de Grafia');
    if (suggestion.reasons.acronym) labels.push('Sigla/Acrônimo');
    if (suggestion.reasons.typo) labels.push('Erro de Digitação');
    if (suggestion.reasons.languageEquivalence) labels.push('PT ↔ EN');
    if (suggestion.reasons.generalization) labels.push('Generalização');
    return labels;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.85) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (confidence >= 0.7) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  };

  const totalSuggestions = suggestions.length + orphanAdoptionSuggestions.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            Sugestões de Unificação Inteligente
          </DialogTitle>
          <DialogDescription>
            Análise automática detectou possíveis tags que podem ser unificadas ou órfãs que podem ser adotadas.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {totalSuggestions === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma sugestão de unificação encontrada.</p>
              <p className="text-sm mt-2">Todas as tags parecem estar bem organizadas!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sugestões de Unificação de Tags */}
              {suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Merge className="h-4 w-4 text-purple-400" />
                    <h4 className="font-medium text-sm">Sugestões de Unificação</h4>
                    <Badge variant="outline" className="text-xs">{suggestions.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {suggestions.map((s, idx) => {
                      const reasonLabels = getReasonLabels(s.suggestion);
                      
                      return (
                        <div 
                          key={`${s.tag1.id}-${s.tag2.id}`}
                          className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              {/* Tags */}
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge variant="secondary" className="font-medium">
                                  {s.tag1.tag_name}
                                </Badge>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                <Badge variant="secondary" className="font-medium">
                                  {s.tag2.tag_name}
                                </Badge>
                                <Badge variant="outline" className={getConfidenceColor(s.suggestion.confidence)}>
                                  {Math.round(s.suggestion.confidence * 100)}%
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {s.type === 'parent' ? 'Parent' : 'Child'}
                                </Badge>
                              </div>
                              
                              {/* Motivos detectados */}
                              {reasonLabels.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap mb-2">
                                  <Target className="h-3 w-3 text-purple-400" />
                                  {reasonLabels.map((label, i) => (
                                    <Badge key={i} variant="outline" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/30">
                                      {label}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {/* Explicações */}
                              {s.suggestion.explanations.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {s.suggestion.explanations[0]}
                                </p>
                              )}
                            </div>
                            
                            {/* Ações */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                onClick={() => handleDismiss(s.tag1.id, s.tag2.id, s.tag1.tag_name, s.tag2.tag_name, s.type)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMerge(s)}
                              >
                                <Merge className="h-4 w-4 mr-1" />
                                Unificar
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sugestões de Adoção para Tags Órfãs */}
              {orphanAdoptionSuggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FolderOpen className="h-4 w-4 text-orange-400" />
                    <h4 className="font-medium text-sm">Sugestões de Adoção para Tags Órfãs</h4>
                    <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                      {orphanAdoptionSuggestions.length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {orphanAdoptionSuggestions.map((s) => (
                      <div 
                        key={s.orphan.id}
                        className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {/* Órfã → Parent sugerido */}
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <Badge variant="secondary" className="font-medium bg-orange-500/20 text-orange-300 border-orange-500/30">
                                <Users className="h-3 w-3 mr-1" />
                                {s.orphan.tag_name}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="secondary" className="font-medium bg-green-500/20 text-green-300 border-green-500/30">
                                <Home className="h-3 w-3 mr-1" />
                                {s.suggestedParent.tag_name}
                              </Badge>
                              <Badge variant="outline" className={getConfidenceColor(s.similarity)}>
                                {Math.round(s.similarity * 100)}%
                              </Badge>
                            </div>
                            
                            {/* Explicações */}
                            {s.explanations.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {s.explanations.join(' • ')}
                              </p>
                            )}
                          </div>
                          
                          {/* Ações */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                              onClick={() => handleDismissAdoption(s.orphan.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            {onAdoptOrphan && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                                onClick={() => handleAdopt(s)}
                              >
                                <Home className="h-4 w-4 mr-1" />
                                Adotar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {totalSuggestions} sugestão(ões) encontrada(s)
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};