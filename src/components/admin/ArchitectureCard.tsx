import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ArchitectureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: 'cyan' | 'purple' | 'green';
  badge?: string;
  onClick: () => void;
}

const colorStyles = {
  cyan: {
    card: "border-cyan-500/30 hover:border-cyan-500/60 bg-gradient-to-br from-cyan-500/5 to-cyan-600/15 hover:from-cyan-500/10 hover:to-cyan-600/25",
    icon: "text-cyan-400 bg-cyan-500/20 border-cyan-500/40",
    title: "text-cyan-300",
    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    glow: "hover:shadow-[0_0_30px_rgba(6,182,212,0.25)]"
  },
  purple: {
    card: "border-purple-500/30 hover:border-purple-500/60 bg-gradient-to-br from-purple-500/5 to-purple-600/15 hover:from-purple-500/10 hover:to-purple-600/25",
    icon: "text-purple-400 bg-purple-500/20 border-purple-500/40",
    title: "text-purple-300",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    glow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]"
  },
  green: {
    card: "border-green-500/30 hover:border-green-500/60 bg-gradient-to-br from-green-500/5 to-green-600/15 hover:from-green-500/10 hover:to-green-600/25",
    icon: "text-green-400 bg-green-500/20 border-green-500/40",
    title: "text-green-300",
    badge: "bg-green-500/20 text-green-300 border-green-500/40",
    glow: "hover:shadow-[0_0_30px_rgba(34,197,94,0.25)]"
  }
};

export const ArchitectureCard = ({
  title,
  description,
  icon: Icon,
  color,
  badge,
  onClick
}: ArchitectureCardProps) => {
  const styles = colorStyles[color];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:scale-[1.02]",
        styles.card,
        styles.glow
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className={cn("p-3 rounded-lg border", styles.icon)}>
            <Icon className="h-6 w-6" />
          </div>
          {badge && (
            <Badge variant="outline" className={styles.badge}>
              {badge}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <h3 className={cn("text-lg font-bold", styles.title)}>{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Clique para visualizar</span>
          <span>→</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArchitectureCard;
