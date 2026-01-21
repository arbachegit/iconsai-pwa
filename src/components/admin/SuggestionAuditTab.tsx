import { useState, useEffect, useCallback } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  FileText,
  RefreshCw,
  Search,
  Sparkles,
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateCoherenceScore } from "@/lib/suggestion-audit";

interface SuggestionAudit {
  id: string;
  session_id: string;
  chat_type: string;
  user_query: string;
  ai_response_preview: string | null;
  suggestions_generated: string[] | null;
  has_rag_context: boolean | null;
  rag_documents_used: string[] | null;
  coherence_score: number | null;
  coherence_validated: boolean | null;
  admin_feedback: string | null;
  created_at: string | null;
  validated_at: string | null;
}

export const SuggestionAuditTab = () => {
  const [audits, setAudits] = useState<SuggestionAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<SuggestionAudit | null>(null);
  const [validationScore, setValidationScore] = useState<number>(5);
  const [adminFeedback, setAdminFeedback] = useState("");
  const { toast } = useToast();

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suggestion_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setAudits(data || []);
    } catch (err) {
      console.error("Erro ao buscar auditorias:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as auditorias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const handleValidate = async (validated: boolean) => {
    if (!selectedAudit) return;

    try {
      await updateCoherenceScore(
        selectedAudit.id,
        validationScore,
        validated,
        adminFeedback || undefined
      );

      toast({
        title: validated ? "Validado com sucesso" : "Marcado como incoerente",
        description: `Score de coerência: ${validationScore}/10`,
      });

      setSelectedAudit(null);
      setValidationScore(5);
      setAdminFeedback("");
      fetchAudits();
    } catch (err) {
      console.error("Erro ao validar:", err);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a validação.",
        variant: "destructive",
      });
    }
  };

  const filteredAudits = audits.filter(audit => 
    audit.user_query.toLowerCase().includes(searchTerm.toLowerCase()) ||
    audit.chat_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: audits.length,
    validated: audits.filter(a => a.coherence_validated === true).length,
    invalid: audits.filter(a => a.coherence_validated === false).length,
    pending: audits.filter(a => a.coherence_validated === null).length,
    avgScore: audits.filter(a => a.coherence_score !== null).length > 0
      ? (audits.filter(a => a.coherence_score !== null).reduce((acc, a) => acc + (a.coherence_score || 0), 0) / 
         audits.filter(a => a.coherence_score !== null).length).toFixed(1)
      : "N/A",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Auditoria de Sugestões</h2>
          <p className="text-muted-foreground">Valide a coerência contextual das sugestões geradas pela IA</p>
        </div>
        <Button onClick={fetchAudits} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-emerald-500">{stats.validated}</p>
                <p className="text-xs text-muted-foreground">Validados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{stats.invalid}</p>
                <p className="text-xs text-muted-foreground">Incoerentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-500" />
              <div>
                <p className="text-2xl font-bold text-cyan-500">{stats.avgScore}</p>
                <p className="text-xs text-muted-foreground">Score Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <DebouncedInput
          placeholder="Buscar por query ou tipo de chat..."
          value={searchTerm}
          onChange={setSearchTerm}
          delay={300}
          className="pl-10"
        />
      </div>

      {/* Audits Table */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Registros de Auditoria</CardTitle>
            
            {/* Ícone de Explicação - Padrão AdminTitleWithInfo */}
            <TooltipProvider>
              <Tooltip>
                <Popover>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <button 
                        className="relative w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                        aria-label="Informações sobre Auditoria de Sugestões"
                      >
                        <Lightbulb className="w-4 h-4 text-primary" />
                        {/* Bolinha verde pulsante */}
                        <div className="absolute -top-1 -right-1 pointer-events-none">
                          <div className="relative">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
                          </div>
                        </div>
                      </button>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  
                  <TooltipContent side="right" sideOffset={5}>
                    <p className="text-sm max-w-[250px]">Clique para saber mais sobre a Auditoria de Sugestões</p>
                  </TooltipContent>

                  <PopoverContent 
                    className="w-[480px] max-w-[90vw] bg-card/95 backdrop-blur-sm border-primary/20" 
                    side="right"
                    align="start"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <h4 className="font-semibold text-base">O que são Registros de Auditoria?</h4>
                      </div>
                      
                      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                        <p>
                          <strong className="text-foreground">Definição:</strong> Os Registros de Auditoria capturam todas as sugestões 
                          geradas pela IA durante conversas, permitindo análise de qualidade e coerência contextual.
                        </p>
                        
                        <div>
                          <strong className="text-foreground">Como funciona:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Cada interação do chat gera um registro automático</li>
                            <li>São capturados: query do usuário, resposta da IA, sugestões geradas e contexto RAG</li>
                            <li>Administradores podem validar a coerência das sugestões (score 0-10)</li>
                            <li>Feedbacks são armazenados para melhoria contínua do sistema</li>
                          </ul>
                        </div>
                        
                        <div>
                          <strong className="text-foreground">Funcionalidades:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li><span className="text-emerald-500">✓ Validar Coerente:</span> Sugestões alinhadas ao contexto</li>
                            <li><span className="text-red-500">✗ Marcar Incoerente:</span> Sugestões fora do contexto</li>
                            <li><span className="text-amber-500">⏳ Pendente:</span> Aguardando revisão manual</li>
                          </ul>
                        </div>
                        
                        <p>
                          <strong className="text-foreground">Objetivo:</strong> Criar memória institucional de qualidade de sugestões, 
                          permitindo treinamento ML e melhoria contínua do protocolo de coerência contextual.
                        </p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredAudits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma auditoria encontrada.</p>
              <p className="text-sm">Use o chat para gerar registros de auditoria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Chat</TableHead>
                  <TableHead className="max-w-[200px]">Query</TableHead>
                  <TableHead>Sugestões</TableHead>
                  <TableHead>RAG</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="text-xs">
                      {audit.created_at 
                        ? new Date(audit.created_at).toLocaleString("pt-BR", { 
                            day: "2-digit", 
                            month: "2-digit", 
                            hour: "2-digit", 
                            minute: "2-digit" 
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={audit.chat_type === "health" ? "default" : "secondary"}>
                        {audit.chat_type === "health" ? "Saúde" : "Estudo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={audit.user_query}>
                      {audit.user_query.substring(0, 50)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {audit.suggestions_generated?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {audit.has_rag_context ? (
                        <FileText className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {audit.coherence_validated === true && (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                      {audit.coherence_validated === false && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {audit.coherence_validated === null && (
                        <Clock className="w-4 h-4 text-amber-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      {audit.coherence_score !== null ? (
                        <span className={`font-medium ${
                          audit.coherence_score >= 7 ? "text-emerald-500" :
                          audit.coherence_score >= 4 ? "text-amber-500" : "text-red-500"
                        }`}>
                          {audit.coherence_score}/10
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedAudit(audit);
                          setValidationScore(audit.coherence_score || 5);
                          setAdminFeedback(audit.admin_feedback || "");
                        }}
                      >
                        Validar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Validation Dialog */}
      <Dialog open={!!selectedAudit} onOpenChange={() => setSelectedAudit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Validar Coerência de Sugestões</DialogTitle>
            <DialogDescription>
              Analise se as sugestões geradas são contextualmente coerentes com a query do usuário.
            </DialogDescription>
          </DialogHeader>

          {selectedAudit && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Query do usuário:</p>
                <p className="font-medium">{selectedAudit.user_query}</p>
              </div>

              {selectedAudit.ai_response_preview && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Preview da resposta:</p>
                  <p className="text-sm">{selectedAudit.ai_response_preview}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-2">Sugestões geradas:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedAudit.suggestions_generated?.map((suggestion, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {suggestion}
                    </Badge>
                  )) || <span className="text-muted-foreground">Nenhuma</span>}
                </div>
              </div>

              {selectedAudit.has_rag_context && selectedAudit.rag_documents_used && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Documentos RAG usados:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAudit.rag_documents_used.map((doc, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        {doc}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Score de Coerência</p>
                  <span className={`text-lg font-bold ${
                    validationScore >= 7 ? "text-emerald-500" :
                    validationScore >= 4 ? "text-amber-500" : "text-red-500"
                  }`}>
                    {validationScore}/10
                  </span>
                </div>
                <Slider
                  value={[validationScore]}
                  onValueChange={([val]) => setValidationScore(val)}
                  min={0}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Incoerente</span>
                  <span>Parcial</span>
                  <span>Coerente</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Feedback (opcional)</p>
                <Textarea
                  placeholder="Observações sobre a coerência das sugestões..."
                  value={adminFeedback}
                  onChange={(e) => setAdminFeedback(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedAudit(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleValidate(false)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Marcar Incoerente
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleValidate(true)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Validar Coerente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
