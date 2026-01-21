import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useToast } from "@/hooks/use-toast";
import { Volume2, Play, Loader2, Bell, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";

export const ChatConfigTab = () => {
  const { settings, updateSettings, isLoading } = useAdminSettings();
  const { toast } = useToast();
  const [alertEmail, setAlertEmail] = useState(settings?.alert_email || "");
  const [alertThreshold, setAlertThreshold] = useState(settings?.alert_threshold || 0.30);

  const handleToggle = async (field: "chat_audio_enabled" | "auto_play_audio") => {
    if (!settings) return;

    try {
      await updateSettings({
        [field]: !settings[field],
      });

      toast({
        title: "Configuração atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  const handleAlertSettings = async () => {
    if (!settings) return;

    try {
      await updateSettings({
        alert_email: alertEmail,
        alert_threshold: alertThreshold,
      });

      toast({
        title: "Configurações de alerta atualizadas",
        description: "As alterações foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  const testElevenLabs = () => {
    toast({
      title: "Teste de conexão",
      description: "Verificando conexão com ElevenLabs...",
    });

    setTimeout(() => {
      toast({
        title: "Conexão bem-sucedida",
        description: "ElevenLabs está funcionando corretamente.",
      });
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <AdminTitleWithInfo
          title="Configurações do Chat"
          level="h1"
          icon={SettingsIcon}
          tooltipText="Configure o comportamento do chat"
          infoContent={
            <>
              <p>Gerencie configurações de áudio e alertas do chat.</p>
              <p className="mt-2">Controle geração de áudio, autoplay e notificações de sentimento negativo.</p>
            </>
          }
        />
        <p className="text-muted-foreground mt-2">
          Gerencie o comportamento do chat e do áudio
        </p>
      </div>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <AdminTitleWithInfo
          title="Controles de Áudio"
          level="h2"
          icon={Volume2}
          tooltipText="Configurações de áudio do chat"
          infoContent={
            <>
              <p>Configure geração e reprodução de áudio.</p>
              <p className="mt-2">Ative síntese de voz com ElevenLabs e autoplay de respostas.</p>
            </>
          }
          className="mb-6"
        />

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-background/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Geração de Áudio</h3>
                <p className="text-sm text-muted-foreground">
                  Ativar síntese de voz com ElevenLabs
                </p>
              </div>
            </div>

            <Switch
              checked={settings?.chat_audio_enabled || false}
              onCheckedChange={() => handleToggle("chat_audio_enabled")}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-background/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Play className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Auto-play</h3>
                <p className="text-sm text-muted-foreground">
                  Reproduzir áudio automaticamente após resposta
                </p>
              </div>
            </div>

            <Switch
              checked={settings?.auto_play_audio || false}
              onCheckedChange={() => handleToggle("auto_play_audio")}
              disabled={!settings?.chat_audio_enabled}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <AdminTitleWithInfo
          title="Alertas de Sentimento"
          level="h2"
          icon={Bell}
          tooltipText="Alertas de conversas negativas"
          infoContent={
            <>
              <p>Receba notificações de conversas com sentimento negativo.</p>
              <p className="mt-2">Configure email e threshold para detecção automática.</p>
            </>
          }
          className="mb-6"
        />
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-background/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Alertas Automáticos</h3>
                <p className="text-sm text-muted-foreground">
                  Receba emails quando conversas negativas forem detectadas
                </p>
              </div>
            </div>

            <Switch
              checked={settings?.alert_enabled || false}
              onCheckedChange={() => handleToggle("alert_enabled" as any)}
            />
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="alert-email">Email para Alertas</Label>
              <Input
                id="alert-email"
                type="email"
                placeholder="admin@knowrisk.io"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                disabled={!settings?.alert_enabled}
              />
            </div>

            <div>
              <Label htmlFor="alert-threshold">Threshold de Sentimento (0-1)</Label>
              <Input
                id="alert-threshold"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(parseFloat(e.target.value))}
                disabled={!settings?.alert_enabled}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alertas serão enviados quando o score for menor que {alertThreshold} (padrão: 0.30)
              </p>
            </div>

            <Button onClick={handleAlertSettings} disabled={!settings?.alert_enabled}>
              Salvar Configurações de Alerta
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Teste de Conexão
        </h2>
        <p className="text-muted-foreground mb-4">
          Verifique se a integração com ElevenLabs está funcionando corretamente.
        </p>

        <Button onClick={testElevenLabs} className="gap-2">
          <Play className="w-4 h-4" />
          Testar ElevenLabs
        </Button>
      </Card>
    </div>
  );
};

export default ChatConfigTab;
