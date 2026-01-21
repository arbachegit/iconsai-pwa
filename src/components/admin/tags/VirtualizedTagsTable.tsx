import React, { memo, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, HelpCircle, Files } from "lucide-react";
import type { Tag } from "@/types/tag";

interface VirtualRow {
  id: string;
  type: 'parent' | 'child';
  tag: Tag;
  parentId?: string;
  hasChildren?: boolean;
  isExpanded?: boolean;
  matchesSearch?: boolean;
}

interface VirtualizedTagsTableProps {
  parentTags: Tag[];
  childTagsMap: Record<string, Tag[]>;
  expandedParents: Set<string>;
  sortColumn: "tag_name" | "confidence" | "target_chat";
  sortDirection: "asc" | "desc";
  searchTagName: string;
  selectedTags: Set<string>;
  documentCountMap: Record<string, number>;
  onToggleExpanded: (parentId: string) => void;
  onSort: (column: "tag_name" | "confidence" | "target_chat") => void;
  onCreateChild: (parentId: string) => void;
  onEdit: (tag: Tag) => void;
  onDelete: (ids: string[], tagName: string, documentId?: string) => void;
  onToggleSelect: (tagId: string) => void;
  onSelectAll: (selected: boolean) => void;
}

export const VirtualizedTagsTable = memo(({
  parentTags,
  childTagsMap,
  expandedParents,
  sortColumn,
  sortDirection,
  searchTagName,
  selectedTags,
  documentCountMap,
  onToggleExpanded,
  onSort,
  onCreateChild,
  onEdit,
  onDelete,
  onToggleSelect,
  onSelectAll,
}: VirtualizedTagsTableProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const searchLower = searchTagName.toLowerCase().trim();

  // Calculate if all visible tags are selected
  const allTagIds = useMemo(() => {
    const ids: string[] = [];
    parentTags.forEach(parent => {
      ids.push(parent.id);
      (childTagsMap[parent.id] || []).forEach(child => ids.push(child.id));
    });
    return ids;
  }, [parentTags, childTagsMap]);

  const allSelected = allTagIds.length > 0 && allTagIds.every(id => selectedTags.has(id));
  const someSelected = allTagIds.some(id => selectedTags.has(id)) && !allSelected;

  // Flatten parent + child tags into single array for virtualization
  const flattenedRows = useMemo(() => {
    const rows: VirtualRow[] = [];
    
    parentTags.forEach(parent => {
      const children = childTagsMap[parent.id] || [];
      const isExpanded = expandedParents.has(parent.id);
      
      rows.push({
        id: parent.id,
        type: 'parent',
        tag: parent,
        hasChildren: children.length > 0,
        isExpanded,
      });
      
      if (isExpanded) {
        children.forEach(child => {
          const matchesSearch = searchLower && child.tag_name.toLowerCase().includes(searchLower);
          rows.push({
            id: child.id,
            type: 'child',
            tag: child,
            parentId: parent.id,
            matchesSearch,
          });
        });
      }
    });
    
    return rows;
  }, [parentTags, childTagsMap, expandedParents, searchLower]);

  const virtualizer = useVirtualizer({
    count: flattenedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  const renderSortIcon = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      return sortDirection === "asc" ? (
        <ArrowUp className="h-4 w-4" />
      ) : (
        <ArrowDown className="h-4 w-4" />
      );
    }
    return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
  };

  if (parentTags.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhuma tag encontrada
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center bg-muted/50 border-b text-sm font-medium text-muted-foreground">
        <div className="w-[40px] p-3 flex justify-center">
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) {
                (el as any).indeterminate = someSelected;
              }
            }}
            onCheckedChange={(checked) => onSelectAll(checked === true)}
            aria-label="Selecionar todas as tags"
          />
        </div>
        <div className="w-[40px] p-3"></div>
        <div className="flex-1 p-3">
          <Button
            variant="ghost"
            onClick={() => onSort("tag_name")}
            className="flex items-center gap-1 -ml-4 hover:bg-transparent h-auto p-0"
          >
            Nome da Tag
            {renderSortIcon("tag_name")}
          </Button>
        </div>
        <div className="w-[100px] p-3">Tipo</div>
        <div className="w-[100px] p-3">Origem</div>
        <div className="w-[100px] p-3">
          <Button
            variant="ghost"
            onClick={() => onSort("target_chat")}
            className="flex items-center gap-1 -ml-4 hover:bg-transparent h-auto p-0"
          >
            Chat
            {renderSortIcon("target_chat")}
          </Button>
        </div>
        <div className="w-[120px] p-3">
          <Button
            variant="ghost"
            onClick={() => onSort("confidence")}
            className="flex items-center gap-1 -ml-4 hover:bg-transparent h-auto p-0"
          >
            Confiança
            {renderSortIcon("confidence")}
          </Button>
        </div>
        <div className="w-[100px] p-3 text-right">Ações</div>
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: Math.min(flattenedRows.length * 52, 500) }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = flattenedRows[virtualRow.index];
            const isParent = row.type === 'parent';
            const tag = row.tag;
            const docCount = documentCountMap[tag.tag_name] || 1;

            return (
              <div
                key={row.id}
                className={`absolute top-0 left-0 w-full flex items-center border-b group hover:bg-muted/30 transition-colors ${
                  row.matchesSearch ? 'bg-yellow-500/20 border-l-2 border-l-yellow-400' : ''
                } ${!isParent ? 'bg-muted/30' : ''} ${selectedTags.has(tag.id) ? 'bg-primary/10' : ''}`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Checkbox */}
                <div className="w-[40px] p-3 flex justify-center">
                  <Checkbox
                    checked={selectedTags.has(tag.id)}
                    onCheckedChange={() => onToggleSelect(tag.id)}
                    aria-label={`Selecionar ${tag.tag_name}`}
                  />
                </div>

                {/* Expand Button */}
                <div className="w-[40px] p-3 flex justify-center">
                  {isParent && row.hasChildren && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleExpanded(tag.id)}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          row.isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  )}
                </div>

                {/* Tag Name with Document Count Badge */}
                <div className="flex-1 p-3">
                  {isParent ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tag.tag_name}</span>
                      {docCount > 1 && (
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30"
                        >
                          <Files className="h-3 w-3 mr-1" />
                          {docCount} docs
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className={`pl-5 text-sm ${row.matchesSearch ? 'text-yellow-300 font-medium' : 'text-muted-foreground'}`}>
                      ↳ {tag.tag_name}
                      {row.matchesSearch && (
                        <Badge variant="outline" className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                          match
                        </Badge>
                      )}
                    </span>
                  )}
                </div>

                {/* Type */}
                <div className="w-[100px] p-3">
                  <Badge variant="outline" className="text-xs">
                    {tag.tag_type}
                  </Badge>
                </div>

                {/* Source */}
                <div className="w-[100px] p-3">
                  <Badge variant={tag.source === "ai" ? "secondary" : "default"} className="text-xs">
                    {tag.source}
                  </Badge>
                </div>

                {/* Chat */}
                <div className="w-[100px] p-3">
                  {isParent && tag.target_chat && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        tag.target_chat === "health" 
                          ? "border-emerald-500/50 text-emerald-400" 
                          : "border-blue-500/50 text-blue-400"
                      }`}
                    >
                      {tag.target_chat === "health" ? "Saúde" : "Estudo"}
                    </Badge>
                  )}
                </div>

                {/* Confidence */}
                <div className="w-[120px] p-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              (tag.confidence || 0) >= 0.7 
                                ? "border-green-500/50 text-green-400" 
                                : (tag.confidence || 0) >= 0.5 
                                  ? "border-yellow-500/50 text-yellow-400"
                                  : "border-red-500/50 text-red-400"
                            }`}
                          >
                            {Math.round((tag.confidence || 0) * 100)}%
                          </Badge>
                          {isParent && (
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p className="font-semibold">Grau de Confiança</p>
                        <p className="text-sm">Representa a certeza da IA ao classificar este documento.</p>
                        <ul className="text-sm mt-1 list-disc pl-4">
                          <li className="text-green-400">≥70%: Incluída nos scope_topics</li>
                          <li className="text-yellow-400">50-69%: Relevância média</li>
                          <li className="text-red-400">&lt;50%: Baixa relevância</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Actions */}
                <div className="w-[100px] p-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isParent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCreateChild(tag.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(tag)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete([tag.id], tag.tag_name, tag.document_id)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

VirtualizedTagsTable.displayName = "VirtualizedTagsTable";
