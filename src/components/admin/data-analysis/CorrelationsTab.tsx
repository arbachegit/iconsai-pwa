import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Clock, Info, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  spearmanCorrelation, 
  getCorrelationStrengthPtBr, 
  findOptimalLag,
  interpretLag 
} from "@/lib/time-series-correlation";

interface AnnualData {
  year: number;
  sales: number;
  income: number;
  dollar: number;
  selic: number;
  ipca: number;
  unemployment: number;
  [key: string]: number;
}

interface CorrelationsTabProps {
  annualData: AnnualData[];
}

const VARIABLES = [
  { key: "income", label: "Renda", icon: TrendingUp },
  { key: "dollar", label: "Dólar", icon: BarChart3 },
  { key: "selic", label: "Selic", icon: BarChart3 },
  { key: "ipca", label: "IPCA", icon: TrendingUp },
  { key: "unemployment", label: "Desemprego", icon: TrendingDown },
];

export function CorrelationsTab({ annualData }: CorrelationsTabProps) {
  // Calcular matriz de correlações Spearman
  const correlationResults = useMemo(() => {
    if (!annualData?.length) return [];
    
    const validData = annualData.filter(d => d.sales > 0 && d.year >= 2015);
    if (validData.length < 5) return [];
    
    const salesValues = validData.map(d => d.sales);
    
    return VARIABLES.map(v => {
      const varValues = validData.map(d => d[v.key] || 0);
      
      // Verificar se tem variação nos dados
      const hasVariation = varValues.some(val => val !== varValues[0]);
      if (!hasVariation) {
        return {
          ...v,
          rho: 0,
          info: getCorrelationStrengthPtBr(0),
          lag: 0,
          lagInterpretation: "Dados insuficientes",
        };
      }
      
      const rho = spearmanCorrelation(varValues, salesValues);
      const info = getCorrelationStrengthPtBr(rho);
      const lagResult = findOptimalLag(varValues, salesValues, 3);
      
      return {
        ...v,
        rho,
        info,
        lag: lagResult.lag,
        lagInterpretation: interpretLag(lagResult.lag, v.label, "Vendas"),
      };
    }).sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));
  }, [annualData]);

  // Matriz de correlação entre todas variáveis
  const correlationMatrix = useMemo(() => {
    if (!annualData?.length) return [];
    
    const validData = annualData.filter(d => d.sales > 0 && d.year >= 2015);
    if (validData.length < 5) return [];
    
    const allVars = [{ key: "sales", label: "Vendas" }, ...VARIABLES];
    const matrix: { row: string; cols: { key: string; value: number; info: ReturnType<typeof getCorrelationStrengthPtBr> }[] }[] = [];
    
    for (const rowVar of allVars) {
      const rowValues = validData.map(d => d[rowVar.key] || 0);
      const cols = allVars.map(colVar => {
        const colValues = validData.map(d => d[colVar.key] || 0);
        const rho = spearmanCorrelation(rowValues, colValues);
        return {
          key: colVar.key,
          value: rho,
          info: getCorrelationStrengthPtBr(rho),
        };
      });
      matrix.push({ row: rowVar.label, cols });
    }
    
    return matrix;
  }, [annualData]);

  if (!correlationResults.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border border-dashed">
        <div className="text-center text-muted-foreground">
          <Network className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Dados insuficientes para análise de correlações</p>
          <p className="text-sm">Necessário pelo menos 5 anos de dados</p>
        </div>
      </div>
    );
  }

  const allVarsLabels = ["Vendas", ...VARIABLES.map(v => v.label)];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Network className="h-8 w-8 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">Análise de Correlações</h3>
          <p className="text-muted-foreground text-sm">
            Correlações Spearman entre variáveis macroeconômicas e vendas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Matriz de Correlação (Heatmap) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Matriz de Correlação Spearman
            </CardTitle>
            <CardDescription>Heatmap de correlações entre variáveis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-1 text-left"></th>
                    {allVarsLabels.map(label => (
                      <th key={label} className="p-1 text-center font-medium" style={{ minWidth: 50 }}>
                        {label.slice(0, 4)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlationMatrix.map((row, i) => (
                    <tr key={row.row}>
                      <td className="p-1 font-medium">{row.row.slice(0, 6)}</td>
                      {row.cols.map((col, j) => {
                        const bgIntensity = Math.abs(col.value);
                        const bgColor = col.value >= 0 
                          ? `rgba(34, 197, 94, ${bgIntensity * 0.7})` 
                          : `rgba(239, 68, 68, ${bgIntensity * 0.7})`;
                        return (
                          <TooltipProvider key={col.key}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <td 
                                  className="p-1 text-center cursor-help transition-all hover:scale-110"
                                  style={{ 
                                    backgroundColor: i === j ? 'transparent' : bgColor,
                                    color: bgIntensity > 0.5 ? 'white' : 'inherit',
                                    borderRadius: 4,
                                  }}
                                >
                                  {i === j ? "1.00" : col.value.toFixed(2)}
                                </td>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-semibold">{row.row} × {allVarsLabels[j]}</p>
                                <p className="text-sm">ρ = {col.value.toFixed(3)}</p>
                                <p className="text-xs text-muted-foreground">{col.info.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.7)' }} />
                <span>Positiva</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.7)' }} />
                <span>Negativa</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Top Correlações com Vendas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Correlações com Vendas
            </CardTitle>
            <CardDescription>Ranking por força da correlação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {correlationResults.map((item, index) => {
                const Icon = item.icon;
                const isPositive = item.rho >= 0;
                return (
                  <div 
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isPositive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.info.description}</p>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className={`cursor-help ${item.info.color}`}
                          >
                            <Info className="h-3 w-3 mr-1" />
                            ρ = {item.rho.toFixed(2)}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold">Correlação Spearman</p>
                          <p className="text-sm mt-1">{item.info.strength}: {item.info.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Análise de Lag (Defasagem Temporal) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Análise de Defasagem (Lag)
            </CardTitle>
            <CardDescription>Qual variável antecede as vendas?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {correlationResults.map(item => {
                const lagIcon = item.lag > 0 ? TrendingUp : item.lag < 0 ? TrendingDown : Minus;
                const LagIcon = lagIcon;
                return (
                  <div 
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <LagIcon className={`h-5 w-5 ${item.lag !== 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.lagInterpretation}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.lag === 0 ? 'Simultâneo' : `${Math.abs(item.lag)} ${Math.abs(item.lag) === 1 ? 'ano' : 'anos'}`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Explicação */}
        <Card className="bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              Sobre Correlação Spearman
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong>O que é:</strong> A correlação de Spearman (ρ) mede a relação monotônica 
              entre variáveis baseada em rankings, não em valores absolutos.
            </p>
            <p>
              <strong>Por que usar:</strong> Mais robusta que Pearson para séries temporais 
              econômicas pois é menos sensível a outliers e não assume linearidade.
            </p>
            <p>
              <strong>Interpretação:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><span className="text-green-500">ρ próximo de +1</span>: Relação positiva forte</li>
              <li><span className="text-red-500">ρ próximo de -1</span>: Relação inversa forte</li>
              <li><span className="text-gray-500">ρ próximo de 0</span>: Sem relação clara</li>
            </ul>
            <p>
              <strong>Lag:</strong> Indica quantos períodos uma variável antecede a outra. 
              Por exemplo, "Renda antecede Vendas em 1 ano" significa que mudanças na renda 
              impactam vendas aproximadamente 1 ano depois.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
