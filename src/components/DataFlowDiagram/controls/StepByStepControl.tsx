import React from "react";
import { Button } from "@/components/ui/button";
import { Play, StepForward, Square } from "lucide-react";
import { zones } from "../data/diagramData";

interface StepByStepControlProps {
  currentStep: number;
  isAnimating: boolean;
  onStart: () => void;
  onNext: () => void;
  onStop: () => void;
}

export const StepByStepControl: React.FC<StepByStepControlProps> = ({
  currentStep,
  isAnimating,
  onStart,
  onNext,
  onStop,
}) => {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground font-medium">
        Step by Step:
      </span>
      
      {!isAnimating ? (
        <Button size="sm" variant="outline" onClick={onStart} className="text-xs">
          <Play className="w-3 h-3 mr-1" />
          Start
        </Button>
      ) : (
        <>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/30">
            <span className="text-xs font-medium text-primary">
              {currentStep >= 0 && currentStep < zones.length 
                ? zones[currentStep].label 
                : "Completed"}
            </span>
            <span className="text-xs text-muted-foreground">
              ({currentStep + 1}/{zones.length})
            </span>
          </div>
          
          <Button size="sm" variant="outline" onClick={onNext} className="text-xs">
            <StepForward className="w-3 h-3 mr-1" />
            Next
          </Button>
          
          <Button size="sm" variant="ghost" onClick={onStop} className="text-xs text-destructive">
            <Square className="w-3 h-3 mr-1" />
            Stop
          </Button>
        </>
      )}
    </div>
  );
};
