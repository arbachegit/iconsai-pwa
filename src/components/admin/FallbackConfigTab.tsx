import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowRightLeft, Bell, Loader2, Save, AlertTriangle } from "lucide-react";

interface FallbackConfig {
  id: string;
  enabled: boolean;
  threshold_percent: number;
  sms_provider: "infobip" | "twilio";
  alert_on_fallback: boolean;
  alert_email: string | null;
}

export default function FallbackConfigTab() {
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ["fallback-config"],
    queryFn: async (): Promise<FallbackConfig | null> => {
      const { data, error } = await supabase
        .from("notification_fallback_config")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data as FallbackConfig | null;
    },
  });

  const [formState, setFormState] = useState<Partial<FallbackConfig>>({});

  // Initialize form state when config is loaded
  const currentConfig = {
    enabled: formState.enabled ?? config?.enabled ?? true,
    threshold_percent: formState.threshold_percent ?? config?.threshold_percent ?? 80,
    sms_provider: formState.sms_provider ?? config?.sms_provider ?? "infobip",
    alert_on_fallback: formState.alert_on_fallback ?? config?.alert_on_fallback ?? true,
    alert_email: formState.alert_email ?? config?.alert_email ?? "",
  };

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<FallbackConfig>) => {
      if (config?.id) {
        const { error } = await supabase
          .from("notification_fallback_config")
          .update(updates)
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_fallback_config")
          .insert(updates);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["fallback-config"] });
      setFormState({});
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar configurações", {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      enabled: currentConfig.enabled,
      threshold_percent: currentConfig.threshold_percent,
      sms_provider: currentConfig.sms_provider,
      alert_on_fallback: currentConfig.alert_on_fallback,
      alert_email: currentConfig.alert_email || null,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p>Erro ao carregar configurações: {(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6" />
          Configuração de Fallback SMS
        </h1>
        <p className="text-muted-foreground">
          Configure o fallback automático para SMS quando o limite do WhatsApp for atingido
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fallback Automático</CardTitle>
          <CardDescription>
            Quando o limite diário de mensagens WhatsApp for atingido, o sistema automaticamente
            envia via SMS para garantir a entrega
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled" className="text-base">Ativar Fallback Automático</Label>
              <p className="text-sm text-muted-foreground">
                Redireciona mensagens para SMS quando limite WhatsApp for atingido
              </p>
            </div>
            <Switch
              id="enabled"
              checked={currentConfig.enabled}
              onCheckedChange={(checked) => setFormState({ ...formState, enabled: checked })}
            />
          </div>

          {/* Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Threshold de Ativação</Label>
              <span className="text-sm font-medium">{currentConfig.threshold_percent}%</span>
            </div>
            <Slider
              value={[currentConfig.threshold_percent]}
              min={50}
              max={95}
              step={5}
              onValueChange={(value) => setFormState({ ...formState, threshold_percent: value[0] })}
              disabled={!currentConfig.enabled}
            />
            <p className="text-xs text-muted-foreground">
              O fallback será ativado quando {currentConfig.threshold_percent}% do limite diário for usado.
              Isso deixa uma margem de segurança de {100 - currentConfig.threshold_percent}% do limite.
            </p>
          </div>

          {/* SMS Provider */}
          <div className="space-y-2">
            <Label>Provedor SMS</Label>
            <Select
              value={currentConfig.sms_provider}
              onValueChange={(value: "infobip" | "twilio") => 
                setFormState({ ...formState, sms_provider: value })
              }
              disabled={!currentConfig.enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="infobip">Infobip</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Provedor utilizado para envio de SMS quando fallback é ativado
            </p>
          </div>

          {/* Alert on Fallback */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="alert" className="text-base">Alertar quando fallback ativar</Label>
                <p className="text-sm text-muted-foreground">
                  Envia notificação quando o sistema mudar para SMS
                </p>
              </div>
            </div>
            <Switch
              id="alert"
              checked={currentConfig.alert_on_fallback}
              onCheckedChange={(checked) => 
                setFormState({ ...formState, alert_on_fallback: checked })
              }
              disabled={!currentConfig.enabled}
            />
          </div>

          {/* Alert Email */}
          {currentConfig.alert_on_fallback && (
            <div className="space-y-2">
              <Label htmlFor="alert-email">Email para Alertas</Label>
              <Input
                id="alert-email"
                type="email"
                placeholder="admin@empresa.com"
                value={currentConfig.alert_email}
                onChange={(e) => setFormState({ ...formState, alert_email: e.target.value })}
                disabled={!currentConfig.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para não receber alertas por email
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ArrowRightLeft className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium">Como funciona o Fallback</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>O sistema monitora o uso do limite diário de mensagens WhatsApp</li>
                <li>Quando o threshold configurado é atingido, novas mensagens são enviadas via SMS</li>
                <li>Todos os fallbacks são registrados para auditoria</li>
                <li>O limite é resetado à meia-noite (fuso horário do servidor)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
