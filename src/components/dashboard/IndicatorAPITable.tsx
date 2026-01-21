import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database, Download, FileSpreadsheet, Search, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface IndicatorWithAPI {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unit: string | null;
  frequency: string | null;
  system_api_registry: {
    id: string;
    name: string;
    provider: string;
    status: string | null;
  } | null;
}

const categoryLabels: Record<string, string> = {
  macro: "Macro",
  cambio: "Câmbio",
  renda: "Renda",
  varejo: "Varejo",
  emprego: "Emprego",
  desigualdade: "Desigualdade",
};

const frequencyLabels: Record<string, string> = {
  daily: "Diário",
  monthly: "Mensal",
  quarterly: "Trimestral",
  annual: "Anual",
};

const StatusBadge = ({ status }: { status: string | null }) => {
  switch (status) {
    case "active":
      return (
        <Badge
          variant="outline"
          className="bg-primary/10 text-primary border-primary/30"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Ativo
        </Badge>
      );
    case "error":
      return (
        <Badge
          variant="outline"
          className="bg-destructive/10 text-destructive border-destructive/30"
        >
          <XCircle className="w-3 h-3 mr-1" />
          Erro
        </Badge>
      );
    case "inactive":
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
          <AlertCircle className="w-3 h-3 mr-1" />
          Inativo
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
          Desconhecido
        </Badge>
      );
  }
};

export const IndicatorAPITable = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: indicators, isLoading } = useQuery({
    queryKey: ["dashboard-indicator-apis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economic_indicators")
        .select(`
          id, code, name, category, unit, frequency,
          system_api_registry (id, name, provider, status)
        `)
        .not("api_id", "is", null)
        .order("category")
        .order("name");

      if (error) throw error;
      return data as IndicatorWithAPI[];
    },
  });

  const filteredIndicators = indicators?.filter((indicator) => {
    const search = searchTerm.toLowerCase();
    return (
      indicator.name.toLowerCase().includes(search) ||
      indicator.code.toLowerCase().includes(search) ||
      indicator.category?.toLowerCase().includes(search) ||
      indicator.system_api_registry?.name.toLowerCase().includes(search) ||
      indicator.system_api_registry?.provider.toLowerCase().includes(search)
    );
  });

  // Group by category
  const groupedIndicators = filteredIndicators?.reduce((acc, indicator) => {
    const category = indicator.category || "outros";
    if (!acc[category]) acc[category] = [];
    acc[category].push(indicator);
    return acc;
  }, {} as Record<string, IndicatorWithAPI[]>);

  const exportToPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Indicadores Econômicos - Fontes de Dados", 14, 20);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);

      const tableData = filteredIndicators?.map((ind) => [
        ind.name,
        ind.code,
        categoryLabels[ind.category || ""] || ind.category || "-",
        `${ind.system_api_registry?.provider || "-"} - ${ind.system_api_registry?.name || "-"}`,
        frequencyLabels[ind.frequency || ""] || ind.frequency || "-",
        ind.system_api_registry?.status === "active" ? "Ativo" : ind.system_api_registry?.status || "-",
      ]) || [];

      autoTable(doc, {
        head: [["Indicador", "Código", "Categoria", "API Fonte", "Frequência", "Status"]],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save("indicadores-apis.pdf");
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar PDF");
    }
  };

  const exportToExcel = async () => {
    try {
      const { utils, writeFile } = await import("xlsx");

      const data = filteredIndicators?.map((ind) => ({
        Indicador: ind.name,
        Código: ind.code,
        Categoria: categoryLabels[ind.category || ""] || ind.category || "-",
        Unidade: ind.unit || "-",
        Frequência: frequencyLabels[ind.frequency || ""] || ind.frequency || "-",
        "API Provedor": ind.system_api_registry?.provider || "-",
        "API Nome": ind.system_api_registry?.name || "-",
        Status: ind.system_api_registry?.status || "-",
      })) || [];

      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Indicadores");
      writeFile(wb, "indicadores-apis.xlsx");
      toast.success("Excel exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar Excel");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">APIs de Dados Econômicos</h3>
            <p className="text-sm text-muted-foreground">
              {indicators?.length || 0} indicadores monitorados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar indicador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Indicador</TableHead>
              <TableHead className="font-semibold">Código</TableHead>
              <TableHead className="font-semibold">Categoria</TableHead>
              <TableHead className="font-semibold">API Fonte</TableHead>
              <TableHead className="font-semibold">Frequência</TableHead>
              <TableHead className="font-semibold text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedIndicators && Object.entries(groupedIndicators).map(([category, items]) => (
              items.map((indicator, idx) => (
                <TableRow 
                  key={indicator.id}
                  className={idx === 0 ? "border-t-2 border-t-primary/20" : ""}
                >
                  <TableCell className="font-medium">{indicator.name}</TableCell>
                  <TableCell>
                    <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                      {indicator.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {categoryLabels[category] || category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {indicator.system_api_registry?.provider || "-"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {indicator.system_api_registry?.name || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {frequencyLabels[indicator.frequency || ""] || indicator.frequency || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={indicator.system_api_registry?.status || null} />
                  </TableCell>
                </TableRow>
              ))
            ))}
            {(!filteredIndicators || filteredIndicators.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Nenhum indicador encontrado" : "Nenhum indicador cadastrado"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default IndicatorAPITable;
