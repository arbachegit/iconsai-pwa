import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, TrendingUp, TrendingDown, Users, Heart, Baby, Globe, Check, X, LineChart as LineChartIcon } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Cell, LineChart, Line } from "recharts";
import { linearRegression, movingAverage } from "@/lib/statistics-utils";

interface BrazilianUF {
  id: string;
  uf_code: number;
  uf_sigla: string;
  uf_name: string;
  region_code: string;
  region_name: string;
  capital: string;
}

interface RegionalValue {
  id: string;
  indicator_id: string;
  uf_code: number;
  reference_date: string;
  value: number;
}

interface Indicator {
  id: string;
  name: string;
  code: string;
  unit: string;
  is_regional: boolean;
}

const REGION_COLORS: Record<string, string> = {
  'N': '#10B981',   // Norte - verde
  'NE': '#F59E0B',  // Nordeste - laranja
  'SE': '#3B82F6',  // Sudeste - azul
  'S': '#8B5CF6',   // Sul - roxo
  'CO': '#EF4444',  // Centro-Oeste - vermelho
};

const REGION_NAMES: Record<string, string> = {
  'N': 'Norte',
  'NE': 'Nordeste',
  'SE': 'Sudeste',
  'S': 'Sul',
  'CO': 'Centro-Oeste',
};

