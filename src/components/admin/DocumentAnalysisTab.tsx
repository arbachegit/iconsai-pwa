import { useState, useCallback } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FileText, ChevronDown, Loader2, Tag, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileJson, FileDown, HelpCircle, Heart, BookOpen, Package, Check, AlertTriangle, X, Plus, Trash2, Merge, FolderTree } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { exportData, type ExportFormat } from "@/lib/export-utils";
import { toast } from "sonner";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { TagConflictResolutionModal } from "./TagConflictResolutionModal";
import { DocumentRenameStats } from "./DocumentRenameStats";
import { TaxonomyAdoptionModal } from "./TaxonomyAdoptionModal";

interface Document {
  id: string;
  filename: string;
  ai_title: string | null;
  needs_title_review: boolean | null;
  target_chat: string;
  ai_summary: string | null;
  status: string;
  implementation_status: string | null;
  created_at: string;
  total_chunks: number | null;
  total_words: number | null;
}

interface DocumentTag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  parent_tag_id: string | null;
  document_id: string;
}

// New taxonomy system interface
interface DocumentTaxonomy {
  id: string;
  entity_id: string;
  taxonomy_id: string;
  confidence: number | null;
  source: string;
  is_primary: boolean | null;
  taxonomy_code: string;
  taxonomy_name: string;
  taxonomy_color: string | null;
  taxonomy_icon: string | null;
}

