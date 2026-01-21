import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, FileText, Copy, Check, Database, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ApiTestResult {
  apiId: string;
  apiName: string;
  provider: string;
  baseUrl: string;
  testResult: 'SIM' | 'NÃO' | 'PENDING';
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
}

interface ApiDiagnosticModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApiDiagnosticModal({ open, onOpenChange }: ApiDiagnosticModalProps) {
  const [results, setResults] = useState<ApiTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setHasRun(false);
      setResults([]);
    }
  }, [open]);

  // Fetch APIs when modal opens - using api_test_staging table instead
  useEffect(() => {
    if (open && !hasRun && results.length === 0) {
      fetchApis();
    }
  }, [open, hasRun, results.length]);

  const fetchApis = async () => {
    // Use api_test_staging table which exists in the schema
    const { data, error } = await supabase
      .from('api_test_staging')
      .select('id, name, provider, base_url, status, http_status, error_message, test_timestamp')
      .order('provider', { ascending: true })
      .limit(50);

    if (error) {
      logger.error('[API_DIAGNOSTIC] Error fetching APIs:', error);
      return;
    }

    const apiList = data || [];
    
    // Initialize results from existing test data
    const initialResults: ApiTestResult[] = apiList.map(api => ({
      apiId: api.id,
      apiName: api.name || 'Unknown',
      provider: api.provider || 'Unknown',
      baseUrl: api.base_url || '',
      testResult: api.status === 'success' ? 'SIM' : api.status === 'error' ? 'NÃO' : 'PENDING',
      statusCode: api.http_status,
      latencyMs: 0,
      errorMessage: api.error_message,
    }));
    
    setResults(initialResults);
    setHasRun(true);
  };

  const handleRetest = () => {
    setHasRun(false);
    setResults([]);
    fetchApis();
  };

  const handleClose = () => {
    setHasRun(false);
    setResults([]);
    onOpenChange(false);
  };

  const successCount = results.filter(r => r.testResult === 'SIM').length;
  const errorCount = results.filter(r => r.testResult === 'NÃO').length;
  const pendingCount = results.filter(r => r.testResult === 'PENDING').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Diagnóstico de APIs
          </DialogTitle>
          <DialogDescription>
            Verificação de status das APIs configuradas
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="flex gap-4 py-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            {successCount} OK
          </Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-600">
            <XCircle className="h-3 w-3 mr-1" />
            {errorCount} Erros
          </Badge>
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            {pendingCount} Pendente
          </Badge>
        </div>

        {/* Results Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>API</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>HTTP</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {isRunning ? 'Carregando...' : 'Nenhuma API encontrada'}
                  </TableCell>
                </TableRow>
              ) : (
                results.map((result) => (
                  <TableRow key={result.apiId}>
                    <TableCell className="font-medium">{result.apiName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{result.provider}</Badge>
                    </TableCell>
                    <TableCell>
                      {result.testResult === 'SIM' ? (
                        <Badge className="bg-green-500">OK</Badge>
                      ) : result.testResult === 'NÃO' ? (
                        <Badge variant="destructive">Erro</Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.statusCode || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {result.errorMessage || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleRetest} disabled={isRunning}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button onClick={handleClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
