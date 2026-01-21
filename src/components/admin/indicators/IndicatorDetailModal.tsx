import { useState, useEffect } from 'react';
import { logger } from "@/lib/logger";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  RefreshCw, Plus, Calendar, TrendingUp, DollarSign, Percent, Users, 
  BarChart3, ShoppingCart, Heart, Building2, Car, Fuel, Pill, Tv, 
  Shirt, Activity, LucideIcon, Trash2, AlertTriangle, Shield, Clock
} from 'lucide-react';
import MonthlyMatrixView from './MonthlyMatrixView';
import AnnualBlocksView from './AnnualBlocksView';

interface Indicator {
  id: string;
  name: string;
  code: string;
  frequency: string;
  unit: string | null;
  category?: string;
}

interface IndicatorValue {
  id: string;
  reference_date: string;
  value: number;
}

interface ApiGovernance {
  discovered_period_start: string | null;
  discovered_period_end: string | null;
  period_discovery_date: string | null;
  fetch_start_date: string | null;
  fetch_end_date: string | null;
  auto_fetch_enabled: boolean;
  auto_fetch_interval: string | null;
}

interface IndicatorDetailModalProps {
  indicator: Indicator | null;
  source: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChange: () => void;
}

// Icon mapping
const getIndicatorIcon = (code: string, name: string): LucideIcon => {
  const lowerCode = code.toLowerCase();
  const lowerName = name.toLowerCase();
  
  if (lowerCode.includes('selic') || lowerCode.includes('cdi')) return TrendingUp;
  if (lowerCode.includes('dolar') || lowerCode.includes('ptax')) return DollarSign;
  if (lowerCode.includes('ipca')) return Percent;
  if (lowerCode.includes('pib')) return BarChart3;
  if (lowerCode.includes('desemp') || lowerName.includes('desemprego')) return Users;
  if (lowerName.includes('confiança')) return Heart;
  if (lowerName.includes('vestuário')) return Shirt;
  if (lowerName.includes('móveis')) return Tv;
  if (lowerName.includes('farmácia')) return Pill;
  if (lowerName.includes('combustível')) return Fuel;
  if (lowerName.includes('veículo')) return Car;
  if (lowerName.includes('construção')) return Building2;
  if (lowerName.includes('varejo')) return ShoppingCart;
  
  return Activity;
};

// Frequency helpers
const getFrequencyLabel = (frequency: string): string => {
  const freq = frequency?.toLowerCase() || 'monthly';
  if (freq === 'daily' || freq === 'diária') return 'Diária';
  if (freq === 'monthly' || freq === 'mensal') return 'Mensal';
  if (freq === 'quarterly' || freq === 'trimestral') return 'Trimestral';
  if (freq === 'yearly' || freq === 'anual') return 'Anual';
  return 'Mensal';
};

const isAnnualFrequency = (frequency: string): boolean => {
  const freq = frequency?.toLowerCase() || '';
  return freq === 'yearly' || freq === 'anual';
};

