import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChatAnalytic {
  id: string;
  session_id: string;
  user_name: string | null;
  message_count: number;
  audio_plays: number;
  topics: string[];
  started_at: string;
  last_interaction: string;
}

export const useChatAnalytics = () => {
  const queryClient = useQueryClient();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["chat-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_analytics")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ChatAnalytic[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute cache
  });

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: {
      session_id: string;
      user_name: string | null;
    }) => {
      const { data, error } = await supabase
        .from("chat_analytics")
        .insert({
          session_id: sessionData.session_id,
          user_name: sessionData.user_name,
          message_count: 0,
          audio_plays: 0,
          topics: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-analytics"] });
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({
      session_id,
      updates,
    }: {
      session_id: string;
      updates: Partial<ChatAnalytic>;
    }) => {
      const { data, error } = await supabase
        .from("chat_analytics")
        .update({
          ...updates,
          last_interaction: new Date().toISOString(),
        })
        .eq("session_id", session_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-analytics"] });
    },
  });

  return {
    analytics,
    isLoading,
    createSession: createSessionMutation.mutateAsync,
    updateSession: updateSessionMutation.mutateAsync,
  };
};
