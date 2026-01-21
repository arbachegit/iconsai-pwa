import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, BarChart3, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SectorAnalysisGrid } from "./data-analysis/SectorAnalysisGrid";
import { Simulator2026 } from "./data-analysis/Simulator2026";
import { CorrelationsTab } from "./data-analysis/CorrelationsTab";
import { useRealTimeIndicators } from "@/hooks/useRealTimeIndicators";
// Mapeamento de códigos de indicadores para variáveis do modelo
const INDICATOR_MAPPING: Record<string, string> = {
  "PMC": "sales",
  "IPCA": "ipca",
  "SELIC": "selic",
  "PIB": "pib",
  "DOLAR": "dollar",
  "4099": "unemployment",
  "RENDA_MEDIA": "income",
  "GINI": "gini",
  "RENDA_CLASSE_A": "incomeClassA",
  "RENDA_CLASSE_B": "incomeClassB",
  "RENDA_CLASSE_C": "incomeClassC",
  "RENDA_CLASSE_D": "incomeClassD",
  "RENDA_CLASSE_E": "incomeClassE",
  "PMC_VEST": "pmcVest",
  "PMC_MOV": "pmcMov",
  "PMC_FARM": "pmcFarm",
  "PMC_COMB": "pmcComb",
  "PMC_VEIC": "pmcVeic",
  "PMC_CONST": "pmcConst",
};

// Tipo para dados anuais
interface AnnualData {
  year: number;
  sales: number;
  dollar: number;
  selic: number;
  ipca: number;
  pib: number;
  unemployment: number;
  income: number;
  gini: number;
  incomeClassA: number;
  incomeClassB: number;
  incomeClassC: number;
  incomeClassD: number;
  incomeClassE: number;
  pmcVest: number;
  pmcMov: number;
  pmcFarm: number;
  pmcComb: number;
  pmcVeic: number;
  pmcConst: number;
  [key: string]: number;
}

// Configuração das 9 TABs
const SECTOR_TABS = [
  { id: "varejo", label: "Varejo Total", code: "PMC" },
  { id: "vestuario", label: "Vestuário", code: "PMC_VEST" },
  { id: "moveis", label: "Móveis", code: "PMC_MOV" },
  { id: "farmacia", label: "Farmácia", code: "PMC_FARM" },
  { id: "combustivel", label: "Combustível", code: "PMC_COMB" },
  { id: "veiculos", label: "Veículos", code: "PMC_VEIC" },
  { id: "construcao", label: "Construção", code: "PMC_CONST", disabled: true },
  { id: "correlacoes", label: "Correlações", isCorrelation: true },
  { id: "simulador", label: "Simulador 2026", isSimulator: true },
];

