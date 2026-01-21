import { useState, useMemo, useEffect, useRef } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CollapsibleGroup } from "@/components/shared/CollapsibleGroup";
import { StatBadge } from "@/components/shared/StatBadge";
import { TrendInfoModal } from "@/components/shared/TrendInfoModal";
import { STSOutputPanel } from "@/components/shared/STSOutputPanel";
import { STSAnalysisContent } from "@/components/shared/STSAnalysisContent";
import { TableDataContent } from "@/components/shared/TableDataContent";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Database,
  Loader2,
  BarChart3,
  RefreshCw,
  DollarSign,
  Percent,
  Hash,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Calendar,
  X,
  Info,
  Pin,
  CheckCircle2,
  AlertTriangle,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatDateByFrequency, type Frequency } from "@/lib/date-formatters";
import { useTimeSeriesAnalysis, generateSuggestions } from "@/hooks/useTimeSeriesAnalysis";
import { runStructuralTimeSeries, type STSResult } from "@/lib/structural-time-series";
import { useDashboardAnalyticsSafe } from "@/contexts/DashboardAnalyticsContext";

// PMC Regional indicator codes that have monetary conversion available
const PMC_REGIONAL_CODES = [
  'PMC_COMB_UF', 'PMC_COMBUSTIVEIS_UF', 'PMC_CONST_UF', 'PMC_CONSTRUCAO_UF',
  'PMC_FARM_UF', 'PMC_FARMACIA_UF', 'PMC_MOV_UF', 'PMC_MOVEIS_UF',
  'PMC_VAREJO_UF', 'PMC_VEICULOS_UF', 'PMC_VEST_UF', 'PMC_VESTUARIO_UF'
];

// PMC National indicator codes (aggregated from regional data)
const PMC_NATIONAL_CODES = [
  'PMC', 'PMC_COMB', 'PMC_CONST', 'PMC_FARM', 'PMC_MOV', 'PMC_VEIC', 'PMC_VEST'
];

// Mapping PMC national codes to their regional equivalents for R$ aggregation
const PMC_NATIONAL_TO_REGIONAL_MAP: Record<string, string> = {
  'PMC': 'PMC_VAREJO_UF',
  'PMC_COMB': 'PMC_COMB_UF',
  'PMC_CONST': 'PMC_CONST_UF',
  'PMC_FARM': 'PMC_FARM_UF',
  'PMC_MOV': 'PMC_MOV_UF',
  'PMC_VEIC': 'PMC_VEICULOS_UF',
  'PMC_VEST': 'PMC_VEST_UF',
};

// National indicators with partial UF coverage
const PMC_PARTIAL_COVERAGE: Record<string, { ufs: number; disclaimer: string }> = {
  'PMC_COMB': { ufs: 12, disclaimer: '12 UFs disponíveis' },
  'PMC_VEST': { ufs: 12, disclaimer: '12 UFs disponíveis' },
  'PMC_FARM': { ufs: 12, disclaimer: '12 UFs disponíveis' },
  'PMC_MOV': { ufs: 12, disclaimer: '12 UFs disponíveis' },
};

const isPmcRegionalIndicator = (code: string): boolean => {
  return PMC_REGIONAL_CODES.includes(code);
};

const isPmcNationalIndicator = (code: string): boolean => {
  return PMC_NATIONAL_CODES.includes(code);
};

// Check if indicator has R$ conversion available (regional or national)
const isPmcIndicator = (code: string): boolean => {
  return PMC_REGIONAL_CODES.includes(code) || PMC_NATIONAL_CODES.includes(code);
};

// Check if indicator is PAC (has estimated values in pac_valores_estimados)
const isPacIndicator = (code: string): boolean => {
  return code.startsWith('PAC_');
};

// Check if indicator has toggle available (PMC or PAC)
const hasMonetaryToggle = (code: string): boolean => {
  return isPmcIndicator(code) || isPacIndicator(code);
};

const getPmcCoverageInfo = (code: string): { hasPartialCoverage: boolean; disclaimer: string | null } => {
  const info = PMC_PARTIAL_COVERAGE[code];
  if (info) {
    return { hasPartialCoverage: true, disclaimer: info.disclaimer };
  }
  return { hasPartialCoverage: false, disclaimer: null };
};

// Provider color styling (same as ApiManagementTab)
const getProviderColor = (provider: string) => {
  switch (provider) {
    case 'BCB': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'IBGE': return 'bg-green-500/20 text-green-400 border-green-500/40';
    case 'IPEADATA': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    case 'WorldBank': return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
    case 'IMF': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40';
    case 'YahooFinance': return 'bg-violet-500/20 text-violet-400 border-violet-500/40';
    case 'Internal': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
    case 'Scraper': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    default: return 'bg-muted text-muted-foreground';
  }
};

