import React from "react";
import { DomainType, domainColors } from "../data/diagramData";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface FilterControlProps {
  activeFilters: DomainType[];
  onToggle: (domain: DomainType) => void;
  onReset: () => void;
}

const domains: { id: DomainType; label: string }[] = [
  { id: "transparency", label: "Transparency" },
  { id: "social", label: "Social" },
  { id: "health", label: "Health" },
  { id: "education", label: "Education" },
  { id: "finance", label: "Finance" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "climate", label: "Climate" },
  { id: "population", label: "Population" },
];

export const FilterControl: React.FC<FilterControlProps> = ({
  activeFilters,
  onToggle,
  onReset,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium mr-2">
        Filter by Domain:
      </span>
      {domains.map(domain => {
        const isActive = activeFilters.includes(domain.id);
        const colors = domainColors[domain.id];
        return (
          <button
            key={domain.id}
            onClick={() => onToggle(domain.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              isActive
                ? "text-white"
                : "text-white/60 bg-white/5 hover:bg-white/10"
            }`}
            style={{
              backgroundColor: isActive ? colors.bg : undefined,
              boxShadow: isActive ? `0 0 12px ${colors.border}40` : undefined,
            }}
          >
            {domain.label}
          </button>
        );
      })}
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="w-3 h-3 mr-1" />
        Clear
      </Button>
    </div>
  );
};
