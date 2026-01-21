import { memo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import type { BulkDeleteModalState, DeletionReasons } from "./types";

interface TagBulkDeleteModalProps {
  modalState: BulkDeleteModalState;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (key: keyof DeletionReasons, checked: boolean) => void;
  onConfirm: () => void;
}

export const TagBulkDeleteModal = memo(function TagBulkDeleteModal({
  modalState,
  onOpenChange,
  onReasonChange,
  onConfirm,
}: TagBulkDeleteModalProps) {
  const hasAnyReason = Object.values(modalState.reasons).some(v => v);

  return (
    <AlertDialog 
      open={modalState.open} 
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent className="max-w-lg max-h-[90vh]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir {modalState.tagNames.length} Tags em Lote
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {modalState.isLoadingCount ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Calculando documentos afetados...</span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-destructive text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {modalState.totalDocumentsAffected} documento(s) serão afetados
                    </p>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">Tags selecionadas:</p>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {modalState.tagNames.map((name, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-amber-200 text-sm font-medium mb-3">
                  ⚠️ Selecione o(s) motivo(s) da exclusão em lote:
                </p>
                
                <ScrollArea className="h-[280px] pr-3">
                  <div className="space-y-2">
                    <ReasonCheckbox
                      id="bulk-reason-generic"
                      checked={modalState.reasons.generic}
                      onCheckedChange={(checked) => onReasonChange('generic', checked)}
                      label="Termo genérico"
                      description="Stopwords que não agregam valor de predição"
                    />
                    
                    <ReasonCheckbox
                      id="bulk-reason-out-of-domain"
                      checked={modalState.reasons.outOfDomain}
                      onCheckedChange={(checked) => onReasonChange('outOfDomain', checked)}
                      label="Não se encaixa nas categorias"
                      description="Irrelevância de domínio (Out-of-domain)"
                    />
                    
                    <ReasonCheckbox
                      id="bulk-reason-proper-name"
                      checked={modalState.reasons.properName}
                      onCheckedChange={(checked) => onReasonChange('properName', checked)}
                      label="Nome próprio"
                      description="Alta cardinalidade - cria matriz esparsa"
                    />
                    
                    <ReasonCheckbox
                      id="bulk-reason-is-year"
                      checked={modalState.reasons.isYear}
                      onCheckedChange={(checked) => onReasonChange('isYear', checked)}
                      label="É um ano"
                      description="Dados temporais devem ser variáveis contínuas"
                    />
                    
                    <ReasonCheckbox
                      id="bulk-reason-is-phrase"
                      checked={modalState.reasons.isPhrase}
                      onCheckedChange={(checked) => onReasonChange('isPhrase', checked)}
                      label="É uma frase, não palavra-chave"
                      description="Ensina IA a detectar length excessivo"
                    />
                    
                    <ReasonCheckbox
                      id="bulk-reason-typo"
                      checked={modalState.reasons.typo}
                      onCheckedChange={(checked) => onReasonChange('typo', checked)}
                      label="Erro de digitação/grafia"
                      description="Sugere fuzzy matching para correções futuras"
                    />
                    
                    <ReasonCheckbox
                      id="bulk-reason-variation"
                      checked={modalState.reasons.variation}
                      onCheckedChange={(checked) => onReasonChange('variation', checked)}
                      label="Variação (Plural/Singular/Sinônimo)"
                      description="Ensina lemmatization - reduzir à raiz"
                    />
                    
                    <ReasonCheckbox
                      id="bulk-reason-isolated-verb"
                      checked={modalState.reasons.isolatedVerb}
                      onCheckedChange={(checked) => onReasonChange('isolatedVerb', checked)}
                      label="Verbo/Ação isolada"
                      description="Verbos soltos não classificam - precisam substantivo"
                    />
                    
                    <ReasonCheckbox
                      id="bulk-reason-pii"
                      checked={modalState.reasons.pii}
                      onCheckedChange={(checked) => onReasonChange('pii', checked)}
                      label="Dado sensível (PII)"
                      description="CPF, Telefone, E-mail - bloquear por segurança"
                      labelClassName="text-red-400"
                    />
                  </div>
                </ScrollArea>
              </div>
              
              {!hasAnyReason && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Escolha ao menos um motivo para excluir
                </p>
              )}
              
              <p className="text-xs text-muted-foreground">
                Esta ação é <strong>irreversível</strong> e será registrada no log de atividades para cada tag.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={modalState.isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!hasAnyReason || modalState.isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {modalState.isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir {modalState.tagNames.length} Tags
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

// Reusable checkbox component for deletion reasons
interface ReasonCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description: string;
  labelClassName?: string;
}

const ReasonCheckbox = memo(function ReasonCheckbox({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  labelClassName = "text-foreground",
}: ReasonCheckboxProps) {
  return (
    <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(checked) => onCheckedChange(checked === true)}
      />
      <label htmlFor={id} className="cursor-pointer flex-1">
        <span className={`font-medium text-sm ${labelClassName}`}>{label}</span>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </label>
    </div>
  );
});
