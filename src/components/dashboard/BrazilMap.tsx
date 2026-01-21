import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface BrazilMapProps {
  hoveredState: string | null;
  selectedState: string | null;
  onHover: (state: string | null) => void;
  onSelect: (state: string) => void;
  disabled?: boolean;
  availableStates?: string[];
}

const HOVER_COLOR = '#FF00FF'; // Magenta for hover

interface GeoFeature {
  type: string;
  properties: {
    sigla: string;
    name: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][][];
  };
}

interface GeoJSON {
  type: string;
  features: GeoFeature[];
}

// Multiple fallback URLs for GeoJSON
const GEOJSON_URLS = [
  "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson",
  "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF"
];

// Convert GeoJSON coordinates to SVG path
function coordinatesToPath(coordinates: number[][][][], scale: number, offsetX: number, offsetY: number): string {
  let path = "";
  
  coordinates.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach((point, i) => {
        const x = (point[0] + 75) * scale + offsetX;
        const y = (-point[1] + 5) * scale + offsetY;
        path += i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `;
      });
      path += "Z ";
    });
  });
  
  return path;
}

// Try fetching from multiple URLs with timeout
async function fetchWithFallback(urls: string[], timeout = 5000): Promise<GeoJSON | null> {
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Handle IBGE format (nested structure)
        if (data.objects?.BR_UF_2022?.geometries) {
          // IBGE TopoJSON needs conversion - skip for now
          continue;
        }
        return data;
      }
    } catch (err) {
      logger.warn(`Failed to fetch from ${url}:`, err);
    }
  }
  return null;
}

export function BrazilMap({ 
  hoveredState, 
  selectedState, 
  onHover, 
  onSelect,
  disabled = false,
  availableStates = [],
}: BrazilMapProps) {
  const [geoData, setGeoData] = useState<GeoJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchWithFallback(GEOJSON_URLS)
      .then((data) => {
        if (data) {
          setGeoData(data);
        } else {
          setError("Não foi possível carregar os dados do mapa. Verifique sua conexão.");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading Brazil GeoJSON:", err);
        setError("Erro ao processar dados do mapa.");
        setLoading(false);
      });
  }, []);

  const paths = useMemo(() => {
    if (!geoData) return [];
    
    const scale = 12;
    const offsetX = 50;
    const offsetY = 100;
    
    return geoData.features.map((feature) => ({
      sigla: feature.properties.sigla,
      name: feature.properties.name,
      path: coordinatesToPath(
        feature.geometry.type === "MultiPolygon" 
          ? feature.geometry.coordinates 
          : [feature.geometry.coordinates] as unknown as number[][][][],
        scale,
        offsetX,
        offsetY
      ),
    }));
  }, [geoData]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 30,
    });
  };

  if (loading) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!geoData || error) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground gap-2">
        <span>Erro ao carregar mapa</span>
        {error && <span className="text-xs text-destructive">{error}</span>}
        <button 
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchWithFallback(GEOJSON_URLS).then((data) => {
              if (data) setGeoData(data);
              else setError("Falha ao reconectar.");
              setLoading(false);
            });
          }}
          className="text-sm text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const hasAvailableStates = availableStates.length > 0;
  const isStateAvailable = (sigla: string) => !hasAvailableStates || availableStates.includes(sigla);

  return (
    <div className={cn("relative", disabled && "opacity-50 pointer-events-none")} onMouseMove={handleMouseMove}>
      <svg
        viewBox="0 0 600 600"
        className="w-full h-auto max-h-[660px]"
        style={{ background: "transparent" }}
      >
        {paths.map((state) => {
          const isHovered = hoveredState === state.sigla;
          const isSelected = selectedState === state.sigla;
          const isAvailable = isStateAvailable(state.sigla);
          
          // Determine styles based on availability and state
          const getStroke = () => {
            if (isHovered || isSelected) return HOVER_COLOR;
            if (!isAvailable) return "hsl(var(--muted-foreground) / 0.3)";
            return "#00FFFF";
          };
          
          const getFill = () => {
            if (isHovered || isSelected) return "rgba(255, 0, 255, 0.3)";
            return "transparent";
          };
          
          return (
            <path
              key={state.sigla}
              d={state.path}
              className={cn(
                "transition-all duration-300",
                isAvailable ? "cursor-pointer" : "cursor-default",
                (isHovered || isSelected) && isAvailable
                  ? "drop-shadow-[0_0_8px_rgba(255,0,255,0.6)]"
                  : ""
              )}
              style={{
                fill: getFill(),
                stroke: getStroke(),
                strokeWidth: isHovered || isSelected ? 2 : 1.5,
                opacity: isAvailable ? 1 : 0.4,
              }}
              onMouseEnter={() => isAvailable && onHover(state.sigla)}
              onMouseLeave={() => onHover(null)}
              onClick={() => isAvailable && onSelect(state.sigla)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredState && (
        <div
          className="absolute bg-white backdrop-blur-sm border border-gray-300 text-black px-3 py-1.5 rounded-md text-sm font-bold pointer-events-none z-10 shadow-lg"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
          }}
        >
          {paths.find((p) => p.sigla === hoveredState)?.name || hoveredState}
        </div>
      )}
    </div>
  );
}
