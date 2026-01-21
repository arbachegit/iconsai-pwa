import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TagSuggestion {
  id: string;
  document_id: string;
  taxonomy_id: string;
  suggested_code: string;
  confidence: number;
  source: string;
  status: "pending" | "approved" | "rejected" | "corrected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  corrected_to_taxonomy_id: string | null;
  created_at: string;
  // Joined data
  document?: {
    id: string;
    filename: string;
    ai_title: string | null;
    ai_summary: string | null;
    title_was_renamed: boolean | null;
  };
  taxonomy?: {
    name: string;
    code: string;
  };
  corrected_taxonomy?: {
    name: string;
    code: string;
  } | null;
}

export interface TagFeedbackStats {
  total_suggestions: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  corrected_count: number;
  approval_rate: number;
  avg_confidence: number;
}

interface RpcResult {
  success: boolean;
  error?: string;
  entity_tag_id?: string;
  taxonomy_id?: string;
  corrected_to?: string;
}

export function useTagSuggestions(status: string = "pending") {
  return useQuery({
    queryKey: ["tag-suggestions", status],
    queryFn: async () => {
      const query = supabase
        .from("ml_tag_suggestions")
        .select(`
          *,
          document:documents(id, filename, ai_title, ai_summary, title_was_renamed),
          taxonomy:global_taxonomy!ml_tag_suggestions_taxonomy_id_fkey(name, code),
          corrected_taxonomy:global_taxonomy!ml_tag_suggestions_corrected_to_taxonomy_id_fkey(name, code)
        `)
        .order("created_at", { ascending: false });

      if (status !== "all") {
        query.eq("status", status);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as unknown as TagSuggestion[];
    },
  });
}

export function useTagFeedbackStats() {
  return useQuery({
    queryKey: ["tag-feedback-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ml_suggestion_stats");
      if (error) throw error;
      const result = data as unknown as TagFeedbackStats[] | null;
      return result?.[0] || {
        total_suggestions: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        corrected_count: 0,
        approval_rate: 0,
        avg_confidence: 0,
      };
    },
  });
}

export function useApproveSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string): Promise<RpcResult> => {
      const { data, error } = await supabase.rpc("approve_tag_suggestion", {
        p_suggestion_id: suggestionId,
        p_reviewer_id: null,
      });
      if (error) throw error;
      return data as unknown as RpcResult;
    },
    onSuccess: (data: RpcResult) => {
      if (data?.success) {
        toast.success("Tag aprovada com sucesso");
        queryClient.invalidateQueries({ queryKey: ["tag-suggestions"] });
        queryClient.invalidateQueries({ queryKey: ["tag-feedback-stats"] });
        queryClient.invalidateQueries({ queryKey: ["entity-tags"] });
      } else {
        toast.error(data?.error || "Erro ao aprovar tag");
      }
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useRejectSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestionId, notes }: { suggestionId: string; notes?: string }): Promise<RpcResult> => {
      const { data, error } = await supabase.rpc("reject_tag_suggestion", {
        p_suggestion_id: suggestionId,
        p_reviewer_id: null,
        p_notes: notes || null,
      });
      if (error) throw error;
      return data as unknown as RpcResult;
    },
    onSuccess: (data: RpcResult) => {
      if (data?.success) {
        toast.success("Tag rejeitada");
        queryClient.invalidateQueries({ queryKey: ["tag-suggestions"] });
        queryClient.invalidateQueries({ queryKey: ["tag-feedback-stats"] });
      } else {
        toast.error(data?.error || "Erro ao rejeitar tag");
      }
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCorrectSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      suggestionId,
      correctTaxonomyId,
      notes,
    }: {
      suggestionId: string;
      correctTaxonomyId: string;
      notes?: string;
    }): Promise<RpcResult> => {
      const { data, error } = await supabase.rpc("correct_tag_suggestion", {
        p_suggestion_id: suggestionId,
        p_new_taxonomy_id: correctTaxonomyId,
        p_reviewer_id: null,
        p_notes: notes || null,
      });
      if (error) throw error;
      return data as unknown as RpcResult;
    },
    onSuccess: (data: RpcResult) => {
      if (data?.success) {
        toast.success(`Tag corrigida para: ${data.corrected_to}`);
        queryClient.invalidateQueries({ queryKey: ["tag-suggestions"] });
        queryClient.invalidateQueries({ queryKey: ["tag-feedback-stats"] });
        queryClient.invalidateQueries({ queryKey: ["entity-tags"] });
      } else {
        toast.error(data?.error || "Erro ao corrigir tag");
      }
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useBulkApproveSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionIds: string[]) => {
      const results = await Promise.all(
        suggestionIds.map((id) =>
          supabase.rpc("approve_tag_suggestion", {
            p_suggestion_id: id,
            p_reviewer_id: null,
          })
        )
      );
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(`${errors.length} erros ao aprovar`);
      }
      return results.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} tags aprovadas`);
      queryClient.invalidateQueries({ queryKey: ["tag-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["tag-feedback-stats"] });
      queryClient.invalidateQueries({ queryKey: ["entity-tags"] });
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useBulkRejectSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionIds: string[]) => {
      const results = await Promise.all(
        suggestionIds.map((id) =>
          supabase.rpc("reject_tag_suggestion", {
            p_suggestion_id: id,
            p_reviewer_id: null,
            p_notes: "Bulk rejection",
          })
        )
      );
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(`${errors.length} erros ao rejeitar`);
      }
      return results.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} tags rejeitadas`);
      queryClient.invalidateQueries({ queryKey: ["tag-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["tag-feedback-stats"] });
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useRevertSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data, error } = await supabase.rpc("revert_tag_suggestion", {
        p_suggestion_id: suggestionId,
        p_reviewer_id: null,
      });
      if (error) throw error;
      return data as { success: boolean; error?: string; previous_status?: string };
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Sugestão revertida para pendente");
        queryClient.invalidateQueries({ queryKey: ["tag-suggestions"] });
        queryClient.invalidateQueries({ queryKey: ["tag-feedback-stats"] });
        queryClient.invalidateQueries({ queryKey: ["entity-tags"] });
        queryClient.invalidateQueries({ queryKey: ["tag-feedback-history"] });
      } else {
        toast.error(data?.error || "Erro ao reverter sugestão");
      }
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useTagFeedbackHistory() {
  return useQuery({
    queryKey: ["tag-feedback-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_tag_feedback")
        .select(`
          *,
          document:documents(filename),
          original:global_taxonomy!ml_tag_feedback_original_taxonomy_id_fkey(name, code),
          corrected:global_taxonomy!ml_tag_feedback_corrected_taxonomy_id_fkey(name, code)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
}
