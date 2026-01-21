import { useState, useMemo } from 'react';
import { 
  Loader2,
  Calendar,
  MapPin,
  Database,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
// Using native HTML table elements for sticky header support
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateByFrequency } from "@/lib/date-formatters";

interface IndicatorValueWithUF {
  reference_date: string;
  value: number;
  brazilian_ufs?: { uf_name: string; uf_sigla: string } | null;
}

interface TableDataContentProps {
  onBack: () => void;
  indicatorName: string;
  indicatorCode: string;
  isRegional: boolean;
  data: IndicatorValueWithUF[];
  unit: string | null;
  frequency: string | null;
  isLoading: boolean;
  isMonetaryMode?: boolean;
}

type SortColumn = 'date' | 'uf' | 'value' | null;
type SortDirection = 'asc' | 'desc' | null;

const FREQUENCIES: Record<string, string> = {
  daily: "Diária",
  monthly: "Mensal",
  quarterly: "Trimestral",
  annual: "Anual",
};

// Format large monetary values in millions/billions
function formatLargeMonetaryValue(value: number): string {
  if (value >= 1_000_000_000) {
    return `R$ ${(value / 1_000_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bi`;
  }
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mi`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mil`;
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTableValue(value: number, unit: string | null, isMonetaryMode?: boolean): string {
  if (isMonetaryMode) {
    return formatLargeMonetaryValue(value);
  }

  const u = (unit || "").toLowerCase();

  if (u.includes("%")) {
    return `${value.toFixed(2)}%`;
  }

  if (u.includes("r$") || u.includes("mil") || u.includes("reais") || u === "brl") {
    return formatLargeMonetaryValue(value);
  }

  if (u.includes("us$") || u.includes("usd") || u.includes("dólar") || u.includes("dollar")) {
    return `$ ${value.toFixed(2)}`;
  }

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TableDataContent({
  onBack,
  indicatorName,
  indicatorCode,
  isRegional,
  data,
  unit,
  frequency,
  isLoading,
  isMonetaryMode = false,
}: TableDataContentProps) {
  // Default: sorted by date descending (most recent first)
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle: desc → asc → null → desc
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;
    
    return [...data].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'date':
          comparison = a.reference_date.localeCompare(b.reference_date);
          break;
        case 'uf':
          const ufA = a.brazilian_ufs?.uf_sigla || '';
          const ufB = b.brazilian_ufs?.uf_sigla || '';
          comparison = ufA.localeCompare(ufB);
          break;
        case 'value':
          comparison = (a.value || 0) - (b.value || 0);
          break;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [data, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="flex-shrink-0 sticky top-0 z-20 px-6 py-4 border-b border-cyan-500/20 bg-[#0D0D12]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={cn(
                "flex items-center gap-2 px-3 py-2",
                "bg-cyan-500/10 hover:bg-cyan-500/20",
                "border border-cyan-500/30 hover:border-cyan-500/50",
                "rounded-lg transition-all duration-200 text-white"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </button>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-500" />
              <h3 className="text-lg font-semibold text-white">{indicatorName}</h3>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono">{indicatorCode}</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {FREQUENCIES[frequency || ""] || frequency || "-"}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {isRegional ? "Por UF" : "Brasil"}
            </div>
            <Badge variant="outline" className="text-xs">
              {data.length} registros
            </Badge>
          </div>
        </div>
      </div>

      {/* Table Content - scrollable */}
      <div className="flex-1 min-h-0 px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border border-cyan-500/20 rounded-md overflow-auto max-h-[calc(100vh-280px)]">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 bg-[#0D0D12] z-10 [&_tr]:border-b">
                <tr className="border-b border-cyan-500/20">
                  <th 
                    className="h-12 px-4 text-left align-middle font-medium text-cyan-400 cursor-pointer hover:text-cyan-300 select-none transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Data
                      <SortIcon column="date" />
                    </div>
                  </th>
                  {isRegional && (
                    <th 
                      className="h-12 px-4 text-left align-middle font-medium text-cyan-400 cursor-pointer hover:text-cyan-300 select-none transition-colors"
                      onClick={() => handleSort('uf')}
                    >
                      <div className="flex items-center">
                        UF
                        <SortIcon column="uf" />
                      </div>
                    </th>
                  )}
                  <th 
                    className="h-12 px-4 text-right align-middle font-medium text-cyan-400 cursor-pointer hover:text-cyan-300 select-none transition-colors"
                    onClick={() => handleSort('value')}
                  >
                    <div className="flex items-center justify-end">
                      Valor
                      <SortIcon column="value" />
                    </div>
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-cyan-400">Indicador</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {sortedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isRegional ? 4 : 3}
                      className="p-4 text-center text-muted-foreground py-8"
                    >
                      Nenhum valor encontrado para este indicador.
                    </td>
                  </tr>
                ) : (
                  sortedData.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-colors"
                    >
                      <td className="p-4 align-middle font-mono text-sm text-white">
                        {formatDateByFrequency(item.reference_date, frequency)}
                      </td>
                      {isRegional && (
                        <td className="p-4 align-middle font-semibold text-sm text-white">
                          {item.brazilian_ufs?.uf_sigla || "-"}
                        </td>
                      )}
                      <td className="p-4 align-middle text-right font-mono text-white">
                        {formatTableValue(Number(item.value), unit, isMonetaryMode)}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {indicatorName}
                        {!isRegional && " - Brasil"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default TableDataContent;
