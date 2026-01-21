import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Edit2, Save, X, FileText, ChevronDown, Edit3, ChevronUp, Download, Upload, Eye, EyeOff, History, RotateCcw, GripVertical, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TooltipContent {
  id: string;
  section_id: string;
  header: string | null;
  title: string;
  content: string;
  audio_url: string | null;
  is_active: boolean;
  display_order: number;
}

interface SectionContent {
  id: string;
  section_id: string;
  header: string | null;
  title: string;
  content: string;
}

interface SectionVersion {
  id: string;
  section_id: string;
  header: string | null;
  title: string;
  content: string;
  version_number: number;
  change_description: string | null;
  created_at: string;
}

export const TooltipsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ header: "", title: "", content: "" });
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isTooltipsOpen, setIsTooltipsOpen] = useState(true);

  const { data: tooltips, refetch } = useQuery({
    queryKey: ["all-tooltips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tooltip_contents")
        .select("*")
        .order("section_id");

      if (error) throw error;
      return data as TooltipContent[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TooltipContent> }) => {
      const { data, error } = await supabase
        .from("tooltip_contents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tooltips"] });
      toast({
        title: "Sucesso!",
        description: "Tooltip atualizado com sucesso.",
      });
      setEditingId(null);
    },
    onError: (error) => {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar tooltip.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (tooltip: TooltipContent) => {
    setEditingId(tooltip.id);
    setEditForm({
      header: tooltip.header || "",
      title: tooltip.title,
      content: tooltip.content,
    });
  };

  const handleSave = (id: string) => {
    saveMutation.mutate({
      id,
      updates: editForm,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ header: "", title: "", content: "" });
  };

  return (
    <div className="space-y-8">
      <AdminTitleWithInfo
        title="Gestão de Tooltips e Conteúdo"
        level="h1"
        icon={Edit3}
        tooltipText="Sistema de gerenciamento de conteúdo"
        infoContent={
          <>
            <p>Gerencie tooltips, conteúdo de seções e histórico de versões.</p>
          </>
        }
      />

      {/* História da IA com Preview + Drag-and-Drop */}
      <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle>Explorar História da IA</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="gap-2"
            >
              {isHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isHistoryOpen ? "Colapsar" : "Expandir"}
            </Button>
          </div>
          <CardDescription>
            Gerencie os 14 eventos da timeline de evolução da IA
          </CardDescription>
        </CardHeader>
        <Collapsible open={isHistoryOpen}>
          <CollapsibleContent>
            <CardContent>
              <TimelineHistoryManager tooltips={tooltips} queryClient={queryClient} />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Tooltips das Seções (Originais) */}
      <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Tooltips das Seções</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTooltipsOpen(!isTooltipsOpen)}
              className="gap-2"
            >
              {isTooltipsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isTooltipsOpen ? "Colapsar" : "Expandir"}
            </Button>
          </div>
          <CardDescription>
            Gerencie os tooltips que aparecem nas seções do site
          </CardDescription>
        </CardHeader>
        <Collapsible open={isTooltipsOpen}>
          <CollapsibleContent>
            <CardContent>
              <div className="grid gap-4">
                {tooltips?.filter(tooltip => !tooltip.section_id.startsWith("history-")).map((tooltip) => (
          <Card
            key={tooltip.id}
            className="p-6 bg-card/50 backdrop-blur-sm border-primary/20"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">
                  {tooltip.section_id}
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {tooltip.title}
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-2 border-blue-400/60 hover:bg-blue-500/20"
                onClick={() => editingId === tooltip.id ? handleCancel() : handleEdit(tooltip)}
              >
                {editingId === tooltip.id ? (
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

            {editingId !== tooltip.id && (
              <p className="text-muted-foreground line-clamp-3">
                {tooltip.content}
              </p>
            )}

            <Collapsible open={editingId === tooltip.id}>
              <CollapsibleContent className="animate-accordion-down">
                <div className="space-y-4 mt-4 pt-4 border-t border-primary/20">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      ANO/DATA (obrigatório) *
                    </Label>
                    <Input
                      value={editForm.header}
                      onChange={(e) => setEditForm({ ...editForm, header: e.target.value })}
                      placeholder="Data do evento (obrigatório)"
                      className="bg-background/50 border-2 border-blue-400/60 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      TÍTULO
                    </Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Título do tooltip"
                      className="bg-background/50 border-2 border-blue-400/60 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      CONTEÚDO
                    </Label>
                    <Textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      rows={6}
                      placeholder="Conteúdo do tooltip"
                      className="bg-background/50 border-2 border-blue-400/60 focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSave(tooltip.id)}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Salvar
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
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

// Timeline History Manager Component with Preview + Drag-and-Drop
const TimelineHistoryManager = ({ tooltips, queryClient }: { tooltips: TooltipContent[] | undefined, queryClient: any }) => {
  const [localOrder, setLocalOrder] = useState<TooltipContent[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize local order from database
  const historyEvents = tooltips
    ?.filter(tooltip => tooltip.section_id.startsWith("history-"))
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)) || [];

  if (localOrder.length === 0 && historyEvents.length > 0) {
    setLocalOrder(historyEvents);
  }

  const updateOrderMutation = useMutation({
    mutationFn: async (orderedItems: TooltipContent[]) => {
      for (let i = 0; i < orderedItems.length; i++) {
        const { error } = await supabase
          .from('tooltip_contents')
          .update({ display_order: i + 1 })
          .eq('id', orderedItems[i].id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tooltips'] });
      toast({ title: 'Ordem salva com sucesso!' });
      setHasChanges(false);
    },
    onError: (error) => {
      console.error('Erro ao salvar ordem:', error);
      toast({ title: 'Erro ao salvar ordem dos eventos', variant: 'destructive' });
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setLocalOrder((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newOrder;
      });
    }
  };

  const handleSaveOrder = () => {
    updateOrderMutation.mutate(localOrder);
  };

  const scrollToCard = (sectionId: string) => {
    const element = document.querySelector(`[data-section-id="${sectionId}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="space-y-6">
      {/* Timeline Preview */}
      <div className="p-4 rounded-lg bg-muted/30 border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Preview da Timeline</span>
          </div>
          <span className="text-xs text-muted-foreground">14 eventos</span>
        </div>
        
        <ScrollArea className="w-full">
          <div className="flex items-center gap-3 pb-2 min-w-max">
            {localOrder.map((event, idx) => {
              const date = event.section_id.includes('talos') ? 'c.3000' : 
                          event.section_id.includes('telegraph') ? '1790' :
                          event.section_id.includes('turing-machine') ? '1936' :
                          event.section_id.includes('enigma') ? '1940' :
                          event.section_id.includes('turing-test') ? '1950' :
                          event.section_id.includes('arpanet') ? '1969' :
                          event.section_id.includes('tcpip') ? '1974' :
                          event.section_id.includes('www') ? '1989' :
                          event.section_id.includes('web2') ? '2004' :
                          event.section_id.includes('watson') ? '2011' :
                          event.section_id.includes('openai') ? '2015' :
                          event.section_id.includes('gpt3') ? '2020' :
                          event.section_id.includes('chatgpt') ? '2022' : '2024';
              
              const abbr = event.title.slice(0, 4);
              
              return (
                <div key={event.id} className="flex flex-col items-center group cursor-pointer" onClick={() => scrollToCard(event.section_id)}>
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-primary/60 group-hover:bg-primary group-hover:scale-125 transition-all" />
                    {idx < localOrder.length - 1 && (
                      <div className="absolute top-1/2 left-full w-8 h-[2px] bg-primary/30" />
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-1 whitespace-nowrap">{date}</span>
                  <span className="text-[8px] text-muted-foreground/70 font-mono">{abbr}</span>
                </div>
              );
            })}
            <div className="ml-2 text-primary/50">→</div>
          </div>
        </ScrollArea>
      </div>

      {/* Drag-and-Drop Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Reorganizar Eventos (Arraste para reordenar)</span>
          </div>
          <Button 
            onClick={handleSaveOrder} 
            disabled={!hasChanges || updateOrderMutation.isPending}
            size="sm"
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar Ordem
          </Button>
        </div>

        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={localOrder.map(e => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {localOrder.map((event, idx) => (
                <SortableHistoryCard 
                  key={event.id} 
                  event={event} 
                  index={idx}
                  queryClient={queryClient}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

// Sortable History Card Component
const SortableHistoryCard = ({ event, index, queryClient }: { event: TooltipContent, index: number, queryClient: any }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ header: "", title: "", content: "" });
  const { toast } = useToast();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const saveMutation = useMutation({
    mutationFn: async (updates: { header?: string; title: string; content: string }) => {
      const { error } = await supabase
        .from('tooltip_contents')
        .update(updates)
        .eq('id', event.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tooltips'] });
      toast({ title: 'Tooltip atualizado com sucesso!' });
      setEditingId(null);
    },
    onError: (error) => {
      console.error('Erro ao atualizar tooltip:', error);
      toast({ title: 'Erro ao atualizar tooltip', variant: 'destructive' });
    }
  });

  const handleEdit = () => {
    setEditingId(event.id);
    setEditForm({
      header: event.header || "",
      title: event.title,
      content: event.content
    });
  };

  const handleSave = () => {
    saveMutation.mutate(editForm);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      data-section-id={event.section_id}
      className="p-4 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all"
    >
      <div className="flex items-start gap-3">
        <div 
          {...attributes} 
          {...listeners}
          className="flex items-center gap-2 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
            {index + 1}
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="text-xs text-muted-foreground font-mono">{event.section_id}</div>
              <h4 className="font-semibold text-foreground">{event.title}</h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="shrink-0 border-blue-400/60 text-blue-400 hover:bg-blue-400/10"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>

          <Collapsible open={editingId === event.id}>
            <CollapsibleContent className="space-y-3">
              <div>
                <Label className="text-xs">ANO/DATA (obrigatório) *</Label>
                <Input
                  value={editForm.header}
                  onChange={(e) => setEditForm({ ...editForm, header: e.target.value })}
                  placeholder="Data do evento (obrigatório)"
                  className="border-blue-400/60 focus:border-blue-500"
                />
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Título do evento"
                  className="border-blue-400/60 focus:border-blue-500"
                />
              </div>
              <div>
                <Label className="text-xs">Conteúdo</Label>
                <Textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  placeholder="Descrição do evento"
                  rows={4}
                  className="border-blue-400/60 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm">
                  Salvar
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  Cancelar
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </Card>
  );
};

export default TooltipsTab;
