import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMemo } from 'react';

export interface TaxonomyNode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  level: number;
  parent_id: string | null;
  icon: string | null;
  color: string | null;
  status: string | null;
  synonyms: string[] | null;
  keywords: string[] | null;
  auto_created: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  children: TaxonomyNode[];
  documentCount: number;
  childCount: number;
}

export interface TaxonomyFormData {
  name: string;
  code: string;
  description: string;
  parent_id: string | null;
  icon: string;
  color: string;
  synonyms: string[];
  keywords: string[];
  status: 'approved' | 'pending' | 'deprecated';
}

// Build tree structure from flat list
function buildTree(items: any[], entityCounts: Map<string, number>): TaxonomyNode[] {
  const itemMap = new Map<string, TaxonomyNode>();
  const roots: TaxonomyNode[] = [];

  // First pass: create all nodes
  items.forEach(item => {
    itemMap.set(item.id, {
      ...item,
      children: [],
      documentCount: entityCounts.get(item.id) || 0,
      childCount: 0,
    });
  });

  // Second pass: build hierarchy
  items.forEach(item => {
    const node = itemMap.get(item.id)!;
    if (item.parent_id && itemMap.has(item.parent_id)) {
      const parent = itemMap.get(item.parent_id)!;
      parent.children.push(node);
      parent.childCount++;
    } else {
      roots.push(node);
    }
  });

  // Sort children by name
  const sortNodes = (nodes: TaxonomyNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach(node => sortNodes(node.children));
  };
  sortNodes(roots);

  return roots;
}

// Generate code from name and parent
export function generateCode(name: string, parentCode?: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return parentCode ? `${parentCode}.${slug}` : slug;
}

export function useTaxonomyData() {
  const queryClient = useQueryClient();

  // Fetch all taxonomy items (excluding deleted)
  const taxonomyQuery = useQuery({
    queryKey: ['taxonomy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_taxonomy')
        .select('*')
        .neq('status', 'deleted')
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch entity counts per taxonomy
  const entityCountsQuery = useQuery({
    queryKey: ['taxonomy-entity-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entity_tags')
        .select('taxonomy_id');

      if (error) throw error;

      const counts = new Map<string, number>();
      data.forEach(item => {
        const current = counts.get(item.taxonomy_id) || 0;
        counts.set(item.taxonomy_id, current + 1);
      });
      return counts;
    },
  });

  // Build tree structure
  const tree = useMemo(() => {
    if (!taxonomyQuery.data) return [];
    const counts = entityCountsQuery.data || new Map();
    return buildTree(taxonomyQuery.data, counts);
  }, [taxonomyQuery.data, entityCountsQuery.data]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: TaxonomyFormData) => {
      // Calculate level based on parent
      let level = 1;
      if (data.parent_id) {
        const parent = taxonomyQuery.data?.find(t => t.id === data.parent_id);
        if (parent) level = parent.level + 1;
      }

      const { data: result, error } = await supabase
        .from('global_taxonomy')
        .insert({
          name: data.name,
          code: data.code,
          description: data.description || null,
          parent_id: data.parent_id,
          icon: data.icon || null,
          color: data.color || null,
          synonyms: data.synonyms.length > 0 ? data.synonyms : null,
          keywords: data.keywords.length > 0 ? data.keywords : null,
          status: data.status,
          level,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
      toast.success('Tag criada com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar tag: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaxonomyFormData> }) => {
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.icon !== undefined) updateData.icon = data.icon || null;
      if (data.color !== undefined) updateData.color = data.color || null;
      if (data.synonyms !== undefined) updateData.synonyms = data.synonyms.length > 0 ? data.synonyms : null;
      if (data.keywords !== undefined) updateData.keywords = data.keywords.length > 0 ? data.keywords : null;
      if (data.status !== undefined) updateData.status = data.status;

      const { data: result, error } = await supabase
        .from('global_taxonomy')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
      toast.success('Tag atualizada com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar tag: ${error.message}`);
    },
  });

  // Soft delete mutation - using Edge Function
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { 
          action: 'delete',
          taxonomyId: id
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Falha ao deletar');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
      queryClient.invalidateQueries({ queryKey: ['taxonomy-entity-counts'] });
      toast.success(`Tag "${data.deleted?.name || ''}" removida com sucesso`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir tag: ${error.message}`);
    },
  });

  // Hard delete mutation - permanent deletion via Edge Function
  const hardDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { 
          action: 'hard_delete',
          taxonomyId: id
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Falha ao deletar permanentemente');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
      queryClient.invalidateQueries({ queryKey: ['taxonomy-entity-counts'] });
      toast.success(`Tag "${data.hardDeleted?.name || ''}" excluída PERMANENTEMENTE`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir tag: ${error.message}`);
    },
  });

  // Batch delete mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.functions.invoke('taxonomy-auto-manager', {
        body: { 
          action: 'batch_delete',
          taxonomyIds: ids
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Falha ao deletar em lote');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
      queryClient.invalidateQueries({ queryKey: ['taxonomy-entity-counts'] });
      toast.success(`${data.deleted || 0} tags removidas com sucesso`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir tags: ${error.message}`);
    },
  });

  return {
    tree,
    items: taxonomyQuery.data || [],
    isLoading: taxonomyQuery.isLoading,
    isError: taxonomyQuery.isError,
    entityCounts: entityCountsQuery.data || new Map(),
    createTag: createMutation.mutateAsync,
    updateTag: updateMutation.mutateAsync,
    deleteTag: deleteMutation.mutateAsync,
    hardDeleteTag: hardDeleteMutation.mutateAsync,
    batchDeleteTags: batchDeleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isHardDeleting: hardDeleteMutation.isPending,
    isBatchDeleting: batchDeleteMutation.isPending,
  };
}

// Hook to get documents by taxonomy ID
export function useDocumentsByTaxonomy(taxonomyId: string | null) {
  return useQuery({
    queryKey: ['taxonomy-documents', taxonomyId],
    queryFn: async () => {
      if (!taxonomyId) return [];

      // Primeiro buscar entity_tags
      const { data: entityTags, error: entityError } = await supabase
        .from('entity_tags')
        .select(`
          id,
          entity_id,
          entity_type,
          confidence,
          source,
          created_at
        `)
        .eq('taxonomy_id', taxonomyId)
        .limit(50);

      if (entityError) throw entityError;
      if (!entityTags || entityTags.length === 0) return [];

      // Buscar nomes dos documentos para entity_type = 'document'
      const documentIds = entityTags
        .filter(e => e.entity_type === 'document')
        .map(e => e.entity_id);

      let documentNames = new Map<string, string>();
      
      if (documentIds.length > 0) {
        const { data: docs } = await supabase
          .from('documents')
          .select('id, filename, ai_title')
          .in('id', documentIds);
        
        if (docs) {
          docs.forEach(doc => {
            documentNames.set(doc.id, doc.ai_title || doc.filename);
          });
        }
      }

      // Retornar dados enriquecidos
      return entityTags.map(tag => ({
        ...tag,
        document_name: documentNames.get(tag.entity_id) || null
      }));
    },
    enabled: !!taxonomyId,
  });
}
