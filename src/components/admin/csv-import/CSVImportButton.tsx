import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  Loader2 
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

// TIPOS
export interface CSVColumn {
  key: string;
  label: string;
  required: boolean;
  transform?: (value: string) => unknown;
}

export interface CSVImportConfig {
  tableName: string;
  displayName: string;
  columns: CSVColumn[];
  templateData: Record<string, string>[];
  onInsert: (data: Record<string, unknown>[]) => Promise<{ success: number; errors: string[] }>;
  validateRow?: (row: Record<string, unknown>) => string | null;
}

interface CSVImportButtonProps {
  config: CSVImportConfig;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onSuccess?: () => void;
}

interface ParsedRow {
  data: Record<string, unknown>;
  errors: string[];
  isValid: boolean;
}

export function CSVImportButton({
  config,
  buttonVariant = "outline",
  buttonSize = "default",
  className,
  onSuccess,
}: CSVImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

  const resetState = () => {
    setParsedRows([]);
    setImportProgress(0);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Por favor, selecione um arquivo CSV");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const rows: ParsedRow[] = [];

        for (const rawRow of results.data as Record<string, string>[]) {
          const errors: string[] = [];
          const transformedData: Record<string, unknown> = {};

          for (const col of config.columns) {
            const rawValue = rawRow[col.key]?.trim() || "";

            if (col.required && !rawValue) {
              errors.push(`Campo "${col.label}" é obrigatório`);
            }

            if (col.transform) {
              try {
                transformedData[col.key] = col.transform(rawValue);
              } catch {
                errors.push(`Erro ao processar "${col.label}"`);
                transformedData[col.key] = rawValue;
              }
            } else {
              transformedData[col.key] = rawValue || null;
            }
          }

          if (config.validateRow) {
            const customError = config.validateRow(transformedData);
            if (customError) errors.push(customError);
          }

          rows.push({ data: transformedData, errors, isValid: errors.length === 0 });
        }

        setParsedRows(rows);
        setIsOpen(true);
      },
      error: (error) => toast.error(`Erro ao ler arquivo: ${error.message}`),
    });
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse(config.templateData, {
      columns: config.columns.map((c) => c.key),
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `template_${config.tableName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("Nenhum registro válido para importar");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      const dataToInsert = validRows.map((r) => r.data);
      
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const result = await config.onInsert(dataToInsert);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);

      if (result.success > 0) {
        toast.success(`${result.success} registros importados com sucesso!`);
        onSuccess?.();
      }

      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} erros durante a importação`);
      }
    } catch (error) {
      toast.error(`Erro na importação: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        variant={buttonVariant}
        size={buttonSize}
        className={className}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        Importar CSV
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetState();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar {config.displayName}
            </DialogTitle>
            <DialogDescription>
              Revise os dados antes de importar. Linhas com erro serão ignoradas.
            </DialogDescription>
          </DialogHeader>

          {isImporting && (
            <div className="py-4">
              <Progress value={importProgress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Importando... {importProgress}%
              </p>
            </div>
          )}

          {importResult && (
            <Alert className={importResult.errors.length > 0 ? "border-yellow-500" : "border-green-500"}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="h-4 w-4" />
                    {importResult.success} registros importados
                  </div>
                  {importResult.errors.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-yellow-500 mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        {importResult.errors.length} erros:
                      </div>
                      <div className="text-xs text-muted-foreground max-h-20 overflow-auto">
                        {importResult.errors.slice(0, 5).map((e, i) => (
                          <p key={i}>{e}</p>
                        ))}
                        {importResult.errors.length > 5 && (
                          <p>...e mais {importResult.errors.length - 5}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!importResult && parsedRows.length > 0 && (
            <div className="flex items-center gap-4 py-2">
              <span className="text-sm text-muted-foreground">
                {parsedRows.length} linhas lidas
              </span>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {validCount} válidas
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                  <XCircle className="h-3 w-3 mr-1" />
                  {invalidCount} com erro
                </Badge>
              )}
            </div>
          )}

          {!importResult && parsedRows.length > 0 && (
            <ScrollArea className="flex-1 border rounded-md max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Status</TableHead>
                    {config.columns.slice(0, 5).map((col) => (
                      <TableHead key={col.key}>
                        {col.label}
                        {col.required && <span className="text-red-500">*</span>}
                      </TableHead>
                    ))}
                    {config.columns.length > 5 && <TableHead>...</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 100).map((row, idx) => (
                    <TableRow key={idx} className={row.isValid ? "" : "bg-red-500/10"}>
                      <TableCell>
                        {row.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <div title={row.errors.join("\n")}>
                            <XCircle className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                      </TableCell>
                      {config.columns.slice(0, 5).map((col) => (
                        <TableCell key={col.key} className="max-w-[150px] truncate">
                          {String(row.data[col.key] ?? "-")}
                        </TableCell>
                      ))}
                      {config.columns.length > 5 && (
                        <TableCell className="text-muted-foreground">...</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {parsedRows.length > 100 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Mostrando 100 de {parsedRows.length} linhas
                </p>
              )}
            </ScrollArea>
          )}

          {parsedRows.length === 0 && !importResult && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mb-4 opacity-30" />
              <p>Nenhum arquivo carregado</p>
            </div>
          )}

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>

            <Button variant="ghost" onClick={() => { setIsOpen(false); resetState(); }}>
              {importResult ? "Fechar" : "Cancelar"}
            </Button>

            {!importResult && (
              <Button
                onClick={handleImport}
                disabled={isImporting || validCount === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar {validCount} registros
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CSVImportButton;
