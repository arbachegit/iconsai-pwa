import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RealIndicators {
  renda: number;
  dolar: number;
  selic: number;
  ipca: number;
  desemprego: number;
  lastUpdated: string;
  sources: {
    renda: string;
    dolar: string;
    selic: string;
    ipca: string;
    desemprego: string;
  };
}

// Códigos dos indicadores no banco
const INDICATOR_CODES = {
  renda: "RENDA_MEDIA",
  dolar: "DOLAR",
  selic: "SELIC",
  ipca: "IPCA",
  desemprego: "4099",
};

// Valores fallback caso não encontre dados
const FALLBACK_VALUES: RealIndicators = {
  renda: 1950,
  dolar: 5.80,
  selic: 12.5,
  ipca: 4.5,
  desemprego: 7.5,
  lastUpdated: new Date().toISOString(),
  sources: {
    renda: "Fallback",
    dolar: "Fallback",
    selic: "Fallback",
    ipca: "Fallback",
    desemprego: "Fallback",
  },
};

export function useRealTimeIndicators() {
  return useQuery({
    queryKey: ["real-time-indicators"],
    queryFn: async (): Promise<RealIndicators> => {
      try {
        // Buscar IDs dos indicadores
        const { data: indicators, error: indError } = await supabase
          .from("economic_indicators")
          .select("id, code, name")
          .in("code", Object.values(INDICATOR_CODES));

        if (indError) throw indError;

        if (!indicators?.length) {
          console.warn("[useRealTimeIndicators] Nenhum indicador encontrado");
          return FALLBACK_VALUES;
        }

        // Criar mapa code -> id
        const codeToId = new Map(indicators.map((i) => [i.code, i.id]));
        const idToCode = new Map(indicators.map((i) => [i.id, i.code]));

        // Buscar últimos valores para cada indicador
        const indicatorIds = indicators.map((i) => i.id);

        // Para IPCA, precisamos dos últimos 12 meses para anualizar
        const ipcaId = codeToId.get("IPCA");

        // Buscar últimos valores (exceto IPCA)
        const { data: latestValues, error: valError } = await supabase
          .from("indicator_values")
          .select("indicator_id, value, reference_date")
          .in("indicator_id", indicatorIds.filter((id) => id !== ipcaId))
          .order("reference_date", { ascending: false })
          .limit(50);

        if (valError) throw valError;

        // Buscar últimos 12 meses de IPCA para anualizar
        let ipcaAnnualized = FALLBACK_VALUES.ipca;
        let ipcaDate = FALLBACK_VALUES.lastUpdated;

        if (ipcaId) {
          const { data: ipcaValues, error: ipcaError } = await supabase
            .from("indicator_values")
            .select("value, reference_date")
            .eq("indicator_id", ipcaId)
            .order("reference_date", { ascending: false })
            .limit(12);

          if (!ipcaError && ipcaValues?.length) {
            // Somar últimos 12 meses para anualizar
            ipcaAnnualized = ipcaValues.reduce((sum, v) => sum + Number(v.value), 0);
            ipcaDate = ipcaValues[0].reference_date;
          }
        }

        // Extrair último valor de cada indicador
        const latestByCode: Record<string, { value: number; date: string }> = {};

        for (const row of latestValues || []) {
          const code = idToCode.get(row.indicator_id);
          if (code && !latestByCode[code]) {
            latestByCode[code] = {
              value: Number(row.value),
              date: row.reference_date,
            };
          }
        }

        // Determinar a data mais recente
        const dates = [
          ...Object.values(latestByCode).map((v) => v.date),
          ipcaDate,
        ].filter(Boolean);
        const mostRecent = dates.sort().reverse()[0] || new Date().toISOString();

        // Montar resultado
        const result: RealIndicators = {
          renda: latestByCode[INDICATOR_CODES.renda]?.value ?? FALLBACK_VALUES.renda,
          dolar: latestByCode[INDICATOR_CODES.dolar]?.value ?? FALLBACK_VALUES.dolar,
          selic: latestByCode[INDICATOR_CODES.selic]?.value ?? FALLBACK_VALUES.selic,
          ipca: Math.round(ipcaAnnualized * 100) / 100,
          desemprego: latestByCode[INDICATOR_CODES.desemprego]?.value ?? FALLBACK_VALUES.desemprego,
          lastUpdated: mostRecent,
          sources: {
            renda: latestByCode[INDICATOR_CODES.renda] ? "IBGE/PNAD" : "Fallback",
            dolar: latestByCode[INDICATOR_CODES.dolar] ? "BCB" : "Fallback",
            selic: latestByCode[INDICATOR_CODES.selic] ? "BCB" : "Fallback",
            ipca: ipcaId ? "IBGE" : "Fallback",
            desemprego: latestByCode[INDICATOR_CODES.desemprego] ? "IBGE/PNAD" : "Fallback",
          },
        };

        console.log("[useRealTimeIndicators] Dados carregados:", result);
        return result;
      } catch (error) {
        console.error("[useRealTimeIndicators] Erro:", error);
        return FALLBACK_VALUES;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 minutos
  });
}