export function RegionalIndicatorsTab() {
  const [selectedIndicator, setSelectedIndicator] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [viewMode, setViewMode] = useState<'states' | 'regions'>('states');

  // Fetch UFs
  const { data: ufs = [], isLoading: loadingUFs } = useQuery({
    queryKey: ['brazilian-ufs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brazilian_ufs')
        .select('*')
        .order('uf_sigla');
      if (error) throw error;
      return data as BrazilianUF[];
    }
  });

  // Fetch regional indicators - only those with linked API
  const { data: indicators = [], isLoading: loadingIndicators } = useQuery({
    queryKey: ['regional-indicators-with-api'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('economic_indicators')
        .select('id, name, code, unit, is_regional, api_id')
        .eq('is_regional', true)
        .not('api_id', 'is', null)
        .order('name');
      if (error) throw error;
      return data as (Indicator & { api_id: string })[];
    }
  });

  // Fetch data availability for each indicator using count queries
  const { data: indicatorsWithData = new Set<string>() } = useQuery({
    queryKey: ['indicators-with-data', indicators.map(i => i.id).join(',')],
    queryFn: async () => {
      const withData = new Set<string>();
      
      // Check each indicator for data availability using count
      await Promise.all(
        indicators.map(async (ind) => {
          const { count } = await supabase
            .from('indicator_regional_values')
            .select('*', { count: 'exact', head: true })
            .eq('indicator_id', ind.id);
          
          if (count && count > 0) {
            withData.add(ind.id);
          }
        })
      );
      
      return withData;
    },
    enabled: indicators.length > 0
  });

  // Fetch regional values for selected indicator
  const { data: regionalValues = [], isLoading: loadingValues } = useQuery({
    queryKey: ['regional-values', selectedIndicator],
    queryFn: async () => {
      if (!selectedIndicator) return [];
      const { data, error } = await supabase
        .from('indicator_regional_values')
        .select('*')
        .eq('indicator_id', selectedIndicator)
        .order('reference_date', { ascending: false });
      if (error) throw error;
      return data as RegionalValue[];
    },
    enabled: !!selectedIndicator
  });

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    regionalValues.forEach(v => {
      const year = v.reference_date.substring(0, 4);
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [regionalValues]);

  // Set default year when data loads
  useMemo(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Filter values by year and merge with UFs
  const chartData = useMemo(() => {
    if (!selectedYear || !ufs.length) return [];

    const yearValues = regionalValues.filter(v => 
      v.reference_date.startsWith(selectedYear)
    );

    if (viewMode === 'states') {
      return ufs.map(uf => {
        const value = yearValues.find(v => v.uf_code === uf.uf_code);
        return {
          uf_sigla: uf.uf_sigla,
          uf_name: uf.uf_name,
          region_code: uf.region_code,
          region_name: uf.region_name,
          value: value?.value || 0,
          color: REGION_COLORS[uf.region_code] || '#666'
        };
      }).sort((a, b) => b.value - a.value);
    } else {
      // Group by region
      const regionData: Record<string, { total: number; count: number; region_name: string }> = {};
      
      ufs.forEach(uf => {
        if (!regionData[uf.region_code]) {
          regionData[uf.region_code] = { total: 0, count: 0, region_name: uf.region_name };
        }
        const value = yearValues.find(v => v.uf_code === uf.uf_code);
        if (value) {
          regionData[uf.region_code].total += value.value;
          regionData[uf.region_code].count += 1;
        }
      });

      return Object.entries(regionData).map(([code, data]) => ({
        uf_sigla: code,
        uf_name: REGION_NAMES[code],
        region_code: code,
        region_name: data.region_name,
        value: data.count > 0 ? data.total / data.count : 0,
        color: REGION_COLORS[code] || '#666'
      })).sort((a, b) => b.value - a.value);
    }
  }, [regionalValues, selectedYear, ufs, viewMode]);

  // Statistics
  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const values = chartData.map(d => d.value).filter(v => v > 0);
    if (!values.length) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const maxItem = chartData.find(d => d.value === max);
    const minItem = chartData.find(d => d.value === min);

    return { avg, max, min, maxItem, minItem, count: values.length };
  }, [chartData]);

  const selectedIndicatorData = indicators.find(i => i.id === selectedIndicator);

  // Time series data with moving average and trend line
  const timeSeriesData = useMemo(() => {
    if (!regionalValues.length || !selectedIndicator) return [];

    // Group values by date (average of all UFs per date)
    const valuesByDate: Record<string, number[]> = {};
    regionalValues.forEach(v => {
      const date = v.reference_date;
      if (!valuesByDate[date]) valuesByDate[date] = [];
      valuesByDate[date].push(v.value);
    });

    // Calculate average per date
    const sortedData = Object.entries(valuesByDate)
      .map(([date, values]) => ({
        date,
        value: values.reduce((a, b) => a + b, 0) / values.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sortedData.length < 2) return [];

    // Calculate moving average (period 3)
    const values = sortedData.map(d => d.value);
    const ma = movingAverage(values, 3);

    // Calculate linear regression
    const xValues = sortedData.map((_, i) => i);
    const regression = linearRegression(xValues, values);

    // Add MA and trend lines to data
    return sortedData.map((d, i) => ({
      ...d,
      displayDate: d.date.length > 7 ? d.date.substring(0, 7) : d.date,
      movingAvg: i >= 1 && i < sortedData.length - 1 ? ma[i - 1] : null,
      trend: regression.slope * i + regression.intercept
    }));
  }, [regionalValues, selectedIndicator]);

  // R² calculation for display
  const regressionR2 = useMemo(() => {
    if (timeSeriesData.length < 2) return 0;
    const values = timeSeriesData.map(d => d.value);
    const xValues = timeSeriesData.map((_, i) => i);
    const { r2 } = linearRegression(xValues, values);
    return r2;
  }, [timeSeriesData]);

  const isLoading = loadingUFs || loadingIndicators || loadingValues;

  const getIndicatorIcon = (code: string) => {
    if (code.includes('POP')) return <Users className="h-4 w-4" />;
    if (code.includes('ESPERANCA') || code.includes('VIDA')) return <Heart className="h-4 w-4" />;
    if (code.includes('TMI') || code.includes('FECUND')) return <Baby className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          Indicadores Regionais por UF
        </h2>
        <p className="text-muted-foreground mt-1">
          Visualização de indicadores demográficos e de saúde por estado brasileiro
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="w-64">
            <label className="text-sm text-muted-foreground mb-1 block">Indicador</label>
            <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um indicador" />
              </SelectTrigger>
              <SelectContent>
                {indicators.map(ind => {
                  const hasData = indicatorsWithData.has(ind.id);
                  return (
                    <SelectItem key={ind.id} value={ind.id}>
                      <span className="flex items-center gap-2 w-full">
                        {getIndicatorIcon(ind.code)}
                        <span className="flex-1">{ind.name}</span>
                        {hasData ? (
                          <Check className="h-4 w-4 text-green-500 ml-2" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 ml-2" />
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="w-32">
            <label className="text-sm text-muted-foreground mb-1 block">Ano</label>
            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!availableYears.length}>
              <SelectTrigger>
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <label className="text-sm text-muted-foreground mb-1 block">Visualização</label>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'states' | 'regions')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="states">Por Estado</SelectItem>
                <SelectItem value="regions">Por Região</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {stats && selectedIndicatorData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Média</div>
              <div className="text-2xl font-bold">{stats.avg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground">{selectedIndicatorData.unit}</div>
            </CardContent>
          </Card>
          
          <Card className="border-green-500/50">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Maior Valor
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.max.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground">{stats.maxItem?.uf_name}</div>
            </CardContent>
          </Card>
          
          <Card className="border-red-500/50">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-500" />
                Menor Valor
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.min.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground">{stats.minItem?.uf_name}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Estados com dados</div>
              <div className="text-2xl font-bold">{stats.count}</div>
              <div className="text-xs text-muted-foreground">de {ufs.length} estados</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {selectedIndicator && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedIndicatorData && getIndicatorIcon(selectedIndicatorData.code)}
              {selectedIndicatorData?.name || 'Indicador'}
              <Badge variant="outline" className="ml-2">{selectedYear}</Badge>
            </CardTitle>
            <CardDescription>
              {viewMode === 'states' ? 'Valores por estado' : 'Média por região'}
              {selectedIndicatorData && ` (${selectedIndicatorData.unit})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Globe className="h-12 w-12 mb-2 opacity-50" />
                <p>Nenhum dado disponível para este indicador.</p>
                <p className="text-sm">Sincronize os dados na aba "Gestão de APIs".</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={viewMode === 'states' ? 600 : 300}>
                <BarChart 
                  data={chartData} 
                  layout="vertical" 
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(v) => v.toLocaleString('pt-BR')} />
                  <YAxis 
                    type="category" 
                    dataKey="uf_sigla" 
                    width={50}
                    tick={{ fontSize: 11 }}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => [value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }), 'Valor']}
                    labelFormatter={(label) => chartData.find(d => d.uf_sigla === label)?.uf_name || label}
                  />
                  <Legend />
                  <Bar dataKey="value" name={selectedIndicatorData?.unit || 'Valor'} radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Time Series Chart */}
      {selectedIndicator && timeSeriesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-primary" />
              Série Histórica Completa
              <Badge variant="outline" className="ml-2">
                R² = {(regressionR2 * 100).toFixed(1)}%
              </Badge>
            </CardTitle>
            <CardDescription>
              Evolução temporal com média móvel (3 períodos) e linha de tendência por regressão linear
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart 
                data={timeSeriesData} 
                margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="displayDate" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tickFormatter={(v) => v.toLocaleString('pt-BR')} />
                <RechartsTooltip 
                  formatter={(value: number, name: string) => [
                    value?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) || 'N/A',
                    name === 'value' ? 'Valor Médio' : name === 'movingAvg' ? 'Média Móvel' : 'Tendência'
                  ]}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name="Valor Médio" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="movingAvg" 
                  name="Média Móvel (3p)" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="trend" 
                  name="Tendência (Regressão)" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  strokeDasharray="10 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {selectedIndicator && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Legenda por Região</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {Object.entries(REGION_COLORS).map(([code, color]) => (
              <div key={code} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <span className="text-sm">{REGION_NAMES[code]}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!selectedIndicator && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MapPin className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Selecione um indicador</p>
            <p className="text-sm">Escolha um indicador demográfico ou de saúde para visualizar os dados por estado.</p>
            {indicators.length === 0 && !loadingIndicators && (
              <Badge variant="outline" className="mt-4">
                Nenhum indicador regional cadastrado
              </Badge>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RegionalIndicatorsTab;
