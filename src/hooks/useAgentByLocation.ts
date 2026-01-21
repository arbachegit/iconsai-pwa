import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAgentByLocation(location: string) {
  const [agentSlug, setAgentSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAgent = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("chat_agents")
          .select("slug")
          .eq("location", location)
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          console.error("Error fetching agent by location:", error);
        }
        
        setAgentSlug(data?.slug || null);
      } catch (error) {
        console.error("Error fetching agent by location:", error);
        setAgentSlug(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (location) {
      fetchAgent();
    }
  }, [location]);

  return { agentSlug, isLoading };
}
