import { Lightbulb } from "lucide-react";
import { useState } from "react";
import { DraggablePreviewPanel } from "./DraggablePreviewPanel";
import { Badge } from "@/components/ui/badge";

interface TooltipIconProps {
  sectionId: string;
}

export const TooltipIcon = ({ sectionId }: TooltipIconProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative ml-2 group"
        aria-label="Abrir informações"
      >
        {/* Badge com Lightbulb + "saiba mais" */}
        <Badge 
          variant="outline" 
          className="font-mono text-xs tracking-widest px-2.5 py-1 border-2 border-primary bg-primary/40 !text-white font-extrabold shadow-lg transition-all duration-300 group-hover:bg-cyan-500 group-hover:border-cyan-500 group-hover:text-white flex items-center gap-1.5"
        >
          <Lightbulb className="w-3.5 h-3.5 transition-all duration-300 group-hover:rotate-12" />
          saiba mais
        </Badge>
        
        {/* Bolinha verde pulsante - posicionada externamente tangenciando o badge */}
        <div className="absolute -top-1 -right-1 z-20">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
          </div>
        </div>
      </button>

      {isOpen && (
        <DraggablePreviewPanel
          sectionId={sectionId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
