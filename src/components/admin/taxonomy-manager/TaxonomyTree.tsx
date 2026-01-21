import { useState, useMemo } from 'react';
import { TaxonomyNode } from './useTaxonomyData';
import { TaxonomyNodeRow } from './TaxonomyNodeRow';
import { cn } from '@/lib/utils';

interface TaxonomyTreeProps {
  nodes: TaxonomyNode[];
  selectedId: string | null;
  onSelect: (node: TaxonomyNode) => void;
  searchQuery?: string;
  statusFilter?: string;
}

// Recursively filter nodes based on search
function filterNodes(nodes: TaxonomyNode[], query: string, statusFilter: string): TaxonomyNode[] {
  if (!query && !statusFilter) return nodes;
  
  const lowerQuery = query.toLowerCase();
  
  return nodes.reduce<TaxonomyNode[]>((acc, node) => {
    const matchesQuery = !query || 
      node.name.toLowerCase().includes(lowerQuery) ||
      node.code.toLowerCase().includes(lowerQuery) ||
      node.description?.toLowerCase().includes(lowerQuery) ||
      node.synonyms?.some(s => s.toLowerCase().includes(lowerQuery)) ||
      node.keywords?.some(k => k.toLowerCase().includes(lowerQuery));
    
    const matchesStatus = !statusFilter || statusFilter === 'all' || node.status === statusFilter;
    
    const filteredChildren = filterNodes(node.children, query, statusFilter);
    
    if (matchesQuery && matchesStatus) {
      acc.push({ ...node, children: filteredChildren });
    } else if (filteredChildren.length > 0) {
      acc.push({ ...node, children: filteredChildren });
    }
    
    return acc;
  }, []);
}

interface TreeLevelProps {
  nodes: TaxonomyNode[];
  selectedId: string | null;
  onSelect: (node: TaxonomyNode) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  level?: number;
}

function TreeLevel({ nodes, selectedId, onSelect, expandedIds, onToggle, level = 0 }: TreeLevelProps) {
  return (
    <div className={cn(level > 0 && "ml-2 border-l border-border/50 pl-1")}>
      {nodes.map(node => {
        const isExpanded = expandedIds.has(node.id);
        const isSelected = selectedId === node.id;
        
        return (
          <div key={node.id}>
            <TaxonomyNodeRow
              node={node}
              isExpanded={isExpanded}
              isSelected={isSelected}
              onToggle={() => onToggle(node.id)}
              onSelect={() => onSelect(node)}
              level={level}
            />
            {isExpanded && node.children.length > 0 && (
              <TreeLevel
                nodes={node.children}
                selectedId={selectedId}
                onSelect={onSelect}
                expandedIds={expandedIds}
                onToggle={onToggle}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TaxonomyTree({ nodes, selectedId, onSelect, searchQuery = '', statusFilter = '' }: TaxonomyTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Expand first level by default
    return new Set(nodes.map(n => n.id));
  });

  const filteredNodes = useMemo(() => 
    filterNodes(nodes, searchQuery, statusFilter),
    [nodes, searchQuery, statusFilter]
  );

  const handleToggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand all when searching
  useMemo(() => {
    if (searchQuery) {
      const getAllIds = (nodes: TaxonomyNode[]): string[] => 
        nodes.flatMap(n => [n.id, ...getAllIds(n.children)]);
      setExpandedIds(new Set(getAllIds(filteredNodes)));
    }
  }, [searchQuery, filteredNodes]);

  if (filteredNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">Nenhuma tag encontrada</p>
        {searchQuery && <p className="text-xs mt-1">Tente outro termo de busca</p>}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <TreeLevel
        nodes={filteredNodes}
        selectedId={selectedId}
        onSelect={onSelect}
        expandedIds={expandedIds}
        onToggle={handleToggle}
      />
    </div>
  );
}
