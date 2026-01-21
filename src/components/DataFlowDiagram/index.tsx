import React, { useMemo, useCallback, useRef } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { SourceNode } from "./elements/SourceNode";
import { IndicatorNode } from "./elements/IndicatorNode";
import { KnowledgeNode } from "./elements/KnowledgeNode";
import { DeliveryNode } from "./elements/DeliveryNode";
import { FlowConnector } from "./elements/FlowConnector";
import { ZoneLabel } from "./elements/ZoneLabel";
import { FilterControl } from "./controls/FilterControl";
import { StepByStepControl } from "./controls/StepByStepControl";
import { useDiagramState, DiagramElement } from "./hooks/useDiagramState";
import { DomainType } from "./data/diagramData";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useVoiceNarration } from "@/hooks/useVoiceNarration";
export const DataFlowDiagram: React.FC = () => {
  const {
    state,
    setHoveredElement,
    setSelectedElement,
    toggleFilter,
    resetFilters,
    startStepByStep,
    nextStep,
    stopStepByStep,
    filteredSources,
    highlightedZones,
    connectedElements,
    zones,
    municipalIndicators,
    knowledgeItems,
    deliveryPanels,
    mainConnections
  } = useDiagramState();
  
  // Voice narration hook
  const { isLoading: isNarrationLoading, isPlaying: isNarrationPlaying, play: playNarration, stop: stopNarration } = useVoiceNarration("govsystem");
  const containerRef = useRef<HTMLDivElement>(null);
  const svgDimensions = {
    width: 1600,
    height: 700
  };
  const handleElementClick = useCallback((element: DiagramElement) => {
    setSelectedElement(element);
  }, [setSelectedElement]);
  const handleElementHover = useCallback((element: DiagramElement | null) => {
    setHoveredElement(element);
  }, [setHoveredElement]);
  const zoneWidth = svgDimensions.width / 5;
  const contentStartY = 80;
  const sourcePositions = useMemo(() => {
    const spacing = (svgDimensions.height - contentStartY - 60) / Math.max(filteredSources.length, 1);
    return filteredSources.map((source, index) => ({
      id: source.id,
      x: zoneWidth * 0.5,
      y: contentStartY + spacing * index + spacing / 2
    }));
  }, [filteredSources, zoneWidth, svgDimensions.height]);
  const indicatorPositions = useMemo(() => {
    const spacing = (svgDimensions.height - contentStartY - 60) / Math.max(municipalIndicators.length, 1);
    return municipalIndicators.map((indicator, index) => ({
      id: indicator.id,
      x: zoneWidth * 2.5,
      y: contentStartY + spacing * index + spacing / 2
    }));
  }, [municipalIndicators, zoneWidth, svgDimensions.height]);
  const knowledgePositions = useMemo(() => {
    const spacing = (svgDimensions.height - contentStartY - 60) / Math.max(knowledgeItems.length, 1);
    return knowledgeItems.map((item, index) => ({
      id: item.id,
      x: zoneWidth * 3.5,
      y: contentStartY + spacing * index + spacing / 2
    }));
  }, [knowledgeItems, zoneWidth, svgDimensions.height]);
  const deliveryPositions = useMemo(() => {
    const spacing = (svgDimensions.height - contentStartY - 60) / Math.max(deliveryPanels.length, 1);
    return deliveryPanels.map((panel, index) => ({
      id: panel.id,
      x: zoneWidth * 4.5,
      y: contentStartY + spacing * index + spacing / 2
    }));
  }, [deliveryPanels, zoneWidth, svgDimensions.height]);
  const getPosition = useCallback((id: string) => {
    return sourcePositions.find(p => p.id === id) || indicatorPositions.find(p => p.id === id) || knowledgePositions.find(p => p.id === id) || deliveryPositions.find(p => p.id === id);
  }, [sourcePositions, indicatorPositions, knowledgePositions, deliveryPositions]);
  const visibleConnections = useMemo(() => {
    const visibleSourceIds = new Set(filteredSources.map(s => s.id));
    return mainConnections.filter(conn => {
      const fromSource = visibleSourceIds.has(conn.from);
      const isLaterStage = conn.from.startsWith("ind-") || conn.from.startsWith("know-");
      return fromSource || isLaterStage;
    });
  }, [filteredSources, mainConnections]);
  return <TooltipProvider>
    <div ref={containerRef} className="w-full space-y-4">
      {/* Header with Schedule */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Gov System AI</h2>
            <p className="text-sm text-muted-foreground">Data Flow Visualization</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Voice Narration Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => isNarrationPlaying ? stopNarration() : playNarration()}
                  disabled={isNarrationLoading}
                  className="h-8 w-8"
                >
                  {isNarrationLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isNarrationPlaying ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isNarrationLoading ? "Carregando..." : isNarrationPlaying ? "Parar narração" : "Ouvir narração"}
              </TooltipContent>
            </Tooltip>
            
            <span className="text-sm text-muted-foreground">Schedule: January 23, 2026</span>
            <div className="flex items-center gap-2">
              <Progress value={40} className="w-24 h-2" />
              <span className="text-xs text-muted-foreground">40%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card/50 border border-border rounded-xl p-4">
        <FilterControl activeFilters={state.activeFilters} onToggle={toggleFilter as (domain: DomainType) => void} onReset={resetFilters} />
        <StepByStepControl currentStep={state.currentStep} isAnimating={state.isAnimating} onStart={startStepByStep} onNext={nextStep} onStop={stopStepByStep} />
      </div>

      {/* SVG Diagram */}
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <svg width="100%" height={svgDimensions.height} viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`} preserveAspectRatio="xMidYMid meet" className="min-w-[1200px]" onClick={() => state.selectedElement && setSelectedElement(null)}>
          <defs>
            <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#0891b2" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
            </linearGradient>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.3" opacity="0.1" />
            </pattern>
          </defs>
          
          <rect width={svgDimensions.width} height={svgDimensions.height} fill="url(#bg-gradient)" />
          <rect width={svgDimensions.width} height={svgDimensions.height} fill="url(#grid)" />

          {/* Zone dividers */}
          {[1, 2, 3, 4].map(i => <line key={i} x1={zoneWidth * i} y1={60} x2={zoneWidth * i} y2={svgDimensions.height - 20} stroke="white" strokeWidth="1" opacity="0.1" strokeDasharray="4 4" />)}

          {/* Zone labels */}
          {zones.map((zone, index) => {
          const x = index * zoneWidth + zoneWidth / 2;
          const isHighlighted = highlightedZones.includes(zone.id);
          return <ZoneLabel key={zone.id} zone={zone.id} label={zone.label} x={x} y={40} isHighlighted={isHighlighted} />;
        })}

          {/* Connections */}
          {visibleConnections.map(conn => {
          const from = getPosition(conn.from);
          const to = getPosition(conn.to);
          if (!from || !to) return null;
          const isActive = state.hoveredElement?.id === conn.from || state.hoveredElement?.id === conn.to || connectedElements.has(conn.from) || connectedElements.has(conn.to);
          const fromZone = conn.from.startsWith("ind-") ? "indicators" : conn.from.startsWith("know-") ? "knowledge" : "sources";
          const toZone = conn.to.startsWith("ind-") ? "indicators" : conn.to.startsWith("know-") ? "knowledge" : conn.to.startsWith("painel-") ? "delivery" : "content";
          const isHighlighted = highlightedZones.includes(fromZone) && highlightedZones.includes(toZone);
          return <FlowConnector key={`${conn.from}-${conn.to}`} fromX={from.x + 70} fromY={from.y} toX={to.x - 80} toY={to.y} isHighlighted={isHighlighted} isActive={isActive} />;
        })}

          {/* Source nodes */}
          {filteredSources.map(source => {
          const pos = sourcePositions.find(p => p.id === source.id);
          if (!pos) return null;
          const isHighlighted = highlightedZones.includes("sources");
          const isConnected = connectedElements.has(source.id) || state.hoveredElement?.id === source.id;
          return <SourceNode key={source.id} source={source} x={pos.x} y={pos.y} isHighlighted={isHighlighted} isConnected={isConnected} onHover={handleElementHover} onClick={handleElementClick} />;
        })}

          {/* Indicator nodes */}
          {municipalIndicators.map(indicator => {
          const pos = indicatorPositions.find(p => p.id === indicator.id);
          if (!pos) return null;
          const isHighlighted = highlightedZones.includes("indicators");
          const isConnected = connectedElements.has(indicator.id) || state.hoveredElement?.id === indicator.id;
          return <IndicatorNode key={indicator.id} indicator={indicator} x={pos.x} y={pos.y} isHighlighted={isHighlighted} isConnected={isConnected} onHover={handleElementHover} onClick={handleElementClick} />;
        })}

          {/* Knowledge nodes */}
          {knowledgeItems.map(item => {
          const pos = knowledgePositions.find(p => p.id === item.id);
          if (!pos) return null;
          const isHighlighted = highlightedZones.includes("knowledge");
          const isConnected = connectedElements.has(item.id) || state.hoveredElement?.id === item.id;
          return <KnowledgeNode key={item.id} item={item} x={pos.x} y={pos.y} isHighlighted={isHighlighted} isConnected={isConnected} onHover={handleElementHover} onClick={handleElementClick} />;
        })}

          {/* Delivery nodes */}
          {deliveryPanels.map(panel => {
          const pos = deliveryPositions.find(p => p.id === panel.id);
          if (!pos) return null;
          const isHighlighted = highlightedZones.includes("delivery");
          const isConnected = connectedElements.has(panel.id) || state.hoveredElement?.id === panel.id;
          return <DeliveryNode key={panel.id} panel={panel} x={pos.x} y={pos.y} isHighlighted={isHighlighted} isConnected={isConnected} onHover={handleElementHover} onClick={handleElementClick} />;
        })}
        </svg>
      </div>

      {/* Legend */}
      <div className="bg-card/50 border border-border rounded-xl p-4">
        <p className="text-xs text-muted-foreground text-center">
          💡 Tip: Hover over sources to see API content. 
          Click on sources or indicators to explore by city.
        </p>
      </div>
    </div>
  </TooltipProvider>;
};
export default DataFlowDiagram;