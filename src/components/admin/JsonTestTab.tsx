import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Plus, TestTube, CheckCircle, XCircle, RefreshCw, 
  AlertCircle, Clock, Tag, Copy, Rocket, Trash2,
  Eye, FileJson
} from 'lucide-react';
import { formatDateTime } from '@/lib/date-utils';
import { logger } from '@/lib/logger';
import { AdminTitleWithInfo } from './AdminTitleWithInfo';
import { notifyApiReadyForImplementation } from '@/lib/notification-dispatcher';

interface ApiVariable {
  name: string;
  suggestedType: string;
  sampleValue: unknown;
  isExcluded: boolean;
}

interface StagingApi {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  description: string | null;
  status: 'pending_test' | 'tested' | 'implemented' | 'error';
  is_functional: boolean | null;
  http_status: number | null;
  error_message: string | null;
  discovered_period_start: string | null;
  discovered_period_end: string | null;
  all_variables: ApiVariable[];
  selected_variables: ApiVariable[];
  implementation_params: Record<string, unknown> | null;
  test_timestamp: string | null;
  created_at: string;
}

const DEFAULT_PROVIDERS = ['BCB', 'IBGE', 'IPEADATA', 'WorldBank', 'IMF', 'YahooFinance', 'Internal', 'Scraper'];

