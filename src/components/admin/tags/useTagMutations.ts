import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tag } from "@/types/tag";
import type { TagFormData } from "./types";

export function useTagMutations() {
  const queryClient = useQueryClient();

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (tagData: TagFormData) => {
      const { data, error } = await supabase
        .from("document_tags")
        .insert([{
          tag_name: tagData.tag_name,
          tag_type: tagData.tag_type,
          confidence: tagData.confidence,
          source: tagData.source,
          parent_tag_id: tagData.parent_tag_id,
          document_id: "00000000-0000-0000-0000-000000000000", // Placeholder for admin tags
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Tag criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar tag: ${error.message}`);
    },
  });

  // Update tag mutation
  const updateTagMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tag> & { id: string }) => {
      const { data, error } = await supabase
        .from("document_tags")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Tag atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar tag: ${error.message}`);
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("document_tags")
        .delete()
        .eq("id", tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tag deletada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao deletar tag: ${error.message}`);
    },
  });

  // Merge tags mutation with machine learning rule creation
  const mergeTagsMutation = useMutation({
    mutationFn: async ({ 
      targetTagId, 
      sourceTagIds, 
      sourceTagNames, 
      targetTagName, 
      chatType, 
      documentsAffected 
    }: { 
      targetTagId: string; 
      sourceTagIds: string[]; 
      sourceTagNames: string[];
      targetTagName: string;
      chatType: string;
      documentsAffected?: Array<{ document_id: string; document_filename: string }>;
    }) => {
      // Move all child tags to target
      for (const sourceId of sourceTagIds) {
        await supabase
          .from("document_tags")
          .update({ parent_tag_id: targetTagId })
          .eq("parent_tag_id", sourceId);
      }
      
      // Delete duplicate parent tags
      await supabase
        .from("document_tags")
        .delete()
        .in("id", sourceTagIds);
      
      // Save machine learning rules for each merged tag
      for (const sourceName of sourceTagNames) {
        if (sourceName.toLowerCase() !== targetTagName.toLowerCase()) {
          await supabase
            .from("tag_merge_rules")
            .upsert({
              source_tag: sourceName,
              canonical_tag: targetTagName,
              chat_type: chatType,
              created_by: "admin"
            }, { onConflict: "source_tag,chat_type" });
        }
      }
      
      // Log tag modifications for each affected document
      if (documentsAffected && documentsAffected.length > 0) {
        for (const doc of documentsAffected) {
          for (const sourceName of sourceTagNames) {
            if (sourceName.toLowerCase() !== targetTagName.toLowerCase()) {
              await supabase
                .from("tag_modification_logs")
                .insert({
                  document_id: doc.document_id,
                  document_filename: doc.document_filename,
                  original_tag_name: sourceName,
                  new_tag_name: targetTagName,
                  modification_type: "merge",
                  chat_type: chatType,
                  created_by: "admin"
                });
            }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Tags unificadas! Regra de aprendizado criada - a IA não repetirá este erro.");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tag-modification-logs"] });
      queryClient.invalidateQueries({ queryKey: ["tag-modification-logs-for-indicators"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao unificar tags: ${error.message}`);
    },
  });

  // Delete ML merge rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("tag_merge_rules")
        .delete()
        .eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regra de aprendizado removida");
      queryClient.invalidateQueries({ queryKey: ["tag-merge-rules"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover regra: ${error.message}`);
    },
  });

  // Delete chat routing rule mutation
  const deleteChatRoutingRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("chat_routing_rules")
        .delete()
        .eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regra de roteamento removida");
      queryClient.invalidateQueries({ queryKey: ["chat-routing-rules"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover regra: ${error.message}`);
    },
  });

  return {
    createTagMutation,
    updateTagMutation,
    deleteTagMutation,
    mergeTagsMutation,
    deleteRuleMutation,
    deleteChatRoutingRuleMutation,
  };
}
