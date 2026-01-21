import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseUntyped } from "@/integrations/supabase/typed-client";
import { useToast } from "@/hooks/use-toast";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Layers,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";

// Tipos
interface ContentProfile {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  is_active: boolean | null;
  is_default: boolean | null;
  prompt_template: string;
  antiprompt: string | null;
  match_threshold: number | null;
  match_count: number | null;
  maieutic_enabled: boolean | null;
  adaptation_speed: string | null;
  initial_cognitive_level: number | null;
  min_cognitive_level: number | null;
  max_cognitive_level: number | null;
  auto_detect_region: boolean | null;
  default_region_code: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProfileTaxonomy {
  id: string;
  profile_code: string;
  taxonomy_code: string;
  access_type: "include" | "exclude";
  created_at: string | null;
}

interface GlobalTaxonomy {
  id: string;
  code: string;
  name: string;
  level: number;
  color: string | null;
}

// Constantes
const MAIEUTIC_LEVELS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

const ADAPTATION_SPEEDS = [
  { value: "slow", label: "Lento" },
  { value: "medium", label: "Médio" },
  { value: "fast", label: "Rápido" },
];

const BRAZILIAN_REGIONS = [
  { value: "N", label: "Norte" },
  { value: "NE", label: "Nordeste" },
  { value: "CO", label: "Centro-Oeste" },
  { value: "SE", label: "Sudeste" },
  { value: "S", label: "Sul" },
];

// Função para gerar slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s]/g, "") // Remove caracteres especiais
    .replace(/\s+/g, "_") // Espaços → underscores
    .replace(/_+/g, "_") // Múltiplos underscores → um
    .replace(/^_|_$/g, ""); // Remove underscores no início/fim
};

// Formulário inicial vazio
const EMPTY_FORM: Partial<ContentProfile> = {
  name: "",
  code: "",
  description: "",
  color: "#00D4FF",
  is_active: true,
  is_default: false,
  prompt_template: "",
  antiprompt: "",
  match_threshold: 0.15,
  match_count: 5,
  maieutic_enabled: true,
  adaptation_speed: "medium",
  initial_cognitive_level: 5,
  min_cognitive_level: 1,
  max_cognitive_level: 10,
  auto_detect_region: true,
  default_region_code: null,
};

