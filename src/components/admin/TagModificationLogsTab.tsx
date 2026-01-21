import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Merge, 
  Search, 
  FileText, 
  Tag, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Heart,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { formatDateTime } from "@/lib/date-utils";
import { exportData, type ExportFormat } from "@/lib/export-utils";
import { toast } from "sonner";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";

interface TagModificationLog {
  id: string;
  document_id: string | null;
  document_filename: string;
  original_tag_name: string;
  new_tag_name: string;
  modification_type: string;
  merge_rule_id: string | null;
  chat_type: string | null;
  created_at: string;
  created_by: string | null;
}

export const TagModificationLogsTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterChat, setFilterChat] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch modification logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["tag-modification-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tag_modification_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TagModificationLog[];
    },
  });

  // Filter logs
  const filteredLogs = logs?.filter(log => {
    const matchesSearch = 
      log.document_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.original_tag_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.new_tag_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || log.modification_type === filterType;
    const matchesChat = filterChat === "all" || log.chat_type === filterChat;
    
    return matchesSearch && matchesType && matchesChat;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: logs?.length || 0,
    merges: logs?.filter(l => l.modification_type === "merge").length || 0,
    documentsAffected: new Set(logs?.map(l => l.document_id)).size,
    today: logs?.filter(l => {
      const logDate = new Date(l.created_at);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length || 0,
  };

  const handleExport = (format: ExportFormat) => {
    if (!filteredLogs.length) {
      toast.error("Nenhum log para exportar");
      return;
    }

    const exportRows = filteredLogs.map(log => ({
      "Data/Hora": format === "csv" 
        ? new Date(log.created_at).toISOString() 
        : format === "json" 
          ? log.created_at 
          : new Date(log.created_at).toLocaleString("pt-BR"),
      "Documento": log.document_filename,
      "Tag Original": log.original_tag_name,
      "Nova Tag": log.new_tag_name,
      "Tipo": log.modification_type,
      "Chat": log.chat_type || "-",
      "Executado Por": log.created_by || "system",
    }));

    exportData({ 
      filename: `tag-modification-logs-${Date.now()}`, 
      data: exportRows, 
      format 
    });
    toast.success(`Exportado como ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo
        icon={Merge}
        title="Logs de Modificação de Tags"
        level="h1"
        tooltipText="Histórico de mesclas e atualizações automáticas de tags nos documentos"
        infoContent={
          <div className="space-y-2">
            <p>Este painel exibe o histórico completo de modificações de tags realizadas nos documentos.</p>
            <p><strong>Tipos de modificação:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Mescla:</strong> Quando tags duplicadas são unificadas</li>
              <li><strong>Renomeação:</strong> Quando uma tag é renomeada</li>
              <li><strong>Atualização Automática:</strong> Quando o sistema aplica regras de merge</li>
            </ul>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Merge className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Modificações</p>
              <p className="text-2xl font-bold text-purple-400">{stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Tag className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mesclas Realizadas</p>
              <p className="text-2xl font-bold text-blue-400">{stats.merges}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <FileText className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Documentos Afetados</p>
              <p className="text-2xl font-bold text-green-400">{stats.documentsAffected}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Calendar className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Modificações Hoje</p>
              <p className="text-2xl font-bold text-amber-400">{stats.today}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por documento ou tag..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="merge">Mescla</SelectItem>
              <SelectItem value="rename">Renomeação</SelectItem>
              <SelectItem value="auto_update">Atualização Auto</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterChat} onValueChange={(v) => { setFilterChat(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Chat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Chats</SelectItem>
              <SelectItem value="health">
                <span className="flex items-center gap-2">
                  <Heart className="h-3 w-3 text-red-400" /> Health
                </span>
              </SelectItem>
              <SelectItem value="study">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3 text-blue-400" /> Study
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[180px]">Data/Hora</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Tag Original</TableHead>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Nova Tag</TableHead>
                <TableHead className="w-[100px]">Tipo</TableHead>
                <TableHead className="w-[80px]">Chat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Merge className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum log de modificação encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]" title={log.document_filename}>
                          {log.document_filename}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                        {log.original_tag_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                        {log.new_tag_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={
                          log.modification_type === "merge" 
                            ? "bg-purple-500/20 text-purple-400"
                            : log.modification_type === "rename"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-amber-500/20 text-amber-400"
                        }
                      >
                        {log.modification_type === "merge" && <Merge className="h-3 w-3 mr-1" />}
                        {log.modification_type === "merge" ? "Mescla" : 
                         log.modification_type === "rename" ? "Renomeação" : "Auto"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.chat_type && (
                        <Badge variant="outline" className={
                          log.chat_type === "health" 
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }>
                          {log.chat_type === "health" ? (
                            <Heart className="h-3 w-3 mr-1" />
                          ) : (
                            <BookOpen className="h-3 w-3 mr-1" />
                          )}
                          {log.chat_type}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} de {filteredLogs.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
