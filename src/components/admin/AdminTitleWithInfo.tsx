import { ReactNode, useState } from "react";
import { Lightbulb, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AdminTitleWithInfoProps {
  title: string;
  level: "h1" | "h2" | "h3";
  tooltipText: string;
  infoContent: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export const AdminTitleWithInfo = ({
  title,
  level,
  tooltipText,
  infoContent,
  icon: Icon,
  className
}: AdminTitleWithInfoProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const HeadingTag = level;
  
  const headingClasses = {
    h1: "text-3xl font-bold",
    h2: "text-2xl font-bold",
    h3: "text-lg font-semibold"
  };

  const iconSizes = {
    h1: "h-8 w-8",
    h2: "h-6 w-6",
    h3: "h-5 w-5"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Icon && <Icon className={cn(iconSizes[level], "text-primary flex-shrink-0")} />}
      
      <HeadingTag className={cn(headingClasses[level], "leading-none")}>
        {title}
      </HeadingTag>

      <TooltipProvider>
        <Tooltip>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <TooltipTrigger asChild>
                <button 
                  className="relative w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  aria-label={tooltipText}
                >
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <div className="absolute -top-1 -right-1 pointer-events-none">
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <div className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
                    </div>
                  </div>
                </button>
              </TooltipTrigger>
            </DialogTrigger>
            
            <TooltipContent side="right" sideOffset={5}>
              <p className="text-sm max-w-[250px]">{tooltipText}</p>
            </TooltipContent>

            <DialogContent 
              className="max-w-[900px] w-[95vw] max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-sm border-primary/20 shadow-2xl"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-2">Sobre esta seção</h4>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      {infoContent}
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};