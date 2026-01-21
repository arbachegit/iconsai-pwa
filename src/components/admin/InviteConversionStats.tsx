import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConversionStats {
  total_sent: number;
  total_opened: number;
  total_completed: number;
  conversion_rate: number;
}

export function InviteConversionStats() {
  const [stats, setStats] = useState<ConversionStats>({
    total_sent: 0,
    total_opened: 0,
    total_completed: 0,
    conversion_rate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    // Update every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from("user_invitations")
        .select("status, first_opened_at");

      if (error) throw error;

      const total_sent = data?.length || 0;
      const total_opened = data?.filter((i) => i.first_opened_at).length || 0;
      const total_completed = data?.filter((i) => i.status === "completed").length || 0;
      const conversion_rate = total_sent > 0 ? (total_completed / total_sent) * 100 : 0;

      setStats({ total_sent, total_opened, total_completed, conversion_rate });
    } catch (err) {
      console.error("Error fetching conversion stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || stats.total_sent === 0) return null;

  const conversionWidth = Math.min(stats.conversion_rate, 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 ml-2">
            {/* Mini progress bar */}
            <div className="relative w-8 h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${conversionWidth}%` }}
              />
            </div>
            {/* Percentage */}
            <span className="text-[10px] font-semibold text-emerald-500">
              {stats.conversion_rate.toFixed(0)}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">Taxa de Conversão</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Enviados:</span>
            <span className="font-medium text-right">{stats.total_sent}</span>
            <span className="text-muted-foreground">Abertos:</span>
            <span className="font-medium text-right">{stats.total_opened}</span>
            <span className="text-muted-foreground">Completados:</span>
            <span className="font-medium text-emerald-500 text-right">{stats.total_completed}</span>
          </div>
          {/* Visual bar */}
          <div className="pt-1">
            <div className="relative w-full h-2 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                style={{ width: `${conversionWidth}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
