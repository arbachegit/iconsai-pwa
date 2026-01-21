import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PWAAudioMessage } from './PWAAudioMessage';
import type { PWAConversationSession, PWAModuleConfig, KeyTopics, PWAConversationMessage } from '@/types/pwa-conversations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, MessageSquare, Users, Globe, Building2, Tag, FileText, Volume2 } from 'lucide-react';

interface PWAConversationBlocksProps {
  sessions: PWAConversationSession[];
  moduleConfig: PWAModuleConfig;
  selectedSessionId: string | null;
  registerRef: (sessionId: string, element: HTMLDivElement | null) => void;
}

// Componente para exibir key topics
const KeyTopicsDisplay = ({ keyTopics, color }: { keyTopics: KeyTopics | null; color: string }) => {
  if (!keyTopics) return null;
  const { people = [], countries = [], organizations = [] } = keyTopics;
  if (!people.length && !countries.length && !organizations.length) return null;
  
  return (
    <div className="flex flex-wrap gap-1">
      {people.map((p: string, i: number) => (
        <Badge key={`p-${i}`} variant="outline" className="text-xs gap-1" style={{ borderColor: color }}>
          <Users className="w-3 h-3" />
          {p}
        </Badge>
      ))}
      {countries.map((c: string, i: number) => (
        <Badge key={`c-${i}`} variant="outline" className="text-xs gap-1" style={{ borderColor: color }}>
          <Globe className="w-3 h-3" />
          {c}
        </Badge>
      ))}
      {organizations.map((o: string, i: number) => (
        <Badge key={`o-${i}`} variant="outline" className="text-xs gap-1" style={{ borderColor: color }}>
          <Building2 className="w-3 h-3" />
          {o}
        </Badge>
      ))}
    </div>
  );
};

// Componente para exibir taxonomias
const TaxonomyDisplay = ({ tags, color }: { tags: string[] | null; color: string }) => {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag, i) => (
        <Badge key={i} variant="secondary" className="text-xs gap-1" style={{ backgroundColor: color + '15' }}>
          <Tag className="w-3 h-3" />
          {tag}
        </Badge>
      ))}
    </div>
  );
};

export const PWAConversationBlocks = ({ 
  sessions, 
  moduleConfig, 
  selectedSessionId, 
  registerRef 
}: PWAConversationBlocksProps) => {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhuma conversa encontrada</p>
        <p className="text-sm">Ajuste os filtros ou selecione outro modulo</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sessions.map((session, idx) => {
        const messageCount = session.messages?.length || 0;
        const hasAudio = session.messages?.some(m => m.audio_url);
        
        return (
          <Card 
            key={session.id} 
            ref={(el) => registerRef(session.id, el)} 
            className={`transition-all ${
              selectedSessionId === session.id 
                ? 'ring-2 shadow-lg' 
                : 'hover:shadow-md'
            }`}
            style={{
              borderLeftColor: moduleConfig.color,
              borderLeftWidth: '4px'
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  style={{ borderColor: moduleConfig.color, color: moduleConfig.color }}
                >
                  #{sessions.length - idx}
                </Badge>
                
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{format(new Date(session.started_at), 'HH:mm', { locale: ptBR })}</span>
                </div>
                
                {session.ended_at && (
                  <span className="text-sm text-muted-foreground">
                    ate {format(new Date(session.ended_at), 'HH:mm', { locale: ptBR })}
                  </span>
                )}
                
                <Badge variant="secondary" className="text-xs">
                  {format(new Date(session.started_at), 'dd/MM/yyyy', { locale: ptBR })}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{messageCount} msgs</span>
                </div>
                {hasAudio && (
                  <div className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Com audio</span>
                  </div>
                )}
                {session.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{session.city}{session.country && `, ${session.country}`}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Mensagens */}
              {session.messages && session.messages.length > 0 ? (
                <div className="space-y-3">
                  {session.messages.map((msg) => (
                    <div key={msg.id}>
                      {/* Taxonomia passada para o header do audio (PRD) */}
                      <PWAAudioMessage 
                        message={msg} 
                        moduleColor={moduleConfig.color} 
                        taxonomyTags={msg.taxonomy_tags || []}
                      />
                      {/* KeyTopics apos mensagem (pessoas, paises, orgs) */}
                      {msg.key_topics && (
                        <div className={`mt-1 ${msg.role === 'user' ? 'ml-auto max-w-[75%]' : 'mr-auto max-w-[75%]'}`}>
                          <KeyTopicsDisplay keyTopics={msg.key_topics} color={moduleConfig.color} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Nenhuma mensagem nesta sessao
                </div>
              )}

              {/* Resumo (com player de audio se disponivel) */}
              {session.summary && (
                <div className="mt-4 p-4 rounded-lg border bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-2 font-medium mb-2">
                    <FileText className="w-4 h-4" style={{ color: moduleConfig.color }} />
                    <span>Resumo da Conversa</span>
                  </div>
                  
                  {/* Se tiver audio do resumo, mostrar player */}
                  {session.summary.summary_audio_url ? (
                    <PWAAudioMessage 
                      message={{
                        id: session.summary.id,
                        session_id: session.id,
                        role: 'assistant',
                        content: session.summary.summary_text,
                        audio_url: session.summary.summary_audio_url,
                        audio_duration: null,
                        transcription: session.summary.summary_text,
                        timestamp: session.summary.generated_at,
                        taxonomy_tags: session.summary.taxonomy_tags || [],
                        key_topics: session.summary.key_topics,
                        created_at: session.summary.generated_at
                      } as PWAConversationMessage}
                      moduleColor="#22c55e"
                      isSummary
                      taxonomyTags={session.summary.taxonomy_tags || []}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">
                      {session.summary.summary_text}
                    </p>
                  )}
                  
                  {/* Taxonomias do resumo */}
                  {session.summary.taxonomy_tags && session.summary.taxonomy_tags.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Taxonomias:</p>
                      <TaxonomyDisplay tags={session.summary.taxonomy_tags} color={moduleConfig.color} />
                    </div>
                  )}
                  
                  {/* Key Topics do resumo */}
                  {session.summary.key_topics && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Temas identificados:</p>
                      <KeyTopicsDisplay keyTopics={session.summary.key_topics} color={moduleConfig.color} />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