export default function JsonTestTab() {
  const [stagingApis, setStagingApis] = useState<StagingApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewApiDialogOpen, setIsNewApiDialogOpen] = useState(false);
  const [testingApiId, setTestingApiId] = useState<string | null>(null);
  const [selectedApiForVariables, setSelectedApiForVariables] = useState<StagingApi | null>(null);
  const [variableSelections, setVariableSelections] = useState<Record<string, boolean>>({});
  const [simulationSelections, setSimulationSelections] = useState<Record<string, boolean>>({});
  const [lastTriggerTime, setLastTriggerTime] = useState<Date | null>(null);
  
  // Dynamic providers list
  const [providers, setProviders] = useState<string[]>(DEFAULT_PROVIDERS);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  
  const [newApiForm, setNewApiForm] = useState({
    name: '',
    provider: 'BCB' as string,
    base_url: '',
    description: ''
  });

  useEffect(() => {
    fetchStagingApis();
    
    // Realtime subscription
    const channel = supabase
      .channel('json-test-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'api_test_staging'
      }, () => {
        setLastTriggerTime(new Date());
        fetchStagingApis();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStagingApis = async () => {
    try {
      const { data, error } = await supabase
        .from('api_test_staging')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type cast the data safely using unknown first
      const typedData = (data || []).map(item => ({
        ...item,
        all_variables: (Array.isArray(item.all_variables) ? item.all_variables : []) as unknown as ApiVariable[],
        selected_variables: (Array.isArray(item.selected_variables) ? item.selected_variables : []) as unknown as ApiVariable[],
        implementation_params: item.implementation_params as Record<string, unknown> | null
      })) as StagingApi[];
      
      setStagingApis(typedData);
    } catch (error) {
      logger.error('Error fetching staging APIs:', error);
      toast.error('Erro ao carregar APIs de teste');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApi = async () => {
    if (!newApiForm.name || !newApiForm.base_url) {
      toast.error('Nome e URL são obrigatórios');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('api_test_staging')
        .insert({
          name: newApiForm.name,
          provider: newApiForm.provider,
          base_url: newApiForm.base_url,
          description: newApiForm.description || null,
          status: 'pending_test'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('API criada! Iniciando teste...');
      setIsNewApiDialogOpen(false);
      setNewApiForm({ name: '', provider: 'BCB', base_url: '', description: '' });
      
      // Automatically test the new API
      if (data) {
        await handleTestApi(data.id, newApiForm.base_url);
      }
      
      fetchStagingApis();
    } catch (error) {
      logger.error('Error creating staging API:', error);
      toast.error('Erro ao criar API');
    }
  };

  const handleTestApi = async (apiId: string, baseUrl: string) => {
    setTestingApiId(apiId);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-api-staging', {
        body: { stagingId: apiId, baseUrl }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Teste OK! ${data.selectableVariables?.length || 0} variáveis encontradas`);
      } else {
        toast.error(`Falha: ${data.errorMessage || 'Erro desconhecido'}`);
      }
      
      fetchStagingApis();
    } catch (error) {
      logger.error('Error testing API:', error);
      toast.error('Erro ao testar API');
    } finally {
      setTestingApiId(null);
    }
  };

  const handleOpenVariablesModal = (api: StagingApi) => {
    setSelectedApiForVariables(api);
    
    // Initialize selections from existing selected_variables
    const selections: Record<string, boolean> = {};
    const simulations: Record<string, boolean> = {};
    
    api.all_variables.forEach(v => {
      selections[v.name] = api.selected_variables.some(sv => sv.name === v.name);
      simulations[v.name] = false;
    });
    
    setVariableSelections(selections);
    setSimulationSelections(simulations);
  };

  const handleSaveVariables = async () => {
    if (!selectedApiForVariables) return;

    const selectedVars = selectedApiForVariables.all_variables.filter(
      v => variableSelections[v.name]
    );

    try {
      // Cast to JSON-compatible type for Supabase
      const varsForDb = JSON.parse(JSON.stringify(selectedVars));
      
      const { error } = await supabase
        .from('api_test_staging')
        .update({ selected_variables: varsForDb })
        .eq('id', selectedApiForVariables.id);

      if (error) throw error;
      
      toast.success('Variáveis salvas');
      setSelectedApiForVariables(null);
      fetchStagingApis();
    } catch (error) {
      logger.error('Error saving variables:', error);
      toast.error('Erro ao salvar variáveis');
    }
  };

  const handleImplementApi = async (api: StagingApi) => {
    if (api.selected_variables.length === 0) {
      toast.error('Selecione pelo menos uma variável antes de implementar');
      return;
    }

    try {
      // Prepare implementation params
      const implementationParams = {
        name: api.name,
        provider: api.provider,
        base_url: api.base_url,
        description: api.description,
        variables: api.selected_variables.map(v => v.name),
        period_start: api.discovered_period_start,
        period_end: api.discovered_period_end,
        tested_at: api.test_timestamp
      };

      // Update staging record
      const { error: updateError } = await supabase
        .from('api_test_staging')
        .update({
          status: 'implemented',
          implementation_params: implementationParams
        })
        .eq('id', api.id);

      if (updateError) throw updateError;

      // Create notification for admin (in-app bell)
      const { error: notifError } = await supabase
        .from('admin_notifications')
        .insert({
          type: 'api_ready_for_implementation',
          title: '🚀 Nova API Pronta para Implementação',
          message: JSON.stringify(implementationParams),
          is_read: false
        });

      if (notifError) {
        logger.error('Error creating in-app notification:', notifError);
      }

      // Dispatch multi-channel notification (Email + WhatsApp)
      const dispatchResult = await notifyApiReadyForImplementation(
        api.name,
        api.provider,
        api.selected_variables.map(v => v.name),
        api.discovered_period_start || '',
        api.discovered_period_end || ''
      );

      if (dispatchResult.emailSent) {
        logger.info('[JsonTestTab] Email notification sent for API implementation');
      }
      if (dispatchResult.whatsappSent) {
        logger.info('[JsonTestTab] WhatsApp notification sent for API implementation');
      }
      if (dispatchResult.errors.length > 0) {
        logger.warn('[JsonTestTab] Notification dispatch errors:', dispatchResult.errors);
      }

      toast.success('API marcada para implementação! Verifique as notificações.');
      fetchStagingApis();
    } catch (error) {
      logger.error('Error implementing API:', error);
      toast.error('Erro ao implementar API');
    }
  };

  const handleDeleteApi = async (api: StagingApi) => {
    if (!confirm(`Excluir "${api.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('api_test_staging')
        .delete()
        .eq('id', api.id);

      if (error) throw error;
      toast.success('API excluída');
      fetchStagingApis();
    } catch (error) {
      logger.error('Error deleting API:', error);
      toast.error('Erro ao excluir API');
    }
  };

  const getStatusBadge = (api: StagingApi) => {
    switch (api.status) {
      case 'pending_test':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500"><Clock className="w-3 h-3 mr-1" /> PENDENTE</Badge>;
      case 'tested':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500"><CheckCircle className="w-3 h-3 mr-1" /> TESTADA</Badge>;
      case 'implemented':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500"><Rocket className="w-3 h-3 mr-1" /> IMPLEMENTADA</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500"><XCircle className="w-3 h-3 mr-1" /> ERRO</Badge>;
      default:
        return <Badge variant="outline">DESCONHECIDO</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <AdminTitleWithInfo
          title="Teste de JSON"
          level="h2"
          tooltipText="Módulo de Teste de APIs"
          infoContent="Teste e valide novas APIs antes de implementá-las na Gestão de APIs. Analise a estrutura JSON, selecione variáveis relevantes e promova APIs testadas para produção."
        />
        
        <div className="flex items-center gap-2">
          {lastTriggerTime && (
            <Badge variant="outline" className="text-xs">
              Sync: {lastTriggerTime.toLocaleTimeString()}
            </Badge>
          )}
          <Button onClick={() => setIsNewApiDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            NOVA API
          </Button>
        </div>
      </div>

      {/* Staging APIs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Diagnóstico de Variáveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stagingApis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileJson className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma API em teste</p>
              <p className="text-sm">Clique em "+ NOVA API" para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data (Início/Fim)</TableHead>
                  <TableHead>Funcional</TableHead>
                  <TableHead>TAG (Variáveis)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stagingApis.map((api) => (
                  <TableRow key={api.id}>
                    <TableCell className="font-medium">{api.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{api.provider}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(api)}</TableCell>
                    <TableCell>
                      {api.discovered_period_start && api.discovered_period_end ? (
                        <span className="text-sm">
                          {api.discovered_period_start} → {api.discovered_period_end}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {api.is_functional === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : api.is_functional ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenVariablesModal(api)}
                        disabled={!api.all_variables || api.all_variables.length === 0}
                        className="gap-1"
                      >
                        <Tag className="w-4 h-4" />
                        {api.all_variables?.length || 0}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTestApi(api.id, api.base_url)}
                          disabled={testingApiId === api.id}
                          title="Testar"
                        >
                          {testingApiId === api.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <TestTube className="w-4 h-4" />
                          )}
                        </Button>
                        
                        {api.status === 'tested' && api.selected_variables.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleImplementApi(api)}
                            title="Implementar"
                            className="text-green-500 hover:text-green-600"
                          >
                            <Rocket className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteApi(api)}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New API Dialog */}
      <Dialog open={isNewApiDialogOpen} onOpenChange={setIsNewApiDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nova API para Teste
            </DialogTitle>
            <DialogDescription>
              Insira os dados da API. O sistema fará a primeira chamada para analisar a estrutura do JSON.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-name">Nome da API *</Label>
              <Input
                id="api-name"
                value={newApiForm.name}
                onChange={(e) => setNewApiForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: PTAX (Cotações de Câmbio)"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-provider">Provedor *</Label>
              {isAddingProvider ? (
                <div className="flex gap-2">
                  <Input
                    value={newProviderName}
                    onChange={(e) => setNewProviderName(e.target.value.toUpperCase())}
                    placeholder="Nome do novo provedor"
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newProviderName.trim()) {
                        const trimmed = newProviderName.trim();
                        if (!providers.includes(trimmed)) {
                          setProviders(prev => [...prev, trimmed]);
                        }
                        setNewApiForm(prev => ({ ...prev, provider: trimmed }));
                        setNewProviderName('');
                        setIsAddingProvider(false);
                        toast.success(`Provedor "${trimmed}" adicionado`);
                      }
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setNewProviderName('');
                      setIsAddingProvider(false);
                    }}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={newApiForm.provider}
                    onValueChange={(value) => setNewApiForm(prev => ({ ...prev, provider: value }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingProvider(true)}
                    title="Adicionar novo provedor"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-url">URL Base *</Label>
              <Textarea
                id="api-url"
                value={newApiForm.base_url}
                onChange={(e) => setNewApiForm(prev => ({ ...prev, base_url: e.target.value }))}
                placeholder="https://olinda.bcb.gov.br/olinda/servico/..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-description">Descrição (opcional)</Label>
              <Input
                id="api-description"
                value={newApiForm.description}
                onChange={(e) => setNewApiForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descrição da API"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewApiDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateApi} className="gap-2">
              <TestTube className="w-4 h-4" />
              Criar e Testar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variables Selection Modal */}
      <Dialog 
        open={!!selectedApiForVariables} 
        onOpenChange={(open) => !open && setSelectedApiForVariables(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Seleção de Variáveis - {selectedApiForVariables?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione as variáveis que deseja usar na análise. Campos técnicos estão pré-filtrados.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Variável</TableHead>
                  <TableHead>Tipo Sugerido</TableHead>
                  <TableHead>Valor Exemplo</TableHead>
                  <TableHead className="text-center">Seleção</TableHead>
                  <TableHead className="text-center">Simulação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedApiForVariables?.all_variables
                  .filter(v => !v.isExcluded)
                  .map((variable) => (
                    <TableRow key={variable.name}>
                      <TableCell className="font-mono text-sm">{variable.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{variable.suggestedType}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {typeof variable.sampleValue === 'object' 
                          ? JSON.stringify(variable.sampleValue).substring(0, 50)
                          : String(variable.sampleValue || '—').substring(0, 50)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={variableSelections[variable.name] || false}
                          onCheckedChange={(checked) => 
                            setVariableSelections(prev => ({ ...prev, [variable.name]: checked }))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={simulationSelections[variable.name] || false}
                          onCheckedChange={(checked) => 
                            setSimulationSelections(prev => ({ ...prev, [variable.name]: checked }))
                          }
                          disabled={!variableSelections[variable.name]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
          
          <DialogFooter className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {Object.values(variableSelections).filter(Boolean).length} variáveis selecionadas
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedApiForVariables(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveVariables}>
                Salvar Seleção
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
