import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FolderTree, 
  Search, 
  Check, 
  AlertTriangle, 
  X, 
  Loader2, 
  Shield,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Heart,
  BookOpen
} from "lucide-react";
import { 
  validateParentTag, 
  type TagValidationResult,
  getValidationScoreColor,
  getValidationBadgeVariant
} from "@/lib/tag-validation";
import { logTagManagementEvent, calculateTimeSinceModalOpen } from "@/lib/tag-management-logger";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DocumentTag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  parent_tag_id: string | null;
  document_id: string;
}

interface TaxonomyAdoptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tagsToAdopt: DocumentTag[];
  domain: 'general' | 'health' | 'study' | 'economia';
  onComplete?: () => void;
}

interface ValidatedParentTag {
  id: string;
  tag_name: string;
  validation: TagValidationResult;
}

export const TaxonomyAdoptionModal = ({
  open,
  onOpenChange,
  tagsToAdopt,
  domain,
  onComplete
}: TaxonomyAdoptionModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [validatedTags, setValidatedTags] = useState<Map<string, ValidatedParentTag>>(new Map());
  const [isValidating, setIsValidating] = useState(false);
  const [modalOpenTime] = useState(Date.now());
  const queryClient = useQueryClient();

  // Fetch all parent tags
  const { data: parentTags, isLoading: loadingParents } = useQuery({
    queryKey: ["parent-tags-for-adoption"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select("id, tag_name")
        .eq("tag_type", "parent");

      if (error) throw error;
      
      // Deduplicate by tag_name
      const uniqueTags = new Map<string, { id: string; tag_name: string }>();
      data?.forEach(tag => {
        if (!uniqueTags.has(tag.tag_name)) {
          uniqueTags.set(tag.tag_name, tag);
        }
      });
      
      return Array.from(uniqueTags.values());
    },
    enabled: open
  });

  // Filter parent tags by search
  const filteredParentTags = useMemo(() => {
    if (!parentTags) return [];
    if (!searchTerm.trim()) return parentTags;
    
    const search = searchTerm.toLowerCase();
    return parentTags.filter(tag => 
      tag.tag_name.toLowerCase().includes(search)
    );
  }, [parentTags, searchTerm]);

  // Validate filtered parent tags
  useEffect(() => {
    const validateTags = async () => {
      if (!filteredParentTags.length) return;
      
      setIsValidating(true);
      const newValidated = new Map<string, ValidatedParentTag>();
      
      for (const tag of filteredParentTags.slice(0, 20)) { // Limit to first 20 for performance
        if (!validatedTags.has(tag.id)) {
          const validation = await validateParentTag(tag.tag_name, domain);
          newValidated.set(tag.id, { ...tag, validation });
        } else {
          newValidated.set(tag.id, validatedTags.get(tag.id)!);
        }
      }
      
      setValidatedTags(prev => new Map([...prev, ...newValidated]));
      setIsValidating(false);
    };
    
    validateTags();
  }, [filteredParentTags, domain]);

  // Get validated tag data
  const getValidatedTag = (tagId: string): ValidatedParentTag | undefined => {
    return validatedTags.get(tagId);
  };

  // Selected parent tag
  const selectedParent = selectedParentId 
    ? getValidatedTag(selectedParentId) 
    : undefined;

  // Adoption mutation
  const adoptMutation = useMutation({
    mutationFn: async () => {
      if (!selectedParentId || !selectedParent) {
        throw new Error("Selecione um parent tag válido");
      }

      const timeToDecision = calculateTimeSinceModalOpen(modalOpenTime);

      // Update all selected tags to be children of the selected parent
      for (const tag of tagsToAdopt) {
        const { error } = await supabase
          .from("document_tags")
          .update({ 
            parent_tag_id: selectedParentId,
            tag_type: "child" 
          })
          .eq("id", tag.id);

        if (error) throw error;
      }

      // Log the event
      await logTagManagementEvent({
        input_state: {
          tags_involved: tagsToAdopt.map(t => ({
            id: t.id,
            name: t.tag_name,
            type: t.parent_tag_id ? 'child' : 'parent' as const,
            parent_id: t.parent_tag_id
          }))
        },
        action_type: 'adopt_orphan',
        user_decision: {
          target_parent_id: selectedParentId,
          target_parent_name: selectedParent.tag_name,
          action: 'taxonomy_adoption'
        },
        rationale: `Adoção taxonômica: ${tagsToAdopt.length} tags adotadas por "${selectedParent.tag_name}" (Score: ${selectedParent.validation.score}%, Domain: ${domain})`,
        time_to_decision_ms: timeToDecision
      });
    },
    onSuccess: () => {
      toast.success(`${tagsToAdopt.length} tag(s) adotadas com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["document-tags-all"] });
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      onOpenChange(false);
      onComplete?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro na adoção: ${error.message}`);
    }
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setSelectedParentId(null);
    }
  }, [open]);

  const getDomainIcon = () => {
    switch (domain) {
      case 'health': return <Heart className="h-4 w-4 text-red-400" />;
      case 'study': return <BookOpen className="h-4 w-4 text-blue-400" />;
      default: return <FolderTree className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDomainLabel = () => {
    switch (domain) {
      case 'health': return 'Saúde';
      case 'study': return 'Estudo';
      default: return 'Geral';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-emerald-400" />
            Adoção Taxonômica
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Selecione um Parent Tag validado para adotar {tagsToAdopt.length} tag(s)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Tags to adopt */}
          <div className="bg-muted/30 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              Tags a Serem Adotadas
              <Badge variant="secondary">{tagsToAdopt.length}</Badge>
            </h4>
            <div className="flex flex-wrap gap-2">
              {tagsToAdopt.slice(0, 10).map(tag => (
                <Badge key={tag.id} variant="outline" className="bg-background">
                  {tag.tag_name}
                </Badge>
              ))}
              {tagsToAdopt.length > 10 && (
                <Badge variant="secondary">+{tagsToAdopt.length - 10} mais</Badge>
              )}
            </div>
          </div>

          {/* Domain indicator */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
            {getDomainIcon()}
            <span className="text-sm">
              Domínio Ativo: <strong>{getDomainLabel()}</strong>
            </span>
            {domain === 'health' && (
              <Badge variant="outline" className="ml-auto text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Validação de Saúde Ativa
              </Badge>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar parent tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Parent tags list with validation */}
          <ScrollArea className="h-[280px] border rounded-lg">
            {loadingParents ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredParentTags.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-full text-muted-foreground">
                <FolderTree className="h-8 w-8 mb-2 opacity-50" />
                <p>Nenhum parent tag encontrado</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredParentTags.slice(0, 20).map(tag => {
                  const validated = getValidatedTag(tag.id);
                  const isBlocked = validated && !validated.validation.isValid;
                  const isSelected = selectedParentId === tag.id;
                  
                  return (
                    <div
                      key={tag.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer
                        ${isBlocked ? 'opacity-50 cursor-not-allowed bg-destructive/5 border-destructive/20' : ''}
                        ${isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50 border-transparent'}
                      `}
                      onClick={() => {
                        if (!isBlocked) {
                          setSelectedParentId(isSelected ? null : tag.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {isSelected ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : isBlocked ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                        <span className={isBlocked ? 'line-through text-muted-foreground' : ''}>
                          {tag.tag_name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {validated ? (
                          <>
                            {/* Validation score */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant={getValidationBadgeVariant(validated.validation.score)}
                                    className="text-xs"
                                  >
                                    {validated.validation.score >= 80 ? (
                                      <ShieldCheck className="h-3 w-3 mr-1" />
                                    ) : validated.validation.score >= 50 ? (
                                      <Shield className="h-3 w-3 mr-1" />
                                    ) : (
                                      <ShieldAlert className="h-3 w-3 mr-1" />
                                    )}
                                    {validated.validation.score}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[300px]">
                                  <p className="font-semibold mb-2">Validação de Taxonomia</p>
                                  {validated.validation.violations.length === 0 ? (
                                    <p className="text-green-400 text-sm">✓ Todas as regras aprovadas</p>
                                  ) : (
                                    <ul className="text-sm space-y-1">
                                      {validated.validation.violations.map((v, i) => (
                                        <li key={i} className={v.severity === 'error' ? 'text-red-400' : 'text-amber-400'}>
                                          {v.severity === 'error' ? '✗' : '⚠'} {v.message}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {/* Blocked indicator */}
                            {isBlocked && (
                              <Badge variant="destructive" className="text-xs">
                                BLOQUEADO
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {isValidating && (
                  <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Validando tags...</span>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* AI Reasoning Section */}
          {selectedParent && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-emerald-400">
                <FolderTree className="h-4 w-4" />
                Preview Hierárquico
              </h4>
              <div className="pl-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-emerald-600">
                    {selectedParent.tag_name}
                  </Badge>
                  <Badge variant="outline" className={getValidationScoreColor(selectedParent.validation.score)}>
                    {selectedParent.validation.score}%
                  </Badge>
                </div>
                <div className="pl-4 border-l-2 border-emerald-500/30 space-y-1 mt-2">
                  {tagsToAdopt.slice(0, 5).map(tag => (
                    <div key={tag.id} className="flex items-center gap-2 text-sm">
                      <ChevronRight className="h-3 w-3 text-emerald-400" />
                      <span>{tag.tag_name}</span>
                    </div>
                  ))}
                  {tagsToAdopt.length > 5 && (
                    <div className="text-sm text-muted-foreground pl-5">
                      +{tagsToAdopt.length - 5} mais...
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI Reasoning */}
              <div className="mt-3 pt-3 border-t border-emerald-500/20">
                <h5 className="text-xs font-semibold text-emerald-300 mb-2">Por que esta sugestão?</h5>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3 text-green-400" />
                    <span>Score de validação: <strong className="text-foreground">{selectedParent.validation.score}%</strong></span>
                  </li>
                  {selectedParent.validation.violations.length === 0 ? (
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-400" />
                      <span>Todas as regras de validação aprovadas</span>
                    </li>
                  ) : (
                    selectedParent.validation.violations.slice(0, 2).map((v, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                        <span>{v.message}</span>
                      </li>
                    ))
                  )}
                  <li className="flex items-center gap-2">
                    <Heart className="h-3 w-3 text-pink-400" />
                    <span>Domínio: <strong className="text-foreground">{getDomainLabel()}</strong></span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
            }}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <X className="h-4 w-4 mr-2" />
            Rejeitar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => adoptMutation.mutate()}
            disabled={!selectedParentId || !selectedParent?.validation.isValid || adoptMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {adoptMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adotando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Aceitar Adoção
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
