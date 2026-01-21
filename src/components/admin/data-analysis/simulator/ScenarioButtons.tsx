import { Button } from "@/components/ui/button";
import { Bot, Smile, Frown, Meh } from "lucide-react";
import { cn } from "@/lib/utils";

type ScenarioType = "neutral" | "optimistic" | "pessimistic";

interface ScenarioButtonsProps {
  activeScenario: ScenarioType;
  onSelect: (scenario: ScenarioType) => void;
  isAnimating: boolean;
}

const SCENARIOS = [
  { 
    id: "optimistic" as const, 
    label: "Otimista", 
    emoji: "😊",
    icon: Smile,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500",
    description: "Crescimento econômico forte"
  },
  { 
    id: "neutral" as const, 
    label: "Neutro", 
    emoji: "😐",
    icon: Meh,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500",
    description: "Cenário base conservador"
  },
  { 
    id: "pessimistic" as const, 
    label: "Pessimista", 
    emoji: "😟",
    icon: Frown,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500",
    description: "Retração e inflação alta"
  },
];

export function ScenarioButtons({ activeScenario, onSelect, isAnimating }: ScenarioButtonsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Cenários Pré-definidos
        </h4>
        {isAnimating && (
          <div className="flex items-center gap-2 text-primary">
            <Bot className="h-4 w-4 animate-spin" />
            <span className="text-xs">Ajustando...</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {SCENARIOS.map(scenario => {
          const Icon = scenario.icon;
          const isActive = activeScenario === scenario.id;
          
          return (
            <Button
              key={scenario.id}
              variant="outline"
              onClick={() => onSelect(scenario.id)}
              disabled={isAnimating}
              className={cn(
                "h-auto py-3 flex flex-col items-center gap-1 transition-all duration-300",
                isActive && `${scenario.bgColor} ${scenario.borderColor} border-2`,
                !isActive && "hover:bg-muted"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive ? scenario.color : "text-muted-foreground")} />
              <span className={cn("text-sm font-medium", isActive && scenario.color)}>
                {scenario.label}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {scenario.description}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
