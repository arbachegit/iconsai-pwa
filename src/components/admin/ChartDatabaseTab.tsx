import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useDashboardAnalyticsSafe } from "@/contexts/DashboardAnalyticsContext";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseUntyped } from "@/integrations/supabase/typed-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatAxisDate, type Frequency } from "@/lib/date-formatters";
import { useTimeSeriesAnalysis, generateSuggestions } from "@/hooks/useTimeSeriesAnalysis";
import { runStructuralTimeSeries, STSResult } from "@/lib/structural-time-series";
import {
  linearRegression,
  standardDeviation,
  mean,
  movingAverage,
  detectTrend,
  coefficientOfVariation,
} from "@/lib/statistics-utils";


import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Database,
  Loader2,
  BarChart3,
  LineChartIcon,
  AreaChartIcon,
  RefreshCw,
  DollarSign,
  Percent,
  Hash,
  Activity,
  X,
  Calendar,
  Info,
  Brain,
  Lightbulb,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type DialogView = 'detail' | 'sts' | 'table';

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

// UF code to sigla/name mapping
const UF_CODE_MAP: Record<number, { uf_sigla: string; uf_name: string }> = {
  11: { uf_sigla: 'RO', uf_name: 'Rondônia' },
  12: { uf_sigla: 'AC', uf_name: 'Acre' },
  13: { uf_sigla: 'AM', uf_name: 'Amazonas' },
  14: { uf_sigla: 'RR', uf_name: 'Roraima' },
  15: { uf_sigla: 'PA', uf_name: 'Pará' },
  16: { uf_sigla: 'AP', uf_name: 'Amapá' },
  17: { uf_sigla: 'TO', uf_name: 'Tocantins' },
  21: { uf_sigla: 'MA', uf_name: 'Maranhão' },
  22: { uf_sigla: 'PI', uf_name: 'Piauí' },
  23: { uf_sigla: 'CE', uf_name: 'Ceará' },
  24: { uf_sigla: 'RN', uf_name: 'Rio Grande do Norte' },
  25: { uf_sigla: 'PB', uf_name: 'Paraíba' },
  26: { uf_sigla: 'PE', uf_name: 'Pernambuco' },
  27: { uf_sigla: 'AL', uf_name: 'Alagoas' },
  28: { uf_sigla: 'SE', uf_name: 'Sergipe' },
  29: { uf_sigla: 'BA', uf_name: 'Bahia' },
  31: { uf_sigla: 'MG', uf_name: 'Minas Gerais' },
  32: { uf_sigla: 'ES', uf_name: 'Espírito Santo' },
  33: { uf_sigla: 'RJ', uf_name: 'Rio de Janeiro' },
  35: { uf_sigla: 'SP', uf_name: 'São Paulo' },
  41: { uf_sigla: 'PR', uf_name: 'Paraná' },
  42: { uf_sigla: 'SC', uf_name: 'Santa Catarina' },
  43: { uf_sigla: 'RS', uf_name: 'Rio Grande do Sul' },
  50: { uf_sigla: 'MS', uf_name: 'Mato Grosso do Sul' },
  51: { uf_sigla: 'MT', uf_name: 'Mato Grosso' },
  52: { uf_sigla: 'GO', uf_name: 'Goiás' },
  53: { uf_sigla: 'DF', uf_name: 'Distrito Federal' },
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

interface Indicator {
  id: string;
  name: string;
  code: string;
  unit: string | null;
  category: string | null;
  frequency: string | null;
  api_id: string | null;
  is_regional?: boolean | null;
  api?: { id: string; name: string; provider: string | null } | null;
}

interface IndicatorValue {
  indicator_id: string;
  reference_date: string;
  value: number;
}

type ChartType = "line" | "bar" | "area";

const CHART_ICONS: Record<ChartType, React.ReactNode> = {
  line: <LineChartIcon className="h-4 w-4" />,
  bar: <BarChart3 className="h-4 w-4" />,
  area: <AreaChartIcon className="h-4 w-4" />,
};

// Category groups for organization
const CATEGORY_GROUPS = {
  financial: {
    title: 'Indicadores Financeiros Globais',
    icon: TrendingUp,
    codes: ['IPCA', 'IPCA_BCB', 'SELIC', 'SELIC_IPEADATA', 'SELIC_OVER', 'CDI', 'DOLAR', 'DOLAR_PTAX_COMPRA', 'PIB', 'NY.GDP.PCAP.PP.CD', '4099', 'POP_RESIDENTE']
  },
  renda: {
    title: 'Renda e Distribuição',
    icon: Activity,
    codes: ['RENDA_MEDIA', 'RENDA_MEDIA_UF', 'GINI', 'GINI_UF', 'RENDA_CLASSE_A', 'RENDA_CLASSE_B', 'RENDA_CLASSE_C', 'RENDA_CLASSE_D', 'RENDA_CLASSE_E']
  },
  pmc: {
    title: 'PMC - Pesquisa Mensal do Comércio',
    icon: BarChart3,
    codes: ['PMC', 'PMC_COMB', 'PMC_FARM', 'PMC_MOV', 'PMC_VEST', 'PMC_CONST', 'PMC_VEIC']
  },
  pmcRegional: {
    title: 'PMC - Pesquisa Mensal do Comércio (Regional)',
    icon: BarChart3,
    codes: [
      'PMC_COMB_UF', 'PMC_COMBUSTIVEIS_UF', 
      'PMC_FARM_UF', 'PMC_FARMACIA_UF',
      'PMC_MOV_UF', 'PMC_MOVEIS_UF',
      'PMC_VEST_UF', 'PMC_VESTUARIO_UF',
      'PMC_CONST_UF', 'PMC_CONSTRUCAO_UF',
      'PMC_VEIC_UF', 'PMC_VEICULOS_UF',
      'PMC_VAREJO_UF'
    ]
  },
  pac: {
    title: 'PAC - Pesquisa Anual do Comércio',
    icon: DollarSign,
    codes: ['PAC_TOTAL_RB_UF', 'PAC_VAREJO_RB_UF', 'PAC_ATACADO_RB_UF', 'PAC_VEICULOS_RB_UF', 'PAC_HIPER_RB_UF', 'PAC_COMBUSTIVEIS_RB_UF', 'PAC_ALIMENTOS_RB_UF', 'PAC_TECIDOS_RB_UF', 'PAC_INFORMATICA_RB_UF']
  }
};

// Format unit for display
function formatUnit(unit: string | null): { label: string; icon: React.ReactNode } {
  if (!unit) return { label: 'N/A', icon: <Hash className="h-3 w-3" /> };
  const u = unit.toLowerCase();
  // BRL e valores em Reais
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    return { label: 'R$', icon: <DollarSign className="h-3 w-3" /> };
  }
  // Dólar/USD
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

// Format large values with optional unit display
function formatValue(value: number, unit: string | null, includeUnit: boolean = false): string {
  const u = (unit || '').toLowerCase();
  const isIndex = u.includes('índice') || u.includes('base') || u.includes('index');
  
  // Valores em Reais (incluindo BRL)
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

// Format value for statistics display (with unit formatting like TableDatabaseTab)
function formatStatValue(value: number, unit: string | null): string {
  const u = (unit || '').toLowerCase();
  
  // Percentual: 2 casas decimais + símbolo %
  if (u.includes('%')) {
    return `${value.toFixed(2)}%`;
  }
  
  // Real/BRL: formato moeda
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  // Dólar/USD: formato moeda USD
  if (u.includes('us$') || u.includes('usd') || u.includes('dólar') || u.includes('dollar')) {
    return `$ ${value.toFixed(2)}`;
  }
  
  // Índice ou padrão: 2 casas decimais
  return value.toFixed(2);
}

export function ChartDatabaseTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [chartType, setChartType] = useState<ChartType>("line");
  const [showMovingAvg, setShowMovingAvg] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<{ count: number; date: Date } | null>(null);
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [currentView, setCurrentView] = useState<DialogView>('detail');
  const [showMonetaryValues, setShowMonetaryValues] = useState(false);
  
  // Global toggle for PMC Regional group with localStorage persistence
  const [pmcRegionalMonetaryMode, setPmcRegionalMonetaryMode] = useState(() => {
    const saved = localStorage.getItem('pmcRegionalMonetaryMode');
    return saved === 'true';
  });
  
  // Global toggle for PMC National group with localStorage persistence
  const [pmcNationalMonetaryMode, setPmcNationalMonetaryMode] = useState(() => {
    const saved = localStorage.getItem('pmcNationalMonetaryMode');
    return saved === 'true';
  });
  
  // Persist PMC Regional monetary mode to localStorage
  useEffect(() => {
    localStorage.setItem('pmcRegionalMonetaryMode', pmcRegionalMonetaryMode.toString());
  }, [pmcRegionalMonetaryMode]);
  
  // Persist PMC National monetary mode to localStorage
  useEffect(() => {
    localStorage.setItem('pmcNationalMonetaryMode', pmcNationalMonetaryMode.toString());
  }, [pmcNationalMonetaryMode]);

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Dashboard analytics context (safe - returns null if not in provider)
  const dashboardAnalytics = useDashboardAnalyticsSafe();

  // Fetch indicators with API linkage
  const { data: indicators = [], isLoading: loadingIndicators, refetch: refetchIndicators } = useQuery({
    queryKey: ["indicators-chart-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economic_indicators")
        .select("id, name, code, unit, category, frequency, api_id, is_regional, system_api_registry(id, name, provider)")
        .or('api_id.not.is.null,code.in.(RENDA_CLASSE_A,RENDA_CLASSE_B,RENDA_CLASSE_C,RENDA_CLASSE_D,RENDA_CLASSE_E)')
        .order("name");
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        api: item.system_api_registry || null,
      })) as Indicator[];
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  // Fetch indicator values only for selected indicator (lazy loading)
  const { data: selectedIndicatorValues = [], isLoading: loadingValues, refetch: refetchValues } = useQuery({
    queryKey: ["indicator-values-chart-db", selectedIndicator?.id],
    queryFn: async () => {
      if (!selectedIndicator) return [];
      
      const allData: IndicatorValue[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("indicator_values")
          .select("indicator_id, reference_date, value")
          .eq("indicator_id", selectedIndicator.id)
          .order("reference_date")
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
    enabled: !!selectedIndicator,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });

  // Fetch regional values only for selected indicator (lazy loading) - with UF info
  const { data: selectedRegionalValues = [] } = useQuery({
    queryKey: ["regional-values-chart-db", selectedIndicator?.id, "v2-uf"],
    queryFn: async () => {
      if (!selectedIndicator) return [];
      
      const allData: Array<{ indicator_id: string; reference_date: string; value: number; uf_code: number; brazilian_ufs: { uf_sigla: string; uf_name: string } | null }> = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("indicator_regional_values")
          .select("indicator_id, reference_date, value, uf_code, brazilian_ufs!inner(uf_sigla, uf_name)")
          .eq("indicator_id", selectedIndicator.id)
          .order("reference_date")
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...(data as any));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
    enabled: !!selectedIndicator,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });

  // Fetch PMC monetary values for conversion toggle (supports both regional and national) - with full pagination
  const { data: pmcMonetaryValues = [] } = useQuery({
    queryKey: ["pmc-monetary-values-chart", selectedIndicator?.code, "v4-aggregated"],
    queryFn: async () => {
      if (!selectedIndicator || !isPmcIndicator(selectedIndicator.code)) return [];
      
      const isNational = isPmcNationalIndicator(selectedIndicator.code);
      const allData: { reference_date: string; uf_code: number; valor_estimado_reais: number | null }[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      // For national indicators, use the regional equivalent code to aggregate
      const queryCode = isNational 
        ? PMC_NATIONAL_TO_REGIONAL_MAP[selectedIndicator.code] || selectedIndicator.code
        : selectedIndicator.code;
      
      while (hasMore) {
        // Always fetch regional data (uf_code > 0) and aggregate in frontend for nationals
        const { data, error } = await supabaseUntyped
          .from("pmc_valores_reais")
          .select("reference_date, uf_code, valor_estimado_reais")
          .eq("pmc_indicator_code", queryCode)
          .gt("uf_code", 0)
          .order("reference_date")
          .range(from, from + pageSize - 1);
        if (error) throw error;

        if (data && data.length > 0) {
          allData.push(...(data as { reference_date: string; uf_code: number; valor_estimado_reais: number }[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
    enabled: !!selectedIndicator && isPmcIndicator(selectedIndicator?.code || ''),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch PAC estimated values (2024-2025) for PAC indicators
  const { data: pacEstimatedValues = [] } = useQuery({
    queryKey: ["pac-estimated-values-chart", selectedIndicator?.id, selectedIndicator?.code],
    queryFn: async () => {
      if (!selectedIndicator || !isPacIndicator(selectedIndicator.code)) return [];
      
      const { data, error } = await supabase
        .from("pac_valores_estimados")
        .select("reference_date, valor_estimado, uf_code")
        .eq("pac_indicator_code", selectedIndicator.code)
        .order("reference_date");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedIndicator && isPacIndicator(selectedIndicator?.code || ''),
  });

  const { data: indicatorStats = {}, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ["indicator-stats-chart-db"],
    queryFn: async () => {
      const { data, error } = await supabaseUntyped
        .from("indicator_stats_summary")
        .select("indicator_id, total_count, min_date, max_date, last_value");

      if (error) throw error;

      const stats: Record<string, { count: number; min: string; max: string; lastValue: number }> = {};

      (data || []).forEach((row: any) => {
        stats[row.indicator_id] = {
          count: row.total_count,
          min: row.min_date,
          max: row.max_date,
          lastValue: row.last_value,
        };
      });

      return stats;
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds cache (reduced for faster updates)
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all related caches first
      await queryClient.invalidateQueries({ queryKey: ["indicator-stats-chart-db"] });
      await queryClient.invalidateQueries({ queryKey: ["pmc-monetary-values-chart"] });
      await Promise.all([refetchIndicators(), refetchValues(), refetchStats()]);
      const totalCount = Object.values(indicatorStats).reduce((sum, stat) => sum + (stat?.count || 0), 0);
      setLastUpdate({ count: totalCount, date: new Date() });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Force refetch PMC monetary values when toggle changes
  useEffect(() => {
    if (selectedIndicator && isPmcIndicator(selectedIndicator.code)) {
      queryClient.invalidateQueries({ queryKey: ["pmc-monetary-values-chart", selectedIndicator.code] });
    }
  }, [showMonetaryValues, selectedIndicator?.code, queryClient]);

  // Combined values from selected indicator (national + regional)
  const combinedValues = useMemo(() => {
    return [...selectedIndicatorValues, ...selectedRegionalValues];
  }, [selectedIndicatorValues, selectedRegionalValues]);

  // Filter indicators by search and only show those with data
  const filteredIndicators = useMemo(() => {
    let filtered = indicators.filter(i => indicatorStats[i.id]?.count > 0);
    
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
  }, [indicators, searchQuery, indicatorStats]);

  // Group indicators by category
  const groupedIndicators = useMemo(() => {
    const groups: Record<string, Indicator[]> = {};
    
    Object.entries(CATEGORY_GROUPS).forEach(([key, group]) => {
      const groupItems = filteredIndicators.filter(i => group.codes.includes(i.code));
      if (groupItems.length > 0) {
        groups[key] = groupItems;
      }
    });
    
    // Add "Outros" group for uncategorized indicators
    const categorizedCodes = Object.values(CATEGORY_GROUPS).flatMap(g => g.codes);
    const uncategorized = filteredIndicators.filter(i => !categorizedCodes.includes(i.code));
    if (uncategorized.length > 0) {
      groups['outros'] = uncategorized;
    }
    
    return groups;
  }, [filteredIndicators]);

  // Get data for selected indicator (with monetary value support)
  const selectedData = useMemo(() => {
    if (!selectedIndicator) return [];
    
    // Use monetary values if toggle is on and we have PMC data (regional or national)
    if (showMonetaryValues && isPmcIndicator(selectedIndicator.code) && pmcMonetaryValues.length > 0) {
      const isNational = isPmcNationalIndicator(selectedIndicator.code);
      
      // Both national and regional now use regional data - aggregate by date for national, show individual for regional charts
      if (isNational) {
        // National PMC: aggregate all UF values by date to get Brazil total
        const aggregated: Record<string, number> = {};
        pmcMonetaryValues.forEach((v: any) => {
          const date = v.reference_date;
          if (!aggregated[date]) aggregated[date] = 0;
          aggregated[date] += v.valor_estimado_reais || 0;
        });
        
        return Object.entries(aggregated)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, value]) => ({
            date: date.substring(0, 7).split('-').reverse().join('/'),
            value,
            rawDate: date,
          }));
      }
      
      // Regional PMC: aggregate by date for chart display (sum across UFs)
      const aggregated: Record<string, number> = {};
      pmcMonetaryValues.forEach((v: any) => {
        const date = v.reference_date;
        if (!aggregated[date]) aggregated[date] = 0;
        aggregated[date] += v.valor_estimado_reais || 0;
      });
      
      return Object.entries(aggregated)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({
          date: date.substring(0, 7).split('-').reverse().join('/'),
          value,
          rawDate: date,
        }));
    }
    
    // PAC indicators: show base values, optionally add estimated values (2024-2025) when toggle is ON
    if (isPacIndicator(selectedIndicator.code)) {
      // Aggregate BASE values by date (sum across UFs)
      const baseAggregated: Record<string, number> = {};
      combinedValues
        .filter((v) => v.indicator_id === selectedIndicator.id)
        .forEach((v) => {
          const date = v.reference_date;
          if (!baseAggregated[date]) baseAggregated[date] = 0;
          baseAggregated[date] += v.value || 0;
        });
      
      const baseValues = Object.entries(baseAggregated).map(([date, value]) => ({
        date: date.substring(0, 4),
        value,
        rawDate: date,
      }));
      
      // If toggle ON and we have estimated values, add them
      if (showMonetaryValues && pacEstimatedValues.length > 0) {
        const aggregated: Record<string, number> = {};
        pacEstimatedValues.forEach((v: any) => {
          const date = v.reference_date;
          if (!aggregated[date]) aggregated[date] = 0;
          aggregated[date] += v.valor_estimado || 0;
        });
        
        const estimatedValues = Object.entries(aggregated).map(([date, value]) => ({
          date: date.substring(0, 4),
          value,
          rawDate: date,
        }));
        
        // Combine and sort by date
        return [...baseValues, ...estimatedValues]
          .sort((a, b) => a.rawDate.localeCompare(b.rawDate));
      }
      
      // Toggle OFF: only base values
      return baseValues.sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    }
    
    // Default: use index values
    return combinedValues
      .filter((v) => v.indicator_id === selectedIndicator.id)
      .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
      .map((v) => ({
        date: v.reference_date.substring(0, 7).split('-').reverse().join('/'),
        value: v.value,
        rawDate: v.reference_date,
      }));
  }, [selectedIndicator, combinedValues, showMonetaryValues, pmcMonetaryValues, pacEstimatedValues]);

  // Table data - preserves individual UF records without aggregation for regional display
  const tableData = useMemo(() => {
    if (!selectedIndicator) return [];
    
    const isRegional = selectedIndicator.is_regional || isPmcRegionalIndicator(selectedIndicator.code);
    
    // PMC monetary regional: use raw pmcMonetaryValues with UF mapping
    if (showMonetaryValues && isPmcRegionalIndicator(selectedIndicator.code) && pmcMonetaryValues.length > 0) {
      return pmcMonetaryValues
        .filter((v: any) => v.uf_code > 0)
        .sort((a: any, b: any) => b.reference_date.localeCompare(a.reference_date))
        .map((v: any) => ({
          reference_date: v.reference_date,
          value: v.valor_estimado_reais || 0,
          brazilian_ufs: UF_CODE_MAP[v.uf_code] || null,
        }));
    }
    
    // Regional indicators (index mode): use selectedRegionalValues with UF info
    if (isRegional && selectedRegionalValues.length > 0) {
      return selectedRegionalValues
        .sort((a: any, b: any) => a.reference_date.localeCompare(b.reference_date))
        .map((v: any) => ({
          reference_date: v.reference_date,
          value: v.value,
          brazilian_ufs: v.brazilian_ufs || UF_CODE_MAP[v.uf_code] || null,
        }));
    }
    
    // National/default: use selectedData (no UF)
    return selectedData
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .map((v) => ({
        reference_date: v.rawDate,
        value: v.value,
        brazilian_ufs: null,
      }));
  }, [selectedIndicator, selectedData, selectedRegionalValues, showMonetaryValues, pmcMonetaryValues]);

  const statistics = useMemo(() => {
    if (selectedData.length === 0) return null;

    const values = selectedData.map((d) => d.value);
    const x = values.map((_, i) => i);
    const regression = linearRegression(x, values);
    const trend = detectTrend(regression.slope);
    const stdDev = standardDeviation(values);
    const avg = mean(values);
    const cv = coefficientOfVariation(values);
    const movAvg = movingAverage(values, 3);

    const trendLineData = selectedData.map((d, i) => ({
      ...d,
      trendLine: regression.slope * i + regression.intercept,
      movingAvg: movAvg[i - 2] || null,
    }));

    return {
      mean: avg,
      stdDev,
      cv,
      min: Math.min(...values),
      max: Math.max(...values),
      trend,
      slope: regression.slope,
      r2: regression.r2,
      trendLineData,
    };
  }, [selectedData]);

  // Generate suggestions based on statistics
  const suggestions = useMemo(() => {
    if (!statistics) return [];
    const result: string[] = [];

    if (statistics.cv > 30) {
      result.push("📊 Alta variabilidade detectada. Considere analisar períodos específicos ou fatores externos.");
    }
    if (statistics.r2 > 0.7) {
      result.push("📈 Tendência clara identificada (R² > 70%). Considere projeções futuras.");
    }
    if (statistics.trend === "down" && statistics.slope < -0.1) {
      result.push("⚠️ Tendência de queda significativa. Investigue causas e compare com indicadores correlacionados.");
    }
    if (statistics.trend === "up" && statistics.slope > 0.1) {
      result.push("✅ Tendência de crescimento sustentado. Analise se é compatível com expectativas do mercado.");
    }
    if (statistics.stdDev > statistics.mean * 0.5) {
      result.push("🔄 Desvio padrão alto relativo à média. Verifique sazonalidade ou eventos atípicos.");
    }

    return result;
  }, [statistics]);

  // Calculate STS for selected indicator
  const stsData = useMemo<STSResult | null>(() => {
    if (!selectedData || selectedData.length < 10) return null;
    
    const timeSeries = selectedData.map(d => ({
      date: d.rawDate,
      value: d.value
    }));
    
    // Detect frequency based on data pattern
    const frequency: 'daily' | 'monthly' = selectedIndicator?.frequency === 'daily' ? 'daily' : 'monthly';
    
    return runStructuralTimeSeries(timeSeries, frequency);
  }, [selectedData, selectedIndicator?.frequency]);

  // Calculate current value and moving average for STS analysis view
  const stsAnalysisProps = useMemo(() => {
    if (!statistics || !selectedData || selectedData.length === 0) return null;
    
    const values = selectedData.map(d => d.value);
    const currentValue = values[values.length - 1]; // Last value in time series
    const maValues = movingAverage(values, 3);
    const latestMA = maValues[maValues.length - 1] || statistics.mean;
    
    return {
      currentValue,
      movingAverage: latestMA,
    };
  }, [statistics, selectedData]);

  // Stable ref to avoid dashboardAnalytics in useEffect dependencies (prevents infinite loops)
  const dashboardAnalyticsRef = useRef(dashboardAnalytics);
  useEffect(() => {
    dashboardAnalyticsRef.current = dashboardAnalytics;
  }, [dashboardAnalytics]);

  // Emit context to DashboardAnalyticsContext when indicator is selected (SINGLE useEffect - no duplicates)
  useEffect(() => {
    const analytics = dashboardAnalyticsRef.current;
    if (!analytics) return;

    if (selectedIndicator && statistics && selectedData.length > 0) {
      // Limit data to last 50 records to avoid payload bloat
      const limitedData = selectedData.slice(-50).map(d => ({
        date: d.date,
        value: d.value,
      }));
      
      const contextData = {
        indicatorId: selectedIndicator.id,
        indicatorName: selectedIndicator.name,
        indicatorCode: selectedIndicator.code,
        chartType,
        frequency: selectedIndicator.frequency,
        unit: selectedIndicator.unit,
        periodStart: selectedData[0].date,
        periodEnd: selectedData[selectedData.length - 1].date,
        totalRecords: selectedData.length,
        data: limitedData,
        statistics: {
          mean: statistics.mean,
          stdDev: statistics.stdDev,
          cv: statistics.cv,
          min: statistics.min,
          max: statistics.max,
          trend: statistics.trend,
          slope: statistics.slope,
          r2: statistics.r2,
        },
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
    } else {
      analytics.setChartContext(null);
    }
  }, [selectedIndicator, statistics, selectedData, chartType, stsData]); // NO dashboardAnalytics dependency!

  // Handlers for view switching
  const handleOpenStsAnalysis = useCallback(() => setCurrentView('sts'), []);
  const handleViewTable = useCallback(() => setCurrentView('table'), []);
  const handleBackToDetail = useCallback(() => setCurrentView('detail'), []);
  const handleCloseModal = useCallback(() => {
    setSelectedIndicator(null);
    setCurrentView('detail');
  }, []);

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

  if (loadingIndicators || loadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render indicator card with knowyou-indicator-card class
  const renderIndicatorCard = (indicator: Indicator) => {
    const stats = indicatorStats[indicator.id];
    if (!stats) return null;
    
    const unitInfo = formatUnit(indicator.unit);
    const minDate = format(new Date(stats.min), "MM/yy");
    const maxDate = format(new Date(stats.max), "MM/yy");
    const u = (indicator.unit || '').toLowerCase();
    const isIndex = u.includes('índice') || u.includes('base') || u.includes('index');

    return (
      <div
        key={indicator.id}
        className="knowyou-indicator-card"
        onClick={() => setSelectedIndicator(indicator)}
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
        {/* Horizontal title */}
        <h3 className="font-semibold text-sm mb-3 line-clamp-2 min-h-[40px]">
          {indicator.name}
        </h3>
        
        {/* 2x2 Badge grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Unit badge with label */}
          <div className="flex flex-col items-center justify-center border border-primary/20 rounded-md py-1.5 bg-muted/30">
            <span className="text-[9px] text-muted-foreground uppercase">Unidade</span>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary/50">
                {unitInfo.icon}
              </div>
              <span className="text-xs font-medium">{unitInfo.label}</span>
            </div>
          </div>
          
          {/* Period badge with label */}
          <div className="flex flex-col items-center justify-center border border-primary/20 rounded-md py-1.5 bg-muted/30">
            <span className="text-[9px] text-muted-foreground uppercase">Período</span>
            <span className="text-xs font-medium">{minDate} - {maxDate}</span>
          </div>
          
          {/* Records badge with label */}
          <div className="flex flex-col items-center justify-center border border-primary/20 rounded-md py-1.5 bg-secondary/30">
            <span className="text-[9px] text-muted-foreground uppercase">Registros</span>
            <div className="flex items-center gap-1">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary/50">
                <Database className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium">{stats.count.toLocaleString()}</span>
            </div>
          </div>
          
          {/* Last value badge with label and unit */}
          <div className="flex flex-col items-center justify-center border border-primary/30 rounded-md py-1.5 bg-primary/10">
            <span className="text-[9px] text-muted-foreground uppercase">Último Valor</span>
            <span className="text-xs font-bold text-primary">
              {formatValue(stats.lastValue, indicator.unit, !isIndex)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Chart DataSet
          </h2>
          <p className="text-muted-foreground">
            Visualização detalhada e análise estatística de indicadores
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              {lastUpdate.count.toLocaleString()} registros • {lastUpdate.date.toLocaleDateString('pt-BR')} {lastUpdate.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <div className="knowyou-header-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Chart DataSet</h2>
              <p className="text-sm text-muted-foreground">
                Visualização detalhada e análise estatística de indicadores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                {lastUpdate.count.toLocaleString()} registros • {format(lastUpdate.date, "dd/MM/yyyy HH:mm")}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2 knowyou-badge">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Period Metric */}
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
              ) : (
                'Não definido'
              )}
            </div>
          </div>

          {/* Frequency Metric */}
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
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Total Series Metric */}
          <div className="knowyou-metric-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm">Total de Séries</span>
            </div>
            <div className="font-semibold text-lg">
              {filteredIndicators.length} indicadores
            </div>
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
          const isPmcRegionalGroup = key === 'pmcRegional';
          const isPmcNationalGroup = key === 'pmc';

          // Determine which toggle to show based on group
          const showToggle = isPmcRegionalGroup || isPmcNationalGroup;
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
                // For PMC Regional or PMC National group, apply global monetary mode when opening detail
                if (isPmcRegionalGroup || isPmcNationalGroup) {
                  const stats = indicatorStats[indicator.id];
                  if (!stats) return null;
                  
                  const unitInfo = formatUnit(indicator.unit);
                  const minDate = format(new Date(stats.min), "MM/yy");
                  const maxDate = format(new Date(stats.max), "MM/yy");
                  const u = (indicator.unit || '').toLowerCase();
                  const isIndex = u.includes('índice') || u.includes('base') || u.includes('index');
                  const currentToggleMode = isPmcRegionalGroup ? pmcRegionalMonetaryMode : pmcNationalMonetaryMode;

                  return (
                    <div
                      key={indicator.id}
                      className="knowyou-indicator-card"
                      onClick={() => {
                        setShowMonetaryValues(currentToggleMode);
                        setSelectedIndicator(indicator);
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
                      <h3 className="font-semibold text-sm mb-3 line-clamp-2 min-h-[40px]">
                        {indicator.name}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col items-center justify-center border border-primary/20 rounded-md py-1.5 bg-muted/30">
                          <span className="text-[9px] text-muted-foreground uppercase">Unidade</span>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary/50">
                              {unitInfo.icon}
                            </div>
                            <span className="text-xs font-medium">{unitInfo.label}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center border border-primary/20 rounded-md py-1.5 bg-muted/30">
                          <span className="text-[9px] text-muted-foreground uppercase">Período</span>
                          <span className="text-xs font-medium">{minDate} - {maxDate}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center border border-primary/20 rounded-md py-1.5 bg-secondary/30">
                          <span className="text-[9px] text-muted-foreground uppercase">Registros</span>
                          <div className="flex items-center gap-1">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary/50">
                              <Database className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <span className="text-xs font-medium">{stats.count.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center border border-primary/30 rounded-md py-1.5 bg-primary/10">
                          <span className="text-[9px] text-muted-foreground uppercase">Último Valor</span>
                          <span className="text-xs font-bold text-primary">
                            {formatValue(stats.lastValue, indicator.unit, !isIndex)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return renderIndicatorCard(indicator);
              })}
            </CollapsibleGroup>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedIndicator} onOpenChange={handleCloseModal} modal={false}>
        <DialogContent 
          className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* STS Analysis View */}
          {currentView === 'sts' && selectedIndicator && stsData && statistics && stsAnalysisProps && (
            <STSAnalysisContent
              onBack={handleBackToDetail}
              indicatorName={selectedIndicator.name}
              unit={selectedIndicator.unit}
              frequency={selectedIndicator.frequency}
              stsData={stsData}
              statistics={{
                mean: statistics.mean,
                movingAverage: stsAnalysisProps.movingAverage,
                stdDev: statistics.stdDev,
                coefficientOfVariation: statistics.cv,
              }}
              currentValue={stsAnalysisProps.currentValue}
            />
          )}

          {currentView === 'table' && selectedIndicator && (
            <TableDataContent
              onBack={handleBackToDetail}
              indicatorName={selectedIndicator.name + (showMonetaryValues ? ' (R$)' : '')}
              indicatorCode={selectedIndicator.code}
              isRegional={selectedIndicator.is_regional || isPmcRegionalIndicator(selectedIndicator.code)}
              data={tableData}
              unit={showMonetaryValues ? 'R$ (mil)' : (selectedIndicator.unit || null)}
              frequency={selectedIndicator.frequency || null}
              isLoading={loadingValues}
              isMonetaryMode={showMonetaryValues}
            />
          )}

          {/* Detail View */}
          {currentView === 'detail' && (
            <>
              {/* Custom Header */}
              <div className="flex items-center justify-between p-6 pb-4 border-b sticky top-0 bg-background z-10">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{selectedIndicator?.name}</h2>
                      {selectedIndicator?.api?.provider && (
                        <Badge 
                          variant="outline" 
                          className={getProviderColor(selectedIndicator.api.provider)}
                        >
                          {selectedIndicator.api.provider}
                        </Badge>
                      )}
                      {(selectedIndicator?.unit || showMonetaryValues) && (
                        <Badge variant="secondary">
                          {showMonetaryValues && isPmcIndicator(selectedIndicator?.code || '') 
                            ? 'R$' 
                            : selectedIndicator?.unit}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {selectedData.length} registros
                    </span>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2">
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
                    onClick={handleViewTable}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg transition-all duration-200 text-foreground"
                  >
                    <Database className="h-4 w-4 text-cyan-500" />
                    <span className="font-medium text-sm">Ver Tabela</span>
                  </button>
                  
                  {/* Circular X button with red hover */}
                  <button
                    onClick={handleCloseModal}
                    className="h-10 w-10 rounded-full border border-cyan-500/50 flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

          {selectedIndicator && statistics && (
            <div className="p-6 space-y-6">
              {/* Chart Type Selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Tipo de Gráfico:</span>
                <div className="flex gap-2">
                  {(["line", "bar", "area"] as ChartType[]).map((type) => (
                    <Button
                      key={type}
                      variant={chartType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartType(type)}
                      className="gap-2"
                    >
                      {CHART_ICONS[type]}
                      {type === "line" ? "Linha" : type === "bar" ? "Barras" : "Área"}
                    </Button>
                  ))}
                </div>
                <Button
                  variant={showMovingAvg ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMovingAvg(!showMovingAvg)}
                >
                  Média Móvel
                </Button>
              </div>

              {/* Chart */}
              <Card>
                <CardContent className="pt-4">
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "line" ? (
                        <LineChart data={statistics.trendLineData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => [
                              formatStatValue(
                                value, 
                                showMonetaryValues && isPmcIndicator(selectedIndicator?.code || '') 
                                  ? 'R$' 
                                  : selectedIndicator?.unit
                              ), 
                              "Valor"
                            ]}
                            labelFormatter={(label) => `Data: ${label}`}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="value"
                            name="Valor"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="trendLine"
                            name="Tendência"
                            stroke="hsl(var(--destructive))"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                          />
                          {showMovingAvg && (
                            <Line
                              type="monotone"
                              dataKey="movingAvg"
                              name="Média Móvel (3)"
                              stroke="#22c55e"
                              strokeWidth={1.5}
                              dot={false}
                            />
                          )}
                          <ReferenceLine y={statistics.mean} stroke="#888" strokeDasharray="3 3" />
                        </LineChart>
                      ) : chartType === "bar" ? (
                        <BarChart data={statistics.trendLineData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => [
                              formatStatValue(
                                value, 
                                showMonetaryValues && isPmcIndicator(selectedIndicator?.code || '') 
                                  ? 'R$' 
                                  : selectedIndicator?.unit
                              ), 
                              "Valor"
                            ]}
                            labelFormatter={(label) => `Data: ${label}`}
                          />
                          <Legend />
                          <Bar dataKey="value" name="Valor" fill="hsl(var(--primary))" />
                          <ReferenceLine y={statistics.mean} stroke="#888" strokeDasharray="3 3" />
                        </BarChart>
                      ) : (
                        <AreaChart data={statistics.trendLineData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => [
                              formatStatValue(
                                value, 
                                showMonetaryValues && isPmcIndicator(selectedIndicator?.code || '') 
                                  ? 'R$' 
                                  : selectedIndicator?.unit
                              ), 
                              "Valor"
                            ]}
                            labelFormatter={(label) => `Data: ${label}`}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="value"
                            name="Valor"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.3}
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                          />
                          <ReferenceLine y={statistics.mean} stroke="#888" strokeDasharray="3 3" />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Panel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Média</p>
                    <p className="text-xl font-bold">{formatStatValue(statistics.mean, selectedIndicator?.unit)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Desvio Padrão</p>
                    <p className="text-xl font-bold">{formatStatValue(statistics.stdDev, selectedIndicator?.unit)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Coef. Variação</p>
                    <p className="text-xl font-bold">{statistics.cv.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Tendência</p>
                    <div className="flex items-center justify-center gap-1">
                      {statistics.trend === "up" && <TrendingUp className="h-5 w-5 text-green-500" />}
                      {statistics.trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
                      {statistics.trend === "stable" && <Minus className="h-5 w-5 text-gray-500" />}
                      <span className="font-bold">
                        {statistics.trend === "up" ? "Alta" : statistics.trend === "down" ? "Baixa" : "Estável"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Análise de Tendência - com Sugestões de Análise movidas para cá */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Análise de Tendência
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Mínimo:</span>
                      <span className="ml-2 font-medium">{formatStatValue(statistics.min, selectedIndicator?.unit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Máximo:</span>
                      <span className="ml-2 font-medium">{formatStatValue(statistics.max, selectedIndicator?.unit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coef. Angular:</span>
                      <span className={`ml-2 font-medium ${statistics.slope > 0 ? "text-green-500" : statistics.slope < 0 ? "text-red-500" : ""}`}>
                        {statistics.slope.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">R²:</span>
                      <span className="ml-2 font-medium">{(statistics.r2 * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Sugestões de Análise - movidas para dentro de Análise de Tendência */}
                  {suggestions.length > 0 && (
                    <div className="pt-3 border-t border-border/50">
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-green-500" />
                        Sugestões de Análise
                      </h4>
                      <ul className="space-y-1">
                        {suggestions.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Saída do Modelo STS (State-Space) - com botão Ver Análise Completa */}
              {stsData && (
                <STSOutputPanel
                  data={stsData}
                  unit={selectedIndicator?.unit || null}
                  frequency={selectedIndicator?.frequency || null}
                  indicatorName={selectedIndicator?.name || ''}
                  onOpenAnalysis={handleOpenStsAnalysis}
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

export default ChartDatabaseTab;
