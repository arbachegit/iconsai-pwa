import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CollapsibleGroupProps {
  title: string;
  icon?: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  headerExtra?: React.ReactNode;
}

export function CollapsibleGroup({
  title,
  icon,
  count,
  children,
  defaultExpanded = false,
  headerExtra,
}: CollapsibleGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="knowyou-card overflow-hidden">
      {/* Header do Grupo */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-4",
          "hover:bg-primary/5 transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/30"
        )}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-primary">{icon}</span>}
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Badge com contagem */}
          <Badge 
            variant="outline" 
            className="knowyou-badge px-3 py-1 font-bold"
          >
            {count}
          </Badge>
          
          {/* Header extra content (e.g., toggle) */}
          {headerExtra}
          
          {/* Chevron */}
          <div className={cn(
            "p-1 rounded transition-all duration-300",
            "border border-primary/30",
            "hover:bg-primary/10",
            isExpanded ? "rotate-0" : "-rotate-90"
          )}>
            <ChevronDown className="h-5 w-5 text-primary" />
          </div>
        </div>
      </button>

      {/* Conteúdo Colapsável */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}
