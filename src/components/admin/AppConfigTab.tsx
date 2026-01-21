import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, AlertTriangle, Settings, Volume2, BarChart3, Shield, Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";

interface AppConfig {
  key: string;
  value: string;
  description: string | null;
  category: string | null;
  updated_at: string | null;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  voice: <Volume2 className="h-4 w-4" />,
  system: <Settings className="h-4 w-4" />,
  analytics: <BarChart3 className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  chat: <Database className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  voice: "Configurações de Voz",
  system: "Sistema",
  analytics: "Analytics",
  security: "Segurança",
  chat: "Chat",
};

export function AppConfigTab() {
  const queryClient = useQueryClient();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const { data: configs, isLoading, refetch } = useQuery({
    queryKey: ["app-config-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_config")
        .select("*")
        .order("category", { ascending: true })
        .order("key", { ascending: true });
      if (error) throw error;
      return data as AppConfig[];
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("app_config")
        .update({ 
          value: value,
          updated_at: new Date().toISOString() 
        })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
      queryClient.invalidateQueries({ queryKey: ["app-config-admin"] });
      toast.success(`Configuração "${variables.key}" atualizada!`);
      // Limpar valor editado após salvar
      setEditedValues(prev => {
        const newValues = { ...prev };
        delete newValues[variables.key];
        return newValues;
      });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar configuração: " + (error as Error).message);
    },
  });

  const handleValueChange = (key: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = (key: string) => {
    const newValue = editedValues[key];
    if (newValue !== undefined) {
      updateConfig.mutate({ key, value: newValue });
    }
  };

  const hasUnsavedChanges = (key: string, originalValue: string) => {
    return editedValues[key] !== undefined && editedValues[key] !== originalValue;
  };

  // Agrupar por categoria
  const groupedConfigs = configs?.reduce((acc, config) => {
    const category = config.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(config);
    return acc;
  }, {} as Record<string, AppConfig[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo
        title="Configurações do Sistema"
        level="h2"
        tooltipText="Gerencie valores configuráveis do sistema"
        infoContent={
          <p>
            Esta seção permite gerenciar valores que antes eram hardcoded no código.
            Alterações aqui afetam imediatamente o comportamento do sistema.
          </p>
        }
      />

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-500">Atenção</p>
              <p className="text-muted-foreground">
                Estas configurações afetam todo o sistema. Altere com cuidado. 
                Valores inválidos podem causar comportamento inesperado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Recarregar
        </Button>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedConfigs || {}).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {CATEGORY_ICONS[category] || <Settings className="h-4 w-4" />}
                {CATEGORY_LABELS[category] || category}
                <Badge variant="secondary" className="ml-2">
                  {items.length} config{items.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
              <CardDescription>
                Configurações da categoria "{category}"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((config) => {
                const currentValue = editedValues[config.key] ?? (typeof config.value === 'string' ? config.value : JSON.stringify(config.value));
                const originalValue = typeof config.value === 'string' ? config.value : JSON.stringify(config.value);
                const isModified = hasUnsavedChanges(config.key, originalValue);

                return (
                  <div key={config.key} className="space-y-2 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                          {config.key}
                        </code>
                        {isModified && (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                            Modificado
                          </Badge>
                        )}
                      </div>
                      {isModified && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(config.key)}
                          disabled={updateConfig.isPending}
                        >
                          {updateConfig.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" />
                              Salvar
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {config.description && (
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    )}

                    <Input
                      value={currentValue}
                      onChange={(e) => handleValueChange(config.key, e.target.value)}
                      className={isModified ? "border-amber-500/50" : ""}
                    />

                    {config.updated_at && (
                      <p className="text-xs text-muted-foreground">
                        Última atualização: {new Date(config.updated_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AppConfigTab;
