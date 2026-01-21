import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
import { Tags, Plus, Trash2, ChevronDown, Loader2, Download, FileText, FileSpreadsheet, FileJson, FileDown, Merge, Sparkles, ArrowUpDown, X, Brain, Zap, Upload, TrendingUp, BarChart3, PieChart, ArrowRightLeft, Target, FolderOpen, FolderTree, Tag as TagIcon, XCircle, AlertTriangle } from "lucide-react";
import { exportData, type ExportFormat } from "@/lib/export-utils";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { TaxonomyFlowDiagram } from "./TaxonomyFlowDiagram";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPie, Pie } from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OrphanedTagsPanel } from "./OrphanedTagsPanel";
import { TagConflictResolutionModal } from "./TagConflictResolutionModal";
import { logTagManagementEvent } from "@/lib/tag-management-logger";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Optimized sub-components from tags folder
import {
  VirtualizedTagsTable,
  TagFilters,
  TagUnificationSuggestionsModal,
  useTagsData,
  useSimilarityCalculations,
  useTagMutations,
  TagDeleteConfirmModal,
  TagBulkDeleteModal,
  TagEditDialog,
  DEFAULT_DELETE_CONFIRM_MODAL,
  DEFAULT_BULK_DELETE_MODAL,
  DEFAULT_TAG_FORM_DATA,
  getReasonLabels,
  type DeleteConfirmModalState,
  type BulkDeleteModalState,
  type TagFormData,
  type DeletionReasons,
} from "./tags";

// Tag interface imported from centralized types
import type { Tag } from "@/types/tag";

