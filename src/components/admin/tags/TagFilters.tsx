import React, { memo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Loader2 } from "lucide-react";

interface TagFiltersProps {
  filterSource: string;
  filterChat: string;
  filterConfidence: string;
  // Separate input value (immediate) from debounced value (for display)
  searchInputValue: string;
  isSearching?: boolean;
  onFilterSourceChange: (value: string) => void;
  onFilterChatChange: (value: string) => void;
  onFilterConfidenceChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export const TagFilters = memo(({
  filterSource,
  filterChat,
  filterConfidence,
  searchInputValue,
  isSearching = false,
  onFilterSourceChange,
  onFilterChatChange,
  onFilterConfidenceChange,
  onSearchChange,
}: TagFiltersProps) => {
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  const handleClearSearch = useCallback(() => {
    onSearchChange("");
  }, [onSearchChange]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Label>Origem:</Label>
          <Select value={filterSource} onValueChange={onFilterSourceChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="ai">IA</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label>Chat:</Label>
          <Select value={filterChat} onValueChange={onFilterChatChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="health">Saúde</SelectItem>
              <SelectItem value="study">Estudo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label>Confiança:</Label>
          <Select value={filterConfidence} onValueChange={onFilterConfidenceChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="high">Alta (≥70%)</SelectItem>
              <SelectItem value="medium">Média (50-69%)</SelectItem>
              <SelectItem value="low">Baixa (&lt;50%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          {isSearching ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Buscar por nome da tag..."
            value={searchInputValue}
            onChange={handleSearchChange}
            className="h-9"
          />
          {searchInputValue && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearSearch}
              className="h-9 w-9 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});

TagFilters.displayName = "TagFilters";
