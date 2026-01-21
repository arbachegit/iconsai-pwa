import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { AutocompleteItem } from '@/types/pwa-conversations';
import { X, Search, User, Globe2, Building2, ChevronDown } from 'lucide-react';

interface KeyTopicsAutocompleteProps {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: AutocompleteItem[];
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const CATEGORY_ICONS = {
  person: User,
  country: Globe2,
  organization: Building2,
};

const CATEGORY_COLORS = {
  person: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  country: 'bg-green-500/20 text-green-700 dark:text-green-300',
  organization: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
};

export const KeyTopicsAutocomplete = ({ 
  value, 
  onChange, 
  suggestions, 
  onSearch, 
  placeholder = 'Buscar temas...', 
  className 
}: KeyTopicsAutocompleteProps) => {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);

  // PRD: Pre-carregar sugestoes ao abrir
  useEffect(() => {
    if (open) {
      onSearch(inputValue); // Busca inicial (pode ser vazia)
    }
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputValue(query);
    onSearch(query);
  };

  const handleSelect = (item: AutocompleteItem) => {
    if (!value.includes(item.value)) {
      onChange([...value, item.value]);
    }
    setInputValue('');
  };

  const handleRemove = (itemToRemove: string) => {
    onChange(value.filter(v => v !== itemToRemove));
  };

  // Filtrar localmente baseado no input
  const filteredSuggestions = inputValue.length > 0
    ? suggestions.filter(s => s.label.toLowerCase().includes(inputValue.toLowerCase()))
    : suggestions;

  return (
    <div className="space-y-2">
      {/* Tags selecionadas */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map(item => (
            <Badge key={item} variant="secondary" className="text-xs">
              {item}
              <button onClick={() => handleRemove(item)} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {/* Popover com dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={inputValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              className={`pl-8 pr-8 ${className}`}
              onFocus={() => setOpen(true)}
            />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0 max-h-60 overflow-y-auto"
          align="start"
          sideOffset={4}
        >
          {filteredSuggestions.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Nenhum tema encontrado
            </div>
          ) : (
            <div className="py-1">
              {filteredSuggestions.map(item => {
                const category = item.category as keyof typeof CATEGORY_ICONS;
                const Icon = category ? CATEGORY_ICONS[category] : null;
                const colorClass = category ? CATEGORY_COLORS[category] : '';
                
                return (
                  <button
                    key={item.value}
                    onClick={() => handleSelect(item)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    {Icon && (
                      <span className={`p-1 rounded ${colorClass}`}>
                        <Icon className="w-3 h-3" />
                      </span>
                    )}
                    <span>{item.label}</span>
                    {item.count !== undefined && (
                      <span className="text-muted-foreground ml-auto">({item.count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
