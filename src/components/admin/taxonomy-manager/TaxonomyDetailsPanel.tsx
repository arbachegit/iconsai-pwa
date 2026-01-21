import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Edit2, 
  Trash2, 
  Plus, 
  X, 
  FileText, 
  Calendar, 
  Hash,
  Tag,
  Loader2,
  icons,
  LucideIcon
} from 'lucide-react';
import { TaxonomyNode, useDocumentsByTaxonomy } from './useTaxonomyData';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaxonomyDetailsPanelProps {
  node: TaxonomyNode | null;
  onEdit: (node: TaxonomyNode) => void;
  onDelete: (node: TaxonomyNode) => void;
  onUpdateSynonyms: (id: string, synonyms: string[]) => void;
  onUpdateKeywords: (id: string, keywords: string[]) => void;
  isUpdating?: boolean;
}

function EditableTagList({
  items,
  onUpdate,
  placeholder,
  isUpdating,
}: {
  items: string[];
  onUpdate: (items: string[]) => void;
  placeholder: string;
  isUpdating?: boolean;
}) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onUpdate([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <Badge 
            key={i} 
            variant="secondary" 
            className="gap-1 pr-1"
          >
            {item}
            <button
              onClick={() => handleRemove(i)}
              className="hover:bg-destructive/20 rounded p-0.5"
              disabled={isUpdating}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-muted-foreground italic">Nenhum item</span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          disabled={isUpdating}
        />
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleAdd}
          disabled={!newItem.trim() || isUpdating}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TaxonomyDetailsPanel({
  node,
  onEdit,
  onDelete,
  onUpdateSynonyms,
  onUpdateKeywords,
  isUpdating,
}: TaxonomyDetailsPanelProps) {
  const { data: documents, isLoading: isLoadingDocs } = useDocumentsByTaxonomy(node?.id || null);

  if (!node) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecione uma tag para ver detalhes</p>
        </div>
      </div>
    );
  }

  const IconComponent = node.icon ? (icons[node.icon as keyof typeof icons] as LucideIcon) : null;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: node.color ? `${node.color}20` : 'hsl(var(--primary) / 0.1)' }}
          >
            {IconComponent ? (
              <IconComponent 
                className="h-6 w-6" 
                style={{ color: node.color || 'hsl(var(--primary))' }}
              />
            ) : (
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: node.color || 'hsl(var(--primary))' }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{node.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{node.code}</p>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => onEdit(node)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(node)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {node.description && (
          <p className="text-sm text-muted-foreground">{node.description}</p>
        )}

        <Separator />

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Hash className="h-3 w-3" />
                Nível
              </div>
              <p className="font-semibold">{node.level}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <FileText className="h-3 w-3" />
                Documentos
              </div>
              <p className="font-semibold">{node.documentCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Dates */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            Criado: {node.created_at ? format(new Date(node.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
          </div>
          {node.updated_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Atualizado: {format(new Date(node.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          )}
        </div>

        <Separator />

        {/* Synonyms */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Sinônimos</Label>
          <EditableTagList
            items={node.synonyms || []}
            onUpdate={(synonyms) => onUpdateSynonyms(node.id, synonyms)}
            placeholder="Adicionar sinônimo..."
            isUpdating={isUpdating}
          />
        </div>

        {/* Keywords */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Palavras-chave</Label>
          <EditableTagList
            items={node.keywords || []}
            onUpdate={(keywords) => onUpdateKeywords(node.id, keywords)}
            placeholder="Adicionar palavra-chave..."
            isUpdating={isUpdating}
          />
        </div>

        <Separator />

        {/* Documents List */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Entidades Vinculadas</Label>
          {isLoadingDocs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {documents.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs"
                >
                  <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1" title={doc.document_name || doc.entity_id}>
                    {doc.document_name || `${doc.entity_id.slice(0, 8)}...`}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{doc.entity_type}</Badge>
                  <span className="text-muted-foreground">{Math.round((doc.confidence || 1) * 100)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhuma entidade vinculada</p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