// Format value for table display based on unit type
function formatTableValue(value: number, unit: string | null): string {
  const u = (unit || '').toLowerCase();
  
  if (u.includes('%')) {
    return `${value.toFixed(2)}%`;
  }
  
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  if (u.includes('us$') || u.includes('usd') || u.includes('dólar') || u.includes('dollar')) {
    return `$ ${value.toFixed(2)}`;
  }
  
  if (u.includes('índice') || u.includes('base') || u.includes('index')) {
    return value.toFixed(2);
  }
  
  return value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

interface Indicator {
  id: string;
  name: string;
  code: string;
  unit: string | null;
  category: string | null;
  frequency: string | null;
  is_regional: boolean | null;
  api_id: string | null;
}

interface IndicatorValue {
  indicator_id: string;
  reference_date: string;
  value: number;
}

interface ApiRegistry {
  id: string;
  name: string;
  provider: string | null;
}

interface IndicatorWithApi extends Indicator {
  api?: ApiRegistry | null;
}

interface IndicatorValueWithUF {
  reference_date: string;
  value: number;
  brazilian_ufs?: { uf_name: string; uf_sigla: string } | null;
}

// Category groups for organization
const CATEGORY_GROUPS = {
  financial: {
    title: 'Indicadores Financeiros Globais',
    icon: TrendingUp,
    codes: ['IPCA', 'IPCA_BCB', 'SELIC', 'SELIC_IPEADATA', 'SELIC_OVER', 'CDI', 'DOLAR', 'DOLAR_PTAX_COMPRA', 'PIB', 'NY.GDP.PCAP.PP.CD', '4099', 'POP_RESIDENTE']
  },
  renda: {
    title: 'Renda e Distribuição',
    icon: Users,
    codes: ['RENDA_MEDIA', 'RENDA_MEDIA_UF', 'GINI', 'GINI_UF', 'RENDA_CLASSE_A', 'RENDA_CLASSE_B', 'RENDA_CLASSE_C', 'RENDA_CLASSE_D', 'RENDA_CLASSE_E']
  },
  pmc: {
    title: 'PMC - Pesquisa Mensal do Comércio',
    icon: BarChart3,
    codes: ['PMC', 'PMC_COMB', 'PMC_FARM', 'PMC_MOV', 'PMC_VEST', 'PMC_CONST', 'PMC_VEIC']
  },
  pmcRegional: {
    title: 'PMC - Pesquisa Mensal do Comércio (Regional)',
    icon: MapPin,
    codes: ['PMC_COMBUSTIVEIS_UF', 'PMC_FARMACIA_UF', 'PMC_MOVEIS_UF', 'PMC_VESTUARIO_UF', 'PMC_CONSTRUCAO_UF', 'PMC_VEICULOS_UF', 'PMC_VAREJO_UF', 'PMC_COMB_UF', 'PMC_FARM_UF', 'PMC_MOV_UF', 'PMC_VEST_UF', 'PMC_CONST_UF', 'PMC_VEIC_UF']
  },
  pac: {
    title: 'PAC - Pesquisa Anual do Comércio',
    icon: DollarSign,
    codes: ['PAC_TOTAL_RB_UF', 'PAC_VAREJO_RB_UF', 'PAC_ATACADO_RB_UF', 'PAC_VEICULOS_RB_UF', 'PAC_HIPER_RB_UF', 'PAC_COMBUSTIVEIS_RB_UF', 'PAC_ALIMENTOS_RB_UF', 'PAC_TECIDOS_RB_UF', 'PAC_INFORMATICA_RB_UF']
  }
};

const CATEGORIES: Record<string, string> = {
  macro: "Macroeconômico",
  regional: "Regional",
  pmc: "PMC",
  pac: "PAC",
};

const FREQUENCIES: Record<string, string> = {
  daily: "Diária",
  monthly: "Mensal",
  quarterly: "Trimestral",
  annual: "Anual",
};

// Format unit for display
function formatUnit(unit: string | null): { label: string; icon: React.ReactNode } {
  if (!unit) return { label: 'N/A', icon: <Hash className="h-3 w-3" /> };
  const u = unit.toLowerCase();
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    return { label: 'R$', icon: <DollarSign className="h-3 w-3" /> };
  }
  if (u.includes('us$') || u.includes('usd') || u.includes('dólar') || u.includes('dollar')) {
    return { label: '$', icon: <DollarSign className="h-3 w-3" /> };
  }
  if (u.includes('%')) {
    return { label: '%', icon: <Percent className="h-3 w-3" /> };
  }
  if (u.includes('índice') || u.includes('base') || u.includes('index')) {
    return { label: 'Índice', icon: <Activity className="h-3 w-3" /> };
  }
  if (u.includes('pessoas') || u.includes('quantidade') || u.includes('pop')) {
    return { label: 'Qtd', icon: <Hash className="h-3 w-3" /> };
  }
  return { label: unit.substring(0, 6), icon: <Hash className="h-3 w-3" /> };
}

// Format large values
function formatValue(value: number, unit: string | null, includeUnit: boolean = false): string {
  const u = (unit || '').toLowerCase();
  const isIndex = u.includes('índice') || u.includes('base') || u.includes('index');
  
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    let formatted = '';
    if (value >= 1e12) formatted = `${(value / 1e12).toFixed(1)} tri`;
    else if (value >= 1e9) formatted = `${(value / 1e9).toFixed(1)} bi`;
    else if (value >= 1e6) formatted = `${(value / 1e6).toFixed(1)} mi`;
    else if (value >= 1e3) formatted = `${(value / 1e3).toFixed(1)} mil`;
    else formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    return includeUnit && !isIndex ? `R$ ${formatted}` : formatted;
  }
  
  const formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  
  if (includeUnit && !isIndex) {
    if (u.includes('%')) return `${formatted}%`;
    if (u.includes('us$') || u.includes('usd') || u.includes('dólar') || u.includes('dollar')) return `R$ ${formatted}`;
  }
  
  return formatted;
}

type DialogView = 'detail' | 'table' | 'sts';

