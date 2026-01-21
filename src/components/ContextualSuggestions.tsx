import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw, BarChart3, TrendingUp, Search, ClipboardList } from 'lucide-react';

// Icon map for dynamic icon rendering
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  RefreshCw,
  BarChart3,
  TrendingUp,
  Search,
  ClipboardList,
};

export type SuggestionItem = string | { icon: string; text: string };

interface ContextualSuggestionsProps {
  suggestions: SuggestionItem[];
  isLoading: boolean;
  onSuggestionClick: (suggestion: string) => void;
}

// 🔒 MEMOIZADO - exibe APENAS sugestões contextuais do LLM
const ContextualSuggestions = memo(({
  suggestions,
  isLoading,
  onSuggestionClick,
}: ContextualSuggestionsProps) => {
  
  // Limitar a 3 sugestões - SEM adicionar sugestões genéricas
  const displaySuggestions = useMemo(() => {
    return suggestions.slice(0, 3);
  }, [suggestions]);
  
  // Não renderizar se não há sugestões ou está carregando
  if (displaySuggestions.length === 0 || isLoading) return null;
  
  return (
    <div className="px-6 py-1">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-full justify-center">
        {displaySuggestions.map((suggestion, index) => {
          // Handle both string and object formats
          const isObject = typeof suggestion === 'object';
          const text = isObject ? suggestion.text : suggestion;
          const iconName = isObject ? suggestion.icon : null;
          const IconComponent = iconName ? ICON_MAP[iconName] : null;
          
          return (
            <button
              key={`${text}-${index}`}
              onClick={() => onSuggestionClick(text)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full inline-flex items-center gap-1.5",
                "bg-cyan-500/20 text-cyan-300 border border-cyan-400/60",
                "hover:bg-cyan-500 hover:text-cyan-950",
                "hover:scale-105 hover:shadow-[0_0_12px_rgba(34,211,238,0.4)]",
                "transition-all duration-200 cursor-pointer",
                "animate-fade-in"
              )}
              style={{ 
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'both'
              }}
            >
              {IconComponent && <IconComponent className="h-3 w-3" />}
              <span className="truncate max-w-[200px]">{text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

ContextualSuggestions.displayName = 'ContextualSuggestions';

export default ContextualSuggestions;