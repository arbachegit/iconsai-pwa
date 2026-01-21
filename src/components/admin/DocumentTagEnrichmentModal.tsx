import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, X, ChevronRight, Tags, FileText, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface SelectedTag {
  id: string;
  name: string;
  type: 'parent' | 'child';
  parentId?: string | null;
  parentName?: string | null;
}

interface DocumentTagEnrichmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileIndex: number;
  onSave: (data: {
    selectedTags: SelectedTag[];
    additionalContext: string;
  }) => void;
  initialTags?: SelectedTag[];
  initialContext?: string;
}

interface HierarchicalTag {
  id: string;
  tag_name: string;
  confidence: number | null;
  children: {
    id: string;
    tag_name: string;
    confidence: number | null;
    parent_tag_id: string;
  }[];
}

export const DocumentTagEnrichmentModal = ({
  open,
  onOpenChange,
  fileName,
  fileIndex,
  onSave,
  initialTags = [],
  initialContext = ""
}: DocumentTagEnrichmentModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>(initialTags);
  const [additionalContext, setAdditionalContext] = useState(initialContext);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  // Fetch hierarchical tags
  const { data: hierarchicalTags, isLoading } = useQuery({
    queryKey: ["available-tags-hierarchical"],
    queryFn: async (): Promise<HierarchicalTag[]> => {
      // Fetch parent tags
      const { data: parents } = await supabase
        .from("document_tags")
        .select("id, tag_name, confidence")
        .eq("tag_type", "parent")
        .order("tag_name");
      
      // Fetch child tags
      const { data: children } = await supabase
        .from("document_tags")
        .select("id, tag_name, parent_tag_id, confidence")
        .eq("tag_type", "child")
        .order("tag_name");
      
      // Group children by parent, removing duplicates
      const uniqueParents = new Map<string, HierarchicalTag>();
      
      parents?.forEach(parent => {
        const key = parent.tag_name.toLowerCase();
        if (!uniqueParents.has(key)) {
          const parentChildren = children?.filter(c => c.parent_tag_id === parent.id) || [];
          // Remove duplicate children
          const uniqueChildren = new Map<string, typeof parentChildren[0]>();
          parentChildren.forEach(child => {
            const childKey = child.tag_name.toLowerCase();
            if (!uniqueChildren.has(childKey)) {
              uniqueChildren.set(childKey, child);
            }
          });
          
          uniqueParents.set(key, {
            ...parent,
            children: Array.from(uniqueChildren.values())
          });
        }
      });
      
      return Array.from(uniqueParents.values());
    },
    enabled: open
  });

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!hierarchicalTags) return [];
    if (!searchQuery.trim()) return hierarchicalTags;
    
    const query = searchQuery.toLowerCase();
    return hierarchicalTags.filter(parent => {
      const parentMatches = parent.tag_name.toLowerCase().includes(query);
      const childMatches = parent.children.some(child => 
        child.tag_name.toLowerCase().includes(query)
      );
      return parentMatches || childMatches;
    });
  }, [hierarchicalTags, searchQuery]);

  // Check if a tag is selected
  const isTagSelected = (tagId: string) => {
    return selectedTags.some(t => t.id === tagId);
  };

  // Toggle parent tag selection
  const toggleParentTag = (parent: HierarchicalTag) => {
    if (isTagSelected(parent.id)) {
      // Remove parent and all its children
      setSelectedTags(prev => prev.filter(t => 
        t.id !== parent.id && t.parentId !== parent.id
      ));
    } else {
      // Add only the parent
      setSelectedTags(prev => [...prev, {
        id: parent.id,
        name: parent.tag_name,
        type: 'parent'
      }]);
    }
  };

  // Toggle child tag selection (auto-adds parent if needed)
  const toggleChildTag = (child: HierarchicalTag['children'][0], parent: HierarchicalTag) => {
    if (isTagSelected(child.id)) {
      // Remove only the child
      setSelectedTags(prev => prev.filter(t => t.id !== child.id));
    } else {
      // Add child and auto-add parent if not already selected
      const newTags: SelectedTag[] = [];
      
      if (!isTagSelected(parent.id)) {
        newTags.push({
          id: parent.id,
          name: parent.tag_name,
          type: 'parent'
        });
      }
      
      newTags.push({
        id: child.id,
        name: child.tag_name,
        type: 'child',
        parentId: parent.id,
        parentName: parent.tag_name
      });
      
      setSelectedTags(prev => [...prev, ...newTags]);
    }
  };

  // Remove tag from selection
  const removeTag = (tagId: string) => {
    const tag = selectedTags.find(t => t.id === tagId);
    if (tag?.type === 'parent') {
      // Remove parent and all children
      setSelectedTags(prev => prev.filter(t => 
        t.id !== tagId && t.parentId !== tagId
      ));
    } else {
      // Remove only the child
      setSelectedTags(prev => prev.filter(t => t.id !== tagId));
    }
  };

  // Toggle expanded state
  const toggleExpanded = (parentId: string) => {
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  };

  // Handle save
  const handleSave = () => {
    onSave({
      selectedTags,
      additionalContext: additionalContext.trim()
    });
    onOpenChange(false);
  };

  // Separate parent and child tags for display
  const parentBadges = selectedTags.filter(t => t.type === 'parent');
  const childBadges = selectedTags.filter(t => t.type === 'child');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-blue-500" />
            Enriquecer Documento
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="truncate">{fileName}</span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search Field */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tags existentes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected Tags Display */}
          {selectedTags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tags Selecionadas</Label>
              <div className="flex flex-wrap gap-2">
                {parentBadges.map(tag => (
                  <Badge 
                    key={tag.id}
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  >
                    {tag.name}
                    <button 
                      onClick={() => removeTag(tag.id)}
                      className="ml-1 hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {childBadges.map(tag => (
                  <Badge 
                    key={tag.id}
                    variant="secondary"
                    className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                  >
                    {tag.name}
                    <button 
                      onClick={() => removeTag(tag.id)}
                      className="ml-1 hover:text-green-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              {/* Visual Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <Info className="h-3 w-3" />
                <span>
                  <span className="text-blue-500">Azul</span> = Categorias (Parent) | 
                  <span className="text-green-500 ml-1">Verde</span> = Subcategorias (Child)
                </span>
              </div>
            </div>
          )}

          {/* Available Tags List */}
          <div className="flex-1 overflow-hidden">
            <Label className="text-xs text-muted-foreground mb-2 block">Tags Disponíveis</Label>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              {isLoading ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Carregando tags...
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {searchQuery ? "Nenhuma tag encontrada" : "Nenhuma tag disponível"}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTags.map(parent => (
                    <Collapsible 
                      key={parent.id} 
                      open={expandedParents.has(parent.id)}
                      onOpenChange={() => toggleExpanded(parent.id)}
                    >
                      <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                        <Checkbox
                          id={`parent-${parent.id}`}
                          checked={isTagSelected(parent.id)}
                          onCheckedChange={() => toggleParentTag(parent)}
                        />
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-1 flex-1 text-left">
                            <ChevronRight className={cn(
                              "h-4 w-4 transition-transform",
                              expandedParents.has(parent.id) && "rotate-90"
                            )} />
                            <span className="text-sm font-medium">{parent.tag_name}</span>
                            {parent.confidence && (
                              <Badge variant="outline" className="ml-auto text-xs">
                                {Math.round(parent.confidence * 100)}%
                              </Badge>
                            )}
                          </button>
                        </CollapsibleTrigger>
                      </div>
                      
                      <CollapsibleContent>
                        <div className="ml-8 space-y-1 mb-2">
                          {parent.children.map(child => (
                            <div 
                              key={child.id}
                              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/30"
                            >
                              <Checkbox
                                id={`child-${child.id}`}
                                checked={isTagSelected(child.id)}
                                onCheckedChange={() => toggleChildTag(child, parent)}
                              />
                              <label 
                                htmlFor={`child-${child.id}`}
                                className="text-sm text-muted-foreground cursor-pointer flex-1"
                              >
                                {child.tag_name}
                              </label>
                              {child.confidence && (
                                <Badge variant="outline" className="text-xs opacity-70">
                                  {Math.round(child.confidence * 100)}%
                                </Badge>
                              )}
                            </div>
                          ))}
                          {parent.children.length === 0 && (
                            <div className="text-xs text-muted-foreground italic pl-2">
                              Sem subcategorias
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Additional Context Field */}
          <div className="space-y-2">
            <Label htmlFor="additional-context" className="text-sm">
              Contexto Adicional para Resumo da IA
            </Label>
            <Textarea
              id="additional-context"
              placeholder="Adicione detalhes específicos, datas ou pontos de foco para ajudar a IA a gerar um resumo mais rico..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value.slice(0, 500))}
              className="resize-none h-24"
            />
            <div className="text-xs text-muted-foreground text-right">
              {additionalContext.length}/500 caracteres
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Enriquecimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
