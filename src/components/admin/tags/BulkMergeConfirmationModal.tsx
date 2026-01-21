import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, Merge, FileText, ArrowRight } from "lucide-react";
import type { ReasonType } from "@/lib/merge-reason-heuristics";

interface CandidateInfo {
  tag: { id: string; tag_name: string };
  similarity: number;
  reason: string;
  reasonType: ReasonType;
  documentCount: number;
}

interface BulkMergeConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  masterTagName: string;
  selectedCount: number;
  affectedDocuments: number;
  candidates: CandidateInfo[];
}

export const BulkMergeConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  isLoading,
  masterTagName,
  selectedCount,
  affectedDocuments,
  candidates,
}: BulkMergeConfirmationModalProps) => {
  // Get reason badge color
  const getReasonBadgeColor = (reasonType: ReasonType) => {
    switch (reasonType) {
      case 'similarity': return 'bg-blue-500/20 text-blue-400 border-blue-400/50';
      case 'case': return 'bg-amber-500/20 text-amber-400 border-amber-400/50';
      case 'typo': return 'bg-red-500/20 text-red-400 border-red-400/50';
      case 'plural': return 'bg-purple-500/20 text-purple-400 border-purple-400/50';
      case 'acronym': return 'bg-cyan-500/20 text-cyan-400 border-cyan-400/50';
      case 'language': return 'bg-emerald-500/20 text-emerald-400 border-emerald-400/50';
      case 'synonym': return 'bg-pink-500/20 text-pink-400 border-pink-400/50';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirmar Merge & Exclusão em Massa
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p className="text-muted-foreground">
                Você está prestes a excluir <strong className="text-foreground">{selectedCount}</strong> tags.
              </p>
              
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <p className="text-sm">
                  Essas tags foram marcadas porque são <strong>estatisticamente similares</strong> a:
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/20 text-green-400 border-green-400/50">
                    Tag Master
                  </Badge>
                  <span className="font-semibold text-foreground">{masterTagName}</span>
                </div>
              </div>

              {/* Impact Summary */}
              <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/5">
                <p className="font-medium text-amber-400 mb-2 flex items-center gap-2">
                  <Merge className="h-4 w-4" />
                  Impacto da Operação:
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <strong className="text-foreground">{affectedDocuments}</strong> documentos serão atualizados
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    <strong className="text-foreground">{selectedCount}</strong> tags redundantes serão removidas
                  </li>
                </ul>
              </div>

              {/* Candidates Preview */}
              {candidates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tags a serem removidas:</p>
                  <ScrollArea className="h-32 rounded-lg border border-muted/30 p-2">
                    <div className="space-y-2">
                      {candidates.map((candidate) => (
                        <div 
                          key={candidate.tag.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{candidate.tag.tag_name}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getReasonBadgeColor(candidate.reasonType)}`}
                          >
                            {candidate.reason}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Esta ação não pode ser desfeita. Todas as relações serão movidas para a tag master.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Merge className="h-4 w-4 mr-2" />
                Confirmar Mass Deletion
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
