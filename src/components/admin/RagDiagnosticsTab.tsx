import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Database, FileText, AlertCircle, CheckCircle2, Clock, Key, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";

export const RagDiagnosticsTab = () => {
  const { toast } = useToast();
  const [testQuery, setTestQuery] = useState("");
  const [testChatType, setTestChatType] = useState<"study" | "health">("study");
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingRAG, setIsTestingRAG] = useState(false);
  const [forceFulltext, setForceFulltext] = useState(false);

  // Fetch documents by chat type
  const { data: documentsStats } = useQuery({
    queryKey: ["rag-documents-stats"],
    queryFn: async () => {
      const { data: docs, error } = await supabase
        .from("documents")
        .select("id, filename, target_chat, inserted_in_chat, is_inserted, status, total_chunks")
        .eq("status", "completed");

      if (error) throw error;

      const studyDocs = docs?.filter(d => d.is_inserted && d.inserted_in_chat === "study") || [];
      const healthDocs = docs?.filter(d => d.is_inserted && d.inserted_in_chat === "health") || [];
      const generalDocs = docs?.filter(d => !d.is_inserted || d.target_chat === "general") || [];

      return {
        study: {
          count: studyDocs.length,
          chunks: studyDocs.reduce((sum, d) => sum + (d.total_chunks || 0), 0),
          docs: studyDocs,
        },
        health: {
          count: healthDocs.length,
          chunks: healthDocs.reduce((sum, d) => sum + (d.total_chunks || 0), 0),
          docs: healthDocs,
        },
        general: {
          count: generalDocs.length,
          chunks: generalDocs.reduce((sum, d) => sum + (d.total_chunks || 0), 0),
          docs: generalDocs,
        },
      };
    },
  });

  // Fetch recent RAG analytics
  const { data: recentSearches } = useQuery({
    queryKey: ["rag-recent-searches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rag_analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const handleTestRAG = async () => {
    if (!testQuery.trim()) {
      toast({
        title: "Query vazio",
        description: "Digite uma query para testar o RAG",
        variant: "destructive",
      });
      return;
    }

    setIsTestingRAG(true);
    setTestResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("search-documents", {
        body: {
          query: testQuery,
          targetChat: testChatType,
          matchThreshold: forceFulltext ? 0.0 : 0.15,
          matchCount: 5,
        },
      });

      if (error) throw error;

      setTestResults(data);
      
      toast({
        title: "Teste concluído",
        description: `${data.results?.length || 0} chunks encontrados via ${data.search_type || 'vector'}`,
      });
    } catch (error: any) {
      console.error("RAG test error:", error);
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingRAG(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <AdminTitleWithInfo
          title="Diagnóstico RAG"
          level="h2"
          icon={Search}
          tooltipText="Painel de testes RAG"
          infoContent={
            <>
              <p>Teste e valide o sistema RAG em tempo real.</p>
              <p className="mt-2">Execute queries, visualize resultados e analise performance de busca.</p>
            </>
          }
        />
        <p className="text-muted-foreground mt-2">
          Painel de diagnóstico e teste do sistema RAG (Retrieval-Augmented Generation)
        </p>
      </div>

      {/* Configuração Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configuração Atual
          </CardTitle>
          <CardDescription>Parâmetros do sistema RAG</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Threshold de Similaridade</p>
              <p className="text-xl font-bold text-primary">0.15 (vector) / 0.50 (keyword)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Modelo de Embedding</p>
              <p className="text-lg font-medium">text-embedding-3-small</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Match Count Padrão</p>
              <p className="text-2xl font-bold text-primary">5</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Busca Híbrida</p>
              <Badge className="mt-1">Vector + Keyword Fallback</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentos por Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos por Chat
          </CardTitle>
          <CardDescription>Status dos documentos inseridos em cada chat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Study Chat */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-blue-500 border-blue-500">Study</Badge>
                <div>
                  <p className="font-medium">{documentsStats?.study.count || 0} documentos</p>
                  <p className="text-sm text-muted-foreground">{documentsStats?.study.chunks || 0} chunks totais</p>
                </div>
              </div>
              {(documentsStats?.study.count || 0) > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>

            {/* Health Chat */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-red-500 border-red-500">Health</Badge>
                <div>
                  <p className="font-medium">{documentsStats?.health.count || 0} documentos</p>
                  <p className="text-sm text-muted-foreground">{documentsStats?.health.chunks || 0} chunks totais</p>
                </div>
              </div>
              {(documentsStats?.health.count || 0) > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>

            {/* General (não atribuídos) */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-4">
                <Badge variant="outline">General (não atribuídos)</Badge>
                <div>
                  <p className="font-medium">{documentsStats?.general.count || 0} documentos</p>
                  <p className="text-sm text-muted-foreground">{documentsStats?.general.chunks || 0} chunks totais</p>
                </div>
              </div>
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teste de Busca RAG */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Teste de Busca RAG
          </CardTitle>
          <CardDescription>Teste o sistema RAG com queries personalizadas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Digite sua query de teste (ex: John McCarthy, ANNs, etc)"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTestRAG()}
              className="flex-1"
            />
            <Select value={testChatType} onValueChange={(v: any) => setTestChatType(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="study">Study</SelectItem>
                <SelectItem value="health">Health</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleTestRAG} disabled={isTestingRAG}>
              {isTestingRAG ? "Testando..." : "Testar"}
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="forceFulltext"
              checked={forceFulltext}
              onChange={(e) => setForceFulltext(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="forceFulltext" className="text-sm text-muted-foreground">
              Forçar busca full-text (threshold 0.0)
            </label>
          </div>

          {testResults && (
            <div className="space-y-4 mt-4">
              <Separator />
              
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Resultados ({testResults.results?.length || 0} chunks)</h4>
                <div className="flex items-center gap-2">
                  <Badge variant={testResults.search_type === 'vector' ? 'default' : 'secondary'} className="flex items-center gap-1">
                    {testResults.search_type === 'vector' ? (
                      <><Search className="h-3 w-3" /> Vector</>
                    ) : testResults.search_type === 'keyword' ? (
                      <><Key className="h-3 w-3" /> Keyword</>
                    ) : (
                      <><FileText className="h-3 w-3" /> Full-text</>
                    )}
                  </Badge>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {testResults.analytics?.latency_ms}ms
                  </span>
                  {testResults.analytics?.top_score && (
                    <Badge variant="outline">
                      Score: {testResults.analytics.top_score.toFixed(3)}
                    </Badge>
                  )}
                </div>
              </div>

              {testResults.results?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhum chunk encontrado para esta query</p>
                  <p className="text-sm mt-1">Threshold atual: 0.15 (vector) / 0.50 (keyword)</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {testResults.results?.map((result: any, idx: number) => (
                      <Card key={idx} className="border-l-4 border-l-primary">
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">Score: {result.similarity.toFixed(3)}</Badge>
                              {result.matched_keyword && (
                                <Badge variant="outline" className="text-xs">
                                  Keyword: {result.matched_keyword}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Doc ID: {result.document_id.slice(0, 8)}...
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed line-clamp-4">{result.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Últimas Buscas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Últimas Buscas RAG
          </CardTitle>
          <CardDescription>Histórico recente de consultas ao sistema RAG</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {recentSearches?.map((search) => (
                <div key={search.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{search.query}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {search.target_chat || "geral"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {search.results_count || 0} resultados
                      </span>
                      {search.top_similarity_score && (
                        <span className="text-xs text-muted-foreground">
                          Score: {search.top_similarity_score.toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-muted-foreground">{search.latency_ms}ms</span>
                    {search.success_status ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default RagDiagnosticsTab;
