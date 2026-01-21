import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { AutocompleteItem } from '@/types/pwa-conversations';
import { X, Search, Tag, ChevronDown } from 'lucide-react';

interface TaxonomyAutocompleteProps {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: AutocompleteItem[];
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const TaxonomyAutocomplete = ({ 
  value, 
  onChange, 
  suggestions, 
  onSearch, 
  placeholder = 'Buscar taxonomia...', 
  className 
}: TaxonomyAutocompleteProps) => {
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
            <Badge key={item} variant="secondary" className="text-xs gap-1">
              <Tag className="w-2.5 h-2.5" />
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
              Nenhuma taxonomia encontrada
            </div>
          ) : (
            <div className="py-1">
              {filteredSuggestions.map(item => (
                <button
                  key={item.value}
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className="text-muted-foreground ml-auto">({item.count})</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