export function TableDatabaseTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorWithApi | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<{ count: number; date: Date } | null>(null);
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [currentView, setCurrentView] = useState<DialogView>('detail');
  const [showMonetaryValues, setShowMonetaryValues] = useState(false);
  
  // Global toggle for PMC Nacional group with localStorage persistence
  const [pmcNationalMonetaryMode, setPmcNationalMonetaryMode] = useState(() => {
    const saved = localStorage.getItem('pmcTableNationalMonetaryMode');
    return saved === 'true';
  });
  
  // Global toggle for PMC Regional group with localStorage persistence
  const [pmcRegionalMonetaryMode, setPmcRegionalMonetaryMode] = useState(() => {
    const saved = localStorage.getItem('pmcTableRegionalMonetaryMode');
    return saved === 'true';
  });
  
  // Persist PMC Nacional monetary mode to localStorage
  useEffect(() => {
    localStorage.setItem('pmcTableNationalMonetaryMode', pmcNationalMonetaryMode.toString());
  }, [pmcNationalMonetaryMode]);
  
  // Persist PMC Regional monetary mode to localStorage
  useEffect(() => {
    localStorage.setItem('pmcTableRegionalMonetaryMode', pmcRegionalMonetaryMode.toString());
  }, [pmcRegionalMonetaryMode]);
  
  const dashboardAnalytics = useDashboardAnalyticsSafe();

  // Fetch indicators with API name
  const { data: indicators = [], isLoading: loadingIndicators, refetch: refetchIndicators } = useQuery({
    queryKey: ["indicators-table-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economic_indicators")
        .select("id, name, code, unit, category, frequency, is_regional, api_id, system_api_registry(id, name, provider)")
        .order("name");
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        api: item.system_api_registry,
      })) as IndicatorWithApi[];
    },
  });

  // Fetch all indicator values
  const { data: allValues = [], refetch: refetchValues } = useQuery({
    queryKey: ["indicator-values-table-db"],
    queryFn: async () => {
      const allData: IndicatorValue[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("indicator_values")
          .select("indicator_id, reference_date, value")
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...(data as IndicatorValue[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
  });

  // Fetch regional values
  const { data: regionalValues = [] } = useQuery({
    queryKey: ["regional-values-table-db"],
    queryFn: async () => {
      const allData: IndicatorValue[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("indicator_regional_values")
          .select("indicator_id, reference_date, value")
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...(data as IndicatorValue[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
  });

  // Fetch ALL values for the selected indicator modal (with pagination to bypass 1000 limit)
  const { data: selectedIndicatorValues = [], isLoading: loadingSelectedValues } = useQuery({
    queryKey: ["selected-indicator-values", selectedIndicator?.id, "v3-full"],
    queryFn: async () => {
      if (!selectedIndicator) return [];
      
      const allData: IndicatorValueWithUF[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        if (selectedIndicator.is_regional) {
          const { data, error } = await supabase
            .from("indicator_regional_values")
            .select("reference_date, value, brazilian_ufs!inner(uf_name, uf_sigla)")
            .eq("indicator_id", selectedIndicator.id)
            .order("reference_date", { ascending: false })
            .range(from, from + pageSize - 1);
          if (error) throw error;
          
          if (data && data.length > 0) {
            allData.push(...(data as IndicatorValueWithUF[]));
            from += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        } else {
          const { data, error } = await supabase
            .from("indicator_values")
            .select("reference_date, value")
            .eq("indicator_id", selectedIndicator.id)
            .order("reference_date", { ascending: false })
            .range(from, from + pageSize - 1);
          if (error) throw error;
          
          if (data && data.length > 0) {
            allData.push(...(data as IndicatorValueWithUF[]));
            from += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }
      }
      
      return allData;
    },
    enabled: !!selectedIndicator?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch Brazilian UFs for mapping uf_code to names
  const { data: brazilianUfs = [] } = useQuery({
    queryKey: ["brazilian-ufs-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brazilian_ufs")
        .select("uf_code, uf_name, uf_sigla");
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Create UF lookup map
  const ufMap = useMemo(() => {
    const map: Record<number, { uf_name: string; uf_sigla: string }> = {};
    brazilianUfs.forEach(uf => {
      map[uf.uf_code] = { uf_name: uf.uf_name, uf_sigla: uf.uf_sigla };
    });
    return map;
  }, [brazilianUfs]);

  // Fetch PMC monetary values for conversion toggle (supports both regional and national)
  const { data: pmcMonetaryValues = [] } = useQuery({
    queryKey: ["pmc-monetary-values-table", selectedIndicator?.code, "v3-aggregated"],
    queryFn: async () => {
      if (!selectedIndicator || !isPmcIndicator(selectedIndicator.code)) return [];
      
      const isNational = isPmcNationalIndicator(selectedIndicator.code);
      
      // For national indicators, use the regional equivalent code to aggregate
      const queryCode = isNational 
        ? PMC_NATIONAL_TO_REGIONAL_MAP[selectedIndicator.code] || selectedIndicator.code
        : selectedIndicator.code;
      
      // Always fetch regional data (uf_code > 0) - aggregation happens in displayData
      const { data, error } = await supabase
        .from("pmc_valores_reais")
        .select("reference_date, uf_code, valor_estimado_reais")
        .eq("pmc_indicator_code", queryCode)
        .gt("uf_code", 0)
        .order("reference_date", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedIndicator && isPmcIndicator(selectedIndicator?.code || ''),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch PAC estimated values (2024-2025) for PAC indicators
  const { data: pacEstimatedValues = [] } = useQuery({
    queryKey: ["pac-estimated-values-table", selectedIndicator?.id],
    queryFn: async () => {
      if (!selectedIndicator || !isPacIndicator(selectedIndicator.code)) return [];
      
      const { data, error } = await supabase
        .from("pac_valores_estimados")
        .select("reference_date, reference_year, valor_estimado, uf_code")
        .eq("pac_indicator_code", selectedIndicator.code)
        .order("reference_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedIndicator && isPacIndicator(selectedIndicator?.code || ''),
  });

  // Get display data (index or monetary values)
  const displayData = useMemo(() => {
    if (!selectedIndicator) return [];
    
    // PMC monetary toggle
    if (showMonetaryValues && isPmcIndicator(selectedIndicator.code) && pmcMonetaryValues.length > 0) {
      const isNational = isPmcNationalIndicator(selectedIndicator.code);
      
      if (isNational) {
        // National PMC: aggregate all UF values by date to get Brazil total
        const aggregated: Record<string, number> = {};
        pmcMonetaryValues.forEach((v: any) => {
          const date = v.reference_date;
          if (!aggregated[date]) aggregated[date] = 0;
          aggregated[date] += v.valor_estimado_reais || 0;
        });
        
        return Object.entries(aggregated)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, value]) => ({
            reference_date: date,
            value,
            brazilian_ufs: null, // National aggregate has no UF
          }));
      }
      
      // Regional PMC: keep individual UF values
      return pmcMonetaryValues.map((v: any) => ({
        reference_date: v.reference_date,
        value: v.valor_estimado_reais,
        brazilian_ufs: v.uf_code > 0 && ufMap[v.uf_code] ? ufMap[v.uf_code] : null,
      }));
    }
    
    // PAC indicators: show base values, optionally add estimated values (2024-2025) when toggle is ON
    if (isPacIndicator(selectedIndicator.code)) {
      const baseValues = selectedIndicatorValues.map(v => ({
        reference_date: v.reference_date,
        value: v.value,
        brazilian_ufs: v.brazilian_ufs,
      }));
      
      // If toggle ON and we have estimated values, add them
      if (showMonetaryValues && pacEstimatedValues.length > 0) {
        const estimatedValues = pacEstimatedValues.map((v: any) => ({
          reference_date: v.reference_date,
          value: v.valor_estimado,
          brazilian_ufs: v.uf_code > 0 && ufMap[v.uf_code] ? ufMap[v.uf_code] : null,
        }));
        
        // Combine and sort by date descending
        return [...baseValues, ...estimatedValues]
          .sort((a, b) => b.reference_date.localeCompare(a.reference_date));
      }
      
      // Toggle OFF: only base values
      return baseValues.sort((a, b) => b.reference_date.localeCompare(a.reference_date));
    }
    
    return selectedIndicatorValues;
  }, [selectedIndicator, selectedIndicatorValues, showMonetaryValues, pmcMonetaryValues, ufMap, pacEstimatedValues]);

  const handleCardClick = (indicator: IndicatorWithApi) => {
    setCurrentView('detail');
    setShowTrendModal(false);
    setSelectedIndicator(indicator);
  };

  const handleOpenTableView = () => {
    setCurrentView('table');
  };

  const handleOpenSTSView = () => {
    setCurrentView('sts');
  };

  const handleBackToDetail = () => {
    setCurrentView('detail');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchIndicators(), refetchValues()]);
      setLastUpdate({ count: allValues.length + regionalValues.length, date: new Date() });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Combined values
  const combinedValues = useMemo(() => {
    return [...allValues, ...regionalValues];
  }, [allValues, regionalValues]);

  // Fetch indicator stats from view (combines indicator_values, indicator_regional_values, pac_valores_estimados)
  const { data: indicatorStatsFromDB = [] } = useQuery({
    queryKey: ["indicator-stats-summary-table-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("indicator_stats_summary")
        .select("indicator_id, total_count, min_date, max_date, last_value");
      if (error) throw error;
      return data || [];
    },
  });

  // Convert array to stats map format
  const indicatorStats = useMemo(() => {
    const stats: Record<string, { count: number; min: string; max: string; lastValue: number }> = {};
    indicatorStatsFromDB.forEach((s: any) => {
      stats[s.indicator_id] = {
        count: s.total_count || 0,
        min: s.min_date || '',
        max: s.max_date || '',
        lastValue: s.last_value || 0,
      };
    });
    return stats;
  }, [indicatorStatsFromDB]);

  // Filter and group indicators
  const filteredIndicators = useMemo(() => {
    let filtered = indicators;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          (i.category && i.category.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [indicators, searchQuery]);

  // Group indicators by category
  const groupedIndicators = useMemo(() => {
    const groups: Record<string, IndicatorWithApi[]> = {};
    
    Object.entries(CATEGORY_GROUPS).forEach(([key, group]) => {
      const groupItems = filteredIndicators.filter(i => group.codes.includes(i.code));
      if (groupItems.length > 0) {
        groups[key] = groupItems;
      }
    });
    
    const categorizedCodes = Object.values(CATEGORY_GROUPS).flatMap(g => g.codes);
    const uncategorized = filteredIndicators.filter(i => !categorizedCodes.includes(i.code));
    if (uncategorized.length > 0) {
      groups['outros'] = uncategorized;
    }
    
    return groups;
  }, [filteredIndicators]);

  // Prepare data for analysis hook - use displayData (respects toggle)
  const analysisData = useMemo(() => {
    if (!displayData || displayData.length === 0) return null;
    
    // Check if this is a regional indicator (PAC, PMC regional, etc.)
    const isRegional = selectedIndicator?.is_regional === true && !showMonetaryValues;
    
    // For national PMC with monetary toggle ON, data is already aggregated
    if (showMonetaryValues && isPmcNationalIndicator(selectedIndicator?.code || '')) {
      return displayData
        .map(v => ({
          date: new Date(v.reference_date),
          value: v.value,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    
    // For PMC regional with monetary toggle ON, aggregate by date
    if (showMonetaryValues && isPmcRegionalIndicator(selectedIndicator?.code || '')) {
      const aggregated: Record<string, number> = {};
      displayData.forEach(v => {
        const date = v.reference_date;
        if (!aggregated[date]) aggregated[date] = 0;
        aggregated[date] += v.value;
      });
      
      return Object.entries(aggregated)
        .map(([date, value]) => ({ date: new Date(date), value }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    
    if (!isRegional) {
      // National data - use existing logic
      return displayData
        .filter(v => !v.brazilian_ufs)
        .map(v => ({
          date: new Date(v.reference_date),
          value: v.value,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    
    // Regional data (PAC) - aggregate all UFs by period for national total
    const aggregated: Record<string, number> = {};
    displayData.forEach(v => {
      const date = v.reference_date;
      if (!aggregated[date]) aggregated[date] = 0;
      aggregated[date] += v.value;
    });
    
    return Object.entries(aggregated)
      .map(([date, value]) => ({ date: new Date(date), value }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [displayData, selectedIndicator?.is_regional, selectedIndicator?.code, showMonetaryValues]);

  // Time series analysis
  const analysis = useTimeSeriesAnalysis(analysisData, selectedIndicator?.frequency as Frequency);
  const suggestions = useMemo(() => {
    return generateSuggestions(analysis, selectedIndicator?.unit || null);
  }, [analysis, selectedIndicator?.unit]);

  // Full STS analysis
  const stsData = useMemo<STSResult | null>(() => {
    if (!analysisData || analysisData.length < 3) return null;
    return runStructuralTimeSeries(analysisData, selectedIndicator?.frequency as Frequency || 'monthly');
  }, [analysisData, selectedIndicator?.frequency]);

  // Stable ref to avoid dashboardAnalytics in useEffect dependencies (prevents infinite loops)
  const dashboardAnalyticsRef = useRef(dashboardAnalytics);
  useEffect(() => {
    dashboardAnalyticsRef.current = dashboardAnalytics;
  }, [dashboardAnalytics]);

  // Update dashboard analytics context when indicator is selected
  useEffect(() => {
    const analytics = dashboardAnalyticsRef.current;
    
    if (analytics && selectedIndicator && analysisData && analysisData.length > 0) {
      const stats = analysis?.statistics ? {
        mean: analysis.statistics.mean,
        stdDev: analysis.statistics.stdDev,
        cv: analysis.statistics.coefficientOfVariation,
        min: analysis.statistics.min,
        max: analysis.statistics.max,
        trend: analysis.statistics.trendDirection,
        slope: analysis.statistics.slope,
        r2: analysis.statistics.r2,
      } : null;
      
      // Limit data to last 50 records to avoid payload bloat
      const limitedData = analysisData.slice(-50).map(d => ({
        date: d.date.toISOString().split('T')[0],
        value: d.value,
      }));
      
      const contextData = {
        indicatorId: selectedIndicator.id,
        indicatorName: selectedIndicator.name,
        indicatorCode: selectedIndicator.code,
        chartType: 'line' as const,
        frequency: selectedIndicator.frequency,
        unit: selectedIndicator.unit,
        periodStart: analysisData[0].date.toISOString().split('T')[0],
        periodEnd: analysisData[analysisData.length - 1].date.toISOString().split('T')[0],
        totalRecords: analysisData.length,
        data: limitedData,
        statistics: stats,
        stsResult: stsData ? {
          mu_smoothed: stsData.mu_smoothed,
          beta_smoothed: stsData.beta_smoothed,
          direction: stsData.direction,
          strength: stsData.strength,
          forecast: {
            mean: stsData.forecast.mean,
            p05: stsData.forecast.p05,
            p95: stsData.forecast.p95,
          },
        } : null,
      };
      
      analytics.setChartContext(contextData);
      
      // Add to history for comparison support
      analytics.addToHistory({
        type: 'chart',
        label: selectedIndicator.name,
        context: contextData,
      });
    } else if (analytics && !selectedIndicator) {
      analytics.setChartContext(null);
    }
  }, [selectedIndicator, analysisData, analysis, stsData]); // NO dashboardAnalytics dependency!

  // Get current (last) value for STS modal - use displayData (respects toggle)
  const currentValue = useMemo(() => {
    if (!displayData || displayData.length === 0) return 0;
    
    // For national PMC with monetary toggle, data is already single values per date
    if (showMonetaryValues && isPmcNationalIndicator(selectedIndicator?.code || '')) {
      return displayData[0]?.value || 0;
    }
    
    const isRegional = selectedIndicator?.is_regional === true && !showMonetaryValues;
    
    if (!isRegional) {
      const nationalValues = displayData.filter(v => !v.brazilian_ufs);
      return nationalValues.length > 0 ? nationalValues[0].value : 0;
    }
    
    // For regional indicators, get sum of most recent period
    const maxDate = displayData.reduce((max, v) => 
      v.reference_date > max ? v.reference_date : max, '');
    return displayData
      .filter(v => v.reference_date === maxDate)
      .reduce((sum, v) => sum + v.value, 0);
  }, [displayData, selectedIndicator?.is_regional, selectedIndicator?.code, showMonetaryValues]);

  // Calculate series counts by frequency - MUST be before early return
  const seriesCounts = useMemo(() => {
    const counts = { daily: 0, monthly: 0, quarterly: 0, yearly: 0 };
    filteredIndicators.forEach(indicator => {
      const stats = indicatorStats[indicator.id];
      if (stats && stats.count > 0) {
        const startYear = parseInt(stats.min.substring(0, 4));
        const startMonth = parseInt(stats.min.substring(5, 7));
        const endYear = parseInt(stats.max.substring(0, 4));
        const endMonth = parseInt(stats.max.substring(5, 7));
        const monthsDiff = (endYear - startYear) * 12 + (endMonth - startMonth);
        const avgPerMonth = stats.count / Math.max(monthsDiff, 1);
        
        if (avgPerMonth > 20) counts.daily++;
        else if (avgPerMonth > 3) counts.monthly++;
        else if (avgPerMonth > 0.3) counts.quarterly++;
        else counts.yearly++;
      }
    });
    return counts;
  }, [filteredIndicators, indicatorStats]);

  // Calculate date range from data - MUST be before early return
  const dateRangeFromData = useMemo(() => {
    let minDate: string | null = null;
    let maxDate: string | null = null;
    
    combinedValues.forEach(v => {
      if (!minDate || v.reference_date < minDate) minDate = v.reference_date;
      if (!maxDate || v.reference_date > maxDate) maxDate = v.reference_date;
    });
    
    return {
      start: minDate ? new Date(minDate) : null,
      end: maxDate ? new Date(maxDate) : null
    };
  }, [combinedValues]);
  
  if (loadingIndicators) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render indicator card with knowyou-indicator-card class
  const renderIndicatorCard = (indicator: IndicatorWithApi, overrideMonetaryMode?: boolean) => {
    const stats = indicatorStats[indicator.id];
    const unitInfo = formatUnit(indicator.unit);
    const hasData = stats && stats.count > 0;
    const minDate = hasData ? format(new Date(stats.min), "MM/yy") : "N/A";
    const maxDate = hasData ? format(new Date(stats.max), "MM/yy") : "N/A";
    const u = (indicator.unit || '').toLowerCase();
    const isIndex = u.includes('índice') || u.includes('base') || u.includes('index');

    return (
      <div
        key={indicator.id}
        className="knowyou-indicator-card"
        onClick={() => {
          if (overrideMonetaryMode !== undefined) {
            setShowMonetaryValues(overrideMonetaryMode);
          }
          handleCardClick(indicator);
        }}
      >
        {/* Provider badge + R$ disponível/parcial badge */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {indicator.api?.provider && (
            <Badge 
              variant="outline" 
              className={cn("text-xs", getProviderColor(indicator.api.provider))}
            >
              {indicator.api.provider}
            </Badge>
          )}
          {isPmcIndicator(indicator.code) && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                getPmcCoverageInfo(indicator.code).hasPartialCoverage
                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                  : "bg-green-500/10 text-green-400 border-green-500/30"
              )}
              title={getPmcCoverageInfo(indicator.code).disclaimer || undefined}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              {getPmcCoverageInfo(indicator.code).hasPartialCoverage ? "R$ parcial" : "R$ disponível"}
            </Badge>
          )}
        </div>
        {/* Title */}
        <h3 className="font-semibold text-sm mb-3 line-clamp-2 min-h-[40px]">
          {indicator.name}
        </h3>
        
        {/* 2x2 Badge grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Unit badge */}
          <div className="flex flex-col items-center justify-center border border-primary/20 rounded-md py-1.5 bg-muted/30">
            <span className="text-[9px] text-muted-foreground uppercase">Unidade</span>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary/50">
                {unitInfo.icon}
              </div>
              <span className="text-xs font-medium">{unitInfo.label}</span>
            </div>
          </div>
          
          {/* Period badge */}
          <div className="flex flex-col items-center justify-center border border-primary/20 rounded-md py-1.5 bg-muted/30">
            <span className="text-[9px] text-muted-foreground uppercase">Período</span>
            <span className="text-xs font-medium">{minDate} - {maxDate}</span>
          </div>
          
          {/* Records badge */}
          <div className="flex flex-col items-center justify-center border border-primary/20 rounded-md py-1.5 bg-secondary/30">
            <span className="text-[9px] text-muted-foreground uppercase">Registros</span>
            <div className="flex items-center gap-1">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary/50">
                <Database className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium">{hasData ? stats.count.toLocaleString() : "0"}</span>
            </div>
          </div>
          
          {/* Last value badge */}
          <div className="flex flex-col items-center justify-center border border-primary/30 rounded-md py-1.5 bg-primary/10">
            <span className="text-[9px] text-muted-foreground uppercase">Último Valor</span>
            <span className="text-xs font-bold text-primary">
              {hasData ? formatValue(stats.lastValue, indicator.unit, !isIndex) : "N/A"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="knowyou-header-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Table DataSet</h2>
              <p className="text-sm text-muted-foreground">
                Visualização de indicadores econômicos e seus valores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                {lastUpdate.count.toLocaleString()} registros • {format(lastUpdate.date, "dd/MM/yyyy")}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2 knowyou-badge">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="knowyou-metric-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm">Período</span>
            </div>
            <div className="font-semibold">
              {dateRangeFromData.start && dateRangeFromData.end ? (
                <>
                  {format(dateRangeFromData.start, "MMM/yyyy", { locale: ptBR })} - {' '}
                  {format(dateRangeFromData.end, "MMM/yyyy", { locale: ptBR })}
                </>
              ) : 'Não definido'}
            </div>
          </div>

          <div className="knowyou-metric-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span className="text-sm">Frequência</span>
            </div>
            <Select defaultValue="monthly">
              <SelectTrigger className="border-primary/30 bg-transparent h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="knowyou-metric-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm">Total de Séries</span>
            </div>
            <div className="font-semibold text-lg">{filteredIndicators.length} indicadores</div>
          </div>
        </div>

        {/* Series Distribution */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">Séries Disponíveis:</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="knowyou-badge px-4 py-2">
              <span className="text-primary">Mensal</span>
              <span className="ml-2 font-bold">{seriesCounts.monthly}</span>
            </Badge>
            <Badge variant="outline" className="knowyou-badge px-4 py-2">
              <span className="text-primary">Trimestral</span>
              <span className="ml-2 font-bold">{seriesCounts.quarterly}</span>
            </Badge>
            <Badge variant="outline" className="knowyou-badge px-4 py-2">
              <span className="text-primary">Anual</span>
              <span className="ml-2 font-bold">{seriesCounts.yearly}</span>
            </Badge>
            <Badge variant="outline" className="knowyou-badge px-4 py-2">
              <span className="text-primary">Diário</span>
              <span className="ml-2 font-bold">{seriesCounts.daily}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <DebouncedInput
          placeholder="Buscar indicador..."
          value={searchQuery}
          onChange={setSearchQuery}
          delay={300}
          className="pl-9 border-primary/30 focus:border-primary"
        />
      </div>

      {/* Grouped Indicator Cards with CollapsibleGroup */}
      <div className="space-y-4">
        {Object.entries(groupedIndicators).map(([key, groupIndicators]) => {
          const group = CATEGORY_GROUPS[key as keyof typeof CATEGORY_GROUPS] || {
            title: 'Outros Indicadores',
            icon: Database
          };
          const GroupIcon = group.icon;
          const isPmcNationalGroup = key === 'pmc';
          const isPmcRegionalGroup = key === 'pmcRegional';
          const showToggle = isPmcNationalGroup || isPmcRegionalGroup;
          const toggleMode = isPmcRegionalGroup ? pmcRegionalMonetaryMode : pmcNationalMonetaryMode;
          const setToggleMode = isPmcRegionalGroup ? setPmcRegionalMonetaryMode : setPmcNationalMonetaryMode;

          return (
            <CollapsibleGroup
              key={key}
              title={group.title}
              icon={<GroupIcon className="h-5 w-5" />}
              count={groupIndicators.length}
              defaultExpanded={false}
              headerExtra={showToggle ? (
                <div 
                  className="flex items-center gap-2 ml-4" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={cn(
                    "text-xs font-medium transition-colors",
                    !toggleMode ? "text-primary" : "text-muted-foreground"
                  )}>Índice</span>
                  <Switch
                    checked={toggleMode}
                    onCheckedChange={setToggleMode}
                    className="data-[state=checked]:bg-green-500"
                  />
                  <span className={cn(
                    "text-xs font-medium transition-colors",
                    toggleMode ? "text-green-400" : "text-muted-foreground"
                  )}>R$</span>
                </div>
              ) : undefined}
            >
              {groupIndicators.map((indicator) => {
                // For PMC groups, apply corresponding monetary mode when opening detail
                if (isPmcNationalGroup || isPmcRegionalGroup) {
                  const currentToggleMode = isPmcRegionalGroup ? pmcRegionalMonetaryMode : pmcNationalMonetaryMode;
                  return renderIndicatorCard(indicator, currentToggleMode);
                }
                return renderIndicatorCard(indicator);
              })}
            </CollapsibleGroup>
          );
        })}
      </div>

      {/* View Modal - view switching architecture */}
      <Dialog open={!!selectedIndicator} onOpenChange={(open) => {
        if (!open) {
          setSelectedIndicator(null);
          setCurrentView('detail');
          setShowTrendModal(false);
        }
      }} modal={false}>
        <DialogContent 
          className="max-w-4xl h-[90vh] max-h-[900px] flex flex-col p-0 bg-[#0A0A0F] overflow-hidden [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          
          {/* VIEW: TABLE */}
          {currentView === 'table' && selectedIndicator && (
            <TableDataContent
              onBack={handleBackToDetail}
              indicatorName={selectedIndicator.name + (showMonetaryValues ? ' (R$)' : '')}
              indicatorCode={selectedIndicator.code}
              isRegional={showMonetaryValues ? isPmcRegionalIndicator(selectedIndicator.code) : (selectedIndicator.is_regional || false)}
              data={displayData}
              unit={showMonetaryValues ? 'R$ (mil)' : (selectedIndicator.unit || null)}
              frequency={selectedIndicator.frequency || null}
              isLoading={loadingSelectedValues}
              isMonetaryMode={showMonetaryValues}
            />
          )}

          {/* VIEW: STS ANALYSIS */}
          {currentView === 'sts' && selectedIndicator && stsData && analysis && (
            <STSAnalysisContent
              onBack={handleBackToDetail}
              indicatorName={selectedIndicator.name}
              unit={selectedIndicator.unit || null}
              frequency={selectedIndicator.frequency || null}
              stsData={stsData}
              statistics={{
                mean: analysis.statistics.mean,
                movingAverage: analysis.statistics.movingAverage,
                stdDev: analysis.statistics.stdDev,
                coefficientOfVariation: analysis.statistics.coefficientOfVariation,
              }}
              currentValue={currentValue}
            />
          )}

          {/* VIEW: DETAIL (default) */}
          {currentView === 'detail' && (
            <>
              {/* HEADER */}
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-cyan-500/20 bg-[#0A0A0F] z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">{selectedIndicator?.name}</h2>
                      {selectedIndicator?.api?.provider && (
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs border-cyan-500/50 text-cyan-400", getProviderColor(selectedIndicator.api.provider))}
                        >
                          {selectedIndicator.api.provider}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {displayData.length} registros 
                      {displayData.length === 500 && ' (limitado a 500)'}
                      {showMonetaryValues && ' • Valores em R$'}
                    </span>
                  </div>
                </div>
                
                {/* Botões: Toggle + Ver Tabela + Fechar */}
                <div className="flex items-center gap-3">
                  {/* Toggle Índice ↔ R$ for PMC and PAC indicators */}
                  {selectedIndicator && hasMonetaryToggle(selectedIndicator.code) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-cyan-500/30 rounded-lg bg-muted/30">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className={cn("text-sm", !showMonetaryValues && "text-cyan-400 font-medium")}>
                        {isPacIndicator(selectedIndicator.code) ? 'Histórico' : 'Índice'}
                      </span>
                      <Switch 
                        checked={showMonetaryValues} 
                        onCheckedChange={setShowMonetaryValues}
                      />
                      <span className={cn("text-sm", showMonetaryValues && "text-green-400 font-medium")}>
                        {isPacIndicator(selectedIndicator.code) ? '+Estimado' : 'R$'}
                      </span>
                      <DollarSign className="h-4 w-4 text-green-400" />
                      {isPmcIndicator(selectedIndicator.code) && getPmcCoverageInfo(selectedIndicator.code).hasPartialCoverage && (
                        <span className="text-[10px] text-yellow-400" title={getPmcCoverageInfo(selectedIndicator.code).disclaimer || ''}>
                          ⚠️
                        </span>
                      )}
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleOpenTableView}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2",
                      "bg-cyan-500/10 hover:bg-cyan-500/20",
                      "border border-cyan-500/30 hover:border-cyan-500/50",
                      "rounded-lg transition-all duration-200 text-white"
                    )}
                  >
                    <Database className="h-4 w-4 text-cyan-500" />
                    <span className="font-medium">Ver Tabela</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedIndicator(null)}
                    className="h-10 w-10 rounded-full border border-cyan-500/30 flex items-center justify-center text-white hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* METADADOS */}
              <div className="flex-shrink-0 grid grid-cols-3 md:grid-cols-6 gap-4 px-6 py-4 border-b border-cyan-500/20 bg-[#0A0A0F]">
                <div>
                  <span className="text-xs text-muted-foreground">Código</span>
                  <p className="font-mono text-sm text-white">{selectedIndicator?.code}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Unidade</span>
                  <p className="text-sm text-white">
                    {showMonetaryValues && isPmcIndicator(selectedIndicator?.code || '') 
                      ? 'R$' 
                      : (selectedIndicator?.unit || '-')}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Categoria</span>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {CATEGORIES[selectedIndicator?.category || ''] || selectedIndicator?.category || '-'}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Frequência</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3 text-cyan-500" />
                    <span className="text-sm text-white">{FREQUENCIES[selectedIndicator?.frequency || ''] || selectedIndicator?.frequency || '-'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Regional</span>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 text-cyan-500" />
                    <span className="text-sm text-white">{selectedIndicator?.is_regional ? 'Sim (por UF)' : 'Não (Brasil)'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">API Vinculada</span>
                  <p className="text-sm text-white truncate">{selectedIndicator?.api?.name || 'Nenhuma'}</p>
                </div>
              </div>

              {/* FOOTER / ANÁLISE */}
              {analysis && (
                <div className="flex-shrink-0 px-6 py-4 border-t border-cyan-500/20 bg-[#0D0D12] z-20 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatBadge
                      label="Média Móvel"
                      value={analysis.statistics.movingAverage !== null && analysis.statistics.movingAverage !== undefined
                        ? formatTableValue(analysis.statistics.movingAverage, selectedIndicator?.unit) 
                        : 'N/A'}
                      infoTitle="Média Móvel"
                      infoContent={
                        <p>
                          A <strong>média móvel</strong> suaviza flutuações de curto prazo 
                          para revelar a tendência subjacente. Uma série acima da média móvel 
                          sugere momento positivo; abaixo indica fraqueza.
                        </p>
                      }
                    />
                    <StatBadge
                      label="Desvio Padrão"
                      value={formatTableValue(analysis.statistics.stdDev, selectedIndicator?.unit)}
                      infoTitle="Desvio Padrão"
                      infoContent={
                        <p>
                          O <strong>desvio padrão</strong> mede a dispersão dos valores em 
                          relação à média. Um desvio alto indica maior volatilidade e risco; 
                          um desvio baixo sugere estabilidade.
                        </p>
                      }
                    />
                    <StatBadge
                      label="Coef. Variação"
                      value={`${analysis.statistics.coefficientOfVariation.toFixed(1)}%`}
                      infoTitle="Coeficiente de Variação"
                      infoContent={
                        <p>
                          O <strong>coeficiente de variação (CV)</strong> expressa o desvio 
                          padrão como percentual da média. CV abaixo de 15% indica baixa dispersão; 
                          entre 15-30% é moderada; acima de 30% é alta volatilidade.
                        </p>
                      }
                    />
                    <StatBadge
                      label="Tendência"
                      value={analysis.nextPeriodLabel}
                      trend={analysis.direction}
                      onInfoClick={() => setShowTrendModal(true)}
                    />
                  </div>

                  {suggestions.length > 0 && (
                    <div className="p-4 border border-cyan-500/20 rounded-lg bg-[#0D0D12] space-y-3">
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Info className="h-4 w-4 text-cyan-500" />
                        Sugestões de Análise
                      </h4>
                      {analysis.forecast && (
                        <div className="flex items-start gap-2 text-sm">
                          <Pin className="h-4 w-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-cyan-400 font-medium">VALOR ESTIMADO:</span>
                            <span className="text-white ml-2">
                              {formatTableValue(analysis.forecast.lower, selectedIndicator?.unit)} - {formatTableValue(analysis.forecast.upper, selectedIndicator?.unit)}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              para {analysis.nextPeriodLabel}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          {analysis.direction === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : analysis.direction === 'down' ? (
                            <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <Minus className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          )}
                          <span className="text-cyan-400 font-medium">TENDÊNCIA:</span>
                          <span className="text-white">
                            {analysis.direction === 'up' ? '↗ Alta' : analysis.direction === 'down' ? '↘ Queda' : '→ Estável'}
                            {analysis.strength === 'strong' ? ' Forte' : analysis.strength === 'weak' ? ' Leve' : ' Mod.'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <BarChart3 className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                          <span className="text-cyan-400 font-medium">INCERTEZA:</span>
                          <span className="text-white flex items-center gap-1">
                            {analysis.uncertainty === 'low' ? (
                              <><CheckCircle2 className="h-3 w-3 text-green-500" /> Baixa</>
                            ) : analysis.uncertainty === 'high' ? (
                              <><AlertTriangle className="h-3 w-3 text-red-500" /> Alta</>
                            ) : (
                              <><AlertTriangle className="h-3 w-3 text-yellow-500" /> Mod.</>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {stsData && (
                    <STSOutputPanel
                      data={stsData}
                      unit={selectedIndicator?.unit || null}
                      frequency={selectedIndicator?.frequency || null}
                      indicatorName={selectedIndicator?.name || ''}
                      onOpenAnalysis={handleOpenSTSView}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Trend Info Modal */}
      <TrendInfoModal open={showTrendModal} onClose={() => setShowTrendModal(false)} />
    </div>
  );
}

export default TableDatabaseTab;
