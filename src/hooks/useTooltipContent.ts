import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TooltipContent {
  id: string;
  section_id: string;
  title: string;
  content: string;
  audio_url: string | null;
  is_active: boolean;
}

export const useTooltipContent = (sectionId: string) => {
  const queryClient = useQueryClient();

  const { data: content, isLoading } = useQuery({
    queryKey: ["tooltip-content", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tooltip_contents")
        .select("*")
        .eq("section_id", sectionId)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data as TooltipContent;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<TooltipContent>) => {
      const { data, error } = await supabase
        .from("tooltip_contents")
        .update(updates)
        .eq("section_id", sectionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tooltip-content", sectionId] });
    },
  });

  return {
    content,
    isLoading,
    updateContent: updateMutation.mutateAsync,
  };
};