export const DocumentAnalysisTab = () => {
  const [filterChat, setFilterChat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTagName, setFilterTagName] = useState("");
  const [tagTypeFilter, setTagTypeFilter] = useState<"all" | "parent" | "child">("all");
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [tagSearchOpen, setTagSearchOpen] = useState<string | null>(null);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [selectedParentTag, setSelectedParentTag] = useState<string | null>(null);
  const [selectedChildTags, setSelectedChildTags] = useState<Set<string>>(new Set());
  const [tagToDelete, setTagToDelete] = useState<{ id: string; name: string; isParent: boolean } | null>(null);
  
  // Multi-selection state for tag management
  const [selectedDocTags, setSelectedDocTags] = useState<Set<string>>(new Set());
  const [unifyModalOpen, setUnifyModalOpen] = useState(false);
  const [adoptModalOpen, setAdoptModalOpen] = useState(false);
  const [isAdoptProcessing, setIsAdoptProcessing] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["documents-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
  });

  // Fetch all legacy tags
  const { data: allTags, isLoading: tagsLoading } = useQuery({
    queryKey: ["document-tags-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select("*");

      if (error) throw error;
      return data as DocumentTag[];
    },
  });

  // Fetch new taxonomy system data (entity_tags + global_taxonomy)
  const { data: allTaxonomies, isLoading: taxonomiesLoading } = useQuery({
    queryKey: ["document-taxonomies-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_tags")
        .select(`
          id,
          entity_id,
          taxonomy_id,
          confidence,
          source,
          is_primary,
          global_taxonomy!inner (
            code,
            name,
            color,
            icon
          )
        `)
        .eq("entity_type", "document");

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.id,
        entity_id: item.entity_id,
        taxonomy_id: item.taxonomy_id,
        confidence: item.confidence,
        source: item.source,
        is_primary: item.is_primary,
        taxonomy_code: item.global_taxonomy?.code || '',
        taxonomy_name: item.global_taxonomy?.name || '',
        taxonomy_color: item.global_taxonomy?.color,
        taxonomy_icon: item.global_taxonomy?.icon
      })) as DocumentTaxonomy[];
    },
  });

  // Fetch tag modification logs for merge indicators
  const { data: tagModificationLogs } = useQuery({
    queryKey: ["tag-modification-logs-for-indicators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tag_modification_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Array<{
        id: string;
        document_id: string | null;
        document_filename: string;
        original_tag_name: string;
        new_tag_name: string;
        modification_type: string;
        created_at: string;
      }>;
    },
  });

  // Helper to get merge info for a tag
  const getTagMergeInfo = (docId: string, tagName: string) => {
    return tagModificationLogs?.filter(
      log => log.document_id === docId && log.new_tag_name === tagName
    ) || [];
  };

  // Fetch unique parent tag names for autocomplete
  const { data: uniqueTags } = useQuery({
    queryKey: ["unique-tags"],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_tags")
        .select("tag_name")
        .eq("tag_type", "parent");
      return [...new Set(data?.map(t => t.tag_name) || [])];
    }
  });

  // Fetch child tags for a selected parent tag name
  const { data: childTagsForParent } = useQuery({
    queryKey: ["child-tags-for-parent", selectedParentTag],
    queryFn: async () => {
      if (!selectedParentTag) return [];
      // Find all parent tag IDs with this name
      const { data: parentTags } = await supabase
        .from("document_tags")
        .select("id")
        .eq("tag_name", selectedParentTag)
        .eq("tag_type", "parent");
      
      if (!parentTags?.length) return [];
      
      // Get all child tags for these parents
      const parentIds = parentTags.map(t => t.id);
      const { data: childTags } = await supabase
        .from("document_tags")
        .select("tag_name")
        .in("parent_tag_id", parentIds);
      
      return [...new Set(childTags?.map(t => t.tag_name) || [])];
    },
    enabled: !!selectedParentTag
  });

  // Insert parent tag mutation
  const insertTagMutation = useMutation({
    mutationFn: async ({ docId, tagName }: { docId: string; tagName: string }) => {
      const { data } = await supabase.from("document_tags").insert({
        document_id: docId,
        tag_name: tagName,
        tag_type: "parent",
        source: "admin",
        confidence: 1.0
      }).select().single();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-tags-all"] });
      queryClient.invalidateQueries({ queryKey: ["unique-tags"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar tag: ${error.message}`);
    }
  });

  // Insert tags with children mutation
  const insertTagsWithChildrenMutation = useMutation({
    mutationFn: async ({ docId, parentTagName, childTagNames }: { docId: string; parentTagName: string; childTagNames: string[] }) => {
      // Insert parent tag
      const { data: parentTag } = await supabase.from("document_tags").insert({
        document_id: docId,
        tag_name: parentTagName,
        tag_type: "parent",
        source: "admin",
        confidence: 1.0
      }).select().single();

      if (!parentTag) throw new Error("Falha ao criar tag pai");

      // Insert child tags
      if (childTagNames.length > 0) {
        const childInserts = childTagNames.map(childName => ({
          document_id: docId,
          tag_name: childName,
          tag_type: "child",
          parent_tag_id: parentTag.id,
          source: "admin",
          confidence: 1.0
        }));
        await supabase.from("document_tags").insert(childInserts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-tags-all"] });
      queryClient.invalidateQueries({ queryKey: ["unique-tags"] });
      queryClient.invalidateQueries({ queryKey: ["child-tags-for-parent"] });
      toast.success("Tags adicionadas com sucesso!");
      setTagSearchOpen(null);
      setTagSearchTerm("");
      setSelectedParentTag(null);
      setSelectedChildTags(new Set());
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar tags: ${error.message}`);
    }
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      // First delete all child tags that reference this tag
      const { error: childError } = await supabase
        .from("document_tags")
        .delete()
        .eq("parent_tag_id", tagId);
      
      if (childError) {
        console.error("Error deleting child tags:", childError);
        throw new Error(`Erro ao excluir tags filhas: ${childError.message}`);
      }
      
      // Then delete the tag itself
      const { error: deleteError } = await supabase
        .from("document_tags")
        .delete()
        .eq("id", tagId);
      
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-tags-all"] });
      queryClient.invalidateQueries({ queryKey: ["unique-tags"] });
      toast.success("Tag excluída com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao deletar tag: ${error.message}`);
    }
  });

  // Toggle tag selection for multi-select
  const toggleTagSelection = (tagId: string) => {
    setSelectedDocTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  // Get selected tags for modals
  const getSelectedTagsForModal = () => {
    if (!allTags) return [];
    return allTags.filter(tag => selectedDocTags.has(tag.id));
  };

  // Determine domain from selected tags
  const getSelectedTagsDomain = (): 'general' | 'health' | 'study' | 'economia' => {
    const selectedTags = getSelectedTagsForModal();
    if (selectedTags.length === 0) return 'general';
    
    // Find documents for selected tags and determine domain
    const docIds = [...new Set(selectedTags.map(t => t.document_id))];
    const docs = documents?.filter(d => docIds.includes(d.id)) || [];
    
    const hasHealth = docs.some(d => d.target_chat === 'health');
    const hasStudy = docs.some(d => d.target_chat === 'study');
    const hasEconomia = docs.some(d => d.target_chat === 'economia');
    
    if (hasHealth && !hasStudy && !hasEconomia) return 'health';
    if (hasStudy && !hasHealth && !hasEconomia) return 'study';
    if (hasEconomia && !hasHealth && !hasStudy) return 'economia';
    return 'general';
  };

  // Build childTagsMap for TagConflictResolutionModal
  const buildChildTagsMap = () => {
    const selectedTags = getSelectedTagsForModal();
    const map: Record<string, Array<{
      id: string;
      tag_name: string;
      tag_type: string;
      confidence: number | null;
      document_id: string;
      parent_tag_id: string | null;
      source: string | null;
      created_at: string;
      target_chat?: string | null;
    }>> = {};
    
    selectedTags.forEach(tag => {
      if (!tag.parent_tag_id) {
        // This is a parent tag, find its children
        const children = allTags?.filter(t => t.parent_tag_id === tag.id) || [];
        map[tag.id] = children.map(c => ({
          ...c,
          source: null,
          created_at: '',
          target_chat: null
        }));
      }
    });
    
    return map;
  };

  // Clear selection after action
  const clearSelection = () => {
    setSelectedDocTags(new Set());
  };

  const tagsByDocument = allTags?.reduce((acc, tag) => {
    if (!acc[tag.document_id]) {
      acc[tag.document_id] = [];
    }
    acc[tag.document_id].push(tag);
    return acc;
  }, {} as Record<string, DocumentTag[]>) || {};

  // Map new taxonomies by document
  const taxonomiesByDocument = allTaxonomies?.reduce((acc, tax) => {
    if (!acc[tax.entity_id]) {
      acc[tax.entity_id] = [];
    }
    acc[tax.entity_id].push(tax);
    return acc;
  }, {} as Record<string, DocumentTaxonomy[]>) || {};

  // Filter documents
  const filteredDocs = documents?.filter((doc) => {
    const matchesChat = filterChat === "all" || doc.target_chat === filterChat;
    const matchesStatus = filterStatus === "all" || doc.implementation_status === filterStatus;
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Tag filter logic
    let matchesTag = true;
    if (filterTagName.trim()) {
      const docTags = tagsByDocument[doc.id] || [];
      const searchLower = filterTagName.toLowerCase().trim();
      
      if (tagTypeFilter === "parent") {
        matchesTag = docTags.some(tag => 
          !tag.parent_tag_id && tag.tag_name.toLowerCase().includes(searchLower)
        );
      } else if (tagTypeFilter === "child") {
        matchesTag = docTags.some(tag => 
          tag.parent_tag_id && tag.tag_name.toLowerCase().includes(searchLower)
        );
      } else {
        // all - search both parent and child
        matchesTag = docTags.some(tag => 
          tag.tag_name.toLowerCase().includes(searchLower)
        );
      }
    }
    
    return matchesChat && matchesStatus && matchesSearch && matchesTag;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocs = filteredDocs.slice(startIndex, startIndex + itemsPerPage);

  const toggleExpanded = (docId: string) => {
    setExpandedDocs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const getChatBadgeVariant = (chat: string) => {
    switch (chat) {
      case "health":
        return "default";
      case "study":
        return "secondary";
      case "general":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "ready":
        return "default";
      case "needs_review":
        return "secondary";
      case "incomplete":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getParentTags = (docTags: DocumentTag[]) => {
    return docTags.filter((t) => !t.parent_tag_id);
  };

  const getChildTags = (docTags: DocumentTag[], parentId: string) => {
    return docTags.filter((t) => t.parent_tag_id === parentId);
  };

  if (docsLoading || tagsLoading || taxonomiesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleExport = async (format: ExportFormat) => {
    const exportColumns = [
      { key: 'filename', label: 'Nome do Arquivo' },
      { key: 'target_chat', label: 'Chat' },
      { key: 'status', label: 'Status' },
      { key: 'implementation_status', label: 'Status de Implementação' },
      { key: 'total_chunks', label: 'Total de Chunks' },
      { key: 'total_words', label: 'Total de Palavras' },
      { key: 'created_at', label: 'Data de Criação' },
    ];

    const exportableData = filteredDocs.map(doc => ({
      filename: doc.filename,
      target_chat: doc.target_chat,
      status: doc.status,
      implementation_status: doc.implementation_status || 'N/A',
      total_chunks: doc.total_chunks || 0,
      total_words: doc.total_words || 0,
      created_at: new Date(doc.created_at).toLocaleString('pt-BR'),
    }));

    try {
      await exportData({
        filename: 'documentos_analise',
        data: exportableData,
        format,
        columns: exportColumns,
      });
      toast.success(`Dados exportados em formato ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Erro ao exportar dados");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <AdminTitleWithInfo
            title="Análise de Documentos"
            level="h2"
            icon={FileText}
            tooltipText="Visualização detalhada de documentos"
            infoContent={
              <>
                <p>Explore documentos processados com análise completa de tags e categorizações.</p>
                <p className="mt-2">Veja resumos AI, hierarquia de tags, métricas de confiança e status de implementação.</p>
              </>
            }
          />
          <p className="text-muted-foreground mt-1">
            Visualização detalhada de documentos e suas categorizações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="h-4 w-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="h-4 w-4 mr-2" /> JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileDown className="h-4 w-4 mr-2" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Document Rename Stats */}
      <DocumentRenameStats className="mb-2" />

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label>Buscar Documento</Label>
            <Input
              placeholder="Nome do documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Label>Buscar Tag</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nome da tag..."
                value={filterTagName}
                onChange={(e) => setFilterTagName(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label>Tipo de Tag</Label>
            <Select value={tagTypeFilter} onValueChange={(v) => setTagTypeFilter(v as "all" | "parent" | "child")}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <Tag className="h-3 w-3" /> Todas
                  </span>
                </SelectItem>
                <SelectItem value="parent">
                  <span className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-primary" /> Tag Pai
                  </span>
                </SelectItem>
                <SelectItem value="child">
                  <span className="flex items-center gap-2">
                    <Tag className="h-3 w-3 text-purple-400" /> Tag Filha
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chat Destino</Label>
            <Select value={filterChat} onValueChange={setFilterChat}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="health">Saúde</SelectItem>
                <SelectItem value="study">Estudo</SelectItem>
                <SelectItem value="general">Geral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ready">Pronto</SelectItem>
                <SelectItem value="needs_review">Precisa Revisão</SelectItem>
                <SelectItem value="incomplete">Incompleto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {(filterTagName || tagTypeFilter !== "all") && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>
            {filterTagName && (
              <Badge variant="secondary" className="gap-1">
                <Tag className="h-3 w-3" />
                "{filterTagName}"
                <button 
                  onClick={() => setFilterTagName("")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {tagTypeFilter !== "all" && (
              <Badge variant="outline" className={tagTypeFilter === "parent" ? "border-primary text-primary" : "border-purple-400 text-purple-400"}>
                {tagTypeFilter === "parent" ? "Tag Pai" : "Tag Filha"}
                <button 
                  onClick={() => setTagTypeFilter("all")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setFilterTagName(""); setTagTypeFilter("all"); }}
              className="text-xs"
            >
              Limpar filtros de tag
            </Button>
          </div>
        )}
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        {paginatedDocs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum documento encontrado
          </Card>
        ) : (
          paginatedDocs.map((doc) => {
            const docTags = tagsByDocument[doc.id] || [];
            const parentTags = getParentTags(docTags);

            return (
              <Collapsible
                key={doc.id}
                open={expandedDocs.has(doc.id)}
                onOpenChange={() => toggleExpanded(doc.id)}
              >
                <Card className="border-primary/20">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-1">
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                expandedDocs.has(doc.id) ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <div className="flex-1">
                          <div className="font-semibold text-lg mb-1">
                            {doc.ai_title || doc.filename}
                            {doc.ai_title && doc.needs_title_review && (
                              <Badge variant="outline" className="ml-2 text-xs border-blue-500/50 text-blue-500">
                                Título IA
                              </Badge>
                            )}
                          </div>
                          {doc.ai_title && (
                            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {doc.filename}
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getChatBadgeVariant(doc.target_chat)} className="flex items-center gap-1">
                            {doc.target_chat === "health" ? (
                              <><Heart className="h-3 w-3" /> Saúde</>
                            ) : doc.target_chat === "study" ? (
                              <><BookOpen className="h-3 w-3" /> Estudo</>
                            ) : (
                              <><FileText className="h-3 w-3" /> Geral</>
                            )}
                          </Badge>
                            {doc.implementation_status && (
                              <Badge variant={getStatusBadgeVariant(doc.implementation_status)} className="flex items-center gap-1">
                                {doc.implementation_status === "ready" ? (
                                  <><Check className="h-3 w-3" /> Pronto</>
                                ) : doc.implementation_status === "needs_review" ? (
                                  <><AlertTriangle className="h-3 w-3" /> Precisa Revisão</>
                                ) : (
                                  <><X className="h-3 w-3" /> Incompleto</>
                                )}
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {doc.total_chunks || 0} chunks
                            </Badge>
                            <Badge variant="outline">
                              {doc.total_words || 0} palavras
                            </Badge>
                            {(() => {
                              const avgConfidence = parentTags.length > 0 
                                ? parentTags.reduce((sum, t) => sum + (t.confidence || 0), 0) / parentTags.length 
                                : 0;
                              return avgConfidence > 0 ? (
                                <Badge 
                                  variant={avgConfidence >= 0.8 ? "default" : avgConfidence >= 0.6 ? "secondary" : "destructive"}
                                  className="flex items-center gap-1"
                                >
                                  <div className={`w-2 h-2 rounded-full ${
                                    avgConfidence >= 0.8 ? 'bg-green-500' : avgConfidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`} />
                                  Confiança: {Math.round(avgConfidence * 100)}%
                                </Badge>
                              ) : null;
                            })()}
                          </div>

                          {/* Preview de Tags no Header */}
                          {parentTags.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              {parentTags.slice(0, 3).map((tag) => (
                                <Badge key={tag.id} variant="outline" className="text-xs">
                                  {tag.tag_name}
                                </Badge>
                              ))}
                              {parentTags.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{parentTags.length - 3} mais
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-4 space-y-4">
                      {/* AI Summary */}
                      {doc.ai_summary && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Resumo AI
                          </h4>
                          <p className="text-sm text-muted-foreground">{doc.ai_summary}</p>
                        </div>
                      )}

                      {/* TAXONOMY SYSTEM - entity_tags */}
                      {(() => {
                        const docTaxonomies = taxonomiesByDocument[doc.id] || [];
                        
                        if (docTaxonomies.length === 0) {
                          return (
                            <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FolderTree className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Nenhuma taxonomia atribuída</span>
                                </div>
                                <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-600">
                                  Pendente ML Review
                                </Badge>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="p-4 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-lg border border-green-500/20">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
                                <FolderTree className="h-4 w-4" />
                                Taxonomias
                              </h4>
                              <Badge variant="secondary" className="text-xs">
                                {docTaxonomies.length} taxonomia{docTaxonomies.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {docTaxonomies.map((tax) => (
                                <TooltipProvider key={tax.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge 
                                        variant="outline"
                                        className="gap-2 py-1.5 border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
                                        style={tax.taxonomy_color ? { borderColor: tax.taxonomy_color } : undefined}
                                      >
                                        <span className="font-mono text-xs opacity-70">{tax.taxonomy_code}</span>
                                        <span>{tax.taxonomy_name}</span>
                                        {tax.confidence && (
                                          <span className={`text-xs ${
                                            tax.confidence >= 0.8 ? 'text-green-600' : 
                                            tax.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-500'
                                          }`}>
                                            {Math.round(tax.confidence * 100)}%
                                          </span>
                                        )}
                                        {tax.is_primary && (
                                          <Check className="h-3 w-3 text-green-500" />
                                        )}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        <p><strong>Código:</strong> {tax.taxonomy_code}</p>
                                        <p><strong>Confiança:</strong> {tax.confidence ? `${Math.round(tax.confidence * 100)}%` : 'N/A'}</p>
                                        <p><strong>Fonte:</strong> {tax.source}</p>
                                        {tax.is_primary && <p className="text-green-500"><strong>Taxonomia primária</strong></p>}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Data:</span>
                          <div className="font-mono">
                            {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div>{doc.status}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Chunks:</span>
                          <div>{doc.total_chunks || 0}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Palavras:</span>
                          <div>{doc.total_words || 0}</div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Card>
              </Collapsible>
            );
          })
        )}

        {/* Pagination Controls */}
        {filteredDocs.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredDocs.length)} de {filteredDocs.length}
              </span>
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* AlertDialog for tag deletion confirmation */}
      <AlertDialog open={!!tagToDelete} onOpenChange={(open) => !open && setTagToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tagToDelete?.isParent ? (
                <>
                  Tem certeza que deseja excluir a tag <strong>"{tagToDelete?.name}"</strong> e todas as suas tags filhas?
                  <br /><br />
                  Esta ação não pode ser desfeita.
                </>
              ) : (
                <>
                  Tem certeza que deseja excluir a tag filha <strong>"{tagToDelete?.name}"</strong>?
                  <br /><br />
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (tagToDelete) {
                  deleteTagMutation.mutate(tagToDelete.id);
                  setTagToDelete(null);
                }
              }}
            >
              {deleteTagMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Excluindo...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" /> Excluir</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Action Bar - Multi-selection */}
      {selectedDocTags.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary/95 to-secondary/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-primary/30 z-50 flex items-center gap-4 animate-in slide-in-from-bottom-4">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {selectedDocTags.size} tags selecionadas
          </Badge>
          
          <div className="h-6 w-px bg-white/20" />
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => setUnifyModalOpen(true)}
          >
            <Merge className="h-4 w-4 mr-2" />
            Unificar
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/20"
            disabled={isAdoptProcessing}
            onClick={() => {
              setIsAdoptProcessing(true);
              // Simulate brief validation loading
              setTimeout(() => {
                setAdoptModalOpen(true);
                setIsAdoptProcessing(false);
              }, 300);
            }}
          >
            {isAdoptProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FolderTree className="h-4 w-4 mr-2" />
            )}
            Taxonomy (Adotar)
            <Badge variant="secondary" className="ml-2 bg-cyan-500/20 text-cyan-300 border-cyan-400/40">
              {selectedDocTags.size}
            </Badge>
          </Button>
          
          <div className="h-6 w-px bg-white/20" />
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={clearSelection}
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </div>
      )}

      {/* TagConflictResolutionModal for Unification */}
      <TagConflictResolutionModal
        open={unifyModalOpen}
        onOpenChange={setUnifyModalOpen}
        conflictType="semantic"
        tags={getSelectedTagsForModal().map(t => ({
          ...t,
          source: t.document_id ? 'document' : null,
          created_at: '',
          target_chat: documents?.find(d => d.id === t.document_id)?.target_chat || null
        }))}
        childTagsMap={buildChildTagsMap()}
        parentTags={allTags?.filter(t => !t.parent_tag_id).map(t => ({
          ...t,
          source: null,
          created_at: '',
          target_chat: null
        })) || []}
        onComplete={() => {
          clearSelection();
          queryClient.invalidateQueries({ queryKey: ["document-tags-all"] });
        }}
      />

      {/* TaxonomyAdoptionModal for Hierarchical Adoption */}
      <TaxonomyAdoptionModal
        open={adoptModalOpen}
        onOpenChange={setAdoptModalOpen}
        tagsToAdopt={getSelectedTagsForModal()}
        domain={getSelectedTagsDomain()}
        onComplete={() => {
          clearSelection();
          queryClient.invalidateQueries({ queryKey: ["document-tags-all"] });
        }}
      />
    </div>
  );
};

export default DocumentAnalysisTab;
