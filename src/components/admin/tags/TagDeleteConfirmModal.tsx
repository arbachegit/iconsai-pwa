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
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import type { DeleteConfirmModalState, DeletionReasons } from "./types";

interface TagDeleteConfirmModalProps {
  modalState: DeleteConfirmModalState;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (key: keyof DeletionReasons, checked: boolean) => void;
  onScopeChange: (scope: 'single' | 'all') => void;
  onConfirm: () => void;
}

export const TagDeleteConfirmModal = memo(function TagDeleteConfirmModal({
  modalState,
  onOpenChange,
  onReasonChange,
  onScopeChange,
  onConfirm,
}: TagDeleteConfirmModalProps) {
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
            Confirmar Exclusão de Tag
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {modalState.isLoadingCount ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Calculando documentos afetados...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p>
                    Você está prestes a excluir a tag "<strong>{modalState.tagName}</strong>".
                  </p>
                  
                  {modalState.totalInstances > 1 && (
                    <div className="p-3 bg-muted/50 border border-border rounded-lg">
                      <p className="text-sm font-medium mb-2">Escolha o escopo da exclusão:</p>
                      <div className="space-y-2">
                        {modalState.documentId && (
                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            modalState.deleteScope === 'single' 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:bg-muted/30'
                          }`}>
                            <input 
                              type="radio" 
                              name="deleteScope" 
                              value="single"
                              checked={modalState.deleteScope === 'single'}
                              onChange={() => onScopeChange('single')}
                              className="mt-0.5"
                            />
                            <div>
                              <span className="font-medium text-sm text-foreground">Apenas deste documento</span>
                              <p className="text-xs text-muted-foreground">
                                Remove "{modalState.tagName}" apenas de "{modalState.documentFilename || 'documento selecionado'}"
                              </p>
                            </div>
                          </label>
                        )}
                        
                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          modalState.deleteScope === 'all' 
                            ? 'border-destructive bg-destructive/10' 
                            : 'border-destructive/50 hover:bg-destructive/5'
                        }`}>
                          <input 
                            type="radio" 
                            name="deleteScope" 
                            value="all"
                            checked={modalState.deleteScope === 'all'}
                            onChange={() => onScopeChange('all')}
                            className="mt-0.5"
                          />
                          <div>
                            <span className="font-medium text-sm text-destructive">Todas as {modalState.totalInstances} ocorrências</span>
                            <p className="text-xs text-muted-foreground">
                              Remove "{modalState.tagName}" de TODOS os documentos
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {modalState.deleteScope === 'all' && modalState.totalInstances > 1 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <p className="text-destructive text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Esta tag será removida de {modalState.totalInstances} documento(s)
                      </p>
                    </div>
                  )}
                  
                  {modalState.tagType === 'parent' && modalState.deleteScope === 'all' && (
                    <p className="text-xs text-muted-foreground">
                      Tags filhas associadas serão movidas para a Zona de Órfãos.
                    </p>
                  )}
                </div>
              )}
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-amber-200 text-sm font-medium mb-3">
                  ⚠️ Para confirmar a exclusão, selecione pelo menos um motivo:
                </p>
                
                <ScrollArea className="h-[320px] pr-3">
                  <div className="space-y-2">
                    <ReasonCheckbox
                      id="reason-generic"
                      checked={modalState.reasons.generic}
                      onCheckedChange={(checked) => onReasonChange('generic', checked)}
                      label="Termo genérico"
                      description="Stopwords que não agregam valor de predição"
                    />
                    
                    <ReasonCheckbox
                      id="reason-out-of-domain"
                      checked={modalState.reasons.outOfDomain}
                      onCheckedChange={(checked) => onReasonChange('outOfDomain', checked)}
                      label="Não se encaixa nas categorias"
                      description="Irrelevância de domínio (Out-of-domain)"
                    />
                    
                    <ReasonCheckbox
                      id="reason-proper-name"
                      checked={modalState.reasons.properName}
                      onCheckedChange={(checked) => onReasonChange('properName', checked)}
                      label="Nome próprio"
                      description="Alta cardinalidade - cria matriz esparsa"
                    />
                    
                    <ReasonCheckbox
                      id="reason-is-year"
                      checked={modalState.reasons.isYear}
                      onCheckedChange={(checked) => onReasonChange('isYear', checked)}
                      label="É um ano"
                      description="Dados temporais devem ser variáveis contínuas"
                    />
                    
                    <ReasonCheckbox
                      id="reason-is-phrase"
                      checked={modalState.reasons.isPhrase}
                      onCheckedChange={(checked) => onReasonChange('isPhrase', checked)}
                      label="É uma frase, não palavra-chave"
                      description="Ensina IA a detectar length excessivo"
                    />
                    
                    <ReasonCheckbox
                      id="reason-typo"
                      checked={modalState.reasons.typo}
                      onCheckedChange={(checked) => onReasonChange('typo', checked)}
                      label="Erro de digitação/grafia"
                      description="Sugere fuzzy matching para correções futuras"
                    />
                    
                    <ReasonCheckbox
                      id="reason-variation"
                      checked={modalState.reasons.variation}
                      onCheckedChange={(checked) => onReasonChange('variation', checked)}
                      label="Variação (Plural/Singular/Sinônimo)"
                      description="Ensina lemmatization - reduzir à raiz"
                    />
                    
                    <ReasonCheckbox
                      id="reason-isolated-verb"
                      checked={modalState.reasons.isolatedVerb}
                      onCheckedChange={(checked) => onReasonChange('isolatedVerb', checked)}
                      label="Verbo/Ação isolada"
                      description="Verbos soltos não classificam - precisam substantivo"
                    />
                    
                    <ReasonCheckbox
                      id="reason-pii"
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
                Esta ação é <strong>irreversível</strong> e será registrada no log de atividades.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!hasAnyReason}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Tag
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