export default function IndicatorDetailModal({ 
  indicator, 
  source, 
  open, 
  onOpenChange,
  onDataChange 
}: IndicatorDetailModalProps) {
  const [values, setValues] = useState<IndicatorValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);
  
  // Force refresh confirmation modal
  const [forceRefreshModalOpen, setForceRefreshModalOpen] = useState(false);
  const [forceRefreshConfirmed, setForceRefreshConfirmed] = useState(false);
  
  // Add new value dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newValue, setNewValue] = useState('');

  // Governance state
  const [governance, setGovernance] = useState<ApiGovernance | null>(null);
  const [savingGovernance, setSavingGovernance] = useState(false);

  useEffect(() => {
    if (indicator && open) {
      fetchValues();
      fetchGovernance();
    }
  }, [indicator, open]);

  const fetchGovernance = async () => {
    if (!indicator) return;
    try {
      // Get the API config for this indicator
      const { data: indicatorData } = await supabase
        .from('economic_indicators')
        .select('api_id')
        .eq('id', indicator.id)
        .single();

      if (!indicatorData?.api_id) return;

      const { data: apiData } = await supabase
        .from('system_api_registry')
        .select('discovered_period_start, discovered_period_end, period_discovery_date, fetch_start_date, fetch_end_date, auto_fetch_enabled, auto_fetch_interval')
        .eq('id', indicatorData.api_id)
        .single();

      if (apiData) {
        setGovernance(apiData as ApiGovernance);
      }
    } catch (error) {
      logger.error('Error fetching governance:', error);
    }
  };

  const handleGovernanceChange = async (field: keyof ApiGovernance, value: unknown) => {
    if (!indicator || !governance) return;
    setSavingGovernance(true);
    try {
      const { data: indicatorData } = await supabase
        .from('economic_indicators')
        .select('api_id')
        .eq('id', indicator.id)
        .single();

      if (!indicatorData?.api_id) return;

      const { error } = await supabase
        .from('system_api_registry')
        .update({ [field]: value })
        .eq('id', indicatorData.api_id);

      if (error) throw error;
      
      setGovernance(prev => prev ? { ...prev, [field]: value } : null);
      toast.success('Configuração atualizada');
    } catch (error) {
      logger.error('Error updating governance:', error);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setSavingGovernance(false);
    }
  };

  const fetchValues = async () => {
    if (!indicator) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('indicator_values')
        .select('id, reference_date, value')
        .eq('indicator_id', indicator.id)
        .order('reference_date', { ascending: false });

      if (error) throw error;
      setValues((data || []).map(d => ({ ...d, value: Number(d.value) })));
    } catch (error) {
      logger.error('Error fetching values:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchData = async (forceRefresh: boolean = false) => {
    if (!indicator) return;
    
    if (forceRefresh) {
      setForceRefreshing(true);
    } else {
      setFetching(true);
    }
    
    try {
      const response = await supabase.functions.invoke('fetch-economic-data', {
        body: { indicatorId: indicator.id, forceRefresh }
      });

      if (response.error) throw response.error;
      
      if (forceRefresh) {
        toast.success(`☢️ Recarga Zero-Base: ${response.data?.recordsInserted || 0} registros inseridos`);
      } else {
        toast.success(`Dados atualizados: ${response.data?.recordsInserted || 0} registros`);
      }
      
      fetchValues();
      onDataChange();
    } catch (error) {
      logger.error('Error fetching data:', error);
      toast.error('Erro ao buscar dados da API');
    } finally {
      setFetching(false);
      setForceRefreshing(false);
      setForceRefreshModalOpen(false);
      setForceRefreshConfirmed(false);
    }
  };

  const handleForceRefreshConfirm = () => {
    if (!forceRefreshConfirmed) {
      toast.error('Você deve confirmar que entende a operação');
      return;
    }
    handleFetchData(true);
  };

  const handleAddValue = async () => {
    if (!indicator || !newDate || !newValue) {
      toast.error('Preencha todos os campos');
      return;
    }

    const numValue = parseFloat(newValue);
    if (isNaN(numValue)) {
      toast.error('Valor inválido');
      return;
    }

    try {
      const { error } = await supabase
        .from('indicator_values')
        .insert({
          indicator_id: indicator.id,
          reference_date: newDate,
          value: numValue
        });

      if (error) throw error;
      
      toast.success('Valor inserido');
      setAddDialogOpen(false);
      setNewDate('');
      setNewValue('');
      fetchValues();
      onDataChange();
    } catch (error) {
      logger.error('Error adding value:', error);
      toast.error('Erro ao inserir');
    }
  };

  const handleValueChange = () => {
    fetchValues();
    onDataChange();
  };

  if (!indicator) return null;

  const Icon = getIndicatorIcon(indicator.code, indicator.name);
  const isAnnual = isAnnualFrequency(indicator.frequency);
  const totalRecords = values.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{indicator.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{source}</Badge>
                    <Badge variant="outline" className="text-xs">{getFrequencyLabel(indicator.frequency)}</Badge>
                    {indicator.unit && <Badge variant="secondary" className="text-xs">{indicator.unit}</Badge>}
                    <Badge variant="secondary" className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                      📊 {totalRecords} registros carregados
                    </Badge>
                    {values.length > 0 && (
                      <Badge variant="outline" className="text-xs font-mono text-cyan-300 border-cyan-500/40">
                        📅 {values[values.length - 1]?.reference_date} → {values[0]?.reference_date}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => handleFetchData(false)} 
                  disabled={fetching || forceRefreshing}
                  className="gap-2"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                  Atualizar via API
                </Button>
                <Button 
                  variant="destructive"
                  size="sm" 
                  className="gap-2"
                  disabled={fetching || forceRefreshing}
                  onClick={() => {
                    setForceRefreshConfirmed(false);
                    setForceRefreshModalOpen(true);
                  }}
                >
                  <Trash2 className={`h-4 w-4 ${forceRefreshing ? 'animate-spin' : ''}`} />
                  {forceRefreshing ? 'Recarregando...' : 'Recarregar do Zero'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Inserir Valor
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
            {/* Governance Section */}
            {governance && (
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="py-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-blue-400" />
                    Governança de Período
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 py-2">
                  {/* Discovered Period (READ-ONLY) */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      Período de Extração (Descoberto da API)
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {governance.discovered_period_start && governance.discovered_period_end ? (
                        <>
                          <Badge variant="outline" className="font-mono text-cyan-300 border-cyan-500/40">
                            📅 {governance.discovered_period_start} → {governance.discovered_period_end}
                          </Badge>
                          {governance.period_discovery_date && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Descoberto em {format(new Date(governance.period_discovery_date), 'dd/MM/yyyy HH:mm')}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Não descoberto - Execute "Atualizar via API"
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Discrepancy Alert */}
                  {governance.discovered_period_start && governance.fetch_start_date && (
                    (() => {
                      const discoveredStart = new Date(governance.discovered_period_start);
                      const configuredStart = new Date(governance.fetch_start_date);
                      const diffYears = (discoveredStart.getTime() - configuredStart.getTime()) / (1000 * 60 * 60 * 24 * 365);
                      
                      if (diffYears > 1) {
                        return (
                          <Alert className="border-yellow-500/50 bg-yellow-500/10">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <AlertDescription className="text-sm">
                              A API possui histórico limitado. Configurado desde <span className="font-mono">{governance.fetch_start_date}</span>, 
                              mas dados reais começam em <span className="font-mono">{governance.discovered_period_start}</span>.
                            </AlertDescription>
                          </Alert>
                        );
                      }
                      return null;
                    })()
                  )}

                  {/* Auto Update Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div>
                      <Label className="text-sm">Atualização Automática</Label>
                      <p className="text-xs text-muted-foreground">
                        Buscar novos dados automaticamente
                      </p>
                    </div>
                    <Switch 
                      checked={governance.auto_fetch_enabled ?? false} 
                      onCheckedChange={(checked) => handleGovernanceChange('auto_fetch_enabled', checked)}
                      disabled={savingGovernance}
                    />
                  </div>

                  {/* Interval Selector (if auto enabled) */}
                  {governance.auto_fetch_enabled && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Intervalo de Atualização</Label>
                      <Select 
                        value={governance.auto_fetch_interval || 'daily'} 
                        onValueChange={(value) => handleGovernanceChange('auto_fetch_interval', value)}
                        disabled={savingGovernance}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6hours">A cada 6 horas</SelectItem>
                          <SelectItem value="daily">Diário</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Data Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : values.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Nenhum dado disponível</p>
                <p className="text-sm mt-2">Clique em "Atualizar via API" para buscar dados</p>
              </div>
            ) : isAnnual ? (
              <AnnualBlocksView 
                indicatorId={indicator.id}
                values={values}
                unit={indicator.unit}
                onValueChange={handleValueChange}
              />
            ) : (
              <MonthlyMatrixView 
                indicatorId={indicator.id}
                values={values}
                unit={indicator.unit}
                onValueChange={handleValueChange}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Value Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Inserir Novo Valor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data de Referência</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor {indicator?.unit && `(${indicator.unit})`}</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddValue} className="gap-2">
              <Plus className="h-4 w-4" />
              Inserir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Refresh Confirmation Modal */}
      <Dialog open={forceRefreshModalOpen} onOpenChange={setForceRefreshModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              ☢️ Recarregar do Zero
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              Esta operação para <span className="font-semibold">{indicator?.name}</span>:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <Trash2 className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">APAGAR todos os dados</p>
                  <p className="text-muted-foreground">Os {values.length} registros deste indicador serão excluídos.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <RefreshCw className="h-4 w-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-400">RECARREGAR do Zero</p>
                  <p className="text-muted-foreground">Os dados serão buscados novamente da API usando o período configurado.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="force-confirm-indicator"
                checked={forceRefreshConfirmed}
                onCheckedChange={(checked) => setForceRefreshConfirmed(checked === true)}
              />
              <Label
                htmlFor="force-confirm-indicator"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Confirmo que entendo a operação
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setForceRefreshModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceRefreshConfirm}
              disabled={!forceRefreshConfirmed || forceRefreshing}
              className="gap-2"
            >
              {forceRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
