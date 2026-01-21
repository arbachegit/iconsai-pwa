import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminSettings {
  id: string;
  chat_audio_enabled: boolean;
  auto_play_audio: boolean;
  gmail_api_configured: boolean;
  gmail_notification_email: string | null;
  alert_email: string | null;
  alert_enabled: boolean | null;
  alert_threshold: number | null;
  vimeo_history_url: string | null;
  ml_accuracy_threshold: number | null;
  ml_accuracy_alert_enabled: boolean | null;
  ml_accuracy_alert_email: string | null;
  ml_accuracy_last_alert: string | null;
  doc_sync_time: string | null;
  doc_sync_alert_email: string | null;
  api_sync_enabled: boolean | null;
  api_sync_cron_hour: string | null;
  api_sync_cron_minute: string | null;
  api_sync_default_frequency: string | null;
  // SMS fields
  sms_enabled: boolean | null;
  sms_as_fallback: boolean | null;
  twilio_sms_number: string | null;
}

export const useAdminSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as AdminSettings | null;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<AdminSettings>) => {
      if (!settings?.id) throw new Error("No settings found");

      const { data, error } = await supabase
        .from("admin_settings")
        .update(updates)
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutateAsync,
  };
};
