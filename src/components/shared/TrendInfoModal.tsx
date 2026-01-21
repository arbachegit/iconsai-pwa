import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendInfoModalProps {
  open: boolean;
  onClose: () => void;
}

export function TrendInfoModal({ open, onClose }: TrendInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Análise de Tendência</h3>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className={cn(
              "h-8 w-8 rounded-full",
              "border border-primary/50",
              "flex items-center justify-center",
              "text-muted-foreground",
              "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive",
              "transition-all"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm text-muted-foreground">
          <p>
            Este modelo estima a <strong className="text-foreground">tendência "de fundo"</strong> de 
            uma série histórica (como PIB, dólar ou índices) separando o que é{" "}
            <strong className="text-foreground">movimento estrutural</strong> do que é{" "}
            <strong className="text-foreground">ruído de curto prazo</strong>.
          </p>
          
          <p>
            Em vez de desenhar uma única reta fixa, ele permite que a tendência{" "}
            <strong className="text-foreground">mude aos poucos ao longo do tempo</strong>, 
            acompanhando fases de crescimento, estagnação ou queda.
          </p>
          
          <p>
            Ele também gera <strong className="text-foreground">previsões para datas futuras</strong> com 
            uma faixa de incerteza, mostrando não só "para onde vai", mas também 
            "o quão provável" é cada cenário.
          </p>
          
          <p>
            Isso é útil quando a série é influenciada por fatores externos 
            (economia e política), porque a estimativa se adapta conforme novos 
            dados entram, sem depender de você mapear todos os eventos desde o início.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            <strong>Modelo:</strong> State-Space / Structural Time Series com tendência estocástica
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TrendInfoModal;