export default function DataAnalysisTab() {
  const [activeTab, setActiveTab] = useState("varejo");

  // Hook para indicadores em tempo real
  const { data: realIndicators, isLoading: isLoadingIndicators } = useRealTimeIndicators();
  // Fetch de dados reais do banco (query em 2 etapas)
  const { data: annualData, isLoading, error, refetch } = useQuery({
    queryKey: ["data-analysis-annual", "v2"],
    queryFn: async (): Promise<AnnualData[]> => {
      // ETAPA 1: Buscar IDs dos indicadores pelos códigos
      const { data: indicators, error: indError } = await supabase
        .from("economic_indicators")
        .select("id, code")
        .in("code", Object.keys(INDICATOR_MAPPING));

      if (indError) throw indError;
      
      if (!indicators?.length) {
        console.warn('[DATA-ANALYSIS] Nenhum indicador encontrado para os códigos:', Object.keys(INDICATOR_MAPPING));
        return [];
      }
      
      console.log('[DATA-ANALYSIS] Indicadores encontrados:', indicators.length, indicators.map(i => i.code));

      // Criar mapa id -> code
      const codeById = new Map(indicators.map(i => [i.id, i.code]));
      const indicatorIds = indicators.map(i => i.id);

      // ETAPA 2: Queries paralelas por categoria (evita limite de 1000)
      // Separar indicadores por categoria
      const annualCodes = ['RENDA_MEDIA', 'RENDA_CLASSE_A', 'RENDA_CLASSE_B', 'RENDA_CLASSE_C', 
        'RENDA_CLASSE_D', 'RENDA_CLASSE_E', 'GINI', 'PIB', '4099'];
      const macroCodes = ['IPCA', 'SELIC', 'DOLAR'];
      const pmcCodes = ['PMC', 'PMC_VEST', 'PMC_MOV', 'PMC_FARM', 'PMC_COMB', 'PMC_VEIC', 'PMC_CONST'];

      const annualIds = indicators.filter(i => annualCodes.includes(i.code)).map(i => i.id);
      const macroIds = indicators.filter(i => macroCodes.includes(i.code)).map(i => i.id);
      const pmcIds = indicators.filter(i => pmcCodes.includes(i.code)).map(i => i.id);

      // Executar queries em paralelo
      const [annualResult, macroResult, pmcResult] = await Promise.all([
        supabase
          .from("indicator_values")
          .select("reference_date, value, indicator_id")
          .in("indicator_id", annualIds)
          .order("reference_date", { ascending: true }),
        
        supabase
          .from("indicator_values")
          .select("reference_date, value, indicator_id")
          .in("indicator_id", macroIds)
          .order("reference_date", { ascending: true })
          .range(0, 4999),  // .range() respeita o limite (DOLAR tem ~4000 registros)
        
        supabase
          .from("indicator_values")
          .select("reference_date, value, indicator_id")
          .in("indicator_id", pmcIds)
          .order("reference_date", { ascending: true })
      ]);

      // Verificar erros
      if (annualResult.error) throw annualResult.error;
      if (macroResult.error) throw macroResult.error;
      if (pmcResult.error) throw pmcResult.error;

      // Combinar resultados
      const data = [
        ...(annualResult.data || []),
        ...(macroResult.data || []),
        ...(pmcResult.data || [])
      ];

      console.log('[DATA-ANALYSIS] Valores retornados:', {
        annual: annualResult.data?.length,
        macro: macroResult.data?.length,
        pmc: pmcResult.data?.length,
        total: data.length
      });

      // Agrupar por ano e calcular médias
      const yearMap = new Map<number, Record<string, number[]>>();
      
      for (const row of data || []) {
        const year = parseInt(row.reference_date.substring(0, 4));
        const code = codeById.get(row.indicator_id);
        
        if (!code) {
          console.warn('[DATA-ANALYSIS] indicator_id sem código mapeado:', row.indicator_id);
          continue;
        }
        
        const varKey = INDICATOR_MAPPING[code];
        if (!varKey) {
          console.warn('[DATA-ANALYSIS] Código não mapeado:', code);
          continue;
        }
        
        if (!yearMap.has(year)) {
          yearMap.set(year, {});
        }
        const yearData = yearMap.get(year)!;
        if (!yearData[varKey]) {
          yearData[varKey] = [];
        }
        yearData[varKey].push(Number(row.value));
      }

      // Debug: contar registros por indicador
      const countByCode: Record<string, number> = {};
      for (const row of data || []) {
        const code = codeById.get(row.indicator_id) || 'unknown';
        countByCode[code] = (countByCode[code] || 0) + 1;
      }
      console.log('[DATA-ANALYSIS] Registros por código:', countByCode);
      console.log('[DATA-ANALYSIS] Anos no yearMap:', Array.from(yearMap.keys()).sort());
      console.log('[DATA-ANALYSIS] Anos processados:', yearMap.size);

      // Converter para array com médias
      const result: AnnualData[] = [];
      const sortedYears = Array.from(yearMap.keys()).sort();
      
      for (const year of sortedYears) {
        const yearValues = yearMap.get(year)!;
        const entry: AnnualData = {
          year,
          sales: 0,
          dollar: 0,
          selic: 0,
          ipca: 0,
          pib: 0,
          unemployment: 0,
          income: 0,
          gini: 0,
          incomeClassA: 0,
          incomeClassB: 0,
          incomeClassC: 0,
          incomeClassD: 0,
          incomeClassE: 0,
          pmcVest: 0,
          pmcMov: 0,
          pmcFarm: 0,
          pmcComb: 0,
          pmcVeic: 0,
          pmcConst: 0,
        };
        
        for (const [key, values] of Object.entries(yearValues)) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          // IPCA mensal → anualizado (soma aproximada)
          if (key === "ipca") {
            entry[key] = avg * 12;
          } else {
            entry[key] = avg;
          }
        }
        
        result.push(entry);
      }

      console.log('[DATA-ANALYSIS] Dados finais:', result.length, 'anos', result.map(r => ({ year: r.year, income: r.income, sales: r.sales })));

      return result;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados de análise...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4 text-center">
          <BarChart3 className="h-12 w-12 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Erro ao carregar dados</p>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Análise de Dados
          </h2>
          <p className="text-muted-foreground">
            Diagnóstico histórico por setor e simulador preditivo
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* 8 TABs Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {SECTOR_TABS.map(tab => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              disabled={tab.disabled}
              className={`
                data-[state=active]:bg-background data-[state=active]:shadow-sm
                ${tab.isSimulator ? 'bg-primary/10 text-primary font-medium' : ''}
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* TABs 1-7: Setores (Grid 2x2) */}
        {SECTOR_TABS.filter(t => !t.isSimulator && !t.disabled && !t.isCorrelation).map(tab => (
          <TabsContent key={tab.id} value={tab.id} className="mt-6">
            <SectorAnalysisGrid 
              sectorCode={tab.code} 
              sectorLabel={tab.label}
              annualData={annualData || []}
            />
          </TabsContent>
        ))}

        {/* TAB Construção (disabled) */}
        <TabsContent value="construcao" className="mt-6">
          <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border border-dashed">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Dados de Construção em processamento</p>
              <p className="text-sm">Em breve disponível</p>
            </div>
          </div>
        </TabsContent>

        {/* TAB Correlações */}
        <TabsContent value="correlacoes" className="mt-6">
          <CorrelationsTab annualData={annualData || []} />
        </TabsContent>

        {/* TAB Simulador 2026 */}
        <TabsContent value="simulador" className="mt-6">
          <Simulator2026 
            annualData={annualData || []} 
            realIndicators={realIndicators}
            isLoadingIndicators={isLoadingIndicators}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
