import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PWAConversationSummary } from './PWAConversationSummary';
import { PWAConversationBlocks } from './PWAConversationBlocks';
import { TaxonomyAutocomplete } from './TaxonomyAutocomplete';
import { KeyTopicsAutocomplete } from './KeyTopicsAutocomplete';
import { usePWAConversations } from '@/hooks/usePWAConversations';
import type { PWAConversationModalProps, PWAConversationSession, PWASummaryFilters } from '@/types/pwa-conversations';
import { PWA_MODULES } from '@/types/pwa-conversations';
import { Globe, Heart, Lightbulb, Search, Filter, X, Calendar, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = { Globe, Heart, Lightbulb };

export const PWAConversationModal = ({ 
  isOpen, 
  onClose, 
  deviceId, 
  moduleType, 
  userName 
}: PWAConversationModalProps) => {
  const { 
    sessions, 
    isLoadingSessions, 
    fetchSessionsForUser,
    taxonomySuggestions,
    keyTopicsSuggestions,
    fetchTaxonomySuggestions,
    fetchKeyTopicsSuggestions
  } = usePWAConversations();
  
  const [summaryFilters, setSummaryFilters] = useState<PWASummaryFilters>({});
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [filterTaxonomy, setFilterTaxonomy] = useState<string[]>([]);
  const [filterKeyTopics, setFilterKeyTopics] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const sessionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const moduleConfig = PWA_MODULES.find(m => m.type === moduleType);
  const ModuleIcon = moduleConfig ? ICONS[moduleConfig.icon] : Globe;

  useEffect(() => {
    if (isOpen && deviceId) {
      fetchSessionsForUser(deviceId, moduleType);
      setSelectedSessionId(null);
      setFilterTaxonomy([]);
      setFilterKeyTopics([]);
      setSearchText('');
      setFilterDate('');
    }
  }, [isOpen, deviceId, moduleType, fetchSessionsForUser]);

  // Filtrar sessoes baseado nos filtros
  const filteredSessions = sessions.filter(session => {
    // Filtro por data
    if (filterDate) {
      const sessionDate = new Date(session.started_at).toISOString().split('T')[0];
      if (sessionDate !== filterDate) return false;
    }
    
    // Filtro por texto
    if (searchText) {
      const hasMatch = session.messages?.some(msg => 
        msg.content?.toLowerCase().includes(searchText.toLowerCase()) ||
        msg.transcription?.toLowerCase().includes(searchText.toLowerCase())
      );
      if (!hasMatch) return false;
    }
    
    // Filtro por taxonomia
    if (filterTaxonomy.length > 0) {
      const sessionTaxonomies = session.messages?.flatMap(m => m.taxonomy_tags || []) || [];
      const summaryTaxonomies = session.summary?.taxonomy_tags || [];
      const allTaxonomies = [...sessionTaxonomies, ...summaryTaxonomies];
      const hasMatch = filterTaxonomy.some(t => allTaxonomies.includes(t));
      if (!hasMatch) return false;
    }
    
    // Filtro por temas-chave
    if (filterKeyTopics.length > 0) {
      const allTopics: string[] = [];
      session.messages?.forEach(m => {
        if (m.key_topics) {
          allTopics.push(...(m.key_topics.people || []));
          allTopics.push(...(m.key_topics.countries || []));
          allTopics.push(...(m.key_topics.organizations || []));
        }
      });
      if (session.summary?.key_topics) {
        allTopics.push(...(session.summary.key_topics.people || []));
        allTopics.push(...(session.summary.key_topics.countries || []));
        allTopics.push(...(session.summary.key_topics.organizations || []));
      }
      const hasMatch = filterKeyTopics.some(t => allTopics.includes(t));
      if (!hasMatch) return false;
    }
    
    return true;
  });

  // Agrupar por data
  const sessionsByDate = filteredSessions.reduce((acc, session) => {
    const date = new Date(session.started_at).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, PWAConversationSession[]>);

  const scrollToSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const element = sessionRefs.current.get(sessionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const registerRef = (sessionId: string, element: HTMLDivElement | null) => {
    if (element) {
      sessionRefs.current.set(sessionId, element);
    } else {
      sessionRefs.current.delete(sessionId);
    }
  };

  const clearFilters = () => {
    setFilterTaxonomy([]);
    setFilterKeyTopics([]);
    setSearchText('');
    setFilterDate('');
  };

  const hasActiveFilters = filterTaxonomy.length > 0 || filterKeyTopics.length > 0 || searchText.length > 0 || filterDate.length > 0;

  if (!moduleConfig) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: moduleConfig.color + '20' }}
            >
              <ModuleIcon className="w-5 h-5" style={{ color: moduleConfig.color }} />
            </div>

            <div className="flex flex-col">
              <span className="text-lg font-semibold">
                Conversas - {moduleConfig.name}
              </span>
              {userName && (
                <span className="text-sm text-muted-foreground font-normal">
                  {userName}
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-auto">
                {filteredSessions.length} de {sessions.length} sessoes
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Filtros e Navegacao */}
          <div className="w-80 border-r flex flex-col shrink-0">
            {/* Filtros */}
            <div className="p-3 border-b space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="w-4 h-4" />
                  <span>Filtros</span>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                    Limpar
                  </Button>
                )}
              </div>
              
              {/* Filtro por Data (PRD) */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Data
                </label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              
              {/* Busca por texto */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Buscar no conteudo</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="h-9 pl-8 text-sm"
                  />
                </div>
              </div>
              
              {/* Filtro Taxonomia */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Taxonomia</label>
                <TaxonomyAutocomplete
                  value={filterTaxonomy}
                  onChange={setFilterTaxonomy}
                  suggestions={taxonomySuggestions}
                  onSearch={fetchTaxonomySuggestions}
                />
              </div>
              
              {/* Filtro Temas-Chave */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Temas-Chave</label>
                <KeyTopicsAutocomplete
                  value={filterKeyTopics}
                  onChange={setFilterKeyTopics}
                  suggestions={keyTopicsSuggestions}
                  onSearch={fetchKeyTopicsSuggestions}
                />
              </div>
              
              {/* Tags ativas */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {filterDate && (
                    <Badge variant="outline" className="text-xs gap-1">
                      {filterDate}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterDate('')} />
                    </Badge>
                  )}
                  {filterTaxonomy.map((t, i) => (
                    <Badge key={`tax-${i}`} variant="secondary" className="text-xs gap-1">
                      {t}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterTaxonomy(prev => prev.filter(x => x !== t))} />
                    </Badge>
                  ))}
                  {filterKeyTopics.map((t, i) => (
                    <Badge key={`kt-${i}`} variant="outline" className="text-xs gap-1">
                      {t}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterKeyTopics(prev => prev.filter(x => x !== t))} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Navegacao por datas */}
            <div className="flex-1 overflow-hidden">
              <PWAConversationSummary
                sessionsByDate={sessionsByDate}
                filters={summaryFilters}
                onFiltersChange={setSummaryFilters}
                onDateClick={scrollToSession}
                selectedSessionId={selectedSessionId}
                isLoading={isLoadingSessions}
              />
            </div>
          </div>

          {/* Right Content - Blocos de Conversa */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                <PWAConversationBlocks
                  sessions={filteredSessions}
                  moduleConfig={moduleConfig}
                  selectedSessionId={selectedSessionId}
                  registerRef={registerRef}
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
