import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminTitleWithInfo } from "@/components/admin/AdminTitleWithInfo";
import { useToast } from "@/hooks/use-toast";
import {
  Network,
  Lightbulb,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { CSVImportButton, ontologyImportConfig, ontologyRelationsImportConfig } from "./csv-import";

interface OntologyConcept {
  id: string;
  name: string;
  name_normalized: string;
  description: string | null;
  taxonomy_id: string | null;
  properties: Record<string, unknown> | null;
  created_at: string;
  taxonomy_name?: string;
}

interface OntologyRelation {
  id: string;
  subject_id: string;
  predicate: string;
  object_id: string;
  weight: number | null;
  bidirectional: boolean | null;
  created_at: string;
  subject_name?: string;
  object_name?: string;
}

interface Taxonomy {
  id: string;
  name: string;
  code: string;
}

interface ConceptFormData {
  name: string;
  description: string;
  taxonomy_id: string;
  properties: string;
}

interface RelationFormData {
  subject_id: string;
  predicate: string;
  object_id: string;
  weight: number;
}

const RELATION_TYPES = [
  { value: "is_a", label: "é um tipo de", color: "bg-blue-500" },
  { value: "part_of", label: "é parte de", color: "bg-green-500" },
  { value: "causes", label: "causa", color: "bg-red-500" },
  { value: "measures", label: "mede", color: "bg-yellow-500" },
  { value: "influences", label: "influencia", color: "bg-violet-500" },
  { value: "related_to", label: "relacionado a", color: "bg-gray-500" },
];

const getPredicateInfo = (predicate: string) => {
  return RELATION_TYPES.find((r) => r.value === predicate) || RELATION_TYPES[5];
};

export function OntologyConceptsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States
  const [search, setSearch] = useState("");
  const [isConceptDialogOpen, setIsConceptDialogOpen] = useState(false);
  const [isRelationDialogOpen, setIsRelationDialogOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<OntologyConcept | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "concept" | "relation"; id: string } | null>(null);
  const [conceptForm, setConceptForm] = useState<ConceptFormData>({
    name: "",
    description: "",
    taxonomy_id: "",
    properties: "{}",
  });
  const [relationForm, setRelationForm] = useState<RelationFormData>({
    subject_id: "",
    predicate: "related_to",
    object_id: "",
    weight: 1.0,
  });

  // Queries
  const { data: concepts = [], isLoading: loadingConcepts } = useQuery({
    queryKey: ["ontology-concepts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ontology_concepts")
        .select(`*, global_taxonomy(name)`)
        .order("name", { ascending: true });

      if (error) throw error;

      return (data || []).map((c: Record<string, unknown>) => ({
        ...c,
        taxonomy_name: (c.global_taxonomy as { name?: string } | null)?.name || null,
      })) as OntologyConcept[];
    },
  });

  const { data: relations = [], isLoading: loadingRelations } = useQuery({
    queryKey: ["ontology-relations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ontology_relations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OntologyRelation[];
    },
  });

  const { data: taxonomies = [] } = useQuery({
    queryKey: ["taxonomies-for-ontology"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_taxonomy")
        .select("id, name, code")
        .order("name");

      if (error) throw error;
      return data as Taxonomy[];
    },
  });

  // Map concept names for relations
  const relationsWithNames = relations.map((rel) => ({
    ...rel,
    subject_name: concepts.find((c) => c.id === rel.subject_id)?.name || "?",
    object_name: concepts.find((c) => c.id === rel.object_id)?.name || "?",
  }));

  // Filter concepts
  const filteredConcepts = concepts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Mutations
  const createConceptMutation = useMutation({
    mutationFn: async (data: ConceptFormData) => {
      let props = null;
      try {
        props = JSON.parse(data.properties);
      } catch {
        props = {};
      }

      const { error } = await supabase.from("ontology_concepts").insert({
        name: data.name,
        name_normalized: data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        description: data.description || null,
        taxonomy_id: data.taxonomy_id || null,
        properties: props,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ontology-concepts"] });
      toast({ title: "Conceito criado com sucesso" });
      setIsConceptDialogOpen(false);
      resetConceptForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar conceito", description: error.message, variant: "destructive" });
    },
  });

  const updateConceptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ConceptFormData }) => {
      let props = null;
      try {
        props = JSON.parse(data.properties);
      } catch {
        props = {};
      }

      const { error } = await supabase
        .from("ontology_concepts")
        .update({
          name: data.name,
          name_normalized: data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          description: data.description || null,
          taxonomy_id: data.taxonomy_id || null,
          properties: props,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ontology-concepts"] });
      toast({ title: "Conceito atualizado com sucesso" });
      setIsConceptDialogOpen(false);
      setEditingConcept(null);
      resetConceptForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar conceito", description: error.message, variant: "destructive" });
    },
  });

  const deleteConceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ontology_concepts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ontology-concepts"] });
      queryClient.invalidateQueries({ queryKey: ["ontology-relations"] });
      toast({ title: "Conceito excluído com sucesso" });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir conceito", description: error.message, variant: "destructive" });
    },
  });

  const createRelationMutation = useMutation({
    mutationFn: async (data: RelationFormData) => {
      const { error } = await supabase.from("ontology_relations").insert({
        subject_id: data.subject_id,
        predicate: data.predicate,
        object_id: data.object_id,
        weight: data.weight,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ontology-relations"] });
      toast({ title: "Relação criada com sucesso" });
      setIsRelationDialogOpen(false);
      resetRelationForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar relação", description: error.message, variant: "destructive" });
    },
  });

  const deleteRelationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ontology_relations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ontology-relations"] });
      toast({ title: "Relação excluída com sucesso" });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir relação", description: error.message, variant: "destructive" });
    },
  });

  // Helpers
  const resetConceptForm = () => {
    setConceptForm({ name: "", description: "", taxonomy_id: "", properties: "{}" });
  };

  const resetRelationForm = () => {
    setRelationForm({ subject_id: "", predicate: "related_to", object_id: "", weight: 1.0 });
  };

  const openEditConcept = (concept: OntologyConcept) => {
    setEditingConcept(concept);
    setConceptForm({
      name: concept.name,
      description: concept.description || "",
      taxonomy_id: concept.taxonomy_id || "",
      properties: JSON.stringify(concept.properties || {}, null, 2),
    });
    setIsConceptDialogOpen(true);
  };

  const handleSaveConcept = () => {
    if (!conceptForm.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    if (editingConcept) {
      updateConceptMutation.mutate({ id: editingConcept.id, data: conceptForm });
    } else {
      createConceptMutation.mutate(conceptForm);
    }
  };

  const handleSaveRelation = () => {
    if (!relationForm.subject_id || !relationForm.object_id) {
      toast({ title: "Selecione os conceitos", variant: "destructive" });
      return;
    }

    if (relationForm.subject_id === relationForm.object_id) {
      toast({ title: "Conceitos devem ser diferentes", variant: "destructive" });
      return;
    }

    createRelationMutation.mutate(relationForm);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "concept") {
      deleteConceptMutation.mutate(deleteTarget.id);
    } else {
      deleteRelationMutation.mutate(deleteTarget.id);
    }
  };

  const truncate = (text: string | null, maxLength: number) => {
    if (!text) return "-";
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  const countProperties = (props: Record<string, unknown> | null) => {
    if (!props) return 0;
    return Object.keys(props).length;
  };

  const isSaving = createConceptMutation.isPending || updateConceptMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 p-4 rounded-lg border border-violet-500/30">
        <AdminTitleWithInfo
          title="Ontologia (Conceitos)"
          level="h2"
          icon={Network}
          className="[&_svg]:text-violet-500"
          tooltipText="Gerenciar relações semânticas entre conceitos"
          infoContent={
            <div className="space-y-2 text-sm">
              <p><strong>Ontologia</strong> define relações semânticas entre conceitos.</p>
              <p><strong>Conexões Inteligentes:</strong> Permite à IA fazer inferências.</p>
              <p><strong>Enriquecimento RAG:</strong> Usado para melhorar respostas contextuais.</p>
            </div>
          }
        />
        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className="border-violet-500/50">
            {concepts.length} conceitos
          </Badge>
          <Badge variant="outline" className="border-purple-500/50">
            {relations.length} relações
          </Badge>
        </div>
      </div>

      {/* Card 1: Conceitos */}
      <Card className="border-l-4 border-l-violet-500">
        <CardHeader className="bg-gradient-to-r from-violet-600/10 to-purple-600/10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-violet-500" />
              <CardTitle className="text-lg">Conceitos</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <CSVImportButton
                config={ontologyImportConfig}
                buttonVariant="outline"
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["ontology-concepts"] })}
              />
              <Button
                onClick={() => {
                  setEditingConcept(null);
                  resetConceptForm();
                  setIsConceptDialogOpen(true);
                }}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Conceito
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loadingConcepts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConcepts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Nenhum conceito encontrado" : "Nenhum conceito cadastrado"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Taxonomia</TableHead>
                  <TableHead className="text-center">Props</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConcepts.map((concept) => (
                  <TableRow key={concept.id}>
                    <TableCell className="font-medium">{concept.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {truncate(concept.description, 50)}
                    </TableCell>
                    <TableCell>
                      {concept.taxonomy_name ? (
                        <Badge variant="secondary">{concept.taxonomy_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {countProperties(concept.properties)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditConcept(concept)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget({ type: "concept", id: concept.id })}
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
        </CardContent>
      </Card>

      {/* Card 2: Relações Semânticas */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="bg-gradient-to-r from-purple-600/10 to-pink-600/10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-lg">Relações Semânticas</CardTitle>
            </div>
            <CSVImportButton
              config={ontologyRelationsImportConfig}
              buttonVariant="outline"
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["ontology-relations"] })}
            />
            <Button
              onClick={() => {
                resetRelationForm();
                setIsRelationDialogOpen(true);
              }}
              disabled={concepts.length < 2}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Relação
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loadingRelations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : relationsWithNames.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma relação cadastrada
            </div>
          ) : (
            <div className="space-y-2">
              {relationsWithNames.map((relation) => {
                const predicateInfo = getPredicateInfo(relation.predicate);
                return (
                  <div
                    key={relation.id}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30 flex-wrap"
                  >
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                      {relation.subject_name}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Badge className={`${predicateInfo.color} hover:opacity-90`}>
                      {predicateInfo.label}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Badge className="bg-green-500 hover:bg-green-600">
                      {relation.object_name}
                    </Badge>
                    {relation.weight && relation.weight !== 1.0 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({(relation.weight * 100).toFixed(0)}%)
                      </span>
                    )}
                    <div className="ml-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ type: "relation", id: relation.id })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Criar/Editar Conceito */}
      <Dialog open={isConceptDialogOpen} onOpenChange={setIsConceptDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingConcept ? "Editar Conceito" : "Novo Conceito"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={conceptForm.name}
                onChange={(e) => setConceptForm({ ...conceptForm, name: e.target.value })}
                placeholder="Ex: SELIC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={conceptForm.description}
                onChange={(e) => setConceptForm({ ...conceptForm, description: e.target.value })}
                placeholder="Descrição do conceito..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxonomy">Taxonomia Vinculada</Label>
              <Select
                value={conceptForm.taxonomy_id}
                onValueChange={(v) => setConceptForm({ ...conceptForm, taxonomy_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {taxonomies.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="properties">Propriedades (JSON)</Label>
              <Textarea
                id="properties"
                value={conceptForm.properties}
                onChange={(e) => setConceptForm({ ...conceptForm, properties: e.target.value })}
                placeholder='{"key": "value"}'
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConceptDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConcept} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingConcept ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Relação */}
      <Dialog open={isRelationDialogOpen} onOpenChange={setIsRelationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Relação Semântica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Conceito Origem</Label>
              <Select
                value={relationForm.subject_id}
                onValueChange={(v) => setRelationForm({ ...relationForm, subject_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {concepts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Relação</Label>
              <Select
                value={relationForm.predicate}
                onValueChange={(v) => setRelationForm({ ...relationForm, predicate: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conceito Destino</Label>
              <Select
                value={relationForm.object_id}
                onValueChange={(v) => setRelationForm({ ...relationForm, object_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {concepts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Peso: {(relationForm.weight * 100).toFixed(0)}%</Label>
              <Slider
                value={[relationForm.weight]}
                onValueChange={([v]) => setRelationForm({ ...relationForm, weight: v })}
                min={0.1}
                max={1.0}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRelationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRelation}
              disabled={createRelationMutation.isPending}
            >
              {createRelationMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar Exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "concept"
                ? "Excluir este conceito também removerá todas as relações associadas. Esta ação não pode ser desfeita."
                : "Esta relação será removida permanentemente. Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default OntologyConceptsTab;
