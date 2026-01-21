import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Region colors (NOT magenta - reserved for hover)
const REGION_COLORS: Record<string, string> = {
  'N': 'hsl(160, 84%, 39%)',   // Norte - green
  'NE': 'hsl(38, 92%, 50%)',   // Nordeste - orange
  'SE': 'hsl(217, 91%, 60%)',  // Sudeste - blue
  'S': 'hsl(258, 90%, 66%)',   // Sul - purple
  'CO': 'hsl(0, 84%, 60%)',    // Centro-Oeste - red
};

const REGION_ORDER = ['N', 'NE', 'CO', 'SE', 'S'];

const REGION_NAMES: Record<string, string> = {
  'N': 'Norte',
  'NE': 'Nordeste',
  'CO': 'Centro-Oeste',
  'SE': 'Sudeste',
  'S': 'Sul',
};

// Hover color - magenta
const HOVER_COLOR = '#FF00FF';

// Mac Dock scale effect - calculate scale based on distance from hovered badge
const calculateBadgeScale = (
  currentSigla: string,
  hoveredSigla: string | null,
  allSiglas: string[]
): number => {
  if (!hoveredSigla) return 1;
  if (currentSigla === hoveredSigla) return 1.4;
  
  const currentIndex = allSiglas.indexOf(currentSigla);
  const hoveredIndex = allSiglas.indexOf(hoveredSigla);
  
  if (currentIndex === -1 || hoveredIndex === -1) return 1;
  
  const distance = Math.abs(currentIndex - hoveredIndex);
  
  if (distance === 1) return 1.2;
  if (distance === 2) return 1.1;
  return 1;
};

interface UfData {
  uf_sigla: string;
  uf_name: string;
  region_code: string;
}

interface RegionalStatesHeaderProps {
  availableStates: string[]; // UF siglas in the series
  allUfs: UfData[];
  hoveredState: string | null;
  onHover: (state: string | null) => void;
  onSelect: (state: string) => void;
}

export function RegionalStatesHeader({
  availableStates,
  allUfs,
  hoveredState,
  onHover,
  onSelect,
}: RegionalStatesHeaderProps) {
  // Group UFs by region
  const ufsByRegion = REGION_ORDER.reduce((acc, regionCode) => {
    acc[regionCode] = allUfs
      .filter((uf) => uf.region_code === regionCode)
      .sort((a, b) => a.uf_sigla.localeCompare(b.uf_sigla));
    return acc;
  }, {} as Record<string, UfData[]>);

  // Flat list of all siglas for Mac Dock scale calculation
  const flatSiglas = useMemo(() => 
    REGION_ORDER.flatMap(r => ufsByRegion[r]?.map(uf => uf.uf_sigla) || []),
    [ufsByRegion]
  );

  const isAvailable = (sigla: string) => availableStates.includes(sigla);
  const isHovered = (sigla: string) => hoveredState === sigla;

  const getBadgeStyle = (sigla: string, regionCode: string) => {
    if (isHovered(sigla)) {
      return {
        backgroundColor: HOVER_COLOR,
        color: 'white',
        borderColor: HOVER_COLOR,
      };
    }
    if (isAvailable(sigla)) {
      return {
        backgroundColor: REGION_COLORS[regionCode],
        color: 'white',
        borderColor: REGION_COLORS[regionCode],
      };
    }
    return {
      backgroundColor: 'hsl(var(--muted))',
      color: 'hsl(var(--muted-foreground))',
      borderColor: 'hsl(var(--border))',
    };
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-5 gap-2">
        {REGION_ORDER.map((regionCode) => (
          <div key={regionCode} className="flex flex-col gap-1">
            {regionCode === 'CO' ? (
              <div className="flex flex-col -mt-3" style={{ color: REGION_COLORS[regionCode] }}>
                <span className="text-[10px] font-semibold uppercase tracking-wide">Centro</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide -mt-0.5">Oeste</span>
              </div>
            ) : (
              <span
                className="text-[10px] font-semibold uppercase tracking-wide truncate"
                style={{ color: REGION_COLORS[regionCode] }}
              >
                {REGION_NAMES[regionCode]}
              </span>
            )}
            <div className="flex flex-wrap gap-0.5">
              {ufsByRegion[regionCode]?.map((uf) => {
                const available = isAvailable(uf.uf_sigla);
                return (
                  <Tooltip key={uf.uf_sigla}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1 py-0 h-5 transition-all duration-200 ease-out origin-center ${
                          available ? 'cursor-pointer' : 'cursor-default opacity-60'
                        }`}
                        style={{
                          ...getBadgeStyle(uf.uf_sigla, regionCode),
                          transform: `scale(${calculateBadgeScale(uf.uf_sigla, hoveredState, flatSiglas)})`,
                          zIndex: isHovered(uf.uf_sigla) ? 10 : 1,
                        }}
                        onMouseEnter={() => available && onHover(uf.uf_sigla)}
                        onMouseLeave={() => onHover(null)}
                        onClick={() => available && onSelect(uf.uf_sigla)}
                      >
                        {uf.uf_sigla}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {uf.uf_name}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