export const TagsManagementTab = () => {
  const [editDialog, setEditDialog] = useState<{ open: boolean; tag: Tag | null; isParent: boolean }>({
    open: false,
    tag: null,
    isParent: true,
  });
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterChat, setFilterChat] = useState<string>("all");
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<"tag_name" | "confidence" | "target_chat">("tag_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [formData, setFormData] = useState<TagFormData>(DEFAULT_TAG_FORM_DATA);
  const [filterConfidence, setFilterConfidence] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");

  const queryClient = useQueryClient();
  
  // Conflict resolution modal state
  const [conflictModal, setConflictModal] = useState<{
    open: boolean;
    type: 'parent' | 'child' | 'semantic';
    tags: Tag[];
    similarityScore?: number;
  }>({ open: false, type: 'parent', tags: [] });
  
  // Unification suggestions modal state
  const [suggestionsModalOpen, setSuggestionsModalOpen] = useState(false);
  
  // Import taxonomy state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importData, setImportData] = useState<{
    parentCount: number;
    childCount: number;
    rulesCount: number;
    rawData: any;
    parents: { name: string; childCount: number }[];
    validationErrors: string[];
    validationWarnings: string[];
    conflicts: { name: string; type: 'parent' | 'child'; existingId: string }[];
  } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  
  // Delete confirmation modal state with 9 Data Science reasons
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<DeleteConfirmModalState>(DEFAULT_DELETE_CONFIRM_MODAL);

  // BULK Delete modal state
  const [bulkDeleteModal, setBulkDeleteModal] = useState<BulkDeleteModalState>(DEFAULT_BULK_DELETE_MODAL);
  
  // Debounce search input by 300ms for performance
  const debouncedSearchTagName = useDebounce(searchInput, 300);
  const isSearching = searchInput !== debouncedSearchTagName;

  // Use extracted mutations hook
  const {
    createTagMutation,
    updateTagMutation,
    deleteRuleMutation,
    deleteChatRoutingRuleMutation,
  } = useTagMutations();

  // Fetch all tags with document target_chat - with staleTime for caching
  const { data: allTags, isLoading } = useQuery({
    queryKey: ["all-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select(`
          *,
          documents:document_id (target_chat, filename)
        `)
        .order("tag_name", { ascending: true });

      if (error) throw error;
      
      return (data || []).map((tag: any) => ({
        ...tag,
        target_chat: tag.documents?.target_chat || null,
        document_filename: tag.documents?.filename || null,
      })) as (Tag & { document_filename: string | null })[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch ML merge rules
  const { data: mergeRules } = useQuery({
    queryKey: ["tag-merge-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tag_merge_rules")
        .select("*")
        .order("merge_count", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch chat routing rules
  const { data: chatRoutingRules } = useQuery({
    queryKey: ["chat-routing-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_routing_rules")
        .select("*")
        .order("correction_count", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Use memoized hook for all tag calculations
  const {
    parentTags,
    childTagsMap,
    sortedParentTags,
    documentCountByTagName,
  } = useTagsData({
    allTags,
    filterSource,
    filterChat,
    filterConfidence,
    searchTagName: debouncedSearchTagName,
    sortColumn,
    sortDirection,
    currentPage,
    itemsPerPage,
  });

  // Use memoized similarity calculations
  const { 
    duplicateParentTags, 
    semanticDuplicates, 
    orphanedTags 
  } = useSimilarityCalculations(allTags, parentTags, childTagsMap);

  // Reset page when debounced search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTagName]);

  // Auto-expand parents with matching children when searching
  useEffect(() => {
    if (debouncedSearchTagName.trim()) {
      const searchLower = debouncedSearchTagName.toLowerCase().trim();
      const parentsWithMatchingChildren = new Set<string>();
      
      parentTags.forEach(parent => {
        const children = childTagsMap[parent.id] || [];
        const hasMatchingChild = children.some(child => 
          child.tag_name.toLowerCase().includes(searchLower)
        );
        if (hasMatchingChild) {
          parentsWithMatchingChildren.add(parent.id);
        }
      });
      
      setExpandedParents(prev => {
        const newSet = new Set(prev);
        parentsWithMatchingChildren.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  }, [debouncedSearchTagName, parentTags, childTagsMap]);

  // Handle sort toggle
  const handleSort = useCallback((column: "tag_name" | "confidence" | "target_chat") => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn]);

  // Toggle expanded
  const toggleExpanded = useCallback((parentId: string) => {
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  }, []);

  // Toggle select single tag
  const toggleSelectTag = useCallback((tagId: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  }, []);

  // Select/Deselect all tags
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const allIds: string[] = [];
      sortedParentTags.forEach(parent => {
        allIds.push(parent.id);
        (childTagsMap[parent.id] || []).forEach(child => allIds.push(child.id));
      });
      setSelectedTags(new Set(allIds));
    } else {
      setSelectedTags(new Set());
    }
  }, [sortedParentTags, childTagsMap]);

  // Open delete confirmation modal
  const openDeleteConfirmModal = async (ids: string[], tagName: string, documentId?: string) => {
    const tag = allTags?.find(t => ids.includes(t.id));
    const tagType: 'parent' | 'child' = tag?.parent_tag_id ? 'child' : 'parent';
    
    setDeleteConfirmModal({
      ...DEFAULT_DELETE_CONFIRM_MODAL,
      open: true,
      ids,
      tagName,
      tagType,
      isLoadingCount: true,
      documentId,
    });
    
    const [countResult, docResult] = await Promise.all([
      supabase.from('document_tags').select('*', { count: 'exact', head: true }).eq('tag_name', tagName),
      documentId ? supabase.from('documents').select('filename').eq('id', documentId).single() : Promise.resolve({ data: null }),
    ]);
      
    setDeleteConfirmModal(prev => ({
      ...prev,
      totalInstances: countResult.count || ids.length,
      documentFilename: docResult.data?.filename,
      isLoadingCount: false,
    }));
  };

  // Confirm delete tags
  const confirmDeleteTags = async () => {
    const { tagName, tagType, totalInstances, reasons, deleteScope, ids, documentFilename } = deleteConfirmModal;
    const reasonLabels = getReasonLabels(reasons);
    
    try {
      if (deleteScope === 'single') {
        const { error } = await supabase.from('document_tags').delete().in('id', ids);
        if (error) throw error;
        
        await logTagManagementEvent({
          input_state: { tags_involved: [{ id: ids[0], name: tagName, type: tagType }] },
          action_type: 'delete_orphan',
          user_decision: { action: 'delete_single_instance', source_tags_removed: [tagName], deletion_reasons: reasons },
          rationale: `Exclusão de instância única de "${tagName}" do documento "${documentFilename || 'unknown'}". Motivos: ${reasonLabels.join(', ')}`,
        });
        
        toast.success(`Tag "${tagName}" removida deste documento`);
      } else {
        const isSemanticDuplicate = tagName.includes(' / ');
        const tagNamesToDelete = isSemanticDuplicate ? tagName.split(' / ').map(n => n.trim()) : [tagName];
        
        for (const nameToDelete of tagNamesToDelete) {
          if (tagType === 'parent') {
            const { data: parentTagsToDelete } = await supabase
              .from('document_tags')
              .select('id')
              .eq('tag_name', nameToDelete)
              .eq('tag_type', 'parent');
              
            if (parentTagsToDelete && parentTagsToDelete.length > 0) {
              const parentIds = parentTagsToDelete.map(p => p.id);
              await supabase.from('document_tags').update({ parent_tag_id: null }).in('parent_tag_id', parentIds);
            }
          }
          
          const { error } = await supabase.from('document_tags').delete().eq('tag_name', nameToDelete);
          if (error) throw error;
        }
        
        await logTagManagementEvent({
          input_state: { tags_involved: [{ id: 'all', name: tagName, type: tagType }] },
          action_type: 'delete_orphan',
          user_decision: { action: `delete_all_instances_${totalInstances}`, source_tags_removed: [tagName], deletion_reasons: reasons },
          rationale: `Exclusão de TODAS as ${totalInstances} instância(s) de "${tagName}". Motivos: ${reasonLabels.join(', ')}`,
        });
        
        toast.success(`Tag "${tagName}" removida de ${totalInstances} documento(s)`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['all-tags'] });
      queryClient.invalidateQueries({ queryKey: ['chat-config'] });
      setDeleteConfirmModal(DEFAULT_DELETE_CONFIRM_MODAL);
    } catch (error: any) {
      toast.error(`Erro ao excluir tags: ${error.message}`);
    }
  };

  // BULK DELETE: Open modal with selected tags
  const openBulkDeleteModal = async () => {
    const selectedTagData = allTags?.filter(t => selectedTags.has(t.id)) || [];
    const uniqueTagNames = [...new Set(selectedTagData.map(t => t.tag_name))];
    const selectedIds = Array.from(selectedTags);
    
    setBulkDeleteModal({
      ...DEFAULT_BULK_DELETE_MODAL,
      open: true,
      selectedTagIds: selectedIds,
      tagNames: uniqueTagNames,
      isLoadingCount: true,
    });
    
    let totalAffected = 0;
    for (const tagName of uniqueTagNames) {
      const { count } = await supabase.from('document_tags').select('*', { count: 'exact', head: true }).eq('tag_name', tagName);
      totalAffected += count || 0;
    }
    
    setBulkDeleteModal(prev => ({ ...prev, totalDocumentsAffected: totalAffected, isLoadingCount: false }));
  };

  // BULK DELETE: Execute batch deletion
  const confirmBulkDelete = async () => {
    const { tagNames, reasons, totalDocumentsAffected } = bulkDeleteModal;
    const reasonLabels = getReasonLabels(reasons);
    
    setBulkDeleteModal(prev => ({ ...prev, isDeleting: true }));
    
    try {
      let successCount = 0;
      let failedCount = 0;
      
      for (const tagName of tagNames) {
        try {
          const { data: parentTagsToDelete } = await supabase
            .from('document_tags')
            .select('id')
            .eq('tag_name', tagName)
            .eq('tag_type', 'parent');
            
          if (parentTagsToDelete && parentTagsToDelete.length > 0) {
            const parentIds = parentTagsToDelete.map(p => p.id);
            await supabase.from('document_tags').update({ parent_tag_id: null }).in('parent_tag_id', parentIds);
          }
          
          const { error } = await supabase.from('document_tags').delete().eq('tag_name', tagName);
          if (error) throw error;
          successCount++;
        } catch (error) {
          failedCount++;
        }
      }
      
      await logTagManagementEvent({
        input_state: { tags_involved: tagNames.map(name => ({ id: 'bulk', name, type: 'parent' as const })) },
        action_type: 'bulk_delete_orphans',
        user_decision: { deleted_count: successCount, failed_count: failedCount, documents_updated: totalDocumentsAffected, deletion_reasons: reasons },
        rationale: `Exclusão em massa de ${successCount} tags (${totalDocumentsAffected} documentos). Motivos: ${reasonLabels.join(', ')}`,
      });
      
      toast.success(`${successCount} tags excluídas com sucesso`);
      setSelectedTags(new Set());
      queryClient.invalidateQueries({ queryKey: ['all-tags'] });
      queryClient.invalidateQueries({ queryKey: ['chat-config'] });
      setBulkDeleteModal(DEFAULT_BULK_DELETE_MODAL);
    } catch (error: any) {
      toast.error(`Erro ao excluir tags: ${error.message}`);
      setBulkDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Export taxonomy
  const handleExportTaxonomy = async (format: ExportFormat) => {
    const taxonomyData = parentTags.flatMap(parent => {
      const children = childTagsMap[parent.id] || [];
      if (children.length === 0) {
        return [{ parent_name: parent.tag_name, child_name: '-', parent_synonyms: (parent.synonyms || []).join(', ') || '-', child_synonyms: '-' }];
      }
      return children.map(child => ({
        parent_name: parent.tag_name,
        child_name: child.tag_name,
        parent_synonyms: (parent.synonyms || []).join(', ') || '-',
        child_synonyms: (child.synonyms || []).join(', ') || '-',
      }));
    });

    const taxonomyColumns = [
      { key: 'parent_name', label: 'Tag Pai' },
      { key: 'child_name', label: 'Tag Filha' },
      { key: 'parent_synonyms', label: 'Sinônimos (Pai)' },
      { key: 'child_synonyms', label: 'Sinônimos (Filha)' },
    ];

    if (format === 'json') {
      const taxonomy = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        taxonomy: parentTags.map(parent => ({
          id: parent.id,
          name: parent.tag_name,
          type: "parent",
          synonyms: parent.synonyms || [],
          children: (childTagsMap[parent.id] || []).map(child => ({ id: child.id, name: child.tag_name, synonyms: child.synonyms || [] }))
        })),
        merge_rules: mergeRules || [],
        orphaned_children: orphanedTags.map(t => ({ id: t.id, name: t.tag_name }))
      };
      
      const blob = new Blob([JSON.stringify(taxonomy, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taxonomy-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      await exportData({ filename: 'taxonomy', data: taxonomyData, format, columns: taxonomyColumns });
    }
    
    toast.success(`Taxonomia exportada em ${format.toUpperCase()}!`);
  };

  const handleExport = async (format: ExportFormat) => {
    const exportColumns = [
      { key: 'tag_name', label: 'Nome da Tag' },
      { key: 'tag_type', label: 'Tipo' },
      { key: 'parent', label: 'Tag Pai' },
      { key: 'confidence', label: 'Confiança' },
      { key: 'source', label: 'Fonte' },
    ];

    const exportableData = parentTags.flatMap(parent => {
      const childrenData = (childTagsMap[parent.id] || []).map(child => ({
        tag_name: child.tag_name,
        tag_type: child.tag_type,
        parent: parent.tag_name,
        confidence: child.confidence?.toFixed(2) || 'N/A',
        source: child.source || 'N/A',
      }));

      return [
        { tag_name: parent.tag_name, tag_type: parent.tag_type, parent: '-', confidence: parent.confidence?.toFixed(2) || 'N/A', source: parent.source || 'N/A' },
        ...childrenData,
      ];
    });

    try {
      await exportData({ filename: 'tags', data: exportableData, format, columns: exportColumns });
      toast.success(`Dados exportados em formato ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Erro ao exportar dados");
    }
  };

  // Open conflict resolution modal
  const openConflictModal = useCallback((type: 'parent' | 'child' | 'semantic', tagIds: string[], similarity?: number) => {
    if (!allTags || allTags.length === 0) {
      toast.error("Aguarde o carregamento das tags antes de unificar");
      return;
    }
    
    const tagsForModal = allTags.filter(t => tagIds.includes(t.id));
    if (tagsForModal.length === 0) {
      toast.error("Não foi possível encontrar as tags selecionadas");
      return;
    }
    
    setConflictModal({ open: true, type, tags: tagsForModal, similarityScore: similarity });
  }, [allTags]);

  // Reject duplicate
  const handleRejectDuplicate = useCallback(async (ids: string[], tagName: string, type: 'parent' | 'semantic' | 'child') => {
    await logTagManagementEvent({
      input_state: { tags_involved: ids.map(id => ({ id, name: tagName, type: type === 'parent' ? 'parent' as const : 'child' as const })), detection_type: type === 'parent' ? 'exact' : type === 'semantic' ? 'semantic' : 'child_similarity' },
      action_type: 'reject_duplicate',
      user_decision: { action: 'reject_duplicate', source_tags_removed: [] },
      rationale: `Duplicata rejeitada diretamente da lista: ${tagName} (tipo: ${type})`,
    });
    toast.info("Duplicata rejeitada. Decisão registrada para ML.");
  }, []);

  const resetForm = () => setFormData(DEFAULT_TAG_FORM_DATA);

  const openCreateDialog = (isParent: boolean, parentId?: string) => {
    resetForm();
    if (!isParent && parentId) {
      setFormData(prev => ({ ...prev, parent_tag_id: parentId }));
    }
    setEditDialog({ open: true, tag: null, isParent });
  };

  const openEditDialog = (tag: Tag) => {
    setFormData({
      tag_name: tag.tag_name,
      tag_type: tag.tag_type,
      confidence: tag.confidence || 0.85,
      source: tag.source || "admin",
      parent_tag_id: tag.parent_tag_id,
    });
    setEditDialog({ open: true, tag, isParent: !tag.parent_tag_id });
  };

  const handleSubmit = () => {
    if (!formData.tag_name.trim() || !formData.tag_type.trim()) {
      toast.error("Nome e tipo são obrigatórios");
      return;
    }

    if (editDialog.tag) {
      updateTagMutation.mutate({ id: editDialog.tag.id, ...formData }, {
        onSuccess: () => {
          setEditDialog({ open: false, tag: null, isParent: true });
          resetForm();
        }
      });
    } else {
      createTagMutation.mutate(formData, {
        onSuccess: () => {
          setEditDialog({ open: false, tag: null, isParent: true });
          resetForm();
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner informativo - ML movido para Auditoria */}
      <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-lg flex items-center gap-3">
        <Brain className="h-5 w-5 text-indigo-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            <strong className="text-indigo-300">Métricas de Machine Learning</strong> foram movidas para{" "}
            <strong className="text-indigo-300">Auditoria → Machine Learning ML</strong> para melhor organização e governança.
          </p>
        </div>
        <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 flex-shrink-0">
          <ArrowRightLeft className="h-3 w-3 mr-1" />
          Realocado
        </Badge>
      </div>

      {/* Título */}
      <AdminTitleWithInfo
        title="Gerenciamento de Tags"
        level="h2"
        icon={Tags}
        tooltipText="Sistema de categorização hierárquica"
        infoContent={
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <h5 className="font-bold text-primary mb-2">Sistema de Gerenciamento de Tags</h5>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Controle centralizado da taxonomia hierárquica (Parent/Child) usada para categorizar documentos no sistema RAG.
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />
                Estrutura Hierárquica
              </h5>
              <div className="text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <Tags className="h-3.5 w-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Tags Parent (Pai)</strong> - Categorias principais</span>
                </div>
                <div className="flex items-start gap-2 ml-4">
                  <TagIcon className="h-3.5 w-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Tags Child (Filha)</strong> - Subcategorias</span>
                </div>
              </div>
            </div>
            <TaxonomyFlowDiagram />
          </div>
        }
      />

      {/* Botões de Ação */}
      <div className="flex justify-between items-start">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Taxonomia
          </Button>
          <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={() => {}} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Exportar Taxonomia
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border">
              <DropdownMenuItem onClick={() => handleExportTaxonomy('json')}>
                <FileJson className="h-4 w-4 mr-2" /> JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportTaxonomy('xlsx')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportTaxonomy('csv')}>
                <FileText className="h-4 w-4 mr-2" /> CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Exportar Tags
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="h-4 w-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex flex-col gap-2 justify-end">
          <Button 
            variant="outline" 
            onClick={() => setSuggestionsModalOpen(true)} 
            className="gap-2 border-purple-500/50 hover:bg-purple-500/10"
            disabled={isLoading}
          >
            <Sparkles className="h-4 w-4 text-purple-400" />
            Sugerir Unificações
          </Button>
          <Button onClick={() => openCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Tag Pai
          </Button>
        </div>
      </div>

      {/* Consolidated Metrics Dashboard */}
      <Card className="p-6 border-primary/30 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Dashboard de Métricas</h3>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-background/50 rounded-lg border">
            <div className="text-3xl font-bold text-primary">{parentTags.length}</div>
            <div className="text-sm text-muted-foreground mt-1">Tags Pai</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg border">
            <div className="text-3xl font-bold text-purple-400">
              {Object.values(childTagsMap).reduce((sum, arr) => sum + arr.length, 0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Tags Filhas</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg border">
            <div className="text-3xl font-bold text-green-400">{mergeRules?.length || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Regras ML Tags</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg border">
            <div className="text-3xl font-bold text-cyan-400">{chatRoutingRules?.length || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Regras ML Chat</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="p-4 bg-background/30 rounded-lg border">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Distribuição por Fonte
            </h4>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={[
                      { name: 'IA', value: parentTags.filter(t => t.source === 'ai').length, fill: 'hsl(262, 83%, 58%)' },
                      { name: 'Admin', value: parentTags.filter(t => t.source === 'admin').length, fill: 'hsl(142, 71%, 45%)' },
                      { name: 'Outros', value: parentTags.filter(t => !['ai', 'admin'].includes(t.source || '')).length, fill: 'hsl(220, 70%, 50%)' },
                    ].filter(d => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  />
                  <RechartsTooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4 bg-background/30 rounded-lg border">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Distribuição por Chat
            </h4>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={[
                      { name: 'Saúde', value: parentTags.filter(t => t.target_chat === 'health').length, fill: 'hsl(142, 71%, 45%)' },
                      { name: 'Estudo', value: parentTags.filter(t => t.target_chat === 'study').length, fill: 'hsl(262, 83%, 58%)' },
                      { name: 'Economia', value: parentTags.filter(t => t.target_chat === 'economia').length, fill: 'hsl(45, 93%, 47%)' },
                      { name: 'Não definido', value: parentTags.filter(t => !t.target_chat).length, fill: 'hsl(220, 10%, 50%)' },
                    ].filter(d => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  />
                  <RechartsTooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                <Zap className="h-4 w-4 inline mr-1 text-green-400" />
                Aplicações ML Tags: <strong>{mergeRules?.reduce((sum, r) => sum + (r.merge_count || 0), 0) || 0}</strong>
              </span>
              <span className="text-muted-foreground">
                <ArrowRightLeft className="h-4 w-4 inline mr-1 text-cyan-400" />
                Correções Chat: <strong>{chatRoutingRules?.reduce((sum, r) => sum + (r.correction_count || 0), 0) || 0}</strong>
              </span>
            </div>
            <span className="text-muted-foreground">
              Duplicatas pendentes: <strong className="text-amber-400">{duplicateParentTags.length + semanticDuplicates.length}</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <TagFilters
        filterSource={filterSource}
        filterChat={filterChat}
        filterConfidence={filterConfidence}
        searchInputValue={searchInput}
        isSearching={isSearching}
        onFilterSourceChange={setFilterSource}
        onFilterChatChange={setFilterChat}
        onFilterConfidenceChange={setFilterConfidence}
        onSearchChange={setSearchInput}
      />

      {/* Tags Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Tags Extraídas dos Documentos</h3>
          <span className="text-sm text-muted-foreground">{sortedParentTags.length} tags pai</span>
        </div>
        
        {selectedTags.size > 0 && (
          <div className="bg-muted/50 border rounded-lg p-3 mb-4 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm">{selectedTags.size} tag(s) selecionada(s)</Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTags(new Set())}>
                <X className="h-4 w-4 mr-1" />
                Limpar seleção
              </Button>
            </div>
            <Button variant="destructive" size="sm" onClick={openBulkDeleteModal}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Selecionadas ({selectedTags.size})
            </Button>
          </div>
        )}
        
        <VirtualizedTagsTable
          parentTags={sortedParentTags}
          childTagsMap={childTagsMap}
          expandedParents={expandedParents}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          searchTagName={debouncedSearchTagName}
          selectedTags={selectedTags}
          documentCountMap={documentCountByTagName}
          onToggleExpanded={toggleExpanded}
          onSort={handleSort}
          onCreateChild={(parentId) => openCreateDialog(false, parentId)}
          onEdit={openEditDialog}
          onDelete={openDeleteConfirmModal}
          onToggleSelect={toggleSelectTag}
          onSelectAll={handleSelectAll}
        />
      </Card>

      {/* Edit/Create Dialog */}
      <TagEditDialog
        open={editDialog.open}
        tag={editDialog.tag}
        isParent={editDialog.isParent}
        formData={formData}
        isPending={createTagMutation.isPending || updateTagMutation.isPending}
        onOpenChange={(open) => !open && setEditDialog({ open: false, tag: null, isParent: true })}
        onFormChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        onSubmit={handleSubmit}
      />

      {/* Conflict Resolution Modal */}
      <TagConflictResolutionModal
        open={conflictModal.open}
        onOpenChange={(open) => setConflictModal(prev => ({ ...prev, open }))}
        conflictType={conflictModal.type}
        tags={conflictModal.tags}
        childTagsMap={childTagsMap}
        parentTags={parentTags}
        similarityScore={conflictModal.similarityScore}
        onComplete={() => setConflictModal({ open: false, type: 'parent', tags: [] })}
      />

      {/* Delete Confirmation Modal */}
      <TagDeleteConfirmModal
        modalState={deleteConfirmModal}
        onOpenChange={(open) => !open && setDeleteConfirmModal(DEFAULT_DELETE_CONFIRM_MODAL)}
        onReasonChange={(key, checked) => setDeleteConfirmModal(prev => ({ ...prev, reasons: { ...prev.reasons, [key]: checked } }))}
        onScopeChange={(scope) => setDeleteConfirmModal(prev => ({ ...prev, deleteScope: scope }))}
        onConfirm={confirmDeleteTags}
      />

      {/* Bulk Delete Modal */}
      <TagBulkDeleteModal
        modalState={bulkDeleteModal}
        onOpenChange={(open) => !open && setBulkDeleteModal(DEFAULT_BULK_DELETE_MODAL)}
        onReasonChange={(key, checked) => setBulkDeleteModal(prev => ({ ...prev, reasons: { ...prev.reasons, [key]: checked } }))}
        onConfirm={confirmBulkDelete}
      />

      {/* Modal de Sugestões de Unificação */}
      <TagUnificationSuggestionsModal
        open={suggestionsModalOpen}
        onOpenChange={setSuggestionsModalOpen}
        parentTags={parentTags}
        childTagsMap={childTagsMap}
        orphanedTags={orphanedTags}
        onMerge={(type, ids, similarity) => {
          setSuggestionsModalOpen(false);
          openConflictModal(type, ids, similarity);
        }}
        onReject={handleRejectDuplicate}
        onAdoptOrphan={async (orphanId, parentId) => {
          try {
            const { error } = await supabase.from("document_tags").update({ parent_tag_id: parentId }).eq("id", orphanId);
            if (error) throw error;
            
            const orphan = orphanedTags.find(o => o.id === orphanId);
            const parent = parentTags.find(p => p.id === parentId);
            
            await logTagManagementEvent({
              input_state: { tags_involved: [{ id: orphanId, name: orphan?.tag_name || 'unknown', type: 'child', parent_id: null }] },
              action_type: 'adopt_orphan',
              user_decision: { target_tag_id: orphanId, target_tag_name: orphan?.tag_name, target_parent_id: parentId, target_parent_name: parent?.tag_name, action: 'adopted_from_suggestion_modal' },
            });
            
            toast.success(`"${orphan?.tag_name}" adotada por "${parent?.tag_name}"`);
            queryClient.invalidateQueries({ queryKey: ["all-tags"] });
          } catch (error: any) {
            toast.error(`Erro ao adotar tag: ${error.message}`);
          }
        }}
      />
    </div>
  );
};

export default TagsManagementTab;
