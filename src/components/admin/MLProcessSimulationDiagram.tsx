import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Brain, 
  Tags, 
  UserCheck, 
  Database, 
  BarChart3,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  XCircle,
  GitMerge
} from "lucide-react";

interface MLProcessSimulationDiagramProps {
  activityLevel?: number;
}

type ProcessStep = 
  | "upload" 
  | "extraction" 
  | "suggestion" 
  | "review" 
  | "learning" 
  | "metrics";

interface StepConfig {
  id: ProcessStep;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const STEPS: StepConfig[] = [
  { 
    id: "upload", 
    label: "Upload", 
    icon: <FileText className="w-4 h-4" />,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/50"
  },
  { 
    id: "extraction", 
    label: "Extração IA", 
    icon: <Brain className="w-4 h-4" />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/50"
  },
  { 
    id: "suggestion", 
    label: "Tags Sugeridas", 
    icon: <Tags className="w-4 h-4" />,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    borderColor: "border-cyan-500/50"
  },
  { 
    id: "review", 
    label: "Revisão Admin", 
    icon: <UserCheck className="w-4 h-4" />,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/50"
  },
  { 
    id: "learning", 
    label: "Aprendizado ML", 
    icon: <Database className="w-4 h-4" />,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    borderColor: "border-pink-500/50"
  },
  { 
    id: "metrics", 
    label: "Métricas", 
    icon: <BarChart3 className="w-4 h-4" />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/50"
  },
];

export const MLProcessSimulationDiagram = ({ activityLevel = 0.5 }: MLProcessSimulationDiagramProps) => {
  const [currentStep, setCurrentStep] = useState<ProcessStep>("upload");
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightedButtonIndex, setHighlightedButtonIndex] = useState<number | null>(null);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const goToStep = (step: ProcessStep) => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(step);
      setIsAnimating(false);
    }, 150);
  };

  const nextStep = () => {
    const nextIndex = (currentStepIndex + 1) % STEPS.length;
    
    // Animate button highlight sequence
    const animateButtons = async () => {
      for (let i = 0; i <= nextIndex; i++) {
        setHighlightedButtonIndex(i);
        await new Promise(resolve => setTimeout(resolve, 120));
      }
      setHighlightedButtonIndex(null);
      goToStep(STEPS[nextIndex].id);
    };
    
    animateButtons();
  };

  const resetSimulation = () => {
    setHighlightedButtonIndex(0);
    setTimeout(() => {
      setHighlightedButtonIndex(null);
      goToStep("upload");
    }, 150);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "upload":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40">
                <FileText className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-400">1. Upload de Documento</h4>
                <p className="text-xs text-muted-foreground">Documento novo entra no sistema RAG</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-muted-foreground">Arquivo detectado:</span>
                <code className="text-amber-300 text-xs px-2 py-0.5 bg-amber-500/10 rounded">relatorio_financeiro.pdf</code>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>O sistema inicia o processamento:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Extração de texto via OCR/Parser</li>
                  <li>Chunking do conteúdo</li>
                  <li>Geração de embeddings</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case "extraction":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
                <Brain className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-semibold text-emerald-400">2. Extração por IA</h4>
                <p className="text-xs text-muted-foreground">NLP analisa o conteúdo e consulta regras</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-muted-foreground">Edge Function:</span>
                <code className="text-emerald-300 text-xs px-2 py-0.5 bg-emerald-500/10 rounded">suggest-document-tags</code>
              </div>
              
              <div className="text-xs space-y-2">
                <p className="text-muted-foreground">Processo de extração:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-emerald-300 font-medium">NLP Analysis</span>
                    <p className="text-muted-foreground text-[10px]">Identifica termos-chave</p>
                  </div>
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-emerald-300 font-medium">Merge Rules</span>
                    <p className="text-muted-foreground text-[10px]">Aplica regras aprendidas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "suggestion":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40">
                <Tags className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h4 className="font-semibold text-cyan-400">3. Tags Sugeridas</h4>
                <p className="text-xs text-muted-foreground">Hierarquia Parent/Child gerada</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border border-cyan-500/30 space-y-3">
              <p className="text-xs text-muted-foreground">Tags identificadas com hierarquia:</p>
              
              <div className="space-y-2">
                <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-300 font-medium text-sm">Parent: Finanças</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">85% conf.</span>
                  </div>
                  <div className="ml-4 mt-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <ChevronRight className="w-3 h-3 text-cyan-400/60" />
                      <span className="text-muted-foreground">Child: Contabilidade</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <ChevronRight className="w-3 h-3 text-cyan-400/60" />
                      <span className="text-muted-foreground">Child: Balanço Patrimonial</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/40">
                <UserCheck className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-purple-400">4. Revisão do Admin</h4>
                <p className="text-xs text-muted-foreground">Cientista de dados valida sugestões</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border border-purple-500/30 space-y-3">
              <p className="text-xs text-muted-foreground">Ações disponíveis para o Admin:</p>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-emerald-300 text-xs font-medium">Aceitar</span>
                    <p className="text-[10px] text-muted-foreground">Tag correta</p>
                  </div>
                </div>
                <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30 flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-blue-300 text-xs font-medium">Corrigir</span>
                    <p className="text-[10px] text-muted-foreground">Ajustar nome</p>
                  </div>
                </div>
                <div className="p-2 rounded bg-pink-500/10 border border-pink-500/30 flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-pink-400" />
                  <div>
                    <span className="text-pink-300 text-xs font-medium">Unificar</span>
                    <p className="text-[10px] text-muted-foreground">Merge com existente</p>
                  </div>
                </div>
                <div className="p-2 rounded bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <div>
                    <span className="text-red-300 text-xs font-medium">Rejeitar</span>
                    <p className="text-[10px] text-muted-foreground">Tag inválida</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "learning":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-pink-500/20 border border-pink-500/40">
                <Database className="w-8 h-8 text-pink-400" />
              </div>
              <div>
                <h4 className="font-semibold text-pink-400">5. Aprendizado ML</h4>
                <p className="text-xs text-muted-foreground">Decisões alimentam o banco de regras</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border border-pink-500/30 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Tabela:</span>
                <code className="text-pink-300 text-xs px-2 py-0.5 bg-pink-500/10 rounded">tag_merge_rules</code>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300">Se Aceita:</span>
                  </div>
                  <p className="text-muted-foreground ml-5 text-[10px]">
                    Regra positiva salva - próximos docs usam padrão
                  </p>
                </div>
                
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3 h-3 text-red-400" />
                    <span className="text-red-300">Se Rejeitada:</span>
                  </div>
                  <p className="text-muted-foreground ml-5 text-[10px]">
                    Regra negativa - evita sugerir termo similar
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "metrics":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/40">
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-400">6. Métricas Atualizadas</h4>
                <p className="text-xs text-muted-foreground">Dashboard reflete aprendizado</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border border-blue-500/30 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-300 font-bold text-lg">TP</span>
                  <p className="text-[10px] text-muted-foreground">Acertos</p>
                  <p className="text-[9px] text-muted-foreground/70">True Positives</p>
                </div>
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                  <span className="text-red-300 font-bold text-lg">FP</span>
                  <p className="text-[10px] text-muted-foreground">Erros</p>
                  <p className="text-[9px] text-muted-foreground/70">False Positives</p>
                </div>
                <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                  <span className="text-blue-300 font-bold text-lg">%</span>
                  <p className="text-[10px] text-muted-foreground">Taxa</p>
                  <p className="text-[9px] text-muted-foreground/70">Learning Rate</p>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-blue-300">Fórmula de aprendizado:</p>
                <code className="text-[10px] bg-blue-500/10 px-2 py-1 rounded block mt-1">
                  Score = Acertos / (Acertos + Erros) x 100
                </code>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <RotateCcw className="w-3 h-3 text-pink-400" />
                <span className="text-pink-300">Ciclo reinicia com próximo documento</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="text-sm font-bold text-center text-primary flex items-center justify-center gap-2">
        Simulação do Ciclo ML
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
          Passo a Passo
        </span>
      </div>

      {/* Step Buttons */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {STEPS.map((step, index) => {
          const isHighlighted = highlightedButtonIndex === index;
          const isActive = currentStep === step.id;
          
          return (
            <Button
              key={step.id}
              variant="ghost"
              size="sm"
              onClick={() => goToStep(step.id)}
              className={`
                h-8 px-2 text-xs gap-1.5 transition-all duration-150
                ${isActive 
                  ? `${step.bgColor} ${step.color} ${step.borderColor} border` 
                  : isHighlighted
                    ? `${step.bgColor} ${step.color} ${step.borderColor} border scale-110 shadow-lg`
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <span className={`
                w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-150
                ${isActive || isHighlighted ? step.bgColor : "bg-muted"}
              `}>
                {index + 1}
              </span>
              {step.icon}
              <span className="hidden sm:inline">{step.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, index) => (
          <div 
            key={step.id}
            className={`
              h-1 flex-1 rounded-full transition-all duration-300
              ${index <= currentStepIndex 
                ? `bg-gradient-to-r ${
                    step.id === "upload" ? "from-amber-500 to-amber-400" :
                    step.id === "extraction" ? "from-emerald-500 to-emerald-400" :
                    step.id === "suggestion" ? "from-cyan-500 to-cyan-400" :
                    step.id === "review" ? "from-purple-500 to-purple-400" :
                    step.id === "learning" ? "from-pink-500 to-pink-400" :
                    "from-blue-500 to-blue-400"
                  }`
                : "bg-muted"
              }
            `}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className={`
        transition-all duration-150
        ${isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}
      `}>
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetSimulation}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reiniciar
        </Button>
        
        <div className="text-xs text-muted-foreground">
          Etapa {currentStepIndex + 1} de {STEPS.length}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={nextStep}
          className="text-xs text-primary hover:text-primary"
        >
          {currentStepIndex === STEPS.length - 1 ? "Reiniciar" : "Próximo"}
          <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
};
