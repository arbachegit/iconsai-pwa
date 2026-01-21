import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, DollarSign, TrendingUp, Calculator, CheckCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface PMCMapping {
  id: string;
  pmc_indicator_code: string;
  pmc_indicator_name: string;
  pac_indicator_code: string;
  pac_indicator_name: string;
  is_active: boolean;
  notes: string | null;
}

interface PMCValorReal {
  id: string;
  pmc_indicator_code: string;
  uf_code: number;
  reference_date: string;
  indice_pmc_original: number;
  pac_receita_anual: number | null;
  valor_estimado_reais: number | null;
}

interface ConversionResult {
  pmc_code: string;
  total_processed: number;
  total_converted: number;
  years_covered: string;
}

export function PMCConversionTab() {
  const queryClient = useQueryClient();
  const [selectedIndicator, setSelectedIndicator] = useState<string>("all");
  const [selectedUF, setSelectedUF] = useState<string>("all");

  // Buscar mapeamentos
  const { data: mappings = [], isLoading: loadingMappings } = useQuery({
    queryKey: ["pac-pmc-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pac_pmc_mapping")
        .select("*")
        .order("pmc_indicator_name");
      if (error) throw error;
      return data as PMCMapping[];
    },
  });

  // Buscar valores convertidos
  const { data: valoresReais = [], isLoading: loadingValores, refetch: refetchValores } = useQuery({
    queryKey: ["pmc-valores-reais", selectedIndicator, selectedUF],
    queryFn: async () => {
      let query = supabase
        .from("pmc_valores_reais")
        .select("*")
        .order("reference_date", { ascending: false })
        .limit(500);
      
      if (selectedIndicator !== "all") {
        query = query.eq("pmc_indicator_code", selectedIndicator);
      }
      if (selectedUF !== "all") {
        query = query.eq("uf_code", parseInt(selectedUF));
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PMCValorReal[];
    },
  });

  // Buscar UFs disponíveis
  const { data: ufs = [] } = useQuery({
    queryKey: ["brazilian-ufs-conversion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brazilian_ufs")
        .select("uf_code, uf_sigla, uf_name")
        .order("uf_sigla");
      if (error) throw error;
      return data;
    },
  });

  // Mutation para executar conversão (função batch otimizada)
  const conversionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("process_all_pmc_conversions_batch");
      if (error) throw error;
      return data as ConversionResult[];
    },
    onSuccess: (results) => {
      const totalConverted = results.reduce((sum, r) => sum + r.total_converted, 0);
      toast.success(`Conversão concluída: ${totalConverted.toLocaleString()} registros processados`);
      queryClient.invalidateQueries({ queryKey: ["pmc-valores-reais"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro na conversão: ${error.message}`);
    },
  });

  // Calcular estatísticas
  const stats = {
    totalMappings: mappings.length,
    activeMappings: mappings.filter(m => m.is_active).length,
    totalValores: valoresReais.length,
    avgValor: valoresReais.length > 0 
      ? valoresReais.reduce((sum, v) => sum + (v.valor_estimado_reais || 0), 0) / valoresReais.length 
      : 0,
  };

  // Preparar dados para gráfico
  const chartData = valoresReais
    .slice(0, 24)
    .reverse()
    .map(v => ({
      date: format(new Date(v.reference_date), "MMM/yy", { locale: ptBR }),
      indice: v.indice_pmc_original,
      valorReais: v.valor_estimado_reais ? v.valor_estimado_reais / 1000 : 0,
    }));

  if (loadingMappings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            Conversão PMC → R$
          </h2>
          <p className="text-muted-foreground">
            Converter índices PMC para valores estimados em Reais usando receita PAC
          </p>
        </div>
        <Button
          onClick={() => conversionMutation.mutate()}
          disabled={conversionMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {conversionMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Calculator className="w-4 h-4 mr-2" />
          )}
          Executar Conversão
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-600 dark:text-blue-400">Como funciona a conversão</p>
              <p className="text-muted-foreground mt-1">
                Fórmula: <code className="bg-muted px-1 rounded">(índice PMC / 100) × (receita PAC anual / 12)</code>
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Os valores são estimativas baseadas na proporção do índice PMC aplicada à receita média mensal da PAC.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mapeamentos</p>
                <p className="text-2xl font-bold">{stats.totalMappings}</p>
              </div>
              <Badge variant={stats.activeMappings === stats.totalMappings ? "default" : "secondary"}>
                {stats.activeMappings} ativos
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valores Convertidos</p>
                <p className="text-2xl font-bold">{stats.totalValores.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média (R$ mil)</p>
                <p className="text-2xl font-bold">
                  {stats.avgValor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-bold flex items-center gap-2">
                  {stats.totalValores > 0 ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      Operacional
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      Aguardando
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="w-64">
              <label className="text-sm text-muted-foreground mb-1 block">Indicador</label>
              <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os indicadores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os indicadores</SelectItem>
                  {mappings.map(m => (
                    <SelectItem key={m.pmc_indicator_code} value={m.pmc_indicator_code}>
                      {m.pmc_indicator_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-48">
              <label className="text-sm text-muted-foreground mb-1 block">UF</label>
              <Select value={selectedUF} onValueChange={setSelectedUF}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as UFs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as UFs</SelectItem>
                  {ufs.map(uf => (
                    <SelectItem key={uf.uf_code} value={uf.uf_code.toString()}>
                      {uf.uf_sigla} - {uf.uf_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button variant="outline" onClick={() => refetchValores()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Comparativo */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparativo: Índice vs Valor R$</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" orientation="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="indice"
                    stroke="hsl(var(--primary))"
                    name="Índice PMC"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="valorReais"
                    stroke="#10b981"
                    name="Valor (R$ Mi)"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Mapeamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mapeamentos PAC ↔ PMC</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PMC (Índice)</TableHead>
                <TableHead>PAC (Receita R$)</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{m.pmc_indicator_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{m.pmc_indicator_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{m.pac_indicator_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{m.pac_indicator_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.notes?.includes('Mapeamento direto') ? 'default' : 'secondary'}>
                      {m.notes?.includes('Mapeamento direto') ? 'Direto' : 'Proxy'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.is_active ? "default" : "secondary"} className={m.is_active ? 'bg-emerald-600' : ''}>
                      {m.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabela de Valores Convertidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Valores Convertidos (R$ mil)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingValores ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : valoresReais.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum valor convertido encontrado.</p>
              <p className="text-sm">Execute a conversão para popular os dados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Índice PMC</TableHead>
                  <TableHead className="text-right">PAC Anual (R$ mil)</TableHead>
                  <TableHead className="text-right">Valor Estimado (R$ mil)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valoresReais.slice(0, 50).map(v => {
                  const uf = ufs.find(u => u.uf_code === v.uf_code);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium font-mono text-xs">{v.pmc_indicator_code}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{uf?.uf_sigla || v.uf_code}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(v.reference_date), "MMM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {v.indice_pmc_original?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {v.pac_receita_anual?.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600">
                        {v.valor_estimado_reais?.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PMCConversionTab;
