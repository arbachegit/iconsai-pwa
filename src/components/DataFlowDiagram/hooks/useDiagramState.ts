import { useState, useMemo, useCallback } from "react";
import { 
  zones, 
  dataSources, 
  municipalIndicators, 
  knowledgeItems, 
  deliveryPanels,
  mainConnections,
  ZoneType,
  DomainType,
  DataSource,
  MunicipalIndicator,
  KnowledgeItem,
  DeliveryPanel
} from "../data/diagramData";

export type DiagramElement = DataSource | MunicipalIndicator | KnowledgeItem | DeliveryPanel;

export interface DiagramState {
  hoveredElement: DiagramElement | null;
  selectedElement: DiagramElement | null;
  activeFilters: DomainType[];
  stepByStepIndex: number;
  isAnimating: boolean;
  currentStep: number;
}

const zoneOrder: ZoneType[] = ["sources", "content", "indicators", "knowledge", "delivery"];

export const useDiagramState = () => {
  const [state, setState] = useState<DiagramState>({
    hoveredElement: null,
    selectedElement: null,
    activeFilters: [],
    stepByStepIndex: -1,
    isAnimating: false,
    currentStep: -1,
  });

  const setHoveredElement = useCallback((element: DiagramElement | null) => {
    setState(prev => ({ ...prev, hoveredElement: element }));
  }, []);

  const setSelectedElement = useCallback((element: DiagramElement | null) => {
    setState(prev => ({ ...prev, selectedElement: element }));
  }, []);

  const toggleFilter = useCallback((domain: DomainType) => {
    setState(prev => {
      const isActive = prev.activeFilters.includes(domain);
      return {
        ...prev,
        activeFilters: isActive
          ? prev.activeFilters.filter(d => d !== domain)
          : [...prev.activeFilters, domain],
      };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setState(prev => ({ ...prev, activeFilters: [] }));
  }, []);

  const startStepByStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAnimating: true,
      currentStep: 0,
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const next = prev.currentStep + 1;
      if (next >= zoneOrder.length) {
        return { ...prev, isAnimating: false, currentStep: -1 };
      }
      return { ...prev, currentStep: next };
    });
  }, []);

  const stopStepByStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAnimating: false,
      currentStep: -1,
    }));
  }, []);

  // Filter sources by domain
  const filteredSources = useMemo(() => {
    if (state.activeFilters.length === 0) return dataSources;
    return dataSources.filter(source => state.activeFilters.includes(source.domain));
  }, [state.activeFilters]);

  // Highlighted zones based on step-by-step
  const highlightedZones = useMemo(() => {
    if (!state.isAnimating || state.currentStep < 0) {
      return zoneOrder;
    }
    return zoneOrder.slice(0, state.currentStep + 1);
  }, [state.isAnimating, state.currentStep]);

  // Connected elements based on hovered element
  const connectedElements = useMemo(() => {
    const connected = new Set<string>();
    if (!state.hoveredElement) return connected;

    const hoveredId = state.hoveredElement.id;
    
    mainConnections.forEach(conn => {
      if (conn.from === hoveredId) {
        connected.add(conn.to);
      }
      if (conn.to === hoveredId) {
        connected.add(conn.from);
      }
    });

    return connected;
  }, [state.hoveredElement]);

  return {
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
    mainConnections,
  };
};
