import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowRight, 
  Ban, 
  Brain, 
  CheckCircle2, 
  Link2, 
  Loader2, 
  RefreshCw, 
  Search, 
  Sparkles,
  TrendingUp,
  Trash2,
  XCircle
} from "lucide-react";

interface MLCorrelation {
  id: string;
  keyword: string;
  taxonomy_code: string;
  taxonomy_id: string;
  correlation_strength: number;
  occurrence_count: number;
  source: string;
  last_validated_at: string | null;
  created_at: string;
}

interface MLRestriction {
  id: string;
  keyword: string;
  restricted_taxonomy_code: string;
  restricted_taxonomy_id: string;
  restriction_strength: number;
  occurrence_count: number;
  source: string;
  last_validated_at: string | null;
  created_at: string;
}

export const MLLearningPatternsSection = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"correlations" | "restrictions">("correlations");

  // Fetch correlations
  const { data: correlations, isLoading: loadingCorrelations } = useQuery({
    queryKey: ["ml-correlations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_correlations")
        .select("*")
        .order("correlation_strength", { ascending: false })
        .order("occurrence_count", { ascending: false })
        .limit(200);
      
      if (error) throw error;
      return data as MLCorrelation[];
    },
  });

  // Fetch restrictions
  const { data: restrictions, isLoading: loadingRestrictions } = useQuery({
    queryKey: ["ml-restrictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_restrictions")
        .select("*")
        .order("restriction_strength", { ascending: false })
        .order("occurrence_count", { ascending: false })
        .limit(200);
      
      if (error) throw error;
      return data as MLRestriction[];
    },
  });

  // Delete correlation mutation
  const deleteCorrelation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ml_correlations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-correlations"] });
      toast.success("Correlação removida");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Delete restriction mutation
  const deleteRestriction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ml_restrictions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-restrictions"] });
      toast.success("Restrição removida");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Filter data based on search
  const filteredCorrelations = correlations?.filter(c => 
    c.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.taxonomy_code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredRestrictions = restrictions?.filter(r => 
    r.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.restricted_taxonomy_code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate stats
  const stats = {
    totalCorrelations: correlations?.length || 0,
    totalRestrictions: restrictions?.length || 0,
    avgCorrelationStrength: correlations?.length 
      ? (correlations.reduce((sum, c) => sum + c.correlation_strength, 0) / correlations.length * 100).toFixed(0)
      : 0,
    avgRestrictionStrength: restrictions?.length 
      ? (restrictions.reduce((sum, r) => sum + r.restriction_strength, 0) / restrictions.length * 100).toFixed(0)
      : 0,
    fromFeedback: (correlations?.filter(c => c.source === 'feedback').length || 0) + 
                  (restrictions?.filter(r => r.source === 'feedback').length || 0),
    fromCorrections: (correlations?.filter(c => c.source === 'correction').length || 0) + 
                     (restrictions?.filter(r => r.source === 'correction').length || 0),
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'feedback':
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">Feedback</Badge>;
      case 'correction':
        return <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Correção</Badge>;
      case 'manual':
        return <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">Manual</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{source}</Badge>;
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 0.8) return "text-emerald-400";
    if (strength >= 0.6) return "text-amber-400";
    return "text-muted-foreground";
  };

  return (
    <Card className="p-6 border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-lg">Padrões Aprendidos (ML Bidirecional)</h3>
          <Badge variant="outline" className="ml-2 bg-purple-500/20 text-purple-300 border-purple-500/30">
            FASE 3
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["ml-correlations"] });
            queryClient.invalidateQueries({ queryKey: ["ml-restrictions"] });
          }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">Correlações</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.totalCorrelations}</div>
          <div className="text-xs text-muted-foreground">Força média: {stats.avgCorrelationStrength}%</div>
        </Card>

        <Card className="p-4 bg-red-500/10 border-red-500/30">
          <div className="flex items-center gap-2 mb-1">
            <Ban className="h-4 w-4 text-red-400" />
            <span className="text-xs text-muted-foreground">Restrições</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.totalRestrictions}</div>
          <div className="text-xs text-muted-foreground">Força média: {stats.avgRestrictionStrength}%</div>
        </Card>

        <Card className="p-4 bg-blue-500/10 border-blue-500/30">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-muted-foreground">De Feedback</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{stats.fromFeedback}</div>
          <div className="text-xs text-muted-foreground">Aprovações/Rejeições</div>
        </Card>

        <Card className="p-4 bg-amber-500/10 border-amber-500/30">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRight className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-muted-foreground">De Correções</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{stats.fromCorrections}</div>
          <div className="text-xs text-muted-foreground">Código A → B</div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por keyword ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "correlations" | "restrictions")}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="correlations" className="gap-2">
            <Link2 className="h-4 w-4" />
            Correlações ({filteredCorrelations.length})
          </TabsTrigger>
          <TabsTrigger value="restrictions" className="gap-2">
            <Ban className="h-4 w-4" />
            Restrições ({filteredRestrictions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="correlations">
          {loadingCorrelations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCorrelations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma correlação aprendida ainda.</p>
              <p className="text-sm">Aprove sugestões para gerar correlações automaticamente.</p>
            </div>
          ) : (
            <div className="rounded-md border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>→ Código</TableHead>
                    <TableHead>Força</TableHead>
                    <TableHead>Ocorrências</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCorrelations.slice(0, 50).map((correlation) => (
                    <TableRow key={correlation.id}>
                      <TableCell className="font-mono text-sm">
                        "{correlation.keyword}"
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          {correlation.taxonomy_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={correlation.correlation_strength * 100} 
                                  className="w-16 h-2"
                                />
                                <span className={`text-sm font-medium ${getStrengthColor(correlation.correlation_strength)}`}>
                                  {(correlation.correlation_strength * 100).toFixed(0)}%
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              Força da correlação: quanto maior, mais confiável
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{correlation.occurrence_count}x</Badge>
                      </TableCell>
                      <TableCell>{getSourceBadge(correlation.source)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={() => deleteCorrelation.mutate(correlation.id)}
                          disabled={deleteCorrelation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="restrictions">
          {loadingRestrictions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRestrictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma restrição aprendida ainda.</p>
              <p className="text-sm">Rejeite sugestões incorretas para gerar restrições automaticamente.</p>
            </div>
          ) : (
            <div className="rounded-md border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>⛔ NÃO Usar</TableHead>
                    <TableHead>Força</TableHead>
                    <TableHead>Ocorrências</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRestrictions.slice(0, 50).map((restriction) => (
                    <TableRow key={restriction.id}>
                      <TableCell className="font-mono text-sm">
                        "{restriction.keyword}"
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                          {restriction.restricted_taxonomy_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={restriction.restriction_strength * 100} 
                                  className="w-16 h-2"
                                />
                                <span className={`text-sm font-medium ${getStrengthColor(restriction.restriction_strength)}`}>
                                  {(restriction.restriction_strength * 100).toFixed(0)}%
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              Força da restrição: quanto maior, mais evitado
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{restriction.occurrence_count}x</Badge>
                      </TableCell>
                      <TableCell>{getSourceBadge(restriction.source)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={() => deleteRestriction.mutate(restriction.id)}
                          disabled={deleteRestriction.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info Footer */}
      <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <TrendingUp className="h-4 w-4 mt-0.5 text-purple-400" />
          <div>
            <strong className="text-foreground">Como funciona:</strong> Quando você aprova/rejeita/corrige sugestões, 
            o sistema extrai keywords do documento e cria padrões automáticos. 
            Próximas sugestões usarão esses padrões para melhorar a precisão.
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MLLearningPatternsSection;
