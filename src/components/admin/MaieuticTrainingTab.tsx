import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { 
  Calculator, 
  Globe, 
  HelpCircle, 
  Search, 
  Target, 
  Save, 
  CheckCircle2,
  Brain,
  Sparkles,
  AlertTriangle,
  Info
} from "lucide-react";

interface MaieuticCategory {
  id: string;
  category_key: string;
  category_name: string;
  category_icon: string;
  positive_directives: string;
  antiprompt: string;
  combination_rules: string[];
  behavioral_instructions: string;
  display_order: number;
  is_active: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator: Calculator,
  Globe: Globe,
  HelpCircle: HelpCircle,
  Search: Search,
  Target: Target,
  Brain: Brain,
};

const CATEGORY_COLORS: Record<string, string> = {
  math: "from-blue-500/20 to-blue-600/10 border-blue-400/40",
  regional: "from-green-500/20 to-green-600/10 border-green-400/40",
  high_superficial: "from-amber-500/20 to-amber-600/10 border-amber-400/40",
  medium_superficial: "from-orange-500/20 to-orange-600/10 border-orange-400/40",
  deterministic: "from-purple-500/20 to-purple-600/10 border-purple-400/40",
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  math: "bg-blue-500/20 text-blue-300 border-blue-400/40",
  regional: "bg-green-500/20 text-green-300 border-green-400/40",
  high_superficial: "bg-amber-500/20 text-amber-300 border-amber-400/40",
  medium_superficial: "bg-orange-500/20 text-orange-300 border-orange-400/40",
  deterministic: "bg-purple-500/20 text-purple-300 border-purple-400/40",
};

const CATEGORY_KEY_TO_LABEL: Record<string, string> = {
  math: "Matemática",
  regional: "Regional",
  high_superficial: "Alta Superf.",
  medium_superficial: "Média Superf.",
  deterministic: "Determinística",
};

export const MaieuticTrainingTab = () => {
  const [categories, setCategories] = useState<MaieuticCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<MaieuticCategory>>>({});

  // Debounce pending changes for auto-save
  const debouncedChanges = useDebounce(pendingChanges, 1000);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("maieutic_training_categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Parse combination_rules from JSONB
      const parsedData = (data || []).map((cat: any) => ({
        ...cat,
        combination_rules: Array.isArray(cat.combination_rules) 
          ? cat.combination_rules 
          : JSON.parse(cat.combination_rules || "[]"),
      }));

      setCategories(parsedData);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Erro ao carregar categorias maiêuticas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Auto-save when debounced changes are available
  useEffect(() => {
    const saveChanges = async () => {
      const keys = Object.keys(debouncedChanges);
      if (keys.length === 0) return;

      for (const categoryId of keys) {
        const changes = debouncedChanges[categoryId];
        if (!changes || Object.keys(changes).length === 0) continue;

        setSavingStates(prev => ({ ...prev, [categoryId]: true }));

        try {
          const { error } = await supabase
            .from("maieutic_training_categories")
            .update({
              ...changes,
              updated_at: new Date().toISOString(),
            })
            .eq("id", categoryId);

          if (error) throw error;

          toast.success("Alterações salvas automaticamente", {
            description: "As diretrizes foram atualizadas.",
            duration: 2000,
          });
        } catch (error) {
          console.error("Error saving category:", error);
          toast.error("Erro ao salvar alterações");
        } finally {
          setSavingStates(prev => ({ ...prev, [categoryId]: false }));
        }
      }

      setPendingChanges({});
    };

    saveChanges();
  }, [debouncedChanges]);

  const handleFieldChange = (categoryId: string, field: string, value: string | boolean) => {
    // Update local state immediately for responsive UI
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, [field]: value } : cat
    ));

    // Queue for debounced save
    setPendingChanges(prev => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [field]: value,
      },
    }));
  };

  const toggleActive = async (categoryId: string, isActive: boolean) => {
    handleFieldChange(categoryId, "is_active", isActive);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Treino da IA Maiêutica
                <Sparkles className="w-5 h-5 text-amber-400" />
              </CardTitle>
              <CardDescription className="mt-1">
                Configure como a IA classifica e responde a diferentes tipos de mensagens usando o método maiêutico
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Logic Matrix Explanation */}
      <Card className="border-muted-foreground/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            Matriz de Combinação das Categorias
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className={CATEGORY_BADGE_COLORS.math}>Matemática</Badge>
            <span>pode combinar com</span>
            <Badge variant="outline" className={CATEGORY_BADGE_COLORS.regional}>Regional</Badge>
            <span>+</span>
            <span className="text-amber-300">(qualquer nível de superficialidade)</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className={CATEGORY_BADGE_COLORS.regional}>Regional</Badge>
            <span>pode combinar com</span>
            <Badge variant="outline" className={CATEGORY_BADGE_COLORS.math}>Matemática</Badge>
            <span>+</span>
            <span className="text-amber-300">(qualquer nível de superficialidade)</span>
          </div>
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Alta, Média e Determinística são mutuamente exclusivas (apenas um nível por mensagem)</span>
          </div>
        </CardContent>
      </Card>

      {/* Categories Accordion */}
      <Accordion type="multiple" className="space-y-3">
        {categories.map((category) => {
          const IconComponent = ICON_MAP[category.category_icon] || Brain;
          const colorClass = CATEGORY_COLORS[category.category_key] || "from-gray-500/20 to-gray-600/10 border-gray-400/40";
          const isSaving = savingStates[category.id];

          return (
            <AccordionItem 
              key={category.id} 
              value={category.id}
              className={`border rounded-lg bg-gradient-to-r ${colorClass} transition-all duration-300`}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <IconComponent className="w-5 h-5" />
                    <span className="font-medium">{category.category_name}</span>
                    {isSaving && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Save className="w-3 h-3 animate-pulse" />
                        <span>Salvando...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Combination badges */}
                    <div className="hidden md:flex items-center gap-1">
                      {category.combination_rules.length > 0 && (
                        <span className="text-xs text-muted-foreground mr-1">Combina:</span>
                      )}
                      {category.combination_rules.slice(0, 3).map((rule) => (
                        <Badge 
                          key={rule} 
                          variant="outline" 
                          className={`text-[10px] px-1.5 py-0 ${CATEGORY_BADGE_COLORS[rule] || ''}`}
                        >
                          {CATEGORY_KEY_TO_LABEL[rule] || rule}
                        </Badge>
                      ))}
                      {category.combination_rules.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{category.combination_rules.length - 3}
                        </Badge>
                      )}
                    </div>
                    {/* Active toggle */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={(checked) => toggleActive(category.id, checked)}
                      />
                      <span className={`text-xs ${category.is_active ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {category.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Two-column layout for directives */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Positive Directives */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        O que falar (Diretrizes Positivas)
                      </Label>
                      <Textarea
                        value={category.positive_directives}
                        onChange={(e) => handleFieldChange(category.id, "positive_directives", e.target.value)}
                        placeholder="Ex: Seja empático, use linguagem simples, faça perguntas de acompanhamento..."
                        className="min-h-[160px] bg-background/50 border-green-400/30 focus:border-green-400"
                      />
                      <p className="text-xs text-muted-foreground">
                        Instruções que a IA DEVE seguir quando esta categoria for detectada
                      </p>
                    </div>

                    {/* Antiprompt */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        O que NÃO falar (Antiprompt)
                      </Label>
                      <Textarea
                        value={category.antiprompt}
                        onChange={(e) => handleFieldChange(category.id, "antiprompt", e.target.value)}
                        placeholder="Ex: Não use jargão técnico, não seja condescendente, não responda de forma genérica..."
                        className="min-h-[160px] bg-background/50 border-red-400/30 focus:border-red-400"
                      />
                      <p className="text-xs text-muted-foreground">
                        Comportamentos que a IA deve EVITAR quando esta categoria for detectada
                      </p>
                    </div>
                  </div>

                  <Separator className="bg-muted-foreground/20" />

                  {/* Behavioral Instructions (Read-only) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-blue-400">
                      <Brain className="w-4 h-4" />
                      Instruções Comportamentais (Hardcoded)
                    </Label>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-400/30 text-sm text-muted-foreground">
                      {category.behavioral_instructions || "Sem instruções comportamentais definidas."}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Estas instruções são fixas e aplicadas automaticamente pela engine de classificação
                    </p>
                  </div>

                  {/* Mobile combination badges */}
                  <div className="md:hidden space-y-2">
                    <Label className="text-xs text-muted-foreground">Pode combinar com:</Label>
                    <div className="flex flex-wrap gap-1">
                      {category.combination_rules.map((rule) => (
                        <Badge 
                          key={rule} 
                          variant="outline" 
                          className={`text-xs ${CATEGORY_BADGE_COLORS[rule] || ''}`}
                        >
                          {CATEGORY_KEY_TO_LABEL[rule] || rule}
                        </Badge>
                      ))}
                      {category.combination_rules.length === 0 && (
                        <span className="text-xs text-muted-foreground">Nenhuma combinação permitida</span>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default MaieuticTrainingTab;