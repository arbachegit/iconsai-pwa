import { ChevronRight, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TaxonomyNode } from './useTaxonomyData';
import { icons, LucideIcon } from 'lucide-react';

interface TaxonomyNodeRowProps {
  node: TaxonomyNode;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  level?: number;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  approved: { label: 'Ativo', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  pending: { label: 'Pendente', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  deprecated: { label: 'Obsoleto', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export function TaxonomyNodeRow({
  node,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  level = 0,
}: TaxonomyNodeRowProps) {
  const hasChildren = node.children.length > 0;
  const status = STATUS_STYLES[node.status || 'approved'];
  
  // Get icon component
  const IconComponent = node.icon ? (icons[node.icon as keyof typeof icons] as LucideIcon) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
        "hover:bg-primary/5 border border-transparent",
        isSelected && "bg-primary/10 border-primary/30"
      )}
      style={{ paddingLeft: `${12 + level * 20}px` }}
      onClick={onSelect}
    >
      {/* Expand/Collapse button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "p-1 rounded hover:bg-primary/10 transition-transform duration-200",
          !hasChildren && "invisible"
        )}
      >
        <ChevronRight 
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-90"
          )} 
        />
      </button>

      {/* Icon or color indicator */}
      <div 
        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
        style={{ backgroundColor: node.color ? `${node.color}20` : 'hsl(var(--primary) / 0.1)' }}
      >
        {IconComponent ? (
          <IconComponent 
            className="h-3.5 w-3.5" 
            style={{ color: node.color || 'hsl(var(--primary))' }}
          />
        ) : (
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: node.color || 'hsl(var(--primary))' }}
          />
        )}
      </div>

      {/* Name and level */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm truncate block">{node.name}</span>
        <span className="text-xs text-muted-foreground font-mono">{node.code}</span>
      </div>

      {/* Status badge */}
      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", status.className)}>
        {status.label}
      </Badge>

      {/* Child count */}
      {node.childCount > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
          <span>{node.childCount}</span>
          <span className="text-muted-foreground">filhos</span>
        </Badge>
      )}

      {/* Document count */}
      {node.documentCount > 0 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
          <FileText className="h-3 w-3" />
          <span>{node.documentCount}</span>
        </Badge>
      )}
    </div>
  );
}
