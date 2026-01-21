import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Search } from "lucide-react";
import { BrazilMap } from "./BrazilMap";
import { StateDataPanel } from "./StateDataPanel";
import { RegionalStatesHeader } from "./RegionalStatesHeader";
import { MemoryDebugPanel } from "./MemoryDebugPanel";
import { useDashboardAnalyticsSafe, RegionalContext } from "@/contexts/DashboardAnalyticsContext";
import { getFromCache, saveToCache, clearExpiredCache } from "@/lib/regional-cache";
import { logger } from "@/lib/logger";
import { logMemoryUsage } from "@/lib/memory-monitor";

const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

const UF_SIGLA_TO_CODE: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17,
  MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27,
  SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35,
  PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53,
};

export function DataAnalyticsUF() {
  const [selectedResearch, setSelectedResearch] = useState<string>("none");
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  const dashboardAnalytics = useDashboardAnalyticsSafe();

  // Fetch regional APIs with frequency
  const { data: regionalApis, isLoading } = useQuery({
    queryKey: ["regional-apis-dashboard-v3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_api_registry")
        .select("id, name")
        .eq("target_table", "indicator_regional_values")
        .order("name");
      
      if (error) throw error;
      
      // Fetch frequency for each API from economic_indicators
      const apisWithFrequency = await Promise.all((data || []).map(async (api) => {
        const { data: indicators } = await supabase
          .from("economic_indicators")
          .select("frequency")
          .eq("api_id", api.id)
          .limit(1);
        
        return {
          ...api,
          frequency: indicators?.[0]?.frequency || 'monthly'
        };
      }));
      
      return apisWithFrequency;
    },
  });

  // Fetch all Brazilian UFs
  const { data: allUfs } = useQuery({
    queryKey: ["brazilian-ufs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brazilian_ufs")
        .select("uf_sigla, uf_name, region_code, uf_code")
        .order("uf_sigla");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch API to UF mapping for search filtering
  const { data: apiUfMapping } = useQuery({
    queryKey: ["api-uf-mapping", regionalApis?.length],
    queryFn: async () => {
      const mapping: Record<string, string[]> = {};
      
      for (const api of regionalApis || []) {
        const { data: indicators } = await supabase
          .from("economic_indicators")
          .select("id")
          .eq("api_id", api.id);
        
        const indicatorIds = indicators?.map(i => i.id) || [];
        if (indicatorIds.length === 0) continue;
        
        const { data: values } = await supabase
          .from("indicator_regional_values")
          .select("uf_code")
          .in("indicator_id", indicatorIds);
        
        const ufCodes = [...new Set(values?.map(v => v.uf_code) || [])];
        const siglas = (allUfs || [])
          .filter(uf => ufCodes.includes(uf.uf_code))
          .map(uf => uf.uf_sigla);
        
        mapping[api.id] = siglas;
      }
      
      return mapping;
    },
    enabled: !!regionalApis?.length && !!allUfs?.length,
  });

  // Clear expired cache on mount
  useEffect(() => {
    clearExpiredCache();
    logMemoryUsage('DataAnalyticsUF mounted');
  }, []);

  // PRE-LOAD all states data when research is selected (with cache)
  const { data: preloadedStatesData } = useQuery({
    queryKey: ["preload-all-states", selectedResearch],
    queryFn: async (): Promise<Record<string, RegionalContext>> => {
      if (selectedResearch === "none") return {};
      
      // Check cache first
      const cached = getFromCache(selectedResearch);
      if (cached) {
        logger.perf('Using cached regional data', { 
          researchId: selectedResearch, 
          stateCount: Object.keys(cached.data).length 
        });
        return cached.data;
      }
      
      logger.perf('Fetching regional data from database', { researchId: selectedResearch });
      
      // Get indicators for this research
      const { data: indicators } = await supabase
        .from("economic_indicators")
        .select("id, name, unit")
        .eq("api_id", selectedResearch);
      
      if (!indicators || indicators.length === 0) return {};
      
      const indicatorIds = indicators.map(i => i.id);
      const researchName = indicators[0]?.name || "Pesquisa";
      const researchUnit = indicators[0]?.unit || "índice";
      
      // Get ALL regional values for this research (all UFs)
      const { data: allValues, error } = await supabase
        .from("indicator_regional_values")
        .select("indicator_id, uf_code, reference_date, value")
        .in("indicator_id", indicatorIds)
        .order("reference_date", { ascending: false });
      
      if (error || !allValues) return {};
      
      // Group by UF code
      const byUf: Record<number, typeof allValues> = {};
      allValues.forEach(v => {
        if (!byUf[v.uf_code]) byUf[v.uf_code] = [];
        byUf[v.uf_code].push(v);
      });
      
      // Build RegionalContext for each UF
      const result: Record<string, RegionalContext> = {};
      
      Object.entries(byUf).forEach(([ufCodeStr, values]) => {
        const ufCode = parseInt(ufCodeStr);
        const ufInfo = allUfs?.find(u => u.uf_code === ufCode);
        if (!ufInfo) return;
        
        const sigla = ufInfo.uf_sigla;
        const sortedValues = values.sort((a, b) => 
          new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime()
        );
        
        const lastItem = sortedValues[0];
        const previousItem = sortedValues[1];
        
        // Calculate trend
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (lastItem && previousItem) {
          if (lastItem.value > previousItem.value) trend = 'up';
          else if (lastItem.value < previousItem.value) trend = 'down';
        }
        
        // Limit data to last 12 records (1 year monthly) to prevent memory issues
        const limitedData = sortedValues
          .slice(0, 12)
          .map(d => ({ date: d.reference_date, value: d.value }))
          .reverse();
        
        result[sigla] = {
          ufSigla: sigla,
          ufName: ufInfo.uf_name,
          researchName,
          researchId: selectedResearch,
          unit: researchUnit,
          trend,
          lastValue: lastItem?.value || null,
          lastDate: lastItem?.reference_date || null,
          recordCount: values.length,
          data: limitedData,
        };
      });
      
      // Save to cache
      saveToCache(selectedResearch, result, researchName);
      logger.perf('Regional data cached', { 
        researchId: selectedResearch, 
        stateCount: Object.keys(result).length 
      });
      
      return result;
    },
    enabled: selectedResearch !== "none" && !!allUfs?.length,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Update context with pre-loaded data
  useEffect(() => {
    if (dashboardAnalytics && preloadedStatesData) {
      dashboardAnalytics.setAllStatesData(
        Object.keys(preloadedStatesData).length > 0 ? preloadedStatesData : null
      );
    }
  }, [preloadedStatesData, dashboardAnalytics]);

  // Clear pre-loaded data when research changes to none
  useEffect(() => {
    if (selectedResearch === "none" && dashboardAnalytics) {
      dashboardAnalytics.setAllStatesData(null);
    }
  }, [selectedResearch, dashboardAnalytics]);

  // Filter APIs based on search term
  const filteredApis = useMemo(() => {
    if (!searchTerm.trim()) return regionalApis || [];
    
    const term = searchTerm.toLowerCase().trim();
    
    return (regionalApis || []).filter(api => {
      // Search by API name (product)
      if (api.name.toLowerCase().includes(term)) return true;
      
      // Search by state (sigla or name)
      const apiStates = apiUfMapping?.[api.id] || [];
      const matchesState = apiStates.some(sigla => {
        const uf = allUfs?.find(u => u.uf_sigla === sigla);
        return sigla.toLowerCase().includes(term) || 
               uf?.uf_name.toLowerCase().includes(term);
      });
      
      return matchesState;
    });
  }, [searchTerm, regionalApis, apiUfMapping, allUfs]);

  // Sort APIs by UF count (descending)
  const sortedApis = useMemo(() => {
    return [...filteredApis].sort((a, b) => {
      const countA = apiUfMapping?.[a.id]?.length || 0;
      const countB = apiUfMapping?.[b.id]?.length || 0;
      return countB - countA; // Descending
    });
  }, [filteredApis, apiUfMapping]);

  // Auto-select first matching API while typing
  useEffect(() => {
    if (sortedApis.length > 0 && searchTerm.trim()) {
      const firstMatch = sortedApis[0];
      if (firstMatch && selectedResearch !== firstMatch.id) {
        setSelectedResearch(firstMatch.id);
      }
    }
  }, [sortedApis, searchTerm]);

  // Fetch available UF codes for selected research
  const { data: availableUfCodes } = useQuery({
    queryKey: ["available-ufs", selectedResearch],
    queryFn: async () => {
      if (selectedResearch === "none") return [];
      
      const { data: indicators } = await supabase
        .from("economic_indicators")
        .select("id")
        .eq("api_id", selectedResearch);
      
      const indicatorIds = indicators?.map(i => i.id) || [];
      if (indicatorIds.length === 0) return [];
      
      const { data: values } = await supabase
        .from("indicator_regional_values")
        .select("uf_code")
        .in("indicator_id", indicatorIds);
      
      return [...new Set(values?.map(v => v.uf_code) || [])];
    },
    enabled: selectedResearch !== "none",
  });

  // Map UF codes to siglas
  const availableSiglas = (allUfs || [])
    .filter(uf => (availableUfCodes || []).includes(uf.uf_code))
    .map(uf => uf.uf_sigla);

  const isMapDisabled = selectedResearch === "none";

  // Update selectedUF only - StateDataPanel is responsible for full context with data
  useEffect(() => {
    if (dashboardAnalytics) {
      if (selectedState && selectedResearch !== "none") {
        dashboardAnalytics.setSelectedUF(selectedState);
        // Don't set regionalContext here - StateDataPanel will do it with complete data
      } else {
        dashboardAnalytics.setSelectedUF(null);
        dashboardAnalytics.setRegionalContext(null);
      }
    }
  }, [selectedState, selectedResearch, dashboardAnalytics]);

  // Helper to format frequency label
  const formatFrequency = (freq: string) => {
    const map: Record<string, string> = {
      'monthly': 'Mensal',
      'annual': 'Anual',
      'quarterly': 'Trim.',
      'daily': 'Diário',
    };
    return map[freq] || freq;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          UF DataSet
        </h2>
        <p className="text-muted-foreground">
          Visualização geográfica de indicadores regionais por estado
        </p>
      </div>

      {/* Research Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selecionar Pesquisa Regional</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando pesquisas...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column: Dropdown + Search */}
              <div className="space-y-3">
                {/* Dropdown */}
                <Select value={selectedResearch} onValueChange={setSelectedResearch}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma pesquisa regional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (desativar mapa)</SelectItem>
                    {sortedApis.map((api) => {
                      const stateCount = apiUfMapping?.[api.id]?.length || 0;
                      const freqLabel = formatFrequency(api.frequency);
                      return (
                        <SelectItem key={api.id} value={api.id}>
                          <div className="flex items-center gap-2 w-full">
                            <span className="flex-1 truncate">{api.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                              {freqLabel}
                            </Badge>
                            {stateCount > 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shrink-0">
                                {stateCount} UFs
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Search input below dropdown */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="buscar produto ou estado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 border-orange-500 focus:border-orange-500 focus-visible:ring-orange-500/20"
                  />
                </div>

                {/* No results message */}
                {sortedApis.length === 0 && searchTerm && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma pesquisa encontrada para "{searchTerm}"
                  </p>
                )}
              </div>

              {/* Right column: Regions and States */}
              {!isMapDisabled && allUfs && (
                <RegionalStatesHeader
                  availableStates={availableSiglas}
                  allUfs={allUfs}
                  hoveredState={hoveredState}
                  onHover={setHoveredState}
                  onSelect={setSelectedState}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map and State Panel - 10 columns: 5 for map (50%), 5 for panel (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Map - 5 columns (50%) */}
        <Card className="lg:col-span-5 overflow-hidden">
          <CardContent className="p-4">
            <BrazilMap
              hoveredState={hoveredState}
              selectedState={selectedState}
              onHover={setHoveredState}
              onSelect={setSelectedState}
              disabled={isMapDisabled}
              availableStates={availableSiglas}
            />
          </CardContent>
        </Card>

        {/* State Data Panel - 5 columns (50%) */}
        <div className="lg:col-span-5">
          {selectedState && !isMapDisabled ? (
            <StateDataPanel
              ufSigla={selectedState}
              researchId={selectedResearch}
              onClose={() => setSelectedState(null)}
            />
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>{isMapDisabled ? "Selecione uma pesquisa para ativar o mapa" : "Clique em um estado no mapa para ver os dados"}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Debug Panel (DEV mode only) */}
      <MemoryDebugPanel />
    </div>
  );
}
