import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, 
  Volume2, 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  RefreshCw,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { CSVImportButton, lexiconImportConfig, regionalPhoneticsImportConfig } from "./csv-import";

// Domain options for lexicon terms
const DOMAIN_OPTIONS = [
  { value: "economia", label: "Economia", color: "bg-emerald-500" },
  { value: "saude", label: "Saúde", color: "bg-blue-500" },
  { value: "educacao", label: "Educação", color: "bg-purple-500" },
  { value: "geral", label: "Geral", color: "bg-gray-500" },
];

interface LexiconTerm {
  id: string;
  term: string;
  term_normalized: string;
  definition: string;
  definition_simple: string | null;
  pronunciation_ipa: string | null;
  pronunciation_phonetic: string | null;
  domain: string[] | null;
  synonyms: string[] | null;
  is_approved: boolean;
  created_at: string;
}

interface RegionalToneRule {
  id: string;
  region_code: string;
  region_name: string;
  preferred_terms: Record<string, string>;
  is_active: boolean;
}

interface TermFormData {
  term: string;
  definition: string;
  definition_simple: string;
  pronunciation_ipa: string;
  pronunciation_phonetic: string;
  synonyms: string;
  domain: string[];
}

interface PronunciationFormData {
  region_id: string;
  term: string;
  pronunciation: string;
}

const initialTermForm: TermFormData = {
  term: "",
  definition: "",
  definition_simple: "",
  pronunciation_ipa: "",
  pronunciation_phonetic: "",
  synonyms: "",
  domain: [],
};

const initialPronunciationForm: PronunciationFormData = {
  region_id: "",
  term: "",
  pronunciation: "",
};

