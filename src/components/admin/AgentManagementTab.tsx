import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Bot, Settings, Save, RefreshCw, Volume2, Upload, BarChart3, 
  Brush, Calculator, MessageSquare, Edit, 
  CheckCircle2, XCircle, Loader2
} from "lucide-react";

import type { Database } from "@/integrations/supabase/types";

type ChatAgent = Database["public"]["Tables"]["chat_agents"]["Row"];

const AgentManagementTab: React.FC = () => {
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<ChatAgent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ChatAgent>>({});
  const [saving, setSaving] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_agents")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error("Erro ao carregar agentes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleEdit = (agent: ChatAgent) => {
    setEditingAgent(agent);
    setFormData({ ...agent });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingAgent) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("chat_agents")
        .update({
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
          system_prompt: formData.system_prompt,
          temperature: formData.temperature,
          max_tokens: formData.max_tokens,
          model: formData.model,
          metadata: formData.metadata,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingAgent.id);

      if (error) throw error;

      toast.success("Agente atualizado com sucesso");
      setIsDialogOpen(false);
      fetchAgents();
    } catch (error) {
      console.error("Error saving agent:", error);
      toast.error("Erro ao salvar agente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-cyan-400">Gerenciamento de Agentes</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAgents}
          disabled={loading}
          className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-400"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Agent Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.map(agent => (
            <Card key={agent.id} className="bg-slate-900/50 border-cyan-500/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-cyan-400">{agent.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">id: {agent.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(agent)}
                    className="text-cyan-400 hover:bg-cyan-500/10"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {agent.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant="outline" 
                    className={agent.is_active 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                      : "bg-red-500/20 text-red-300 border-red-500/30"
                    }
                  >
                    {agent.is_active ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {agent.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {agent.model || 'default'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-400">
              <Settings className="h-5 w-5" />
              Editar Agente: {editingAgent?.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="geral" className="mt-4">
            <TabsList className="grid grid-cols-2 bg-slate-800">
              <TabsTrigger value="geral" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                Geral
              </TabsTrigger>
              <TabsTrigger value="modelo" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                Modelo
              </TabsTrigger>
            </TabsList>

            {/* Tab Geral */}
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-cyan-400">Nome</Label>
                <Input
                  value={formData.name || ""}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">Descrição</Label>
                <Textarea
                  value={formData.description || ""}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">System Prompt</Label>
                <Textarea
                  value={formData.system_prompt || ""}
                  onChange={e => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                  rows={6}
                  className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <Label className="text-cyan-400">Agente Ativo</Label>
                  <p className="text-xs text-muted-foreground">Desativar remove o agente da interface</p>
                </div>
                <Switch
                  checked={formData.is_active ?? true}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </TabsContent>

            {/* Tab Modelo */}
            <TabsContent value="modelo" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-cyan-400">Modelo</Label>
                <Input
                  value={formData.model || ""}
                  onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="gpt-4, claude-3, etc."
                  className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">
                  Temperatura: {(formData.temperature || 0.7).toFixed(2)}
                </Label>
                <Slider
                  value={[formData.temperature || 0.7]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, temperature: value }))}
                  min={0}
                  max={2}
                  step={0.1}
                  className="accent-cyan-500"
                />
                <p className="text-xs text-muted-foreground">
                  Menor valor = mais determinístico, maior valor = mais criativo
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">Max Tokens</Label>
                <Input
                  type="number"
                  value={formData.max_tokens || 4096}
                  onChange={e => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 4096 }))}
                  min={100}
                  max={128000}
                  className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                />
                <p className="text-xs text-muted-foreground">
                  Limite máximo de tokens na resposta
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              className="border-cyan-500/30"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentManagementTab;
