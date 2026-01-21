import { useState, useEffect, useCallback } from 'react';
import { Bell, MessageSquare, Shield, FileText, AlertTriangle, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Notification {
  id: string;
  event_type: string;
  subject: string | null;
  recipient: string;
  status: string;
  created_at: string;
  is_read: boolean;
  channel: string;
}

interface ContactMessage {
  id: string;
  email: string;
  subject: string;
  status: string;
  created_at: string;
}

interface NotificationBellProps {
  onNavigate: (tab: string) => void;
}

const EVENT_CONFIG: Record<string, { 
  icon: typeof Bell; 
  color: string; 
  label: string; 
  tab: string;
}> = {
  security_alert: { 
    icon: Shield, 
    color: 'text-red-500', 
    label: 'Alerta de Segurança',
    tab: 'security-dashboard'
  },
  security_violation_detected: { 
    icon: Shield, 
    color: 'text-red-500', 
    label: 'Violação Detectada',
    tab: 'security-dashboard'
  },
  password_reset: { 
    icon: AlertTriangle, 
    color: 'text-orange-500', 
    label: 'Recuperação de Senha',
    tab: 'notification-logs'
  },
  login_alert: { 
    icon: AlertTriangle, 
    color: 'text-yellow-500', 
    label: 'Login Suspeito',
    tab: 'security-dashboard'
  },
  new_contact_message: { 
    icon: MessageSquare, 
    color: 'text-green-500', 
    label: 'Nova Mensagem',
    tab: 'contact-messages'
  },
  new_document: { 
    icon: FileText, 
    color: 'text-blue-500', 
    label: 'Novo Documento',
    tab: 'documents'
  },
  document_failed: { 
    icon: AlertTriangle, 
    color: 'text-red-500', 
    label: 'Falha no Documento',
    tab: 'documents'
  },
  invitation_sent: { 
    icon: CheckCircle2, 
    color: 'text-green-500', 
    label: 'Convite Enviado',
    tab: 'user-registry'
  },
};

const DEFAULT_CONFIG = {
  icon: Bell,
  color: 'text-muted-foreground',
  label: 'Notificação',
  tab: 'notification-logs'
};

// Função para tocar som de notificação
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Ignorar erros de áudio
  }
};

export function NotificationBell({ onNavigate }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.is_read).length;
  const pendingMessages = contactMessages.filter(m => m.status === 'pending').length;
  const totalUnread = unreadNotifications + pendingMessages;

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('id, event_type, subject, recipient, status, created_at, is_read, channel')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
    }
  }, []);

  const fetchContactMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('id, email, subject, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setContactMessages(data);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchContactMessages();

    const notificationChannel = supabase
      .channel('notification-bell-logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_logs'
      }, (payload) => {
        fetchNotifications();
        playNotificationSound();
        toast.info('Nova notificação', {
          description: (payload.new as any).subject || 'Você tem uma nova notificação'
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notification_logs'
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('notification-bell-messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contact_messages'
      }, () => {
        fetchContactMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [fetchNotifications, fetchContactMessages]);

  const markAsRead = async (id: string) => {
    console.log('[NotificationBell] Marking as read:', id);
    
    const { error } = await supabase
      .from('notification_logs')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('[NotificationBell] Error marking as read:', error);
    } else {
      console.log('[NotificationBell] Successfully marked as read');
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notification_logs')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      toast.success('Todas notificações marcadas como lidas');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    const config = EVENT_CONFIG[notification.event_type] || DEFAULT_CONFIG;
    
    // Marcar como lida automaticamente ao clicar
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    onNavigate(config.tab);
    setIsOpen(false);
  };

  const handleMessageClick = () => {
    onNavigate('contact-messages');
    setIsOpen(false);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-primary/10">
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground border-0"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 font-semibold">Notificações</DropdownMenuLabel>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalUnread} não lidas
              </Badge>
            )}
            {unreadNotifications > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs text-primary hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
              >
                Marcar todas
              </Button>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px]">
          {/* Mensagens de Contato Pendentes */}
          {pendingMessages > 0 && (
            <>
              <div className="px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Mensagens de Contato ({pendingMessages})
                </span>
              </div>
              {contactMessages.slice(0, 3).map((message) => (
                <DropdownMenuItem
                  key={message.id}
                  className="flex items-start gap-3 px-3 py-2 cursor-pointer"
                  onClick={handleMessageClick}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Mail className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {message.email}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {message.subject || 'Sem assunto'}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Notificações do Sistema */}
          <div className="px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Notificações do Sistema
            </span>
          </div>
          
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">Nenhuma notificação</span>
            </div>
          ) : (
            notifications.slice(0, 10).map((notification) => {
              const config = EVENT_CONFIG[notification.event_type] || DEFAULT_CONFIG;
              const IconComponent = config.icon;
              
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex items-start gap-3 px-3 py-2 cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <IconComponent className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {notification.subject || config.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.recipient} • {notification.channel}
                      </p>
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2 text-[10px] text-primary hover:text-primary shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          Marcar como lida
                        </Button>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
        
        <DropdownMenuSeparator />
        
        {/* Footer */}
        <DropdownMenuItem
          className="justify-center text-primary cursor-pointer"
          onClick={() => {
            onNavigate('notification-logs');
            setIsOpen(false);
          }}
        >
          Ver todas as notificações
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