export const LexiconPhoneticsTab = () => {
  const queryClient = useQueryClient();
  
  // Filter states
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [pronunciationDialogOpen, setPronunciationDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Form states
  const [termForm, setTermForm] = useState<TermFormData>(initialTermForm);
  const [pronunciationForm, setPronunciationForm] = useState<PronunciationFormData>(initialPronunciationForm);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editingPronunciation, setEditingPronunciation] = useState<{ regionId: string; term: string } | null>(null);
  const [deletingTermId, setDeletingTermId] = useState<string | null>(null);
  
  // Collapsible states for regions
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

  // Fetch lexicon terms
  const { data: terms = [], isLoading: termsLoading, refetch: refetchTerms } = useQuery({
    queryKey: ["lexicon-terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lexicon_terms")
        .select("*")
        .order("term", { ascending: true });
      
      if (error) throw error;
      return data as LexiconTerm[];
    },
  });

  // Fetch regional tone rules
  const { data: regions = [], isLoading: regionsLoading, refetch: refetchRegions } = useQuery({
    queryKey: ["regional-tone-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regional_tone_rules")
        .select("id, region_code, region_name, preferred_terms, is_active")
        .eq("is_active", true)
        .order("region_name", { ascending: true });
      
      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        preferred_terms: (r.preferred_terms as Record<string, string>) || {},
      })) as RegionalToneRule[];
    },
  });

  // Filtered terms
  const filteredTerms = useMemo(() => {
    let filtered = terms;
    
    if (domainFilter !== "all") {
      filtered = filtered.filter(t => t.domain?.includes(domainFilter));
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.term.toLowerCase().includes(search) ||
        t.definition.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [terms, domainFilter, searchTerm]);

  // Create/Update term mutation
  const termMutation = useMutation({
    mutationFn: async (data: TermFormData & { id?: string }) => {
      const termData = {
        term: data.term,
        term_normalized: data.term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        definition: data.definition,
        definition_simple: data.definition_simple || null,
        pronunciation_ipa: data.pronunciation_ipa || null,
        pronunciation_phonetic: data.pronunciation_phonetic || null,
        synonyms: data.synonyms ? data.synonyms.split(",").map(s => s.trim()).filter(Boolean) : null,
        domain: data.domain.length > 0 ? data.domain : null,
        is_approved: true,
      };

      if (data.id) {
        const { error } = await supabase
          .from("lexicon_terms")
          .update(termData)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("lexicon_terms")
          .insert(termData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lexicon-terms"] });
      setTermDialogOpen(false);
      setTermForm(initialTermForm);
      setEditingTermId(null);
      toast.success(editingTermId ? "Termo atualizado!" : "Termo criado!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Delete term mutation
  const deleteTermMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lexicon_terms")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lexicon-terms"] });
      setDeleteDialogOpen(false);
      setDeletingTermId(null);
      toast.success("Termo excluído!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  // Update regional pronunciation mutation
  const pronunciationMutation = useMutation({
    mutationFn: async (data: PronunciationFormData) => {
      const region = regions.find(r => r.id === data.region_id);
      if (!region) throw new Error("Região não encontrada");

      const updatedTerms = {
        ...region.preferred_terms,
        [data.term]: data.pronunciation,
      };

      const { error } = await supabase
        .from("regional_tone_rules")
        .update({ preferred_terms: updatedTerms })
        .eq("id", data.region_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regional-tone-rules"] });
      setPronunciationDialogOpen(false);
      setPronunciationForm(initialPronunciationForm);
      setEditingPronunciation(null);
      toast.success("Pronúncia salva!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Delete pronunciation
  const deletePronunciation = async (regionId: string, term: string) => {
    const region = regions.find(r => r.id === regionId);
    if (!region) return;

    const updatedTerms = { ...region.preferred_terms };
    delete updatedTerms[term];

    const { error } = await supabase
      .from("regional_tone_rules")
      .update({ preferred_terms: updatedTerms })
      .eq("id", regionId);

    if (error) {
      toast.error(`Erro ao excluir pronúncia: ${error.message}`);
    } else {
      queryClient.invalidateQueries({ queryKey: ["regional-tone-rules"] });
      toast.success("Pronúncia excluída!");
    }
  };

  // Handlers
  const handleEditTerm = (term: LexiconTerm) => {
    setTermForm({
      term: term.term,
      definition: term.definition,
      definition_simple: term.definition_simple || "",
      pronunciation_ipa: term.pronunciation_ipa || "",
      pronunciation_phonetic: term.pronunciation_phonetic || "",
      synonyms: term.synonyms?.join(", ") || "",
      domain: term.domain || [],
    });
    setEditingTermId(term.id);
    setTermDialogOpen(true);
  };

  const handleNewTerm = () => {
    setTermForm(initialTermForm);
    setEditingTermId(null);
    setTermDialogOpen(true);
  };

  const handleDeleteTerm = (id: string) => {
    setDeletingTermId(id);
    setDeleteDialogOpen(true);
  };

  const handleEditPronunciation = (regionId: string, term: string, pronunciation: string) => {
    setPronunciationForm({
      region_id: regionId,
      term,
      pronunciation,
    });
    setEditingPronunciation({ regionId, term });
    setPronunciationDialogOpen(true);
  };

  const handleNewPronunciation = (regionId?: string) => {
    setPronunciationForm({
      region_id: regionId || "",
      term: "",
      pronunciation: "",
    });
    setEditingPronunciation(null);
    setPronunciationDialogOpen(true);
  };

  const toggleRegion = (regionId: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      return next;
    });
  };

  const getDomainBadge = (domain: string) => {
    const option = DOMAIN_OPTIONS.find(d => d.value === domain);
    return option ? (
      <Badge key={domain} className={`${option.color} text-white text-xs`}>
        {option.label}
      </Badge>
    ) : null;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const isLoading = termsLoading || regionsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 p-4 rounded-lg border border-amber-500/30">
        <div className="flex items-center justify-between">
          <AdminTitleWithInfo
            title="Léxico & Fonética (TTS)"
            level="h2"
            icon={Volume2}
            tooltipText="Gerenciar dicionário de termos e pronúncias TTS"
            infoContent={
              <div className="space-y-3">
                <p><strong>Léxico</strong> é o dicionário de termos técnicos com definições para uso da IA.</p>
                <p><strong>Fonética TTS</strong> define como o sintetizador de voz pronuncia cada termo por região.</p>
                <p><strong>IPA</strong> (International Phonetic Alphabet) é o padrão internacional de transcrição fonética.</p>
              </div>
            }
            className="[&_svg]:text-amber-500"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchTerms(); refetchRegions(); }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Card 1: Léxico (Dicionário de Termos) */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="bg-gradient-to-r from-amber-600/10 to-orange-600/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-500" />
              <CardTitle>Dicionário de Termos</CardTitle>
              <Badge variant="secondary">{filteredTerms.length} termos</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Domínio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {DOMAIN_OPTIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar termo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[180px]"
                />
              </div>
              <CSVImportButton
                config={lexiconImportConfig}
                buttonVariant="outline"
                onSuccess={() => refetchTerms()}
              />
              <Button onClick={handleNewTerm} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="h-4 w-4 mr-2" />
                Novo Termo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Termo</TableHead>
                  <TableHead className="max-w-[200px]">Definição</TableHead>
                  <TableHead className="max-w-[150px]">Def. Simples</TableHead>
                  <TableHead>Fonética IPA</TableHead>
                  <TableHead>Domínio</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {termsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredTerms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum termo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTerms.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell className="font-medium">{term.term}</TableCell>
                      <TableCell className="max-w-[200px]" title={term.definition}>
                        {truncateText(term.definition, 50)}
                      </TableCell>
                      <TableCell className="max-w-[150px]" title={term.definition_simple || ""}>
                        {term.definition_simple ? truncateText(term.definition_simple, 40) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {term.pronunciation_ipa || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {term.domain?.map(d => getDomainBadge(d)) || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTerm(term)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTerm(term.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Pronúncias Regionais */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="bg-gradient-to-r from-orange-600/10 to-red-600/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-orange-500" />
              <CardTitle>Fonética por Região (TTS)</CardTitle>
            </div>
            <CSVImportButton
              config={regionalPhoneticsImportConfig}
              buttonVariant="outline"
              buttonSize="sm"
              onSuccess={() => refetchRegions()}
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleNewPronunciation()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pronúncia
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {regionsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : regions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma região configurada
            </p>
          ) : (
            <div className="space-y-2">
              {regions.map((region) => {
                const pronunciationCount = Object.keys(region.preferred_terms).length;
                const isExpanded = expandedRegions.has(region.id);
                
                return (
                  <Collapsible key={region.id} open={isExpanded}>
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <button
                          onClick={() => toggleRegion(region.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">{region.region_name}</span>
                            <Badge variant="secondary">
                              {pronunciationCount} {pronunciationCount === 1 ? "pronúncia" : "pronúncias"}
                            </Badge>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t p-3">
                          {pronunciationCount === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhuma pronúncia configurada para esta região
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Termo</TableHead>
                                  <TableHead>Pronúncia</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.entries(region.preferred_terms).map(([term, pronunciation]) => (
                                  <TableRow key={term}>
                                    <TableCell className="font-mono">{term}</TableCell>
                                    <TableCell>{pronunciation}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditPronunciation(region.id, term, pronunciation)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => deletePronunciation(region.id, term)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                          <div className="mt-3 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNewPronunciation(region.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Pronúncia
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Editar/Criar Termo */}
      <Dialog open={termDialogOpen} onOpenChange={setTermDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTermId ? "Editar Termo" : "Novo Termo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="term">Termo *</Label>
              <Input
                id="term"
                value={termForm.term}
                onChange={(e) => setTermForm({ ...termForm, term: e.target.value })}
                placeholder="Ex: SELIC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="definition">Definição *</Label>
              <Textarea
                id="definition"
                value={termForm.definition}
                onChange={(e) => setTermForm({ ...termForm, definition: e.target.value })}
                placeholder="Definição técnica do termo"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="definition_simple">Definição Simples</Label>
              <Textarea
                id="definition_simple"
                value={termForm.definition_simple}
                onChange={(e) => setTermForm({ ...termForm, definition_simple: e.target.value })}
                placeholder="Explicação em linguagem acessível"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pronunciation_ipa">Fonética IPA</Label>
                <Input
                  id="pronunciation_ipa"
                  value={termForm.pronunciation_ipa}
                  onChange={(e) => setTermForm({ ...termForm, pronunciation_ipa: e.target.value })}
                  placeholder="/ˈsɛlɪk/"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pronunciation_phonetic">Pronúncia</Label>
                <Input
                  id="pronunciation_phonetic"
                  value={termForm.pronunciation_phonetic}
                  onChange={(e) => setTermForm({ ...termForm, pronunciation_phonetic: e.target.value })}
                  placeholder="SÉ-lik"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="synonyms">Sinônimos (separados por vírgula)</Label>
              <Input
                id="synonyms"
                value={termForm.synonyms}
                onChange={(e) => setTermForm({ ...termForm, synonyms: e.target.value })}
                placeholder="taxa básica, juros básicos"
              />
            </div>
            <div className="space-y-2">
              <Label>Domínio</Label>
              <div className="flex flex-wrap gap-2">
                {DOMAIN_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={termForm.domain.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newDomains = termForm.domain.includes(option.value)
                        ? termForm.domain.filter(d => d !== option.value)
                        : [...termForm.domain, option.value];
                      setTermForm({ ...termForm, domain: newDomains });
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTermDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => termMutation.mutate({ ...termForm, id: editingTermId || undefined })}
              disabled={!termForm.term || !termForm.definition || termMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {termMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Adicionar/Editar Pronúncia */}
      <Dialog open={pronunciationDialogOpen} onOpenChange={setPronunciationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPronunciation ? "Editar Pronúncia" : "Adicionar Pronúncia"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="region">Região *</Label>
              <Select
                value={pronunciationForm.region_id}
                onValueChange={(value) => setPronunciationForm({ ...pronunciationForm, region_id: value })}
                disabled={!!editingPronunciation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a região" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.region_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pron_term">Termo *</Label>
              <Input
                id="pron_term"
                value={pronunciationForm.term}
                onChange={(e) => setPronunciationForm({ ...pronunciationForm, term: e.target.value })}
                placeholder="Ex: IPCA"
                disabled={!!editingPronunciation}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pronunciation">Pronúncia *</Label>
              <Input
                id="pronunciation"
                value={pronunciationForm.pronunciation}
                onChange={(e) => setPronunciationForm({ ...pronunciationForm, pronunciation: e.target.value })}
                placeholder="Ex: í-pê-cê-á"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPronunciationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => pronunciationMutation.mutate(pronunciationForm)}
              disabled={!pronunciationForm.region_id || !pronunciationForm.term || !pronunciationForm.pronunciation || pronunciationMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {pronunciationMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog: Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este termo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTermId && deleteTermMutation.mutate(deletingTermId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTermMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LexiconPhoneticsTab;
