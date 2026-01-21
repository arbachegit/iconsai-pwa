import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Monitor, 
  Keyboard, 
  MousePointer, 
  Code2, 
  Frame, 
  Type,
  Terminal,
  Clock,
  Save,
  RefreshCw,
  AlertTriangle,
  Globe,
  Loader2,
  Eye,
  Hash
} from "lucide-react";

interface SecurityShieldConfig {
  id: string;
  shield_enabled: boolean;
  devtools_detection_enabled: boolean;
  right_click_block_enabled: boolean;
  keyboard_shortcuts_block_enabled: boolean;
  console_clear_enabled: boolean;
  iframe_detection_enabled: boolean;
  react_devtools_detection_enabled: boolean;
  text_selection_block_enabled: boolean;
  monitoring_interval_ms: number;
  console_clear_interval_ms: number;
  auto_ban_on_violation: boolean;
  ban_duration_hours: number | null;
  max_violation_attempts: number;
  show_violation_popup: boolean;
  whitelisted_domains: string[];
  created_at: string;
  updated_at: string;
}

export function SecurityShieldConfigTab() {
  const queryClient = useQueryClient();
  const [localConfig, setLocalConfig] = useState<SecurityShieldConfig | null>(null);
  const [newDomain, setNewDomain] = useState("");

  const { data: config, isLoading, error, refetch } = useQuery({
    queryKey: ["security-shield-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_shield_config")
        .select("*")
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as SecurityShieldConfig;
    },
  });

  // Initialize local state when config loads
  useState(() => {
    if (config && !localConfig) {
      setLocalConfig(config);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<SecurityShieldConfig>) => {
      if (!config?.id) throw new Error("No config found");
      
      const { error } = await supabase
        .from("security_shield_config")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", config.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso");
      queryClient.invalidateQueries({ queryKey: ["security-shield-config"] });
    },
    onError: (error) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });

  const handleToggle = (field: keyof SecurityShieldConfig, value: boolean) => {
    updateMutation.mutate({ [field]: value });
  };

  const handleNumberChange = (field: keyof SecurityShieldConfig, value: number) => {
    updateMutation.mutate({ [field]: value });
  };

  const handleAddDomain = () => {
    if (!newDomain.trim() || !config) return;
    
    const updatedDomains = [...(config.whitelisted_domains || []), newDomain.trim()];
    updateMutation.mutate({ whitelisted_domains: updatedDomains });
    setNewDomain("");
  };

  const handleRemoveDomain = (domain: string) => {
    if (!config) return;
    
    const updatedDomains = (config.whitelisted_domains || []).filter(d => d !== domain);
    updateMutation.mutate({ whitelisted_domains: updatedDomains });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="p-6">
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <p>Erro ao carregar configurações do Security Shield</p>
            </div>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Configuração do Security Shield</h1>
          <p className="text-muted-foreground text-sm">Gerencie as proteções contra inspeção de código e DevTools</p>
        </div>
      </div>

      {/* Master Toggle */}
      <Card className={config.shield_enabled ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.shield_enabled ? (
                <ShieldCheck className="w-6 h-6 text-green-500" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-amber-500" />
              )}
              <div>
                <CardTitle className="text-lg">Security Shield</CardTitle>
                <CardDescription>
                  {config.shield_enabled 
                    ? "Sistema de proteção ativo em produção" 
                    : "Sistema de proteção desativado"
                  }
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={config.shield_enabled}
              onCheckedChange={(checked) => handleToggle("shield_enabled", checked)}
              disabled={updateMutation.isPending}
            />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Detection Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="w-5 h-5 text-cyan-400" />
              Detecções
            </CardTitle>
            <CardDescription>
              Configure quais tipos de inspeção serão detectados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="devtools">DevTools (Chrome/Firefox)</Label>
              </div>
              <Switch
                id="devtools"
                checked={config.devtools_detection_enabled}
                onCheckedChange={(checked) => handleToggle("devtools_detection_enabled", checked)}
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="react-devtools">React DevTools</Label>
              </div>
              <Switch
                id="react-devtools"
                checked={config.react_devtools_detection_enabled}
                onCheckedChange={(checked) => handleToggle("react_devtools_detection_enabled", checked)}
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Frame className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="iframe">Iframe Embedding</Label>
              </div>
              <Switch
                id="iframe"
                checked={config.iframe_detection_enabled}
                onCheckedChange={(checked) => handleToggle("iframe_detection_enabled", checked)}
                disabled={updateMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Blocking Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
              Bloqueios
            </CardTitle>
            <CardDescription>
              Configure quais ações serão bloqueadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="keyboard">Atalhos de teclado (F12, Ctrl+Shift+I)</Label>
              </div>
              <Switch
                id="keyboard"
                checked={config.keyboard_shortcuts_block_enabled}
                onCheckedChange={(checked) => handleToggle("keyboard_shortcuts_block_enabled", checked)}
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="right-click">Clique direito (menu contexto)</Label>
              </div>
              <Switch
                id="right-click"
                checked={config.right_click_block_enabled}
                onCheckedChange={(checked) => handleToggle("right_click_block_enabled", checked)}
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="text-selection">Seleção de texto</Label>
              </div>
              <Switch
                id="text-selection"
                checked={config.text_selection_block_enabled}
                onCheckedChange={(checked) => handleToggle("text_selection_block_enabled", checked)}
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="console">Limpar console periodicamente</Label>
              </div>
              <Switch
                id="console"
                checked={config.console_clear_enabled}
                onCheckedChange={(checked) => handleToggle("console_clear_enabled", checked)}
                disabled={updateMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ban Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-5 h-5 text-red-400" />
              Banimento
            </CardTitle>
            <CardDescription>
              Configure o comportamento de banimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-ban">Banir automaticamente ao detectar violação</Label>
              <Switch
                id="auto-ban"
                checked={config.auto_ban_on_violation}
                onCheckedChange={(checked) => handleToggle("auto_ban_on_violation", checked)}
                disabled={updateMutation.isPending}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="max-attempts" className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                Número máximo de tentativas
              </Label>
              <Input
                id="max-attempts"
                type="number"
                min="1"
                max="10"
                value={config.max_violation_attempts}
                onChange={(e) => handleNumberChange("max_violation_attempts", parseInt(e.target.value) || 3)}
                disabled={updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Quantas violações antes do banimento automático
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="ban-duration">
                Duração do banimento (horas)
                <span className="text-muted-foreground ml-2 text-xs">
                  (deixe vazio para permanente)
                </span>
              </Label>
              <Input
                id="ban-duration"
                type="number"
                min="0"
                placeholder="Permanente"
                value={config.ban_duration_hours ?? ""}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : null;
                  updateMutation.mutate({ ban_duration_hours: value });
                }}
                disabled={updateMutation.isPending}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="show-popup">Pop-up de violações</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibir contador de tentativas e tempo restante
                  </p>
                </div>
              </div>
              <Switch
                id="show-popup"
                checked={config.show_violation_popup}
                onCheckedChange={(checked) => handleToggle("show_violation_popup", checked)}
                disabled={updateMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Timing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-blue-400" />
              Intervalos
            </CardTitle>
            <CardDescription>
              Configure os intervalos de monitoramento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="monitoring-interval">
                Intervalo de monitoramento (ms)
              </Label>
              <Input
                id="monitoring-interval"
                type="number"
                min="100"
                max="5000"
                value={config.monitoring_interval_ms}
                onChange={(e) => handleNumberChange("monitoring_interval_ms", parseInt(e.target.value) || 500)}
                disabled={updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Frequência de verificação de DevTools aberto
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="console-interval">
                Intervalo de limpeza do console (ms)
              </Label>
              <Input
                id="console-interval"
                type="number"
                min="500"
                max="10000"
                value={config.console_clear_interval_ms}
                onChange={(e) => handleNumberChange("console_clear_interval_ms", parseInt(e.target.value) || 1000)}
                disabled={updateMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Whitelisted Domains */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-5 h-5 text-emerald-400" />
            Domínios na Whitelist
          </CardTitle>
          <CardDescription>
            Domínios onde o Security Shield será desativado (desenvolvimento/preview)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="exemplo.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
            />
            <Button 
              onClick={handleAddDomain}
              disabled={!newDomain.trim() || updateMutation.isPending}
            >
              Adicionar
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(config.whitelisted_domains || []).map((domain) => (
              <Badge 
                key={domain} 
                variant="secondary" 
                className="gap-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => handleRemoveDomain(domain)}
              >
                {domain}
                <span className="text-xs">×</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Última atualização: {new Date(config.updated_at).toLocaleString("pt-BR")}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {updateMutation.isPending ? "Salvando..." : "Atualizar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