export const ContentProfilesTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ContentProfile | null>(null);
  const [formData, setFormData] = useState<Partial<ContentProfile>>(EMPTY_FORM);
  const [activeFormTab, setActiveFormTab] = useState("general");
  
  // Estados de taxonomias
  const [profileTaxonomies, setProfileTaxonomies] = useState<ProfileTaxonomy[]>([]);
  const [selectedTaxonomyToAdd, setSelectedTaxonomyToAdd] = useState<string>("");
  const [taxonomyAccessType, setTaxonomyAccessType] = useState<"include" | "exclude">("include");

  // Query: Buscar perfis
  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ["content-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("context_profiles")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as ContentProfile[];
    },
  });

  // Query: Buscar taxonomias globais
  const { data: globalTaxonomies = [] } = useQuery({
    queryKey: ["global-taxonomies-for-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_taxonomy")
        .select("id, code, name, level, color")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data as GlobalTaxonomy[];
    },
  });

  // Query: Buscar taxonomias do perfil selecionado
  const { data: selectedProfileTaxonomies = [], refetch: refetchTaxonomies } = useQuery({
    queryKey: ["profile-taxonomies", selectedProfile?.code],
    queryFn: async () => {
      if (!selectedProfile?.code) return [];

      const { data, error } = await supabaseUntyped
        .from("profile_taxonomies")
        .select("*")
        .eq("profile_code", selectedProfile.code);

      if (error) throw error;
      return data as ProfileTaxonomy[];
    },
    enabled: !!selectedProfile?.code,
  });

  // Atualizar taxonomias locais quando mudar
  useEffect(() => {
    setProfileTaxonomies(selectedProfileTaxonomies);
  }, [selectedProfileTaxonomies]);

  // Mutation: Criar perfil
  const createMutation = useMutation({
    mutationFn: async (data: Partial<ContentProfile>) => {
      const { error } = await supabase
        .from("context_profiles")
        .insert([{
          code: data.code,
          name: data.name,
          description: data.description,
          color: data.color,
          is_active: data.is_active,
          is_default: data.is_default,
          prompt_template: data.prompt_template || "",
          antiprompt: data.antiprompt,
          match_threshold: data.match_threshold,
          match_count: data.match_count,
          maieutic_enabled: data.maieutic_enabled,
          adaptation_speed: data.adaptation_speed,
          initial_cognitive_level: data.initial_cognitive_level,
          min_cognitive_level: data.min_cognitive_level,
          max_cognitive_level: data.max_cognitive_level,
          auto_detect_region: data.auto_detect_region,
          default_region_code: data.default_region_code,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-profiles"] });
      toast({ title: "Perfil criado com sucesso!" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar perfil", description: error.message, variant: "destructive" });
    },
  });

  // Mutation: Atualizar perfil
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ContentProfile>) => {
      const { error } = await supabase
        .from("context_profiles")
        .update({
          name: data.name,
          description: data.description,
          color: data.color,
          is_active: data.is_active,
          is_default: data.is_default,
          prompt_template: data.prompt_template,
          antiprompt: data.antiprompt,
          match_threshold: data.match_threshold,
          match_count: data.match_count,
          maieutic_enabled: data.maieutic_enabled,
          adaptation_speed: data.adaptation_speed,
          initial_cognitive_level: data.initial_cognitive_level,
          min_cognitive_level: data.min_cognitive_level,
          max_cognitive_level: data.max_cognitive_level,
          auto_detect_region: data.auto_detect_region,
          default_region_code: data.default_region_code,
        })
        .eq("id", selectedProfile?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-profiles"] });
      toast({ title: "Perfil atualizado com sucesso!" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar perfil", description: error.message, variant: "destructive" });
    },
  });

  // Mutation: Excluir perfil
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro, excluir taxonomias associadas
      await supabase
        .from("profile_taxonomies")
        .delete()
        .eq("profile_code", selectedProfile?.code);

      // Depois, excluir o perfil
      const { error } = await supabase
        .from("context_profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-profiles"] });
      toast({ title: "Perfil excluído com sucesso!" });
      setIsDeleteDialogOpen(false);
      setSelectedProfile(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir perfil", description: error.message, variant: "destructive" });
    },
  });

  // Mutation: Adicionar taxonomia ao perfil
  const addTaxonomyMutation = useMutation({
    mutationFn: async ({ profileCode, taxonomyCode, accessType }: { profileCode: string; taxonomyCode: string; accessType: "include" | "exclude" }) => {
      const { error } = await supabase
        .from("profile_taxonomies")
        .insert([{ profile_code: profileCode, taxonomy_code: taxonomyCode, access_type: accessType }]);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchTaxonomies();
      setSelectedTaxonomyToAdd("");
      toast({ title: "Taxonomia adicionada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao adicionar taxonomia", description: error.message, variant: "destructive" });
    },
  });

  // Mutation: Remover taxonomia do perfil
  const removeTaxonomyMutation = useMutation({
    mutationFn: async (taxonomyId: string) => {
      const { error } = await supabase
        .from("profile_taxonomies")
        .delete()
        .eq("id", taxonomyId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchTaxonomies();
      toast({ title: "Taxonomia removida!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover taxonomia", description: error.message, variant: "destructive" });
    },
  });

  // Handlers
  const handleOpenCreate = () => {
    setSelectedProfile(null);
    setFormData(EMPTY_FORM);
    setProfileTaxonomies([]);
    setActiveFormTab("general");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (profile: ContentProfile) => {
    setSelectedProfile(profile);
    setFormData({ ...profile });
    setActiveFormTab("general");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedProfile(null);
    setFormData(EMPTY_FORM);
    setProfileTaxonomies([]);
  };

  const handleSave = () => {
    if (!formData.name?.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    if (selectedProfile) {
      updateMutation.mutate(formData);
    } else {
      // Gerar slug automaticamente para novos perfis
      const slug = generateSlug(formData.name);
      createMutation.mutate({ ...formData, code: slug });
    }
  };

  const handleAddTaxonomy = () => {
    if (!selectedTaxonomyToAdd || !selectedProfile?.code) return;
    
    addTaxonomyMutation.mutate({
      profileCode: selectedProfile.code,
      taxonomyCode: selectedTaxonomyToAdd,
      accessType: taxonomyAccessType,
    });
  };

  // Filtrar taxonomias já adicionadas
  const availableTaxonomies = useMemo(() => {
    const addedCodes = profileTaxonomies.map(pt => pt.taxonomy_code);
    return globalTaxonomies.filter(t => !addedCodes.includes(t.code));
  }, [globalTaxonomies, profileTaxonomies]);

  // Separar taxonomias incluídas e excluídas
  const includedTaxonomies = profileTaxonomies.filter(pt => pt.access_type === "include");
  const excludedTaxonomies = profileTaxonomies.filter(pt => pt.access_type === "exclude");

  // Helper para obter nome da taxonomia
  const getTaxonomyName = (code: string) => {
    return globalTaxonomies.find(t => t.code === code)?.name || code;
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <AdminTitleWithInfo
            title="Perfis de Conteúdo"
            level="h2"
            icon={Layers}
            tooltipText="Clique para saber mais sobre perfis de conteúdo"
            infoContent={
              <div className="space-y-2">
                <p>
                  <strong>Perfis de Conteúdo</strong> definem COMO a IA se comporta em diferentes contextos de conversa.
                </p>
                <p>
                  Cada perfil configura parâmetros como:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Prompt base do sistema</li>
                  <li>Nível maiêutico (intensidade de questionamento)</li>
                  <li>Adaptação cognitiva (velocidade e limites)</li>
                  <li>Taxonomias incluídas/excluídas</li>
                  <li>Parâmetros de RAG (threshold e match count)</li>
                </ul>
              </div>
            }
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Perfil
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum perfil encontrado</p>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro perfil de conteúdo para começar
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Perfil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <Card
              key={profile.id}
              className="relative overflow-hidden"
              style={{ borderLeftWidth: "4px", borderLeftColor: profile.color || "#00D4FF" }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: profile.color || "#00D4FF" }}
                    />
                    <CardTitle className="text-base">{profile.name}</CardTitle>
                  </div>
                  <Badge variant={profile.is_active ? "default" : "secondary"}>
                    {profile.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {profile.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    Maiêutico: {profile.maieutic_enabled ? "Sim" : "Não"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Nível: {profile.initial_cognitive_level || 5}
                  </Badge>
                  {profile.is_default && (
                    <Badge className="text-xs bg-amber-500/20 text-amber-600 border-amber-500/30">
                      Padrão
                    </Badge>
                  )}
                </div>
                <code className="block text-xs bg-muted px-2 py-1 rounded font-mono">
                  {profile.code}
                </code>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenEdit(profile)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedProfile(profile);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Edição/Criação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProfile ? "Editar Perfil" : "Novo Perfil"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="taxonomies" disabled={!selectedProfile}>Taxonomias</TabsTrigger>
              <TabsTrigger value="rag">RAG</TabsTrigger>
              <TabsTrigger value="adaptation">Adaptação</TabsTrigger>
            </TabsList>

            {/* Aba Geral */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({
                        ...formData,
                        name,
                        code: selectedProfile ? formData.code : generateSlug(name),
                      });
                    }}
                    placeholder="Ex: Saúde Preventiva"
                  />
                  {!selectedProfile && formData.name && (
                    <p className="text-xs text-muted-foreground">
                      Slug: <code className="bg-muted px-1 rounded">{generateSlug(formData.name || "")}</code>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="color"
                      value={formData.color || "#00D4FF"}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.color || "#00D4FF"}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#00D4FF"
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o propósito deste perfil..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt_template">System Prompt</Label>
                <Textarea
                  id="prompt_template"
                  value={formData.prompt_template || ""}
                  onChange={(e) => setFormData({ ...formData, prompt_template: e.target.value })}
                  placeholder="Instruções base para a IA quando este perfil estiver ativo..."
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="antiprompt">Mensagem de Rejeição</Label>
                <Textarea
                  id="antiprompt"
                  value={formData.antiprompt || ""}
                  onChange={(e) => setFormData({ ...formData, antiprompt: e.target.value })}
                  placeholder="Mensagem quando o assunto está fora do escopo..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Ativo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </TabsContent>

            {/* Aba Taxonomias */}
            <TabsContent value="taxonomies" className="space-y-4 mt-4">
              {!selectedProfile ? (
                <p className="text-center text-muted-foreground py-8">
                  Salve o perfil primeiro para gerenciar taxonomias
                </p>
              ) : (
                <>
                  {/* Adicionar Taxonomia */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Adicionar Taxonomia</Label>
                      <Select value={selectedTaxonomyToAdd} onValueChange={setSelectedTaxonomyToAdd}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma taxonomia..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTaxonomies.map((t) => (
                            <SelectItem key={t.id} value={t.code}>
                              {t.name} ({t.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={taxonomyAccessType} onValueChange={(v) => setTaxonomyAccessType(v as "include" | "exclude")}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="include">Incluir</SelectItem>
                          <SelectItem value="exclude">Excluir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleAddTaxonomy}
                      disabled={!selectedTaxonomyToAdd || addTaxonomyMutation.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Lista de Taxonomias Incluídas */}
                  <div className="space-y-2">
                    <Label className="text-green-600">Taxonomias Incluídas ({includedTaxonomies.length})</Label>
                    <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-3">
                      {includedTaxonomies.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Nenhuma taxonomia incluída
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {includedTaxonomies.map((pt) => (
                            <Badge
                              key={pt.id}
                              variant="outline"
                              className="bg-green-500/10 border-green-500/30 text-green-600 pr-1"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              {getTaxonomyName(pt.taxonomy_code)}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 ml-1 hover:bg-red-500/20"
                                onClick={() => removeTaxonomyMutation.mutate(pt.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lista de Taxonomias Excluídas */}
                  <div className="space-y-2">
                    <Label className="text-red-600">Taxonomias Excluídas ({excludedTaxonomies.length})</Label>
                    <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-3">
                      {excludedTaxonomies.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Nenhuma taxonomia excluída
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {excludedTaxonomies.map((pt) => (
                            <Badge
                              key={pt.id}
                              variant="outline"
                              className="bg-red-500/10 border-red-500/30 text-red-600 pr-1"
                            >
                              <X className="h-3 w-3 mr-1" />
                              {getTaxonomyName(pt.taxonomy_code)}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 ml-1 hover:bg-red-500/20"
                                onClick={() => removeTaxonomyMutation.mutate(pt.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Aba RAG */}
            <TabsContent value="rag" className="space-y-6 mt-4">
              <div className="space-y-4">
                <Label>Match Threshold: {formData.match_threshold?.toFixed(2)}</Label>
                <Slider
                  value={[formData.match_threshold || 0.15]}
                  min={0.05}
                  max={0.5}
                  step={0.01}
                  onValueChange={([value]) => setFormData({ ...formData, match_threshold: value })}
                />
                <p className="text-xs text-muted-foreground">
                  Similaridade mínima para considerar um documento relevante (0.05 = muito permissivo, 0.5 = muito restritivo)
                </p>
              </div>

              <div className="space-y-4">
                <Label>Match Count: {formData.match_count}</Label>
                <Slider
                  value={[formData.match_count || 5]}
                  min={1}
                  max={30}
                  step={1}
                  onValueChange={([value]) => setFormData({ ...formData, match_count: value })}
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade máxima de documentos retornados na busca semântica
                </p>
              </div>
            </TabsContent>

            {/* Aba Adaptação */}
            <TabsContent value="adaptation" className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nível Maiêutico</Label>
                  <Select
                    value={formData.maieutic_enabled ? "media" : "baixa"}
                    onValueChange={(v) => setFormData({ ...formData, maieutic_enabled: v !== "baixa" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAIEUTIC_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Velocidade de Adaptação</Label>
                  <Select
                    value={formData.adaptation_speed || "medium"}
                    onValueChange={(v) => setFormData({ ...formData, adaptation_speed: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADAPTATION_SPEEDS.map((speed) => (
                        <SelectItem key={speed.value} value={speed.value}>
                          {speed.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Nível Cognitivo Inicial: {formData.initial_cognitive_level}</Label>
                <Slider
                  value={[formData.initial_cognitive_level || 5]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={([value]) => setFormData({ ...formData, initial_cognitive_level: value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Label>Nível Mínimo: {formData.min_cognitive_level}</Label>
                  <Slider
                    value={[formData.min_cognitive_level || 1]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={([value]) => setFormData({ ...formData, min_cognitive_level: value })}
                  />
                </div>

                <div className="space-y-4">
                  <Label>Nível Máximo: {formData.max_cognitive_level}</Label>
                  <Slider
                    value={[formData.max_cognitive_level || 10]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={([value]) => setFormData({ ...formData, max_cognitive_level: value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto_detect_region">Detectar Região Automaticamente</Label>
                  <p className="text-xs text-muted-foreground">
                    Usa geolocalização para adaptar a linguagem
                  </p>
                </div>
                <Switch
                  id="auto_detect_region"
                  checked={formData.auto_detect_region ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_detect_region: checked })}
                />
              </div>

              {!formData.auto_detect_region && (
                <div className="space-y-2">
                  <Label>Região Padrão</Label>
                  <Select
                    value={formData.default_region_code || ""}
                    onValueChange={(v) => setFormData({ ...formData, default_region_code: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma região..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_REGIONS.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedProfile ? "Salvar Alterações" : "Criar Perfil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o perfil <strong>"{selectedProfile?.name}"</strong>?
              <br />
              Esta ação não pode ser desfeita e todas as taxonomias associadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedProfile && deleteMutation.mutate(selectedProfile.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContentProfilesTab;
