import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X } from 'lucide-react';
import { TaxonomyNode, TaxonomyFormData, generateCode } from './useTaxonomyData';
import { IconSelector } from '@/components/admin/IconSelector';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  code: z.string().min(2, 'Código deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  parent_id: z.string().nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['approved', 'pending', 'deprecated']),
});

interface TaxonomyFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaxonomyFormData) => Promise<void>;
  editingNode?: TaxonomyNode | null;
  allNodes: TaxonomyNode[];
  isSubmitting?: boolean;
}

// Flatten tree for parent select
function flattenNodes(nodes: TaxonomyNode[], level = 0): { id: string; name: string; code: string; level: number }[] {
  return nodes.flatMap(node => [
    { id: node.id, name: node.name, code: node.code, level },
    ...flattenNodes(node.children, level + 1)
  ]);
}

export function TaxonomyFormModal({
  open,
  onClose,
  onSubmit,
  editingNode,
  allNodes,
  isSubmitting,
}: TaxonomyFormModalProps) {
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newSynonym, setNewSynonym] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      parent_id: null,
      icon: '',
      color: '#3B82F6',
      status: 'approved',
    },
  });

  const flatNodes = useMemo(() => flattenNodes(allNodes), [allNodes]);
  
  // Filter out the editing node and its descendants from parent options
  const parentOptions = useMemo(() => {
    if (!editingNode) return flatNodes;
    
    const getDescendantIds = (node: TaxonomyNode): string[] => 
      [node.id, ...node.children.flatMap(getDescendantIds)];
    
    const excludeIds = new Set(getDescendantIds(editingNode));
    return flatNodes.filter(n => !excludeIds.has(n.id));
  }, [flatNodes, editingNode]);

  // Watch name and parent to auto-generate code
  const watchName = form.watch('name');
  const watchParentId = form.watch('parent_id');

  useEffect(() => {
    if (!editingNode && watchName) {
      const parentNode = flatNodes.find(n => n.id === watchParentId);
      const newCode = generateCode(watchName, parentNode?.code);
      form.setValue('code', newCode);
    }
  }, [watchName, watchParentId, editingNode, flatNodes, form]);

  // Reset form when opening/closing or editing node changes
  useEffect(() => {
    if (open) {
      if (editingNode) {
        form.reset({
          name: editingNode.name,
          code: editingNode.code,
          description: editingNode.description || '',
          parent_id: editingNode.parent_id,
          icon: editingNode.icon || '',
          color: editingNode.color || '#3B82F6',
          status: (editingNode.status as 'approved' | 'pending' | 'deprecated') || 'approved',
        });
        setSynonyms(editingNode.synonyms || []);
        setKeywords(editingNode.keywords || []);
      } else {
        form.reset({
          name: '',
          code: '',
          description: '',
          parent_id: null,
          icon: '',
          color: '#3B82F6',
          status: 'approved',
        });
        setSynonyms([]);
        setKeywords([]);
      }
    }
  }, [open, editingNode, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit({
      name: values.name,
      code: values.code,
      description: values.description || '',
      parent_id: values.parent_id,
      icon: values.icon || '',
      color: values.color || '',
      status: values.status,
      synonyms,
      keywords,
    });
    onClose();
  };

  const addSynonym = () => {
    if (newSynonym.trim() && !synonyms.includes(newSynonym.trim())) {
      setSynonyms([...synonyms, newSynonym.trim()]);
      setNewSynonym('');
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingNode ? 'Editar Tag' : 'Nova Tag'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Varejo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Gerado automaticamente" 
                      {...field} 
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag Pai</FormLabel>
                  <Select 
                    value={field.value || 'none'} 
                    onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum (raiz)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (raiz)</SelectItem>
                      {parentOptions.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {'─'.repeat(node.level)} {node.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição da tag..." 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <FormControl>
                      <IconSelector
                        value={field.value}
                        onSelect={field.onChange}
                        placeholder="Selecionar..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="w-12 h-9 p-1 cursor-pointer"
                          {...field}
                        />
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="#3B82F6"
                          className="font-mono flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="approved">Ativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="deprecated">Obsoleto</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Synonyms */}
            <div>
              <FormLabel>Sinônimos</FormLabel>
              <div className="flex flex-wrap gap-1 mb-2 mt-1">
                {synonyms.map((s, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {s}
                    <button type="button" onClick={() => setSynonyms(synonyms.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSynonym}
                  onChange={(e) => setNewSynonym(e.target.value)}
                  placeholder="Adicionar sinônimo..."
                  className="h-8"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSynonym())}
                />
                <Button type="button" size="sm" variant="outline" onClick={addSynonym}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Keywords */}
            <div>
              <FormLabel>Palavras-chave</FormLabel>
              <div className="flex flex-wrap gap-1 mb-2 mt-1">
                {keywords.map((k, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {k}
                    <button type="button" onClick={() => setKeywords(keywords.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Adicionar palavra-chave..."
                  className="h-8"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" size="sm" variant="outline" onClick={addKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingNode ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
