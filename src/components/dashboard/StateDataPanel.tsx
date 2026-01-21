import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, MapPin, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { exportData } from "@/lib/export-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardAnalyticsSafe } from "@/contexts/DashboardAnalyticsContext";

// UF code to sigla mapping
const UF_CODE_MAP: Record<number, string> = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL",
  28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP",
  41: "PR", 42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF",
};

const UF_SIGLA_TO_CODE: Record<string, number> = Object.fromEntries(
  Object.entries(UF_CODE_MAP).map(([k, v]) => [v, parseInt(k)])
);

const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

interface StateDataPanelProps {
  ufSigla: string;
  researchId: string | null;
  onClose: () => void;
}

interface RegionalDataItem {
  reference_date: string;
  value: number;
  indicatorName: string;
  unit: string;
}

export function StateDataPanel({ ufSigla, researchId, onClose }: StateDataPanelProps) {
  const ufCode = UF_SIGLA_TO_CODE[ufSigla];
  const ufName = UF_NAMES[ufSigla] || ufSigla;
  const dashboardAnalytics = useDashboardAnalyticsSafe();

  // Pagination and sorting state
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Reset page when state changes
  useEffect(() => {
    setPage(0);
  }, [ufSigla, researchId]);

  // Fetch regional data - always in R$ for PMC indicators
  const { data: regionalData, isLoading } = useQuery({
    queryKey: ["regional-data-state-v3", ufCode, researchId],
    queryFn: async (): Promise<RegionalDataItem[]> => {
      if (!researchId || !ufCode) return [];
      
      // First get indicators linked to this API
      const { data: indicators } = await supabase
        .from("economic_indicators")
        .select("id, name, unit, code")
        .eq("api_id", researchId);
      
      if (!indicators || indicators.length === 0) return [];
      
      const indicator = indicators[0];
      const isPMC = indicator.code?.startsWith('PMC_') && indicator.code?.endsWith('_UF');
      
      if (isPMC) {
        // Fetch monetary values from pmc_valores_reais table
        const { data: pmcValues, error } = await supabase
          .from("pmc_valores_reais")
          .select("reference_date, valor_estimado_reais")
          .eq("pmc_indicator_code", indicator.code)
          .eq("uf_code", ufCode)
          .order("reference_date", { ascending: false })
          .limit(500);
        
        if (error) throw error;
        
        return (pmcValues || [])
          .filter(v => v.valor_estimado_reais !== null)
          .map((v) => ({
            reference_date: v.reference_date,
            value: v.valor_estimado_reais || 0,
            indicatorName: indicator.name,
            unit: "R$ mil", // Always R$ for PMC
          }));
      } else {
        // Non-PMC indicators: fetch from original table
        const indicatorIds = indicators.map((i) => i.id);
        
        const { data: values, error } = await supabase
          .from("indicator_regional_values")
          .select("indicator_id, reference_date, value")
          .eq("uf_code", ufCode)
          .in("indicator_id", indicatorIds)
          .order("reference_date", { ascending: false })
          .limit(500);
        
        if (error) throw error;
        
        return (values || []).map((v) => {
          const ind = indicators.find((i) => i.id === v.indicator_id);
          return {
            reference_date: v.reference_date,
            value: v.value,
            indicatorName: ind?.name || "Desconhecido",
            unit: ind?.unit || "",
          };
        });
      }
    },
    enabled: !!researchId && !!ufCode,
  });

  // Sorted data
  const sortedData = useMemo(() => {
    if (!regionalData) return [];
    return [...regionalData].sort((a, b) => {
      const dateA = new Date(a.reference_date).getTime();
      const dateB = new Date(b.reference_date).getTime();
      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [regionalData, sortDirection]);

  // Paginated data
  const paginatedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Calculate trend
  const getTrend = (values: RegionalDataItem[] | undefined) => {
    if (!values || values.length < 2) return "stable";
    // Sort by date descending for trend calculation
    const sorted = [...values].sort((a, b) => 
      new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime()
    );
    const recent = sorted[0]?.value || 0;
    const previous = sorted[1]?.value || 0;
    if (recent > previous) return "up";
    if (recent < previous) return "down";
    return "stable";
  };

  const trend = getTrend(regionalData);

  // Sparkline data - last 12 months in chronological order
  const sparklineData = useMemo(() => {
    if (!regionalData || regionalData.length === 0) return [];
    
    // Sort chronologically and take last 12
    const chronological = [...regionalData]
      .sort((a, b) => new Date(a.reference_date).getTime() - new Date(b.reference_date).getTime());
    
    return chronological.slice(-12).map(item => ({
      date: item.reference_date,
      value: item.value,
    }));
  }, [regionalData]);

  // Sparkline color based on trend
  const sparklineColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#6b7280';

  // Update dashboard analytics context with detailed data
  useEffect(() => {
    if (dashboardAnalytics && regionalData && regionalData.length > 0) {
      // Sort for context
      const sortedForContext = [...regionalData].sort((a, b) => 
        new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime()
      );
      const lastItem = sortedForContext[0];
      
      // Limit data to last 50 records to avoid payload bloat
      const limitedData = sortedForContext
        .slice(0, 50)
        .map(d => ({
          date: d.reference_date,
          value: d.value,
        }))
        .reverse(); // Reverse to chronological order
      
      const contextData = {
        ufSigla,
        ufName,
        researchName: lastItem.indicatorName,
        researchId: researchId || '',
        unit: lastItem.unit || 'índice', // Include unit for chat context
        trend: trend as 'up' | 'down' | 'stable',
        lastValue: lastItem.value,
        lastDate: lastItem.reference_date,
        recordCount: regionalData.length,
        data: limitedData,
      };
      
      dashboardAnalytics.setRegionalContext(contextData);
      
      // Add to history for comparison support
      dashboardAnalytics.addToHistory({
        type: 'regional',
        label: `${ufSigla} — ${lastItem.indicatorName}`,
        context: contextData,
      });
    }
  }, [regionalData, ufSigla, ufName, researchId, trend, dashboardAnalytics]);

  // Format value with unit - ALWAYS shows unit
  const formatValue = (value: number, unit: string) => {
    const formattedNum = unit.includes('R$')
      ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    return formattedNum;
  };

  // Format value with unit inline (for tooltips and summaries)
  const formatValueWithUnit = (value: number, unit: string) => {
    const formattedNum = formatValue(value, unit);
    const displayUnit = unit || 'índice';
    return `${formattedNum} ${displayUnit}`;
  };

  // Export handler
  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!sortedData || sortedData.length === 0) return;
    
    const exportColumns = [
      { key: 'reference_date', label: 'Data' },
      { key: 'indicatorName', label: 'Indicador' },
      { key: 'value', label: 'Valor' },
      { key: 'unit', label: 'Unidade' },
    ];
    
    await exportData({
      filename: `${ufSigla}_${sortedData[0]?.indicatorName || 'dados'}_regional`,
      data: sortedData,
      format,
      columns: exportColumns,
    });
  };

  return (
    <Card className="border-2 border-[#00FFFF]/50 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#FF00FF]/20 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-[#FF00FF]" />
          </div>
          <div>
            <CardTitle className="text-lg">{ufName}</CardTitle>
            <Badge variant="outline" className="mt-1">{ufSigla}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {!researchId ? (
          <p className="text-muted-foreground text-center py-4">
            Selecione uma pesquisa regional acima
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !regionalData || regionalData.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhum dado disponível para este estado
          </p>
        ) : (
          <div className="space-y-4">
            {/* Trend indicator */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              {trend === "up" && <TrendingUp className="h-5 w-5 text-green-500" />}
              {trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
              {trend === "stable" && <Minus className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm font-medium">
                {trend === "up" && "Tendência de alta"}
                {trend === "down" && "Tendência de baixa"}
                {trend === "stable" && "Estável"}
              </span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {regionalData.length} registros
              </Badge>
            </div>

            {/* Sparkline - Last 12 months trend */}
            {sparklineData.length > 1 && (
              <div className="p-3 bg-gradient-to-r from-background to-muted/30 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Tendência (últimos 12 meses)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {sparklineData[0]?.date && format(new Date(sparklineData[0].date), "MM/yy")}
                    {" → "}
                    {sparklineData[sparklineData.length - 1]?.date && format(new Date(sparklineData[sparklineData.length - 1].date), "MM/yy")}
                  </span>
                </div>
                <div className="h-[60px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={sparklineColor}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [
                          formatValueWithUnit(value, regionalData?.[0]?.unit || 'índice'),
                          'Valor'
                        ]}
                        labelFormatter={(label) => format(new Date(label), "MMM/yyyy")}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Data table with native HTML for sticky header */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/80 sticky top-0 z-10">
                    <tr>
                      <th 
                        className="text-left px-3 py-2 font-medium cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => setSortDirection(d => d === 'desc' ? 'asc' : 'desc')}
                      >
                        <div className="flex items-center gap-1">
                          Data
                          {sortDirection === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUp className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th className="text-left px-3 py-2 font-medium">Indicador</th>
                      <th className="text-right px-3 py-2 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 text-muted-foreground">
                          {format(new Date(item.reference_date), "MM/yyyy")}
                        </td>
                        <td className="px-3 py-2 font-medium truncate max-w-[150px]" title={item.indicatorName}>
                          {item.indicatorName}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <div className="flex items-center justify-end gap-2">
                            <span>{formatValue(item.value, item.unit)}</span>
                            <Badge 
                              variant="outline" 
                              className="text-[9px] px-1.5 py-0 h-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                            >
                              {item.unit || 'índice'}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedData.length)} de {sortedData.length}
                </span>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground flex items-center px-2">
                    {page + 1}/{totalPages}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
