import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Smartphone, Copy, ExternalLink, CheckCircle, Loader2,
  Settings, Volume2, RotateCcw, Save, Play, HelpCircle, Globe,
  Heart, Lightbulb, Monitor, AlertTriangle, MessageSquare, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConfigPWA } from "@/hooks/useConfigPWA";

const VOICE_OPTIONS = [
  { value: "fernando", label: "Fernando (PT-BR)", provider: "ElevenLabs" },
  { value: "alloy", label: "Alloy (Neutro)", provider: "OpenAI" },
  { value: "onyx", label: "Onyx (Grave)", provider: "OpenAI" },
  { value: "nova", label: "Nova (Feminino)", provider: "OpenAI" },
  { value: "shimmer", label: "Shimmer (Suave)", provider: "OpenAI" },
];

export default function PWATab() {
  const [copied, setCopied] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [allowDesktopAccess, setAllowDesktopAccess] = useState(false);
  const [isLoadingDesktop, setIsLoadingDesktop] = useState(true);
  const [isSavingDesktop, setIsSavingDesktop] = useState(false);

  // PWA City states
  const [allowPWACityDesktopAccess, setAllowPWACityDesktopAccess] = useState(false);
  const [isLoadingPWACityDesktop, setIsLoadingPWACityDesktop] = useState(true);
  const [isSavingPWACityDesktop, setIsSavingPWACityDesktop] = useState(false);
  const [defaultApiProvider, setDefaultApiProvider] = useState<string>("openai");
  const [isLoadingApiProvider, setIsLoadingApiProvider] = useState(true);
  const [isSavingApiProvider, setIsSavingApiProvider] = useState(false);

  // PWA Health states
  const [allowPWAHealthDesktopAccess, setAllowPWAHealthDesktopAccess] = useState(false);
  const [isLoadingPWAHealthDesktop, setIsLoadingPWAHealthDesktop] = useState(true);

  const { config, isLoading: configLoading, isSaving, updateConfig, saveConfig, resetToDefaults } = useConfigPWA();

  const pwaUrl = `${window.location.origin}/pwa`;

  // Carregar configuração de acesso desktop
  useEffect(() => {
    const loadDesktopConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("pwa_config")
          .select("config_value")
          .eq("config_key", "allow_desktop_access")
          .single();

        if (!error && data) {
          setAllowDesktopAccess(data.config_value === "true");
        }
      } catch (err) {
        console.log("[PWATab] Config not found, using default");
      } finally {
        setIsLoadingDesktop(false);
      }
    };

    loadDesktopConfig();
  }, []);

  // Toggle acesso desktop
  const handleToggleDesktopAccess = async () => {
    setIsSavingDesktop(true);
    const newValue = !allowDesktopAccess;

    try {
      const { error } = await supabase
        .from("pwa_config")
        .upsert({
          config_key: "allow_desktop_access",
          config_value: String(newValue),
          config_type: "boolean",
          updated_at: new Date().toISOString(),
        }, { onConflict: "config_key" });

      if (error) throw error;

      setAllowDesktopAccess(newValue);
      toast.success(newValue ? "Acesso desktop liberado" : "Acesso desktop bloqueado");
    } catch (err) {
      console.error("[PWATab] Erro ao salvar:", err);
      toast.error("Erro ao salvar configuração");
    } finally {
      setIsSavingDesktop(false);
    }
  };

  // Carregar configurações do PWA City
  useEffect(() => {
    const loadPWACityConfig = async () => {
      try {
        // Carregar toggle desktop
        const { data: desktopData } = await supabase
          .from("pwacity_config")
          .select("config_value")
          .eq("config_key", "allow_desktop_access")
          .single();

        if (desktopData) {
          setAllowPWACityDesktopAccess(desktopData.config_value === "true");
        }

        // Carregar API provider
        const { data: apiData } = await supabase
          .from("pwacity_config")
          .select("config_value")
          .eq("config_key", "default_api_provider")
          .single();

        if (apiData) {
          setDefaultApiProvider(apiData.config_value);
        }
      } catch (err) {
        console.log("[PWATab] PWA City config not found, using defaults");
      } finally {
        setIsLoadingPWACityDesktop(false);
        setIsLoadingApiProvider(false);
      }
    };

    loadPWACityConfig();
  }, []);

  // Carregar configurações do PWA Health
  useEffect(() => {
    const loadPWAHealthConfig = async () => {
      try {
        const { data: desktopData } = await supabase
          .from("pwacity_config") // PWA Health usa mesma tabela do PWA City
          .select("config_value")
          .eq("config_key", "allow_desktop_access")
          .single();

        if (desktopData) {
          setAllowPWAHealthDesktopAccess(desktopData.config_value === "true");
        }
      } catch (err) {
        console.log("[PWATab] PWA Health config not found, using defaults");
      } finally {
        setIsLoadingPWAHealthDesktop(false);
      }
    };

    loadPWAHealthConfig();
  }, []);

  // Toggle acesso desktop PWA City
  const handleTogglePWACityDesktopAccess = async () => {
    setIsSavingPWACityDesktop(true);
    const newValue = !allowPWACityDesktopAccess;

    try {
      const { error } = await supabase
        .from("pwacity_config")
        .upsert({
          config_key: "allow_desktop_access",
          config_value: String(newValue),
          config_type: "boolean",
          updated_at: new Date().toISOString(),
        }, { onConflict: "config_key" });

      if (error) throw error;

      setAllowPWACityDesktopAccess(newValue);
      toast.success(newValue ? "Acesso desktop PWA City liberado" : "Acesso desktop PWA City bloqueado");
    } catch (err) {
      console.error("[PWATab] Erro ao salvar PWA City config:", err);
      toast.error("Erro ao salvar configuração");
    } finally {
      setIsSavingPWACityDesktop(false);
    }
  };

  // Alterar API provider do PWA City
  const handleChangeApiProvider = async (newProvider: string) => {
    setIsSavingApiProvider(true);

    try {
      const { error } = await supabase
        .from("pwacity_config")
        .upsert({
          config_key: "default_api_provider",
          config_value: newProvider,
          config_type: "text",
          updated_at: new Date().toISOString(),
        }, { onConflict: "config_key" });

      if (error) throw error;

      setDefaultApiProvider(newProvider);
      toast.success(`API alterada para ${newProvider === "openai" ? "OpenAI" : "Gemini"}`);
    } catch (err) {
      console.error("[PWATab] Erro ao salvar API provider:", err);
      toast.error("Erro ao salvar configuração");
    } finally {
      setIsSavingApiProvider(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(pwaUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const testVoice = async () => {
    setTestingVoice(true);
    try {
      const testText = "Olá! Esta é uma demonstração da voz selecionada para o KnowYOU.";
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: testText, voice: config.ttsVoice }),
        }
      );

      if (!response.ok) throw new Error("Erro ao gerar áudio");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
      toast.success("Reproduzindo teste de voz...");
    } catch (err) {
      console.error("Erro ao testar voz:", err);
      toast.error("Erro ao testar voz");
    } finally {
      setTestingVoice(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
          <Smartphone className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Config. PWA - KnowYOU</h2>
          <p className="text-muted-foreground">
            Configurações do aplicativo de voz
          </p>
        </div>
      </div>

      {/* Acesso por Dispositivo */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Acesso por Dispositivo
          </CardTitle>
          <CardDescription>Controle o acesso ao PWA por tipo de dispositivo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle Acesso Desktop */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Monitor className="h-6 w-6 text-primary" />
              </div>
              <div>
                <Label htmlFor="allow-desktop" className="text-base font-medium">
                  Permitir Acesso Desktop
                </Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativado, o PWA pode ser acessado pelo computador (útil para testes)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLoadingDesktop ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Badge variant={allowDesktopAccess ? "default" : "secondary"}>
                    {allowDesktopAccess ? "Ativo" : "Inativo"}
                  </Badge>
                  <Switch
                    id="allow-desktop"
                    checked={allowDesktopAccess}
                    onCheckedChange={handleToggleDesktopAccess}
                    disabled={isSavingDesktop}
                  />
                </>
              )}
            </div>
          </div>

          {/* Aviso quando ativo */}
          {allowDesktopAccess && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-500">Modo de Teste Ativo</p>
                    <p className="text-muted-foreground">
                      O acesso desktop está liberado. Lembre-se de desativar após os testes
                      para manter a experiência mobile-first do PWA.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Demonstração e Vendas */}
      <Card className="border-2 border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-yellow-500" />
            Demonstração e Vendas
          </CardTitle>
          <CardDescription>
            Abra demos pré-configuradas para apresentar aos clientes (sem necessidade de login)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Aviso Global */}
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-500">Acesso Rápido para Vendas</p>
                  <p className="text-muted-foreground">
                    Clique nos botões abaixo para abrir demos sem necessidade de login ou configuração. Perfeito para apresentações!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PWA Principal (KnowYOU) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-sm">PWA Principal (KnowYOU)</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`${window.location.origin}/pwa?demo=clean`, "_blank");
                  toast.success("Abrindo demo limpo do PWA Principal");
                }}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Demo Limpo
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`${window.location.origin}/pwa?demo=seeded`, "_blank");
                  toast.success("Abrindo demo com histórico do PWA Principal");
                }}
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Demo com Histórico
              </Button>
            </div>
          </div>

          <Separator />

          {/* PWA City (Chat IA) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-cyan-500" />
              <h3 className="font-semibold text-sm">PWA City (Chat IA)</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`${window.location.origin}/pwacity?demo=clean`, "_blank");
                  toast.success("Abrindo demo limpo do PWA City");
                }}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Demo Limpo
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`${window.location.origin}/pwacity?demo=seeded`, "_blank");
                  toast.success("Abrindo demo com histórico do PWA City");
                }}
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Demo com Histórico
              </Button>
            </div>
          </div>

          <Separator />

          {/* PWA Health (Saúde) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <h3 className="font-semibold text-sm">PWA Health (Saúde)</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`${window.location.origin}/pwahealth?demo=clean`, "_blank");
                  toast.success("Abrindo demo limpo do PWA Health");
                }}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Demo Limpo
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`${window.location.origin}/pwahealth?demo=seeded`, "_blank");
                  toast.success("Abrindo demo com histórico do PWA Health");
                }}
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Demo com Histórico
              </Button>
            </div>
          </div>

          {/* Explicação */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-2">✨ Como funciona:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• <strong>Demo Limpo:</strong> Sem histórico, ideal para primeira apresentação</li>
              <li>• <strong>Demo com Histórico:</strong> Conversas de exemplo já carregadas, mostra o potencial</li>
              <li>• <strong>Sem login:</strong> Acesso imediato sem credenciais</li>
              <li>• <strong>Seguro:</strong> Nenhuma conversa é salva no banco de dados</li>
              <li>• <strong>Desktop liberado:</strong> Funciona automaticamente no computador</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* PWA City Config */}
      <Card className="border-2 border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-cyan-500" />
            PWA City (Microserviço)
          </CardTitle>
          <CardDescription>Chat IA separado com OpenAI/Gemini</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle Acesso Desktop PWA City */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Monitor className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <Label htmlFor="pwacity-allow-desktop" className="text-base font-medium">
                  Permitir Acesso Desktop (Admin)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Apenas admin/superadmin podem acessar no desktop (usuários comuns sempre mobile)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLoadingPWACityDesktop ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Badge variant={allowPWACityDesktopAccess ? "default" : "secondary"} className={allowPWACityDesktopAccess ? "bg-cyan-500 hover:bg-cyan-600" : ""}>
                    {allowPWACityDesktopAccess ? "Ativo" : "Inativo"}
                  </Badge>
                  <Switch
                    id="pwacity-allow-desktop"
                    checked={allowPWACityDesktopAccess}
                    onCheckedChange={handleTogglePWACityDesktopAccess}
                    disabled={isSavingPWACityDesktop}
                  />
                </>
              )}
            </div>
          </div>

          {/* Seletor de API */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Sparkles className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <Label htmlFor="api-provider" className="text-base font-medium">
                  Provedor de IA
                </Label>
                <p className="text-sm text-muted-foreground">
                  Escolha qual API usar para o chat
                </p>
              </div>
            </div>
            <div className="w-40">
              {isLoadingApiProvider ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Select
                  value={defaultApiProvider}
                  onValueChange={handleChangeApiProvider}
                  disabled={isSavingApiProvider}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Aviso */}
          <Card className="border-cyan-500/30 bg-cyan-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-cyan-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-cyan-500">Microserviço Separado</p>
                  <p className="text-muted-foreground">
                    O PWA City é um chat independente com autenticação própria, separado do PWA principal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Link do PWA */}
      <Card>
        <CardHeader>
          <CardTitle>Link para Instalação</CardTitle>
          <CardDescription>
            Envie este link para o usuário instalar o app no celular
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={pwaUrl}
              readOnly
              className="bg-muted font-mono text-sm"
            />
            <Button onClick={copyLink} variant="outline">
              {copied ? <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="font-medium mb-2">Instruções para o usuário:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Android:</strong> Abra o link no Chrome → Menu (⋮) → "Instalar aplicativo"</li>
              <li>• <strong>iPhone:</strong> Abra no Safari → Compartilhar (↑) → "Adicionar à Tela de Início"</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Configurações do PWA */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <CardTitle>Configurações do PWA</CardTitle>
          </div>
          <CardDescription>
            Personalize o comportamento do assistente de voz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {configLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Texto de Boas-Vindas */}
              <div className="space-y-2">
                <Label htmlFor="welcome-text" className="text-base font-medium">
                  Texto de Boas-Vindas
                </Label>
                <Textarea
                  id="welcome-text"
                  value={config.welcomeText}
                  onChange={(e) => updateConfig("welcomeText", e.target.value)}
                  placeholder="Digite o texto de boas-vindas..."
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">[name]</code> para inserir o nome do usuário.
                  <span className="float-right">{config.welcomeText.length}/500</span>
                </p>
              </div>

              <Separator />

              {/* Textos de Apresentação dos Módulos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  Textos de Apresentação dos Módulos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Estes textos serão reproduzidos automaticamente quando o usuário entrar em cada módulo.
                </p>

                {/* Módulo Ajuda */}
                <div className="space-y-2 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <Label htmlFor="help-welcome" className="text-sm font-medium flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-500" />
                    Módulo Ajuda
                  </Label>
                  <Textarea
                    id="help-welcome"
                    value={config.helpWelcomeText}
                    onChange={(e) => updateConfig("helpWelcomeText", e.target.value)}
                    placeholder="Texto de apresentação do módulo Ajuda..."
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">{config.helpWelcomeText.length}/500</p>
                </div>

                {/* Módulo Mundo */}
                <div className="space-y-2 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <Label htmlFor="world-welcome" className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    Módulo Mundo
                  </Label>
                  <Textarea
                    id="world-welcome"
                    value={config.worldWelcomeText}
                    onChange={(e) => updateConfig("worldWelcomeText", e.target.value)}
                    placeholder="Texto de apresentação do módulo Mundo..."
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">{config.worldWelcomeText.length}/500</p>
                </div>

                {/* Módulo Saúde */}
                <div className="space-y-2 p-4 rounded-lg bg-rose-500/5 border border-rose-500/20">
                  <Label htmlFor="health-welcome" className="text-sm font-medium flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    Módulo Saúde
                  </Label>
                  <Textarea
                    id="health-welcome"
                    value={config.healthWelcomeText}
                    onChange={(e) => updateConfig("healthWelcomeText", e.target.value)}
                    placeholder="Texto de apresentação do módulo Saúde..."
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">{config.healthWelcomeText.length}/500</p>
                </div>

                {/* Módulo Ideias */}
                <div className="space-y-2 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <Label htmlFor="ideas-welcome" className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Módulo Ideias
                  </Label>
                  <Textarea
                    id="ideas-welcome"
                    value={config.ideasWelcomeText}
                    onChange={(e) => updateConfig("ideasWelcomeText", e.target.value)}
                    placeholder="Texto de apresentação do módulo Ideias..."
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">{config.ideasWelcomeText.length}/500</p>
                </div>
              </div>

              <Separator />

              {/* Voz TTS */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Voz TTS</Label>
                <div className="flex gap-2">
                  <Select
                    value={config.ttsVoice}
                    onValueChange={(value) => updateConfig("ttsVoice", value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione uma voz" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_OPTIONS.map((voice) => (
                        <SelectItem key={voice.value} value={voice.value}>
                          <div className="flex items-center gap-2">
                            <Volume2 className="w-4 h-4" />
                            <span>{voice.label}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {voice.provider}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={testVoice}
                    disabled={testingVoice}
                  >
                    {testingVoice ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span className="ml-2">Testar</span>
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Controles de Voz ElevenLabs */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-semibold">Controles de Voz ElevenLabs</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ajuste os parâmetros da voz para obter a melhor qualidade de fala.
                </p>

                {/* Speed */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Velocidade (Speed)</Label>
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {config.voiceSpeed.toFixed(2)}x
                    </span>
                  </div>
                  <Slider
                    value={[config.voiceSpeed]}
                    onValueChange={([value]) => updateConfig("voiceSpeed", value)}
                    min={0.5}
                    max={2.0}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Lento (0.5x)</span>
                    <span>Normal (1.0x)</span>
                    <span>Rápido (2.0x)</span>
                  </div>
                </div>

                {/* Stability */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Estabilidade (Stability)</Label>
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {Math.round(config.voiceStability * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[config.voiceStability]}
                    onValueChange={([value]) => updateConfig("voiceStability", value)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Mais variável</span>
                    <span>Mais estável</span>
                  </div>
                </div>

                {/* Similarity */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Fidelidade (Similarity)</Label>
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {Math.round(config.voiceSimilarity * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[config.voiceSimilarity]}
                    onValueChange={([value]) => updateConfig("voiceSimilarity", value)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Baixa</span>
                    <span>Alta (recomendado)</span>
                  </div>
                </div>

                {/* Style */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Exagero de Estilo (Style)</Label>
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {Math.round(config.voiceStyle * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[config.voiceStyle]}
                    onValueChange={([value]) => updateConfig("voiceStyle", value)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Nenhum (natural)</span>
                    <span>Exagerado</span>
                  </div>
                </div>

                {/* Speaker Boost */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Amplificação do Falante</Label>
                    <p className="text-xs text-muted-foreground">
                      Melhora a clareza da voz clonada
                    </p>
                  </div>
                  <Switch
                    checked={config.voiceSpeakerBoost}
                    onCheckedChange={(checked) => updateConfig("voiceSpeakerBoost", checked)}
                  />
                </div>

                {/* Dica */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-xs text-purple-300">
                    <strong>Dica:</strong> Para voz mais natural, mantenha Estabilidade em 50%,
                    Fidelidade em 100% e Exagero de Estilo em 0%.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Timeout do Microfone */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Timeout do Microfone</Label>
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {config.micTimeoutSeconds}s
                  </span>
                </div>
                <Slider
                  value={[config.micTimeoutSeconds]}
                  onValueChange={([value]) => updateConfig("micTimeoutSeconds", value)}
                  min={5}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5s</span>
                  <span>30s</span>
                </div>
              </div>

              {/* Mostrar Contagem Regressiva */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Mostrar Contagem Regressiva</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibe os últimos 5 segundos antes do timeout
                  </p>
                </div>
                <Switch
                  checked={config.enableCountdown}
                  onCheckedChange={(checked) => updateConfig("enableCountdown", checked)}
                />
              </div>

              <Separator />

              {/* Duração do Splash */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Duração do Splash Screen</Label>
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {config.splashDurationMs}ms
                  </span>
                </div>
                <Slider
                  value={[config.splashDurationMs]}
                  onValueChange={([value]) => updateConfig("splashDurationMs", value)}
                  min={1000}
                  max={5000}
                  step={500}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1s</span>
                  <span>5s</span>
                </div>
              </div>

              <Separator />

              {/* Botões de ação */}
              <div className="flex gap-3 pt-2">
                <Button onClick={saveConfig} disabled={isSaving} className="flex-1">
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
                <Button variant="outline" onClick={resetToDefaults}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar Padrões
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
