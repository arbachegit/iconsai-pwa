import { useState, useMemo, useEffect, useCallback } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseUntyped } from "@/integrations/supabase/typed-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Mail, 
  Search, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare,
  Calendar,
  Download,
  RefreshCw,
  Reply,
  Send,
  Bell,
  FileText,
  ChevronDown,
  Plus,
  Edit,
  Settings
} from "lucide-react";

interface ReplyTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables_used: string[];
  is_active: boolean;
  display_order: number;
}

export const ContactMessagesTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  
  // Template management state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateContent, setTemplateContent] = useState("");

  // Available variables for templates
  const availableVariables = [
    { key: 'nome', description: 'Nome extraído do email (antes do @)' },
    { key: 'email', description: 'Email do remetente' },
    { key: 'assunto', description: 'Assunto da mensagem original' },
  ];

  // Fetch templates from database
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['reply-templates'],
    queryFn: async () => {
      const { data, error } = await supabaseUntyped
        .from('reply_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as ReplyTemplate[];
    }
  });

  // Replace variables in template
  const replaceVariables = (text: string, message: any) => {
    if (!message) return text;
    
    const nome = message.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    return text
      .replace(/\{\{nome\}\}/gi, nome)
      .replace(/\{\{email\}\}/gi, message.email)
      .replace(/\{\{assunto\}\}/gi, message.subject);
  };

  const applyTemplate = (template: ReplyTemplate) => {
    if (!replyToMessage) return;
    setReplySubject(replaceVariables(template.subject, replyToMessage));
    setReplyContent(replaceVariables(template.content, replyToMessage));
  };

  // Template CRUD mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (template: { name: string; subject: string; content: string }) => {
      const variablesUsed = [];
      if (template.content.includes('{{nome}}') || template.subject.includes('{{nome}}')) variablesUsed.push('nome');
      if (template.content.includes('{{email}}') || template.subject.includes('{{email}}')) variablesUsed.push('email');
      if (template.content.includes('{{assunto}}') || template.subject.includes('{{assunto}}')) variablesUsed.push('assunto');
      
      const { error } = await supabase
        .from('reply_templates')
        .insert({
          name: template.name,
          subject: template.subject,
          content: template.content,
          variables_used: variablesUsed,
          display_order: (templates?.length || 0) + 1
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reply-templates'] });
      toast({ title: "Template criado com sucesso" });
      closeTemplateDialog();
    },
    onError: () => {
      toast({ title: "Erro ao criar template", variant: "destructive" });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (template: { id: string; name: string; subject: string; content: string }) => {
      const variablesUsed = [];
      if (template.content.includes('{{nome}}') || template.subject.includes('{{nome}}')) variablesUsed.push('nome');
      if (template.content.includes('{{email}}') || template.subject.includes('{{email}}')) variablesUsed.push('email');
      if (template.content.includes('{{assunto}}') || template.subject.includes('{{assunto}}')) variablesUsed.push('assunto');
      
      const { error } = await supabase
        .from('reply_templates')
        .update({
          name: template.name,
          subject: template.subject,
          content: template.content,
          variables_used: variablesUsed
        })
        .eq('id', template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reply-templates'] });
      toast({ title: "Template atualizado com sucesso" });
      closeTemplateDialog();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar template", variant: "destructive" });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reply_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reply-templates'] });
      toast({ title: "Template excluído com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir template", variant: "destructive" });
    }
  });

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateSubject("");
    setTemplateContent("");
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (template: ReplyTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateSubject(template.subject);
    setTemplateContent(template.content);
    setTemplateDialogOpen(true);
  };

  const closeTemplateDialog = () => {
    setTemplateDialogOpen(false);
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateSubject("");
    setTemplateContent("");
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !templateSubject.trim() || !templateContent.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    
    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        name: templateName,
        subject: templateSubject,
        content: templateContent
      });
    } else {
      createTemplateMutation.mutate({
        name: templateName,
        subject: templateSubject,
        content: templateContent
      });
    }
  };

  const insertVariable = (variable: string, field: 'subject' | 'content') => {
    const tag = `{{${variable}}}`;
    if (field === 'subject') {
      setTemplateSubject(prev => prev + tag);
    } else {
      setTemplateContent(prev => prev + tag);
    }
  };

  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ['contact-messages'],
    queryFn: async () => {
      const { data, error } = await supabaseUntyped
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    }
  });

  // Real-time subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel('contact-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_messages'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
          
          toast({
            title: "📬 Nova mensagem de contato!",
            description: `De: ${payload.new.email} - ${payload.new.subject}`,
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      toast({ title: "Mensagem excluída com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir mensagem", variant: "destructive" });
    }
  });

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    
    return messages.filter(msg => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.message.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== "all") {
        const msgDate = new Date(msg.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            matchesDate = msgDate >= startOfDay(now) && msgDate <= endOfDay(now);
            break;
          case "week":
            matchesDate = msgDate >= subDays(now, 7);
            break;
          case "month":
            matchesDate = msgDate >= subDays(now, 30);
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [messages, searchTerm, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    if (!messages) return { total: 0, sent: 0, pending: 0, failed: 0 };
    
    return {
      total: messages.length,
      sent: messages.filter(m => m.status === 'sent').length,
      pending: messages.filter(m => m.status === 'pending').length,
      failed: messages.filter(m => m.status === 'failed').length,
    };
  }, [messages]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Enviado</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>;
      case 'replied':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Reply className="w-3 h-3 mr-1" /> Respondido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openReplyDialog = (msg: any) => {
    setReplyToMessage(msg);
    setReplySubject(`Re: ${msg.subject}`);
    setReplyContent("");
    setReplyDialogOpen(true);
  };

  const handleSendReply = async () => {
    if (!replyToMessage || !replyContent.trim()) return;
    
    setIsSendingReply(true);
    try {
      const siteUrl = window.location.origin;
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: replyToMessage.email,
          subject: replySubject,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
              <!-- Header -->
              <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">KnowYOU AI</h1>
              </div>
              
              <!-- Corpo -->
              <div style="padding: 30px; background: #ffffff;">
                <div style="color: #334155;">${replyContent.replace(/\n/g, '<br>')}</div>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #64748b; font-size: 12px; font-style: italic;">
                  Em resposta à sua mensagem: "${replyToMessage.subject}"
                </p>
                
                <!-- Return Link Block -->
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center;">
                  <p style="color: #0369a1; margin: 0 0 12px 0; font-weight: 500;">📲 Para continuar a conversa:</p>
                  <a href="${siteUrl}/contact" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Acessar Mensagens
                  </a>
                  <p style="color: #64748b; font-size: 11px; margin: 12px 0 0 0;">
                    Clique no botão acima para retornar à tela de mensagens
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="text-align: center; padding: 16px; background: #f1f5f9; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} KnowYOU AI
                </p>
              </div>
            </div>
          `,
        },
      });

      if (error) throw error;

      // Update message status to 'replied'
      await supabase
        .from('contact_messages')
        .update({ 
          status: 'replied',
          metadata: {
            ...replyToMessage.metadata,
            replied_at: new Date().toISOString(),
            reply_subject: replySubject
          }
        })
        .eq('id', replyToMessage.id);

      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      
      toast({ title: "Resposta enviada com sucesso!" });
      setReplyDialogOpen(false);
      setReplyToMessage(null);
      setReplySubject("");
      setReplyContent("");
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({ 
        title: "Erro ao enviar resposta", 
        description: "Tente novamente mais tarde",
        variant: "destructive" 
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const exportToCSV = () => {
    if (!filteredMessages.length) return;
    
    const headers = ['Email', 'Assunto', 'Mensagem', 'Status', 'Data Criação', 'Data Envio'];
    const rows = filteredMessages.map(msg => [
      msg.email,
      msg.subject,
      msg.message.replace(/"/g, '""'),
      msg.status,
      format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      msg.sent_at ? format(new Date(msg.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mensagens-contato-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast({ title: "CSV exportado com sucesso" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Mensagens de Contato
          </h2>
          <p className="text-muted-foreground">Histórico de mensagens enviadas pelo formulário de contato</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviados</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.sent}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500/60" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500/60" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Falharam</p>
                <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, assunto ou mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="sent">Enviados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="failed">Falharam</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={exportToCSV} disabled={!filteredMessages.length}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Mensagens ({filteredMessages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma mensagem encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-medium">{msg.email}</TableCell>
                    <TableCell className="max-w-xs truncate">{msg.subject}</TableCell>
                    <TableCell>{getStatusBadge(msg.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver detalhes"
                          onClick={() => setSelectedMessage(msg)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Responder"
                          className="text-blue-500 hover:text-blue-600"
                          onClick={() => openReplyDialog(msg)}
                        >
                          <Reply className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(msg.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Mensagem</DialogTitle>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedMessage.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedMessage.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Envio</p>
                  <p className="font-medium">
                    {format(new Date(selectedMessage.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {selectedMessage.sent_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Processado em</p>
                    <p className="font-medium">
                      {format(new Date(selectedMessage.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Assunto</p>
                <p className="font-medium">{selectedMessage.subject}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Mensagem</p>
                <div className="bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>
              
              {selectedMessage.metadata && Object.keys(selectedMessage.metadata).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Metadados</p>
                  <div className="bg-muted/50 p-4 rounded-lg text-sm font-mono">
                    <pre>{JSON.stringify(selectedMessage.metadata, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => {
                    setSelectedMessage(null);
                    openReplyDialog(selectedMessage);
                  }}
                  className="w-full"
                >
                  <Reply className="w-4 h-4 mr-2" />
                  Responder esta mensagem
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="w-5 h-5 text-primary" />
              Responder Mensagem
            </DialogTitle>
          </DialogHeader>
          
          {replyToMessage && (
            <div className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg text-sm">
                <p className="text-muted-foreground">Respondendo para:</p>
                <p className="font-medium">{replyToMessage.email}</p>
              </div>

              {/* Template selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Templates de Resposta
                  </label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={openCreateTemplate}
                    className="text-xs"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Gerenciar
                  </Button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between" disabled={templatesLoading}>
                      {templatesLoading ? "Carregando..." : "Selecionar template..."}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[400px]">
                    <DropdownMenuLabel className="flex items-center justify-between">
                      Templates disponíveis
                      <Badge variant="outline" className="text-xs">
                        Variáveis: {"{{nome}}, {{email}}, {{assunto}}"}
                      </Badge>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {templates?.map((template) => (
                      <DropdownMenuItem
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className="flex flex-col items-start gap-1 py-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full justify-between">
                          <span className="font-medium">{template.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditTemplate(template);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-full">
                          {template.content.substring(0, 60)}...
                        </span>
                        {template.variables_used?.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {template.variables_used.map(v => (
                              <Badge key={v} variant="secondary" className="text-[10px] px-1 py-0">
                                {`{{${v}}}`}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </DropdownMenuItem>
                    ))}
                    {(!templates || templates.length === 0) && (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        Nenhum template disponível
                      </div>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={openCreateTemplate} className="cursor-pointer">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar novo template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Assunto</label>
                <Input
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Assunto do email"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Mensagem</label>
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Digite sua resposta..."
                  className="min-h-[150px]"
                />
              </div>
              
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Mensagem original:</p>
                <p className="text-sm italic">"{replyToMessage.message.substring(0, 200)}{replyToMessage.message.length > 200 ? '...' : ''}"</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSendReply} 
              disabled={isSendingReply || !replyContent.trim()}
            >
              {isSendingReply ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Resposta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Management Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {editingTemplate ? "Editar Template" : "Criar Novo Template"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Variables helper */}
            <div className="bg-primary/10 p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">Variáveis disponíveis (clique para inserir):</p>
              <div className="flex gap-2 flex-wrap">
                {availableVariables.map(v => (
                  <div key={v.key} className="flex flex-col">
                    <div className="flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                        onClick={() => insertVariable(v.key, 'subject')}
                        title={`Inserir no assunto: ${v.description}`}
                      >
                        {`{{${v.key}}}`} → Assunto
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                        onClick={() => insertVariable(v.key, 'content')}
                        title={`Inserir no conteúdo: ${v.description}`}
                      >
                        {`{{${v.key}}}`} → Conteúdo
                      </Button>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{v.description}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Template</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Agradecimento, Suporte, etc."
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Assunto do Email</label>
              <Input
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                placeholder="Ex: Obrigado pelo seu contato, {{nome}}!"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Conteúdo do Email</label>
              <Textarea
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Olá {{nome}},&#10;&#10;Agradecemos pelo seu contato sobre &quot;{{assunto}}&quot;...&#10;&#10;Atenciosamente,&#10;Equipe KnowRISK"
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {editingTemplate && (
              <div className="pt-2 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja excluir este template?")) {
                      deleteTemplateMutation.mutate(editingTemplate.id);
                      closeTemplateDialog();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Template
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeTemplateDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveTemplate}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {editingTemplate ? "Atualizar" : "Criar Template"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
