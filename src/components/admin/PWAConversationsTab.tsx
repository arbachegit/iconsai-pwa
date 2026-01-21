import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PWAModuleBadges } from './pwa-conversations/PWAModuleBadges';
import { PWAConversationModal } from './pwa-conversations/PWAConversationModal';
import { TaxonomyAutocomplete } from './pwa-conversations/TaxonomyAutocomplete';
import { KeyTopicsAutocomplete } from './pwa-conversations/KeyTopicsAutocomplete';
import { usePWAConversations } from '@/hooks/usePWAConversations';
import type { PWAModuleType, SortDirection } from '@/types/pwa-conversations';
import { extractCompanyFromEmail } from '@/types/pwa-conversations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MessageSquareMore, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Search, 
  User, 
  Building2,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface ModalState {
  isOpen: boolean;
  deviceId: string;
  moduleType: PWAModuleType;
  userName?: string;
}

type SortColumn = 'user_name' | 'company' | 'last_activity';

export const PWAConversationsTab = () => {
  const { 
    users, 
    isLoading, 
    totalUsers, 
    currentPage, 
    pageSize, 
    taxonomySuggestions, 
    keyTopicsSuggestions, 
    setFilters, 
    setSortConfig,
    setCurrentPage, 
    setPageSize, 
    fetchTaxonomySuggestions, 
    fetchKeyTopicsSuggestions, 
    refreshData 
  } = usePWAConversations();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedModal, setSelectedModal] = useState<ModalState>({ 
    isOpen: false, 
    deviceId: '', 
    moduleType: 'world' 
  });
  
  // Filter states
  const [searchName, setSearchName] = useState('');
  const [searchCompany, setSearchCompany] = useState('');
  const [searchTaxonomy, setSearchTaxonomy] = useState<string[]>([]);
  const [searchKeyTopics, setSearchKeyTopics] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Sort states
  const [sortColumn, setSortColumn] = useState<SortColumn>('last_activity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSort = (column: SortColumn) => {
    const newDirection: SortDirection = sortColumn === column && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortColumn(column);
    setSortDirection(newDirection);
    setSortConfig({ column, direction: newDirection });
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" /> 
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const handleApplyFilters = () => {
    setFilters({ 
      search: searchName || undefined, 
      company: searchCompany || undefined,
      taxonomyTags: searchTaxonomy.length > 0 ? searchTaxonomy : undefined,
      keyTopics: searchKeyTopics.length > 0 ? searchKeyTopics : undefined,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
    });
  };

  const handleModuleClick = (deviceId: string, moduleType: PWAModuleType, userName?: string) => {
    setSelectedModal({ 
      isOpen: true, 
      deviceId, 
      moduleType, 
      userName 
    });
  };

  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquareMore className="w-6 h-6 text-primary" />
              <div>
              <h2 className="text-xl font-bold">Conversas PWA</h2>
                <CardDescription>
                  Histórico completo de interações por voz no PWA
                </CardDescription>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Nome
              </label>
              <Input
                placeholder="Buscar por nome..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Empresa
              </label>
              <Input
                placeholder="Buscar por empresa..."
                value={searchCompany}
                onChange={(e) => setSearchCompany(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Data Início
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Data Fim
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5">Taxonomia</label>
              <TaxonomyAutocomplete
                value={searchTaxonomy}
                onChange={setSearchTaxonomy}
                suggestions={taxonomySuggestions}
                onSearch={fetchTaxonomySuggestions}
                className="h-9"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5">Temas-Chave</label>
              <KeyTopicsAutocomplete
                value={searchKeyTopics}
                onChange={setSearchKeyTopics}
                suggestions={keyTopicsSuggestions}
                onSearch={fetchKeyTopicsSuggestions}
                className="h-9"
              />
            </div>
          </div>
          
          <Button onClick={handleApplyFilters} size="sm" className="mb-4">
            <Search className="w-4 h-4 mr-2" />
            Aplicar Filtros
          </Button>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MessageSquareMore className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma conversa encontrada</p>
              <p className="text-sm">As conversas do PWA aparecerão aqui</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="w-[200px] cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('user_name')}
                    >
                      <div className="flex items-center">
                        Nome do Usuário
                        {getSortIcon('user_name')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[200px]">Email</TableHead>
                    <TableHead 
                      className="w-[150px] cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('company')}
                    >
                      <div className="flex items-center">
                        Empresa
                        {getSortIcon('company')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[80px] text-center">Sessões</TableHead>
                    <TableHead 
                      className="w-[150px] cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('last_activity')}
                    >
                      <div className="flex items-center">
                        Última Atividade
                        {getSortIcon('last_activity')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <Collapsible 
                      key={user.device_id} 
                      open={expandedRows.has(user.device_id)}
                      onOpenChange={() => toggleRow(user.device_id)}
                      asChild
                    >
                      <>
                        <CollapsibleTrigger asChild>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {user.user_name || 'Anônimo'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.user_email || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.company || extractCompanyFromEmail(user.user_email).company}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                {user.total_sessions}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(user.last_activity), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {expandedRows.has(user.device_id) 
                                ? <ChevronUp className="w-4 h-4" /> 
                                : <ChevronDown className="w-4 h-4" />
                              }
                            </TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={6} className="py-4">
                              <div className="pl-4">
                                <p className="text-sm text-muted-foreground mb-2">
                                  Módulos utilizados:
                                </p>
                                <PWAModuleBadges 
                                  modulesUsed={user.modules_used} 
                                  onModuleClick={(mt) => handleModuleClick(
                                    user.device_id, 
                                    mt, 
                                    user.user_name || undefined
                                  )} 
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalUsers > 0 && (
            <div className="flex items-center justify-between mt-4">
              <Select 
                value={pageSize.toString()} 
                onValueChange={(v) => { 
                  setPageSize(Number(v)); 
                  setCurrentPage(1); 
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                  {currentPage} / {totalPages || 1}
                </span>
                
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <PWAConversationModal 
        isOpen={selectedModal.isOpen} 
        onClose={() => setSelectedModal(prev => ({ ...prev, isOpen: false }))} 
        deviceId={selectedModal.deviceId} 
        moduleType={selectedModal.moduleType} 
        userName={selectedModal.userName} 
      />
    </div>
  );
};

export default PWAConversationsTab;
