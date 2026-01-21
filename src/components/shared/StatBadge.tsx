import { useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, X } from "lucide-react";

interface StatBadgeProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  infoTitle?: string;
  infoContent?: React.ReactNode;
  onInfoClick?: () => void;
  className?: string;
}

export function StatBadge({
  label,
  value,
  unit,
  trend,
  infoTitle,
  infoContent,
  onInfoClick,
  className,
}: StatBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  const handleInfoClick = () => {
    if (onInfoClick) {
      onInfoClick();
    } else if (infoContent) {
      setShowModal(true);
    }
  };

  const hasInfoAction = infoContent || onInfoClick;

  return (
    <>
      <div
        className={cn(
          "relative px-4 py-3 rounded-lg",
          "border border-cyan-500/30 bg-[#0A0A0F]",
          "transition-all duration-200",
          "hover:bg-cyan-500/5 hover:border-cyan-500/50",
          className
        )}
      >
        {/* Info Button - 22px, border-2, hover laranja */}
        {hasInfoAction && (
          <button
            onClick={handleInfoClick}
            className={cn(
              "absolute top-2 right-2",
              "w-[22px] h-[22px] rounded-full",
              "border-2 border-white/50",
              "bg-transparent",
              "flex items-center justify-center",
              "text-xs font-bold text-white/70",
              "transition-all duration-200",
              "hover:bg-orange-500 hover:border-orange-500 hover:text-white",
              "focus:outline-none focus:ring-2 focus:ring-orange-500/50",
              "cursor-pointer"
            )}
            title={`Sobre ${label}`}
          >
            i
          </button>
        )}

        {/* Label */}
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </span>

        {/* Value and Trend */}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-bold text-lg text-white">
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            {unit && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {unit}
              </span>
            )}
          </span>

          {trend && (
            <span
              className={cn(
                "flex items-center",
                trend === "up" && "text-green-500",
                trend === "down" && "text-red-500",
                trend === "stable" && "text-yellow-500"
              )}
            >
              {trend === "up" && <TrendingUp className="h-4 w-4" />}
              {trend === "down" && <TrendingDown className="h-4 w-4" />}
              {trend === "stable" && <Minus className="h-4 w-4" />}
            </span>
          )}
        </div>
      </div>

      {/* Modal de Informação - z-[100] */}
      {showModal && infoContent && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[100]"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
            <div 
              className={cn(
                "relative",
                "w-full max-w-md",
                "bg-[#0D0D12]",
                "border border-cyan-500/30",
                "rounded-xl",
                "shadow-2xl shadow-cyan-500/20",
                "p-6"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowModal(false)}
                className={cn(
                  "absolute top-4 right-4",
                  "w-8 h-8",
                  "rounded-full",
                  "border border-cyan-500/30",
                  "flex items-center justify-center",
                  "hover:bg-cyan-500/10 hover:border-cyan-500/50",
                  "transition-all duration-200"
                )}
              >
                <X className="h-4 w-4 text-white" />
              </button>

              <h3 className="text-lg font-semibold text-white mb-4 pr-8">
                {infoTitle || label}
              </h3>

              <div className="text-sm text-muted-foreground leading-relaxed">
                {infoContent}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default StatBadge;
