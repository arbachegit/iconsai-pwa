import { useState, useMemo, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Loader2, Tag, FileText, Trash2, AlertOctagon } from 'lucide-react';
import { TaxonomyNode } from './useTaxonomyData';

interface TaxonomyDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onHardDelete?: () => Promise<void>;
  node: TaxonomyNode | null;
  isDeleting?: boolean;
  isHardDeleting?: boolean;
}

export function TaxonomyDeleteModal({
  open,
  onClose,
  onConfirm,
  onHardDelete,
  node,
  isDeleting,
  isHardDeleting,
}: TaxonomyDeleteModalProps) {
  const [hardDeleteConfirmed, setHardDeleteConfirmed] = useState(false);

  // Reset confirmation when modal closes
  useEffect(() => {
    if (!open) {
      setHardDeleteConfirmed(false);
    }
  }, [open]);

  // Count all descendants
  const descendantCount = useMemo(() => {
    if (!node) return 0;
    const count = (n: TaxonomyNode): number => 
      n.children.length + n.children.reduce((acc, c) => acc + count(c), 0);
    return count(node);
  }, [node]);

  // Count all documents in subtree
  const totalDocuments = useMemo(() => {
    if (!node) return 0;
    const count = (n: TaxonomyNode): number => 
      n.documentCount + n.children.reduce((acc, c) => acc + count(c), 0);
    return count(node);
  }, [node]);

  const hasDescendants = descendantCount > 0;
  const hasDocuments = totalDocuments > 0;
  const hasDependencies = hasDescendants || hasDocuments;

  if (!node) return null;

  const handleSoftDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm();
    onClose();
  };

  const handleHardDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (onHardDelete) {
      await onHardDelete();
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir Tag
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Você está prestes a excluir a tag <strong>"{node.name}"</strong> ({node.code}).
              </p>

              {hasDependencies && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
                  <p className="font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Atenção: Esta tag possui dependências
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {hasDescendants && (
                      <Badge variant="outline" className="gap-1">
                        <Tag className="h-3 w-3" />
                        {descendantCount} tag{descendantCount > 1 ? 's' : ''} filha{descendantCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {hasDocuments && (
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        {totalDocuments} documento{totalDocuments > 1 ? 's' : ''} vinculado{totalDocuments > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Soft Delete explanation */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-1">
                <p className="font-medium text-amber-400 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Soft Delete (Recomendado)
                </p>
                <p className="text-xs text-muted-foreground">
                  Marca a tag como "deleted" mas mantém no banco de dados. Pode ser recuperada se necessário.
                  {hasDocuments && ' Os vínculos com documentos serão preservados.'}
                </p>
              </div>

              {/* Hard Delete option */}
              {onHardDelete && (
                <>
                  <Separator />
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-3">
                    <p className="font-medium text-red-400 flex items-center gap-2">
                      <AlertOctagon className="h-4 w-4" />
                      Hard Delete (Permanente)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Remove a tag PERMANENTEMENTE do banco de dados. Esta ação é IRREVERSÍVEL.
                      {hasDocuments && ' Todos os vínculos com documentos serão deletados.'}
                      {hasDescendants && ' As tags filhas ficarão órfãs.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="hard-delete-confirm"
                        checked={hardDeleteConfirmed}
                        onCheckedChange={(checked) => setHardDeleteConfirmed(!!checked)}
                      />
                      <Label 
                        htmlFor="hard-delete-confirm" 
                        className="text-xs text-muted-foreground cursor-pointer"
                      >
                        Entendo que esta ação é irreversível
                      </Label>
                    </div>
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isDeleting || isHardDeleting}>
            Cancelar
          </AlertDialogCancel>
          
          {/* Soft Delete Button */}
          <Button
            onClick={handleSoftDelete}
            disabled={isDeleting || isHardDeleting}
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Removendo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Soft Delete
              </>
            )}
          </Button>

          {/* Hard Delete Button */}
          {onHardDelete && (
            <Button
              onClick={handleHardDelete}
              disabled={!hardDeleteConfirmed || isDeleting || isHardDeleting}
              variant="destructive"
              className="gap-2"
            >
              {isHardDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <AlertOctagon className="h-4 w-4" />
                  Hard Delete
                </>
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
