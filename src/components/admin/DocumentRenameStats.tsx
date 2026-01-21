import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  RefreshCw, 
  Clock, 
  Percent,
  Hash,
  Binary,
  Fingerprint,
  Settings,
  AlertTriangle,
  Shuffle,
  Bot,
  FileSearch,
  AlignLeft,
  File
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RenameStats {
  total: number;
  renamed: number;
  pendingReview: number;
  optimizationRate: number;
  byReason: {
    numeric: number;
    hash: number;
    uuid: number;
    technical: number;
    unreadable: number;
    mixed_pattern: number;
    manual_edit: number;
    approved_ai_suggestion: number;
  };
  bySource: {
    ai: number;
    metadata: number;
    first_lines: number;
    filename: number;
  };
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: "blue" | "green" | "amber" | "purple" | "red" | "slate";
  className?: string;
}

const colorVariants = {
  blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
  green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400",
  amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400",
  purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
  red: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-400",
  slate: "from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-400",
};

const StatCard = ({ icon, label, value, color = "blue", className }: StatCardProps) => (
  <Card className={cn(
    "p-4 bg-gradient-to-br border backdrop-blur-sm",
    colorVariants[color],
    className
  )}>
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-background/50">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  </Card>
);

interface BreakdownItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
}

const BreakdownItem = ({ icon, label, value, total }: BreakdownItemProps) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{value}</span>
        <span className="text-xs text-muted-foreground">({percentage}%)</span>
      </div>
    </div>
  );
};

interface DocumentRenameStatsProps {
  showBreakdown?: boolean;
  showSources?: boolean;
  className?: string;
}

export function DocumentRenameStats({ 
  showBreakdown = true, 
  showSources = true,
  className 
}: DocumentRenameStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["document-rename-stats"],
    queryFn: async (): Promise<RenameStats> => {
      const { data, error } = await supabase
        .from("documents")
        .select("title_was_renamed, needs_title_review, rename_reason, title_source");

      if (error) throw error;

      const documents = data || [];
      const total = documents.length;
      const renamed = documents.filter(d => d.title_was_renamed === true).length;
      const pendingReview = documents.filter(d => d.needs_title_review === true).length;

      // Count by rename reason
      const byReason = {
        numeric: 0,
        hash: 0,
        uuid: 0,
        technical: 0,
        unreadable: 0,
        mixed_pattern: 0,
        manual_edit: 0,
        approved_ai_suggestion: 0,
      };

      documents.forEach(doc => {
        const reason = doc.rename_reason as keyof typeof byReason;
        if (reason && reason in byReason) {
          byReason[reason]++;
        }
      });

      // Count by title source
      const bySource = {
        ai: 0,
        metadata: 0,
        first_lines: 0,
        filename: 0,
      };

      documents.forEach(doc => {
        const source = doc.title_source as keyof typeof bySource;
        if (source && source in bySource) {
          bySource[source]++;
        }
      });

      return {
        total,
        renamed,
        pendingReview,
        optimizationRate: total > 0 ? Math.round((renamed / total) * 100) : 0,
        byReason,
        bySource,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const totalReasons = Object.values(stats.byReason).reduce((a, b) => a + b, 0);
  const totalSources = Object.values(stats.bySource).reduce((a, b) => a + b, 0);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Stats */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Estatísticas de Títulos de Documentos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Total"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={<RefreshCw className="h-5 w-5" />}
            label="Otimizados"
            value={stats.renamed}
            color="green"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Pendentes"
            value={stats.pendingReview}
            color="amber"
          />
          <StatCard
            icon={<Percent className="h-5 w-5" />}
            label="Taxa de Otimização"
            value={`${stats.optimizationRate}%`}
            color="purple"
          />
        </div>
      </div>

      {/* Breakdown by Reason */}
      {showBreakdown && totalReasons > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Motivos de Renomeação
          </h3>
          <Card className="p-4 bg-card/50 border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <BreakdownItem
                icon={<Binary className="h-4 w-4" />}
                label="Numérico"
                value={stats.byReason.numeric}
                total={totalReasons}
              />
              <BreakdownItem
                icon={<Hash className="h-4 w-4" />}
                label="Hash"
                value={stats.byReason.hash}
                total={totalReasons}
              />
              <BreakdownItem
                icon={<Fingerprint className="h-4 w-4" />}
                label="UUID"
                value={stats.byReason.uuid}
                total={totalReasons}
              />
              <BreakdownItem
                icon={<Settings className="h-4 w-4" />}
                label="Técnico"
                value={stats.byReason.technical}
                total={totalReasons}
              />
              <BreakdownItem
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Ilegível"
                value={stats.byReason.unreadable}
                total={totalReasons}
              />
              <BreakdownItem
                icon={<Shuffle className="h-4 w-4" />}
                label="Padrão Misto"
                value={stats.byReason.mixed_pattern}
                total={totalReasons}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Breakdown by Source */}
      {showSources && totalSources > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            Fonte do Título
          </h3>
          <Card className="p-4 bg-card/50 border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <BreakdownItem
                icon={<Bot className="h-4 w-4" />}
                label="IA"
                value={stats.bySource.ai}
                total={totalSources}
              />
              <BreakdownItem
                icon={<FileSearch className="h-4 w-4" />}
                label="Metadados"
                value={stats.bySource.metadata}
                total={totalSources}
              />
              <BreakdownItem
                icon={<AlignLeft className="h-4 w-4" />}
                label="Primeiras Linhas"
                value={stats.bySource.first_lines}
                total={totalSources}
              />
              <BreakdownItem
                icon={<File className="h-4 w-4" />}
                label="Nome do Arquivo"
                value={stats.bySource.filename}
                total={totalSources}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
