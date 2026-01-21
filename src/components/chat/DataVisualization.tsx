import React, { useMemo, useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  Download, 
  ChevronUp, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Table2,
  ArrowLeftRight
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  AreaChart,
  ScatterChart,
  PieChart,
  Pie,
  Cell,
  Line,
  Bar,
  Area,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { summary, linearRegression } from "@/lib/mathUtils";
import { exportData } from "@/lib/export-utils";

interface DataVisualizationProps {
  data: any[];
  columns: string[];
  fileName: string;
}

type ChartType = "line" | "bar" | "area" | "scatter" | "pie";
type SortDirection = "asc" | "desc" | null;
type ColumnType = "date" | "numeric" | "categorical";

interface ColumnAnalysis {
  name: string;
  type: ColumnType;
  uniqueCount: number;
}

const ROWS_PER_PAGE = 100;

const PIE_COLORS = [
  "#00CED1", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"
];

export const DataVisualization = ({ data, columns, fileName }: DataVisualizationProps) => {
  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Chart state
  const [xColumn, setXColumn] = useState<string>(columns[0] || "");
  const [yColumn, setYColumn] = useState<string>("");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [showTrendLine, setShowTrendLine] = useState(false);

  // Helper para detectar se valor é data serial do Excel
  const isExcelDateSerial = (value: any): boolean => {
    return typeof value === "number" && value > 25569 && value < 60000;
  };

  // Sistema de classificação inteligente de colunas
  const analyzeColumns = useMemo((): ColumnAnalysis[] => {
    return columns.map(col => {
      const values = data.map(row => row[col]).filter(v => v != null && v !== "");
      const uniqueCount = new Set(values.map(String)).size;
      
      // Detectar se é coluna de DATA
      const dateCount = values.filter(v => 
        v instanceof Date || 
        isExcelDateSerial(v) ||
        /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(String(v)) ||
        /^\d{4}-\d{2}-\d{2}/.test(String(v))
      ).length;
      
      if (dateCount > values.length * 0.5) {
        return { name: col, type: "date" as ColumnType, uniqueCount };
      }
      
      // Detectar se é coluna NUMÉRICA (incluindo formato BR: 1.234,56)
      const numericCount = values.filter(v => {
        // Já é número JavaScript
        if (typeof v === "number" && !isExcelDateSerial(v)) return true;
        
        const str = String(v).trim();
        if (str === "") return false;
        
        // Número simples (inteiro ou decimal)
        if (/^-?\d+$/.test(str)) return true;
        if (/^-?\d+\.\d+$/.test(str)) return true;
        if (/^-?\d+,\d+$/.test(str)) return true;
        
        // Formato BR: 1.234,56
        const normalizedBR = str.replace(/\./g, "").replace(",", ".");
        if (!isNaN(Number(normalizedBR)) && normalizedBR !== "") return true;
        
        // Formato US: 1,234.56
        const normalizedUS = str.replace(/,/g, "");
        return !isNaN(Number(normalizedUS)) && normalizedUS !== "";
      }).length;
      
      const type: ColumnType = numericCount > values.length * 0.5 ? "numeric" : "categorical";
      
      // Debug removed - use logger if needed
      
      // Threshold reduzido para 50% (planilhas reais têm células vazias)
      if (numericCount > values.length * 0.5) {
        return { name: col, type: "numeric" as ColumnType, uniqueCount };
      }
      
      // Caso contrário, é CATEGÓRICA
      return { name: col, type: "categorical" as ColumnType, uniqueCount };
    });
  }, [data, columns]);

  // Listas filtradas por tipo
  const dateColumns = useMemo(() => 
    analyzeColumns.filter(c => c.type === "date").map(c => c.name), 
    [analyzeColumns]
  );

  const numericColumnsReal = useMemo(() => 
    analyzeColumns.filter(c => c.type === "numeric").map(c => c.name), 
    [analyzeColumns]
  );

  const categoricalColumns = useMemo(() => 
    analyzeColumns.filter(c => c.type === "categorical").map(c => c.name), 
    [analyzeColumns]
  );

  // Colunas válidas para Y = apenas numéricas (nunca datas ou a mesma do X)
  const validYColumns = useMemo(() => {
    return numericColumnsReal.filter(col => col !== xColumn);
  }, [numericColumnsReal, xColumn]);

  // Colunas válidas para X = datas + categóricas com baixa cardinalidade
  const validXColumns = useMemo(() => {
    return analyzeColumns
      .filter(c => 
        c.type === "date" || 
        (c.type === "categorical" && c.uniqueCount <= 50) ||
        c.name !== yColumn
      )
      .map(c => c.name);
  }, [analyzeColumns, yColumn]);

  // Auto-seleção inteligente de X e Y
  useEffect(() => {
    // Auto-selecionar melhor X: preferir Data, depois Categórica com poucos valores
    if (!xColumn || !columns.includes(xColumn)) {
      const bestX = dateColumns[0] || 
        categoricalColumns.find(c => {
          const analysis = analyzeColumns.find(a => a.name === c);
          return analysis && analysis.uniqueCount < data.length * 0.3;
        }) || 
        columns[0];
      if (bestX) setXColumn(bestX);
    }
    
    // Auto-selecionar melhor Y: primeira coluna numérica
    if (!yColumn || !columns.includes(yColumn)) {
      const bestY = numericColumnsReal[0];
      if (bestY) setYColumn(bestY);
    }
  }, [columns, dateColumns, numericColumnsReal, categoricalColumns, analyzeColumns, data.length]);

  // Forçar reset do yColumn quando não está em validYColumns
  useEffect(() => {
    if (yColumn && validYColumns.length > 0 && !validYColumns.includes(yColumn)) {
      // Debug removed - yColumn reset to first valid column
      setYColumn(validYColumns[0]);
    }
  }, [yColumn, validYColumns]);

  // Keep old numericColumns for backward compatibility (statistics tab)
  const numericColumns = numericColumnsReal;

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const aNum = Number(aVal);
      const bNum = Number(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, sortColumn, sortDirection]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedData.slice(start, start + ROWS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);

  // Detectar se Y parece conter datas e avisar usuário
  useEffect(() => {
    if (!yColumn || data.length === 0) return;
    
    const analysis = analyzeColumns.find(a => a.name === yColumn);
    if (analysis?.type === "date") {
      toast.warning("A coluna Y parece conter datas. Considere trocar os eixos X ↔ Y.");
    }
  }, [yColumn, analyzeColumns, data.length]);

  // Helper para parsear números em formato brasileiro (1.234,56)
  // Importante: dados podem vir com símbolos (R$, %, espaços) e separadores variados.
  const parseNumber = (value: any): number => {
    if (value == null) return 0;
    if (value instanceof Date) return 0;

    if (typeof value === "number") {
      if (isExcelDateSerial(value)) return 0;
      return Number.isFinite(value) ? value : 0;
    }

    let str = String(value).trim();
    if (str === "") return 0;

    // Ex: "(1.234,56)" -> -1234,56
    let negative = false;
    if (str.startsWith("(") && str.endsWith(")")) {
      negative = true;
      str = str.slice(1, -1).trim();
    }

    // Remove qualquer coisa que não seja dígito, separador decimal/milhar ou sinal
    // (remove: R$, %, letras, espaços, etc.)
    str = str.replace(/\s+/g, "").replace(/[^\d,.-]/g, "");
    if (str === "" || str === "-" || str === "." || str === ",") return 0;

    const hasDot = str.includes(".");
    const hasComma = str.includes(",");

    let normalized = str;

    // Se tem ambos, inferir separador decimal pelo último que aparece
    if (hasDot && hasComma) {
      const lastComma = str.lastIndexOf(",");
      const lastDot = str.lastIndexOf(".");
      if (lastComma > lastDot) {
        // BR: 1.234,56
        normalized = str.replace(/\./g, "").replace(",", ".");
      } else {
        // US: 1,234.56
        normalized = str.replace(/,/g, "");
      }
    } else if (hasComma && !hasDot) {
      // Apenas vírgula: pode ser decimal (12,34) ou milhar (1,234)
      const parts = str.split(",");
      if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
        normalized = `${parts[0]}.${parts[1]}`;
      } else {
        normalized = str.replace(/,/g, "");
      }
    } else if (hasDot && !hasComma) {
      // Apenas ponto: pode ser decimal (12.34) ou milhar (1.234.567)
      const parts = str.split(".");
      if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
        normalized = str;
      } else {
        normalized = str.replace(/\./g, "");
      }
    }

    const num = Number(normalized);
    const finalNum = Number.isFinite(num) ? num : 0;
    return negative ? -finalNum : finalNum;
  };

  // Detectar se Y parece conter datas e avisar usuário
  useEffect(() => {
    if (!yColumn || data.length === 0) return;
    
    const dateCount = data.filter(row => 
      row[yColumn] instanceof Date || isExcelDateSerial(row[yColumn])
    ).length;
    
    if (dateCount > data.length * 0.5) {
      toast.warning("A coluna Y parece conter datas. Considere trocar os eixos X ↔ Y.");
    }
  }, [yColumn, data]);

  // Helper para formatar valores do eixo X (datas)
  const formatXValue = (value: any): string => {
    if (value instanceof Date) {
      return value.toLocaleDateString("pt-BR");
    }
    // Número serial do Excel (datas recentes: 40000-60000)
    if (typeof value === "number" && value > 40000 && value < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return date.toLocaleDateString("pt-BR");
    }
    return String(value);
  };

  // Chart data
  const chartData = useMemo(() => {
    if (!xColumn || !yColumn) return [];

    return data
      .map((row, index) => ({
        x: row[xColumn] ?? index,
        y: parseNumber(row[yColumn]),
        name: formatXValue(row[xColumn] ?? index),
      }))
      .filter((d) => !isNaN(d.y) && isFinite(d.y));
  }, [data, xColumn, yColumn]);

  // Pie chart data - aggregates by category
  const pieChartData = useMemo(() => {
    if (!xColumn || !yColumn) return [];

    const aggregated: Record<string, number> = {};
    data.forEach((row) => {
      const key = formatXValue(row[xColumn] ?? "Outros");
      const value = parseNumber(row[yColumn]);
      aggregated[key] = (aggregated[key] || 0) + value;
    });

    return Object.entries(aggregated)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Limit to top 10 for readability
  }, [data, xColumn, yColumn]);

  // Trend line calculation
  const trendLineData = useMemo(() => {
    if (!showTrendLine || chartData.length < 2) return null;

    // Filtra pares (x,y) mantendo alinhamento entre X e Y
    const pairs = chartData
      .map((d, i) => ({ x: i, y: d.y }))
      .filter((p) => !isNaN(p.y) && isFinite(p.y) && p.y !== 0);

    if (pairs.length < 2) return null;

    const xValues = pairs.map((p) => p.x);
    const yValues = pairs.map((p) => p.y);

    const regression = linearRegression(xValues, yValues);

    // Validações para evitar NaN/∞ (divisão por zero, etc.)
    if (!isFinite(regression.slope) || !isFinite(regression.intercept)) return null;

    return {
      slope: regression.slope,
      intercept: regression.intercept,
      startY: regression.intercept,
      endY: regression.slope * (chartData.length - 1) + regression.intercept,
    };
  }, [chartData, showTrendLine]);

  // Quality analysis
  const qualityMetrics = useMemo(() => {
    const totalCells = data.length * columns.length;
    let emptyCells = 0;
    const columnStats: Record<string, {
      empty: number;
      type: "numérico" | "texto" | "data" | "booleano" | "misto";
      duplicates: number;
      outliers: number;
    }> = {};

    // Analyze each column
    columns.forEach((col) => {
      const values = data.map((row) => row[col]);
      const nonNullValues = values.filter((v) => v != null && v !== "" && v !== undefined);
      const emptyCount = values.length - nonNullValues.length;
      emptyCells += emptyCount;

      // Detect type
      let type: "numérico" | "texto" | "data" | "booleano" | "misto" = "texto";
      const numericValues = nonNullValues.filter((v) => !isNaN(Number(v)));
      const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/;
      const dateValues = nonNullValues.filter((v) => typeof v === "string" && datePattern.test(v));
      const boolValues = nonNullValues.filter((v) => 
        v === true || v === false || v === "true" || v === "false" || v === "sim" || v === "não"
      );

      if (numericValues.length === nonNullValues.length && nonNullValues.length > 0) {
        type = "numérico";
      } else if (dateValues.length === nonNullValues.length && nonNullValues.length > 0) {
        type = "data";
      } else if (boolValues.length === nonNullValues.length && nonNullValues.length > 0) {
        type = "booleano";
      } else if (numericValues.length > 0 && numericValues.length < nonNullValues.length) {
        type = "misto";
      }

      // Count duplicates
      const uniqueValues = new Set(values.map(String));
      const duplicateCount = values.length - uniqueValues.size;

      // Count outliers (for numeric columns)
      let outlierCount = 0;
      if (type === "numérico" && numericValues.length > 2) {
        const nums = numericValues.map(Number);
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const std = Math.sqrt(
          nums.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / nums.length
        );
        if (std > 0) {
          outlierCount = nums.filter((v) => Math.abs(v - mean) > 2 * std).length;
        }
      }

      columnStats[col] = {
        empty: emptyCount,
        type,
        duplicates: duplicateCount,
        outliers: outlierCount,
      };
    });

    // Find duplicate rows
    const rowStrings = data.map((row) => JSON.stringify(row));
    const uniqueRows = new Set(rowStrings);
    const duplicateRows = data.length - uniqueRows.size;

    // Calculate quality score
    const emptyPenalty = (emptyCells / totalCells) * 30;
    const duplicatePenalty = (duplicateRows / data.length) * 30;
    const totalOutliers = Object.values(columnStats).reduce((sum, s) => sum + s.outliers, 0);
    const outlierPenalty = Math.min((totalOutliers / data.length) * 20, 20);
    const qualityScore = Math.max(0, Math.min(100, 100 - emptyPenalty - duplicatePenalty - outlierPenalty));

    return {
      totalCells,
      emptyCells,
      columnStats,
      duplicateRows,
      qualityScore,
    };
  }, [data, columns]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Export handler
  const handleExport = () => {
    exportData({
      filename: fileName.replace(/\.[^/.]+$/, ""),
      data,
      format: "csv",
      columns: columns.map((col) => ({ key: col, label: col })),
    });
  };

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    const chartComponents = {
      line: (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,206,209,0.1)" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(0,206,209,0.3)",
              borderRadius: "8px",
            }}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#00CED1"
            strokeWidth={2}
            dot={{ fill: "#00CED1", r: 3 }}
          />
          {trendLineData && (
            <ReferenceLine
              segment={[
                { x: chartData[0]?.name, y: trendLineData.startY },
                { x: chartData[chartData.length - 1]?.name, y: trendLineData.endY },
              ]}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          )}
        </LineChart>
      ),
      bar: (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,206,209,0.1)" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(0,206,209,0.3)",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="y" fill="#00CED1" radius={[4, 4, 0, 0]} />
        </BarChart>
      ),
      area: (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,206,209,0.1)" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(0,206,209,0.3)",
              borderRadius: "8px",
            }}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke="#00CED1"
            fill="rgba(0,206,209,0.2)"
          />
        </AreaChart>
      ),
      scatter: (
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,206,209,0.1)" />
          <XAxis dataKey="x" stroke="#94a3b8" fontSize={12} name={xColumn} />
          <YAxis dataKey="y" stroke="#94a3b8" fontSize={12} name={yColumn} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(0,206,209,0.3)",
              borderRadius: "8px",
            }}
          />
          <Scatter dataKey="y" fill="#00CED1" />
        </ScatterChart>
      ),
      pie: (
        <PieChart {...commonProps}>
          <Pie
            data={pieChartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name.slice(0, 10)}${name.length > 10 ? '...' : ''} ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {pieChartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(0,206,209,0.3)",
              borderRadius: "8px",
            }}
            formatter={(value: number) => value.toLocaleString('pt-BR')}
          />
        </PieChart>
      ),
    };

    return chartComponents[chartType];
  };

  return (
    <div className="w-full bg-slate-900/50 border border-cyan-500/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-cyan-500/20 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">{fileName}</span>
          <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-300 text-xs flex items-center gap-1">
            <Table2 className="h-3 w-3" />
            {data.length} registros • {columns.length} colunas
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        >
          <Download className="h-4 w-4 mr-1" />
          CSV
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tabela" className="w-full">
        <TabsList className="w-full justify-start bg-slate-800/30 border-b border-cyan-500/20 rounded-none p-1 overflow-x-auto">
          <TabsTrigger
            value="tabela"
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
          >
            Tabela
          </TabsTrigger>
          <TabsTrigger
            value="estatisticas"
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
          >
            Estatísticas
          </TabsTrigger>
          <TabsTrigger
            value="grafico"
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
          >
            Gráfico
          </TabsTrigger>
          <TabsTrigger
            value="qualidade"
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
          >
            Qualidade
          </TabsTrigger>
        </TabsList>

        {/* Tab: Tabela */}
        <TabsContent value="tabela" className="m-0">
          <div className="border border-cyan-500/20 rounded overflow-hidden">
            <div className="max-h-[200px] overflow-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-800">
                  <tr className="border-b border-cyan-500/30">
                    {columns.map((col) => (
                          <th
                            key={col}
                            onClick={() => handleSort(col)}
                            className="text-cyan-400 cursor-pointer hover:text-cyan-300 text-center px-1.5 py-1 font-medium bg-slate-800 whitespace-nowrap"
                          >
                            <div className="flex items-center justify-center gap-0.5">
                          <span className="truncate max-w-[100px]" title={col}>{col}</span>
                          {sortColumn === col && (
                            sortDirection === "asc" ? (
                              <ChevronUp className="h-2.5 w-2.5 shrink-0" />
                            ) : (
                              <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                            )
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr key={idx} className="border-b border-cyan-500/10 hover:bg-cyan-500/5">
                      {columns.map((col) => {
                        const cellValue = row[col];
                        const displayValue = cellValue instanceof Date 
                          ? cellValue.toLocaleDateString('pt-BR') 
                          : (cellValue ?? "-");
                        return (
                          <td 
                            key={col} 
                            className="text-slate-300 text-center px-1.5 py-0.5 whitespace-nowrap truncate max-w-[120px]"
                            title={String(displayValue)}
                          >
                            {String(displayValue)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-cyan-500/20 bg-slate-800/30">
              <span className="text-xs text-slate-400">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: Estatísticas */}
        <TabsContent value="estatisticas" className="m-0 p-4">
          {numericColumns.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              Nenhuma coluna numérica encontrada
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {numericColumns.map((col) => {
                const values = data.map((row) => Number(row[col])).filter((v) => !isNaN(v));
                const stats = summary(values);

                return (
                  <div
                    key={col}
                    className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-3"
                  >
                    <h4 className="text-cyan-400 font-medium text-sm mb-2 truncate">
                      {col}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Contagem:</span>
                        <span className="text-slate-300 ml-1">{stats.count}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Média:</span>
                        <span className="text-slate-300 ml-1">{stats.mean.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Mediana:</span>
                        <span className="text-slate-300 ml-1">{stats.median.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Desvio:</span>
                        <span className="text-slate-300 ml-1">{stats.std.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Mín:</span>
                        <span className="text-slate-300 ml-1">{stats.min.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Máx:</span>
                        <span className="text-slate-300 ml-1">{stats.max.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Gráfico */}
        <TabsContent value="grafico" className="m-0 p-4 overflow-hidden">
          {/* Chart Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {chartType !== "pie" && (
              <>
                <div className="w-full">
                  <label className="text-xs text-slate-400 mb-1 block">Eixo X</label>
                  <Select value={xColumn} onValueChange={setXColumn}>
                    <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-cyan-500/20">
                      {validXColumns.map((col) => {
                        const analysis = analyzeColumns.find(a => a.name === col);
                        const icon = analysis?.type === "date" ? "📅" : 
                                     analysis?.type === "categorical" ? "🏷️" : "🔢";
                        return (
                          <SelectItem key={col} value={col}>
                            {col} {icon}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botão Swap X ↔ Y */}
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const tempX = xColumn;
                      setXColumn(yColumn);
                      setYColumn(tempX);
                    }}
                    title="Trocar eixos X ↔ Y"
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-9"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {chartType === "pie" && (
              <div className="w-full">
                <label className="text-xs text-slate-400 mb-1 block">Categoria</label>
                <Select value={xColumn} onValueChange={setXColumn}>
                  <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-cyan-500/20">
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="w-full">
              <label className="text-xs text-slate-400 mb-1 block">{chartType === "pie" ? "Valor" : "Eixo Y"}</label>
              <Select value={yColumn} onValueChange={setYColumn}>
                <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-cyan-500/20">
                  {validYColumns.length > 0 ? (
                    validYColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col} 📊
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__placeholder__" disabled>
                      Nenhuma coluna numérica disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-cyan-500/20">
                  <SelectItem value="line">Linha</SelectItem>
                  <SelectItem value="bar">Barra</SelectItem>
                  <SelectItem value="area">Área</SelectItem>
                  <SelectItem value="scatter">Scatter</SelectItem>
                  <SelectItem value="pie">Pizza</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {chartType !== "pie" && (
              <div className="flex items-end col-span-2 md:col-span-1">
                <Button
                  variant={showTrendLine ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowTrendLine(!showTrendLine)}
                  className={showTrendLine 
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" 
                    : "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  }
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Tendência
                </Button>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="h-[350px] bg-slate-800/30 rounded-lg border border-cyan-500/10 p-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Selecione as colunas para visualizar o gráfico
              </div>
            )}
          </div>

          {/* Trend line info */}
          {showTrendLine && trendLineData && (
            <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Regressão Linear: y = {Math.abs(trendLineData.slope) >= 1000 ? trendLineData.slope.toExponential(2) : trendLineData.slope.toFixed(4)}x + {Math.abs(trendLineData.intercept) >= 1000 ? trendLineData.intercept.toExponential(2) : trendLineData.intercept.toFixed(4)}
            </div>
          )}
        </TabsContent>

        {/* Tab: Qualidade */}
        <TabsContent value="qualidade" className="m-0 p-4">
          {/* Quality Score */}
          <div className="mb-4 p-4 bg-slate-800/50 border border-cyan-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-400 font-medium flex items-center gap-2">
                {qualityMetrics.qualityScore >= 80 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : qualityMetrics.qualityScore >= 50 ? (
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                )}
                Score de Qualidade
              </span>
              <span className={`text-2xl font-bold ${
                qualityMetrics.qualityScore >= 80 ? "text-emerald-400" :
                qualityMetrics.qualityScore >= 50 ? "text-amber-400" : "text-red-400"
              }`}>
                {qualityMetrics.qualityScore.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  qualityMetrics.qualityScore >= 80 ? "bg-emerald-500" :
                  qualityMetrics.qualityScore >= 50 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${qualityMetrics.qualityScore}%` }}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-200">{qualityMetrics.emptyCells}</div>
              <div className="text-xs text-slate-400">Células Vazias</div>
              <div className="text-xs text-cyan-400">
                ({((qualityMetrics.emptyCells / qualityMetrics.totalCells) * 100).toFixed(1)}%)
              </div>
            </div>
            <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-200">{qualityMetrics.duplicateRows}</div>
              <div className="text-xs text-slate-400">Linhas Duplicadas</div>
              <div className="text-xs text-cyan-400">
                ({((qualityMetrics.duplicateRows / data.length) * 100).toFixed(1)}%)
              </div>
            </div>
            <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-200">
                {Object.values(qualityMetrics.columnStats).reduce((sum, s) => sum + s.outliers, 0)}
              </div>
              <div className="text-xs text-slate-400">Outliers Totais</div>
              <div className="text-xs text-cyan-400">(valores {">"}2σ)</div>
            </div>
            <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-200">{columns.length}</div>
              <div className="text-xs text-slate-400">Colunas</div>
              <div className="text-xs text-cyan-400">{data.length} registros</div>
            </div>
          </div>

          {/* Column Details Table */}
          <div className="max-h-[200px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-cyan-500/20">
                  <TableHead className="text-cyan-400 text-xs">Coluna</TableHead>
                  <TableHead className="text-cyan-400 text-xs text-center">Vazios</TableHead>
                  <TableHead className="text-cyan-400 text-xs text-center">Tipo</TableHead>
                  <TableHead className="text-cyan-400 text-xs text-center">Duplicados</TableHead>
                  <TableHead className="text-cyan-400 text-xs text-center">Outliers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((col) => {
                  const stats = qualityMetrics.columnStats[col];
                  return (
                    <TableRow key={col} className="border-cyan-500/10">
                      <TableCell className="text-slate-300 text-xs font-medium">{col}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${stats.empty > 0 ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}
                        >
                          {stats.empty} ({((stats.empty / data.length) * 100).toFixed(0)}%)
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs bg-cyan-500/20 text-cyan-300">
                          {stats.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-slate-400 text-xs">{stats.duplicates}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${stats.outliers > 0 ? "bg-red-500/20 text-red-300" : "bg-slate-500/20 text-slate-300"}`}
                        >
                          {stats.outliers}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
