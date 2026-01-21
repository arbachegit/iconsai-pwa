import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/date-utils";
import { toast } from "sonner";
import { InviteTrackingTimeline } from "./InviteTrackingTimeline";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResendInvitationModal } from "./ResendInvitationModal";
import { EditInvitationModal } from "./EditInvitationModal";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  MessageSquare,
  Clock,
  XCircle,
  Send,
  Trash2,
  AlertCircle,
  Monitor,
  Smartphone,
  Pencil
} from "lucide-react";

type AppRole = "user" | "admin" | "superadmin";

interface UserInvitation {
  id: string;
  token: string;
  name: string;
  email: string;
  role: AppRole;
  status: string;
  created_at: string;
  expires_at: string;
  verification_method: string | null;
  // Tracking fields
  email_sent_at: string | null;
  whatsapp_sent_at: string | null;
  email_opened_at: string | null;
  whatsapp_opened_at: string | null;
  link_opened_at: string | null;
  form_started_at: string | null;
  verification_sent_at: string | null;
  completed_at: string | null;
  phone: string | null;
  pwa_access: string[] | null;
  // New access fields
  has_platform_access: boolean | null;
  has_app_access: boolean | null;
}

const ROLE_CONFIG: Record<AppRole, { color: string; label: string }> = {
  user: { color: "bg-blue-500", label: "Usuário" },
  admin: { color: "bg-purple-500", label: "Admin" },
  superadmin: { color: "bg-rose-500", label: "Super Admin" },
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-amber-500", label: "Pendente" },
  sent: { color: "bg-blue-500", label: "Enviado" },
  opened: { color: "bg-cyan-500", label: "Aberto" },
  in_progress: { color: "bg-purple-500", label: "Em Progresso" },
  completed: { color: "bg-emerald-500", label: "Completo" },
  expired: { color: "bg-red-500", label: "Expirado" },
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

export const InvitesTab = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; invite: UserInvitation | null }>({ open: false, invite: null });
  const [resendModal, setResendModal] = useState<{ open: boolean; invite: UserInvitation | null }>({ open: false, invite: null });
  const [editModal, setEditModal] = useState<{ open: boolean; invite: UserInvitation | null }>({ open: false, invite: null });
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Fetch invitations
  const { data: invitations, isLoading, refetch } = useQuery({
    queryKey: ["user-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_invitations")
        .select("*")
        .neq("status", "completed")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as UserInvitation[];
    },
  });

  // Handle sort toggle
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Filter and sort invitations
  const filteredInvitations = useMemo(() => {
    if (!invitations) return [];
    
    let filtered = invitations.filter(inv => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!inv.name.toLowerCase().includes(query) && !inv.email.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Role filter
      if (roleFilter !== "all" && inv.role !== roleFilter) return false;
      
      // Status filter
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      
      return true;
    });

    // Apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | Date;
        let bValue: string | Date;
        
        switch (sortConfig.key) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'email':
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case 'phone':
            aValue = (a.phone || "").toLowerCase();
            bValue = (b.phone || "").toLowerCase();
            break;
          case 'date':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          case 'role':
            aValue = a.role;
            bValue = b.role;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [invitations, searchQuery, roleFilter, statusFilter, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredInvitations.length / itemsPerPage);
  const paginatedInvitations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvitations.slice(start, start + itemsPerPage);
  }, [filteredInvitations, currentPage, itemsPerPage]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_invitations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-invitations"] });
      setDeleteModal({ open: false, invite: null });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir convite: ${error.message}`);
    }
  });

  // Handle resend modal success
  const handleResendSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["user-invitations"] });
  };

  const renderRoleBadge = (role: AppRole) => {
    const config = ROLE_CONFIG[role];
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { color: "bg-gray-500", label: status };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const SortableHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <TableHead 
      className="cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig?.key === sortKey ? (
          sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
      </div>
    </TableHead>
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9"
            />
          </div>
          
          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Roles</SelectItem>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="superadmin">Super Admin</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="opened">Aberto</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Items per page */}
          <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map(n => (
                <SelectItem key={n} value={String(n)}>{n} / pág</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Refresh */}
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : paginatedInvitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Send className="w-12 h-12 mb-4 opacity-50" />
            <p>Nenhum convite pendente encontrado</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <SortableHeader label="Nome" sortKey="name" />
                  <SortableHeader label="Email" sortKey="email" />
                  <SortableHeader label="Telefone" sortKey="phone" />
                  <TableHead>Acesso</TableHead>
                  <SortableHeader label="Data Envio" sortKey="date" />
                  <SortableHeader label="Role" sortKey="role" />
                  <SortableHeader label="Status" sortKey="status" />
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvitations.map((invite) => (
                  <Collapsible key={invite.id} asChild open={expandedRows.has(invite.id)}>
                    <>
                      <TableRow className="group">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => toggleRow(invite.id)}
                            >
                              {expandedRows.has(invite.id) ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-medium">{invite.name}</TableCell>
                        <TableCell>{invite.email}</TableCell>
                        <TableCell>{invite.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {invite.has_platform_access && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="gap-1 text-xs px-1.5">
                                      <Monitor className="w-3 h-3" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>Plataforma (Computador/Tablet)</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {invite.has_app_access && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="gap-1 text-xs px-1.5 border-emerald-500 text-emerald-600">
                                      <Smartphone className="w-3 h-3" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>APP (Celular via WhatsApp)</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {!invite.has_platform_access && !invite.has_app_access && (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(invite.created_at).split(' ')[0]}</TableCell>
                        <TableCell>{renderRoleBadge(invite.role)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {renderStatusBadge(invite.status)}
                            {invite.verification_method && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                {invite.verification_method === 'email' ? (
                                  <Mail className="w-3 h-3" />
                                ) : (
                                  <MessageSquare className="w-3 h-3" />
                                )}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                    onClick={() => setEditModal({ open: true, invite })}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar convite</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                    onClick={() => setResendModal({ open: true, invite })}
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="flex items-center gap-1">
                                    Reenviar convite
                                    {invite.verification_method === 'email' ? (
                                      <Mail className="w-3 h-3" />
                                    ) : invite.verification_method === 'whatsapp' ? (
                                      <MessageSquare className="w-3 h-3" />
                                    ) : null}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    onClick={() => setDeleteModal({ open: true, invite })}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Excluir convite</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={9} className="p-0">
                            <div className="px-6 py-4">
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                Tracking do Convite
                              </h4>
                              <InviteTrackingTimeline
                                emailSentAt={invite.email_sent_at}
                                whatsappSentAt={invite.whatsapp_sent_at}
                                emailOpenedAt={invite.email_opened_at}
                                whatsappOpenedAt={invite.whatsapp_opened_at}
                                linkOpenedAt={invite.link_opened_at}
                                formStartedAt={invite.form_started_at}
                                verificationSentAt={invite.verification_sent_at}
                                completedAt={invite.completed_at}
                              />
                              {new Date(invite.expires_at) < new Date() && (
                                <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                                  <XCircle className="w-4 h-4" />
                                  Convite expirado em {formatDateTime(invite.expires_at)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredInvitations.length)} de {filteredInvitations.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, invite: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o convite para {deleteModal.invite?.email}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, invite: null })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteModal.invite && deleteMutation.mutate(deleteModal.invite.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend Modal with Product/Channel Selection */}
      <ResendInvitationModal
        open={resendModal.open}
        onClose={() => setResendModal({ open: false, invite: null })}
        invitation={resendModal.invite}
        onSuccess={handleResendSuccess}
      />

      {/* Edit Modal */}
      <EditInvitationModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, invite: null })}
        invitation={editModal.invite}
        onSuccess={handleResendSuccess}
      />
    </Card>
  );
};

export default InvitesTab;
