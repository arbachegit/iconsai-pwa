import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  Target, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ChevronDown, 
  BookOpen,
  Loader2,
  BarChart3,
  Binary,
  Database,
  Hash,
  List,
  FileText,
  Sparkles
} from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { formatDateTime } from "@/lib/date-utils";

const QUESTION_TYPE_ICONS: Record<string, any> = {
  binary: Binary,
  data_retrieval: Database,
  quantitative: Hash,
  selective: List,
  definition: FileText,
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  binary: "Binária (Sim/Não)",
  data_retrieval: "Recuperação de Dados",
  quantitative: "Quantitativa",
  selective: "Seletiva (Opções)",
  definition: "Definição Técnica",
};

export const DeterministicAnalysisTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chatFilter, setChatFilter] = useState<string>("all");
  const [classificationFilter, setClassificationFilter] = useState<string>("all");
  const [isEducationalOpen, setIsEducationalOpen] = useState(false);

  // Fetch analyses
  const { data: analyses, isLoading } = useQuery({
    queryKey: ["deterministic-analysis", chatFilter, classificationFilter],
    queryFn: async () => {
      let query = supabase
        .from("deterministic_analysis")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (chatFilter !== "all") {
        query = query.eq("chat_type", chatFilter);
      }
      if (classificationFilter !== "all") {
        query = query.eq("classification", classificationFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch conversations for batch analysis
  const { data: pendingConversations } = useQuery({
    queryKey: ["pending-conversations-for-analysis"],
    queryFn: async () => {
      const { data: analyzed } = await supabase
        .from("deterministic_analysis")
        .select("conversation_id");
      
      const analyzedIds = new Set((analyzed || []).map(a => a.conversation_id));

      const { data: conversations, error } = await supabase
        .from("conversation_history")
        .select("id, session_id, chat_type, messages")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Filter conversations that haven't been fully analyzed
      return (conversations || []).filter(c => !analyzedIds.has(c.id));
    },
  });

  // Mutation to analyze pending conversations
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!pendingConversations || pendingConversations.length === 0) {
        throw new Error("Nenhuma conversa pendente para análise");
      }

      let totalAnalyzed = 0;

      for (const conv of pendingConversations.slice(0, 10)) {
        const messages = Array.isArray(conv.messages) ? conv.messages : [];
        const userMessages = messages.filter((m: any) => m.role === "user");

        if (userMessages.length === 0) continue;

        const { data, error } = await supabase.functions.invoke("analyze-deterministic", {
          body: {
            messages: userMessages,
            conversationId: conv.id,
            sessionId: conv.session_id,
            chatType: conv.chat_type,
          },
        });

        if (error) {
          console.error("Analysis error:", error);
          continue;
        }

        totalAnalyzed += data?.analyzed || 0;
      }

      return totalAnalyzed;
    },
    onSuccess: (count) => {
      toast({
        title: "Análise concluída",
        description: `${count} mensagens foram analisadas com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["deterministic-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["pending-conversations-for-analysis"] });
    },
    onError: (error) => {
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Calculate statistics
  const stats = {
    total: analyses?.length || 0,
    deterministic: analyses?.filter(a => a.classification === "deterministic").length || 0,
    nonDeterministic: analyses?.filter(a => a.classification === "non-deterministic").length || 0,
  };
  const deterministicRate = stats.total > 0 ? ((stats.deterministic / stats.total) * 100).toFixed(1) : "0";

  // Group by question type
  const questionTypeStats = analyses?.reduce((acc, a) => {
    if (a.question_type) {
      acc[a.question_type] = (acc[a.question_type] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  // Pie chart data
  const pieData = [
    { name: "Determinísticas", value: stats.deterministic, color: "hsl(var(--chart-2))" },
    { name: "Não-Determinísticas", value: stats.nonDeterministic, color: "hsl(var(--chart-1))" },
  ];

  // Bar chart data for question types
  const barData = Object.entries(questionTypeStats).map(([type, count]) => ({
    name: QUESTION_TYPE_LABELS[type] || type,
    value: count,
  }));

  // Examples for side-by-side display
  const deterministicExamples = analyses?.filter(a => a.classification === "deterministic").slice(0, 5) || [];
  const nonDeterministicExamples = analyses?.filter(a => a.classification === "non-deterministic").slice(0, 5) || [];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Fala Determinística</h2>
              <p className="text-muted-foreground">Análise de perguntas dos usuários nos chats</p>
            </div>
          </div>
          
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending || !pendingConversations?.length}
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analisar Conversas ({pendingConversations?.length || 0} pendentes)
              </>
            )}
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Analisadas</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <p className="text-3xl font-bold text-emerald-500">{stats.deterministic}</p>
                </div>
                <p className="text-sm text-muted-foreground">Determinísticas ({stats.total > 0 ? ((stats.deterministic / stats.total) * 100).toFixed(0) : 0}%)</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5 text-amber-500" />
                  <p className="text-3xl font-bold text-amber-500">{stats.nonDeterministic}</p>
                </div>
                <p className="text-sm text-muted-foreground">Não-Determinísticas ({stats.total > 0 ? ((stats.nonDeterministic / stats.total) * 100).toFixed(0) : 0}%)</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{deterministicRate}%</p>
                <p className="text-sm text-muted-foreground">Taxa Determinística</p>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                    style={{ width: `${deterministicRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Distribuição de Classificações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.total > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart - Question Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <List className="w-4 h-4" />
                Tipos de Perguntas Determinísticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side by Side Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Non-Deterministic Examples */}
          <Card className="border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
                <XCircle className="w-4 h-4" />
                ❌ Não-Determinísticas
              </CardTitle>
              <CardDescription>Exemplos recentes de perguntas subjetivas</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {nonDeterministicExamples.length > 0 ? (
                    nonDeterministicExamples.map((example) => (
                      <div key={example.id} className="p-2 bg-amber-500/10 rounded-md border border-amber-500/20">
                        <p className="text-sm font-medium truncate">"{example.original_message}"</p>
                        {example.refactored_version && (
                          <p className="text-xs text-emerald-500 mt-1">
                            → {example.refactored_version}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum exemplo disponível
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Deterministic Examples */}
          <Card className="border-emerald-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
                ✅ Determinísticas
              </CardTitle>
              <CardDescription>Exemplos recentes de perguntas objetivas</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {deterministicExamples.length > 0 ? (
                    deterministicExamples.map((example) => (
                      <div key={example.id} className="p-2 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                        <div className="flex items-center gap-2">
                          {example.question_type && QUESTION_TYPE_ICONS[example.question_type] && (
                            <Tooltip>
                              <TooltipTrigger>
                                {(() => {
                                  const Icon = QUESTION_TYPE_ICONS[example.question_type];
                                  return <Icon className="w-3 h-3 text-emerald-500" />;
                                })()}
                              </TooltipTrigger>
                              <TooltipContent>
                                {QUESTION_TYPE_LABELS[example.question_type] || example.question_type}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <p className="text-sm font-medium truncate">"{example.original_message}"</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum exemplo disponível
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Select value={chatFilter} onValueChange={setChatFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Chat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Chats</SelectItem>
                  <SelectItem value="health">Saúde</SelectItem>
                  <SelectItem value="study">Estudo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Classificação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="deterministic">Determinísticas</SelectItem>
                  <SelectItem value="non-deterministic">Não-Determinísticas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Análises Detalhadas</CardTitle>
            <CardDescription>Histórico completo das mensagens analisadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Mensagem Original</TableHead>
                    <TableHead className="w-[120px]">Classificação</TableHead>
                    <TableHead className="w-[100px]">Tipo</TableHead>
                    <TableHead className="w-[250px]">Análise</TableHead>
                    <TableHead className="w-[250px]">Refatoração</TableHead>
                    <TableHead className="w-[80px]">Chat</TableHead>
                    <TableHead className="w-[100px]">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : analyses && analyses.length > 0 ? (
                    analyses.map((analysis) => (
                      <TableRow key={analysis.id}>
                        <TableCell className="font-medium">
                          <Tooltip>
                            <TooltipTrigger className="text-left truncate max-w-[280px] block">
                              {analysis.original_message}
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[400px]">
                              {analysis.original_message}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={analysis.classification === "deterministic" ? "default" : "secondary"}
                            className={analysis.classification === "deterministic" 
                              ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" 
                              : "bg-amber-500/20 text-amber-500 border-amber-500/30"
                            }
                          >
                            {analysis.classification === "deterministic" ? "Det." : "Não-Det."}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {analysis.question_type ? (
                            <Badge variant="outline" className="text-xs">
                              {QUESTION_TYPE_LABELS[analysis.question_type]?.split(" ")[0] || analysis.question_type}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger className="text-left truncate max-w-[230px] block">
                              {analysis.analysis_reason || "-"}
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[400px]">
                              {analysis.analysis_reason}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-xs text-emerald-500">
                          {analysis.refactored_version ? (
                            <Tooltip>
                              <TooltipTrigger className="text-left truncate max-w-[230px] block">
                                {analysis.refactored_version}
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[400px]">
                                {analysis.refactored_version}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {analysis.chat_type === "health" ? "Saúde" : analysis.chat_type === "study" ? "Estudo" : analysis.chat_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(analysis.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma análise encontrada. Clique em "Analisar Conversas" para começar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Educational Card */}
        <Collapsible open={isEducationalOpen} onOpenChange={setIsEducationalOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <CardTitle className="text-sm">Guia de Referência - Perguntas Determinísticas vs Não-Determinísticas</CardTitle>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isEducationalOpen ? "rotate-180" : ""}`} />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                {/* Comparison Table */}
                <div>
                  <h4 className="font-semibold mb-2">Comparação</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Característica</TableHead>
                        <TableHead className="text-emerald-500">✅ Determinística</TableHead>
                        <TableHead className="text-amber-500">❌ Não-Determinística</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Foco</TableCell>
                        <TableCell>Fato / Dado / Lógica</TableCell>
                        <TableCell>Opinião / Sentimento / Exploração</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Exemplo</TableCell>
                        <TableCell>"Qual foi o faturamento dia 05/12?"</TableCell>
                        <TableCell>"Como foram as vendas recentemente?"</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Ambiguidade</TableCell>
                        <TableCell>Zero</TableCell>
                        <TableCell>Alta</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Resposta</TableCell>
                        <TableCell>Única e verificável</TableCell>
                        <TableCell>Variável e subjetiva</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Processamento</TableCell>
                        <TableCell>Rápido (Lookup)</TableCell>
                        <TableCell>Lento (Raciocínio/Análise)</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Types of Deterministic Questions */}
                <div>
                  <h4 className="font-semibold mb-2">Tipos de Perguntas Determinísticas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Binary className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">1. Binárias (Sim/Não)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">"O servidor está online?", "O pagamento foi aprovado?"</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">2. Recuperação de Dados</span>
                      </div>
                      <p className="text-xs text-muted-foreground">"Qual é o CPF do cliente X?", "Qual foi a data da última venda?"</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">3. Quantitativas</span>
                      </div>
                      <p className="text-xs text-muted-foreground">"Quantos tickets estão abertos?", "Qual a temperatura exata?"</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <List className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">4. Seletivas (Lista Fechada)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">"O nível é Baixo, Médio ou Alto?", "O ambiente é Produção ou Homologação?"</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg md:col-span-2">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">5. Definição Técnica</span>
                      </div>
                      <p className="text-xs text-muted-foreground">"O que significa o código de erro 404?", "Qual é a fórmula de ROI?"</p>
                    </div>
                  </div>
                </div>

                {/* Examples Table */}
                <div>
                  <h4 className="font-semibold mb-2">Exemplos de Transformação</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-amber-500">❌ Forma Vaga</TableHead>
                        <TableHead className="text-emerald-500">✅ Forma Precisa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>"O sistema caiu?"</TableCell>
                        <TableCell>"O endpoint /health-check retorna status 200?"</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Performance</TableCell>
                        <TableCell>"O site está rápido?"</TableCell>
                        <TableCell>"Qual é o tempo de carregamento (LCP) em milissegundos?"</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Quantidade</TableCell>
                        <TableCell>"Temos muitos usuários novos?"</TableCell>
                        <TableCell>"Quantos usuários se cadastraram nas últimas 24 horas?"</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Erro</TableCell>
                        <TableCell>"Deu erro no login."</TableCell>
                        <TableCell>"Qual é o code e a message retornados no JSON de erro?"</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Qualidade</TableCell>
                        <TableCell>"Esse texto está bom?"</TableCell>
                        <TableCell>"O texto atende aos requisitos do guia de estilo?"</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </TooltipProvider>
  );
};
