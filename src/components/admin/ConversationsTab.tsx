import { useState, useEffect, useCallback } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Trash2, ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, FileJson, FileDown, ChevronDown, MessageSquare, User, Bot, BookOpen, Heart, Smile, Frown, Meh, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportData, type ExportFormat } from "@/lib/export-utils";
import { AudioControls } from "@/components/AudioControls";
import { MarkdownContent } from "@/components/MarkdownContent";

export const ConversationsTab = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [chatTypeFilter, setChatTypeFilter] = useState<"all" | "health" | "study">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);
  const [playingAudioIdx, setPlayingAudioIdx] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from("conversation_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return;
    }

    setConversations(data || []);
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase
      .from("conversation_history")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao deletar conversa");
      return;
    }

    toast.success("Conversa deletada com sucesso");
    fetchConversations();
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.session_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = chatTypeFilter === "all" || 
      (conv.chat_type || 'health') === chatTypeFilter;
    
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedConversations = filteredConversations.slice(startIndex, startIndex + itemsPerPage);

  const handleExport = async (format: ExportFormat) => {
    const exportColumns = [
      { key: 'session_id', label: 'Session ID' },
      { key: 'title', label: 'Título' },
      { key: 'chat_type', label: 'Tipo de Chat' },
      { key: 'created_at', label: 'Data de Criação' },
      { key: 'sentiment_label', label: 'Sentimento' },
      { key: 'sentiment_score', label: 'Score' },
    ];

    const exportableData = filteredConversations.map(conv => ({
      session_id: conv.session_id,
      title: conv.title,
      chat_type: conv.chat_type || 'N/A',
      created_at: new Date(conv.created_at).toLocaleString('pt-BR'),
      sentiment_label: conv.sentiment_label || 'N/A',
      sentiment_score: conv.sentiment_score?.toFixed(2) || 'N/A',
    }));

    try {
      await exportData({
        filename: 'conversas',
        data: exportableData,
        format,
        columns: exportColumns,
      });
      toast.success(`Dados exportados em formato ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Erro ao exportar dados");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <AdminTitleWithInfo
                title="Conversas Salvas"
                level="h2"
                icon={MessageSquare}
                tooltipText="Histórico de conversas"
                infoContent={
                  <>
                    <p>Visualize e gerencie todas as conversas salvas.</p>
                    <p className="mt-2">Filtre por tipo de chat, exporte dados e analise sentimentos.</p>
                  </>
                }
              />
              <CardDescription className="mt-2">
                Visualize e gerencie o histórico de conversas dos usuários
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <FileJson className="h-4 w-4 mr-2" /> JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileDown className="h-4 w-4 mr-2" /> PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <DebouncedInput
                placeholder="Buscar por título ou ID da sessão..."
                value={searchTerm}
                onChange={setSearchTerm}
                delay={300}
                className="w-full"
              />
            </div>
            <Select value={chatTypeFilter} onValueChange={(value: any) => setChatTypeFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de chat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="health">Saúde</SelectItem>
                <SelectItem value="study">Estudo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {paginatedConversations.map((conv) => {
              const SentimentIcon = conv.sentiment_label === 'positive' ? Smile : 
                                     conv.sentiment_label === 'negative' ? Frown : Meh;
              
              return (
                <Card key={conv.id}>
                  <CardContent className="p-4">
                    <Collapsible
                      open={expandedConvId === conv.id}
                      onOpenChange={(open) => setExpandedConvId(open ? conv.id : null)}
                    >
                      {/* Card Principal - Informações Essenciais */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex-1">
                            <h3 className="font-semibold">{conv.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(conv.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <Badge 
                            variant={(conv.chat_type || 'health') === 'study' ? 'default' : (conv.chat_type === 'economia' ? 'outline' : 'secondary')} 
                            className="flex items-center gap-1"
                          >
                            {(conv.chat_type || 'health') === 'study' ? (
                              <><BookOpen className="h-3 w-3" /> Estudo</>
                            ) : conv.chat_type === 'economia' ? (
                              <><TrendingUp className="h-3 w-3" /> Economia</>
                            ) : (
                              <><Heart className="h-3 w-3" /> Saúde</>
                            )}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                                expandedConvId === conv.id ? 'rotate-180' : ''
                              }`} />
                              <span className="ml-2">Detalhes</span>
                            </Button>
                          </CollapsibleTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Conteúdo Colapsável - Detalhes Técnicos */}
                      <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {/* Grid de Métricas */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* ID da Sessão */}
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">ID da Sessão</p>
                              <p className="text-sm font-mono truncate" title={conv.session_id}>
                                {conv.session_id}
                              </p>
                            </div>
                            
                            {/* Quantidade de Mensagens */}
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Mensagens</p>
                              <p className="text-lg font-semibold">{conv.messages?.length || 0}</p>
                            </div>
                            
                            {/* Sentimento */}
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Sentimento</p>
                              <div className="flex items-center gap-2">
                                <SentimentIcon className="h-4 w-4" />
                                <span className="capitalize text-sm">{conv.sentiment_label || 'N/A'}</span>
                              </div>
                            </div>
                            
                            {/* Score de Sentimento */}
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Score</p>
                              <div className="flex items-center gap-2">
                                <Progress value={(conv.sentiment_score || 0) * 100} className="h-2 flex-1" />
                                <span className="text-sm font-medium">
                                  {((conv.sentiment_score || 0) * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                    </div>
                    
                    {/* Conversa Completa Inline */}
                    <div className="border-2 border-[hsl(var(--chat-container-border))] bg-[hsl(var(--chat-container-bg))] rounded-lg shadow-[inset_0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_3px_rgba(0,0,0,0.3)]">
                      <div className="p-3 bg-muted/50 border-b flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Conversa Completa
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {conv.messages?.length || 0} mensagens
                        </span>
                      </div>
                      
                      <ScrollArea className="h-[300px] p-3">
                        <div className="space-y-3">
                          {conv.messages?.map((msg: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg ${
                                msg.role === 'user' 
                                  ? 'bg-[hsl(var(--chat-message-user-bg))] text-primary-foreground' 
                                  : 'bg-[hsl(var(--chat-message-ai-bg))] text-foreground'
                              }`}
                            >
                              <p className="text-xs font-medium mb-1 flex items-center gap-2 opacity-90">
                                {msg.role === 'user' ? (
                                  <>
                                    <User className="h-3 w-3" />
                                    Usuário
                                  </>
                                ) : (
                                  <>
                                    <Bot className="h-3 w-3" />
                                    Assistente
                                  </>
                                )}
                              </p>
                              <MarkdownContent content={msg.content} className="text-sm text-left" />
                              
                               {msg.role === 'assistant' && (
                                 <div className="mt-3 pt-3 border-t border-border/30">
                                   <AudioControls
                                     audioUrl={msg.audioUrl}
                                     isPlaying={playingAudioIdx === `${conv.id}-${idx}`}
                                     timestamp={msg.timestamp ? new Date(msg.timestamp) : undefined}
                                     location={msg.location || undefined}
                                     messageContent={msg.content}
                                     onPlay={() => setPlayingAudioIdx(`${conv.id}-${idx}`)}
                                     onStop={() => setPlayingAudioIdx(null)}
                                     onDownload={() => {
                                       if (msg.audioUrl) {
                                         const link = document.createElement('a');
                                         link.href = msg.audioUrl;
                                         link.download = `audio-${conv.id}-${idx}.mp3`;
                                         link.click();
                                       }
                                     }}
                                     onCopy={() => {
                                       navigator.clipboard.writeText(msg.content);
                                       toast.success("Texto copiado!");
                                     }}
                                   />
                                 </div>
                               )}
                              
                              {msg.timestamp && (
                                <span className="text-xs opacity-70 block mt-2">
                                  {new Date(msg.timestamp).toLocaleString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredConversations.length)} de {filteredConversations.length}
              </span>
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationsTab;