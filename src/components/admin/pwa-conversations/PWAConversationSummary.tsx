import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, MessageSquare, Loader2, MapPin } from 'lucide-react';
import type { PWAConversationSession, PWASummaryFilters } from '@/types/pwa-conversations';

interface PWAConversationSummaryProps {
  sessionsByDate: Record<string, PWAConversationSession[]>;
  filters: PWASummaryFilters;
  onFiltersChange: (filters: PWASummaryFilters) => void;
  onDateClick: (sessionId: string) => void;
  selectedSessionId: string | null;
  isLoading: boolean;
}

export const PWAConversationSummary = ({
  sessionsByDate,
  filters,
  onFiltersChange,
  onDateClick,
  selectedSessionId,
  isLoading
}: PWAConversationSummaryProps) => {
  const [dateFilter, setDateFilter] = useState('');

  const handleFilter = () => {
    onFiltersChange({ ...filters, date: dateFilter || undefined });
  };

  const sortedDates = Object.keys(sessionsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const totalSessions = Object.values(sessionsByDate).flat().length;

  return (
    <div className="h-full flex flex-col">
      {/* Filtro de data */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-8 text-sm"
          />
          <Button size="sm" variant="secondary" onClick={handleFilter} className="h-8 shrink-0">
            Filtrar
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{sortedDates.length} dias</span>
          <span>|</span>
          <span>{totalSessions} sessoes</span>
        </div>
      </div>

      {/* Lista de sessoes por data */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma conversa encontrada
            </div>
          ) : (
            sortedDates.map(date => (
              <div key={date} className="mb-4">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground sticky top-0 bg-background">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(date), 'dd MMM yyyy', { locale: ptBR })}</span>
                  <Badge variant="secondary" className="text-xs h-5">
                    {sessionsByDate[date].length}
                  </Badge>
                </div>
                
                <div className="space-y-1 mt-1">
                  {sessionsByDate[date].map(session => (
                    <button
                      key={session.id}
                      onClick={() => onDateClick(session.id)}
                      className={`w-full text-left px-2 py-2 rounded-md text-sm transition-colors ${
                        selectedSessionId === session.id 
                          ? 'bg-primary/10 text-primary' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {format(new Date(session.started_at), 'HH:mm', { locale: ptBR })}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          <span>{session.messages?.length || 0}</span>
                        </div>
                      </div>
                      {session.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{session.city}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
