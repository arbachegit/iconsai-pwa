import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, ExternalLink, RefreshCw, Database, AlertCircle, CheckCircle2, Info, Copy, Check, Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SidraDataPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiName: string;
  apiUrl: string;
  lastRawResponse?: unknown;
}

interface RawDataRow {
  [key: string]: string | undefined;
}

// INVALID_VALUES - values that SIDRA uses to indicate "data not available"
const INVALID_VALUES = ['..', '...', '-', 'X', '', null, undefined];

function isInvalidValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const strValue = String(value).trim();
  return INVALID_VALUES.includes(strValue) || strValue === '';
}

export function SidraDataPreviewModal({
  open,
  onOpenChange,
  apiName,
  apiUrl,
  lastRawResponse
}: SidraDataPreviewModalProps) {
  const [liveData, setLiveData] = useState<RawDataRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCSV, setCopiedCSV] = useState(false);
  const [stats, setStats] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    invalidPercentage: number;
  } | null>(null);

  // Copy stats to clipboard
  const copyStatsToClipboard = async () => {
    if (!stats) return;
    
    const textToCopy = `📊 Dados Extraídos - ${apiName}

📌 Total de registros: ${stats.totalRows}
✅ Registros válidos: ${stats.validRows}
❌ Registros inválidos: ${stats.invalidRows}
📈 Taxa de validade: ${100 - stats.invalidPercentage}%

🔗 URL: ${apiUrl}`;
    
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Informações copiadas!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Download JSON
  const downloadJSON = () => {
    if (!lastRawResponse) {
      toast.error('Nenhum dado disponível para exportar');
      return;
    }
    
    const jsonString = JSON.stringify(lastRawResponse, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${apiName.replace(/\s+/g, '_')}_raw_response.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('JSON exportado com sucesso!');
  };

  // Copy as CSV
  const copyAsCSV = async () => {
    const displayData = liveData || parseRawData(lastRawResponse);
    if (!displayData || displayData.length === 0) {
      toast.error('Nenhum dado disponível para copiar');
      return;
    }
    
    const allColumns = Object.keys(displayData[0] || {});
    const header = allColumns.join(';');
    
    const rows = displayData.map(row => 
      allColumns.map(col => {
        const value = row[col] || '';
        const strValue = String(value);
        if (strValue.includes(';') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(';')
    );
    
    const csvContent = [header, ...rows].join('\n');
    
    await navigator.clipboard.writeText(csvContent);
    setCopiedCSV(true);
    toast.success(`CSV copiado! ${displayData.length} registros prontos para colar`);
    setTimeout(() => setCopiedCSV(false), 2000);
  };

  // Parse the raw response to extract data
  const parseRawData = (data: unknown): RawDataRow[] => {
    if (!data) return [];
    
    // Handle array format (SIDRA Flat) - now receives up to 500 records from backend
    if (Array.isArray(data)) {
      return data as RawDataRow[];
    }
    
    // Handle object with 'value' array (IPEADATA format)
    if (typeof data === 'object' && 'value' in (data as object)) {
      const values = (data as { value: unknown[] }).value;
      if (Array.isArray(values)) {
        return values as RawDataRow[];
      }
    }
    
    return [];
  };

  // Calculate statistics for the data
  const calculateStats = (data: RawDataRow[]) => {
    if (!data || data.length < 2) {
      setStats(null);
      return;
    }

    // Skip header row
    const dataRows = data.slice(1);
    let validRows = 0;
    let invalidRows = 0;

    for (const row of dataRows) {
      const value = row.V || row.VALVALOR || row.valor;
      if (isInvalidValue(value)) {
        invalidRows++;
      } else {
        validRows++;
      }
    }

    const totalRows = dataRows.length;
    const invalidPercentage = totalRows > 0 ? Math.round((invalidRows / totalRows) * 100) : 0;

    setStats({
      totalRows,
      validRows,
      invalidRows,
      invalidPercentage
    });
  };

  // Fetch live data from the API
  const fetchLiveData = async () => {
    if (!apiUrl) {
      setError('URL da API não configurada');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const parsedData = parseRawData(data);
      setLiveData(parsedData);
      calculateStats(parsedData);
      toast.success('Dados carregados com sucesso');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error(`Erro ao buscar dados: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // Use stored raw response or empty
  useEffect(() => {
    if (open && lastRawResponse) {
      const parsedData = parseRawData(lastRawResponse);
      setLiveData(parsedData);
      calculateStats(parsedData);
    }
  }, [open, lastRawResponse]);

  // Get relevant columns from data
  const getColumns = (data: RawDataRow[]): string[] => {
    if (!data || data.length === 0) return [];
    const firstRow = data[0];
    // Prioritize important SIDRA columns
    const priorityColumns = ['D1C', 'D1N', 'D2C', 'D2N', 'D3C', 'D3N', 'V', 'MC', 'MN', 'NC', 'NN'];
    const allColumns = Object.keys(firstRow);
    
    return priorityColumns.filter(col => allColumns.includes(col))
      .concat(allColumns.filter(col => !priorityColumns.includes(col)));
  };

  const displayData = liveData || [];
  const columns = getColumns(displayData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Preview de Dados Brutos
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span className="font-medium">{apiName}</span>
            <a 
              href={apiUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Ver API
            </a>
          </DialogDescription>
        </DialogHeader>

        {/* Sample Indicator Badge */}
        {displayData.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-400">
              <Info className="h-3 w-3 mr-1" />
              Exibindo amostra de {displayData.length} registros (máx. 500)
            </Badge>
          </div>
        )}

        {/* Stats Banner */}
        {stats && (
          <div className={cn(
            "p-3 rounded-lg border flex items-center justify-between",
            stats.invalidPercentage === 100 
              ? "bg-destructive/10 border-destructive/30" 
              : stats.invalidPercentage > 50 
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-emerald-500/10 border-emerald-500/30"
          )}>
            <div className="flex items-center gap-3">
              {stats.invalidPercentage === 100 ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : stats.invalidPercentage > 50 ? (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              )}
              <div className="space-y-0.5">
                <div className="font-medium">
                  {stats.invalidPercentage === 100 
                    ? '⚠️ Fonte Indisponível - 100% dos valores são inválidos'
                    : stats.invalidPercentage > 50
                      ? `Alerta: ${stats.invalidPercentage}% dos valores são inválidos`
                      : `✓ Dados válidos: ${100 - stats.invalidPercentage}%`
                  }
                </div>
                <div className="text-xs text-muted-foreground">
                  {stats.validRows} registros válidos • {stats.invalidRows} inválidos de {stats.totalRows} total
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyStatsToClipboard}
                className="h-8 w-8 p-0"
                title="Copiar informações"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                )}
              </Button>
              <Badge variant={stats.validRows > 0 ? "secondary" : "destructive"}>
                {stats.validRows} válidos
              </Badge>
              <Badge variant={stats.invalidRows > 0 ? "outline" : "secondary"} className="border-amber-500/40 text-amber-500">
                {stats.invalidRows} inválidos
              </Badge>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs border-b pb-2">
          <span className="flex items-center gap-1">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            Legenda:
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-destructive/20 border border-destructive"></span>
            Valor inválido (.., ..., -, X)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500"></span>
            Valor numérico válido
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchLiveData}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Buscar Dados Ao Vivo
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={downloadJSON}
              disabled={!lastRawResponse}
              className="gap-2"
              title="Baixar resposta completa da API como JSON"
            >
              <Download className="h-4 w-4" />
              JSON
            </Button>
            
            <Button
              variant="outline"
              onClick={copyAsCSV}
              disabled={!lastRawResponse && !liveData}
              className="gap-2"
              title="Copiar tabela como CSV para planilhas"
            >
              {copiedCSV ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              CSV
            </Button>
          </div>
          {stats?.invalidPercentage === 100 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Dados Indisponíveis na Fonte
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>O IBGE não disponibiliza dados numéricos para esta combinação de variável/categoria/período.</p>
                  <p className="mt-1 text-xs">Sugestão: Altere a variável de <code>v=11709</code> para <code>v=7170</code> para PMC regional.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}

        {/* Data Table */}
        <ScrollArea className="h-[400px] border rounded-lg">
          {displayData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  {columns.slice(0, 8).map(col => (
                    <TableHead key={col} className="font-mono text-xs">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((row, idx) => {
                  const isHeader = idx === 0;
                  const value = row.V || row.VALVALOR || row.valor;
                  const isValueInvalid = !isHeader && isInvalidValue(value);
                  
                  return (
                    <TableRow 
                      key={idx} 
                      className={cn(
                        isHeader && "bg-muted/50 font-medium",
                        isValueInvalid && "bg-destructive/5"
                      )}
                    >
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {isHeader ? 'H' : idx}
                      </TableCell>
                      {columns.slice(0, 8).map(col => {
                        const cellValue = row[col] || '';
                        const isValueColumn = col === 'V' || col === 'VALVALOR' || col === 'valor';
                        const isCellInvalid = isValueColumn && !isHeader && isInvalidValue(cellValue);
                        
                        return (
                          <TableCell 
                            key={col} 
                            className={cn(
                              "font-mono text-xs",
                              isCellInvalid && "bg-destructive/20 text-destructive font-bold",
                              isValueColumn && !isCellInvalid && !isHeader && "bg-emerald-500/10 text-emerald-600"
                            )}
                          >
                            {cellValue === '..' || cellValue === '...' || cellValue === '-' || cellValue === 'X' ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="text-destructive">{cellValue || '—'}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Valor indisponível na fonte IBGE
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              String(cellValue).substring(0, 30) || '—'
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Database className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhum dado disponível</p>
              <p className="text-xs">Clique em "Buscar Dados Ao Vivo" para carregar</p>
            </div>
          )}
        </ScrollArea>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg space-y-1">
          <p className="font-medium">Sobre os valores inválidos:</p>
          <p><code className="bg-muted px-1 rounded">..</code> ou <code className="bg-muted px-1 rounded">...</code> = Dado não disponível (IBGE não coletou ou não divulga)</p>
          <p><code className="bg-muted px-1 rounded">-</code> = Valor zero ou não se aplica</p>
          <p><code className="bg-muted px-1 rounded">X</code> = Dado sigiloso (suprimido por segredo estatístico)</p>
          <p className="mt-2 font-medium">Solução para PMC Regional com 100% inválidos:</p>
          <p>Altere a variável na URL de <code className="bg-primary/20 text-primary px-1 rounded">v=11709</code> para <code className="bg-emerald-500/20 text-emerald-600 px-1 rounded">v=7170</code></p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
