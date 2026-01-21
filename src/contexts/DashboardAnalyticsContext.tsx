import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { RefreshCw, BarChart3, TrendingUp, Search, ClipboardList } from "lucide-react";
import { logger } from "@/lib/logger";
import { getMemoryStats, checkAndCleanup } from "@/lib/memory-monitor";

// MEMORY OPTIMIZATION CONSTANTS
const MAX_RECORDS_PER_STATE = 12; // Only 1 year of monthly data
const MAX_HISTORY_ITEMS = 5; // Reduced from 10
const MAX_DATA_IN_PROMPT = 12; // Limit data in prompts

export interface RegionalContext {
  ufSigla: string;
  ufName: string;
  researchName: string;
  researchId: string;
  unit: string; // Unit for values (e.g., "R$ mil", "índice", "%")
  trend: 'up' | 'down' | 'stable';
  lastValue: number | null;
  lastDate: string | null;
  recordCount: number;
  // Raw data for chart generation (limited to avoid payload bloat)
  data?: Array<{ date: string; value: number }>;
}

export interface ChartContext {
  // Identification
  indicatorId: string;
  indicatorName: string;
  indicatorCode: string;
  
  // Type and period
  chartType: 'line' | 'bar' | 'area';
  frequency: string | null;
  unit: string | null;
  periodStart: string;
  periodEnd: string;
  totalRecords: number;
  
  // Raw data for chart generation (limited to avoid payload bloat)
  data: Array<{ date: string; value: number }>;
  
  // Basic statistics
  statistics: {
    mean: number;
    stdDev: number;
    cv: number;
    min: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
    slope: number;
    r2: number;
  } | null;
  
  // STS Result (Structural Time Series)
  stsResult: {
    mu_smoothed: number;
    beta_smoothed: number;
    direction: string;
    strength: string;
    forecast: {
      mean: number;
      p05: number;
      p95: number;
    };
  } | null;
}

// History item for comparison support
export interface ContextHistoryItem {
  id: string;
  type: 'chart' | 'regional';
  timestamp: Date;
  label: string;
  context: ChartContext | RegionalContext;
}

export interface DashboardAnalyticsContextType {
  // Current state
  activeTab: string;
  chartContext: ChartContext | null;
  selectedUF: string | null;
  regionalContext: RegionalContext | null;
  
  // Pre-loaded data for all states (enables comparisons)
  allStatesData: Record<string, RegionalContext> | null;
  
  // History for comparisons
  contextHistory: ContextHistoryItem[];
  
  // Setters
  setActiveTab: (tab: string) => void;
  setChartContext: (ctx: ChartContext | null) => void;
  setSelectedUF: (uf: string | null) => void;
  setRegionalContext: (ctx: RegionalContext | null) => void;
  setAllStatesData: (data: Record<string, RegionalContext> | null) => void;
  
