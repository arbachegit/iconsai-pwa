import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { Layout, Edit2, ChevronDown, ChevronUp, Save, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseUntyped } from "@/integrations/supabase/typed-client";
import { useToast } from "@/hooks/use-toast";

interface SectionContent {
  id: string;
  section_id: string;
  header: string | null;
  title: string;
  content: string;
}

export const ContentManagementTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "", finalMessage: "" });

  const { data: sections, refetch } = useQuery({
    queryKey: ["section-contents"],
    queryFn: async () => {
      const { data, error } = await supabaseUntyped
        .from("section_contents")
        .select("*")
        .order("section_id");
      if (error) throw error;
      return data as SectionContent[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; content: string; header: string }) => {
      const { error } = await supabaseUntyped
        .from("section_contents")
        .update({
          title: data.title,
          content: data.content,
          header: data.header,
          updated_at: new Date().toISOString()
        })
        .eq("id", data.id);
      if (error) throw error;

      // Create version entry
      const section = sections?.find(s => s.id === data.id);
      if (section) {
        const { data: lastVersion } = await supabaseUntyped
          .from("section_content_versions")
          .select("version_number")
          .eq("section_id", section.section_id)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        await supabaseUntyped
          .from("section_content_versions")
          .insert({
            section_id: section.section_id,
            header: data.header,
            title: data.title,
            content: data.content,
            version_number: ((lastVersion as any)?.version_number || 0) + 1,
            change_description: "Atualização manual via ContentManagementTab"
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["section-contents"] });
      queryClient.invalidateQueries({ queryKey: ["section-versions"] });
      toast({
        title: "Salvo com sucesso",
        description: "Conteúdo da seção foi atualizado.",
      });
      setEditingId(null);
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o conteúdo da seção.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (section: SectionContent) => {
    setEditingId(section.id);
    setEditForm({ 
      title: section.title,
      content: section.content,
      finalMessage: section.header || ""
    });
  };

  const handleSave = async (id: string) => {
    await saveMutation.mutateAsync({
      id,
      title: editForm.title,
      content: editForm.content,
      header: editForm.finalMessage
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ title: "", content: "", finalMessage: "" });
  };

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo 
        title="Seções Landing Page"
        level="h1"
        icon={Layout}
        tooltipText="Edite o conteúdo das seções principais"
        infoContent={
          <>
            <p>Gerencie o conteúdo textual das 8 seções principais da landing page.</p>
            <p className="mt-2">Edite TÍTULO, CONTEÚDO e MENSAGEM FINAL de cada seção.</p>
          </>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            <CardTitle>Seções do Landing Page</CardTitle>
          </div>
          <CardDescription>
            Gerencie o conteúdo das 8 seções principais do site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sections?.map((section) => (
              <Card
                key={section.id}
                className="p-6 bg-card/50 backdrop-blur-sm border-primary/20"
              >
                {/* Cabeçalho sempre visível */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">
                      {section.section_id}
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {section.title}
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2 border-blue-400/60 hover:bg-blue-500/20"
                    onClick={() => editingId === section.id ? handleCancel() : handleEdit(section)}
                  >
                    {editingId === section.id ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Fechar
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </>
                    )}
                  </Button>
                </div>

                {/* Conteúdo (visualização) */}
                {editingId !== section.id && (
                  <p className="text-muted-foreground line-clamp-3">
                    {section.content}
                  </p>
                )}

                {/* Modo de Edição Colapsável */}
                <Collapsible open={editingId === section.id}>
                  <CollapsibleContent className="animate-accordion-down">
                    <div className="space-y-4 mt-4 pt-4 border-t border-primary/20">
                      {/* Campo TÍTULO */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          TÍTULO
                        </Label>
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          placeholder="Título da seção"
                          className="bg-blue-50/10 border-2 border-blue-400/60 focus:border-blue-500"
                        />
                      </div>

                      {/* Campo CONTEÚDO */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          CONTEÚDO
                        </Label>
                        <Textarea
                          value={editForm.content}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                          rows={8}
                          placeholder="Conteúdo completo da seção"
                          className="bg-blue-50/10 border-2 border-blue-400/60 focus:border-blue-500 resize-none"
                        />
                      </div>

                      {/* Campo MENSAGEM FINAL */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          MENSAGEM FINAL
                        </Label>
                        <Input
                          value={editForm.finalMessage}
                          onChange={(e) => setEditForm({ ...editForm, finalMessage: e.target.value })}
                          placeholder="Frase de conclusão (opcional)"
                          className="bg-blue-50/10 border-2 border-blue-400/60 focus:border-blue-500"
                        />
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSave(section.id)}
                          className="gap-2"
                          disabled={saveMutation.isPending}
                        >
                          <Save className="w-4 h-4" />
                          {saveMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button variant="ghost" onClick={handleCancel} className="gap-2">
                          <X className="w-4 h-4" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};