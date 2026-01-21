import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, FileText, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ApiData {
  id: string;
  name: string;
  provider: string;
  description: string;
  endpoint: string;
  lastCheck: string;
  frequency: string;
  status: "active" | "warning" | "error" | "inactive";
}

const apisData: ApiData[] = [
  {
    id: "viacep",
    name: "ViaCEP",
    provider: "ViaCEP",
    description: "Consulta de endereços por CEP",
    endpoint: "viacep.com.br/ws",
    lastCheck: new Date().toISOString(),
    frequency: "Por demanda",
    status: "active"
  },
  {
    id: "ibge-sidra",
    name: "SIDRA API",
    provider: "IBGE",
    description: "Dados estatísticos brasileiros",
    endpoint: "sidra.ibge.gov.br/api",
    lastCheck: new Date().toISOString(),
    frequency: "Diário",
    status: "active"
  },
  {
    id: "ipeadata",
    name: "IPEADATA",
    provider: "IPEA",
    description: "Dados econômicos brasileiros",
    endpoint: "ipeadata.gov.br/api",
    lastCheck: new Date().toISOString(),
    frequency: "Diário",
    status: "active"
  },
  {
    id: "bcb-sgs",
    name: "BCB SGS",
    provider: "Banco Central",
    description: "Séries temporais (Selic, IPCA, etc)",
    endpoint: "api.bcb.gov.br/dados/serie",
    lastCheck: new Date().toISOString(),
    frequency: "Diário",
    status: "active"
  },
  {
    id: "bcb-ptax",
    name: "PTAX",
    provider: "Banco Central",
    description: "Cotação oficial do dólar",
    endpoint: "olinda.bcb.gov.br/olinda/servico/PTAX",
    lastCheck: new Date().toISOString(),
    frequency: "Diário",
    status: "active"
  }
];

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  error: "bg-red-500/10 text-red-500 border-red-500/30",
  inactive: "bg-muted/50 text-muted-foreground border-muted"
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  warning: "Atenção",
  error: "Erro",
  inactive: "Inativo"
};

export default function APIsUsedTable() {
  const [isExporting, setIsExporting] = useState(false);

  const getStatusBadge = (status: string) => (
    <Badge variant="outline" className={statusStyles[status] || statusStyles.inactive}>
      {statusLabels[status] || "Desconhecido"}
    </Badge>
  );

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("APIs de Dados Econômicos - KnowYOU", 14, 22);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 30);

      autoTable(doc, {
        startY: 40,
        head: [["Nome", "Provedor", "Última Verificação", "Período", "Status"]],
        body: apisData.map((api) => [
          api.name,
          api.provider,
          format(new Date(api.lastCheck), "dd/MM/yyyy HH:mm", { locale: ptBR }),
          api.frequency,
          statusLabels[api.status] || "Desconhecido"
        ]),
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] }
      });

      doc.save("apis-dados-economicos-knowyou.pdf");
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");

      const data = apisData.map((api) => ({
        Nome: api.name,
        Provedor: api.provider,
        Descrição: api.description,
        Endpoint: api.endpoint,
        "Última Verificação": format(new Date(api.lastCheck), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        Período: api.frequency,
        Status: statusLabels[api.status] || "Desconhecido"
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "APIs Econômicas");
      XLSX.writeFile(wb, "apis-dados-economicos-knowyou.xlsx");

      toast.success("Excel exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao exportar Excel");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">APIs de Dados Econômicos</CardTitle>
            <CardDescription>Fontes de dados econômicos e estatísticos brasileiros</CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={isExporting}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={isExporting}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Provedor</TableHead>
                <TableHead>Última Verificação</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apisData.map((api) => (
                <TableRow key={api.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{api.name}</p>
                      <p className="text-xs text-muted-foreground">{api.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>{api.provider}</TableCell>
                  <TableCell>
                    {format(new Date(api.lastCheck), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{api.frequency}</TableCell>
                  <TableCell>{getStatusBadge(api.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