  // History management
  addToHistory: (item: Omit<ContextHistoryItem, 'id' | 'timestamp'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  
  // Context prompt generator
  buildContextualSystemPrompt: () => string;
  // Contextual suggestions generator - returns objects with icon and text
  buildContextualSuggestions: () => Array<{ icon: string; text: string }>;
  hasContext: boolean;
}

const DashboardAnalyticsContext = createContext<DashboardAnalyticsContextType | null>(null);

interface DashboardAnalyticsProviderProps {
  children: ReactNode;
}

export function DashboardAnalyticsProvider({ children }: DashboardAnalyticsProviderProps) {
  const [activeTab, setActiveTab] = useState<string>("indicators");
  const [chartContext, setChartContext] = useState<ChartContext | null>(null);
  const [selectedUF, setSelectedUF] = useState<string | null>(null);
  const [regionalContext, setRegionalContext] = useState<RegionalContext | null>(null);
  const [allStatesData, setAllStatesData] = useState<Record<string, RegionalContext> | null>(null);
  const [contextHistory, setContextHistory] = useState<ContextHistoryItem[]>([]);

  // MEMORY OPTIMIZATION: Cleanup when leaving analytics-uf tab
  useEffect(() => {
    if (activeTab !== 'analytics-uf') {
      // Clear heavy data when not in the regional analytics tab
      setAllStatesData(null);
    }
  }, [activeTab]);

  // MEMORY OPTIMIZATION: Limit allStatesData records per state with memory check
  const setAllStatesDataOptimized = useCallback((data: Record<string, RegionalContext> | null) => {
    if (!data) {
      setAllStatesData(null);
      logger.perf('Cleared allStatesData');
      return;
    }
    
    // Check memory before setting large data
    const memStats = getMemoryStats();
    if (memStats?.isCritical) {
      logger.memoryWarning(memStats.usedJSHeapSize, memStats.jsHeapSizeLimit);
      checkAndCleanup();
    }
    
    // Limit records per state to MAX_RECORDS_PER_STATE
    const optimizedData: Record<string, RegionalContext> = {};
    Object.entries(data).forEach(([sigla, ctx]) => {
      optimizedData[sigla] = {
        ...ctx,
        data: ctx.data?.slice(-MAX_RECORDS_PER_STATE), // Keep only last N records
      };
    });
    
    logger.perf('setAllStatesData', { 
      stateCount: Object.keys(optimizedData).length,
      memoryWarning: memStats?.isWarning 
    });
    
    setAllStatesData(optimizedData);
  }, []);

  const hasContext = !!chartContext || !!regionalContext;

  // History management functions with MEMORY OPTIMIZATION
  const addToHistory = useCallback((item: Omit<ContextHistoryItem, 'id' | 'timestamp'>) => {
    setContextHistory(prev => {
      // Check if this item is already in history (by label AND type to prevent duplicates)
      const exists = prev.some(h => h.label === item.label && h.type === item.type);
      if (exists) return prev;
      
      // MEMORY OPTIMIZATION: Store only metadata, not full data arrays
      const optimizedContext = item.type === 'regional' 
        ? {
            ...(item.context as RegionalContext),
            data: (item.context as RegionalContext).data?.slice(-MAX_RECORDS_PER_STATE), // Limit data
          }
        : {
            ...(item.context as ChartContext),
            data: (item.context as ChartContext).data?.slice(-MAX_DATA_IN_PROMPT), // Limit data
          };
      
      const newItem: ContextHistoryItem = {
        ...item,
        context: optimizedContext,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };
      
      // Add to beginning, limit to MAX_HISTORY_ITEMS (reduced to 5)
      const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
      return updated;
    });
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setContextHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setContextHistory([]);
  }, []);

  const buildContextualSystemPrompt = useCallback((): string => {
    let prompt = `
## 📊 INDICADORES ECONÔMICOS - ACESSO TOTAL E AUTOMÁTICO

Você TEM ACESSO DIRETO aos seguintes indicadores do banco de dados. Os dados são buscados AUTOMATICAMENTE.

### MACRO (Nacional):
- Taxa Selic (SELIC), CDI, IPCA, PIB, Dólar PTAX (DOLAR), Desemprego PNAD (4099)

### COMÉRCIO (Regionais por UF):
- PAC Atacado/Varejo, PMC Combustíveis/Farmácia/Vestuário/Móveis/Mat.Construção/Veículos

### DEMOGRÁFICOS (Regionais):
- Mortalidade Infantil, Taxa de Fecundidade, Esperança de Vida

### 🔴 REGRA ABSOLUTA:
**NUNCA** peça dados ao usuário. Quando o usuário perguntar sobre indicadores, os dados JÁ estarão no contexto ou serão buscados automaticamente. Responda IMEDIATAMENTE com análises, gráficos e comparações.

---
`;
    
    // Include history section if there are multiple items for comparison
    if (contextHistory.length > 1) {
      prompt += `## HISTÓRICO DE ANÁLISES (para comparações)\n\n`;
      prompt += `Você tem acesso aos seguintes contextos anteriores que o usuário analisou:\n`;
      
      contextHistory.slice(0, 5).forEach((item, idx) => {
        if (item.type === 'regional') {
          const ctx = item.context as RegionalContext;
          const unit = ctx.unit || 'índice';
          prompt += `\n### ${idx + 1}. ${item.label}\n`;
          prompt += `- Tipo: Regional\n`;
          prompt += `- Estado: ${ctx.ufName} (${ctx.ufSigla})\n`;
          prompt += `- Pesquisa: ${ctx.researchName}\n`;
          prompt += `- Unidade: ${unit}\n`;
          if (ctx.lastValue) prompt += `- Último valor: ${ctx.lastValue.toLocaleString('pt-BR')} ${unit}\n`;
          if (ctx.data && ctx.data.length > 0) {
            prompt += `- Dados disponíveis: ${ctx.data.length} registros\n`;
          }
        } else {
          const ctx = item.context as ChartContext;
          const unit = ctx.unit || 'índice';
          prompt += `\n### ${idx + 1}. ${item.label}\n`;
          prompt += `- Tipo: Indicador Nacional\n`;
          prompt += `- Indicador: ${ctx.indicatorName}\n`;
          prompt += `- Unidade: ${unit}\n`;
          prompt += `- Período: ${ctx.periodStart} a ${ctx.periodEnd}\n`;
          if (ctx.statistics) {
            prompt += `- Média: ${ctx.statistics.mean.toFixed(2)} ${unit}\n`;
            prompt += `- Tendência: ${ctx.statistics.trend}\n`;
          }
        }
      });
      
      prompt += `\n---\n\n`;
    }
    
    // Regional context takes priority if exists (more specific)
    if (regionalContext) {
      const trendEmoji = regionalContext.trend === 'up' ? '📈' : 
                         regionalContext.trend === 'down' ? '📉' : '➡️';
      const trendLabel = regionalContext.trend === 'up' ? 'Alta' : 
                         regionalContext.trend === 'down' ? 'Baixa' : 'Estável';
      
      prompt += `## CONTEXTO ATUAL - ANÁLISE REGIONAL

Você está auxiliando um analista que está visualizando dados regionais:
**Estado:** ${regionalContext.ufName} (${regionalContext.ufSigla})
**Pesquisa:** ${regionalContext.researchName}
**Unidade:** ${regionalContext.unit || 'índice'}
**Registros disponíveis:** ${regionalContext.recordCount}`;

      if (regionalContext.lastValue !== null) {
        const unit = regionalContext.unit || 'índice';
        prompt += `\n**Último Valor:** ${regionalContext.lastValue.toLocaleString('pt-BR')} ${unit}`;
      }
      if (regionalContext.lastDate) {
        prompt += `\n**Data mais recente:** ${regionalContext.lastDate}`;
      }
      prompt += `\n**Tendência:** ${trendEmoji} ${trendLabel}`;

      // MEMORY OPTIMIZATION: Include only limited raw data for chart generation
      if (regionalContext.data && regionalContext.data.length > 0) {
        const limitedData = regionalContext.data.slice(-MAX_DATA_IN_PROMPT);
        prompt += `

### DADOS DISPONÍVEIS PARA GRÁFICO:
Você TEM acesso aos dados abaixo (últimos ${limitedData.length} registros). Use-os diretamente para gerar gráficos quando solicitado.
\`\`\`json
${JSON.stringify(limitedData)}
\`\`\``;
      }

      // MEMORY OPTIMIZATION: Include only summary data from other states (no full data arrays)
      if (allStatesData && Object.keys(allStatesData).length > 1) {
        const stateCount = Object.keys(allStatesData).length - 1;
        prompt += `

## DADOS PRÉ-CARREGADOS DE ${stateCount} ESTADOS

Você TEM acesso aos dados de todos os estados para comparações diretas:
`;
        Object.entries(allStatesData).forEach(([sigla, ctx]) => {
          if (sigla === regionalContext.ufSigla) return; // Skip current state
          const stateTrend = ctx.trend === 'up' ? '↑' : ctx.trend === 'down' ? '↓' : '→';
          const unit = ctx.unit || 'índice';
          prompt += `
**${ctx.ufName} (${sigla})** ${stateTrend} - Último: ${ctx.lastValue?.toLocaleString('pt-BR') || 'N/A'} ${unit} (${ctx.lastDate || 'N/A'})`;
        });
        
        prompt += `

**IMPORTANTE:** Você pode comparar diretamente com qualquer estado acima sem pedir mais dados.`;
      }

      prompt += `

## 📊 FORMATO DE GRÁFICOS DE COMPARAÇÃO ENTRE ESTADOS

Quando o usuário pedir para COMPARAR estados, gere o gráfico neste formato EXATO:

CHART_DATA:{
  "type": "line",
  "title": "Comparação: [Indicador] - SP, RJ, MG (Período)",
  "xKey": "name",
  "yKeys": ["SP", "RJ", "MG"],
  "data": [
    { "name": "2020-01", "SP": 124486125, "RJ": 98000000, "MG": 75000000 },
    { "name": "2020-02", "SP": 130000000, "RJ": 102000000, "MG": 78000000 }
  ]
}

### REGRAS CRÍTICAS PARA GRÁFICOS COMPARATIVOS:
1. yKeys DEVE conter as siglas dos estados (ex: ["SP", "RJ", "MG"]) - NUNCA use ["value"]
2. Cada objeto em data DEVE ter campos para cada sigla listada em yKeys
3. Os valores DEVEM ser numéricos (sem aspas, sem formatação)
4. Use SEMPRE as siglas oficiais: SP, RJ, MG, BA, PR, RS, SC, CE, PE, GO, DF, etc.
5. O campo "name" é o eixo X (datas ou períodos)
6. Reconheça estados por sigla (RJ, SP) ou nome completo (Rio de Janeiro, São Paulo)

## INSTRUÇÕES
Responda perguntas sobre este estado e indicador regional.
${contextHistory.length > 1 ? 'Você pode comparar com os indicadores anteriores do histórico quando solicitado.' : ''}
${allStatesData && Object.keys(allStatesData).length > 1 ? 'Você TEM dados de todos os estados carregados. Faça comparações diretas quando solicitado.' : ''}
Relacione com economia brasileira e contexto regional quando relevante.
Considere diferenças socioeconômicas entre regiões do Brasil.
IMPORTANTE: Você TEM os dados disponíveis acima. Quando o usuário pedir gráficos, USE esses dados diretamente.
Seja preciso e objetivo nas respostas.`;

      return prompt;
    }

    if (!chartContext) return prompt;

    const { statistics, stsResult, data } = chartContext;
    
    prompt += `## CONTEXTO ATUAL

Você está auxiliando um analista que está visualizando:
**Indicador:** ${chartContext.indicatorName} (${chartContext.indicatorCode})
**Tipo de Gráfico:** ${chartContext.chartType === 'line' ? 'Linha' : chartContext.chartType === 'bar' ? 'Barras' : 'Área'}
**Período:** ${chartContext.periodStart} a ${chartContext.periodEnd} (${chartContext.totalRecords} registros)
**Frequência:** ${chartContext.frequency || 'N/A'}
**Unidade:** ${chartContext.unit || 'N/A'}`;

    if (statistics) {
      const trendEmoji = statistics.trend === 'up' ? '📈' : statistics.trend === 'down' ? '📉' : '➡️';
      const trendLabel = statistics.trend === 'up' ? 'Alta' : statistics.trend === 'down' ? 'Baixa' : 'Estável';
      const unit = chartContext.unit || 'índice';
      
      prompt += `

### Estatísticas:
- **Média:** ${statistics.mean.toFixed(2)} ${unit}
- **Desvio Padrão:** ${statistics.stdDev.toFixed(2)} ${unit}
- **Coef. Variação:** ${statistics.cv.toFixed(1)}%
- **Mínimo:** ${statistics.min.toFixed(2)} ${unit}
- **Máximo:** ${statistics.max.toFixed(2)} ${unit}
- **Tendência:** ${trendEmoji} ${trendLabel} (slope: ${statistics.slope > 0 ? '+' : ''}${statistics.slope.toFixed(4)} ${unit}/período)
- **R²:** ${(statistics.r2 * 100).toFixed(1)}%`;
    }

    if (stsResult) {
      const unit = chartContext.unit || 'índice';
      prompt += `

### Análise STS (Structural Time Series):
- **Nível atual (μ):** ${stsResult.mu_smoothed.toFixed(2)} ${unit}
- **Inclinação (β):** ${stsResult.beta_smoothed > 0 ? '+' : ''}${stsResult.beta_smoothed.toFixed(4)} ${unit}/período
- **Direção:** ${stsResult.direction}
- **Intensidade:** ${stsResult.strength}
- **Previsão próximo período:** ${stsResult.forecast.mean.toFixed(2)} ${unit} (IC 95%: ${stsResult.forecast.p05.toFixed(2)} - ${stsResult.forecast.p95.toFixed(2)} ${unit})`;
    }

    // MEMORY OPTIMIZATION: Include only limited raw data for chart generation
    if (data && data.length > 0) {
      const limitedData = data.slice(-MAX_DATA_IN_PROMPT);
      prompt += `

### DADOS DISPONÍVEIS PARA GRÁFICO:
Você TEM acesso aos dados abaixo (últimos ${limitedData.length} registros). Use-os diretamente para gerar gráficos quando solicitado.
\`\`\`json
${JSON.stringify(limitedData)}
\`\`\``;
    }

    if (selectedUF) {
      prompt += `

### Contexto Regional:
- **Estado selecionado:** ${selectedUF}`;
    }

    prompt += `

## INSTRUÇÕES
Responda perguntas sobre este indicador com base nos dados acima.
${contextHistory.length > 1 ? 'Você pode comparar com os indicadores anteriores do histórico quando solicitado.' : ''}
Relacione com economia brasileira, política monetária e contexto regional quando relevante.
Use os dados estatísticos e de tendência para fundamentar suas análises.
IMPORTANTE: Você TEM os dados disponíveis acima. Quando o usuário pedir gráficos, USE esses dados diretamente.
Seja preciso e objetivo nas respostas.`;

    return prompt;
  }, [chartContext, regionalContext, selectedUF, contextHistory, allStatesData]);

  // Build contextual suggestions based on active context - returns objects with icon names
  const buildContextualSuggestions = useCallback((): Array<{ icon: string; text: string }> => {
    const suggestions: Array<{ icon: string; text: string }> = [];
    
    // Add comparison suggestions if multiple items in history
    if (contextHistory.length >= 2) {
      const labels = contextHistory.slice(0, 2).map(h => h.label);
      suggestions.push({ icon: "RefreshCw", text: `Comparar ${labels[0]} com ${labels[1]}` });
    }
    
    if (regionalContext) {
      suggestions.push(
        { icon: "BarChart3", text: `Gerar gráfico de ${regionalContext.researchName}` },
        { icon: "TrendingUp", text: `Analisar tendência de ${regionalContext.ufSigla}` },
      );
      if (contextHistory.length < 2) {
        suggestions.push({ icon: "Search", text: `Comparar com outros estados` });
      }
    } else if (chartContext) {
      suggestions.push(
        { icon: "BarChart3", text: `Gerar gráfico de ${chartContext.indicatorName}` },
        { icon: "TrendingUp", text: `Analisar tendência temporal` },
      );
      if (contextHistory.length < 2) {
        suggestions.push({ icon: "Search", text: `Estatísticas detalhadas` });
      }
    }
    
    // Add summary suggestion if many items
    if (contextHistory.length >= 3) {
      suggestions.push({ icon: "ClipboardList", text: `Resumo de todas as análises` });
    }
    
    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }, [regionalContext, chartContext, contextHistory]);

  const value: DashboardAnalyticsContextType = {
    activeTab,
    chartContext,
    selectedUF,
    regionalContext,
    allStatesData,
    contextHistory,
    setActiveTab,
    setChartContext,
    setSelectedUF,
    setRegionalContext,
    setAllStatesData: setAllStatesDataOptimized, // Use optimized setter
    addToHistory,
    removeFromHistory,
    clearHistory,
    buildContextualSystemPrompt,
    buildContextualSuggestions,
    hasContext,
  };

  return (
    <DashboardAnalyticsContext.Provider value={value}>
      {children}
    </DashboardAnalyticsContext.Provider>
  );
}

export function useDashboardAnalytics(): DashboardAnalyticsContextType {
  const context = useContext(DashboardAnalyticsContext);
  if (!context) {
    throw new Error("useDashboardAnalytics must be used within a DashboardAnalyticsProvider");
  }
  return context;
}

// Safe hook that returns null when not in provider (for AgentChat)
export function useDashboardAnalyticsSafe(): DashboardAnalyticsContextType | null {
  return useContext(DashboardAnalyticsContext);
}
