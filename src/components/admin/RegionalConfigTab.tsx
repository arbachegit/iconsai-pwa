import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  MapPin, 
  Save, 
  RefreshCw, 
  Globe, 
  CheckCircle2, 
  XCircle,
  Edit3,
  Eye
} from "lucide-react";

interface RegionalRule {
  id: string;
  region_code: string;
  region_name: string;
  tone_rules: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const RegionalConfigTab = () => {
  const [rules, setRules] = useState<RegionalRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedRules, setEditedRules] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("regional_tone_rules")
        .select("*")
        .order("region_name");

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      logger.error("Error fetching regional rules:", error);
      toast({
        title: "Erro ao carregar regras",
        description: "Não foi possível carregar as configurações regionais.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleEdit = (rule: RegionalRule) => {
    setEditingId(rule.id);
    setEditedRules(prev => ({ ...prev, [rule.id]: rule.tone_rules }));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (rule: RegionalRule) => {
    setSavingId(rule.id);
    try {
      const { error } = await supabase
        .from("regional_tone_rules")
        .update({ 
          tone_rules: editedRules[rule.id],
          updated_at: new Date().toISOString()
        })
        .eq("id", rule.id);

      if (error) throw error;

      toast({
        title: "Regra atualizada",
        description: `Regras de tom para ${rule.region_name} foram salvas.`,
      });

      setEditingId(null);
      fetchRules();
    } catch (error) {
      logger.error("Error saving rule:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (rule: RegionalRule) => {
    try {
      const { error } = await supabase
        .from("regional_tone_rules")
        .update({ 
          is_active: !rule.is_active,
          updated_at: new Date().toISOString()
        })
        .eq("id", rule.id);

      if (error) throw error;

      toast({
        title: rule.is_active ? "Regra desativada" : "Regra ativada",
        description: `${rule.region_name} foi ${rule.is_active ? "desativada" : "ativada"}.`,
      });

      fetchRules();
    } catch (error) {
      logger.error("Error toggling rule:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status.",
        variant: "destructive",
      });
    }
  };

  const getRegionIcon = (code: string) => {
    const icons: Record<string, string> = {
      'sudeste-sp': '🏙️',
      'sudeste-mg': '⛰️',
      'sudeste-rj': '🏖️',
      'sul': '🌲',
      'nordeste': '☀️',
      'norte': '🌳',
      'centro-oeste': '🌾',
      'default': '🌍',
    };
    return icons[code] || '📍';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            Configurações Regionais
          </h2>
          <p className="text-muted-foreground mt-1">
            Gerencie as regras de tom cultural por região do Brasil
          </p>
        </div>
        <Button variant="outline" onClick={fetchRules} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-500" />
            Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            As regras de tom cultural são carregadas dinamicamente nas Edge Functions de chat 
            (health e study) e aplicadas ao system prompt baseado na localização do usuário.
          </p>
          <p>
            Quando um usuário inicia uma conversa, o sistema detecta sua cidade via geolocalização 
            e mapeia para a região correspondente, aplicando o tom cultural apropriado.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card 
            key={rule.id} 
            className={`border-2 transition-colors ${
              rule.is_active 
                ? 'border-primary/30 bg-card' 
                : 'border-muted bg-muted/20 opacity-60'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getRegionIcon(rule.region_code)}</span>
                  <div>
                    <CardTitle className="text-lg">{rule.region_name}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {rule.region_code}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggleActive(rule)}
                    />
                    <Label className="text-xs">
                      {rule.is_active ? (
                        <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inativa
                        </Badge>
                      )}
                    </Label>
                  </div>
                  
                  {editingId === rule.id ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(rule)}
                        disabled={savingId === rule.id}
                      >
                        {savingId === rule.id ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {editingId === rule.id ? (
                <Textarea
                  value={editedRules[rule.id] || rule.tone_rules}
                  onChange={(e) => setEditedRules(prev => ({ 
                    ...prev, 
                    [rule.id]: e.target.value 
                  }))}
                  className="min-h-[120px] border-blue-400/60 focus:border-blue-500"
                  placeholder="Descreva as regras de tom para esta região..."
                />
              ) : (
                <div className="bg-muted/30 rounded-lg p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="whitespace-pre-wrap">{rule.tone_rules}</p>
                  </div>
                </div>
              )}
              
              <Separator className="my-4" />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Atualizado em: {new Date(rule.updated_at).toLocaleString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rules.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Nenhuma regra configurada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              As regras regionais serão carregadas do banco de dados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
